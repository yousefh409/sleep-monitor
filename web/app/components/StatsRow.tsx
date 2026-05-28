type StagePct = { awake: number; light: number; deep: number };
type Vitals = { avg_breathing: number; avg_heart_rate: number };

type Props = {
  stagePct: StagePct | null;
  vitals: Vitals | null;
  // New: derived/aggregated stats. All optional; render "—" when null.
  durationSec: number | null;          // total night duration
  sensorScore: number | null;          // max sensor sleep_score (vs AI report_score)
  sleepQuality: number | null;         // sensor's quality field (last/max)
  turnover: number | null;             // max turnover (count)
  apneaEvents: number | null;          // max apnea_events count
  lightSleepMin: number | null;        // sensor light_sleep_dur (max, minutes)
  deepSleepMin: number | null;         // sensor deep_sleep_dur (max, minutes)
};

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted">{label}</span>
      <span className="text-[22px] font-normal leading-none tracking-[-0.01em] text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-ink-muted">{unit}</span>}
      </span>
    </div>
  );
}

function fmtMin(min: number | null): string {
  if (min === null || min === undefined) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : String(n);
}

export function StatsRow({
  stagePct, vitals, durationSec, sensorScore, sleepQuality, turnover, apneaEvents, lightSleepMin, deepSleepMin,
}: Props) {
  // Derived: time sleeping and time awake in bed (minutes)
  const totalMin = durationSec ? Math.round(durationSec / 60) : null;
  const sleepingMin = (stagePct && totalMin !== null)
    ? Math.round(((stagePct.light + stagePct.deep) / 100) * totalMin)
    : null;
  const awakeInBedMin = (stagePct && totalMin !== null)
    ? Math.round((stagePct.awake / 100) * totalMin)
    : null;

  return (
    <section className="space-y-6 border-t border-rule pt-6">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-5">
        <Stat label="Awake" value={fmt(stagePct?.awake)} unit="%" />
        <Stat label="Light" value={fmt(stagePct?.light)} unit="%" />
        <Stat label="Deep" value={fmt(stagePct?.deep)} unit="%" />
        <Stat label="Avg br" value={fmt(vitals?.avg_breathing)} unit="bpm" />
        <Stat label="Avg hr" value={fmt(vitals?.avg_heart_rate)} unit="bpm" />
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
        <Stat label="Time sleeping" value={fmtMin(sleepingMin)} />
        <Stat label="Awake in bed" value={fmtMin(awakeInBedMin)} />
        <Stat label="Light sleep" value={fmtMin(lightSleepMin)} />
        <Stat label="Deep sleep" value={fmtMin(deepSleepMin)} />
        <Stat label="Turnover" value={fmt(turnover)} />
        <Stat label="Apnea" value={fmt(apneaEvents)} />
        <Stat label="Sensor score" value={fmt(sensorScore)} />
        <Stat label="Sleep quality" value={fmt(sleepQuality)} />
      </div>
    </section>
  );
}
