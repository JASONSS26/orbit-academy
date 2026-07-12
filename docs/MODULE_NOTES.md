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

## Module 4 — Maneuvers & Perturbations  ✅ BUILT
- Files: `tut4.html`, `worksheet4.html`, `worksheet4.data.js`. Registered as `t4` (prereq t3a).
- Burn tool (impulsive Δv: prograde/retrograde/radial), GTO→GEO Hohmann transfer, station-keeping
  (radial vs tangential), drag decay & re-entry (RK4 + exponential atmosphere), sun-sync schematic.
- Perturbations table: drag, J2, radiation pressure, outgassing + chemical vs ion thrusters.
- Covers: Δv as currency, kill-tangential→radial-fall, drag paradox, disposal (burn-up vs graveyard),
  HAMR & solar sails, sun-synchronous advantages, custody & targeted obs (moved from Module 3).

## Module 5 — xGEO / Cislunar Space & Reference Frames  ✅ BUILT
- Files: `tut5.html`, `worksheet5.html`, `worksheet5.data.js`. Registered as `t5` (prereq t4).
- 3-D Cislunar Explorer: **3 zoom scales** (lunar surface / Earth–Moon / Sun–Earth) × **4 reference
  frames** (fixed-stars, Earth co-moving, Earth–Moon rotating, Moon-locked). Real lunar-surface
  texture. Toggleable lunar orbiters (LRO etc.), xGEO objects, Moon Hill sphere, GEO ring,
  Lagrange points, a qualitative potential surface, Moon phases, tidal locking, and a
  "lead-the-Moon" TLI. Analytic/Keplerian motion (no live propagation).
- Covers: orbiting the Moon; Earth-vs-Moon-vs-Sun tug-of-war; Hill sphere ≈ Earth–Moon L1 ≈ 61,500 km;
  **L1 is ~85% of the way to the Moon** (release-on-the-line demo); Sun–Earth L1 ≈ 1.5e6 km;
  **the 4 reference frames** (core objective); Moon as a satellite (e≈0.055, ~5° to ecliptic,
  tidally locked); three tilted planes → eclipses; **xGEO definition**; lead-the-Moon transfer.
- The big learning objective = reference-frame fluency. Verified physics (see git commit / release).

## Module 6 — Lagrange Points & Complex Orbits  (NEW — split out of the old mega-module 5)
- **Potential-surface "marble" sandbox**: the effective (rotating-frame) potential with the five
  wells/saddles; drop objects and let them roll; **release a cluster from L1** and watch it roll
  down different sides — explore when trajectories become uncorrelated (chaos onset; unknown a priori).
- **L1 vs L2 framing (user):** L1 is the physically-meaningful Earth–Moon balance point; **L2 is
  NOT a force-balance saddle in the intuitive sense — it's where the orbital period matches the
  parent body**, so a satellite stays co-linear. Say this explicitly.
- **Halo orbits**: L2 halo (CAPSTONE / near-rectilinear), Lissajous; gallery of real cislunar
  examples. **Chaotic / complex orbits** like TESS (2:1 lunar-resonant HEO); low-energy transfers.
- **Scattering / gravity assist**: hyperbolic flyby swinging past the Moon.
- Reuse the existing **xGEO simulator** (potential wells, real Horizons objects, sandbox).
  Lookup-table trajectories (no live propagation) to avoid artifacts.

## Module 7 — Lunar Transfers & Artemis  (NEW — capstone piloting module)
- **Pilot Artemis II to the Moon and back** with realistic maneuvers: TLI → coast (lead the Moon) →
  lunar-orbit insertion / free-return → trans-Earth injection → re-entry corridor. Δv budget /
  fuel gauge (reuse Module 4's), timed **correction burns** (hints on when/how much).
- **Cockpit view + ILS-style "on-slope" indicator**: a glideslope/localizer-like display for the
  approach and re-entry corridor (needle centering = on target).
- Builds directly on Module 4's two-step macro-maneuver and Module 5's lead-the-Moon TLI.

## Module 8 — Observability  ⭐ (was Module 6/5; most parked ideas land here)
- **SEED CONTENT ALREADY WRITTEN:** `public/worksheet6.data.js` holds 4 tasks moved out of
  Module 2 during the readability/balance pass — resolvability ("can you see the panels", `c4`),
  streak-endpoint astrometry (`c5`), and the arcminute/arcsecond angle unit + arcsec-vs-second-of-
  time trap (`d1`,`d2`). Fold these in (renumber ids + rename file to worksheet8.data.js) when
  building Module 8. NOT yet registered in quiz.js or wired to a tool; the file is inert until then.
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

---
_Add to this list whenever a "save it for module X" idea comes up._
