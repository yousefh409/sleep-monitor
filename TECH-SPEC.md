# TECH-SPEC

**Project:** Contactless Sleep & Environment Monitor · **Date:** 2026-05-26
**Companion to:** [PRD.md](PRD.md) · [DESIGN.md](DESIGN.md) · [CIRCUIT.md](CIRCUIT.md) · [PRINT-PLAN.md](PRINT-PLAN.md)

## 1. Architecture

```
[Feather V2 ESP32]
   ├── C1001 mmWave (UART2)
   ├── BME680       (I2C 0x76)
   ├── SPW2430 mic  (ADC1 A2)
   └── Photoresistor(ADC1 A3)
            │
            └── Wi-Fi/MQTT/TLS ──> [HiveMQ Cloud]
                                        │
                                        ▼
                          [Next.js app on Railway]
                            ├── instrumentation.ts: MQTT subscriber
                            ├── Postgres (Railway add-on)
                            ├── Claude API (LLM analysis)
                            └── app/page.tsx: dashboard UI
```

Single Next.js app on Railway handles MQTT subscription, data storage, LLM analysis, REST API, and dashboard rendering. No separate worker, no separate frontend.

## 2. Hardware

**MCU:** Adafruit ESP32 Feather V2. USB-C wall powered. No battery, no PMIC, no boost.

**Sensors:**

| Sensor | Interface | Pin/Addr | Purpose |
|---|---|---|---|
| DFRobot C1001 60GHz mmWave | UART @ 115200 | TX2/RX2 | Presence, sleep stages, breathing, heart rate |
| BME680 | I2C @ 100kHz | 0x77 (default) | Temperature, humidity, pressure, gas/VOC resistance |
| SPW2430 MEMS mic | Analog | A2 (ADC1) | dB SPL (RMS computed on-device, raw audio never leaves) |
| Photoresistor + 10 kΩ | Analog | A3 (ADC1) | Light level |

Full wiring details in [CIRCUIT.md](CIRCUIT.md).

## 3. Firmware

**Platform:** PlatformIO, Arduino framework, `adafruit_feather_esp32_v2` board.

**Libraries:**
- `Adafruit_BME680` (+ `Adafruit_Sensor`)
- `DFRobot_HumanDetection` (C1001 driver)
- `PubSubClient` (MQTT)
- `ArduinoJson`
- `WiFiClientSecure` (TLS for HiveMQ)

**Wi-Fi credentials:** hardcoded in `firmware/include/config.h`, gitignored. Includes SSID, password, MQTT host, port, username, password, topic.

**Loop behavior:**

| Action | Cadence |
|---|---|
| Sample mic, compute 1 s RMS, update running max dB SPL | continuous |
| Read C1001 sleep composite (state, breathing, heart rate, presence) | 1 Hz |
| Read BME680 (T/H/P/gas) | every publish (~30 s); gas heater is 320 °C / 150 ms |
| Read photoresistor ADC | 0.1 Hz |
| Publish JSON to MQTT | every 30 s (10 s caused mqtt.loop starvation on slow C1001 reads) |

**Connection recovery:** Wi-Fi disconnect triggers reconnect loop. MQTT disconnect triggers reconnect loop.

## 4. MQTT

- **Broker:** HiveMQ Cloud Free (TLS, port 8883)
- **Topic:** `yousef/sleep01/telemetry`
- **QoS:** 1 (at-least-once delivery)
- **Retained:** false
- **Payload:** JSON, ~350 bytes

**JSON schema (per-minute snapshot, all values nullable if sensor not in a valid state):**

```json
{
  "t": 1735689600,
  "dev": "sleep01",

  "presence": 1,
  "in_bed": 1,
  "sleep_state": 2,
  "breathing": 16,
  "heart_rate": 62,
  "turnover": 14,
  "body_move_large": 4,
  "body_move_small": 22,
  "apnea_events": 0,

  "temp_c": 22.1,
  "humidity": 45.2,
  "pressure_hpa": 1013.2,
  "gas_ohm": 5684,
  "db_spl": 32.5,
  "light_raw": 245
}
```

