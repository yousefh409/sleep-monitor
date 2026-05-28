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
            title={`${fmtClock(r.ts)} · ${stateLabel(r.sleep_state)}`}
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
