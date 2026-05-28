# WIRING

**Project:** Contactless Sleep & Environment Monitor
**Companion to:** [TECH-SPEC.md](TECH-SPEC.md) · [CIRCUIT.md](CIRCUIT.md)

One card per part. Every pin listed.

## DFRobot C1001 (mmWave radar)

5 V power · UART @ 115200 baud · mounted on the ball-joint outside the housing.

| C1001 pin | Connects to |
|---|---|
| VIN | Feather **USB** pin (5 V passthrough) |
| GND | Breadboard **−** rail (GND) |
| TX | Feather **RX** pin |
| RX | Feather **TX** pin |

## BME280 (temp / humidity / pressure)

3.3 V power · I²C @ address `0x76` · firmware auto-detects 0x76 / 0x77.

Your breakout uses the SPI-style pin labels (SDO / SCK / SDI / CS). The BME280 chip supports **both** I²C and SPI; we use I²C by holding **CS high** and selecting the address with **SDO**.

| BME280 pin | Connects to | Why |
|---|---|---|
| VIN (or VCC) | Breadboard **+** rail (3 V3) | power |
| GND | Breadboard **−** rail (GND) | ground |
| SCK | Feather **SCL** | I²C clock (SPI uses the same line) |
| SDI | Feather **SDA** | I²C data (SPI MOSI uses the same line) |
| SDO | Breadboard **−** rail (GND) | pulls I²C address to **0x76**. Tie to 3 V3 for 0x77 instead — firmware tries both. |
| CS | Breadboard **+** rail (3 V3) | **CS high → I²C mode**. (CS low = SPI mode, which we don't want.) |

## SPW2430 (analog MEMS microphone)

3.3 V power · analog output, ESP32 ADC1.

| Mic pin | Connects to |
|---|---|
| Vin | Breadboard **+** rail (3 V3) |
| GND | Breadboard **−** rail (GND) |
| DC | Feather **A2** (ADC1) |

## Photoresistor + 1.5 kΩ (voltage divider)

Analog output, ESP32 ADC1. Three pieces wired together on the breadboard.

| Divider piece | Connects to |
|---|---|
| Photoresistor leg A | Breadboard **+** rail (3 V3) |
| Photoresistor leg B | Junction row (shared with 1.5 kΩ and A3) |
| Junction row | Feather **A3** (ADC1) |
| 1.5 kΩ leg A | Junction row (shared with photoresistor and A3) |
| 1.5 kΩ leg B | Breadboard **−** rail (GND) |

## Feather V2 — pin usage summary

Plug the Feather across the breadboard's center channel. The pins below are the ones we use; the rest stay unconnected.

| Feather pin | Connects to |
|---|---|
| USB | C1001 VIN (the only 5 V load) |
| 3V3 | Breadboard **+** rail (drives BME280, mic, LDR top) |
| GND | Breadboard **−** rail (shared ground for everything) |
| SDA | BME280 SDI |
| SCL | BME280 SCK |
| TX | C1001 RX |
| RX | C1001 TX |
| A2 | Mic DC |
| A3 | Photoresistor / 1.5 kΩ junction |
