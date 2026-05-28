#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <DFRobot_HumanDetection.h>

constexpr uint8_t MIC_PIN = A2;
constexpr uint8_t LDR_PIN = A3;
constexpr uint16_t MIC_SAMPLES = 1024;
constexpr uint32_t MIC_RATE_HZ = 8000;
constexpr float MIC_CALIBRATION_DB = 30.0f;

Adafruit_BME680 bme;
DFRobot_HumanDetection radar(&Serial1);
bool bme_ok = false;
bool radar_ok = false;

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
  radar_ok = (radar.begin() == 0);
  Serial.println(radar_ok ? "C1001 ok" : "C1001 not found");
  if (radar_ok) {
    radar.configWorkMode(DFRobot_HumanDetection::eSleepMode);
    radar.sensorRet();
  }

  analogReadResolution(12);
}

void loop() {
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
    doc["in_bed"]          = radar.smSleepData(DFRobot_HumanDetection::eInOrNotInBed);

    // raw human-detection fields (more responsive than the sleep classifier)
    doc["hum_presence"] = radar.smHumanData(DFRobot_HumanDetection::eHumanPresence);
    doc["hum_motion"]   = radar.smHumanData(DFRobot_HumanDetection::eHumanMovement);
    doc["hum_range"]    = radar.smHumanData(DFRobot_HumanDetection::eHumanMovingRange);
    doc["hum_dist_cm"]  = radar.smHumanData(DFRobot_HumanDetection::eHumanDistance);
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
  delay(1000);
}
