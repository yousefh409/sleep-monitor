import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { rows: nightRows } = await pool.query(
    `SELECT n.*, r.headline, r.sleep_score AS report_score, r.stage_pct, r.vitals,
            r.wake_events, r.recommendations
     FROM nights n LEFT JOIN reports r ON r.night_id = n.id
     WHERE n.id = $1`, [id]);
  if (nightRows.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  const night = nightRows[0];

  const { rows: telemetry } = await pool.query(
    `SELECT extract(epoch FROM date_trunc('minute', ts))::int AS t,
            min(ts) AS ts,
            avg(presence)::int AS presence,
            avg(in_bed)::int AS in_bed,
            avg(sleep_state)::int AS sleep_state,
            avg(breathing)::int AS breathing,
            avg(heart_rate)::int AS heart_rate,
            avg(turnover)::int AS turnover,
            avg(body_move_large)::int AS body_move_large,
            avg(body_move_small)::int AS body_move_small,
            avg(apnea_events)::int AS apnea_events,
            avg(hum_presence)::int AS hum_presence,
            avg(hum_motion)::int AS hum_motion,
            avg(hum_range)::int AS hum_range,
            avg(hum_dist_cm)::int AS hum_dist_cm,
            avg(hr_instant)::int AS hr_instant,
            avg(breath_state)::int AS breath_state,
            avg(breath_value)::int AS breath_value,
            avg(wake_dur)::int AS wake_dur,
            avg(light_sleep_dur)::int AS light_sleep_dur,
            avg(deep_sleep_dur)::int AS deep_sleep_dur,
            avg(sleep_quality)::int AS sleep_quality,
            avg(disturbances)::int AS disturbances,
            avg(quality_rating)::int AS quality_rating,
            avg(abnormal_struggle)::int AS abnormal_struggle,
            avg(unattended_state)::int AS unattended_state,
            avg(unattended_time)::int AS unattended_time,
            avg(sleep_score)::int AS sleep_score,
            avg(sleep_time_min)::int AS sleep_time_min,
            avg(shallow_pct)::int AS shallow_pct,
            avg(deep_pct)::int AS deep_pct,
            avg(time_out_of_bed)::int AS time_out_of_bed,
            avg(exit_count)::int AS exit_count,
            avg(turnover_total)::int AS turnover_total,
            avg(temp_c) AS temp_c,
            avg(humidity) AS humidity,
            avg(pressure_hpa) AS pressure_hpa,
            avg(gas_ohm)::int AS gas_ohm,
            avg(db_spl) AS db_spl,
            avg(light_raw)::int AS light_raw
     FROM telemetry WHERE device = $1 AND ts BETWEEN ($2::timestamptz - INTERVAL '1 hour') AND ($3::timestamptz + INTERVAL '1 hour')
     GROUP BY date_trunc('minute', ts) ORDER BY t`,
    [night.device, night.started_at, night.ended_at]);

  return NextResponse.json({ night, telemetry });
}
