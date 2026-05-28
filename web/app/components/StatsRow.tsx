"use client";

import { useState } from "react";

type Vitals = { avg_breathing: number; avg_heart_rate: number };

type Props = {
  vitals: Vitals | null;
  // Sensor-derived totals (preferred for time stats — match the per-stage breakdown)
  sleepTimeMin: number | null;      // sensor: total sleep minutes (light + deep)
  wakeDurMin: number | null;        // sensor: minutes awake in bed
  sleepQuality: number | null;      // sensor's sleep_quality (last value)
  turnover: number | null;          // turnover_total (max)
  apneaEvents: number | null;       // apnea_events (max)
  lightSleepMin: number | null;     // sensor: light_sleep_dur (max)
  deepSleepMin: number | null;      // sensor: deep_sleep_dur (max)
};

function Stat({ label, value, unit, info }: { label: string; value: string | number; unit?: string; info?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative flex flex-col gap-1"
      onMouseEnter={() => info && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
        {label}
        {info && (
          <span
            aria-label={info}
            className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-ink-muted/40 font-serif text-[9px] italic leading-none text-ink-muted/70"
          >
            i
          </span>
        )}
      </span>
      <span className="text-[22px] font-normal leading-none tracking-[-0.01em] text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-muted">{unit}</span>}
      </span>
      {info && open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-lg border border-rule bg-ground-raised p-3 text-[12px] font-normal normal-case leading-snug tracking-normal text-ink shadow-lg">
          {info}
        </div>
      )}
    </div>
  );
}

function fmtMin(min: number | null): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : String(n);
}

export function StatsRow({
  vitals, sleepTimeMin, wakeDurMin, sleepQuality, turnover, apneaEvents, lightSleepMin, deepSleepMin,
}: Props) {
  return (
    <section className="border-t border-rule pt-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Stat label="Time sleeping" value={fmtMin(sleepTimeMin)} info="Total time asleep (light + deep) reported by the radar sensor." />
        <Stat label="Awake in bed" value={fmtMin(wakeDurMin)} info="Minutes the radar saw you in bed but awake." />
        <Stat label="Light sleep" value={fmtMin(lightSleepMin)} info="Minutes the radar classified as light sleep." />
        <Stat label="Deep sleep" value={fmtMin(deepSleepMin)} info="Minutes the radar classified as deep sleep." />
        <Stat label="Avg br" value={fmt(vitals?.avg_breathing)} unit="bpm" info="Average breathing rate over the night, in breaths per minute." />
        <Stat label="Avg hr" value={fmt(vitals?.avg_heart_rate)} unit="bpm" info="Average heart rate over the night, in beats per minute." />
        <Stat label="Turnover" value={fmt(turnover)} info="Total number of significant turns/rolls detected by the radar." />
        <Stat label="Apnea" value={fmt(apneaEvents)} info="Number of apnea-like respiratory events flagged by the radar." />
        <Stat label="Sleep quality" value={fmt(sleepQuality)} info="Radar's overall sleep quality rating for the session (0-100, higher is better)." />
      </div>
    </section>
  );
}
