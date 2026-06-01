# Sleep Monitor

Contactless bedside sleep tracker. ESP32 Feather V2 + 60 GHz mmWave radar + air-quality + environmental sensors → MQTT → Next.js dashboard with Claude-powered morning briefing.

## Layout

| Folder | What |
|---|---|
| `firmware/` | PlatformIO project for the Feather V2 |
| `web/` | Next.js 16 app: MQTT subscriber + Postgres + Claude + dashboard |
| `cad/` | CadQuery scripts + STL files for the 3D-printed parts |
| `cad/final/` | The 6 STLs to print (numbered in build order) |

## Docs

- [PRD.md](PRD.md) — product requirements
- [TECH-SPEC.md](TECH-SPEC.md) — technical spec (firmware, MQTT, backend, dashboard)
- [DESIGN.md](DESIGN.md) — hardware design
- [WIRING.md](WIRING.md) — pin-by-pin wiring guide
- [CIRCUIT.md](CIRCUIT.md) — power + signal topology
- [PRINT-PLAN.md](PRINT-PLAN.md) — 3D print + assembly plan

## Quick start

See `firmware/README.md` for flashing and `web/README.md` for local dev + deploy.