| Field | Source | Units | Notes |
|---|---|---|---|
| `t` | ESP32 | unix seconds | NTP-synced |
| `presence` | C1001 composite | 0/1 | Anyone in detection cone |
| `in_bed` | C1001 `smSleepData(eInOrNotInBed)` | 0/1 | More specific than presence |
| `sleep_state` | C1001 composite | 0–3 | 0 not-in-bed, 1 awake, 2 light, 3 deep |
| `breathing` | C1001 composite `averageRespiration` | breaths/min | Recent average |
| `heart_rate` | C1001 composite `averageHeartbeat` | bpm | Recent average |
| `turnover` | C1001 composite `turnoverNumber` | count | Cumulative for current session |
| `body_move_large` | C1001 composite `largeBodyMove` | % | Recent window large-motion fraction |
| `body_move_small` | C1001 composite `minorBodyMove` | % | Recent window small-motion fraction |
| `apnea_events` | C1001 composite `apneaEvents` | count | Cumulative for current session |
| `temp_c` | BME680 | °C | |
| `humidity` | BME680 | % RH | |
| `pressure_hpa` | BME680 | hPa | |
| `gas_ohm` | BME680 | Ω | Gas/VOC sensor resistance; lower = more VOCs/contaminants |
| `db_spl` | SPW2430, RMS over 1 s | dB SPL approx | Max over the 30 s publish window |
| `light_raw` | Photoresistor | 0–4095 | ADC raw, calibrate to lux dashboard-side |

