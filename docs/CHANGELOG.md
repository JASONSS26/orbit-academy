# Changelog — Orbit Academy

`MAJOR.MINOR` versioning; each release passes the security audit in `docs/SECURITY.md` before push.

## v3.1 — 2026-07-20 → 23 (post-3.0 flight-test series)
Two rounds of owner flight-testing of Module 8 (the second via a prior CLI session, folded in
here) drove major cockpit upgrades; plus onboarding, Module 1/3/5 content and physics fixes.
Client-only apart from two console-hint strings in `server.js`.

- **Module 8 cockpit:**
  - **🔴 BURN NOW cue spells out the order** — the pilot's own planned Δv and direction, e.g.
    "2,400 m/s FORWARDS", with the burn's name beneath (values verified to come from the loaded
    plan, not constants).
  - **Live "orbit now" readout** in the MISSION CONSOLE: current perigee/apogee/e recomputed every
    frame, including mid-burn — fixes the stale-apogee trap (the only apogee figure used to be
    CAPCOM's rate-limited telemetry line, which aged in the log and misled trim decisions).
  - **Δv integrator holds its final number ~5 s** after a completed burn for read-back and
    incremental trims (next press still starts fresh; pulse top-ups unchanged).
  - **More fuel (two rounds of flight-testing):** GEO 4,000 → **4,800** m/s (margin ~140 → ~940,
    a ~25% reserve); Moon 4,200 → **7,500** (~3,510 — raised to +50% after hand-flying the LOI +
    lunar-circularize sequence; the graduation flight is meant to be forgiving). All teaching
    numbers reconciled: worksheet 8
    logbook/quizzes/exam, instructor guide, module-8 deck.
  - **⚙ FINE ×0.1 thrust** (button on the pad, or hold Shift): 50 m/s-per-second trim thrust for
    station-keeping and gate-threading — at full rate the shortest tap was ~50 m/s, too coarse to
    tweak with. **',' / '.' time-warp keys** now work in the cockpit too (they scale the automatic
    warp; fresh ×1 each flight).
  - **Live burn guidance:** inside a burn window the BURN NOW cue, CAPCOM call, and the burn
    meter's target + full scale show what the CURRENT orbit needs (frozen at ignition, re-targeted
    to the residual after each pulse); completion = residual < max(40 m/s, 3%) — the old
    60%-of-plan rule both advanced burns prematurely on a pulse-release and demanded the full
    planned Δv from an already-circular orbit. Windows that open already-satisfied are skipped
    with a CAPCOM call. The meter renders every frame and resets per flight (it used to show the
    previous run's target at mission start). Planner: transfer-ellipse center fixed (apogee now
    exactly on the belt ring), live apogee ◎ marker + 'suggested Δv₂' recompute on every
    adjustment, ▶ GO cancels stale playbacks and runs 2.0 days so the path reaches the target.
  - **ILS approach gates:** on final approach (planned burns done, near belt altitude) wireframe
    hoops appear along the belt toward the target — thread them by holding belt altitude; pass/miss
    called by CAPCOM, drawn in the window and on the nav maps, toggle with the new ▦ GATES button.
    A piloting aid only; scoring unchanged.
  - **Target collision is real:** passing within **100 m** of the target satellite ends the GEO
    mission in a collision (checked per RK4 substep with a segment test so time-warp can't tunnel
    through); TRAIN mode respawns instead. Crash banner now names the event (RE-ENTRY / LUNAR
    IMPACT / COLLISION).
  *(Second cockpit round — 2026-07-21/23:)*

- **🤖 AUTO FLY (autopilot)** button on the thrust pad — "computer, do it for me", both missions.
  Drives the same press-and-hold machinery as the pilot (all gauges/CAPCOM behave identically):
  fires each ordered burn exactly at its scheduled point and releases on the number (GEO: live
  residual to ±2 m/s; Moon: plan-exact — TLI aim is a ±1 m/s knife edge, −1.5 m/s impacts the
  Moon), then flies the hand-flown "third burn": a computed VECTOR circularization
  (along-track + radial segments) at the current radius, with a 25/8 m/s engage/settle deadband.
  Verified headless: Moon full-auto = capture + A (96/100) on 4,570 of 7,500 m/s; GEO = success
  box held. Toggling off mid-burn hands the stick back; hand-flying overrides it.
- **Pre-burn coast + countdown (no more "BURN NOW" at T+0):** every mission now coasts ONE full
  LEO parking lap before burn 1 (`F7.PRE_COAST`, ≈5,545 s), with the Moon phase compensated by
  −wMoon·PRE_COAST so burn-time geometry is identical to the old t=0 schedule (both reference
  solutions re-verified: moon captured, minMoon 2,486 km; geo captured, 0.07° from target). The
  annunciator now arms as an amber **⏳ BURN IN m:ss** countdown from window-open and flips to the
  red flashing order at T−90 s.
- **Integrator warp floor fixed:** the coast loop's fixed 20 s substep silently floored every
  warp at ~1,200× (a "3×" burn window actually flew past at 1,200×) — sub-20 s/frame now takes one
  fractional RK4 step, so the staged window warps (stand-by 60× → cue 4× → overdue 60×) are real.
  `simulate()`/`buildPlanProfile()` also now step exactly ONTO burn times instead of overstepping
  by up to dt (lunar aim must not depend on step size).
