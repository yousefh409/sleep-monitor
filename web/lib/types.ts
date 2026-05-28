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
};

export type SleepReport = {
  headline: string;
  sleep_score: number;
  stage_pct: { awake: number; light: number; deep: number };
  vitals: { avg_breathing: number; avg_heart_rate: number };
  wake_events: { ts: string; likely_cause: string }[];
  recommendations: string[];
};
