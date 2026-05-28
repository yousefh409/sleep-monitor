# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `web/app/page.tsx` into a single-night viewer anchored on last night's stats, with a heatmap calendar popover, prev/next arrows, a today-in-progress slot, and a coherent bookish × mineral visual language.

**Architecture:** One client-rendered page that resolves a "slot" from a `?d=YYYY-MM-DD` (PST) query param. A slot is either a completed night row or the today-in-progress slot. Data comes from three endpoints: `/api/nights` (list for calendar + neighbors), `/api/nights/:id` (extended to all 40 fields per minute), and a new `/api/today` (in-progress telemetry). Components are split by responsibility under `web/app/components/`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Chart.js + react-chartjs-2, Postgres via `pg`.

**Note on TDD:** The `web/` package has no test framework configured and no existing tests. Adding one is out of scope for this UI redesign. Each task instead ends with a **manual verification step** (build, lint, or browser smoke test). If a test framework is later added, the verification steps can be replaced with proper tests.

**Reference spec:** [docs/superpowers/specs/2026-05-28-dashboard-redesign-design.md](../specs/2026-05-28-dashboard-redesign-design.md)

**Working directory for all commands:** `/Users/yousefh/Desktop/Classes/EE284A/project/web`

**Reminder (from web/AGENTS.md):** Next.js 16 may differ from training data. When in doubt about App Router APIs, check `node_modules/next/dist/docs/`.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `app/globals.css` | Modify | Define color tokens, type rhythm, base body styling |
| `app/api/nights/route.ts` | Modify | Bump `LIMIT 30 → 365` |
| `app/api/nights/[id]/route.ts` | Modify | Extend telemetry aggregation to all 40 fields |
| `app/api/today/route.ts` | Create | Today's PST-day telemetry, aggregated per minute |
| `lib/slots.ts` | Create | PST date utils, slot list builder, neighbor lookup |
| `app/components/NightHeader.tsx` | Create | Prev/next arrows, date button, in-progress pill |
| `app/components/CalendarPopover.tsx` | Create | Heatmap calendar popover |
| `app/components/NightHero.tsx` | Create | Big score + headline (and in-progress variant) |
| `app/components/StatsRow.tsx` | Create | Five at-a-glance stats |
| `app/components/StageBand.tsx` | Create | Extracted from `page.tsx`, restyled |
| `app/components/WakeEvents.tsx` | Create | Wake events list |
| `app/components/Recommendations.tsx` | Create | Recommendations list |
| `app/components/EmptyState.tsx` | Create | "Waiting for your first night" |
| `app/components/LiveCharts.tsx` | Modify | Remove card chrome, copper accent, hairline axes |
| `app/components/TelemetryTable.tsx` | Modify | Collapsible toggle; restyled |
| `app/page.tsx` | Modify (rewrite) | Slim orchestrator |

---

## Task 1: Visual tokens in globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Inspect current globals.css**

Run: `cat app/globals.css`
Note what's currently there so the new tokens slot in without removing essential setup (Tailwind imports, font setup).

- [ ] **Step 2: Add the new color and type tokens**

At the **top of the file**, after any Tailwind `@import` directive, add the following block. If the file currently defines competing `--background` / `--foreground` variables, leave them in place — the new tokens are additive.

```css
:root {
  /* Mood: bookish × mineral */
  --ground: #F5F1E8;
  --ground-raised: #FFFFFF;
  --ink: #1A1815;
  --ink-muted: #5C574F;
  --rule: #E5DFD2;
  --copper: #8B6F47;
  --copper-soft: rgba(139, 111, 71, 0.15);
  --stage-out: #EBE5D6;
  --stage-awake: #C9C0AC;
  --stage-light: #7A7468;
  --stage-deep: #1A1815;

  /* Heatmap scale (5 steps, low → high sleep score). Derived from --copper. */
  --heat-1: rgba(139, 111, 71, 0.12);
  --heat-2: rgba(139, 111, 71, 0.28);
  --heat-3: rgba(139, 111, 71, 0.46);
  --heat-4: rgba(139, 111, 71, 0.68);
  --heat-5: rgba(139, 111, 71, 0.92);
}

@theme {
  /* Tailwind v4: expose tokens as utilities like bg-ground, text-ink */
  --color-ground: #F5F1E8;
  --color-ground-raised: #FFFFFF;
  --color-ink: #1A1815;
  --color-ink-muted: #5C574F;
  --color-rule: #E5DFD2;
  --color-copper: #8B6F47;
  --color-copper-soft: rgba(139, 111, 71, 0.15);
}

body {
  background: var(--ground);
  color: var(--ink);
  font-feature-settings: "ss01", "cv11";
}

/* Pulsing ring for today-in-progress slot in calendar */
@keyframes copper-pulse {
  0%, 100% { box-shadow: 0 0 0 1px var(--copper); }
  50% { box-shadow: 0 0 0 1px var(--copper), 0 0 0 4px var(--copper-soft); }
}
.pulse-copper { animation: copper-pulse 2s ease-in-out infinite; }
```

