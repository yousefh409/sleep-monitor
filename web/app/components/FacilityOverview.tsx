"use client";

import { useMemo, useState } from "react";

type TenantBase = {
  id: string;
  name: string;
  age: number;
  room: string;
  baseScore: number;
  baseSleepMin: number;
  baseFlags: number;
  isReal: boolean;
};

// Demo / mock data for the elder-care facility view. Yousef is the real one;
// the others are placeholders. Eventually reverted.
const TENANTS: TenantBase[] = [
  { id: "yousef",   name: "Yousef Helal",      age: 22, room: "104", baseScore: 0,  baseSleepMin: 0,   baseFlags: 0, isReal: true },
  { id: "margaret", name: "Margaret Chen",     age: 78, room: "201", baseScore: 82, baseSleepMin: 420, baseFlags: 0, isReal: false },
  { id: "robert",   name: "Robert Thompson",   age: 84, room: "207", baseScore: 67, baseSleepMin: 380, baseFlags: 0, isReal: false },
  { id: "eleanor",  name: "Eleanor Ramirez",   age: 81, room: "212", baseScore: 91, baseSleepMin: 460, baseFlags: 0, isReal: false },
  { id: "james",    name: "James Park",        age: 76, room: "218", baseScore: 54, baseSleepMin: 290, baseFlags: 2, isReal: false },
  { id: "dorothy",  name: "Dorothy Walsh",     age: 88, room: "223", baseScore: 73, baseSleepMin: 400, baseFlags: 0, isReal: false },
];

function statusFor(score: number): string {
  if (score >= 85) return "Excellent recovery, low restlessness";
  if (score >= 75) return "Stable, full deep cycles";
  if (score >= 65) return "Elevated awakenings, monitor turnovers";
  if (score >= 55) return "Quality dipped; possible apnea events";
  return "Light sleep dominant; multiple wake events";
}

function scoreTone(score: number | null): string {
  if (score === null) return "var(--ink-muted)";
  if (score >= 60) return "var(--copper)";
  return "#9c5a3c";
}

function fmtMin(min: number | null): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Deterministic small pseudo-random integer in [-range, +range] seeded by a string.
function seededDelta(seed: string, range: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % (2 * range + 1)) - range;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function FacilityOverview({
  selectedDate,
  realScore,
  realSleepTimeMin,
  onSelectReal,
}: {
  selectedDate: string;
  realScore: number | null;
  realSleepTimeMin: number | null;
  onSelectReal?: () => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const tenants = useMemo(() => {
    return TENANTS.map((t) => {
      if (t.isReal) {
        const realStatus = realScore !== null ? statusFor(realScore) : "Awaiting tonight's report";
        return {
          ...t,
          score: realScore,
          sleepTimeMin: realSleepTimeMin,
          flags: realScore !== null && realScore < 60 ? 1 : 0,
          status: realStatus,
        };
      }
      const seed = `${t.id}-${selectedDate}`;
      const score = clamp(t.baseScore + seededDelta(seed, 10), 35, 98);
      const sleepTimeMin = Math.max(180, t.baseSleepMin + seededDelta(`${seed}-s`, 45));
      const flags = score < 60 ? Math.max(t.baseFlags, 1) : t.baseFlags;
      return { ...t, score, sleepTimeMin, flags, status: statusFor(score) };
    });
  }, [selectedDate, realScore, realSleepTimeMin]);

  const validScores = tenants.map((t) => t.score).filter((s): s is number => s !== null);
  const avg = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const flagged = tenants.filter((t) => t.flags > 0);
  const followUp = tenants.filter((t) => (t.score ?? 100) < 60);

  return (
    <section className="space-y-8 border-b border-rule pb-10">
      <div className="space-y-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Overnight overview · East Wing</h2>
        <p className="max-w-prose text-[20px] font-light leading-snug tracking-[-0.01em] text-ink">
          {tenants.length} residents monitored last night. Average sleep score{" "}
          <span className="font-mono text-ink">{avg ?? "—"}</span>.{" "}
          {followUp.length > 0 ? (
            <>
              Follow-up recommended for{" "}
              <span className="text-ink">
                {followUp.map((t) => t.name.split(" ")[0]).join(", ")}
              </span>{" "}
              — quality below 60.{" "}
            </>
          ) : (
            <>All residents above the 60-quality threshold.{" "}</>
          )}
          {flagged.length > 0 && (
            <>
              <span className="font-mono text-ink">{flagged.length}</span> open{" "}
              {flagged.length === 1 ? "alert" : "alerts"} need review this morning.
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-x-10 gap-y-3 pt-2">
          <Stat label="Residents" value={tenants.length} />
          <Stat label="Avg score" value={avg ?? "—"} />
          <Stat label="Alerts" value={flagged.length} />
          <Stat label="Highest" value={validScores.length ? Math.max(...validScores) : "—"} />
          <Stat label="Lowest" value={validScores.length ? Math.min(...validScores) : "—"} />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Residents</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tenants.map((t) => {
            const interactive = t.isReal;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => interactive && onSelectReal?.()}
                onMouseEnter={() => !t.isReal && setHover(t.id)}
                onMouseLeave={() => setHover(null)}
                className={[
                  "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                  interactive
                    ? "border-copper bg-copper-soft cursor-pointer hover:shadow-md"
                    : "border-rule bg-ground-raised cursor-default",
                ].join(" ")}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-medium text-ink">{t.name}</span>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">Room <span className="font-mono normal-case tracking-normal text-ink">{t.room}</span></span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">
                    Age {t.age}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span
                      className="text-[36px] font-light leading-none"
                      style={{ color: scoreTone(t.score) }}
                    >
                      {t.score ?? "—"}
                    </span>
                    {t.flags > 0 && (
                      <span className="rounded-full bg-ink/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-ink">
                        {t.flags} {t.flags === 1 ? "flag" : "flags"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1.5 pt-0.5">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-ink-muted">Slept</span>
                    <span className="font-mono text-[13px] text-ink">{fmtMin(t.sleepTimeMin)}</span>
                  </div>
                  <div className="text-[11px] leading-snug text-ink-muted">{t.status}</div>
                </div>
                {!t.isReal && hover === t.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/85 text-[16px] font-medium uppercase tracking-[0.2em] text-ground-raised">
                    Fake
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="text-[22px] font-normal leading-none tracking-[-0.01em] text-ink">{value}</span>
    </div>
  );
}
