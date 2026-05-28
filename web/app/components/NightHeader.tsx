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
        className="rounded-full p-3 text-4xl leading-none text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule enabled:hover:text-ink"
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
          className="rounded-full p-3 text-4xl leading-none text-ink-muted transition disabled:opacity-30 enabled:hover:bg-rule enabled:hover:text-ink"
        >
          <span aria-hidden>›</span>
        </button>
      </div>
    </header>
  );
}