- [ ] **Step 3: Verify build still compiles**

Run: `npm run build 2>&1 | tail -20`
Expected: `✓ Compiled successfully` (no CSS or type errors). Warnings about unused tokens are OK.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "Dashboard: add bookish × mineral color and type tokens"
```

---

## Task 2: Backend — bump /api/nights LIMIT to 365

**Files:**
- Modify: `app/api/nights/route.ts`

- [ ] **Step 1: Edit the query**

Open `app/api/nights/route.ts`. Replace `LIMIT 30` with `LIMIT 365` in the SQL query. The full updated file body:

```ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rows } = await pool.query(
    `SELECT n.id, n.started_at, n.ended_at, n.duration_sec, n.sleep_score, r.headline
     FROM nights n LEFT JOIN reports r ON r.night_id = n.id
     ORDER BY n.started_at DESC LIMIT 365`
  );
  return NextResponse.json({ nights: rows });
}
```

- [ ] **Step 2: Verify**

Run: `npm run build 2>&1 | tail -5`
Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add app/api/nights/route.ts
git commit -m "Dashboard: bump /api/nights limit from 30 to 365 for calendar heatmap"
```

---

## Task 3: Backend — extend /api/nights/:id telemetry to all 40 fields

**Files:**
- Modify: `app/api/nights/[id]/route.ts`

- [ ] **Step 1: Replace the telemetry aggregation query**

Open `app/api/nights/[id]/route.ts`. Replace the `pool.query` that builds `telemetry` with the version below. Every numeric field that exists in `telemetry` is averaged per minute. Integer-typed fields are cast back to int.

```ts
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
   FROM telemetry WHERE device = $1 AND ts BETWEEN $2 AND $3
   GROUP BY date_trunc('minute', ts) ORDER BY t`,
  [night.device, night.started_at, night.ended_at]);
