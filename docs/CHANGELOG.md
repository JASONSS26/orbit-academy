# Changelog — Orbit Academy

`MAJOR.MINOR` versioning; each release passes the security audit in `docs/SECURITY.md` before push.

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
