# Changelog — Orbit Academy

`MAJOR.MINOR` versioning; each release passes the security audit in `docs/SECURITY.md` before push.

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
