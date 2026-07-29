# Changelog — Orbit Academy

`MAJOR.MINOR` versioning; each release passes the security audit in `docs/SECURITY.md` before push.

## v5.2 — 2026-07-29 (course management: manage students, see where they struggled)

**Headline: the instructor dashboard becomes a course-management tool.** It could previously only
show who had passed what. It can now remove and reset students, and — the more useful half — show
*which questions the class got wrong*.

### Wrong answers are now recorded
The engine only ever told the server about **correct** answers, so there was no struggle data at all;
every task looked like it was solved first try. Incorrect submissions are now reported too
(fire-and-forget, so a failed report can never block a student), and the server keeps a `misses`
count alongside `attempts`. `done && misses === 0` is the signal worth teaching from: everyone
eventually answers correctly, because a wrong answer simply asks again.

**Invariant added:** `done` must never regress. A miss arriving after completion — or any replayed
request — must not un-complete a task, or a student could lose a module they had already passed.
Covered by a security test.

### Instructor dashboard
- **Roster gains per-student `reset` and `delete`.** Delete requires typing `DELETE`, not a one-click
  OK: an instructor working down a roster of similar-looking rows is exactly where a misclick costs
  someone's work. Deleting also drops that user's sessions, so a deleted account cannot keep using a
  live cookie.
- **New "Where the class struggled" tab.** Ranks the tasks with the most wrong answers across the
  cohort, and shows a per-student grid of modules passed with wrong-answer counts — so "behind" and
  "struggling" are distinguishable at a glance.
- Server refuses to let an instructor delete **themselves** or the **last remaining instructor**;
  both would leave the course with no route back except editing JSON by hand.

### Accounts
- **New `tools/set-role.js`** — list accounts, promote or demote by email. Role is assigned exactly
  once at registration (first account ever created becomes the instructor), and there is deliberately
  **no API** to change it: an endpoint granting instructor rights is the most valuable
  privilege-escalation target this backend could expose. So role changes are an offline, file-level
  operation, which grants nothing to anyone who could not already read the data file.
- The tool **verifies its own write by re-reading the file**, because a running server holds the whole
  database in memory and rewrites it on every progress save — silently undoing edits made underneath
  it. That is a real failure that happened during development: a promotion reverted to `student`
  seconds later with no error anywhere. It now reports `REVERTED` and the fix, instead of lying.
- Refuses to demote the last instructor.

### New instructor FAQ — `public/faq.html`
Answers the questions that actually come up: why you're shown as a student and how to fix it, who
becomes the instructor, the two run modes side by side, running a classroom off one machine, opening
the worksheet editor, where progress is stored, letting a student skip ahead, air-gapped install,
blank simulators, and what to back up. Linked from the guide and the gallery.

### Certificates
- **Removed the "JASON / US Space Force Training" line from the completion certificate.** Certificates
  now carry only the course name, so they are appropriate for any audience.

### Fixes
- `guide.html` and `INSTRUCTOR_GUIDE.md` still claimed three.js was "loaded from a pinned CDN
  (SRI-checked)" — stale since v5.1 vendored it. Corrected.

Security audit: **PASS**. Suites: functional 34 ✓, security **48** ✓ (was 30 — 15 new checks covering
delete/reset/analytics privilege gating, self-delete and last-instructor refusals, and the
done-must-not-regress invariant), DoS ✓, air-gap ✓, vendor integrity 5/5 ✓, both run modes ✓,
file:// robustness 13/13 ✓, Module 8 cockpit 17/17 ✓.

## v5.1 — 2026-07-29 (everything in the repo; install without a terminal)

**Headline: `git clone` — or an unzipped download — is now the complete install.** Every byte the
course needs is committed, including three.js and all four planet maps. No fetch step, no `npm`, no
build. Two consequences, both deliberate:

- **An air-gapped machine needs no preparation at all.** Copy the folder, open it, teach. Previously
  three.js had to be downloaded on a networked machine first — a step that could be skipped or done
  wrong, and the failure mode was a blank simulator.
- **Zero version drift.** Every installation runs byte-identical assets, verifiable years later
  against a recorded hash. An accredited classroom cannot re-resolve a dependency, so "whatever the
  CDN serves today" was never an acceptable answer.

### Distribution — two editions from one source
- **New `tools/make-bundle.sh`** builds the distributable zips: the **full** edition (~11 MB) and a
  **standalone** learner edition (~9.6 MB, `--vanilla`). Both are checksummed and verified by
  unzipping to a clean directory and booting.
- **New `START-HERE.html`** — the landing page a non-specialist meets first, offering the two modes as
  two buttons rather than a wall of prose.
- **New `start-academy.sh`** for Linux, with per-distribution Node install hints (apt/dnf/pacman/zypper).
- The standalone edition ships **no `server.js`, no hub, no editor**, so there is nothing in it to
  misconfigure — and the build **prunes every link to a page it does not include** (this caught four
  files still pointing at `index.html`/`faq.html`).
- **Deliberately NOT a `.pkg`/`.msi`.** The course has one dependency (Node.js) and only for the
  tracked mode. Unsigned native installers warn more loudly than a zip, signing needs a paid Apple
  Developer ID or Windows code-signing certificate, and in an accredited or air-gapped facility
  installers frequently cannot run at all — whereas an unpacked folder passes review easily. The
  reasoning is recorded in the script header so it is not re-litigated by guesswork.
- Two folders (vanilla + managed) was considered and rejected: they would share the same ~11 MB of
  `public/`, so every worksheet fix would land twice and they would drift. One tree already does both
  jobs; only the *download* is worth splitting.

### First-run instructor setup — no shipped credentials
- **New `GET /api/setup`** reports one boolean: whether any account exists. On a fresh server the hub
  now says plainly *"No accounts exist yet — the account you create now becomes the INSTRUCTOR"* and
  switches the form to registration, so the role cannot be claimed by a stray test account. That was
  the actual failure mode: the real instructor ends up a student with no in-app way back.
- This is the deliberate alternative to shipping a default instructor account and password. A fixed
  credential in the repository would be identical on every installation worldwide, would remain in git
  history permanently, and is the classic hard-coded-credentials weakness. Nothing is shipped and no
  secret exists.
- **Multiple instructors are supported and now tested** (`test/multi-instructor.test.js`, 17 checks):
  a promoted instructor gains every instructor-only surface; "cannot delete the last instructor"
  correctly *relaxes* once a second exists; "cannot delete yourself" holds regardless; and deleting an
  instructor invalidates their session rather than leaving a live cookie.

### Durability fix — saves could be lost on shutdown
`saveDB()` debounces writes by 100 ms so a burst of completions costs one write. But the normal way to
stop this server is closing the launcher window, which is a kill — so a student who had just answered a
question could lose it. The server now **flushes any pending write on `SIGINT`/`SIGTERM`/exit**,
verified by registering an account and immediately sending `SIGTERM`.

### Test-harness bug worth recording
`two-run-modes.test.js` passed `ACADEMY_DATA` to the server, but the variable is **`ORBIT_DATA`** — so
the override was ignored and the test server fell back to the **live `academy_data.json`**, registering
test accounts into real records. No data was lost, but only by luck. Fixed, and the test now asserts
the live file's mtime is unchanged and keeps its scratch store in the OS temp directory, so a future
typo fails loudly instead of writing to a real cohort. `tools/set-role.js` had the same wrong name.

### Two run modes, documented and tested as a pair
- **README now opens with a "Two ways to run it" comparison** — server mode (`node server.js`,
  accounts, tracked progress) versus bare mode (open `gallery.html`, no install, `localStorage`) —
  with an explicit row confirming the worksheets are fully interactive in **both**.