```

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean compile.

- [ ] **Step 3: Verify endpoint returns all 40 fields**

Manual check (requires the dev server and a logged-in browser session, since the route is auth-gated):
1. `npm run dev` (in another terminal)
2. Visit `/api/nights` while logged in, copy any night id.
3. Visit `/api/nights/<id>` and confirm each telemetry row has keys for: `presence`, `in_bed`, `sleep_state`, `breathing`, `heart_rate`, `turnover`, `body_move_large`, `body_move_small`, `apnea_events`, `hum_presence`, `hum_motion`, `hum_range`, `hum_dist_cm`, `hr_instant`, `breath_state`, `breath_value`, `wake_dur`, `light_sleep_dur`, `deep_sleep_dur`, `sleep_quality`, `disturbances`, `quality_rating`, `abnormal_struggle`, `unattended_state`, `unattended_time`, `sleep_score`, `sleep_time_min`, `shallow_pct`, `deep_pct`, `time_out_of_bed`, `exit_count`, `turnover_total`, `temp_c`, `humidity`, `pressure_hpa`, `gas_ohm`, `db_spl`, `light_raw`, `ts`, `t`.

If you can't easily auth in the browser, skip this verification and rely on the build + the smoke test in Task 16.

- [ ] **Step 4: Commit**

```bash
git add app/api/nights/[id]/route.ts
git commit -m "Dashboard: aggregate all 40 telemetry fields per minute in /api/nights/:id"
```

---

## Task 4: Backend — add /api/today endpoint

**Files:**
- Create: `app/api/today/route.ts`

- [ ] **Step 1: Inspect how auth is enforced on existing routes**

Run: `cat app/api/live/route.ts app/api/nights/route.ts | head -40`
Note: the existing routes do not include explicit auth code — auth is enforced upstream (likely by `proxy.ts` / middleware). The new endpoint will follow the same pattern.

- [ ] **Step 2: Create the route**

Create `app/api/today/route.ts`:

```ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// PST window: midnight America/Los_Angeles → now.
// Returns telemetry aggregated per minute, all 40 fields,
// matching the shape of /api/nights/:id telemetry rows.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = url.searchParams.get("device") ?? "sleep01";

  const { rows: telemetry } = await pool.query(
    `WITH bounds AS (
       SELECT date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles')
                AT TIME ZONE 'America/Los_Angeles' AS start_ts,
              now() AS end_ts
     )
     SELECT extract(epoch FROM date_trunc('minute', t.ts))::int AS t,
            min(t.ts) AS ts,
            avg(t.presence)::int AS presence,
            avg(t.in_bed)::int AS in_bed,
            avg(t.sleep_state)::int AS sleep_state,
            avg(t.breathing)::int AS breathing,
            avg(t.heart_rate)::int AS heart_rate,
            avg(t.turnover)::int AS turnover,
            avg(t.body_move_large)::int AS body_move_large,
            avg(t.body_move_small)::int AS body_move_small,
            avg(t.apnea_events)::int AS apnea_events,
            avg(t.hum_presence)::int AS hum_presence,
            avg(t.hum_motion)::int AS hum_motion,
            avg(t.hum_range)::int AS hum_range,
            avg(t.hum_dist_cm)::int AS hum_dist_cm,
            avg(t.hr_instant)::int AS hr_instant,
            avg(t.breath_state)::int AS breath_state,
            avg(t.breath_value)::int AS breath_value,
            avg(t.wake_dur)::int AS wake_dur,
            avg(t.light_sleep_dur)::int AS light_sleep_dur,
            avg(t.deep_sleep_dur)::int AS deep_sleep_dur,
            avg(t.sleep_quality)::int AS sleep_quality,
            avg(t.disturbances)::int AS disturbances,
            avg(t.quality_rating)::int AS quality_rating,
            avg(t.abnormal_struggle)::int AS abnormal_struggle,
            avg(t.unattended_state)::int AS unattended_state,
            avg(t.unattended_time)::int AS unattended_time,
            avg(t.sleep_score)::int AS sleep_score,
            avg(t.sleep_time_min)::int AS sleep_time_min,
            avg(t.shallow_pct)::int AS shallow_pct,
            avg(t.deep_pct)::int AS deep_pct,
            avg(t.time_out_of_bed)::int AS time_out_of_bed,
            avg(t.exit_count)::int AS exit_count,
            avg(t.turnover_total)::int AS turnover_total,
            avg(t.temp_c) AS temp_c,
            avg(t.humidity) AS humidity,
            avg(t.pressure_hpa) AS pressure_hpa,
            avg(t.gas_ohm)::int AS gas_ohm,
            avg(t.db_spl) AS db_spl,
            avg(t.light_raw)::int AS light_raw
     FROM telemetry t, bounds b
     WHERE t.device = $1 AND t.ts BETWEEN b.start_ts AND b.end_ts
     GROUP BY date_trunc('minute', t.ts) ORDER BY t`,
    [device]);

  return NextResponse.json({ device, telemetry });
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean compile, with a route entry for `/api/today` in the build output.

- [ ] **Step 4: Commit**

```bash
git add app/api/today/route.ts
git commit -m "Dashboard: add /api/today endpoint for in-progress slot"
```

---

## Task 5: Slot model and PST date helpers

**Files:**
- Create: `lib/slots.ts`

- [ ] **Step 1: Create the helper module**

Create `lib/slots.ts`:

