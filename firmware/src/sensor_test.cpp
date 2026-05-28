#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <DFRobot_HumanDetection.h>

constexpr uint8_t MIC_PIN = A2;
constexpr uint8_t LDR_PIN = A3;
constexpr uint16_t MIC_SAMPLES = 1024;
constexpr uint32_t MIC_RATE_HZ = 8000;
constexpr float MIC_CALIBRATION_DB = 30.0f;

Adafruit_BME280 bme;
DFRobot_HumanDetection radar(&Serial1);

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
  Serial1.begin(115200);
  delay(500);

  Wire.begin();
  bool bme_ok = bme.begin(0x76, &Wire) || bme.begin(0x77, &Wire);

  radar.begin();
  radar.configWorkMode(DFRobot_HumanDetection::eSleepMode);
  radar.sensorRet();

  analogReadResolution(12);

  Serial.println();
  Serial.print("READY bme=");
  Serial.println(bme_ok ? "ok" : "FAIL");
}

void loop() {
  DFRobot_HumanDetection::sSleepComposite c = radar.getSleepComposite();
  uint16_t in_bed = radar.smSleepData(DFRobot_HumanDetection::eInOrNotInBed);
  float db = readDbBurst();

  StaticJsonDocument<512> doc;
  doc["t"]              = (uint32_t)(millis() / 1000);
  doc["dev"]            = "sleep01-test";
  doc["presence"]       = c.presence;
  doc["in_bed"]         = in_bed;
  doc["sleep_state"]    = c.sleepState;
  doc["breathing"]      = c.averageRespiration;
  doc["heart_rate"]     = c.averageHeartbeat;
  doc["turnover"]       = c.turnoverNumber;
  doc["body_move_large"] = c.largeBodyMove;
  doc["body_move_small"] = c.minorBodyMove;
  doc["apnea_events"]   = c.apneaEvents;
  doc["temp_c"]         = bme.readTemperature();
  doc["humidity"]       = bme.readHumidity();
  doc["pressure_hpa"]   = bme.readPressure() / 100.0f;
  doc["db_spl"]         = db;
  doc["light_raw"]      = analogRead(LDR_PIN);

  serializeJson(doc, Serial);
  Serial.println();
  delay(1000);
}
