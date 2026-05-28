#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <DFRobot_HumanDetection.h>
#include "config.h"

constexpr uint8_t MIC_PIN = A2;
constexpr uint8_t LDR_PIN = A3;
constexpr uint16_t MIC_SAMPLES = 1024;
constexpr uint32_t MIC_RATE_HZ = 8000;

Adafruit_BME680 bme;
DFRobot_HumanDetection radar(&Serial1);
WiFiClientSecure net;
PubSubClient mqtt(net);

uint32_t last_publish = 0;
float db_max = 0;

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

void wifiConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);
}

void mqttConnect() {
  while (!mqtt.connected()) {
    if (mqtt.connect(DEVICE_ID, MQTT_USER, MQTT_PASS)) return;
    delay(1000);
  }
}

void publishTelemetry() {
  sSleepComposite c = radar.getSleepComposite();
  uint16_t in_bed = radar.smSleepData(DFRobot_HumanDetection::eInOrNotInBed);

  JsonDocument doc;
  doc["t"]              = (uint32_t)(millis() / 1000);
  doc["dev"]            = DEVICE_ID;
  doc["presence"]       = c.presence;
  doc["in_bed"]         = in_bed;
  doc["sleep_state"]    = c.sleepState;
  doc["breathing"]      = c.averageRespiration;
  doc["heart_rate"]     = c.averageHeartbeat;
  doc["turnover"]       = c.turnoverNumber;
  doc["body_move_large"] = c.largeBodyMove;
  doc["body_move_small"] = c.minorBodyMove;
  doc["apnea_events"]   = c.apneaEvents;
  doc["hum_presence"]   = radar.smHumanData(DFRobot_HumanDetection::eHumanPresence);
  doc["hum_motion"]     = radar.smHumanData(DFRobot_HumanDetection::eHumanMovement);
  doc["hum_range"]      = radar.smHumanData(DFRobot_HumanDetection::eHumanMovingRange);
  doc["hum_dist_cm"]    = radar.smHumanData(DFRobot_HumanDetection::eHumanDistance);

  if (bme.performReading()) {
    doc["temp_c"]       = bme.temperature;
    doc["humidity"]     = bme.humidity;
    doc["pressure_hpa"] = bme.pressure / 100.0f;
    doc["gas_ohm"]      = bme.gas_resistance;
  }
  doc["db_spl"]         = db_max;
  doc["light_raw"]      = analogRead(LDR_PIN);

  char buf[512];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(MQTT_TOPIC, buf, n);
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(115200);

  Wire.begin();
  bme.begin();
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);

  radar.begin();
  radar.configWorkMode(DFRobot_HumanDetection::eSleepMode);
  radar.sensorRet();

  analogReadResolution(12);

  wifiConnect();
  net.setInsecure();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqttConnect();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) wifiConnect();
  if (!mqtt.connected()) mqttConnect();
  mqtt.loop();

  float db = readDbBurst();
  if (db > db_max) db_max = db;

  if (millis() - last_publish >= PUBLISH_INTERVAL_MS) {
    publishTelemetry();
    db_max = 0;
    last_publish = millis();
  }
}
