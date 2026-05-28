#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <DFRobot_HumanDetection.h>

constexpr uint8_t MIC_PIN = A2;
constexpr uint8_t LDR_PIN = A3;
constexpr uint16_t MIC_SAMPLES = 512;
constexpr uint32_t MIC_RATE_HZ = 8000;
constexpr float MIC_CALIBRATION_DB = 30.0f;

Adafruit_BME680 bme;
DFRobot_HumanDetection radar(&Serial1);
bool bme_ok = false;
bool radar_ok = false;

// Cached values, refreshed every SLOW_EVERY iterations.
// The "fast" per-iter path only does the TWO batched calls (composite + stats),
// plus a single UART poll for the most-useful live field (hum_dist_cm).
// Everything else here is a one-field-per-call query — cached.
struct {
  uint16_t in_bed;
  uint16_t hum_presence, hum_motion, hum_range;
  uint16_t hr_instant, breath_state, breath_value;
  uint16_t wake_dur, light_sleep_dur, deep_sleep_dur;
  uint16_t sleep_quality, disturbances, quality_rating;
  uint16_t abnormal_struggle, unattended_state, unattended_time;
} cache = {};
constexpr uint32_t SLOW_EVERY = 4;

float readDbBurst() {
  uint32_t sum = 0;
  uint16_t samples[MIC_SAMPLES];
  uint32_t step_us = 1000000UL / MIC_RATE_HZ;
  uint32_t t0 = micros();
  for (uint16_t i = 0; i < MIC_SAMPLES; i++) {
    samples[i] = analogRead(MIC_PIN);
    sum += samples[i];
    while (micros() - t0 < (uint32_t)(i + 1) * step_us) {}
  }
  float mean = (float)sum / MIC_SAMPLES;
  float ssq = 0;
  for (uint16_t i = 0; i < MIC_SAMPLES; i++) {
    float d = samples[i] - mean;
    ssq += d * d;
  }
  float rms = sqrtf(ssq / MIC_SAMPLES);
  if (rms < 1) rms = 1;
  return 20.0f * log10f(rms) + MIC_CALIBRATION_DB;
}

// Refreshed every SLOW_EVERY iterations.
void refreshSlow() {
  cache.in_bed            = radar.smSleepData(DFRobot_HumanDetection::eInOrNotInBed);
  cache.hum_presence      = radar.smHumanData(DFRobot_HumanDetection::eHumanPresence);
  cache.hum_motion        = radar.smHumanData(DFRobot_HumanDetection::eHumanMovement);
  cache.hum_range         = radar.smHumanData(DFRobot_HumanDetection::eHumanMovingRange);
  cache.hr_instant        = radar.getHeartRate();
  cache.breath_state      = radar.getBreatheState();
  cache.breath_value      = radar.getBreatheValue();
  cache.wake_dur          = radar.smSleepData(DFRobot_HumanDetection::eWakeDuration);
  cache.light_sleep_dur   = radar.smSleepData(DFRobot_HumanDetection::eLightsleep);
  cache.deep_sleep_dur    = radar.smSleepData(DFRobot_HumanDetection::eDeepSleepDuration);
  cache.sleep_quality     = radar.smSleepData(DFRobot_HumanDetection::eSleepQuality);
  cache.disturbances      = radar.smSleepData(DFRobot_HumanDetection::eSleepDisturbances);
  cache.quality_rating    = radar.smSleepData(DFRobot_HumanDetection::eSleepQualityRating);
  cache.abnormal_struggle = radar.smSleepData(DFRobot_HumanDetection::eAbnormalStruggle);
  cache.unattended_state  = radar.smSleepData(DFRobot_HumanDetection::eUnattendedState);
  cache.unattended_time   = radar.smSleepData(DFRobot_HumanDetection::eUnattendedTime);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Wire.begin();
  bme_ok = bme.begin();
  Serial.println(bme_ok ? "BME680 ok" : "BME680 not found");
  if (bme_ok) {
    bme.setTemperatureOversampling(BME680_OS_8X);
    bme.setHumidityOversampling(BME680_OS_2X);
    bme.setPressureOversampling(BME680_OS_4X);
    bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme.setGasHeater(320, 150);
  }

  Serial.println("Starting C1001 (10s warm-up)...");
  Serial1.begin(115200);
  uint32_t t = millis();
  uint8_t r = 1;
  while (r != 0 && millis() - t < 3000) r = radar.begin();
  radar_ok = (r == 0);
  Serial.println(radar_ok ? "C1001 ok" : "C1001 not found");
  if (radar_ok) {
    radar.configWorkMode(DFRobot_HumanDetection::eSleepMode);
    radar.sensorRet();
    refreshSlow();
  }

  analogReadResolution(12);
}