- **New `test/two-run-modes.test.js`** boots the real worksheet engine with the real Module 1 content
  in each mode and *clicks a correct quiz answer through the real handler chain*, then asserts the
  completion landed in the right store and survives a fresh browser: server via a live HTTP session,
  bare via `localStorage`. Server mode also asserts every asset both entry points need is served.
  Gated in `test/run.sh`.

### Worksheet layout
- **The "module complete" banner now sits after the summary and the "Learn more" resources** in all 8
  worksheets, instead of above them. A student who finished was previously congratulated and handed an
  exit button before the key points and further reading — easy to close the tab with both unread.
  Pinned by a layout assertion (`#exam` → `#endmatter` → `#done`) so it cannot drift back.

### Provenance and integrity
- **New `public/vendor/NOTICE.md`** — origin, license and SHA-384 for all five vendored files. The
  three.js digest is the published r128 SRI hash, proving vendoring did not alter the library.
- **`tools/fetch-vendor.sh --check` is now a real verifier**: it recomputes every hash against that
  manifest, distinguishes *required* from *optional* files, and fails on tamper or truncation
  (verified by appending one byte to a texture). **Wired into `test/run.sh` as a release gate.**
- The script's download path survives as a *repair* mode for a deleted file, not an install step.
- Documented the escape hatch: if a site's accreditation forbids the NASA-derived photographic maps,
  delete them — the chain falls through to the schematic maps we drew ourselves and nothing breaks.

### Two bugs that would have hit the first non-technical user
- **`index.html` hung blank when opened as a file.** The hub is server-mode, and `fetch('/api/me')`
  *rejects* on `file://` rather than returning `!ok`, so the `!r.ok` branch never ran and no error
  ever surfaced. It now catches the rejection and explains the situation, with a link to
  `gallery.html` (which needs no server) and to the launcher for full mode. **The README had been
  telling people to double-click exactly this file.**
- **Module 8's forward window threw on `file://` in Chrome.** `getImageData` on a canvas holding a
  `file://` image is a `SecurityError` (tainted canvas). Since the render loop catches and logs once,
  the symptom was a silently frozen cockpit that looked like broken physics. Now guarded, cached as a
  known failure so it does not retry per frame, and it labels itself on screen: *"flat shading — open
  via the server for mapped planets."*

### Install documentation rewritten for non-specialists
- **New "📦 Install it — plain instructions, no command line"**, with a Solo-vs-Class mode comparison
  so the reader picks a path before touching anything.
- **macOS and Windows sections rewritten click-by-click**, ZIP-first: what to click, what lands
  where, what it should look like, and what to do when it doesn't. Both cover the traps that actually
  bite — Windows' **Unblock** checkbox (the top cause of "downloaded but nothing works"), macOS
  Gatekeeper on `start-academy.command`, and iCloud/OneDrive eviction of course files.
- **Corrected entry point everywhere:** `gallery.html` for no-install use, not `index.html`. The old
  claim that `index.html` "works, saving progress in localStorage" was simply false — that file
  contains no `localStorage` code and only talks to the server.
- Per-platform "if something looks wrong" tables written in symptoms, not causes.

### Verification
Module 6 fan suite re-run in full this cycle — all five scenarios PASS (`scatter`, `l1knife`,
`tadpole`, `dro`, `freeret`); `docs/SECURITY.md` carries the figures. It takes ~40 s **per mode** by
design and is invoked `node test/tut6-physics.verify.js public/tut6.html <mode>`; the previous entry's
claim that it was "too slow to run" was wrong, and is corrected. Measured cost of the *live*
simulator: **under 0.01% of a 16.7 ms frame budget** in every flight regime.

Security audit: **PASS** (`docs/SECURITY.md` → v5.1). Suites: functional 34 ✓, security 30 ✓, DoS ✓,
air-gap 16 checks / 0 outbound calls ✓, vendor integrity 5/5 ✓, Module 8 cockpit 17/17 ✓,
Module 6 physics 5/5 ✓.

## v5.0 — 2026-07-28 (Module 8 rebuilt; the course goes fully offline)

**Headline: the course now runs with ZERO outbound network calls**, so it installs on standalone /
air-gapped machines — and that property is tested, not asserted. Plus a deep rebuild of the Module 8
capstone (cockpit, guidance, worksheet, deck) driven by owner flight-testing, and a controls
introduction for Module 1.

Security audit: **PASS** (`docs/SECURITY.md` → v5.0). Suites on the release candidate: functional 34 ✓,
security 30 ✓, DoS ✓, air-gap ✓, Module 8 cockpit 17/17 ✓.

### Offline / air-gap posture (new)
- **three.js loads locally** (`public/vendor/three.min.js`) in all eight simulators, replacing the
  pinned CDN tags. `tools/fetch-vendor.sh` fetches it once and **verifies the published SHA-384**,
  refusing to install a mismatched library — the SRI guarantee, moved to install time. If it is absent
  the sims paint an explanatory banner instead of a blank canvas.
- **Planet textures resolve through `public/textures.js`**: local photo → pinned CDN (only if
  `ALLOW_CDN`, default **false**) → **a schematic map committed to the repo**. So no asset is ever
  fetched. The schematic Earth is deliberately not a fabricated photo — we have no coastline data
  offline and inventing continents would teach wrong geography — it is ocean blue with a 15° graticule,
  gold equator, dashed tropics/polar circles and a green prime meridian, which is arguably better for
  Modules 1–3: count meridians to see rotation, read inclination off the grid. Generator:
  `tools/make-textures.py` (numpy + PIL, fixed seed).
- **Removed the optional Anthropic tutor** from Module 1. A user-supplied key POSTed the orbit to
  `api.anthropic.com`; no key ever shipped and it was inert by default, but an air-gapped deployment
  should not contain a field that can carry a credential off-box. The local explainer is unchanged.
- **`test/no-external-calls.test.js`** (in `test/run.sh`) proves the property two ways: a static scan
  for fetchable constructs and a runtime pass executing all eight sims against instrumented network
  primitives. Result: **0 outbound calls per module**; 99 `<a href>` reading links remain, inert. The
  test was validated by injecting a CDN tag, a `fetch()` and an `Image().src`.
- Architecture documented in `docs/MAINTENANCE.md` §2.5 (+ a new invariant) and
  `docs/INSTRUCTOR_GUIDE.md` **Option 0 — Standalone / air-gapped**, with §2.2 covering the one-time
  fetch.

### Module 6 camera + gravity landscape
Client-only (`tut6.html`); fold into the next versioned release (doc reconciliation + security
audit then, per the release workflow).

- **Pan wobble in co-rotating frames fixed:** camera pan targets are now stored FRAME-LOCALLY and
  rotated to world space each frame. (They were fixed inertial points while the camera azimuth
  co-rotated, so a panned synodic/ECL-EMBR view made every frame-fixed object wobble in a circle
  whose radius was the pan distance.)
- **📍 "Sit at" presets** (L1 / L2 / L4 / L5 / Moon / Earth) in the frame panel: parks the
  co-rotating view ON the point — it stays centered and motionless while everything swings around
  it. Sets both co-rotating panels so the 2×2 compare matches; switches to the synodic frame if
  needed.
- **Gravity landscape: ARSINH height map — no clamps, no flat shelves anywhere:**
  y = −S·asinh((U(L4)−U)/u₀). Two artifact generations fixed in one pass. The original linear map
  clamped the Earth funnel at −95,000 km (a flat plateau ~160,000 km across) and never sampled
  inside 2 R⊕. An interim log map let the funnels run to the surface but CRUSHED the outer slope
  (≈0.06 km height per km at the board edge — the owner caught the surface "going flat at the
  edge", which is unphysical). asinh is linear for |ΔU| ≲ u₀ — the whole rim region (saddles,
  hilltops, and the outer centrifugal skirt) keeps its true shape and a clear ~14° slope right to
  the edge of the rendered region — and logarithmic only deep in the funnels, which still run to
  the surfaces. Landmarks (verified numerically from the shipped constants): L4/L5 rim = 0,
  L3 ≈ −2,100, L1 ≈ −16,400, L2 ≈ −15,000, board corners ≈ −78,700, Moon surface ≈ −124,500,
  Earth surface ≈ −247,600 km. The downhill PAST the L4/L5 rim is real physics (the outer skirt
  is why the rotating frame flings things away) — it now reads as a slope, not a flat apron.
  Grid refined 110² → 200².
