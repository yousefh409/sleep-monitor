"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type NightRow,
  type Slot,
  buildSlots,
  defaultSlot,
  neighborSlot,
  slotByDate,
} from "@/lib/slots";
import { NightHeader } from "./components/NightHeader";
import { CalendarPopover } from "./components/CalendarPopover";
import { NightHero } from "./components/NightHero";
import { StatsRow } from "./components/StatsRow";
import { StageBand } from "./components/StageBand";
import { WakeEvents } from "./components/WakeEvents";
import { Recommendations } from "./components/Recommendations";
import { EmptyState } from "./components/EmptyState";
import { VitalsChart, EnvironmentChart, AudioChart, LightChart } from "./components/LiveCharts";
import { TelemetryTable } from "./components/TelemetryTable";

type StagePct = { awake: number; light: number; deep: number };
type Vitals = { avg_breathing: number; avg_heart_rate: number };
type WakeEvent = { ts: string; likely_cause: string };

type NightDetail = {
  night: {
    id: number;
    device: string;
    started_at: string;
    ended_at: string;
    duration_sec: number;
    sleep_score: number | null;
    headline: string | null;
    report_score: number | null;
    stage_pct: StagePct | null;
    vitals: Vitals | null;
    wake_events: WakeEvent[] | null;
    recommendations: string[] | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  telemetry: any[];
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TodayResponse = { device: string; telemetry: any[] };

function maxField(rows: { [k: string]: unknown }[], key: string): number | null {
  let max: number | null = null;
  for (const r of rows) {
    const v = r[key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      if (max === null || v > max) max = v;
    }
  }
  return max;
}

function lastField(rows: { [k: string]: unknown }[], key: string): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = rows[i][key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}

function PageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const dateQuery = params.get("d");

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [detail, setDetail] = useState<NightDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [todayRows, setTodayRows] = useState<any[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Load nights list once on mount.
  useEffect(() => {
    fetch("/api/nights")
      .then(r => r.json())
      .then((d: { nights: NightRow[] }) => setSlots(buildSlots(d.nights)));
  }, []);

  // Resolve the current slot from URL or default.
  const slot: Slot | null = useMemo(() => {
    if (!slots) return null;
    if (dateQuery) {
      const found = slotByDate(slots, dateQuery);
      if (found) return found;
    }
    return defaultSlot(slots);
  }, [slots, dateQuery]);

  // Load detail for the current slot.
  useEffect(() => {
    if (!slot) return;
    if (slot.inProgress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      fetch("/api/today")
        .then(r => r.json())
        .then((d: TodayResponse) => setTodayRows(d.telemetry ?? []));
      const id = setInterval(() => {
        fetch("/api/today")
          .then(r => r.json())
          .then((d: TodayResponse) => setTodayRows(d.telemetry ?? []));
      }, 30_000);
      return () => clearInterval(id);
    }
    if (slot.nightId !== null) {
      setTodayRows([]);
      fetch(`/api/nights/${slot.nightId}`)
        .then(r => r.json())
        .then(setDetail);
    }
  }, [slot?.date, slot?.inProgress, slot?.nightId]);

  const setDate = useCallback((d: string) => {
    router.replace(`/?d=${d}`, { scroll: false });
    setCalOpen(false);
  }, [router]);

  if (!slots) {
    return (
      <main className="min-h-screen bg-ground">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="h-12 w-40 animate-pulse rounded bg-rule" />
        </div>
      </main>
    );
  }

  if (!slot || (slots.length === 1 && slot.inProgress && todayRows.length === 0)) {
    return (
      <main className="min-h-screen bg-ground">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <EmptyState />
        </div>
      </main>
    );
  }

  const prev = neighborSlot(slots, slot, "prev");
  const next = neighborSlot(slots, slot, "next");

  // Telemetry rows used by the charts and stage band.
  const rows = slot.inProgress ? todayRows : (detail?.telemetry ?? []);

  const startMs = detail?.night.started_at ? new Date(detail.night.started_at).getTime() : null;
  const endMs = detail?.night.ended_at ? new Date(detail.night.ended_at).getTime() : null;
  const inNightRows = (slot.inProgress || startMs === null || endMs === null)
    ? rows
    : rows.filter((r) => {
        const ts = r.ts ? new Date(r.ts).getTime() : NaN;
        return ts >= startMs && ts <= endMs;
      });

  const sensorScore = maxField(inNightRows, "sleep_score");
  const sleepQuality = lastField(inNightRows, "sleep_quality");
  const turnover = maxField(inNightRows, "turnover_total");
  const apneaEvents = maxField(inNightRows, "apnea_events");
  const lightSleepMin = maxField(inNightRows, "light_sleep_dur");
  const deepSleepMin = maxField(inNightRows, "deep_sleep_dur");
  const sleepTimeMin = maxField(inNightRows, "sleep_time_min");
  const wakeDurMin = maxField(inNightRows, "wake_dur");
  const durationSec = detail?.night.duration_sec ?? null;

  // Charts expect rows with `ts` ISO timestamps and the relevant fields — both endpoints return that shape.
  const chartRows = rows;

  return (
    <main className="min-h-screen bg-ground">
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <div ref={headerRef} className="relative">
          <NightHeader
            slot={slot}
            prev={prev}
            next={next}
            onPrev={() => prev && setDate(prev.date)}
            onNext={() => next && setDate(next.date)}
            onOpenCalendar={() => setCalOpen(o => !o)}
          />
          {calOpen && (
            <CalendarPopover
              slots={slots}
              selectedDate={slot.date}
              onSelect={setDate}
              onClose={() => setCalOpen(false)}
              anchorRef={headerRef}
            />
          )}
        </div>

        <NightHero
          score={slot.inProgress ? null : (detail?.night.report_score ?? slot.score)}
          headline={slot.inProgress ? null : (detail?.night.headline ?? null)}
          inProgress={slot.inProgress}
          startedAt={slot.inProgress ? null : (detail?.night.started_at ?? null)}
          endedAt={slot.inProgress ? null : (detail?.night.ended_at ?? null)}
          durationSec={slot.inProgress ? null : (detail?.night.duration_sec ?? null)}
        />

        <StatsRow
          stagePct={slot.inProgress ? null : (detail?.night.stage_pct ?? null)}
          vitals={slot.inProgress ? null : (detail?.night.vitals ?? null)}
          sleepTimeMin={sleepTimeMin}
          wakeDurMin={wakeDurMin}
          sensorScore={sensorScore}
          sleepQuality={sleepQuality}
          turnover={turnover}
          apneaEvents={apneaEvents}
          lightSleepMin={lightSleepMin}
          deepSleepMin={deepSleepMin}
        />

        <StageBand rows={rows} />

        {!slot.inProgress && (
          <div className="grid gap-10 sm:grid-cols-2">
            <WakeEvents events={detail?.night.wake_events ?? null} />
            <Recommendations items={detail?.night.recommendations ?? null} />
          </div>
        )}

        <VitalsChart rows={chartRows} />
        <EnvironmentChart rows={chartRows} />
        <div className="grid gap-6 sm:grid-cols-2">
          <AudioChart rows={chartRows} />
          <LightChart rows={chartRows} />
        </div>

        <TelemetryTable rows={chartRows} />
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-ground">
          <div className="mx-auto max-w-5xl px-6 py-10">
            <div className="h-12 w-40 animate-pulse rounded bg-rule" />
          </div>
        </main>
      }
    >
      <PageInner />
    </Suspense>
  );
}
