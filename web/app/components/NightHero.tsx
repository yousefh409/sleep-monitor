type Props = {
  score: number | null;
  headline: string | null;
  inProgress: boolean;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
};

function fmtClock(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function fmtDuration(sec: number | null): string | null {
  if (sec === null || sec === undefined) return null;
  const m = Math.round(sec / 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export function NightHero({ score, headline, inProgress, startedAt, endedAt, durationSec }: Props) {
  const display = inProgress ? "—" : (score ?? "—");
  const sub = inProgress
    ? "in progress"
    : headline
      ? headline
      : score === null
        ? "no report yet"
        : "";

  const bed = fmtClock(startedAt);
  const wake = fmtClock(endedAt);
  const dur = fmtDuration(durationSec);
  const showTimes = !inProgress && (bed || wake || dur);

  return (
    <section className="flex flex-col items-start gap-3 pt-6 pb-2 sm:flex-row sm:items-center sm:gap-8">
      <span
        className="font-light leading-none tracking-[-0.04em] text-copper"
        style={{ fontSize: "clamp(96px, 14vw, 144px)" }}
      >
        {display}
      </span>
      <div className="flex flex-col gap-3">
        {sub && (
          <p className="max-w-prose text-[22px] font-light leading-[1.2] tracking-[-0.01em] text-ink">
            {sub}
          </p>
        )}
        {showTimes && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[16px]">
            {bed && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-muted">Asleep</span>
                <span className="ml-2 font-mono text-ink">{bed}</span>
              </div>
            )}
            {wake && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-muted">Awake</span>
                <span className="ml-2 font-mono text-ink">{wake}</span>
              </div>
            )}
            {dur && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.08em] text-ink-muted">Total</span>
                <span className="ml-2 font-mono text-ink">{dur}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