- **The L4/L5 hilltop paradox is now taught, not dodged** (owner flagged it: "L4/L5 sure don't
  look like stable minima"). They aren't — L4/L5 are genuine MAXIMA of the effective potential.
  Per the course's no-pseudo-forces rule, the resolution is told through trajectories and the
  inertial frame: the landscape only scores POSITIONS, while an object near L4 is MOVING — in ECI
  it simply flies an ordinary Moon-like 27.3-day orbit 60° ahead, which the combined Earth + Moon
  pulls keep herded near the point; viewed co-rotating, that same orbit is the loop around the
  summit (Part D's tadpoles). Sim sidebar + scenario note + tadpole message now say this and
  point at the ECI panel; worksheet 6 (b3 teach/do/observe/think, Part B overview, quiz wording
  "settles back" → "loops around") reconciled to match. The landscape checkbox and worksheet also
  now disclose the model is **Earth + Moon only — no Sun** (solar differential pull ~1% of
  Earth's at lunar distance; it matters only out near the ~1.5 M-km Hill sphere).

### Module 8: GEO belt angular rate
Client-only (`tut8.html` + `flight8.js`).

- **The GEO belt now rotates at the SIDEREAL rate — the belt is genuinely stationary for a
  correct GEO orbit** (owner caught it: "even at the right apogee the belt satellites are never
  stationary"). The belt/target were drawn at fixed longitudes of the Earth–Moon co-rotating
  frame, i.e. a 27.3-day belt — ~640× too slow — so even a perfectly-flown 86,164 s orbit lapped
  the "geostationary" satellites once a day. The GEO mission now has its own co-rotating frame at
  the sidereal-day rate (matching the Earth-texture spin and the natural rate at 42,164 km, per
  the Module-1 "GEO is genuinely geostationary" principle), anchored so the reference Hohmann
  arrival lands on the target slot. Everything GEO rides that frame: window belt/target/gates,
  NAV maps, planned ghost, actual trail, ILS localizer, collision + proximity checks, planner
  prediction, and scoring. Verified: reference arrival −0.08° from target; a circular GEO orbit
  drifts only 0.69°/2 d in-frame (real lunar perturbation); reference flight scores A (98),
  angular sep 1.8°. Consequence made explicit in comments: there is no free "drift to the target"
  anymore — off-radius errors drift you along the belt (the real GEO phasing effect), and the
  confirmation-orbit CAPCOM line now points out the belt holding still with you.
- **Target injection offset (owner follow-up: "we lost the target satellite"):** anchoring the
  arrival dead-on the slot put the sat at the craft's own position — invisible out the window
  (and rendezvous pre-solved). The target now parks **8° AHEAD** of the reference arrival
  (~5,900 km): verified in-frame at injection the red bead sits 3.3° off the velocity vector —
  centered in the front window — the 6°/4°/2° ILS gates form a real approach corridor, and the
  final leg is flown by PHASING (dip below belt altitude to drift forward, re-circularize at the
  target; CAPCOM coaches it once on arrival).
- **The phasing leg is now the mission's final act — and the ILS gates finally earn their keep**
  (owner: "those gates have never been visible or useful"). Success requires a real RENDEZVOUS:
  circular at GEO AND within 2.5° of the target, held one full orbit (worksheet 8 reconciled).
  Gate hoops grew 150 → 1,300 km — sized to the honest phasing corridor (a ~15 m/s along-track
  burn rides an ellipse dipping 0–800 km below the belt) and actually visible from thousands of
  km. AUTO FLY learned the maneuver: a mean-longitude controller (osculating angle minus the
  2e·sin ν equation-of-centre wobble — a raw-angle deadband flip-flops and pumps eccentricity,
  found in headless testing) retunes the sma ~400 km low, rides the ~5°/day drift with 3°/0.9°
  hysteresis, re-tunes at hand-over, and circularizes only at the belt-radius crossing. Verified
  end-to-end: rendezvous hold complete T+2.36 d, final sep 0.24°, gates threaded at 902/927/395 km,
  phasing+trim 82 m/s, total 3,935/4,800, score A (98). The warp ladder plays the ~1.4-day drift
  at 2600× (~45 s), and a dedicated CAPCOM call teaches the manual version (~15 m/s REVERSE →
  drift → ~15 m/s FORWARD + trim).

### Module 8: target visibility, standoff, budgets
- **"I never saw the target satellite" — found two bugs; the offset sign was NOT one of them**
  (verified by replicating the window's pinhole camera headlessly: +8° projects on-screen at
  u=0.50/v=0.22, −8° falls behind the camera, so the sign was right).
  1. *The camera was pointed 13.5° below the one thing you're chasing.* The nadir pitch that makes
     the ground stream by puts a co-altitude belt target at the very top edge of the ±16.5° vertical
     FOV — and any phasing dip below the belt pushed it clean off the top (measured off-screen for
     every standoff under ~4° at a 150 km dip; the target was off-screen or behind for ~85% of the
     approach). GEO final approach now eases the boresight off nadir and onto the TARGET (ramping
     in from 20,000 km, full by 1,500 km, only while it's ahead, smoothed so the view never snaps).
  2. *The autopilot parked ON the target.* Converging to zero separation put the sat at/behind the
     camera, oscillating in and out of view. It now holds a **1.5° (~1,100 km) standoff BEHIND** the
     target — framed dead ahead, and how you actually hold alongside a satellite you're servicing.
  Also: a **TARGET reticle** (cyan corner brackets + live range) so the rendezvous is never again a
  ~10 px red dot lost among identical belt beads; an explicit "TARGET IS BEHIND YOU — raise your
  orbit to drift back" banner instead of silently hiding it; and `geoCloseness` (which sizes the
  rendered bus) rebuilt on true RANGE — it was drawing the satellite at 70% of the window height
  from 5,900 km away. Verified: target on-screen **100%** of the approach, rendezvous hold complete
  T+1.71 d, gates threaded 902/928/395 km, score A (98).
- **Endgame tightened:** the autopilot circularizes only within 60 km of belt radius (was 250 —
  which left the sma up to 250 km off, a ~2.7°/day residual drift that slid the craft out of the
  hold box every lap) and trims to a 8/3 m/s deadband at GEO; residual eccentricity fell 0.006 →
  0.00036. Rendezvous gate widened 2.5° → 3.5° to leave room around the standoff for the ±2e
  separation ripple.
- **Fuel + endurance raised** (owner request): GEO budget **4,800 → 6,500 m/s**, lunar
  **7,500 → 9,500** — the planned burns are only ~60% of the job now that phasing, gate-threading
  and station-keeping are all hand-flown. Out-of-fuel doom waits **3 orbits (up to 3 days)** instead
  of one (a dry tank near the belt can still drift onto the target) and holds its banner 9 s instead
  of 4; missed-burn re-cues raised 6 → 12. All figures reconciled: `flight8.js` (MISSIONS +
  PLAN_TARGETS), planner budget label, cockpit tour, worksheet 8 (logbook SVG, budget prose,
  margin arithmetic, quizzes, summary), instructor guide.

### Module 8: NAV display frame + rendezvous director
- **The "REALLY weird orbits" were a frame artifact — NAV now auto-switches, and says which frame
  it is in.** Drawing the whole GEO flight belt-fixed meant a frame rotating 360°/day: it curled the
  5.3-hour Hohmann transfer by ~80° and skewed the LEO parking lap ~23°. But an inertial map cannot
  show "geostationary". Resolved by separating the two concerns:
  - **LOGIC frame** (`toCorotF`) stays belt-fixed always — separation, gates, station-keeping and
    scoring are unaffected by what is displayed.
  - **DISPLAY frame** (`toDisp`) is ECI through launch + transfer (textbook circle → ellipse →
    circle), auto-switching to belt-fixed at circularization for the approach, where it also zooms
    to frame craft + target so the last few degrees and the gates are actually visible. The panel
    title always names the frame; **F** cycles auto → ECI → belt-fixed.
  - Required storing the planned ghost, the actual trail and the burn marks in **inertial**
    coordinates + absolute time (projected at draw time, two cached projections), so a mid-flight
    frame flip re-renders history correctly. `simulate()` now also returns inertial burn marks.
  - The planner draws GEO in ECI (planning is about the transfer shape) and puts the target sat
    where it will be **at arrival**, since that map is inertial and the belt turns once a day.
- **◎ RENDEZVOUS DIRECTOR** (owner: "really hard to do the last little bit of proximity
  maneuvering"). After the planned burns the ILS cluster becomes an approach director: range,
  closing rate, degrees along the belt, belt-altitude error, drift rate — and an instruction in
  plain words with a Δv figure ("STOP THE DRIFT — hold FORWARD ~15 m/s to make your period one
  sidereal day"). It teaches the counter-intuition that makes proximity work hard: to **catch**
  something ahead you go **LOWER**; to let it catch you, **HIGHER**. Staged CAPCOM tips fire at
  5,000 / 2,000 / 800 km (the last one recommending ⚙ FINE and a 1–2° standoff). Worksheet 8 and
  the cockpit tour teach both the director and the frame switch.
- **Two bugs the director's own test exposed:** its "stop the drift" advice fired while still 2.5°
  short (parking the pilot *outside* the rendezvous box) — now the stop lead scales with drift rate;
  and the autopilot's 1.2°/0.35° phasing hysteresis replaces 3°/0.9°, which could hand over up to
  ~4.5° from the target, outside the 3.5° box, so the hold never completed. Re-verified full auto
  GEO: hold complete T+1.71 d, final separation 2.15° (standoff 1.5°), gates 902/928/395 km,
  A (95), 3,928 / 6,500 m/s. Lunar reference re-checked: captured, minMoon 2,486 km.
- **Persistent 🔴 BURN NOW after circularization fixed:** completion was judged only on thruster
  RELEASE inside the window, so a burn finished by pulsing, finished late, or ended by an autopilot
  segment was never struck off the card — and the missed-burn logic re-cued it every orbit (worse
  after re-cues went 6 → 12). A burn is now retired as soon as the live residual says it is flown,
  guarded so mid-transfer (where speed genuinely equals local circular speed at r = a) can't
  retire it early.

### Module 8: post-refactor bug hunt, headless cockpit harness
Built a **headless cockpit harness** (DOM/canvas stubs + a unified rAF/performance clock) that boots
the real `tut8.html` script, loads a plan, engages AUTO FLY and flies whole missions frame-by-frame,
surfacing anything the render loop's try/catch would swallow. It found every bug below; both missions
now fly end-to-end with zero errors — GEO: burns at T+1.54h/6.85h, hold from T+17.07h, **ON STATION
T+1.71d on 3,896 m/s (5 autopilot burns)**; Moon: **3 burns** (TLI 3,087 → LOI 640 → circularize 44),
**captured and held, T+4.95d on 3,771 / 9,500 m/s**.

- **"Nothing shows on NAV and nothing happens" — fixed.** When the trail moved to inertial storage
  the line defining `cp` (the logic-frame position) was dropped, but the belt-proximity check, the
  ILS gates and the success box all still used it — so `stepFlight` threw on *every* frame: the
  mission never advanced and every draw after it was skipped, blanking the instruments.
- **Switching ✈ FLY with no mission running no longer drops you into a dead cockpit** — only the
  green "load into cockpit & fly" button ever started a flight. Entering FLY now always starts one
  (your stored plan, else the verified reference plan).
- **Zero-Δv burns are dropped from the burn card.** A burn with a 0 target made
  `done = burnDv >= dvTarget − 0.2` instantly true, so the autopilot stopped and re-lit the thruster
  *every frame* instead of flying it (383 restarts on one lunar run).
- **The lunar autopilot no longer drains the tank.** It was chasing "circular at my current radius"
  continuously on an eccentric orbit — a moving target that never converges (it spent the entire
  9,500 m/s and ended out of fuel). Circularization is now timed for an **apsis**, where the radial
  component vanishes and one burn genuinely rounds the orbit out: burn 3 is scheduled (and re-cued)
  at the next apsis via a new `lunarApsisETA()`, the autopilot waits for radial rate ≈ 0, and a
  **fuel guard** suspends trims with 15% of the tank in reserve.
- **The nagging 🔴 BURN NOW at ~1,400 m/s while fine-trimming is gone** (owner report). Retirement
  judged only the instantaneous residual, but |v − v_circ| swings tens of m/s twice a lap on a
  slightly eccentric orbit, so a pilot who had essentially finished circularizing kept failing the
  test at window-open and the cue re-armed every orbit showing the *planned* 1,457 m/s. It now asks
  whether the burn's JOB is done — apogee already at GEO (burn 1), or a ≈circular orbit at GEO
  radius, e < 0.03 (burn 2). Verified: e = 0.02–0.025 near GEO now retires; a craft still on the
  transfer ellipse (residual 1,448 m/s) correctly still gets cued.
- **The cockpit no longer freezes during a burn** (owner report). Burns froze the orbital coast to
  stay perfectly impulsive, which stopped the clock, telemetry, trail and prediction dead for the
  several seconds of a big burn. The sim now keeps running at 1× while thrusting (small clamped
  substeps). Measured cost of honest finite burns: the lunar closest approach shifts 5,140 → 5,071 km
  — about 0.05 m/s equivalent, negligible against the ±1.5 m/s TLI knife edge — and the NAV caption
  now reads "◈ BURNING — ORBIT UPDATING LIVE".

### Worksheet 8 rewritten; GEO flies in ECI throughout
- **Worksheet 8 is a major rewrite** — 17 tasks across 5 parts (was 10 across 4), a new cockpit
  reference table, 10 exam questions, and a fully reconciled summary. New teaching spine:
  1. **The three modes** — TRAIN (free flight, unlimited fuel, unscored — *start here*), PLAN
     (design burns, spend nothing), FLY (scored, real clock, real tank).
  2. **What Δv physically is** — the velocity change a burn delivers — *and* why it is currency:
     the rocket equation makes propellant cost grow exponentially, so the tank is the mission.
  3. **Maneuver intuition, hands-on in TRAIN** (new Part B): the Oberth effect (burn low and fast),
     radial vs. along-track burns, and the counter-intuitive centrepiece — **to catch something
     ahead of you, burn REVERSE**, because a lower orbit has a **shorter period**. Stated precisely:
     your speed at the burn point *drops*; the shorter **period** is what wins the race, and the far
     side of the orbit (not "apogee") is what falls. Quantified with δT/T = 1.5·δa/a, ~5°/day for a
     400 km dip, 1° ≈ 736 km.
  4. **Respect for timing and precision** (new task d3): fly the mission by hand, record grade and
     Δv, then fly the *same* mission with 🤖 AUTO FLY and compare — the losses are overshoot and late
     burns, and early errors compound out of one finite tank. TLI's ±1.5 m/s knife edge is the
     capstone example.
  5. **Rendezvous as a first-class phase** (d4): the 8° standoff, the three-move phasing maneuver,
     reading the ◎ RENDEZVOUS DIRECTOR, the 100 m collision rule.
  6. **Explicit scoring** (d5): the actual success gates and grade weights from `scoreFlight`
     (GEO 40/30/30 altitude/circularity/proximity; Moon 50/50), grade bands, and every failure mode.
  7. **Why circularizing only works at an apsis**, which motivates the lunar burn 3 timing.
  Also: the ⚙ FINE ×0.1 trim, the **,** / **.** time-warp keys and **F** are taught explicitly; a
  new "what this model does and does not include" section (planar, point masses, no drag/J2/Sun);
  and the Δv logbook figure gained phasing/trim rows against the 6,500 m/s budget. Every figure
  verified numerically against `flight8.js` (LEO 7.67, transfer 10.07 → 1.62, GEO **3.07** km/s —
  corrected from 3.08 — sidereal day 86,164 s, LEO period 92 min, transfer 5.29 h, drift 5.19°/day,
  736 km/deg).
- **The GEO mission now flies in Earth Centered Inertial (ECI) throughout** (owner call, replacing
  the auto-switch): one frame, no switching under the pilot, every orbit in its true shape. The
  belt-fixed co-rotating view stays reachable with **F** — it is the only picture in which
  "geostationary" is visible, so the worksheet sends students there once, on station — and the
  reason it is unfit for flying is now taught rather than hidden (360°/day curls the 5.3-hour
  transfer ~80°, skews the 92-minute parking lap ~23°). Labels spell the frame out in full instead
  of the redundant "ECI inertial". The final-approach zoom (framing craft + target) now works in
  every frame, not just belt-fixed. Cockpit harness assertion updated accordingly: it now checks the
  frame *never* changes mid-flight.

### Module 8: the unsatisfiable trim cue, guidance that says WHY
- **"Stuck telling me to burn 62 m/s FORWARD for no apparent reason" — found and fixed.** The
  rendezvous director was quoting the instantaneous "what would make me circular at my current
  radius?" residual. On a slightly eccentric orbit that demand **flips sign every half lap and never
  reaches zero** (measured on e = 0.004 near GEO: −6 m/s at the low point, +6 at the high, zero
  nowhere) — so it was an instruction the pilot could not satisfy, and following it burns fuel while
  the orbit gets no rounder. It is the same trap that drained the lunar tank earlier.
  The director now computes the **next apsis** analytically (true → eccentric → mean anomaly) and
  gives the pilot all four things: **what** (FORWARD/REVERSE), **when** ("HIGH POINT IN 6h 00m", or
  "CIRCULARIZE NOW" when the radial rate is under 3 m/s), **how much** (the exact Δv for that apsis),
  and **why** ("burning anywhere else only tilts it — the correction flips direction every half lap").
  New readouts: **eccentricity** and **next high/low point**. Fixed on the way: sitting exactly at an
  apsis described the *next* one, labelling perigee the "high point" and demanding FORWARD when the
  correct burn is REVERSE; and long countdowns now read "6h 00m" instead of "559:38".
- **Planner ▶ GO playback slowed** ~4.5 s → ~12.5 s so the burns and the encounter can actually be
  watched (owner request).
- **▦ GATES and ⚙ FINE ×0.1 are now explained** rather than assumed: the gates CAPCOM call says what
  the hoops are, that green = threaded and red = off-altitude, that **nothing is scored on them**, and
  that ▦ GATES turns them off; the worksheet's cockpit table gains a gates row, and the rendezvous
  task explains that full thrust delivers ~50 m/s in the shortest possible tap, which is far too
  coarse when the burn you want is 6 m/s.
- **Worksheet 8 gains task d4b, "Why the director tells you to wait"** — an exercise that has the
  student trim at a non-apsis point, watch the eccentricity refuse to fall and the instruction
  reverse half a lap later, then do it properly at an apsis. It ties the GEO trim and the lunar
  burn 3 to one rule. (18 tasks now.)
- **Integrated Δv meter hold restored** (owner report). An earlier change let the total persist
  *indefinitely* inside a burn window so it would survive long pauses — but that removed the reset
  half of the behaviour, so the meter accumulated across every tweak and never re-baselined. Back to
  one rule everywhere: the total holds for ~5 s after you release, **every pulse restarts the timer**
  (so tap-read-tap still walks a burn up to a value), then it clears. Verified: two pulses accumulate
  480 → 960 m/s, hold a steady 5.0 s, clear at 5.5 s; a cleanly completed burn holds its matched pair
  (2,381 flown against a 2,400 target) for read-back. Also, retiring an already-flown burn now leaves
  that read-back on screen instead of instantly re-baselining to the next burn's target.

### Module 8: Δv integrator, stubborn cue, NAV title, ECI centring
- **The Δv integrator really does hold now — 5 s from the LAST thrust, and clicks accumulate.**
  Three separate causes, only found once the test harness was fixed to register real listeners (the
  DOM stub had made `addEventListener` a no-op, so every earlier "pass" had bypassed the keyboard and
  mouse paths entirely):
  1. **`burnDone` forced a reset on the next press.** While fine-trimming, a single tap can satisfy or
     retire the scheduled burn — after which the very next tap zeroed the total. That is the reported
     "hit the key 3 times and it resets". A press within the hold window now always *continues* the
     running total; only a lapsed hold starts a fresh count.
  2. **Two clocks.** `stepBurn` compared the rAF timestamp against a deadline set from
     `performance.now()`. A browser's rAF timestamp is the frame start and can sit a frame behind, so
     `dt` could come out negative (the first tick of a short click adding nothing) and the hold expiry
     compared different timebases. It now reads `performance.now()` itself, once.
  3. **The deadline is refreshed on every thrust tick**, not only on release — so it is genuinely 5 s
     since thrust was last applied, robust to a swallowed pointerup (pointercancel, released off the
     button, mouseup landing elsewhere).
  Also: **sub-frame clicks used to deliver nothing at all.** A quick click can begin and end inside one
  inter-frame gap, so `stepBurn` never ran while firing. `stopBurn` now flushes the final slice of
  thrust. Verified through the real event handlers: six clicks 0.4 s apart accumulate 72 → 432 m/s
  monotonically with the hold reading 4,648 ms after each; three 60 ms clicks landing between frames
  each deliver ~90 m/s; the total clears ~5 s after the last input.
- **The stubborn 🔴 BURN NOW is capped.** Reproduced: a sloppy under-burn left a cue that re-armed
  **14 times over 6 sim-days** and was still demanding a burn at the end. Earth-period re-cues are now
  capped at 3 (was 12); the "already flown" test is looser (apogee within 10%; near-circular at GEO
  with e < 0.06); and a new nag guard retires any burn that has come round 3+ times while the craft is
  within 15% of belt radius, handing the pilot to the ◎ RENDEZVOUS DIRECTOR with a CAPCOM explanation.
  Same scenario now retires after 5 re-arms with the cue cleared.
- **NAV panel title fixed** (owner report: overflowing, font ~2× too big): now two lines at roughly
  half the size — "NAV · top view" over the frame name on its own line — so the long frame names fit.
- **The Earth no longer wobbles in ECI.** The final-approach close-up centred on the moving
  craft/target midpoint, which in an inertial frame swings the whole scene once a day. The ECI view is
  now always **Earth-centred**; the close-up applies only in the belt-fixed frame, where the target is
  stationary and the view is steady.

### Module 8: the Δv meter is a signed NET; fuel stays a total
- **A correction now walks the THIS BURN Δv meter back down** (owner request). The meter answers "how
  much of this burn have I flown?", so it is integrated as a **signed net** against the burn's
  reference direction — the *ordered* direction when there is a cue, otherwise whatever you first
  pressed. Overshoot a 2,400 m/s order and a REVERSE tap brings the number back toward 2,400; keep
  going and it reads negative, which is honest (you have net-burned the other way). The bar clamps at
  zero and a negative net trips the HOT indicator.
- **The ⛽ fuel gauge deliberately does NOT come back.** `dvSpent` stays strictly additive, because
  propellant does not care which way you point: the correction costs exactly what the overshoot did.
  Verified: overshoot then two corrections read net 336 → 240 → 144 m/s while spend rose 336 → 432 →
  528. That gap between "net achieved" and "total spent" is the economics of sloppy flying, so the two
  gauges are now explicitly different — and the cockpit tour, the worksheet's instrument table and the
  flight task all teach the distinction rather than leaving it to be discovered.

### Module 8: lunar telemetry, trail resolution, apsis re-timing
Three inconsistencies the owner reported in the lunar mission, all reproduced with hard numbers via a
lunar diagnostic run before being fixed.

- **"CAPCOM says ESCAPE while I am orbiting the Moon."** The telemetry read-back and the live orbit
  panel computed elements about the **Earth** only — and a craft comfortably bound to the Moon is
  normally *unbound about the Earth*, so the cockpit announced "ESCAPE trajectory (e ≥ 1)" at a pilot
  sitting in a good 4,480 km lunar orbit. Both readouts are now **body-aware**: a new `primaryBody()`
  switches to the Moon inside its sphere of influence, and `orbElemsLocal()` reports elements about
  whichever body owns you — "Moon orbit: peri … · apo … · e …", and escape is only ever announced
  relative to the correct primary. (`orbElems()` deliberately stays Earth-centric: the GEO phasing
  controller, apsis planner and success gates are all defined about the Earth.) The one remaining
  escape call in a clean run is at T+101.3h, **before** LOI at 5,692 km — where it is factually
  right and useful: brake or fly past.
- **"The green trajectory is straight-line segments."** The actual-path trail used a flat 2,000 km
  sampling threshold, which gives only ~15 points per lap of a 4,500 km lunar orbit — a visible polygon
  exactly where the pilot is judging their capture. Sampling now scales with lunar range (60 km inside
  20,000 km, 200 km inside the SOI, 2,000 km on the cruise) and the trail cap rose 4,000 → 9,000
  points. Measured: point spacing near the Moon **2,001 km → 68–79 km**.
- **"Stale burn commands."** Burn 3 is scheduled for an **apsis**, but its time was computed once when
  the burn was created and never revised — so any trim moved the apsis and left the cue firing at the
  wrong moment. It is now re-timed (rate-limited, while still more than 90 s out) for as long as it
  is pending: **1 distinct scheduled time → 14** over the arrival in a clean run, converging into the
  cue instead of drifting away from it.

Both reference missions still fly clean: GEO on station T+1.71 d / 3,896 m/s; lunar captured and held,
three burns, T+4.95 d / 3,771 of 9,500 m/s. All 15 harness checks pass.

### Module 8: the window is nadir-locked to whichever body owns you
- **The Moon no longer flips from the bottom of the window to the top.** The out-the-window camera
  built its attitude from **Earth**-relative vectors, so once you were orbiting the Moon "belly down"
  and "forward" referred to the wrong body: measured over one lap of a 4,500 km lunar orbit the Moon
  ran OFF TOP → lower half → OFF BOTTOM → BEHIND CAMERA → OFF TOP again. The attitude reference is now
  the body that owns you — Earth normally, the **Moon** inside its sphere of influence, matching the
  thrusters (`applyBurnPad`) — so **nadir is the floor for both bodies**, steady, no flipping.
- **…and you can now actually see the Moon out of the window.** Nadir-locking alone was not enough:
  Earth from 400 km spans ±70° so a fixed 13.5° nose-down pitch fills the lower window, but the Moon
  from a 4,500 km orbit spans only ±23° and sits ~77° off a nose-forward boresight — out of frame
  entirely. The pitch now adapts to the body's apparent size, dipping just far enough to bring the limb
  into the bottom of the window and no further (capped ~72°, which also keeps the "up" vector
  well-conditioned). Result: the limb sits at a consistent screen position with the body filling the
  bottom ~23% of the window from 2,200 km to 20,000 km out, while the familiar Earth-from-LEO view is
  unchanged.
- **"Lunar adjust burns seem to have little effect" — the burns were fine; the instruments were not.**
  Demonstrated: a 20 m/s REVERSE trim in a 4,500 km circular lunar orbit moves the **Moon-relative**
  low point 2,763 → 2,434 km (329 km), but the old **Earth-relative** readout reported
  `e 1.000 → e 1.000` — no visible change at all. With the body-aware elements from this same batch,
  plus the lunar NAV arrival zoom floor lowered 15,000 → 2,500 km (a 4,500 km orbit previously occupied
  a third of a 30,000 km-wide view), trims are now plainly visible in both the numbers and the map.

### Module 8: lunar arrival — no more UPWARD orders, brisk timing, loiter
- **"Burn UPWARDS" is gone; burn 3 is always an along-track burn at an apsis.** The circularization was
  ordered as the largest *component* of a full circularization vector, so the cue could legitimately
  read "UPWARD ~200 m/s" — correct arithmetic, baffling instruction, and against the module's own
  lesson (a radial burn tilts an orbit, it does not round it out). New `lunarApsisPlan()` mirrors the
  GEO apsis planner: which apsis is next, when, and the single along-track Δv to fly there. Guidance,
  the autopilot and the completion test all use it. Measured over a full arrival: **0 cues demanding a
  radial burn**, where before they were routine.
- **The arrival no longer hangs then lurches.** Two causes: (1) burn 3 was being *re-timed while its
  window was already open*, so the countdown kept being pushed out from under the pilot — the clock
  appeared to stall at one spot; re-timing now stops once the window opens (5 revisions, all outside).
  (2) The lunar confirmation orbit and victory lap ran at 2,600–2,800×, which flashed past. Both now
  run at 600× for the Moon — watchable — and the victory lap is two laps instead of one. Time inside
  the burn-3 window: **7.2 s** of wall clock.
- **Pre-burn warning cut from ~40 s to ~6 s, and made frame-rate independent** (owner request: "20 sec
  feels like a long time… 10 sec is plenty" — then, after a first pass, "still starts 20 sec out").
  Three things were wrong:
  1. The ladder was 60× stand-by / 4× on the cue → 40.5 s of waiting. Now **240× / 15×**, with the red
     cue arming at T-45 s instead of T-90 s.
  2. The countdown armed on the whole **±1800 s** burn window. A new `CUE_LEAD = 900 s` separates
     *cueing the pilot* from the (deliberately wide) window used for burn bookkeeping, so the amber
     countdown is a brisk run-up rather than half an hour of sim-time creeping past.
  3. **The real reason it still felt like 20 s:** `dtReal` was capped at 0.05 s, so any loop slower
     than 20 fps advanced the sim by *less* than the warp asked for — and the lunar arrival runs the
     raytracer, the big NAV and the live prediction together. Measured across frame rates, the old
     run-up took 40.7 s at 60 fps but **67.9 s at 12 fps and 101.9 s at 8 fps**. With the cap at 0.2 s
     the new run-up is **5.8–6.6 s from 8 fps to 60 fps** — steady regardless of load.
  The autopilot is unaffected (it runs the window at 300× and lands exactly on the burn time).
- **You can now loiter at the Moon as long as you like.** Reaching a confirmed lunar orbit used to
  fire the debrief and eject you. After the victory lap the flight now enters **LOITER**: mission won,
  nothing further scored, free flight in lunar orbit, with a banner and a CAPCOM call — "stay up here
  as long as you like… press **E** whenever you want the debrief". Guarded so the hold logic cannot
  award endless victory laps and a dry tank cannot fail an already-won flight. The harness now drives
  real key events (its DOM stub used to swallow them) and asserts the loiter is offered before pressing
  E; a diagnostic run left to itself loitered from frame 12,276 out to T+8.34 d without ending.

### Module 8: lunar arrival — one number, eased clock, cue at perilune
- **The cue and the Δv gauge no longer disagree.** They quoted different quantities by construction:
  the annunciator showed the REMAINING residual while the gauge marker showed the CUMULATIVE total for
  the burn, so after a pulse the screen read "brake 400" beside a gauge targeting 700. A single
  `burnTargetNow()` is now the only source of truth for the annunciator, the gauge marker and the side
  panel, and it returns the cumulative total — a number that does not slide as you fly it. Measured
  over a whole lunar arrival: **0 mismatches** (was 1,767 samples apart).
- **Also fixed: the annunciator's text was never cleared**, only hidden by CSS — so stale orders (a TLI
  cue still reading "3,086 m/s FORWARD" hours later) lingered in the DOM. It is emptied when not cued.
- **The approach no longer flashes past.** The cruise warp (12,000×) was held right down to ~5,000 km
  from the Moon, so the arrival — the part worth watching — went by in under a second before the cue
  armed out of nowhere. The lunar arrival clock is now **capped by RANGE** (2,000× outside 45,000 km,
  then 600× / 300× / 120× as you close inside 20,000 / 10,000 / 6,000 km) so it only ever winds down.
  Applied as a cap rather than a ladder rung, which also removes the lurch back up to 1,500× that
  appeared when the burn window opened — and deliberately not applied to the confirmation orbit,
  victory lap or loiter, since capping those by range stretched a two-lap victory to eight minutes.
- **LOI is cued at closest approach, and not before** (owner: "it tells me to do it way too early").
  The cue is now suppressed entirely while the Moon is beyond 25,000 km, and it is re-timed to the live
  predicted perilune only when that prediction is a real encounter (inside 25,000 km). CAPCOM now
  explains the burn when its window opens rather than just naming a number.
- **On the ~600 m/s that looked "way too much": it is correct — and cheaper than planned.** At the
  reference perilune (5,140 km, 1.614 km/s relative to the Moon) bare capture needs only 233 m/s, a
  circular orbit right there needs **637 m/s**, and the logbook plan allows 900. The cue quotes the
  circularize-at-perilune figure because that is what leaves burn 3 costing tens of m/s instead of
  hundreds. The cue and CAPCOM now say so explicitly.
- **Performance on approach:** the live trajectory prediction ran on EVERY frame while thrusting (the
  `!firing` term in its throttle) — up to ~3,000 RK4 steps per frame during the LOI burn. It is now
  throttled to 250 ms while firing, and its horizon/step budget shrink inside the Moon's sphere of
  influence (12 h instead of 8 days), where there is nothing to foresee days ahead anyway.

### Module 8: TRAIN mode slowed to a watchable pace
- **TRAIN ran at 1,200× — a whole LEO orbit in 4.6 seconds** (owner: "timing starts WAY too fast in
  training mode"). That is useless for the one thing the sandbox exists for: watching a burn reshape
  the orbit. It is now **60×**, about **92 s per lap**, with "." scaling up to 960× (≈6 s/lap) when you
  want to skip ahead and "," slowing further. The first CAPCOM drill message now tells the pilot the
  clock is deliberately slow here and points at the "," / "." keys.
- Worth recording why it drifted: the 1,200× figure was chosen to match the *old effective* pace, back
  when a bug floored every warp near ~1,200× regardless of the setting. Fixing the `dtReal` cap
  (previous entry) let high warps finally reach their nominal rate — which made the nominal 1,200× in
  TRAIN suddenly real, and far too fast.

### Module 1 controls introduction; module 1 + 8 decks
- **Module 1 now introduces its controls properly.** The simulator supported mouse pan/zoom/rotate, the
  arrow keys, `,`/`.` time warp and `R` to reset all along — but only documented them in a single dim
  line of small print, which is easy to miss and leaves half the exercises undoable. `tut1.html` now
  shows a **first-run controls card** (once per browser, reopenable from a ⌨ button in the View panel,
  Escape to dismiss) covering the mouse, the arrow keys, the time keys, `R`, and the left-hand control
  board.
- **Worksheet 1's Part A now makes students USE each tool, with a target rather than a gesture:** pan
  until Earth sits off to one side, zoom until the ISS orbit just fits then right in to the surface,
  Shift-drag underneath to look up at Earth, then hands off the mouse and use the arrow keys to tip the
  view until an orbit is exactly **edge-on** (which is how inclination is judged by eye later). The time
  task now has a measurable goal — speed up until an ISS lap takes ~10 s, then try the same for GEO and
  discover how much further you must go. New task **ctl4 "The control board"** introduces the switches,
  the three sliders and ◇ INJECT, and teaches the thing that catches everyone out: the sliders only load
  the NEXT shot — an object already in flight ignores them, exactly as in reality. (21 tasks.)
- **`slides/module1.pptx` → 9 slides:** a new **"Driving the simulator"** slide (mouse / arrow keys /
  `,` and `.` / control board), placed just before "What you'll do". Built by cloning an existing slide's
  shape tree so the background, decorative ovals, card styling and fonts match exactly.
- **`slides/module8.pptx` reconciled with the rewritten module** and grown to 9 slides: budgets
  corrected to **3,860 / 6,500** and **9,500**; LOI restated as **~600 m/s at closest approach** (and
  noted as *less* than the 900 planned) with capture leaving an ellipse so a **third** burn rounds it
  out at an apsis; the cockpit slide now lists the **three modes** (TRAIN / PLAN / FLY) plus the
  rendezvous director instead of the old PLAN/FLY/BURN-NOW/ILS four; "What you'll do" rewritten around
  TRAIN-first, fly-by-hand-then-AUTO, phasing, and the three lunar burns; and a **new "To catch up, drop
  LOWER"** slide carries the module's counter-intuitive centrepiece (shorter lap, ~5°/day from a 400 km
  dip, 736 km per degree). The closing line is now "Plan the Δv, fly the plan — and to catch something
  ahead of you, drop LOWER." Instructor guide deck references updated to match.

### Module8 deck deepened to 12 slides; instructor guide beats rewritten
- **`slides/module8.pptx` → 12 slides.** Two of the module's stated learning goals had no slide at all:
  - **"Δv is the currency"** — what a burn physically delivers, why the rocket equation makes it
    exponential, and the two tanks (6,500 / 9,500 m/s).
  - **"How you're scored"** — the real success gates (GEO: 5% radius, 4% speed, 3.5° of the target,
    *held* a full orbit; Moon: bound, inside the SOI, 8% of circular, held a revolution), the grade
    weights (40/30/30 and 50/50) and every failure mode including the 100 m collision rule.
  Also added **"Circularize only at an apsis"**, which ties the GEO trim and the lunar burn 3 to one
  rule, and corrected stale copy on the existing slides: the GEO mission is now described as a
  two-burn transfer *plus a phasing leg to rendezvous*, the lunar flight as *three* burns, the aim
  point as 395,000 km (was 397,500), and TLI's ±1.5 m/s knife edge is called out.
- **Instructor guide Module 8 beats rewritten** to match, in the order the deck now runs: Δv as
  currency → TRAIN first → the backwards-to-catch-up rule (with δT/T = 1.5·δa/a, ~5°/day, 736 km per
  degree) → GEO servicing and its phasing leg → lead the Moon and the knife edge → three burns with
  the brake at closest approach and the apsis circularization → say the scoring out loud. Adds a
  second misconception to pre-empt ("thrust toward the thing ahead of you") and suggests flying one
  GEO mission on AUTO FLY as a live demo so the class sees the standard. Deck reference updated to
  12 slides with the full running order.
- Card sub-labels on the new slides were measured against their boxes and shortened until nothing
  overflows.

## v4.1 — 2026-07-23 (owner flight-test round on the v4.0 fan lab; star fields)
All client-side; `server.js` changes only its version header.

- **Time controls were dead in three fan modes (the big one):** `warpUp/warpDown` used
  `WARPS.indexOf(warp)`; scenario defaults that sat between ladder rungs (tadpole/minimoon
  345600, free-return 43200) returned −1, so pressing `.` snapped the sim to **1×** and `,` did
  nothing — this is also why no minimoon captures were ever seen (they begin ~day 25, and the
  sim was frozen). Stepping is now nearest-rung, 12 h/s was added to the ladder, and every
  scenario default sits ON the ladder. Minimoons now default to a readable **1 d/s** (tadpoles
  5 d/s, free return 6 h/s).
- **Minimoon captures made visible:** a green **capture halo** ring lights around any object
  while its Earth-relative energy is negative (cleared on death/re-release); the message and
  worksheet set the timing expectation (~3 weeks of infall ≈ 25 s before the first halo can
  appear). Release path re-verified by executing the shipped branch at a NONZERO release time
  (simT = 13.7 d): fates identical to the design — the rotation onto the live Earth–Moon line
  is exact.
- **Free return corrected — 4 of 7 come home (owner caught it):** pink RE-ENTERS at day 18;
  the original 16-day verification window had mislabeled it "stranded at 320,000 km".
  Confirmed over 120 days: green d7.8, cyan d8.3, pale d13.3, pink d18.0 re-enter; yellow &
  purple still out at day 120; red impacts d4.9. Teaching point sharpened: everyone who comes
  home used no propellant, but only true free-returns arrive on a crew-survivable schedule.
  (`test/tut6-physics.verify.js` window extended 16 → 20 d so the committed evidence shows
  pink's return.)
- **Minimoon viewing:** wheel/pinch zoom cap raised 8 → **15 lunar distances** (~5.8 M-km
  camera height — the scenario plays out over ±2 M km and ran off-screen); releasing minimoons
  auto-zooms any panel closer than 6.5 D out to the full picture; Earth's **Hill sphere** is
  drawn to scale (faint dashed ring at 1.5 M km) while the scatter or minimoon experiment is
  live, giving "flung away" and "captured" a visible boundary.
- **Stale banners cleared:** the bottom banner ('splashdown', 'ballistic capture', …) now
  clears on every ▶ release and on scenario-mode switch instead of lingering over the next run.
- **Star fields across all eight sims:** tut4/5/6's "random" stars were deterministic
  hash/golden-angle patterns that drew visible spiral bands; all 3-D fields now use uniform
  random positions with a power-law brightness spread (many dim + a few bright), subtle
  warm/cool per-star tint, and two size layers (tut5/tut6 keep their camera-following
  star-shell mechanics). 2-D scenes match: tut8 cockpit window, tut7 exposure camera (was a
  coarse 100-cell grid; plate-solve streak layouts stay seeded for the IOD exercise), tut2
  telescope FOV — sizes track brightness in live views and developed exposures.

## v4.0 — 2026-07-23 (Module 6 becomes a cislunar dynamics laboratory; M3 sun-synch)
Major-version bump: the Module 6 fan release grows from one chaos demo into **six tuned
experiments on the true restricted three-body field**, the effective-potential surface returns,
and Module 3 gains real J2 physics with a sun-synchronous preset. All client-side; the only
server.js change is the version header.

- **Module 6 physics upgrade — the INDIRECT TERM:** `fanAcc` now includes Earth's own
  acceleration toward the Moon (−μ_M·r̂_M/D²), making the fan the true CR3BP expressed in
  Earth-centered coordinates. Without it the off-axis equilibria sat at ±118° (solved
  numerically) — nowhere near the ±60° L4/L5 markers; with it, L1 solves to 0.8493 D (marker
  0.8491) and L4 to 59.97°. The scatter set was retuned for the corrected field (passes
  1.2–12.7 R_M; yellow skims ~307 km — Apollo-8 altitude — and is flung to a ~4 M-km orbit,
  past Earth's ~1.5 M-km **Hill sphere**, the new "flung away" test and banner). The old
  "mixed fan" mode was retired (its "prograde" basis was in fact reversed — releases
  counter-rotated); a warp-cap bug that silently **dropped sim time** at high `,`/`.` warp was
  fixed (step size grows past the 3,000-substep cap instead; dense-trail sampling is by sim
  time). Every number above was verified by **executing the shipped functions and parameter
  arrays, extracted verbatim from the file, at the page's own RK4 step sizes**
  (`test/tut6-physics.verify.js`; MAINTENANCE §6.5).
- **Six fan-release scenarios** (each with its own live counter, banner, and teaching text):
  **🌙 lunar scatter** (retuned slingshot family); **⚖ L1 knife-edge** (7 objects AT the model's
  L1, kicks ≤8 m/s decide moonward ~d9 / earthward ~d13 / hover — the un-kicked one departs
  ~d21 from round-off alone: unstable equilibrium made visceral); **🐸 L4 tadpoles** (kicks to
  30 m/s just librate 1–22° for 120 days; a 50 m/s outlier breaks out — the stable pocket has a
  rim); **🔄 DRO vs prograde** (Earth's tide strips prograde lunar orbits at 40k/55k km in days
  and craters one from 30k, while every distant-retrograde twin persists — why Artemis I parked
  Orion in a DRO; close-in 20k prograde survives); **∞ free return** (7 ships spanning ~6 m/s of
  departure speed: two re-enter ~d8, stragglers at d13 and d18 — 4 of 7 eventually home — one
  hits the Moon, two still out after 120 d; the Apollo 13 fail-safe. The d18 return was first
  caught by the course owner in flight-testing: the original 16-day verification window had
  mislabeled pink "stranded"); **🌒 minimoons** (7 identical slightly-hyperbolic
  arrivals differing only in arrival DAY; lunar flybys ballistically capture yellow & pink for
  >1 year and green & purple for ~3 weeks, cyan sails through, red craters — the real
  2006 RH120 / 2020 CD3 mechanism, with a live "captured right now" moon-count).
- **Gravity landscape restored:** the effective-potential surface removed from early Module 5
  ("deferred to Module 6") is finally delivered — a toggleable wireframe of
  U_eff = −μ_E/r_E − μ_M/r_M − ½ω²ρ² (ρ from the barycenter): Earth/Moon funnels, L1/L2/L3
  saddle passes, L4/L5 hilltops. It rides the rotating E–M line and appears only in co-rotating
  panels (in inertial panels the landscape itself would spin — which is the lesson). The stale
  "potential surface" claim in the Module 5 README bullet was corrected.
- **Module 3 — sun-synchronous orbits:** tut3 now draws the **Sun's direction** advancing
  0.9856°/day on the shared sim clock and precesses the RAAN at the true **J2 nodal rate**
  Ω̇ = −(3/2)J2(R⊕/p)²n·cos i when auto-move is on (continuous `animRaan` state — same
  slider-snap trap as the Molniya `animNu` fix; RAAN slider step 1→0.1). A corner ☀ HUD shows
  the node−Sun angle and precession rate and flags the lock. New **sun-synchronous preset**
  (700 km, i = 98.2°, retrograde): +0.987°/day, locked to the Sun — verified by executing the
  shipped `raanDotDegDay()` (ISS drifts −4.95°/day; Molniya −0.148). Worksheet 3 gains task
  d4 ("the orbit that tells time") + exam-quality quiz.
- **Worksheet 6 rebuilt around the six releases** (Part D now d1 knife-edge, d1t tadpoles,
  d1b scatter — students switch to **Moon-centered inertial before arrival** to read the
  flybys' true shapes, d1c 3-D rotate, d1d DRO, d1e free return, d1m minimoons, d2 tracking),
  with new exam questions (DRO/Artemis, free return, minimoon capture) and Hill-sphere framing
  replacing bare "unbound" throughout. Worksheet b3 walks the gravity landscape.
- **Instructor guide** M3/M6 sections, learning goals, and live-demo scripts updated;
  `module3.pptx` and `module6.pptx` refreshed; `guide.html` regenerated.

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