- **THIS BURN Δv meter tracks properly:** the cumulative total and the bar's target are now a
  matched pair — target = (already flown) + (remaining residual), frozen at ignition, held ~5 s
  after completion for read-back. Previously the cumulative total was compared against the
  shrinking residual, so the bar jumped past the marker after every pulse release; the total also
  expired after a 5 s pause mid-window (now it survives until the burn completes or the window
  closes), and the closed-loop throttle tapered against the same mismatched baseline. HOT (red)
  now also fires when the live demanded direction flips against the planned one (true overshoot).
  Fuel MFD gains a white **plan** tick — where the budget bar should still stand if the loaded
  plan is flown exactly.
- **Big NAV (sensory-overload fix):** the panels are swapped — the co-rotating trajectory map
  (auto-zooming departure/cruise/arrival, live prediction, closest-approach marker) now owns the
  large upper-left panel with a compact status readout (T+, orbit now, next burn) in its corner;
  CAPCOM moved to a slim newest-messages strip on the small NAV MFD. Map/overlay text is CAPPED at
  instrument size (uncapped it scaled ~3× with the bigger canvas). Cockpit tour updated
  (countdown, AUTO FLY, new panel layout) and tour cards now clamp fully on-screen using their
  measured size (tall cards used to overflow the window).
- **Thrusters renamed** to FORWARD / REVERSE / UPWARD / DOWNWARD (cockpit, cues, CAPCOM, tour,
  worksheet 8).
- **Pad thrust now fires in the LOCAL flight frame** — relative to the body that owns you: Earth
  normally, the Moon inside its sphere of influence — with UPWARD/DOWNWARD oriented truly
  radial-out/in of that body. Root cause of "REVERSE barely changes my lunar orbit": inertial-frame
  thrust near the Moon is dominated by the Moon's own ~1.02 km/s orbital motion, so retro burns
  mostly ROTATED the lunar orbit instead of braking it (verified: 50 m/s Moon-frame REVERSE now
  drops periapsis ~930 km). This also made LOI guidance LIVE — brake to the local circular speed
  (~640 m/s instead of a blind 900 that would over-brake in the new frame to ~150 km off the
  surface) — full-auto lunar flight now scores A (96) on 3,723 of 7,500 m/s.
- **Autopilot pacing:** with AUTO engaged the burn window no longer crawls (300× instead of the
  60×/4× manual staging); the integrator clamps its last step to land the clock EXACTLY on the
  scheduled burn time, so speed costs no timing precision. Coast integration now splits frames
  into equal ≤20 s substeps (no per-frame truncation drift).
- **Planner + worksheet now state the lunar mission takes THREE burns** (planner mission card
  warns to keep budget for the cued CIRCULARIZE; worksheet 8 flight steps updated).
- **The lunar mission is now explicitly THREE burns.** Once capture is confirmed, "Circularize
  lunar orbit" is scheduled as a real cued burn (countdown → BURN NOW), guided as an exact
  circularization VECTOR flown component by component — the cue demands the largest remaining
  component ("320 m/s BACKWARDS", then "260 m/s DOWNWARDS"), recomputed live; done under 40 m/s
  residual. Speed-only matching provably cannot circularize here (the thrust basis is
  inertial-velocity-aligned, not Moon-relative) — verified headless: 3-burn flight = 5,233×5,273 km
  lunar orbit, success box held, A (95/100) on 4,605 of 7,500 m/s. Autopilot flies it the same way;
  missed circularize cues re-cue in minutes (not one Earth period). Live prediction now takes fine
  (90 s) steps and dense samples near the Moon, so the capture orbit visibly reshapes WHILE
  thrusting through LOI and the circularize.

- **Module 3:** Earth's rotation is now **synched to the orbit clock**. The satellite animation
  and Earth's spin previously ran on unrelated fixed rates, so the Molniya resonance could never
  show. Both now share one simulated-time base (scaled so the current orbit takes ~12 s at warp 1;
  Earth spins at the sidereal rate on the same clock) — the GEO preset genuinely hovers and
  Molniya flies exactly two orbits per Earth rotation. Molniya/GPS presets pinned to the exact
  semi-synchronous axis (a = 26,562 km; were 26,600/26,560, drifting ~0.4%/orbit). Both clocks
  freeze together when the animation is off. **Apogee-stall fix:** the animation used to
  round-trip its position through the 1°-step position slider, whose snap-to-grid exceeded the
  per-frame Δν at a Molniya apogee (Kepler crawl ≈0.1°/frame) — the marker literally froze there,
  worst at low `,` warp. The animation now carries a continuous state variable (slider is
  display-only, step refined to 0.1°); verified: 300 frames at warp 0.5 from apogee now advance
  correctly, and the sim reproduces Kepler's 92.4% apogee-side dwell for e=0.74.