```ts
// Slot model: every page view is a Slot.
// A slot is either a completed night row or today-in-progress.

export type NightRow = {
  id: number;
  started_at: string;   // ISO timestamp
  ended_at: string;     // ISO timestamp
  duration_sec: number;
  sleep_score: number | null;
  headline: string | null;
};

export type Slot = {
  date: string;                  // YYYY-MM-DD in America/Los_Angeles
  nightId: number | null;        // null = today-in-progress
  score: number | null;
  headline: string | null;
  inProgress: boolean;
};

const PST = "America/Los_Angeles";

// "YYYY-MM-DD" for a Date in PST.
export function pstDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PST,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const y = parts.find(p => p.type === "year")!.value;
  const m = parts.find(p => p.type === "month")!.value;
  const day = parts.find(p => p.type === "day")!.value;
  return `${y}-${m}-${day}`;
}

export function todayPst(): string {
  return pstDate(new Date());
}

// Build the ordered slot list from the nights API response.
// Order: oldest → newest. Today-in-progress is appended if today
// has no completed nights row.
export function buildSlots(nights: NightRow[]): Slot[] {
  const today = todayPst();
  const slots: Slot[] = nights
    .map(n => ({
      date: pstDate(n.started_at),
      nightId: n.id,
      score: n.sleep_score,
      headline: n.headline,
      inProgress: false,
    }))
    // API returns newest first; we want oldest → newest for prev/next math.
    .reverse();

  const hasToday = slots.some(s => s.date === today);
  if (!hasToday) {
    slots.push({
      date: today,
      nightId: null,
      score: null,
      headline: null,
      inProgress: true,
    });
  }
  return slots;
}

// Find a slot by its PST date string. Returns null if none matches.
export function slotByDate(slots: Slot[], date: string): Slot | null {
  return slots.find(s => s.date === date) ?? null;
}

// Default slot: last completed night if any, else today-in-progress, else null.
export function defaultSlot(slots: Slot[]): Slot | null {
  const completed = slots.filter(s => !s.inProgress);
  if (completed.length > 0) return completed[completed.length - 1];
  return slots[slots.length - 1] ?? null;
}

// Step to the previous or next slot in the ordered list.
// Returns null when at the boundary.
export function neighborSlot(
  slots: Slot[],
  current: Slot,
  direction: "prev" | "next"
): Slot | null {
  const i = slots.findIndex(s => s.date === current.date);
  if (i < 0) return null;
  const j = direction === "prev" ? i - 1 : i + 1;
  if (j < 0 || j >= slots.length) return null;
  return slots[j];
}

// Heatmap bucket index 0–4 for a score in 0..100.
// Returns null for missing scores.
export function heatBucket(score: number | null): 0 | 1 | 2 | 3 | 4 | null {
  if (score === null || score === undefined) return null;
  if (score >= 85) return 4;
  if (score >= 70) return 3;
  if (score >= 55) return 2;
  if (score >= 40) return 1;
  return 0;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/slots.ts
git commit -m "Dashboard: add slot model and PST date helpers"
```

---

## Task 6: NightHeader component

**Files:**
- Create: `app/components/NightHeader.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/NightHeader.tsx`:

```tsx
"use client";

import type { Slot } from "@/lib/slots";

type Props = {
  slot: Slot;
  prev: Slot | null;
  next: Slot | null;
  onPrev: () => void;
  onNext: () => void;
  onOpenCalendar: () => void;
};

function fmt(date: string): string {
  // date is "YYYY-MM-DD" in PST; render as "Wed, May 27"
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function NightHeader({ slot, prev, next, onPrev, onNext, onOpenCalendar }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 py-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={!prev}
        aria-label="Previous night"
        className="rounded-full p-2 text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule"
      >
        <span aria-hidden>‹</span>
      </button>

      <button
        type="button"
        onClick={onOpenCalendar}
        className="flex items-center gap-2 rounded-full px-4 py-1.5 text-[15px] text-ink transition hover:bg-rule"
      >
        <span>{fmt(slot.date)}</span>
        <span className="text-xs text-ink-muted" aria-hidden>▾</span>
      </button>

      <div className="flex items-center gap-3">
        {slot.inProgress && (
          <span className="flex items-center gap-1.5 rounded-full bg-copper-soft px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-copper">
            <span className="h-1.5 w-1.5 rounded-full bg-copper" />
            in progress
          </span>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!next}
          aria-label="Next night"
          className="rounded-full p-2 text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule"
        >
          <span aria-hidden>›</span>
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/NightHeader.tsx
git commit -m "Dashboard: add NightHeader with prev/next + date popover trigger"
```

---

## Task 7: CalendarPopover component

