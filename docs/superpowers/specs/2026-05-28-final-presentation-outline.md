# Final Presentation Outline — Contactless Sleep & Environment Monitor

**Author:** Yousef Helal · **Demo day:** 2026-06-09
**Format:** 25 min total = 15 min talk + 10 min live demo + 5 min Q&A

## Framing decisions
- **Application domain:** Healthcare → eldercare (senior-living facilities).
- **Narrative arc:** introduce the large-scale eldercare vision first, then the single node actually built.
- **Talk/demo order:** deliver the full talk (slides 1–15), then go live for the demo, then Q&A. Narrative concludes before the demo so a demo hiccup can't undercut the close.

## Slide list

| # | Slide | Job |
|---|-------|-----|
| 1 | Title | Contactless Sleep & Environment Monitor · eldercare framing · author. (Optional cold-open on the statistic instead.) |
| 2 | Hook | Hard statistic — sleep as a health monitor / early-warning signal in older adults |
| 3 | Problem | Comparison table: wearables vs clinical sleep study vs cameras vs this system — only this system checks every box (compliance-free, low-cost, private, continuous) |
| 4 | Solution reveal | The single idea: passive contactless bedside monitor, nothing to wear + one value-prop line + device image |
| 5 | Eldercare vision | Node per resident room → central nursing-station dashboard + prioritized alerts; "greater than the sum of its parts" (one nurse watches a wing, cross-resident baselines, triage) |
| 6 | System architecture | N nodes → Wi-Fi → MQTT broker → cloud services (correlator + storage) → caregiver dashboard; security & management as labeled callouts |
| 7 | Node overview | Annotated hero photo of the real built device, callouts on every component |
| 8 | Hardware: radar | DFRobot C1001 60 GHz mmWave — FMCW micro-motion → breathing/heart rate + onboard sleep stages; why radar = contactless + private; UART / 5 V |
| 9 | Hardware: sensors + wiring | BME680 (I²C), SPW2430 mic (ADC), photoresistor (ADC); block/wiring diagram |
| 10 | Hardware: enclosure | 3D-printed ball-joint enclosure render with feature callouts (innovation #4) |
| 11 | Software: edge | ESP32 firmware + MQTT + on-device dB SPL (RMS); raw audio never leaves the device; per-minute JSON payload |
| 12 | Software: cloud | Correlation engine — "why you woke up": joins radar wake events with environmental spikes within ±60 s and labels the cause |
| 13 | Results: overview | Real overnight dataset on the dashboard — full-night view (sleep-stage bands + environment overlay + sleep score) |
| 14 | Results: zoom | One annotated correlated wake event |
| 15 | Innovations scorecard | 5 innovations mapped to the assignment's categories (sensor / data processing / visualization / physical design) — 4 of 5 categories hit |
| 16 | Impact + future | Short/long-term eldercare impact + honest roadmap (fall detection, multi-person beds, ML scoring, multi-node home networks) |
| — | **LIVE DEMO** | 10 min — interactive dashboard playback + live MQTT publish |
| 17 | Questions? | Shown during the 5-min Q&A after the demo |

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

## Per-slide content (in progress)

### Slide 1 — Title
- Name + tagline (e.g., "Contactless Sleep & Environment Monitor" + "Passive sleep & vitals — nothing to wear"). Details deferred.

### Slide 2 — Hook (hard-clinical stat trio)
Three beats: common → dangerous → invisible. All three verified against primary/strong sources (2026-05-28).

- **Common — 42%:** In a study of >9,000 community-dwelling adults aged 65+, 42% reported difficulty initiating and maintaining sleep.
  - Source: Foley DJ et al., "Sleep complaints among elderly persons: an epidemiologic study of three communities," *Sleep* 1995;18(6):425–432. Landmark/foundational figure.
  - Links: https://academic.oup.com/sleep/article/18/6/425/2749669 · https://pubmed.ncbi.nlm.nih.gov/7481413/
- **Dangerous — 27%:** "Each percentage decrease in deep sleep each year was associated with a 27% increase in the risk of dementia."
  - Source: JAMA Neurology (2023) study, Framingham Heart Study cohort (Himali et al.). Accessible explainer: Medical News Today.
  - Link: https://www.medicalnewstoday.com/articles/not-getting-enough-deep-sleep-may-increase-dementia-risk
- **Invisible — 38%:** "One-quarter screened positive for chronic insomnia (N = 117); yet, only 44 (38%) had an EHR-documented insomnia diagnosis."
  - Source: "Novel Approaches for Early Detection of Chronic Insomnia Among Older Primary Care Patients," PMC.
  - Link: https://pmc.ncbi.nlm.nih.gov/articles/PMC12761964/
- Takeaway line: sleep problems are common, serious, and largely unmeasured — that gap is what a passive monitor fills.
- Note: the 42% figure is from 1995 (canonical but old); if a more recent prevalence number is preferred, AAFP gives "up to 40% of older adults have insomnia" and "45% in persons 65–79" (https://www.aafp.org/pubs/afp/issues/2013/0215/p280.html).

### Slide 3 — Problem (comparison table)
- Rows: consumer/medical wearable · clinical sleep study (PSG) · camera/audio monitor · **this system**.
- Columns: Passive (no wearable) · Continuous (every night) · Private · **Identifies environmental cause**.
- Check pattern: wearable fails Passive; sleep study fails Continuous; camera fails Private; only this system checks all four. (Camera checking passive+continuous but failing private is a deliberate contrast.)

### Slide 4 — Solution reveal
- Hook headline: **"Knows how you slept — and why."** Pays off the env-cause column.
- One value-prop line: passive contactless bedside monitor that tracks sleep + vitals and the room conditions around you, correlating each disruption to its cause — nothing to wear.
- Visual: device render/photo.

### Slide 5 — Eldercare vision (greater than the sum of parts)
- Deployment: senior-living facility; node per resident room → central nursing-station dashboard + prioritized alerts.
- Headline emergent benefit: **passive triage at scale** — one nurse monitors a whole wing; alerts surface who needs attention tonight.
- Supporting benefits (speak): per-resident trends → early decline detection; facility-wide patterns (HVAC/heat degrading a whole wing).
- Visual: **1 → N emergent-value diagram** (one node's data vs the network's aggregate insights).

### Slide 6 — System architecture
- Scope: large-scale conceptual — N nodes → Wi-Fi → MQTT broker → cloud services (correlator + storage) → caregiver dashboard. As-built single-node pipeline appears later (slides 10–11).
- Visual callout: **privacy by design (no raw audio/video)**.
- Speak for rubric (not visual callouts): TLS + per-device auth on MQTT, OTA updates + device-health/heartbeat monitoring.

### Slide 7 — Node overview
- Annotated hero photo of the real device; callouts: C1001 mmWave radar, BME680, SPW2430 mic, photoresistor, ESP32 Feather V2, status LED, push button, 3D-printed enclosure.
- At-a-glance spec strip: USB-C powered · Wi-Fi/MQTT · ~6 environmental channels (temp/humidity/pressure/gas/dB/light) + radar-derived vitals · per-minute telemetry. (Confirm exact channel count/wording.)

### Slide 8 — Hardware: radar (headline innovation)
- Approach: intuition-first — 60 GHz radar detects sub-millimeter chest micro-motion → breathing & heart rate; onboard algorithm classifies presence + sleep stages.
- One FMCW credibility line (chirp + reflected-signal phase tracks micro-motion).
- Why radar: private (no camera), works in the dark, sees through bedding/clothing.
- Interface notes: UART to ESP32, 5 V; chest range ~0.4–2.5 m (placement constraint).

### Slide 9 — Hardware: supporting sensors + wiring
- Sensors: BME680 (I²C → temp/humidity/pressure/gas-VOC air quality), SPW2430 analog MEMS mic (ADC → noise), photoresistor + 10 kΩ pull-down (ADC → light).
- Presentation: **block/wiring diagram hero** — ESP32 Feather V2 at center, three sensors + status LED + push button wired in, I²C bus and ADC channels labeled; power rails (USB-C 5 V → radar, 3V3 → sensors).

### Slide 10 — Hardware: enclosure (innovation #4)
- Single clean enclosure **render with feature callouts** (minimal text).
- Callout targets: sensor window, joint plate, 18 mm ball-joint, lock nut, C1001 L-holder, housing cavity, wall-mount back face.
- (Context, spoken if asked: ball-joint solves the narrow radar aim window on a wall mount; parametric CAD; reused proven community M10 threads.)

### Slide 11 — Software: edge / firmware
- Presentation: edge flow diagram (sensors → on-device processing → per-minute JSON → MQTT) + an actual sample payload.
- Headline: **edge audio privacy (innovation #5)** — ESP32 computes dB SPL via on-device RMS; raw audio never leaves the device.
- Secondary: per-minute JSON aggregation as a data-processing efficiency (many samples → one small payload).
- Build note: drop in the real firmware JSON schema/keys when making the slide.

### Slide 12 — Software: cloud correlation engine (innovation #2)
- Presentation: **worked-example timeline** — one real wake event; show the ±60 s window catching an environmental spike; output a labeled cause (noise / temp drift / light).
- Message: this is what makes the dashboard explain *why* you woke, not just *that* you did. On-ramp into the results slides.

### Slide 13 — Results: full-night overview
- Real overnight dataset screenshot, framed as an **annotated night**: full timeline with sleep-stage bands + environment overlay, all wake events marked with their causes.
- Pick the cleanest real night collected at home.

### Slide 14 — Results: zoom
- Zoom into the **single cleanest correlation** — one crisp wake event with an obvious cause (e.g., noise spike → arousal), fully annotated.

### Slide 15 — Innovations scorecard (4 of 5 categories)
- Grid of the assignment's 5 categories:
  - Sensors → C1001 60 GHz mmWave radar ✓
  - Data Processing → edge dB SPL (on-device) + cloud correlation engine ✓
  - Data Visualization → custom dashboard ✓
  - Physical Design → 3D-printed ball-joint enclosure ✓
  - Power Management → not pursued (USB-C wall powered) ✗
- Headline: 4 of 5 categories hit (honest).

### Slide 16 — Impact + future (today → tomorrow split)
- **Today (one node, one room):** passive contactless sleep + vitals, zero compliance, explains disruptions, privacy by design.
- **Tomorrow (facility scale):** fleet triage, early decline detection, fall detection, multi-person beds, ML sleep scoring, battery/portable, aging-in-place.

### Slide 17 — Questions?
- Minimal — just "Questions?". Shown during Q&A.

### Live demo (10 min) — not yet planned
- Defer to PRD success criteria: live node publishing to MQTT + dashboard playback of a real overnight dataset with annotated wake events. Flow/script TBD by author.
