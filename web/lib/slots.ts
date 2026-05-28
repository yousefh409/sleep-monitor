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

// "Sleep date": which calendar day a night belongs to.
// Shifts bedtime back 6 hours so 1am Thursday counts as Wednesday.
export function sleepDate(iso: string): string {
  const t = new Date(iso).getTime() - 6 * 3600 * 1000;
  return pstDate(new Date(t));
}

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
      date: sleepDate(n.started_at),
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
