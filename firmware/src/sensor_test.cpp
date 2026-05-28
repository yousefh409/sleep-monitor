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

void scanI2C() {
  Serial.print("i2c scan:");
  Serial.flush();
  byte count = 0;
  for (byte a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.print(" 0x");
      Serial.print(a, HEX);
      Serial.flush();
      count++;
    }
  }
  if (count == 0) Serial.print(" (none)");
  Serial.println();
  Serial.flush();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== sensor_test boot ===");

  Wire.begin();
  scanI2C();
  bme_ok = bme.begin(0x76, &Wire) || bme.begin(0x77, &Wire);
  Serial.print("bme280: ");
  Serial.println(bme_ok ? "ok" : "FAIL");

  delay(200);
  Serial.print("radar begin...");
  Serial.flush();
  Serial1.begin(115200);
  uint32_t t = millis();
  uint8_t r = 1;
  while (r != 0 && millis() - t < 3000) {
    r = radar.begin();
  }
  radar_ok = (r == 0);
  Serial.println(radar_ok ? " ok" : " FAIL (no response in 3s)");

  if (radar_ok) {
    delay(200);
    Serial.print("radar sleep mode...");
    radar.configWorkMode(DFRobot_HumanDetection::eSleepMode);
    radar.sensorRet();
    Serial.println(" set");
  }

  analogReadResolution(12);
  Serial.println("=== streaming JSON each second ===");
}

void loop() {
  static uint32_t iter = 0;
  iter++;

  // every 5s, retry sensor init and re-scan I2C — surfaces wiring fixes live
  if (iter % 5 == 0) {
    Serial.print("[diag] i2c rescan:");
    Serial.flush();
    for (byte a = 1; a < 127; a++) {
      Wire.beginTransmission(a);
      if (Wire.endTransmission() == 0) {
        Serial.print(" 0x"); Serial.print(a, HEX); Serial.flush();
      }
    }
    Serial.println();
    Serial.flush();
    if (!bme_ok) {
      bme_ok = bme.begin(0x76, &Wire) || bme.begin(0x77, &Wire);
      Serial.print("[diag] bme retry: "); Serial.println(bme_ok ? "ok" : "still missing"); Serial.flush();
    }
    if (!radar_ok) {
      radar_ok = (radar.begin() == 0);
      if (radar_ok) { radar.configWorkMode(DFRobot_HumanDetection::eSleepMode); radar.sensorRet(); }
      Serial.print("[diag] radar retry: "); Serial.println(radar_ok ? "ok" : "still missing"); Serial.flush();
    }
  }

  JsonDocument doc;
  doc["t"]              = (uint32_t)(millis() / 1000);
  doc["dev"]            = "sleep01-test";

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
  } else {
    doc["radar"] = "missing";
  }

  if (bme_ok) {
    doc["temp_c"]       = bme.readTemperature();
    doc["humidity"]     = bme.readHumidity();
    doc["pressure_hpa"] = bme.readPressure() / 100.0f;
  } else {
    doc["bme"] = "missing";
  }

  doc["db_spl"]    = readDbBurst();
  doc["light_raw"] = analogRead(LDR_PIN);

  serializeJson(doc, Serial);
  Serial.println();
  delay(1000);
}
