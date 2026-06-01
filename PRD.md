# PRD: Contactless Sleep & Environment Monitor

**Author:** Yousef Helal · **Date:** 2026-05-26

## Problem
A third of adults sleep poorly, but consumer sleep trackers require nightly wearable compliance and can't explain *why* sleep was disrupted. Clinical-grade alternatives are expensive and intrusive.

## User
Sleep-conscious adults who want passive, no-wearable tracking that explains disruptions in the morning.

## Solution
A bedside IoT node combining a 60 GHz mmWave radar (presence + sleep stages + breathing/heart rate) with environmental sensors (temperature, humidity, pressure, air quality, noise, light). USB-C wall powered. Publishes per-minute telemetry over Wi-Fi/MQTT. A cloud-side correlation engine annotates each wake event with its most likely environmental cause, surfaced on a morning dashboard.

## Key Features
- Contactless sleep-stage tracking (awake / light / deep) without wearables
- Live breathing rate and heart rate while in bed (chest distance 0.4–2.5 m)
- Per-minute environmental log: temperature, humidity, pressure, gas/VOC air quality, dB SPL, light level
- Annotated wake events: each arousal tagged with likely cause (noise / temp drift / light)
- Morning dashboard: overnight timeline + sleep score + correlated environment overlay

## Architecture
```
USB-C wall ──> [Feather V2 ESP32] ──5V──> [C1001 mmWave]
                       │  3V3
                       ├──I2C──> [BME680]
                       ├──ADC──> [SPW2430 mic]  (raw audio computed on-device → dB SPL)
                       └──ADC──> [Photoresistor]

   Feather V2 ──Wi-Fi──> [MQTT broker] ──> [Cloud worker: correlator] ──> [Web dashboard]
```
Raw audio never leaves the device; the ESP32 computes RMS over a 1 s window and publishes only the dB SPL value. Per-minute JSON payload over MQTT.

## Bill of Materials (single node)
- Adafruit ESP32 Feather V2
- DFRobot C1001 60 GHz mmWave radar (5 V, UART)
- BME680 (I²C @ 0x76)
- SPW2430 analog MEMS microphone
- Photoresistor + 10 kΩ pull-down
- Full-size breadboard (165 × 55 mm) + jumper wires
- 3D-printed enclosure + ball-joint mount (see PRINT-PLAN.md)
- USB-C wall adapter

## Technical Innovations (4)
1. **New sensor:** DFRobot C1001 60 GHz mmWave radar (not used in prior labs; onboard sleep stages + breathing + heart rate)
2. **Multi-sensor correlation engine:** cloud logic that joins radar wake events with environmental spikes within ±60 s and labels the cause
3. **Custom web dashboard:** overnight timeline with sleep-stage bands + environmental overlay + annotated wake-cause markers
4. **3D-printed wall-mount enclosure with ball-joint aim:** custom housing + L-bracket holder + cropped community ball-joint chain lets the C1001 be aimed at the bed regardless of wall position
5. **Edge-side audio privacy:** raw microphone samples never leave the device — on-board RMS → dB SPL computation means the dashboard sees only the noise level, never an audio recording

## Success Criteria (Demo Day)
- Live: node publishes presence, breathing rate, dB, temp, light to MQTT in real time
- Recorded: dashboard plays back ≥1 full real overnight dataset collected at home, with annotated wake events
- All 5 innovations visibly demonstrated within the 25-minute window

## Out of Scope (v1)
- Multi-person bed tracking · cloud-side ML training · mobile app · long-term trend analytics · multi-node home networks · battery / portable operation

## Risks
- C1001 chest range (0.4–2.5 m) constrains enclosure placement — mitigate with 3D-print testing in week 1
- Real overnight data collection needs ≥3 usable nights before June 7 — start by end of week 1
- dB SPL calibration is approximate without a reference meter — acceptable for relative spike detection