**Files:**
- Create: `app/components/CalendarPopover.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/CalendarPopover.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { type Slot, todayPst, heatBucket } from "@/lib/slots";

type Props = {
  slots: Slot[];
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
};

// Week starts Monday. Returns 6 weeks × 7 days, all "YYYY-MM-DD" PST-equivalent strings.
function monthGrid(year: number, month: number): string[][] {
  // month is 0-indexed JS month
  const first = new Date(Date.UTC(year, month, 1));
  const firstDow = (first.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  const gridStart = new Date(Date.UTC(year, month, 1 - firstDow));
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(gridStart);
      cell.setUTCDate(gridStart.getUTCDate() + w * 7 + d);
      const y = cell.getUTCFullYear();
      const m = String(cell.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(cell.getUTCDate()).padStart(2, "0");
      row.push(`${y}-${m}-${dd}`);
    }
    weeks.push(row);
  }
  return weeks;
}

const HEAT_CLASSES = ["bg-[var(--heat-1)]", "bg-[var(--heat-2)]", "bg-[var(--heat-3)]", "bg-[var(--heat-4)]", "bg-[var(--heat-5)]"] as const;

export function CalendarPopover({ slots, selectedDate, onSelect, onClose, anchorRef }: Props) {
  const [y, setY] = useState<number>(() => Number(selectedDate.slice(0, 4)));
  const [m, setM] = useState<number>(() => Number(selectedDate.slice(5, 7)) - 1);
  const today = todayPst();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target) && anchorRef.current && !anchorRef.current.contains(target)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  const grid = monthGrid(y, m);
  const monthLabel = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC", year: "numeric", month: "long",
  });
  const bySlot = new Map(slots.map(s => [s.date, s]));

  const navMonth = (dir: -1 | 1) => {
    let nm = m + dir;
    let ny = y;
    if (nm < 0) { nm = 11; ny -= 1; }
    if (nm > 11) { nm = 0; ny += 1; }
    setY(ny); setM(nm);
  };

  const goToday = () => {
    setY(Number(today.slice(0, 4)));
    setM(Number(today.slice(5, 7)) - 1);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Pick a date"
      className="absolute z-50 mt-2 w-80 rounded-2xl border border-rule bg-ground-raised p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => navMonth(-1)} aria-label="Previous month" className="rounded p-1 text-ink-muted hover:bg-rule">‹</button>
          <span className="text-sm font-medium text-ink">{monthLabel}</span>
          <button type="button" onClick={() => navMonth(1)} aria-label="Next month" className="rounded p-1 text-ink-muted hover:bg-rule">›</button>
        </div>
        <button type="button" onClick={goToday} className="text-[11px] uppercase tracking-[0.08em] text-copper hover:underline">
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[0.08em] text-ink-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.flat().map((date) => {
          const inMonth = Number(date.slice(5, 7)) - 1 === m;
          const slot = bySlot.get(date) ?? null;
          const bucket = slot ? heatBucket(slot.score) : null;
          const isSelected = date === selectedDate;
          const isToday = date === today;
          const isInProgress = slot?.inProgress ?? false;
          const day = Number(date.slice(8, 10));
          const clickable = !!slot;
          const heatClass = bucket !== null ? HEAT_CLASSES[bucket] : "";
          const tooltip = slot
            ? slot.inProgress
              ? `${date} · in progress`
              : `${date}${slot.score != null ? ` · ${slot.score}` : ""}`
            : `${date} · no data`;
          return (
            <button
              key={date}
              type="button"
              disabled={!clickable}
              onClick={() => { if (clickable) onSelect(date); }}
              title={tooltip}
              aria-label={tooltip}
              aria-current={isSelected ? "date" : undefined}
              className={[
                "relative aspect-square rounded-md text-left text-[11px] transition",
                inMonth ? "text-ink" : "text-ink-muted/50",
                clickable ? "cursor-pointer hover:ring-1 hover:ring-ink-muted" : "cursor-default",
                heatClass,
                isSelected ? "ring-1 ring-ink" : "",
                isInProgress && !isSelected ? "pulse-copper" : "",
                isToday && !isInProgress ? "outline outline-1 outline-rule" : "",
              ].filter(Boolean).join(" ")}
            >
              <span className="absolute left-1 top-0.5">{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/CalendarPopover.tsx
git commit -m "Dashboard: add heatmap calendar popover"
```

---

## Task 8: NightHero component

**Files:**
- Create: `app/components/NightHero.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/NightHero.tsx`:

```tsx
type Props = {
  score: number | null;
  headline: string | null;
  inProgress: boolean;
};

export function NightHero({ score, headline, inProgress }: Props) {
  const display = inProgress ? "—" : (score ?? "—");
  const sub = inProgress
    ? "in progress"
    : headline
      ? headline
      : score === null
        ? "no report yet"
        : "";

  return (
    <section className="flex flex-col items-baseline gap-3 pt-6 pb-2 sm:flex-row sm:gap-8">
      <span
        className="font-light leading-none tracking-[-0.04em] text-copper"
        style={{ fontSize: "clamp(96px, 14vw, 144px)" }}
      >
        {display}
      </span>
      {sub && (
        <p className="max-w-prose text-[22px] font-light leading-[1.2] tracking-[-0.01em] text-ink">
          {sub}
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/NightHero.tsx
git commit -m "Dashboard: add NightHero with in-progress variant"
```

---

## Task 9: StatsRow component

**Files:**
- Create: `app/components/StatsRow.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/StatsRow.tsx`:

