export type Telemetry = {
  t: number;
  dev: string;
  presence?: number;
  in_bed?: number;
  sleep_state?: number;
  breathing?: number;
  heart_rate?: number;
  turnover?: number;
  body_move_large?: number;
  body_move_small?: number;
  apnea_events?: number;
  temp_c?: number;
  humidity?: number;
  pressure_hpa?: number;
  gas_ohm?: number;
  db_spl?: number;
  light_raw?: number;
  hum_presence?: number;
  hum_motion?: number;
  hum_range?: number;
  hum_dist_cm?: number;
  hr_instant?: number;
  breath_state?: number;
  breath_value?: number;
  wake_dur?: number;
  light_sleep_dur?: number;
  deep_sleep_dur?: number;
  sleep_quality?: number;
  disturbances?: number;
  quality_rating?: number;
  abnormal_struggle?: number;
  unattended_state?: number;
  unattended_time?: number;
  sleep_score?: number;
  sleep_time_min?: number;
  shallow_pct?: number;
  deep_pct?: number;
  time_out_of_bed?: number;
  exit_count?: number;
  turnover_total?: number;
};

export type WakeEvent = {
  ts: string;
  likely_cause: string;
  triggers?: string[];
  confidence?: "low" | "medium" | "high";
};

export type SleepReport = {
  headline: string;
  sleep_score: number;
  stage_pct: { awake: number; light: number; deep: number };
  vitals: { avg_breathing: number; avg_heart_rate: number };
  wake_events: WakeEvent[];
  recommendations: string[];
  sleep_health?: string;
};
