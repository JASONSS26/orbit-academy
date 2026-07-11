# Changelog — Orbit Academy

`MAJOR.MINOR` versioning; each release passes the security audit in `docs/SECURITY.md` before push.

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
