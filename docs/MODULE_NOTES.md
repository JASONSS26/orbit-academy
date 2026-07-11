# Orbit Academy — deferred feature notes per module

Running list of features/ideas parked for specific future tutorials, captured as they came up
while building Tutorial 1. Pull these in when building each module.

---

## Tutorial 2 — Angular Rates & Geosync
- Combined **top-down view + view-from-the-ground** split screen (the core teaching device).
- Show **geosynchronous vs. geostationary** distinction explicitly.
- Introduce **inclination / polar orbits** and their ground tracks.
- Standard time-warp `,`/`.` with the "×N real time" indicator (already built in T1, reuse).

## Tutorial 3a — Naming Orbits & TLEs
- Interactive TLE: drag the orbit, watch the 6 elements change (and vice-versa).
- Orbit-regime bands: VLEO / LEO / MEO / GEO / xGEO. Define Lagrange points qualitatively
  ("past Sun–Earth L1/L2 you're mainly orbiting the Sun").

## Tutorial 3b — Maneuvers & Perturbations
- Burn tool: prograde/retrograde Δv at a chosen point → Hohmann transfer to GEO.
- Perturbations: J2 oblateness, atmospheric drag, radiation pressure, thrust.
- Orbital lifetime vs. altitude; area-to-mass ratio (drag + HAMR dynamics).

## Tutorial 4 — Observability  ⭐ (most parked ideas land here)
- **Reflected-sunlight detection** with a **moon-phase → satellite-illumination** interactive
  (most people can't explain why the Moon has phases; satellite illumination is the same idea).
- **Satellite eclipse / shadow effect** (deferred from T1): a button/toggle that puts satellites
  in Earth's shadow so you can **watch the Starlink cloud vanish on the dark side** — directly
  motivates "we can only see sunlit objects."
- **View-from-the-ground of a fan of objects in slightly different orbital planes**, to
  **compare angular rates** — objects at different inclinations/altitudes sweep the sky at
  visibly different rates.
- **Synthetic telescope FOV**: a framed field of view on the sky through which objects
  **streak** — show fast LEO streaking vs. slow GEO crawling; ties angular rate to what a
  sensor actually records (and motivates the cislunar-SSA "streak" discussion from the study).
- Four observability modes to cover: (a) cooperative (satellite reports its position),
  (b) RF — active radar & passive comms/UREs, (c) reflected sunlight, (d) — tie to (c) illum tool.
- Radar link budget: received power falls as **1/r⁴** (two-way), with noise; show SNR vs range
  and false alarms.

## Tutorial 5 — xGEO Space
- Reuse the existing **xGEO simulator** (potential wells, real Horizons objects, sandbox,
  Artemis playback). Lookup-table trajectories (no live propagation) to avoid artifacts.

---
_Add to this list whenever a "save it for module X" idea comes up._
