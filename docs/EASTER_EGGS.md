# Easter eggs

Things built into the course that no worksheet points at. They reward the student (or instructor)
who pokes around — and each one is real physics or real engineering, not decoration. This list
exists so they don't get "cleaned up" by accident by someone who doesn't know they're deliberate.

## Module 3 — every orbit precesses (J2, live)

Turn on auto-move with ANY preset loaded and the orbit plane precesses at the true J2 nodal rate
for its elements (`Ω̇ = −3/2·J2·(R⊕/p)²·n·cos i`), with the live rate in the ☀ HUD. Sun-sync is
the tuned case (+0.9856°/day); the ISS drifts −5°/day; Molniya's node regresses 0.15°/day while
its apogee stays parked north (63.4° freezes the ellipse *within* the plane, not the plane).

## Module 6 — the L1 halo release (fan scenarios → 🎯 L1 halo)

A REAL halo orbit, found by differential correction against the sim's own dynamics (shooting for
a perpendicular crossing of the symmetry plane; Newton on the along-line position and prograde
speed). IC in the rotating frame: ξ₀ = 322,163.493 km, 30,000 km above the plane, 196.130 m/s
prograde; period 12.0 days. Uncorrected it rides ~4.6 laps (~55 days) before L1's instability
peels it off — which is the lesson: real halo missions station-keep. Its two ±5 m/s along-line
shadows depart after ~10 days onto the two branches of the unstable manifold, one to the Moon,
one back toward Earth. Full-precision constants matter: rounding the IC to whole km costs ~2.7
laps. Deliberately not mentioned in the worksheet (owner call, 2026-07-30).

The fourth release is a live **NRHO** — the near-rectilinear end of the same family, the
Gateway/CAPSTONE orbit, corrected the same way: perilune 3,210 km over the lunar south pole,
apolune 73,480 km, period ~6.7 days (rotating-frame IC ξ₀ = 384,202.149 km, y₀ = −3,463 km,
1,652.310 m/s prograde). NRHOs are nearly stable: it rode a 100+ day test with no station-keeping
and no departure. The full release set is an instability ladder — the ±5 m/s companions leave at ~10 days, the L1 rider at ~40, the NRHO effectively never — all from geometry alone. (The clock is
capped at 2 d/s while a halo release flies, so the story is watchable rather than instantaneous.)

## Module 8 — the engine rumble

Hold any thruster and the cockpit rumbles: a looped brown-noise buffer through a 90 Hz lowpass
with a slow wobble, ramping in ~60 ms and dying over ~250 ms, quieter on FINE thrust. Synthesized
WebAudio only — no media files, no network, so the air-gap audit is untouched. 🔊 button top-right
mutes it; the choice persists per browser. (A CAPCOM radio squelch existed for about an hour on
2026-07-30 and was removed: "i certainly don't want the beeps.")

## Also unadvertised

- **Module 2** — satellites run through Moon-like phases as the Sun sweeps (brightness =
  phase × eclipse, in lockstep with Earth's terminator), and every injected object paints its
  ground track on the spinning globe (an inclined geosync closes into the analemma figure-8).
- **Module 8** — `?dev=1` unlocks the zone calibrator (C) and burn-light test (B).
