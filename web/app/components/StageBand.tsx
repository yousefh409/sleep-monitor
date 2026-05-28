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

export function StageBand({ rows }: Props) {
  if (rows.length === 0) return null;

  // Per-row tooltip: range and duration of the contiguous run the row belongs to.
  const tooltips: string[] = new Array(rows.length);
  let s = 0;
  for (let i = 1; i <= rows.length; i++) {
    if (i === rows.length || rows[i].sleep_state !== rows[s].sleep_state) {
      const startTs = rows[s].ts;
      const endTs = rows[i - 1].ts;
      const startMs = new Date(startTs).getTime();
      const endMs = new Date(endTs).getTime();
      const minutes = Math.max(1, Math.round((endMs - startMs) / 60000) + 1);
      const text = `${fmtClock(startTs)} – ${fmtClock(endTs)} · ${stateLabel(rows[s].sleep_state)} (${minutes}m)`;
      for (let j = s; j < i; j++) tooltips[j] = text;
      s = i;
    }
  }

  const N = 5;
  const markers = Array.from({ length: N }, (_, i) => {
    const idx = Math.min(rows.length - 1, Math.round((i * (rows.length - 1)) / (N - 1)));
    return new Date(rows[idx].ts).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  });

  return (
    <section className="space-y-2">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep stages</h2>
      <div className="flex h-16 w-full overflow-hidden rounded-lg">
        {rows.map((r, i) => (
          <div
            key={i}
            style={{ flex: 1, background: fill(r.sleep_state) }}
            title={tooltips[i]}
          />
        ))}
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
