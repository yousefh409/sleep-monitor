# Final Presentation Outline — Contactless Sleep & Environment Monitor

**Course:** EE284A · **Author:** Yousef Helal · **Demo day:** 2026-06-09
**Format:** 25 min total = 15 min talk + 10 min live demo + 5 min Q&A

## Framing decisions
- **Application domain:** Healthcare → eldercare (senior-living facilities).
- **Narrative arc:** introduce the large-scale eldercare vision first, then the single node actually built.
- **Talk/demo order:** deliver the full talk (slides 1–15), then go live for the demo, then Q&A. Narrative concludes before the demo so a demo hiccup can't undercut the close.

## Slide list

| # | Slide | Job |
|---|-------|-----|
| 1 | Title | Contactless Sleep & Environment Monitor · eldercare framing · author · EE284A. (Optional cold-open on the statistic instead.) |
| 2 | Hook | Hard statistic — sleep as a health monitor / early-warning signal in older adults |
| 3 | Problem | Comparison table: wearables vs clinical sleep study vs cameras vs this system — only this system checks every box (compliance-free, low-cost, private, continuous) |
| 4 | Solution reveal | The single idea: passive contactless bedside monitor, nothing to wear + one value-prop line + device image |
| 5 | Eldercare vision | Node per resident room → central nursing-station dashboard + prioritized alerts; "greater than the sum of its parts" (one nurse watches a wing, cross-resident baselines, triage) |
| 6 | System architecture | N nodes → Wi-Fi → MQTT broker → cloud services (correlator + storage) → caregiver dashboard; security & management as labeled callouts |
| 7 | Node overview | Annotated hero photo of the real built device, callouts on every component |
| 8 | Hardware: radar | DFRobot C1001 60 GHz mmWave — FMCW micro-motion → breathing/heart rate + onboard sleep stages; why radar = contactless + private; UART / 5 V |
| 9 | Hardware: rest | BME680 (I²C), SPW2430 mic (ADC), photoresistor, wiring + 3D-printed ball-joint enclosure |
| 10 | Software: edge | ESP32 firmware + MQTT + on-device dB SPL (RMS); raw audio never leaves the device; per-minute JSON payload |
| 11 | Software: cloud | Correlation engine — "why you woke up": joins radar wake events with environmental spikes within ±60 s and labels the cause |
| 12 | Results: overview | Real overnight dataset on the dashboard — full-night view (sleep-stage bands + environment overlay + sleep score) |
| 13 | Results: zoom | One annotated correlated wake event |
| 14 | Innovations scorecard | 5 innovations mapped to the assignment's categories (sensor / data processing / visualization / physical design) — 4 of 5 categories hit |
| 15 | Impact + future | Short/long-term eldercare impact + honest roadmap (fall detection, multi-person beds, ML scoring, multi-node home networks) |
| — | **LIVE DEMO** | 10 min — interactive dashboard playback + live MQTT publish |
| 16 | Questions? | Shown during the 5-min Q&A after the demo |

## Five technical innovations (referenced on slide 14)
1. New sensor: C1001 60 GHz mmWave radar (onboard sleep stages + breathing + heart rate)
2. Multi-sensor cloud correlation engine (wake event ↔ environmental cause)
3. Custom web dashboard (overnight timeline + environment overlay + annotated wake causes)
4. 3D-printed wall-mount enclosure with ball-joint aim
5. Edge-side audio privacy (on-device RMS → dB SPL; no raw audio transmitted)

## Rubric coverage check
- Application domain + proposed system → slides 1–5
- Motivation + background → slides 2–3
- System design overview → slides 5–6
- Implementation + results → slides 7–13
- Expected system impact + conclude → slide 15
- Technical innovation requirement → slide 14 (woven through 8–11)
- Live sensor-node demo on MQTT → live demo segment

## Open items (per-slide content TBD)
- Per-slide content/talking points to be brainstormed slide by slide next.