```tsx
type StagePct = { awake: number; light: number; deep: number };
type Vitals = { avg_breathing: number; avg_heart_rate: number };

type Props = {
  stagePct: StagePct | null;
  vitals: Vitals | null;
};

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="text-[22px] font-normal leading-none tracking-[-0.01em] text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-muted">{unit}</span>}
      </span>
    </div>
  );
}

export function StatsRow({ stagePct, vitals }: Props) {
  const fmt = (n: number | null | undefined) =>
    n === null || n === undefined ? "—" : String(n);
  return (
    <section className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-rule pt-6 sm:grid-cols-5">
      <Stat label="Awake" value={fmt(stagePct?.awake)} unit="%" />
      <Stat label="Light" value={fmt(stagePct?.light)} unit="%" />
      <Stat label="Deep" value={fmt(stagePct?.deep)} unit="%" />
      <Stat label="Avg br" value={fmt(vitals?.avg_breathing)} unit="bpm" />
      <Stat label="Avg hr" value={fmt(vitals?.avg_heart_rate)} unit="bpm" />
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/StatsRow.tsx
git commit -m "Dashboard: add StatsRow with five at-a-glance stats"
```

---

## Task 10: Extract StageBand component

**Files:**
- Create: `app/components/StageBand.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/StageBand.tsx`. This is the extracted version of `StageBand` from `app/page.tsx`, restyled with stage tokens. It reads `sleep_state` per row.

```tsx
type Row = { sleep_state: number | null };

type Props = { rows: Row[] };

const COLOR: Record<number, string> = {
  0: "var(--stage-out)",
  1: "var(--stage-awake)",
  2: "var(--stage-light)",
  3: "var(--stage-deep)",
};

function fill(state: number | null | undefined): string {
  if (state === null || state === undefined) return "var(--stage-out)";
  return COLOR[state] ?? "var(--stage-out)";
}

export function StageBand({ rows }: Props) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep stages</h2>
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {rows.map((r, i) => (
          <div key={i} style={{ flex: 1, background: fill(r.sleep_state) }} />
        ))}
      </div>
      <div className="flex gap-4 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-out)" }} />out</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-awake)" }} />awake</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-light)" }} />light</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--stage-deep)" }} />deep</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/StageBand.tsx
git commit -m "Dashboard: extract StageBand component with new stage palette"
```

---

## Task 11: WakeEvents component

**Files:**
- Create: `app/components/WakeEvents.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/WakeEvents.tsx`:

```tsx
type WakeEvent = { ts: string; likely_cause: string };

type Props = { events: WakeEvent[] | null };

export function WakeEvents({ events }: Props) {
  if (!events || events.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Wake events</h2>
      <ul className="space-y-1.5 text-[15px] text-ink">
        {events.map((e, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-mono text-[13px] text-ink-muted">{e.ts}</span>
            <span>{e.likely_cause}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/WakeEvents.tsx
git commit -m "Dashboard: add WakeEvents component"
```

---

## Task 12: Recommendations component

**Files:**
- Create: `app/components/Recommendations.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/Recommendations.tsx`:

```tsx
type Props = { items: string[] | null };

export function Recommendations({ items }: Props) {
  if (!items || items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Tonight</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-ink">
        {items.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/Recommendations.tsx
git commit -m "Dashboard: add Recommendations component"
```

---

## Task 13: EmptyState component

**Files:**
- Create: `app/components/EmptyState.tsx`

- [ ] **Step 1: Create the component**

Create `app/components/EmptyState.tsx`:

```tsx
export function EmptyState() {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div
        aria-hidden
        className="h-12 w-12 rounded-full border border-rule"
        style={{ background: "var(--copper-soft)" }}
      />
      <h2 className="text-[22px] font-light tracking-[-0.01em] text-ink">Waiting for your first night</h2>
      <p className="text-[15px] text-ink-muted">
        Once the bedside device records a session, it will appear here.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/EmptyState.tsx
git commit -m "Dashboard: add EmptyState"
```

---

## Task 14: Restyle LiveCharts

**Files:**
- Modify: `app/components/LiveCharts.tsx`

- [ ] **Step 1: Replace the palette constants**

Open `app/components/LiveCharts.tsx`. Replace the `STONE_*` constants block (lines that begin with `const STONE_900 = ...` through `const STONE_200 = ...`) with the new palette:

```ts
const INK = "#1A1815";
const INK_MUTED = "#5C574F";
const RULE = "#E5DFD2";
const COPPER = "#8B6F47";
const GROUND_RAISED = "#FFFFFF";
```

- [ ] **Step 2: Update color references**

In the same file, replace every reference to the removed constants:
- `STONE_900` → `INK`
- `STONE_500` → `INK_MUTED`
- `STONE_400` → `INK_MUTED`
- `STONE_300` → `RULE`
- `STONE_200` → `RULE`