- **Module 5 (+6):** the Earth–Moon **barycenter is now drawn at its true position** — inside the
  Earth, ~4,670 km from the center (73% of the way to the surface), rendered through the globe —
  instead of a 6× exaggerated offset that floated it 4 Earth-radii out in space. In the 2×2
  compare view each panel now marks **the origin of its own frame** (Earth's center for ECI &
  synodic, the Moon's center for MCI, the barycenter for ECL-EMBR) instead of leaking the
  barycenter furniture into all four panels; the ecliptic/equator reference planes appear only in
  the ECL-EMBR panel. Dragging in tut5 now **rotates only** — panning could silently slide a
  frame's origin off its body, wrecking the module's central lesson. Worksheet 5 and the
  instructor guide updated to match.
- **Module 6 (fan/scatter):** "the Moon repels the red object / nothing looks realistic" — THREE
  stacked causes, found in order of increasing severity. **(1) The real dynamics bug:** `fanStep`
  received `t` in days but `h` in seconds, and passed `t+h/2`, `t+h` raw to the stage
  accelerations — the RK4 mid/end stages sampled the Moon **1 and 2 days in the future**
  (88,000–176,000 km away), so three of four stage forces pulled toward phantom Moons and every
  close encounter was dynamically wrong (transfer arcs looked fine — Earth's field is static).
  A/B verified: shipped stage times gave closest passes of 1,857–82,000 km, nothing unbound.
  (Earlier "physics verified sound" note was wrong about the shipped code: the verification
  harness had inadvertently corrected the units, masking the bug. Numbers quoted from that
  harness — a "1.3–18 R_M family", a red-object pass of "2,693 km = 1.55 R_M" — were harness
  artifacts too; executing the shipped functions verbatim gave a much tighter 2.2–2.9 R_M
  cluster with nothing unbound, which prompted the retune below.) **(2)** TRAIL SAMPLING: one point per frame ≈ 1,440 s of
  sim, while the tightest hairpin swing lasts ~2,500–5,000 s, so the 180° gravity-bend drew as a
  2–3-point V that looked like a bounce. Trails now densify to one point per 150 s within
  25,000 km of the Moon (cap 2,400 pts). Also hardened: real **impact checks** (an object inside
  the Moon's or Earth's radius pins to the surface, greys out, banners, and counts as
  "impacted" — nothing flies through a body, matching Module 1's honesty rule), and force
  softening floors raised to the body radii. Scatter message now names the red object's tight
  hairpin and tells students to slow down and rotate to watch the pull-around.
  **(3) Frame-appropriate trails ("none of the scattering looks realistic in MCI"):**
  the trails were world/ECI polylines rendered under every panel's camera, but a trajectory's
  SHAPE depends on the frame — during a ~1-day encounter the Moon itself travels ~88,000 km, so
  the Moon-centered panel drew every "scattering" tens of thousands of km from the on-screen
  Moon, and the co-rotating panels displaced the hairpin similarly. Each object now keeps three
  trail representations — world (ECI panel), Moon-relative re-anchored to the live Moon (MCI
  panel), and co-rotating spun to the live Earth–Moon line (synodic + ECL-EMBR panels) — with
  renderView switching per panel. Verified numerically: the closest-approach point now sits at
  exactly the flyby distance from the on-screen Moon in every representation. Moon-impact
  craters ride the Moon's surface in all frames.
  **(4) Scatter retune for outcome diversity ("not as diverse as before"):** with the corrected
  physics, the old flight-angle spread (±4.5°) collapsed onto near-identical 2.2–2.9 R_M passes —
  flight angle is a weak impact-parameter knob. Each object now also gets a small per-object
  **speed factor** (`SCAT_SF`, ±1.2%), which shifts arrival timing — the strong knob. Tuned and
  verified by executing the shipped `fanStep`/`fanAcc`/`moonPos` **and the shipped parameter
  arrays, extracted verbatim from the file**, at the page's own 2-s RK4 step: closest passes now
  span **1.09–12.7 R_M** — yellow grazes ~160 km above the surface and is slingshotted **unbound**,
  red whips a tight bound hairpin at 1.67 R_M, zero impacts (20-day run). Also fixed: past the
  3,000-substep cap the fan loop silently **dropped sim time** at high warp (`,`/`.` keys),
  desyncing objects from the Moon — the step size now grows instead, and dense-trail sampling is
  by sim time rather than step count.
- **Module 1:** inclination now defined against **Earth's equatorial plane** (the equator extended
  into space, ⊥ the spin axis) with the rule of thumb *inclination = highest latitude reached*.
- **Onboarding:** README/guide quick-start walks the GitHub download first (sign-in, `<> Code` →
  Download ZIP, per-OS unzip), written for people who've never used GitHub.

## v3.0 — 2026-07-20
**Major-version bump**: the capstone's second mission (the lunar flight) ships for real, and the
course gains a complete instructor-materials layer — per-module intro decks, learning goals and
lecture outlines, worksheet-editor documentation, double-click launchers, and a programmer's
maintenance manual. Under it all, a full-course QA release: a trainee-persona walkthrough of every worksheet against every simulator
(67 findings logged in `docs/QA_WALKTHROUGH_LOG.md`), all findings fixed, and **the Module 8 lunar
mission enabled**. `server.js` changes are limited to the version string and one COURSE title
string (`t1` → "How Orbits Work", matching the worksheet/README); auth/session/gating logic
unchanged. Security audit: **PASS** (full suite re-run).

- **🌙 Module 8 lunar mission is live.** "Fly me to the Moon" unlocks after a successful GEO
  servicing run (the debrief flag is now actually read; `?dev=1` bypasses for instructors). The
  planner is mission-aware: for the Moon it teaches aim-*past*-the-Moon (~395,000 km), the ~120°
  lead angle, and a **retrograde LOI brake** (the learner dials a positive Δv₂; the plan flies it
  BACKWARDS), and the go/no-go verdict comes from the full three-body simulation (capture has no
  clean vis-viva check). Reference solution re-verified against `simulate()`: 3,087 m/s TLI +
  900 m/s LOI at 120° lead → captured. Fixed a broken cockpit fallback plan that carried a
  *prograde* LOI (could never capture). Worksheet 8 gains **PART D · Graduate — fly to the Moon**
  (3 exercises + a lunar exam question), documents the hold-the-box-for-one-orbit success rule and
  the rendezvous (angular-separation) scoring, and drops its stale "Worksheet 7 / tut7" header.
- **Module 8 cockpit:** Three.js is now actually loaded (SRI-pinned, same as tut1), so the
  physically-lit 3-D target satellite and its eclipse cue render in the window — previously
  `Sat7.build()` silently failed. The NAV MFD moved left (13.5%) so the center thrust cluster
  no longer obscures it.
- **Worksheet↔simulator reconciliation across Modules 1–7** (the QA log's core finding — prose
  describing older tool versions): Module 6's libration-zoo capstone rewritten to the real
  Ax/Az + frequency-ratio controls; Module 4's radiation-pressure exercise rewritten as
  drag-analogy + reasoning (the sim models drag only, below 1,000 km — table and slider notes now
  say so); Module 2's telescope tasks fixed (default drive, inspector-view name, no ground track,
  honest terminator pacing, XM sats renamed/relocated to real slots); Module 5's opening-zoom,
  barycenter-wobble, and Moon-plane text now match what the sim draws; Module 3's intro SVG had
  perigee/apogee **reversed** (fixed), marker colors un-swapped, the sample ISS TLE replaced with
  a checksum-valid one, and the Molniya-preset comparison made survivable (presets overwrite
  sliders — jot your values first).
- **Physics/number fixes:** escape-speed claims altitude-qualified (tut1 explains dynamically);
  15″/s streak caption (was 7.5′/min, is 15′/min); L1/L2 unified to from-Earth-center truth
  (84.9% / 116.8%; `L2F` constant was ~7,000 km off); TESS ellipse retuned to a true 2:1
  (ra 368,390 km, P = 13.66 d); sun-sync demo ellipse no longer passes through the Earth;
  radial-burn "opposite side" mental model corrected (apsides rotate ~90°); radar headline unified
  to the tool's ≈7.7-million× (guide said 300,000×); final-exam Moon-motion claim fixed (~50° per
  coast, not "half the sky").
