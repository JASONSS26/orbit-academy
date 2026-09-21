# Orbit Academy — running TODO / follow-ups

Things noticed but deferred, so they don't get lost. Newest at top of each section.

## High priority
- [ ] **From the Module 7 external review (v5.5), two course-wide follow-ups deferred pending
      owner decision:** (1) sweep modules 1–6 and 8 to add explicit sim settings ("open scene X,
      set Y") to every exercise, the way Module 7 now does; (2) consider moving each module's
      Learn-More links out of the bottom section into per-exercise set-aside boxes (textbook
      style) — a worksheet-engine layout change affecting all modules.
- [ ] **Careful walkthrough of the Module 6 worksheet (`worksheet6.data.js`).** It grew fast and
      organically during a long, physics-rich session (Lagrange points, NRHO, chaos/scatter,
      the libration zoo, non-Keplerian orbits, torque, one-vs-two-parameter families). Sit down
      and read it end-to-end as a student: check flow, that every exercise matches what the
      simulator now actually does (zoo controls changed a lot — ratio ladder 1:3…10:1, coupled
      amplitude sliders, axial slide), no stale references, terminology consistent, difficulty
      ramp sane, quiz answers correct, resources complete. **This module needs the most attention.**

## Instructor guide — Module 6
- [ ] **The instructor manual for Module 6 needs real explanation.** The physics here is deep
      (Lagrange points, halo/NRHO, non-Keplerian orbits, one-parameter families, the Jacobi
      constant, chaos & slingshots, the Moon's off-axis torque). Write teaching notes that arm an
      instructor to explain these confidently and field the sharp questions this module provokes.
- [ ] Add a suggested demo to the guide: **look down the Earth–Moon vector** (edge-on / axial view)
      in the libration zoo and **watch the orbit slide along** the line as A_z increases — the
      clearest way to see the axial migration toward the Moon.

## Module 6 simulator — polish / honesty
- [ ] The libration zoo is a **fudged linearized** model (labeled as such). If time allows, note in
      the worksheet exactly what's approximate: linear Richardson shapes, lookup-table axial shift,
      no true nonlinear integration; real families migrate toward the Moon and the halo amplitude
      constraint is only mimicked by the slider coupling.
- [ ] Consider whether the 10:1 / fractional-ratio orbits need amplitude clamps so they don't
      visually blow past sensible extents at max A_x/A_z.

## Future modules (not yet built)
- [ ] **Module 7 — Lunar Transfers & Artemis** (next up): pilot Artemis II (TLI → coast → LOI /
      free-return → TEI → re-entry corridor), Δv/fuel gauge reused from M4, timed correction burns,
      cockpit view + ILS-style on-slope indicator. See MODULE_NOTES.md.
- [ ] **Module 8 — Observability**: seed content already in `worksheet8.data.js` (resolvability,
      streak astrometry, arcmin/arcsec units). Reflected-sunlight + moon-phase illum interactive,
      eclipse/shadow toggle, synthetic telescope FOV streaks, radar 1/r⁴ link budget. See MODULE_NOTES.md.

## General
- [ ] Re-run the "act as a student" readability pass across all modules once 7 & 8 land.
