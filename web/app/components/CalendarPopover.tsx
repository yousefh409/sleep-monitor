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