- **Hub & plumbing:** "Finish all six" → all eight; badges VII/VIII; certificate lists all eight
  topics; ~210 lines of unreachable in-hub quiz code deleted (`quiz.js` is now a pure registry);
  worksheet quizzes **shuffle answer order at render** (34 straight quizzes had the answer in
  slot 2); glossary M7/M8 tags un-swapped; cheat sheet corrected & extended to Modules 7–8
  (in tut8 arrow keys fire thrusters); Module 7 gains two new exercises driving its IOD and
  radar-integration scenes.
- **Repo hygiene:** 342 identical macOS "` 2.`" duplicate files deleted; `public/` worksheet data
  re-synced to `workbooks/active/`.
- **Module 1 honesty fix:** re-entering (suborbital) injections now draw as an **arc that ends at
  Earth's surface** — solved analytically for the surface-crossing true anomaly — instead of a
  full ellipse passing through the planet; the animated marker freezes at impact, and the
  underground "perigee" marker is suppressed.
- **Barycenter taught where the Moon first appears (Module 5):** two bound bodies orbit their
  common center of mass; the Earth–Moon barycenter is ~4,670 km from Earth's center — *inside*
  the planet — while for artificial satellites "orbits the parent's center" is exact for every
  practical purpose.
- **Install & onboarding:** README and Instructor Guide §2–3 rewritten for people who have never
  installed Node (per-OS steps, what Node even is, Windows `set PORT=` syntax, troubleshooting);
  new double-click launchers **`start-academy.bat`** (Windows) and **`start-academy.command`**
  (macOS) that detect a missing Node and point at nodejs.org; the port-in-use error now prints
  Windows and macOS/Linux commands. Confirmed: the whole course runs identically on Windows
  (only the developer test suite needs Git Bash/WSL).
- **Instructor materials:** the **worksheet editor** is now documented (Guide §7.1) after an
  end-to-end positive test (load → edit → validated save → live on next student refresh;
  timestamped `.bak` per save; broken saves rejected); Guide §6 expanded with **learning goals
  and a 10-minute intro-lecture skeleton for every module** (hook, beats with anchor numbers,
  the one live demo, the misconception to pre-empt); new **`slides/module1–8.pptx`** — an
  8-slide branded intro deck per module with speaker notes; `guide.html` regenerated from the
  markdown with a proper converter (code blocks and tables now render correctly).
- **New `docs/MAINTENANCE.md`** — programmer's manual: architecture, schemas, invariants,
  add-a-module recipe, the two-copies-of-worksheet-data rule, release checklist distilled from
  the QA walkthrough, and accepted warts.

## v2.6 — 2026-07-15
A large content + consistency release: all eight modules complete, a new reference frame taught in
the cislunar modules, the capstone flight sim polished, a course-wide worksheet audit applied, and
the module files renumbered to match display order. **`server.js` change is limited to the COURSE
ordering/prereq chain** (ids now match module order) plus the version string — the auth/session/gating
logic is unchanged. Security audit: **PASS**.

