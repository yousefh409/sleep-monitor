"use client";

import { useEffect, useState } from "react";
import { VitalsChart, EnvironmentChart, AudioLightChart } from "./components/LiveCharts";
import { TelemetryTable } from "./components/TelemetryTable";

type NightRow = {
  id: number;
  started_at: string;
  ended_at: string;
  sleep_score: number | null;
  headline: string | null;
};

type LiveRow = {
  t: number;
  ts: string;
  // C1001 composite
  presence: number | null;
  in_bed: number | null;
  sleep_state: number | null;
  breathing: number | null;
  heart_rate: number | null;
  turnover: number | null;
  body_move_large: number | null;
  body_move_small: number | null;
  apnea_events: number | null;
  // C1001 human queries
  hum_presence: number | null;
  hum_motion: number | null;
  hum_range: number | null;
  hum_dist_cm: number | null;
  // C1001 instant vitals
  hr_instant: number | null;
  breath_state: number | null;
  breath_value: number | null;
  // C1001 bed-state queries
  wake_dur: number | null;
  light_sleep_dur: number | null;
  deep_sleep_dur: number | null;
  sleep_quality: number | null;
  disturbances: number | null;
  quality_rating: number | null;
  abnormal_struggle: number | null;
  unattended_state: number | null;
  unattended_time: number | null;
  // C1001 session statistics
  sleep_score: number | null;
  sleep_time_min: number | null;
  shallow_pct: number | null;
  deep_pct: number | null;
  time_out_of_bed: number | null;
  exit_count: number | null;
  turnover_total: number | null;
  // BME680
  temp_c: number | null;
  humidity: number | null;
  pressure_hpa: number | null;
  gas_ohm: number | null;
  // Audio + light
  db_spl: number | null;
  light_raw: number | null;
};

type Report = {
  headline: string;
  sleep_score: number;
  stage_pct: { awake: number; light: number; deep: number };
  vitals: { avg_breathing: number; avg_heart_rate: number };
  wake_events: { ts: string; likely_cause: string }[];
  recommendations: string[];
};