void loop() {
  // refreshSlow() is only called once at boot (in setup).
  // Each smSleepData/smHumanData call can stall up to 5 s if the chip
  // doesn't respond — too costly for the live loop.

  JsonDocument doc;
  doc["t"]   = (uint32_t)(millis() / 1000);
  doc["dev"] = "sleep01-test";

  if (radar_ok) {
    sSleepComposite c = radar.getSleepComposite();
    doc["presence"]        = c.presence;
    doc["sleep_state"]     = c.sleepState;
    doc["breathing"]       = c.averageRespiration;
    doc["heart_rate"]      = c.averageHeartbeat;
    doc["turnover"]        = c.turnoverNumber;
    doc["body_move_large"] = c.largeBodyMove;
    doc["body_move_small"] = c.minorBodyMove;
    doc["apnea_events"]    = c.apneaEvents;
    doc["in_bed"]          = cache.in_bed;
    doc["hum_presence"]    = cache.hum_presence;
    doc["hum_motion"]      = cache.hum_motion;
    doc["hum_range"]       = cache.hum_range;
    doc["hum_dist_cm"]     = radar.smHumanData(DFRobot_HumanDetection::eHumanDistance);

    doc["hr_instant"]       = cache.hr_instant;
    doc["breath_state"]     = cache.breath_state;
    doc["breath_value"]     = cache.breath_value;
    doc["wake_dur"]         = cache.wake_dur;
    doc["light_sleep_dur"]  = cache.light_sleep_dur;
    doc["deep_sleep_dur"]   = cache.deep_sleep_dur;
    doc["sleep_quality"]    = cache.sleep_quality;
    doc["disturbances"]     = cache.disturbances;
    doc["quality_rating"]   = cache.quality_rating;
    doc["abnormal_struggle"] = cache.abnormal_struggle;
    doc["unattended_state"] = cache.unattended_state;
    doc["unattended_time"]  = cache.unattended_time;

    // Statistics is ONE batched UART call — fast enough to do every iteration
    sSleepStatistics s = radar.getSleepStatistics();
    doc["sleep_score"]     = s.sleepQualityScore;
    doc["sleep_time_min"]  = s.sleepTime;
    doc["shallow_pct"]     = s.shallowSleepPercentage;
    doc["deep_pct"]        = s.deepSleepPercentage;
    doc["time_out_of_bed"] = s.timeOutOfBed;
    doc["exit_count"]      = s.exitCount;
    doc["turnover_total"]  = s.turnOverCount;
  } else {
    doc["radar"] = "missing";
  }

  if (bme_ok && bme.performReading()) {
    doc["temp_c"]       = bme.temperature;
    doc["humidity"]     = bme.humidity;
    doc["pressure_hpa"] = bme.pressure / 100.0f;
    doc["gas_ohm"]      = bme.gas_resistance;
  } else {
    doc["bme"] = "missing";
  }

  doc["db_spl"]    = readDbBurst();
  doc["light_raw"] = analogRead(LDR_PIN);

  serializeJson(doc, Serial);
  Serial.println();
}