- **New reference frame — ECL-EMBR (Ecliptic, Earth–Moon Barycentric, Rotating):** replaces the old
  "Moon-fixed" frame as the 4th frame in **Modules 5 and 6** (`tut5`, `tut6`). Centered on the
  Earth–Moon **barycenter** and co-rotating in the ecliptic, it freezes *both* bodies (Earth wobbles
  about the marked barycenter) and is the frame in which the **five Lagrange points hold still** — the
  natural stage for Module 6. Adds a barycenter marker (exaggerated so the wobble is visible) and, in
  Module 5, ecliptic-vs-equator reference planes tilted by the 23.4° obliquity. Rationale: the two
  co-rotating frames (synodic + Moon-fixed) were largely redundant; the barycentric frame is more
  instructive and sets up the Lagrange-point material. Worksheet 5's frame table + tasks and Worksheet
  6's summary updated to teach it.
- **Module files renumbered to match display order:** Observability is now **Module 7**
  (`tut7.html` / `worksheet7.*`) and the flight-sim capstone is **Module 8** (`tut8.html` /
  `worksheet8.*`); helper scripts renamed (`flight8.js`, `sat8.js`, `tut7.js`). All cross-references
  (COURSE ids/prereqs, `quiz.js`, `resources.html`, `gallery.html`, links, comments) updated. No user
  progress existed under the old ids, so nothing was migrated.
- **Module 3 (tut3) Kepler fix:** the auto-animated satellite now advances **mean anomaly** uniformly
  in time (solved to true anomaly via Newton), so it correctly moves **fast at perigee, slow at
  apogee** — it previously stepped true anomaly directly (wrong: fast at apogee). Also made the `,`/`.`
  animation-speed steps finer (×1.25 instead of ×2).
- **Capstone flight sim (Module 8) polish:** true 3-D out-the-window view (raytraced Earth/Moon +
  projected GEO belt, inertial-sun lighting); vertical UPWARDS/FORWARDS/BACKWARDS/DOWNWARDS thruster
  stack; tighter GEO success gate held for a full confirmation orbit; out-of-fuel "coast eternally"
  failure; red target satellite in the belt + CAPCOM proximity alarm.
- **Course-wide worksheet audit applied:** fixed quiz-feedback misalignment (empty rebuttal slot on
  the wrong option) in worksheets 1/5/6; corrected a repeated unit error (7.8 km/s ≈ 17,500 mph, not
  15,000) in Module 4; clarified sun-synchronous, deorbit-burn, and the L1 balance-point (~85% via the
  rotating-frame effect) wording; defined "eccentricity" in Module 1; fixed Module 2 references to
  sim controls that didn't exist; and corrected stale thruster labels + final-exam module numbers.

## v2.5 — 2026-07-13
Deepens Module 6 with a **libration-orbit "zoo"** and a new capstone worksheet part, plus physics
fixes. Client + docs only — **`server.js` has a zero diff** — so the auth/gating surface is unchanged.
Security audit: **PASS** (34 functional + 22 security + DoS, all green).

- **New simulator scenario — 🌀 Libration zoo (the L1 orbit family):** the family of orbits around
  Earth–Moon L1 from the linearized CR3BP. Two amplitude sliders (in-plane A_x, out-of-plane A_z) plus
  a **frequency-ratio ladder** (1:3, 1:2, 1:1 halo, 2:1, 3:1, 10:1, irrational). Whole-number ratios
  close into Lissajous figures; irrational never closes (fills a 3-D band). At any rational ratio the
  two amplitudes are **locked** into one governing parameter (either slider is master); irrational
  frees them. A lookup **axial slide** drifts the loop toward the Moon as A_z grows. Clearly labeled a
  **fudged linear approximation** (shapes/rhythms honest; not a full nonlinear integration).
- **New worksheet Part E — "How to orbit around nothing":** stresses these are **non-Keplerian**
  orbits (no TLE applies), the family takes essentially **one parameter**, and the monthly precession
  is a real **torque from the Moon's off-axis gravity**. Plus exam questions on non-Keplerian/one-
  parameter and the torque, and a 3-D rotate exercise (`d1c`) for the scatter demo.
- **Physics fix:** Earth–Moon **L1/L2 marker positions corrected** to the true CR3BP fractions
  (L1 0.8369→0.8513, L2 1.1557→1.1858); readout panel updated. The zoo loops now sit on the ▲ L1 marker.
- **Lunar-scatter (fan) reworked** to launch on a transfer orbit that coasts one clean arc, then
  slingshots off the Moon with an out-of-plane/inclination spread — tuned so 0 impact, some unbound.
- **UI:** the ▲ Lagrange-points checkbox is now globally authoritative (on/off in every scenario);
  the NRHO moved to the bottom of the scenario list as the "grand finale"; 2×2 compare starts moving.
- Added `docs/TODO.md` (running follow-ups) — flags a careful Module-6 worksheet walkthrough as the
  top item.

## v2.4 — 2026-07-12
Adds **Module 6 — Lagrange Points & Complex Orbits** (new simulator + worksheet), completes the
Module 4/5 physics polish, and hardens the dev server. Security audit: **PASS** (34 functional +
22 security + DoS, all green; the only backend change is a port-conflict guard — no new auth surface).

