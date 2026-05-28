type WakeEvent = { ts: string; likely_cause: string };

type Props = {
  events: WakeEvent[] | null;
  // Used to disambiguate old reports (LLM wrote UTC HH:MM) from new ones (local PST HH:MM):
  // if treating HH:MM as local doesn't land inside the night's window, we try UTC.
  nightStartedAt?: string | null;
  nightEndedAt?: string | null;
};

function fmtLocal(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// Build a Date for "today's H:M" in either UTC or local PST, on the same calendar day as the night.
function candidate(nightDate: Date, h: number, m: number, mode: "utc" | "local"): Date {
  const y = nightDate.getUTCFullYear();
  const mo = nightDate.getUTCMonth();
  const d = nightDate.getUTCDate();
  if (mode === "utc") {
    return new Date(Date.UTC(y, mo, d, h, m));
  }
  // local PST: compute the UTC instant that, when viewed in PST, shows h:m on the night's PST date
  const pst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(nightDate);
  const py = +pst.find((p) => p.type === "year")!.value;
  const pm = +pst.find((p) => p.type === "month")!.value;
  const pd = +pst.find((p) => p.type === "day")!.value;
  const guess = new Date(Date.UTC(py, pm - 1, pd, h, m));
  // adjust for offset between PST wall clock and UTC of the guess
  const offsetMin = -new Date(guess.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })).getTimezoneOffset();
  return new Date(guess.getTime() + offsetMin * 60_000 - guess.getTimezoneOffset() * 60_000);
}

function fmtWakeTs(ts: string, startedAt?: string | null, endedAt?: string | null): string {
  const m = ts.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return ts;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return ts;

  if (startedAt && endedAt) {
    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(endedAt).getTime();
    const nightDate = new Date(startedAt);

    // Try both interpretations; prefer the one inside the session window.
    const tryAt = (mode: "utc" | "local") => {
      const day0 = candidate(nightDate, h, min, mode);
      const day1 = new Date(day0.getTime() + 86_400_000);
      for (const dt of [day0, day1]) {
        if (dt.getTime() >= startMs - 60_000 && dt.getTime() <= endMs + 60_000) return dt;
      }
      return null;
    };
    const fromUtc = tryAt("utc");
    if (fromUtc) return fmtLocal(fromUtc);
    const fromLocal = tryAt("local");
    if (fromLocal) return fmtLocal(fromLocal);
  }

  // Fallback: assume HH:MM is already a local 24h clock value.
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(min).padStart(2, "0")} ${period}`;
}

export function WakeEvents({ events, nightStartedAt, nightEndedAt }: Props) {
  if (!events || events.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Wake events</h2>
      <ul className="space-y-1.5 text-[15px] text-ink">
        {events.map((e, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-mono text-[13px] text-ink-muted">
              {fmtWakeTs(e.ts, nightStartedAt, nightEndedAt)}
            </span>
            <span>{e.likely_cause}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
