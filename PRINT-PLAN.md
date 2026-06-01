# Print & Assembly Plan

**Date:** 2026-05-26 · **For:** Sleep monitor build · **Companion to:** [PRD.md](PRD.md), [DESIGN.md](DESIGN.md)

## 1. Mechanical System Overview

The C1001 radar mounts to the **front face** of the housing (next to the sensor opening). The GoPro 3-leg is **cropped** to keep only the proven M10 threaded portion + body; the prongs are sliced off and a flat cap is auto-generated. The C1001 holder is an **L-bracket** — horizontal arm is the glue surface, vertical arm holds the C1001 facing outward at 90°.

```
[housing FRONT face]       <- joint plate glued on the left half (52.5 x 27 mm)
   │ epoxy                    sensor window on the right half (39 x 21 mm)
   ▼
[Joint plate]              <- holds the 18mm ball socket
   │ 18mm ball drops in
   ▼
[18mm Ball + M10 thread]
   │ lock nut clamps ball at chosen angle
   ▼
[Lock nut (4 grips)]
   │
   ▼
[Cropped 3-leg adapter]    <- proven M10 threads + flat bottom cap (14.5x14.5 mm)
   │ EPOXY
   ▼
[C1001 L-holder]           <- TOP face of horizontal arm glued to adapter cap
   │                          vertical arm hangs down with pocket on FRONT (+Y)
   ▼
[C1001 PCB in pocket]      <- faces OUTWARD (perpendicular to glue surface)
                              ball joint tilts it down toward the bed
```

## 2. Parts List & Files

| # | Part | Source | File | Size (mm) |
|---|---|---|---|---|
| 1 | Housing | Custom | [cad/housing_phase3.stl](cad/housing_phase3.stl) | 169 × 62 × 50 |
| 2 | C1001 L-holder | Custom | [cad/c1001_holder.stl](cad/c1001_holder.stl) | 30 (w) × 32 (d) × 30 (h) |
| 3 | Ball adapter (cropped 3-leg) | Cropped from downloaded | [cad/ball_adapter_cropped.stl](cad/ball_adapter_cropped.stl) | 14.5 × 14.5 × 22 |
| 4 | Joint plate | Downloaded | [cad/joint/Joint plate for 18mm system.stl](cad/joint/Joint%20plate%20for%2018mm%20system.stl) | 52.5 × 27 × 19.5 |
| 5 | 18 mm Ball | Downloaded | [cad/joint/Ball 18mm with inner M10 thread.stl](cad/joint/Ball%2018mm%20with%20inner%20M10%20thread.stl) | 18 × 18 × 16 |
| 6 | Lock nut | Downloaded | [cad/joint/Lock nut 4 grips for 18mm system.stl](cad/joint/Lock%20nut%204%20grips%20for%2018mm%20system.stl) | 52.5 × 52.5 × 15 |

**Dropped from the build:** the original full GoPro 3-leg connector (replaced by the cropped version which keeps the proven M10 threads + body, drops the prongs).

**Hardware (not printed):**
- 5-min or 24-hour epoxy (two-part)
- Tape / Command strips for wall mount

## 3. Print Order & Settings

Print the small parts first to verify fit, then the housing last. Total time ~12–15 hours.

| # | Part | Time | Orient | Material | Layer | Walls | Infill | Supports |
|---|---|---|---|---|---|---|---|---|
| 1 | C1001 L-holder | ~30 min | Horizontal arm top face DOWN on bed (L upside-down, vertical bar prints upward) | PLA | 0.2 mm | 3 | 25% | No |
| 2 | Ball adapter (cropped) | ~30 min | Flat cap on bed, M10 thread pointing up | PLA | 0.16 mm | 3 | 30% | No |
| 3 | Ball 18 mm | ~30 min | Flat base on bed | PLA | 0.16 mm | 3 | 20% | No |
| 4 | Lock nut | ~45 min | Flat side on bed (thread axis vertical) | PLA | 0.2 mm | 3 | 20% | No |
| 5 | Joint plate | ~1 h | Flat base on bed | PLA | 0.2 mm | 3 | 20% | No |
| 6 | Housing | ~8–10 h | Back face (long unfeatured face) on bed | PLA | 0.2 mm | 3 | 15% gyroid | No |

**Why these specific orientations:**
- **L-holder upside-down**: horizontal arm becomes the print footprint (29.6 × 25 mm), vertical arm extends upward. C1001 pocket prints as a horizontal recess in a vertical wall (no bridging). Cable slot is at the top during print (becomes the bottom in use).
- **Cropped adapter cap-down**: the flat cut cap sits on the bed, M10 threads print upward as a screw thread. Slightly finer layer (0.16 mm) for thread quality.
- **Housing back-on-bed**: sensor window prints as a clean vertical hole (no 39 mm bridge), Stanford deboss prints into a side wall (still legible), open end is a vertical edge.

## 4. Verification Before Final Print

No fit-critical interfaces remain. Just confirm:
- Adapter M10 threads screw into the 18 mm ball cleanly (the threads are from the proven community design).
- L-holder horizontal arm top (29.6 × 25 mm) fully overlaps the adapter cap (14.5 × 14.5 mm) — ample glue area.
- Housing front face has joint plate on the left half, sensor window on the right half, ~38 mm gap between them.

## 5. Assembly Steps

1. **Print all 6 parts per the table above.**
2. **Test-fit the C1001 PCB** into the L-holder pocket from the front — should slide in with light friction, the lip frame catches it. If too tight, bump `c1001_fit` from 0.8 → 1.0 mm in [c1001_holder.py](cad/c1001_holder.py) and reprint.
3. **Glue the joint plate** to the **front face left half** of the housing with epoxy (left of the sensor window).
4. **Drop the 18 mm ball** into the joint plate socket.
5. **Screw the lock nut** down onto the joint plate threading until snug — the ball still tilts but with friction.
6. **Screw the cropped adapter's M10 threads** into the ball's M10 inner hole until tight (these are the proven threads from the community 3-leg design).
7. **Epoxy the L-holder's horizontal-arm top face** to the adapter's flat cap. Center carefully. Let cure overnight before any load.
8. **Slide the C1001 PCB** into the L-holder pocket from the front, route the UART/5V cable out the side slot, around the housing, and into the cavity through the +X open end.
9. **Wire up** the breadboard inside the housing (Feather V2 + BQ24074 + INA219 + boost + BME280 + mic + LDR + LED + button).
10. **Adhere the housing to the wall** with Command strips on the back face.
11. **Aim**: loosen the lock nut, tilt the ball so the C1001 faces the pillow (downward + outward), tighten the lock nut.

## 6. Known Risks & Mitigations

- **C1001 size variance**: PCB tolerance unknown; pocket has 0.8 mm clearance per side. If too tight, bump to 1.0 mm in [c1001_holder.py](cad/c1001_holder.py) and reprint.
- **Ball/socket fit**: the downloaded joint is community-tested; first-time print may need re-printing one piece with adjusted clearance if the ball is too tight in the socket or too loose to clamp.
- **Adapter M10 thread fit**: using the proven community 3-leg threads (cropped). Should screw in cleanly; if too tight, scale the adapter STL down 0.5% in slicer.
- **Epoxy joints**: the C1001 + holder + adapter is light (~10 g), so cured epoxy is more than strong enough. Use 5-min or 24-hour epoxy, **not** superglue — CA glue gets brittle under temperature swings.
- **Housing 8–10 h print**: start it on a stable printer with a fresh nozzle. Single biggest print risk in the build.