- **New Module 6** (`tut6.html`, `worksheet6.html`, `worksheet6.data.js`; registered `t6`, prereq `t5`
  in `server.js`, `quiz.js`, `gallery.html`, `resources.html`):
  - The **five Lagrange points** shown as ▲ markers (distinct from round bodies/satellites), with an
    independent "show ▲ Lagrange points" overlay and a **1-D force-balance** view at L1 · Moon · L2.
  - A **near-rectilinear halo orbit (NRHO)** — the CAPSTONE/Gateway shape — wrapping the Moon, with a
    Kepler-timed marker that whizzes through perilune and lingers at apolune.
  - **TESS** in 2:1 lunar resonance, and the shared 4-frame / 2×2 compare view from Module 5.
  - A **live RK4 fan-release** chaos sandbox with two modes: *mixed fan* (a cluster blows apart) and
    **🌙 lunar scatter** — objects launched on transfer orbits that coast one clean arc, then get a
    gravitational slingshot off the Moon (with out-of-plane / inclination spread); some are flung
    **unbound**, tallied live. Extended worksheet exercise (`d1b`) + exam question on slingshots/escape.
  - Physics honored course-wide: bead-on-rotating-rod framing, "balance ≠ zero pull," L3 sits slightly
    outside the Moon's orbit, stars fixed in inertial frames, no forbidden words.
- **Module 4:** GTO challenge exercises (radial-vs-tangential Δv tally → the two-step transfer) and a
  GEO-deorbit exam question (time-reverse of GTO).
- **Module 5:** all Lagrange content removed (deferred to Module 6); "balance point" framing; TLI
  reworked to arm→aim→launch.
- **Server:** fixed to port **8080**; refuses to start with a clear message if the port is already in
  use (no more silent port drift). The 4-frame compare view now starts at a sensible time rate.

## v2.3 — 2026-07-12
Brings the whole course to the Module-1 gold standard.

- **Modules 2, 3, 4, and 5 rewritten** to the same instructional shape Module 1 got in v2.2:
  every exercise now has **`teach`** prose (the "why", read first) and **`think`** reflection
  prompts, and every simulator-action exercise has a **🔮 predict-first** prompt, with `do` steps
  that invite iteration — the predict → act → analyze → iterate loop, course-wide.
- Coverage: all 85 exercises across the five modules have teach + think; 77 have predict (the 8
  pure think-through tasks correctly omit it). Every module's `elements` table, `body` fields,
  quizzes, `exam`, `objectives`, `tutorial`, `summary`, and `resources` preserved unchanged.
- **Server:** unchanged (zero diff). Security audit re-run — **PASS** (worksheet-content-only
  change through the existing trusted-author render path). Tests: 34 functional + 22 security +
  DoS, all passing.

## v2.2 — 2026-07-12
Makes exercises genuinely instructional (predict → act → analyze → iterate), fixes the resources
page, and corrects the Module 1 tutorial diagram.

**Worksheet engine — richer exercise structure:**
- Each exercise now renders in a teaching order: **`teach`** prose (the "why", read first) →
  **🔮 Predict first** (a hypothesis prompt before acting) → **▶ Try it** steps (which invite
  iteration) → **👁 What to look for** → **🤔 think** (ungraded reflection) → **✓ Check your
  understanding** (the quiz). New CSS styles for each section. Fields are optional/back-compatible.

**Module 1 rewritten to this shape:**
- All 20 exercises gained real `teach` prose and `think` prompts; the 17 physics/observation
  exercises gained a `predict` prompt and iteration-inviting `do` steps. It reads as an interactive
  lab, not a quiz. (Modules 2–5 to follow in a later release.)
- Fixed the tutorial's orbit diagram: small centered Earth, all three orbits sharing the release
  point, no overlap between the circle and ellipses.

**Resources page fix:**
- `resources.html` was empty because a data file's top-level `const WORKSHEET` is not a `window`
  property (and re-loading collided). It now fetches each data file and evaluates it in an isolated
  scope to read `.resources` — every module's links populate correctly.

**Server:** unchanged (zero diff). Security audit re-run — **PASS**. Tests: 34 functional + 22
security + DoS, all passing.

## v2.1 — 2026-07-12
Reviewer gallery, Module 1 overhaul, and unbound-orbit physics fixes.

**Reviewer access:**
- New `public/gallery.html` — a no-login landing page listing every worksheet and simulator with
  terse descriptors (opened worksheets run in standalone/localStorage mode). Linked from the hub.
- README gains a "Reviewers — quickest way to try it" quick-start (clone & run locally). Clarified
  that standard **GitHub Pages is world-readable even for a private repo**, so authorized-only
  review = clone & run locally (or Codespaces); the instructor guide's hosting section says the same.

**Module 1 (`tut1.html` + worksheet):**
- Simulator: fixed the **high-velocity render bug** (a unit-scrambled clamp skipped every point of
  an unbound orbit → flashing/no trajectory). Unbound injections now propagate with a proper
  **hyperbolic Kepler solution** (M = e·sinh H − H): the object leaves from perigee, slows as it
  recedes, and **never returns** (only the outgoing branch is drawn; the marker holds at the draw
  edge). Added `frustumCulled=false` so objects no longer vanish when part of the orbit is
  off-screen. Removed the velocity-arrow checkbox.
- Worksheet: added **Part A · Drive the simulator** (pan/zoom/rotate, toggle object layers, time
  warp) before any physics; reworked **Part B** to visit each real constellation (ISS/LEO/Starlink/
  GPS/GEO) **one at a time** with detailed "think about…" prompts; added a **Part D · escape**
  exercise (inject above escape speed, watch the hyperbola). The tutorial also gained a
  controls-intro with an SVG gesture diagram; zoom wording now notes trackpad pinch.

