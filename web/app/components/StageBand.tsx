"use client";

import { useMemo, useState } from "react";

type Row = { sleep_state: number | null; ts: string };

type Props = { rows: Row[] };

const COLOR: Record<number, string> = {
  0: "var(--stage-deep)",
  1: "var(--stage-light)",
  2: "var(--stage-awake)",
  3: "var(--stage-out)",
};

function fill(state: number | null | undefined): string {
  if (state === null || state === undefined) return "var(--stage-out)";
  return COLOR[state] ?? "var(--stage-out)";
}

const STATE_LABEL: Record<number, string> = {
  0: "Deep sleep",
  1: "Light sleep",
  2: "Awake",
  3: "Out of bed",
};

function stateLabel(state: number | null | undefined): string {
  if (state === null || state === undefined) return "Unknown";
  return STATE_LABEL[state] ?? "Unknown";
}

function fmtClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

type RunInfo = {
  start: string;
  end: string;
  state: number | null;
  minutes: number;
};

export function StageBand({ rows }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Pre-compute the run each row index belongs to.
  const perRowRun = useMemo<RunInfo[]>(() => {
    if (rows.length === 0) return [];
    const out: RunInfo[] = new Array(rows.length);
    let s = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || rows[i].sleep_state !== rows[s].sleep_state) {
        const startTs = rows[s].ts;
        const endTs = rows[i - 1].ts;
        const startMs = new Date(startTs).getTime();
        const endMs = new Date(endTs).getTime();
        const minutes = Math.max(1, Math.round((endMs - startMs) / 60000) + 1);
        const info: RunInfo = { start: startTs, end: endTs, state: rows[s].sleep_state, minutes };
        for (let j = s; j < i; j++) out[j] = info;
        s = i;
      }
    }
    return out;
  }, [rows]);

  if (rows.length === 0) return null;

  const N = 5;
  const markers = Array.from({ length: N }, (_, i) => {
    const idx = Math.min(rows.length - 1, Math.round((i * (rows.length - 1)) / (N - 1)));
    return new Date(rows[idx].ts).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  });

  const hoverRun = hoverIdx !== null ? perRowRun[hoverIdx] : null;
  const hoverPct = hoverIdx !== null ? ((hoverIdx + 0.5) / rows.length) * 100 : 0;

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep stages</h2>
      <div
        className="relative"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <div className="flex h-16 w-full overflow-hidden rounded-lg">
          {rows.map((r, i) => (
            <div
              key={i}
              style={{ flex: 1, background: fill(r.sleep_state) }}
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </div>
        {hoverRun && (
          <div
            className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full"
            style={{ left: `${hoverPct}%` }}
          >
            <div className="rounded-lg border border-rule bg-ground-raised px-3 py-2 text-[12px] text-ink shadow-lg">
              <div className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-sm" style={{ background: fill(hoverRun.state) }} />
                <span>{stateLabel(hoverRun.state)}</span>
                <span className="font-mono text-ink-muted">· {hoverRun.minutes}m</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-muted">
                {fmtClock(hoverRun.start)} – {fmtClock(hoverRun.end)}
              </div>
            </div>
            <div
              className="mx-auto h-2 w-2 rotate-45 border-b border-r border-rule"
              style={{ background: "var(--ground-raised)", marginTop: "-4px" }}
            />
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-ink-muted">
        {markers.map((m, i) => <span key={i}>{m}</span>)}
      </div>
      <div className="flex gap-4 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-deep)" }} />deep</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-light)" }} />light</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-awake)" }} />awake</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-out)" }} />out</span>
      </div>
    </section>
  );
}
