# Firmware

Adafruit ESP32 Feather V2 · PlatformIO · Arduino framework.

Two PlatformIO environments:

| Env | Source | What it does |
|---|---|---|
| `main` (default) | `src/main.cpp` | Production firmware: Wi-Fi → MQTT, publishes JSON to HiveMQ every 10 s. Needs `include/config.h`. |
| `sensor_test` | `src/sensor_test.cpp` | Bench test only: reads all sensors, prints one JSON line to USB serial every 1 s. No Wi-Fi, no MQTT, no config.h needed. |

## Setup (once)

Install [PlatformIO](https://platformio.org/install). VS Code extension recommended.

## Production build (main env)

```bash
cp include/config.h.example include/config.h
# edit include/config.h with Wi-Fi + HiveMQ credentials
pio run -e main -t upload
pio device monitor
```

## Sensor test (no credentials needed)

```bash
pio run -e sensor_test -t upload
pip install pyserial          # one-time
python3 serial_monitor.py     # auto-detects the port and pretty-prints
```

The `serial_monitor.py` script clears the terminal and re-renders the current sensor reading each second — easy to watch values change as you move/breathe in front of the C1001, cover the photoresistor, blow on the BME280, etc.

See [../TECH-SPEC.md](../TECH-SPEC.md) for the full JSON schema.