Then swap the primary series stroke from `INK` to `COPPER` in each chart's primary dataset:
- `VitalsChart`: change the `borderColor` and `backgroundColor` for the `"breathing"` dataset from `INK` to `INK_MUTED`, and for the `"heart rate"` dataset from `INK_MUTED` to `COPPER`.
- `EnvironmentChart`: `tempData` primary color becomes `COPPER`, `presData` primary color becomes `COPPER`. Leave humidity and gas as `INK_MUTED`.
- `AudioLightChart`: `"dB SPL"` becomes `COPPER`. `"light"` stays `INK_MUTED`.

Then change the tooltip `backgroundColor` from `"#ffffff"` to `GROUND_RAISED` (functionally identical, semantic).

- [ ] **Step 3: Replace `CardShell` with a chrome-free wrapper**

Replace the `CardShell` function definition with:

```tsx
function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{title}</h2>
      <div className="h-56">{children}</div>
    </section>
  );
}
```

Then replace every usage of `<CardShell ...>` with `<ChartShell ...>`. In `EnvironmentChart`, replace the outer `<section className="rounded-2xl bg-white p-6 shadow-sm">` with `<ChartShell title="Environment">` — and remove the now-duplicate `<h2>` inside.

Also update the four sub-spark titles in `EnvironmentChart` from `text-stone-500` to `text-ink-muted`, and the wrapper from `text-xs` to keep readable: `<p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-ink-muted">temp °C</p>` (repeat for each).

- [ ] **Step 4: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean compile.

- [ ] **Step 5: Commit**

```bash
git add app/components/LiveCharts.tsx
git commit -m "Dashboard: restyle LiveCharts to new palette, drop card chrome"
```

---

## Task 15: Wrap TelemetryTable with a collapse toggle

**Files:**
- Modify: `app/components/TelemetryTable.tsx`

- [ ] **Step 1: Replace the outer `<section>` with a collapsible container**

Open `app/components/TelemetryTable.tsx`. In the `TelemetryTable` function, add `const [open, setOpen] = useState(false);` next to the existing `const [filter, ...]` line.

Then replace the existing `<section className="rounded-2xl bg-white p-6 shadow-sm">` opener through the end of the matching `</section>` with the structure below. Keep the existing table markup (`<div className="max-h-[28rem]...">...</div>`) verbatim inside the `{open && (...)}` block.

```tsx
return (
  <section className="rounded-2xl border border-rule bg-ground-raised p-6">
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-4"
    >
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">
        Raw telemetry
      </h2>
      <span className="text-[11px] uppercase tracking-[0.08em] text-copper">
        {open ? "Hide raw data" : "Show raw data"}
      </span>
    </button>

    {open && (
      <div className="mt-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-rule bg-ground-raised px-2 py-1 text-xs text-ink"
          >
            <option value="all">All fields ({ALL_COLS.length})</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label} ({g.cols.length})
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-muted">{newestFirst.length} rows</span>
        </div>

        <div className="max-h-[28rem] overflow-auto">
          <table className="min-w-full text-left">
            <thead className="sticky top-0 z-10 bg-ground-raised">
              <tr className="border-b border-rule text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                <th className="whitespace-nowrap py-2 pr-4 font-normal">Time</th>
                {visibleCols.map((c) => (
                  <th key={c.key} className="whitespace-nowrap py-2 pr-4 font-normal">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((r, i) => (
                <tr key={i} className="border-t border-rule text-ink">
                  <td className="whitespace-nowrap py-2 pr-4 text-sm">{fmtTs(r.ts)}</td>
                  {visibleCols.map((c) => {
                    const v = r[c.key];
                    const txt = c.fmt ? c.fmt(v) : dash(v);
                    return (
                      <td key={c.key} className="whitespace-nowrap py-2 pr-4 font-mono text-xs">
                        {txt}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {newestFirst.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-ink-muted" colSpan={visibleCols.length + 1}>
                    No telemetry rows yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </section>
);
```

Make sure `useState` is imported at the top: the file already imports `{ useState }`, so no change there.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -10`
Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add app/components/TelemetryTable.tsx
git commit -m "Dashboard: collapse telemetry table behind a toggle, restyle to new palette"
```

---

## Task 16: Rewrite app/page.tsx as orchestrator

**Files:**
- Modify: `app/page.tsx` (full rewrite)

- [ ] **Step 1: Confirm shape of `/api/nights/:id` after Task 3**

The response is `{ night, telemetry }` where `night` includes `id, device, started_at, ended_at, duration_sec, sleep_score, headline, report_score, stage_pct, vitals, wake_events, recommendations` and `telemetry` is an array of per-minute rows containing all 40 fields (plus `t` and `ts`).