**Server:** unchanged (zero diff). Security audit re-run — **PASS**. Tests: 34 functional + 22
security + DoS, all passing.

## v2.0 — 2026-07-12
Major worksheet overhaul, standalone hosting, and an instructor's guide.

**Unified worksheet engine:**
- New shared `public/worksheet-engine.js` + `worksheet-engine.css`; all five worksheet pages are
  now thin config-only shells (`const MODULE={…}` + data + engine). One place to fix/extend.
- Every worksheet now follows one structure: **🎯 Objectives** ("In this module you will learn…")
  → a terse **one-page tutorial** (with a memorable everyday **analogy** and an inline **SVG
  diagram**) → **numbered exercises** with interspersed check-quizzes → a **Final Check** (4–5
  summary questions) → **key-points summary** → **resources**.
- All five modules' content rewritten to this shape (objectives, tutorial, and a final exam added
  to each), keeping the existing exercises. Definitions tables (Modules 3–5) retained.

**Standalone / GitHub-Pages hosting:**
- Worksheets fall back to **`localStorage`** when no server is present, rendering normally and
  saving progress in the browser (a "● standalone" badge shows). The static build now runs on
  GitHub Pages with no backend; the server is still used when present.

**New pages & docs:**
- `public/cheatsheet.html` — printable controls wallet card (opens in its own window; button on
  every worksheet + the hub).
- `public/resources.html` — external-resources index by module (auto-harvested from the data
  files); linked from every worksheet + the hub.
- `docs/INSTRUCTOR_GUIDE.md` — detailed: download/install, three hosting options (Pages standalone
  / Node server / both), data-file & backup notes, per-module teaching notes, roster, troubleshooting.

**Server:** unchanged (zero diff). All new material is static client-side.

**Security:** audit re-run — **PASS** (no new server surface; user/server data escaped before
DOM insertion; localStorage holds only booleans). **Tests: 34 functional + 22 security + DoS,
all passing.**

## v1.3 — 2026-07-11
Adds Module 5, splits the later course into 8 modules, and rebalances Module 2 for readability.

**Module 5 — xGEO / Cislunar Space & Reference Frames (complete):**
- 3-D Cislunar Explorer (`tut5.html`): real lunar-surface texture; **3 zoom scales** (lunar surface
  / Earth–Moon / Sun–Earth) × **4 reference frames** — Earth-centred inertial (ECI), Earth–Moon
  rotating (synodic), Moon-centred inertial (MCI), and Moon-fixed. Analytic/Keplerian motion.
- **2×2 compare mode**: all four frames rendered at once from one shared scene and one global
  clock, each panel with independent pan/zoom/rotate (arrow keys follow the hovered panel).
- Toggleable lunar orbiters (incl. an elliptical orbit reaching ½ the Hill radius) and xGEO
  objects; Moon Hill sphere (follows the Moon) + Earth zone that meets it at L1; red Earth–Moon
  line; GEO ring; Lagrange points; a rescaled effective-potential surface (per-body caps so both
  the Earth and Moon wells and the L1 saddle show); Moon phases; tidal locking; a
  release-on-the-Earth–Moon-line demo (L1 tick at 85%); and a "lead-the-Moon" trans-lunar transfer.
- Worksheet (`worksheet5.html` + `.data.js`, 16 tasks): orbiting the Moon; Earth-vs-Moon-vs-Sun
  tug-of-war (Hill sphere ≈ Earth–Moon L1 ≈ 61,500 km; L1 at ~85%); **the four reference frames**
  (definitions table + a compare-mode task); Moon as a satellite (tidal locking, tilted planes);
  the xGEO definition; and lead-the-Moon transfers. Physics verified numerically.

**Course restructure (now 8 modules):** Maneuvers = 4, xGEO/Cislunar = 5, and the old plan split
into **6 Lagrange Points & Complex Orbits**, **7 Lunar Transfers & Artemis**, **8 Observability**
(all parked in `docs/MODULE_NOTES.md`). Server `COURSE` chain: t1, t2, t3a, t4, t5, t6, t7, t8.

**Module 2 rebalance (19 → 15 tasks):** moved the observability-flavored tasks (resolvability,
streak-endpoint astrometry, and the arcminute/arcsecond angle unit) into a parked
`public/worksheet6.data.js` seed for the future Observability module, keeping Module 2 focused on
the belt, geosync, and frames.

**Readability:** glossed jargon on first use — “ascending node” and “argument” (Module 3),
“sidereal” (Module 2), and “J2” (Module 4).

**Tests:** `bash test/run.sh` — **34 functional + 22 security + DoS guard, all passing.**

## v1.2 — 2026-07-11
Adds Modules 3 and 4, and re-orders the later course (xGEO before Observability).

**Module 3 — Naming Orbits & TLEs (complete):**
- Interactive tool (`tut3a.html`): 3-D textured Earth + fixed starfield, six Keplerian-element
  sliders driving a live ellipse, period/apogee/perigee readouts (center-distance & altitude),
  a genuine “TLE of your orbit” panel (69-col two-line format, implied-decimal eccentricity,
  true→mean anomaly, mean motion, valid checksums), and clickable real orbits
  (ISS/GPS/GEO/Molniya/Tundra) drawn as ghost ellipses with “why this orbit” call-outs.
