type Props = { text: string | null | undefined };

export function SleepHealth({ text }: Props) {
  if (!text || text.trim().length === 0) return null;
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">Sleep health</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}