- [ ] **Step 2: Replace `app/page.tsx` with the orchestrator**

Replace the entire file contents with:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { VitalsChart, EnvironmentChart, AudioLightChart } from "./components/LiveCharts";
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

export default function Page() {
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

  // Convert rows (with `ts` ISO) to the shape LiveCharts expects (which already takes ts).
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
        />

        <StatsRow
          stagePct={slot.inProgress ? null : (detail?.night.stage_pct ?? null)}
          vitals={slot.inProgress ? null : (detail?.night.vitals ?? null)}
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
        <AudioLightChart rows={chartRows} />

        <TelemetryTable rows={chartRows} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: clean compile. If there are type warnings about implicit `any` on the telemetry rows, leave them — the chart/table components accept loose shapes by design.

- [ ] **Step 4: Verify lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: clean lint, or only the `no-explicit-any` overrides already inline-disabled. No new errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "Dashboard: rewrite page as slot-based night viewer"
```

---

## Task 17: Browser smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Wait for "Ready in ..." line.

- [ ] **Step 2: Visit `/` and verify the default state**

In a browser, open `http://localhost:3000/` (auth as required).
Expected:
- Page background is plaster cream (`#F5F1E8`).
- Header shows: `‹ [today's date or last-night date] ▾ ›`.
- If there is a completed night, the hero shows a copper sleep score and a headline.
- The stats row, stage band, wake events, recommendations, and the three charts are all visible.
- The "Raw telemetry" section is collapsed at the bottom with a "Show raw data" link.
- No console errors.

- [ ] **Step 3: Test prev/next arrows**

Click the left arrow. Expected: URL changes to `/?d=<earlier-date>`, the page loads the earlier night, hero updates. If no earlier nights exist, the arrow is faded and the click does nothing.
Click the right arrow back to the most recent. Expected: returns to last night.
If today has no completed night, clicking the right arrow at "last night" lands on the in-progress slot: hero score reads "—" with "in progress" beside it; an "● in progress" pill appears in the header.

- [ ] **Step 4: Open the calendar popover**

Click the date button. Expected:
- A 320px popover appears below the date.
- The current month is shown with Mon → Sun column headers.
- Days with sleep data are filled with copper at varying opacity (heatmap).
- Today (if no completed row exists for today) has a thin pulsing copper ring.
- The selected day has a thin ink ring.
- Hovering an empty day shows a "no data" tooltip; the click is a no-op.
- Hovering a day with data shows e.g. `2026-05-27 · 82`.
- "Today" link in the corner jumps the popover to the current month.
- Esc closes the popover. Clicking outside closes it.

- [ ] **Step 5: Click a heatmap day**

Click a day that has data. Expected: popover closes, URL updates to `?d=<that-date>`, content updates.

- [ ] **Step 6: Expand the raw telemetry table**

Click "Show raw data". Expected: table appears with all 40 columns by default, filter dropdown works, "Hide raw data" toggles it back.

- [ ] **Step 7: Verify charts use copper accent**

Inspect each of the three charts. Expected: heart-rate / temp / dB SPL series stroke is copper (`#8B6F47`); secondary series are warm slate gray. No card chrome (no rounded white box around each chart) — only an uppercase eyebrow label.

- [ ] **Step 8: Verify console is clean**

Open devtools console. Expected: no errors. Warnings about React strict mode double-fetches are OK.

- [ ] **Step 9: Stop the dev server**

`Ctrl+C` in the dev terminal.

- [ ] **Step 10: Final commit (only if there were any small fixes during smoke test)**

If any fixes were needed during the smoke test, commit them with a message like:

```bash
git commit -am "Dashboard: smoke-test fixes"
```

Otherwise, skip this step.

---

## Self-review checklist (already applied — do not skip if re-reading)

- Spec coverage: every section of the spec (info architecture, page structure, calendar popover, edge cases, visual language, chart styling, components, API changes, URL state) maps to one or more tasks above.
- Placeholders: every step contains the actual code or command to run. No "implement appropriately" or "add error handling" sentinels.
- Type consistency: `Slot`, `NightRow`, `NightDetail`, `StagePct`, `Vitals`, `WakeEvent` are defined in exactly one place each and used consistently across tasks.
- Edge cases covered: prev/next at boundaries (NightHeader disabled state), no-data day in calendar (disabled + tooltip), today-in-progress slot (buildSlots appends it, NightHeader pill, NightHero variant, charts via /api/today), empty state (EmptyState component + check in page.tsx).