- Worksheet (`worksheet3a.html` + `.data.js`, 12 tasks): six elements (no-symbol definitions
  table), invariance under RAAN/arg-perigee, Earth-stops-spinning thought experiment,
  TLE reading, two-co-orbital-satellites-differ-only-in-mean-anomaly, Molniya “invent it by
  trial and error to hit a 12-hour period.” Always-visible take-aways + resources.

**Module 4 — Maneuvers & Perturbations (complete):**
- 3-D simulator (`tut4.html`): textured Earth + fuzzy atmosphere + starfield; real RK4
  integration of gravity + exponential atmospheric drag; impulsive Δv burns
  (prograde/retrograde/radial); a Δv “gas gauge” (finite fuel budget); altitude-vs-time plot;
  escape-velocity readout. Camera & time controls match Modules 1 & 2 (drag=pan,
  shift/right-drag=rotate, wheel=zoom, arrows=rotate, `,`/`.`=time, space=pause, R=reset).
- Seven scenarios: drag decay & re-entry, GTO→GEO transfer, station-keeping (radial vs
  tangential), radial-burn paradox (crash), escape→unbound (hyperbola/scattering), radial
  infall, and sun-synchronous (circular + elliptical, with arriving-sunlight vector and
  Sun-driven day/night shading).
- Worksheet (`worksheet4.html` + `.data.js`, 22 tasks): all non-Keplerian content lives here —
  perturbations table, two-step macro-maneuver, escape velocity, drag paradox & disposal,
  HAMR & solar sails, J2/sun-sync, custody & targeted observations.
- Physics verified numerically: Hohmann LEO→GEO ≈ 3.86 km/s, escape velocity
  (11.2 surface / 10.1 at 1500 km), radial-vs-prograde escape cost, realistic decay lifetimes.

**Course re-order:** Maneuvers & Perturbations promoted to its own Module 4; xGEO/Cislunar
is now Module 5 (ahead of Observability, Module 6). IDs: t1, t2, t3a, t4, t5, t6.

## v1.1 — 2026-07-10
Adds Module 2 and hardens data durability.

**Module 2 — Angular Rates & Geosync (complete):**
- Split-view simulator (`tut2.html`): top-down orbit view + ground-telescope view.
- GEO belt with 360 co-rotating 1° slot posts (straddling the equatorial plane); real GEO
  satellites at their true longitude slots (incl. SiriusXM “Rock” & “Roll”); graveyard orbit of
  dead sats above the belt with inclined N–S bob + slow longitude drift.
- Telescope: live moving points + a shutter (“cha-chk”) that captures a static time-exposure;
  physically-correct 4-minute streak = 1° = one slot width; 5°×5° FOV; stars drift E→W;
  track-stars vs. track-satellite drives; endpoint-astrometry teaching.
- Satellite anatomy close-up (labeled: panels, dish, bus, star-trackers) + a Sun-tracking panel
  animation (N–S actuation axis); links to NOAA’s real GOES 3-D/AR model and flyby.
- Ride-along nadir view down the line of nodes: Earth & belt frozen (geostationary!), ecliptic
  shown edge-on as a tilted line, Sun on the 23.5° ecliptic, tilted terminator, junk drifting by.
- 19-task worksheet covering belt/slots (360), geostationary-vs-geosync, inclination/polar,
  sky-from-ground (streak direction, tracking, latitude, resolvability, endpoint measurement),
  frames/spin/solar-panels/ecliptic/23.5°, and arcsec-vs-second-of-time. Summary + Wikipedia + NOAA links.
- Shared: “Back to worksheet” button added to each module’s simulator.

**Durability / fixes:**
- Atomic save + rolling `.bak` + auto-recovery so accounts survive an accidental delete/crash.
- `ORBIT_DATA` env var lets tests use an isolated data file (never touches real user data).

## v1.0 — 2026-07-10
First complete module + full course-management shell.

**Module 1 — How Orbits Work (complete):**
- Live two-body simulator: analytic conic orbits (no numerical drift), to-scale Earth,
  ISS/LEO/Starlink(inclined shells)/GPS(6 planes×4 @ 55°)/GEO, inject-your-own-object with
  altitude/speed/inclination, "fan" injection, GEO-lock-over-Colorado demo.
- Prograde/retrograde correct; GEO genuinely geostationary; time warp 1⁄32 → 64× with a
  wall-clock speed-up readout.
- Interactive worksheet: 11 tasks in a logical sequence (orient → what-makes-an-orbit →
  direction/speed law → geosync → inclination/launch geography), each with a check question +
  demo-specific remediation; auto-completes on correct answer; key-points summary + Wikipedia
  resources at the end.
- Shared controls reference page, linked from the header and an intro card.

**Course-management backend:**
- Accounts (scrypt-hashed passwords), sessions (HttpOnly, SameSite=Strict cookies).
- Per-task progress with resume; server-side prerequisite gating; pass threshold.
- First account = instructor; instructor roster dashboard.
- Zero dependencies; JSON-file store (gitignored).

**Security:** audit PASS (path traversal, auth, priv-esc, session integrity, prereq bypass,
input validation, DoS, XSS, secrets). See `docs/SECURITY.md`.

**Tests:** `bash test/run.sh` — 18 functional + 22 security checks + DoS guard, all passing.
See `docs/TESTING.md`. Reproducible, zero-dependency, isolated data file.