type NightDetail = {
  night: NightRow & {
    duration_sec: number;
    report_score: number | null;
    stage_pct: Report["stage_pct"] | null;
    vitals: Report["vitals"] | null;
    wake_events: Report["wake_events"] | null;
    recommendations: Report["recommendations"] | null;
  };
  telemetry: LiveRow[];
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

function StageBand({ rows }: { rows: LiveRow[] }) {
  if (rows.length === 0) return null;
  const color = (s: number | null) =>
    s === 3 ? "#1e293b" : s === 2 ? "#64748b" : s === 1 ? "#cbd5e1" : "#f1f5f9";
  return (
    <div className="flex h-8 w-full overflow-hidden rounded-lg">
      {rows.map((r, i) => (
        <div key={i} style={{ flex: 1, background: color(r.sleep_state) }} />
      ))}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
      <span className="text-lg font-medium text-stone-900">
        {value}
        {unit && <span className="ml-1 text-sm text-stone-500">{unit}</span>}
      </span>
    </div>
  );
}

const WINDOWS = [
  { value: 10,    label: "Last 10 minutes",  poll: 5_000 },
  { value: 60,    label: "Last hour",        poll: 15_000 },
  { value: 360,   label: "Last 6 hours",     poll: 30_000 },
  { value: 1440,  label: "Last 24 hours",    poll: 60_000 },
  { value: 10080, label: "Last 7 days",      poll: 120_000 },
];

export default function Page() {
  const [nights, setNights] = useState<NightRow[]>([]);
  const [selected, setSelected] = useState<NightDetail | null>(null);
  const [live, setLive] = useState<LiveRow[]>([]);
  const [window, setWindow] = useState<number>(10);

  useEffect(() => {
    fetch("/api/nights").then((r) => r.json()).then((d) => {
      setNights(d.nights);
      if (d.nights[0]) loadNight(d.nights[0].id);
    });
  }, []);

  useEffect(() => {
    const cfg = WINDOWS.find((w) => w.value === window) ?? WINDOWS[0];
    const tick = () =>
      fetch(`/api/live?minutes=${window}`)
        .then((r) => r.json())
        .then((d) => setLive(d.rows));
    tick();
    const id = setInterval(tick, cfg.poll);
    return () => clearInterval(id);
  }, [window]);

  function loadNight(id: number) {
    fetch(`/api/nights/${id}`).then((r) => r.json()).then(setSelected);
  }

  const latest = live[live.length - 1];

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Sleep monitor</h1>
            <p className="text-sm text-stone-500">Bedside contactless tracking</p>
          </div>
          {nights.length > 0 && (
            <select
              value={selected?.night.id ?? ""}
              onChange={(e) => loadNight(Number(e.target.value))}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
            >
              {nights.map((n) => (
                <option key={n.id} value={n.id}>
                  {fmtDate(n.started_at)}{n.sleep_score ? ` · ${n.sleep_score}` : ""}
                </option>
              ))}
            </select>
          )}
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
              Live · {WINDOWS.find((w) => w.value === window)?.label.toLowerCase() ?? "last 10 minutes"}
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={window}
                onChange={(e) => setWindow(Number(e.target.value))}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700"
              >
                {WINDOWS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
              <span className={`text-xs ${live.length ? "text-emerald-600" : "text-stone-400"}`}>
                {live.length ? `● ${live.length} rows` : "○ no data"}
              </span>
            </div>
          </div>
          {latest ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Presence" value={latest.hum_presence ? "yes" : "no"} />
              <Stat label="Distance" value={latest.hum_dist_cm ?? "–"} unit="cm" />
              <Stat label="In bed" value={latest.in_bed ? "yes" : "no"} />
              <Stat label="Breathing" value={latest.breathing ?? "–"} unit="bpm" />
              <Stat label="Heart rate" value={latest.heart_rate ?? "–"} unit="bpm" />
              <Stat label="Temp" value={latest.temp_c?.toFixed(1) ?? "–"} unit="°C" />
              <Stat label="dB" value={latest.db_spl?.toFixed(0) ?? "–"} unit="dB" />
              <Stat label="Air" value={latest.gas_ohm ? `${(latest.gas_ohm / 1000).toFixed(1)}k` : "–"} unit="Ω" />
            </div>
          ) : (
            <p className="text-sm text-stone-500">Waiting for the first message from the device.</p>
          )}
        </section>

        {selected?.night.headline && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-stone-500">Morning briefing</h2>
            <div className="mb-4 flex items-baseline gap-4">
              <span className="text-5xl font-light tracking-tight text-stone-900">
                {selected.night.report_score ?? "–"}
              </span>
              <p className="text-base text-stone-700">{selected.night.headline}</p>
            </div>

            {selected.night.stage_pct && (
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                <Stat label="Awake" value={selected.night.stage_pct.awake} unit="%" />
                <Stat label="Light" value={selected.night.stage_pct.light} unit="%" />
                <Stat label="Deep" value={selected.night.stage_pct.deep} unit="%" />
                <Stat label="Avg br" value={selected.night.vitals?.avg_breathing ?? "–"} unit="bpm" />
                <Stat label="Avg hr" value={selected.night.vitals?.avg_heart_rate ?? "–"} unit="bpm" />
              </div>
            )}

            {selected.night.wake_events && selected.night.wake_events.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs uppercase tracking-wide text-stone-500">Wake events</h3>
                <ul className="space-y-1 text-sm text-stone-700">
                  {selected.night.wake_events.map((w, i) => (
                    <li key={i}>
                      <span className="font-mono text-stone-500">{w.ts}</span>
                      <span className="ml-3">{w.likely_cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.night.recommendations && selected.night.recommendations.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs uppercase tracking-wide text-stone-500">Tonight</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-stone-700">
                  {selected.night.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}

        {selected && selected.telemetry.length > 0 && (
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-stone-500">Sleep stages</h2>
            <StageBand rows={selected.telemetry} />
            <div className="mt-3 flex gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-stone-100" />out</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-stone-300" />awake</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-stone-500" />light</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-stone-800" />deep</span>
            </div>
          </section>
        )}

        <VitalsChart rows={live} />
        <EnvironmentChart rows={live} />
        <AudioLightChart rows={live} />
        <TelemetryTable rows={live} />
      </div>
    </main>
  );
}
