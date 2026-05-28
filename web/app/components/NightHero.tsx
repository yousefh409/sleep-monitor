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
