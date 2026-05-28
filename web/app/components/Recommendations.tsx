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