**Session-level fields** (queried from C1001's `getSleepStatistics()` at end-of-session only, written directly to Postgres `nights` table, NOT in per-minute MQTT): `sleepQualityScore`, `sleepTime`, `wakeDuration`, `shallowSleepPercentage`, `deepSleepPercentage`, `timeOutOfBed`, `exitCount`, `turnOverCount`. These feed the AI briefing alongside the raw telemetry.

## 5. Backend (Next.js)

**Framework:** Next.js 15 App Router, TypeScript.

**MQTT subscriber:** in `instrumentation.ts`, runs once on server boot. Uses `mqtt` npm package, holds persistent TLS connection to HiveMQ. On each message: parse JSON, insert row into Postgres, run wake-detection check.

**Wake detection:** maintains in-memory state per device. A "sleep session" starts when `presence=1` AND `sleep_state >= 2` for 5 consecutive minutes. A session ends when `presence=0` for 5 consecutive minutes after such a start, or when `sleep_state` is `1` (awake) for 10 consecutive minutes after a long-enough session (>2 h). On session end: bundle the session's telemetry, send to Claude, store the report.

**Postgres schema:**

| Table | Columns |
|---|---|
| `telemetry` | id, device, ts, presence, in_bed, sleep_state, breathing, heart_rate, turnover, body_move_large, body_move_small, apnea_events, temp_c, humidity, pressure_hpa, gas_ohm, db_spl, light_raw |
| `nights` | id, device, started_at, ended_at, duration_sec, sleep_score |
| `reports` | id, night_id, headline, sleep_score, stage_pct (jsonb), vitals (jsonb), wake_events (jsonb), recommendations (jsonb), generated_at |

`telemetry` is indexed on `(device, ts)`. `nights` is indexed on `(device, started_at DESC)`.

**Claude API integration:** Anthropic SDK (`@anthropic-ai/sdk`). On wake-detection trigger:

1. Query `telemetry` rows for the night.
2. Downsample to ~1 row per minute, serialize as CSV.
3. Send to Claude Haiku 4.5 with a fixed system prompt: "You are a sleep coach analyzing one night of contactless monitor data." (Upgrade path to Sonnet 4.6 by changing one env var if Haiku output is insufficient.)
4. Parse Claude's structured JSON response.
5. Insert into `reports`.

**Prompt caching:** the system prompt + the schema description are cached (5 min TTL) so consecutive analyses pay only for new telemetry.

**REST endpoints:**

| Route | Returns |
|---|---|
| `GET /api/nights` | list of nights with date, score, headline |
| `GET /api/nights/[id]` | full night payload: report + downsampled telemetry |
| `GET /api/live` | last 10 minutes of telemetry rows |

**Auth:** simple password gate via Next.js middleware. Single password from `DASHBOARD_PASSWORD` env var. Sets a signed session cookie on success.

## 6. Dashboard

**Stack:** Next.js + React + Tailwind CSS + Chart.js. Calm health-app aesthetic.

**Page structure (`app/page.tsx`):**

1. **Top bar:** date picker dropdown (recent nights), connection status indicator (live), logout button.
2. **Live panel** (when current night ongoing): last 10 minutes of breathing, heart rate, dB, temp. Polls `/api/live` every 5 seconds.
3. **AI morning briefing card:**
   - Sleep score (big number) + headline
   - Stage breakdown (% awake / light / deep) + vitals (avg breathing, avg HR)
   - Wake events list with timestamps and environmental causes
   - 1-3 recommendations for tonight
4. **Charts (below briefing):**
   - Overnight sleep-stage band (Chart.js timeline)
   - Breathing + heart rate dual-line
   - Environmental overlay (temp, humidity, dB, light) with wake-event markers
5. **Footer:** link to PRD/repo.

**Live refresh:** `setInterval(fetch, 5000)` polling the `/api/live` endpoint.

## 7. Edge efficiency

Wall-powered means no hard runtime constraint, but the firmware still implements meaningful power-management techniques. Measured + reported as innovation #5 even without a battery.

| Technique | Behavior | Approx saving |
|---|---|---|
| ESP32 light-sleep between samples | Between sensor reads, MCU drops to ~3 mA. Wakes on RTC timer for next sample. | ~70% of MCU draw |
| Wi-Fi modem-sleep | Modem off between MQTT publishes; wakes only to TX. Keep-alive set to 60 s. | ~50% of radio draw |
| C1001 soft-stop on long absence | If `presence=0` for >30 minutes, send `stop` command over UART. Resume on next motion event. | ~100 mA → ~idle when room empty |
| BME680 forced mode | One-shot reads instead of continuous; sleeps between reads. | ~99% of BME draw between samples |
| Mic sampling burst | ~64 ms bursts in the main loop between publishes; running max over the 30 s window | ~99% of ADC duty |

**Measured baseline target:** ~80 mA average system current (vs ~150 mA naive always-on). Not battery-critical but documents good IoT design and gives the report something concrete to point at.

## 8. Deployment

| Service | Provider | Setup |
|---|---|---|
| MQTT broker | HiveMQ Cloud Free | Signup, create free cluster, copy host + credentials |
| App + worker | Railway | `railway up` from this repo, sets PORT |
| Postgres | Railway add-on | One-click attach, `DATABASE_URL` auto-injected |

**Env vars (Railway):**
- `DATABASE_URL` (auto)
- `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`, `MQTT_TOPIC`
- `ANTHROPIC_API_KEY`
- `DASHBOARD_PASSWORD`

**Local Wi-Fi config (firmware):** `firmware/include/config.h` (gitignored):
- `WIFI_SSID`, `WIFI_PASS`
- Same MQTT credentials as the Railway service uses to subscribe.

## 9. Demo plan

**Live (1 min):**
1. Power on the device. Connection state visible on the dashboard ("● streaming" indicator).
2. Walk past it, sit on a chair in front of it. Dashboard live panel shows presence flipping to 1 and breathing rate appearing.
3. Open the dashboard live panel on screen.

**Recorded (5 min):**
1. Open the date picker. Select a prior real overnight dataset.
2. Walk through the AI briefing card: sleep score, headline, wake events, recommendations.
3. Scroll to charts. Point at a wake event marker, show the environmental spike that caused it.
4. Mention all 6 innovations as they appear visually.

**Innovations recap (also on slides):**
1. New sensor type not in prior labs: C1001 60GHz mmWave radar (presence + sleep stages + breathing + heart rate onboard)
2. Multi-sensor correlation engine (radar wake events linked to env spikes ±60 s)
3. AI-driven sleep coach (Claude API auto-generates morning briefing on wake)
4. Custom consumer-facing dashboard
5. 3D-printed wall-mount enclosure + ball-joint chain (housing + L-bracket holder + cropped community joint)
6. Edge-side audio privacy (raw mic samples never leave the device; only dB SPL transmitted)
7. Edge efficiency (light-sleep, modem-sleep, C1001 soft-stop on absence; measured ~50% avg current reduction)
