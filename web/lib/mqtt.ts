import mqtt from "mqtt";
import { pool } from "./db";
import { generateSleepReport } from "./claude";
import type { Telemetry } from "./types";

type SessionState = {
  startedAt: Date | null;
  consecutiveInBed: number;
  consecutiveOutOfBed: number;
  consecutiveAwake: number;
};

const sessions = new Map<string, SessionState>();
const SAMPLES_PER_MIN = 2; // 30 s publish interval
const ONSET_MIN = 5;
const END_ABSENCE_MIN = 5;
const MIN_VALID_SESSION_HOURS = 2;

function getSession(dev: string): SessionState {
  let s = sessions.get(dev);
  if (!s) {
    s = { startedAt: null, consecutiveInBed: 0, consecutiveOutOfBed: 0, consecutiveAwake: 0 };
    sessions.set(dev, s);
  }
  return s;
}

async function insertTelemetry(t: Telemetry) {
  await pool.query(
    `INSERT INTO telemetry (device, ts, presence, in_bed, sleep_state, breathing, heart_rate,
       turnover, body_move_large, body_move_small, apnea_events, temp_c, humidity, pressure_hpa,
       gas_ohm, db_spl, light_raw, hum_presence, hum_motion, hum_range, hum_dist_cm,
       hr_instant, breath_state, breath_value, wake_dur, light_sleep_dur, deep_sleep_dur,
       sleep_quality, disturbances, quality_rating, abnormal_struggle, unattended_state, unattended_time,
       sleep_score, sleep_time_min, shallow_pct, deep_pct, time_out_of_bed, exit_count, turnover_total)
     VALUES ($1, now(),
       $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
       $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)`,
    [t.dev, t.presence, t.in_bed, t.sleep_state, t.breathing, t.heart_rate,
     t.turnover, t.body_move_large, t.body_move_small, t.apnea_events, t.temp_c, t.humidity,
     t.pressure_hpa, t.gas_ohm, t.db_spl, t.light_raw, t.hum_presence, t.hum_motion, t.hum_range, t.hum_dist_cm,
     t.hr_instant, t.breath_state, t.breath_value, t.wake_dur, t.light_sleep_dur, t.deep_sleep_dur,
     t.sleep_quality, t.disturbances, t.quality_rating, t.abnormal_struggle, t.unattended_state, t.unattended_time,
     t.sleep_score, t.sleep_time_min, t.shallow_pct, t.deep_pct, t.time_out_of_bed, t.exit_count, t.turnover_total]
  );
}

async function closeSession(dev: string, endedAt: Date) {
  const s = getSession(dev);
  if (!s.startedAt) return;
  const startedAt = s.startedAt;
  const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
  s.startedAt = null;
  s.consecutiveInBed = 0;
  s.consecutiveOutOfBed = 0;
  s.consecutiveAwake = 0;

  if (durationSec < MIN_VALID_SESSION_HOURS * 3600) return;

  const { rows: nightRows } = await pool.query<{ id: number }>(
    `INSERT INTO nights (device, started_at, ended_at, duration_sec)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [dev, startedAt, endedAt, durationSec]
  );
  const nightId = nightRows[0].id;

  const { rows } = await pool.query(
    `SELECT date_trunc('minute', ts) AS minute,
            avg(sleep_state)::int AS state,
            avg(breathing)::int AS breathing,
            avg(heart_rate)::int AS hr,
            avg(temp_c) AS temp_c,
            avg(humidity) AS humidity,
            avg(gas_ohm)::int AS gas,
            avg(db_spl) AS db_spl,
            avg(light_raw)::int AS light
     FROM telemetry WHERE device = $1 AND ts BETWEEN $2 AND $3
     GROUP BY minute ORDER BY minute`,
    [dev, startedAt, endedAt]
  );
  // Format minute as local America/Los_Angeles "YYYY-MM-DD HH:MM" (24h) so the LLM emits
  // wake-event timestamps in the user's wall-clock time, not UTC.
  const fmtMinute = (d: Date) => {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const get = (t: string) => p.find((x) => x.type === t)!.value;
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
  };
  const header = "minute,state,breathing,hr,temp_c,humidity,gas_ohm,db_spl,light";
  const csv = [header, ...rows.map((r) =>
    `${fmtMinute(r.minute as Date)},${r.state},${r.breathing},${r.hr},${Number(r.temp_c).toFixed(1)},${Number(r.humidity).toFixed(1)},${r.gas},${Number(r.db_spl).toFixed(1)},${r.light}`
  )].join("\n");

  try {
    const report = await generateSleepReport(csv);
    await pool.query(
      `INSERT INTO reports (night_id, headline, sleep_score, stage_pct, vitals, wake_events, recommendations)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [nightId, report.headline, report.sleep_score, report.stage_pct, report.vitals,
       JSON.stringify(report.wake_events), JSON.stringify(report.recommendations)]
    );
    await pool.query(`UPDATE nights SET sleep_score = $1 WHERE id = $2`,
      [report.sleep_score, nightId]);
  } catch (err) {
    console.error("[mqtt] LLM report failed for night", nightId, err);
  }
}

function updateSession(t: Telemetry) {
  const s = getSession(t.dev);
  const ts = new Date();   // server-side wall clock — firmware sends uptime

  // Session detection uses ONLY in_bed (the C1001's dedicated bed-occupancy
  // query). presence has hold-down logic and sleep_state defaults to 3 even
  // without a real sleep cycle, so those were unreliable end-of-session signals.
  const inBed = (t.in_bed ?? 0) === 1;

  if (inBed) {
    s.consecutiveInBed += 1;
    s.consecutiveOutOfBed = 0;
    s.consecutiveAwake = 0;
    if (!s.startedAt && s.consecutiveInBed >= ONSET_MIN * SAMPLES_PER_MIN) {
      s.startedAt = ts;
    }
  } else {
    s.consecutiveInBed = 0;
    s.consecutiveOutOfBed += 1;
  }

  // End the session when the bed has been empty for END_ABSENCE_MIN minutes.
  if (s.startedAt && s.consecutiveOutOfBed >= END_ABSENCE_MIN * SAMPLES_PER_MIN) {
    void closeSession(t.dev, ts);
  }
}

let started = false;

export function startMqtt() {
  if (started) return;
  started = true;
  const host = process.env.HIVEMQ_URL ?? process.env.MQTT_HOST;
  const port = process.env.HIVEMQ_PORT ?? process.env.MQTT_PORT ?? 8883;
  const url = `mqtts://${host}:${port}`;
  const topic = process.env.MQTT_TOPIC ?? "yousef/sleep01/telemetry";
  const client = mqtt.connect(url, {
    username: process.env.HIVEMQ_USER ?? process.env.MQTT_USER,
    password: process.env.HIVEMQ_PASSWORD ?? process.env.MQTT_PASS,
    keepalive: 60,
    reconnectPeriod: 5000,
  });

  client.on("connect", () => {
    console.log("[mqtt] connected to", host);
    client.subscribe(topic, { qos: 1 });
  });
  client.on("error", (err) => console.error("[mqtt] error", err));
  client.on("message", async (_topic, payload) => {
    try {
      const t = JSON.parse(payload.toString()) as Telemetry;
      await insertTelemetry(t);
      updateSession(t);
    } catch (err) {
      console.error("[mqtt] message handler error", err);
    }
  });
}
