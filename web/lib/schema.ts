export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS telemetry (
  id              BIGSERIAL PRIMARY KEY,
  device          TEXT NOT NULL,
  ts              TIMESTAMPTZ NOT NULL,
  presence        INT,
  in_bed          INT,
  sleep_state     INT,
  breathing       INT,
  heart_rate      INT,
  turnover        INT,
  body_move_large INT,
  body_move_small INT,
  apnea_events    INT,
  temp_c          REAL,
  humidity        REAL,
  pressure_hpa    REAL,
  gas_ohm         INT,
  db_spl          REAL,
  light_raw       INT,
  hum_presence    INT,
  hum_motion      INT,
  hum_range       INT,
  hum_dist_cm     INT
);

ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS gas_ohm INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_presence INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_motion INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_range INT;
ALTER TABLE telemetry ADD COLUMN IF NOT EXISTS hum_dist_cm INT;

CREATE INDEX IF NOT EXISTS telemetry_device_ts_idx ON telemetry (device, ts DESC);

CREATE TABLE IF NOT EXISTS nights (
  id              BIGSERIAL PRIMARY KEY,
  device          TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ NOT NULL,
  duration_sec    INT NOT NULL,
  sleep_score     INT
);

CREATE INDEX IF NOT EXISTS nights_device_started_idx ON nights (device, started_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id              BIGSERIAL PRIMARY KEY,
  night_id        BIGINT NOT NULL REFERENCES nights(id) ON DELETE CASCADE,
  headline        TEXT NOT NULL,
  sleep_score     INT,
  stage_pct       JSONB,
  vitals          JSONB,
  wake_events     JSONB,
  recommendations JSONB,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_night_idx ON reports (night_id);
`;
