# Orbit Academy — Instructor's Guide

A complete guide to running, hosting, and teaching with Orbit Academy. Written for an
instructor or course administrator; no prior web-development experience assumed.

---

## 1. What this is

Orbit Academy is a self-contained, browser-based course that teaches orbital dynamics to
non-specialists (built for JASON / US Space Force technical-staff training). It has three parts:

- **Simulators** (`tutN.html`) — live, interactive 3-D physics visualizations, one per module.
- **Worksheets** (`worksheetN.html`) — guided lessons that open beside each simulator: learning
  objectives, a one-page tutorial, numbered hands-on exercises with check questions, a final quiz,
  a key-points summary, and further-reading links.
- **A course-management backend** (`server.js`) — optional. Provides student accounts, saved
  progress, prerequisite gating (you must finish Module N before N+1 unlocks), and an instructor
  roster dashboard.

The course covers **eight modules**: Orbital Dynamics → Angular Rates & Geosync → Naming Orbits &
TLEs → Maneuvers & Perturbations → xGEO / Cislunar Space & Reference Frames → Lagrange Points &
Complex Orbits → **Observability** → **Lunar Transfers & Artemis** (the piloting capstone). All eight
modules are complete. (File-id note: Observability is Module 7 = `tut7`/`worksheet7`; the flight-sim
capstone is Module 8 = `tut8`/`worksheet8`.) There is also a **course-wide final quiz** and a
printable **completion certificate**.

---

## 2. Download & install

Everything is plain HTML/JavaScript plus one small Node.js server file. There is **nothing to
compile and no packages to install** (the only external dependency, the Three.js 3-D library, is
loaded from a pinned public CDN).

### 2.1 Get the files

**Option A — download a ZIP (no tools needed):**
1. Go to the repository: `https://github.com/JASONSS26/orbit-academy`
2. Click the green **Code** button → **Download ZIP**.
3. Unzip it anywhere (e.g. your Desktop). You'll get an `orbit-academy/academy/` folder.

**Option B — clone with git (if you have git):**
```bash
git clone https://github.com/JASONSS26/orbit-academy.git
cd orbit-academy/academy
```

### 2.2 Install Node.js (only needed to run the tracked/server mode)

- Download the **LTS** installer from <https://nodejs.org> and run it. Any recent version works.
- Verify in a terminal / command prompt:
  ```bash
  node --version
  ```
  If it prints a version number (e.g. `v20.x`), you're set.

> You do **not** need Node.js at all for the standalone (no-login) mode — see §3, Option 1.

---

## 3. Three ways to run it

Choose based on whether you need **central accounts and a roster**.

### Option 1 — Standalone (zero install, no accounts)

The worksheets and simulators are static files. If no backend is present, each worksheet
automatically runs in **standalone mode**: it renders normally and saves the student's progress in
that browser's own storage (`localStorage`). No logins, no central roster — the course just works
from a local file or any static host.

- **Run it with no server at all:** open `academy/public/gallery.html` (or `index.html`) directly
  in a browser, or serve the folder with any static server (e.g. `python3 -m http.server` from
  inside `academy/public/`).
- **Trade-off:** progress lives in each browser, so it doesn't follow a student between devices,
  and there's no roster. Best for demos, self-study, and quick reviewer previews.

> A small badge ("● standalone — saved in this browser") appears on the worksheet in this mode, so
> students know their progress is local.

> ⚠️ **A note on GitHub Pages.** It's tempting to host the static site on GitHub Pages, but on
> standard GitHub a **Pages site is readable by anyone with the URL even when the repo is private**
> — there is no access control. Access-restricted Pages exists only on GitHub Enterprise Cloud. So
> do **not** use Pages if the material must stay limited to authorized people. For an
> authorized-only preview, have reviewers **clone the repo and run it locally** (they already have
> repo access), or use **Codespaces** (private port-forwarding), or a host behind your own SSO.

### Option 2 — Full server (accounts, saved progress, instructor roster)

Run the Node server for a managed cohort with central accounts and a dashboard.

```bash
cd academy
node server.js            # serves http://localhost:8080
# change the port:  PORT=9000 node server.js
# move the data file:  ORBIT_DATA=/path/to/academy_data.json node server.js
```

- Open **http://localhost:8080**. **The first account you register becomes the instructor.**
  Register yours first, then have students register their own.
- Progress and prerequisite gating are enforced server-side; the instructor account sees a roster
  of all students and their module/pass status.
- For a classroom, run it on one machine on the LAN and give students that machine's address
  (e.g. `http://10.0.0.5:8080`). For internet-facing use, put it behind HTTPS + a reverse proxy
  with rate-limiting (see `docs/SECURITY.md`).

### Option 3 — Both

Publish the standalone build on GitHub Pages for broad/self-study access, **and** run the server
for tracked cohorts. They share the same files.

| | Standalone (Pages) | Full server |
|---|---|---|
| Install | none | Node.js |
| Accounts / login | no | yes (first user = instructor) |
| Progress saved | per-browser (localStorage) | per-account (follows the student) |
| Prerequisite gating | open (all modules available) | enforced server-side |
| Instructor roster | no | yes |
| Best for | open access, demos, self-study | managed training cohorts |

---

## 4. The data file (server mode)

- `academy_data.json` holds all accounts (passwords are **scrypt-hashed**, never plaintext) and
  progress. It is created automatically on first run.
- It is **gitignored and must never be committed** — it contains password hashes. The repo also
  ignores its rolling backup (`.bak`) and temp (`.tmp`) files.
- The server writes atomically (temp file + rename) and keeps a rolling `.bak`, so an accidental
  crash or delete won't lose accounts. To relocate it, set the `ORBIT_DATA` environment variable.
- **Back it up** by copying `academy_data.json` somewhere safe periodically.

---

## 5. How a student uses it

1. Open the hub (`index.html` / the site root). In server mode, register or log in.
2. Click a module. The **worksheet opens in its own window**; a **simulator** button opens the
   live tool. Arrange them side by side (worksheet left, simulator right works well).
3. In the worksheet: read the **objectives** and the one-page **tutorial**, then work the
   **numbered exercises** in the simulator, answering each check question (or clicking "mark done").
4. Finish with the **final check** (a short quiz over the whole module), review the **key points**,
   and follow any **resources** links.
5. Every worksheet header has buttons: **🃏 Cheat sheet** (keyboard/mouse controls, printable
   wallet card), **📚 Resources** (all modules' links in one page), **🖨 Print** (print/save the
   worksheet as PDF), and **↗ Simulator**.

Controls are the same in every simulator: **left-drag = pan, shift/right-drag = rotate,
wheel = zoom, arrow keys = rotate, `,`/`.` = slow/speed time, space = pause, R = reset.**

---

## 6. Teaching notes, module by module

Each module is designed for roughly a **30–50 minute** session. The worksheet is self-paced; the
instructor's role is to set context, watch for the common misconceptions below, and debrief.

**Module 1 — How Orbits Work.** The one idea to land: an orbit is *falling sideways fast enough to
keep missing the ground*. Common misconception: "there's no gravity in space." Have them do the
speed-ladder exercise (too slow → crash, right speed → circle, faster → ellipse) before discussing.
Payoff: geostationary = a 24-hour orbit that keeps pace with the ground.

**Module 2 — Angular Rates & Geosync.** Central skill: angular rate vs. true speed, and why the GEO
belt is prime, finite real estate (360 one-degree slots). The ground-telescope view (stars streak
while a tracked satellite holds, and vice-versa) previews the observability module. Watch for
confusion between *geosynchronous* (24-h period) and *geostationary* (24-h **and** equatorial).

**Module 3 — Naming Orbits & TLEs.** Goal: an orbit has a six-number "name tag" (the elements), and
a TLE is just those numbers in a text format. The invariance idea is key — re-orienting an orbit
(RAAN, argument of perigee) does **not** change its size, shape, or period. The Molniya "invent it
by trial and error" exercise is a highlight; let students discover the ~12-hour period themselves.

**Module 4 — Maneuvers & Perturbations.** Two big ideas: **delta-v is finite currency** (the fuel
gauge), and **tangential burns are efficient while radial burns are wasteful/paradoxical**. The
GTO→GEO two-step transfer and the escape/re-entry scenarios are the payoff. Great counter-intuitive
demos: the radial-burn "crash," and the drag paradox (drag speeds a satellite up).

**Module 5 — xGEO / Cislunar Space & Reference Frames.** The whole module is about **reference
frames** — what you hold still changes everything. The **2×2 compare view** (all four frames at
once, one clock) is the centerpiece; spend time there. The four frames are ECI, Earth–Moon rotating
(synodic), Moon-centred inertial (MCI), and **ECL-EMBR** — the barycentric-rotating frame centered
on the Earth–Moon barycenter, where *both* bodies freeze and the Lagrange points hold still (it sets
up Module 6). The tool marks the barycenter (exaggerated so students see Earth wobble about it) and
shows the ecliptic vs. equator planes tilted by the 23.4° obliquity. Other key beats: the Hill
sphere / L1 boundary (L1 is ~85% of the way to the Moon, *not* the midpoint), the definition of xGEO,
and "leading the Moon" for a transfer. Note: the tool idealizes the Moon's orbit as flat so the
rotating frame reads cleanly; the real ~5° tilt is taught as the reason eclipses are occasional.

**Module 6 — Lagrange Points & Complex Orbits.** The richest, most conceptually demanding module.
Core beats: the five Lagrange points as **spots that share the Moon's 27.3-day period** (drawn as ▲
markers, distinct from bodies); the **1-D force-balance** view (L1 the Moon opposes Earth → gentler
pull; L2 they add → stronger pull; "balance" never means zero net pull); **L4/L5 stable, L1/L2/L3
unstable** (golf-ball-on-a-basketball); the **near-rectilinear halo orbit (NRHO)** that CAPSTONE/
Gateway fly; **TESS** in 2:1 resonance; the **live RK4 fan-release chaos** sandbox (including the
lunar-scatter slingshot with some objects flung unbound); and the capstone **libration "zoo"** — the
whole family of L1 orbits from two amplitude knobs and a frequency ratio. This module rewards an
instructor who understands the physics deeply; **§11 below is a dedicated deep-dive on the L1 orbits**
because the questions this module provokes are genuinely subtle. Hard language rules the module obeys:
never say "centrifugal"/"centripetal" — motion is explained with real gravity + sideways motion.

**Module 8 — Lunar Transfers & Artemis (the capstone).** The student stops studying
orbits and **flies** one, from an Artemis-style cockpit. Two views: a **PLAN** mode (a flight
computer where you compute each burn's Δv from vis-viva and iterate to the target, with a live
trajectory predictor and a "run sim" playback) and a **FLY** mode (the cockpit — window with real
Earth/Moon at correct angular size, embedded MFD screens, hold-to-thrust controls, and a BURN-NOW
cue). Two missions: **go to GEO** (a gentle two-burn Hohmann warm-up, familiar from Modules 2–3) and
**go to the Moon** (raise apogee → lead the Moon → capture). Launch-to-LEO is automated; victory is
reaching the target orbit. Everything from Modules 1–6 gets used in anger.

**Module 7 — Observability.** The "how do we even know where anything is?" module — the practical
payoff of the whole course, and the bridge to space domain awareness. Core beats: **active radar**
(received power falls as **range⁴** two-way — a GEO target returns ~(GEO/LEO)⁴ ≈ 300,000× weaker
than a LEO one, and xGEO is hopeless for most radars); the **"headlights" analogy** for optical
(you only see sunlit objects — you're driving at night seeing bicycles only when a passing truck's
headlights, the Sun, catch them); **thermal-IR** self-emission (warm objects glow even in shadow);
**cooperative vs. uncooperative** tracking; **custody and cadence** (chaotic cislunar orbits go stale
fast, so you must re-observe often); **maneuver detection**; the crucial distinction between
**orbitology** (where is it) vs. **characterization** (what is it) vs. **inferring intent** (why);
**proximity operations / neighborhood watch**; how radar measures **range and range-rate** with crude
angles; how optical gives precise **angles (RA/DEC)** but no range directly; how **parallax** across
successive images (or two sites) constrains range (the finger-in-front-of-alternating-eyes demo); and
**pointed custody vs. all-sky survey** tradeoffs.

---

## 7. Instructor dashboard (server mode)

Log in with the instructor account (the first one registered). The hub shows a **roster**: each
student, which modules they've completed, and their pass status. Prerequisite gating means a
student can't skip ahead — the server enforces it regardless of what the browser does.

To reset a cohort, stop the server and archive/remove `academy_data.json` (keep a backup first);
a fresh file is created on next start, and the first new registration becomes the instructor again.

---

## 8. Updating & testing

- Pull the latest files (ZIP or `git pull`).
- If you run the server, sanity-check it after updating:
  ```bash
  cd academy
  bash test/run.sh      # functional + security + DoS checks, on an isolated temp data file
  ```
  The tests never touch your real `academy_data.json`.
- See `docs/CHANGELOG.md` for what changed, and `docs/SECURITY.md` for the per-release audit log.

---

## 9. Troubleshooting

- **"Please sign in first."** — You're in server mode but not logged in. Register/log in at the
  hub. (If you *want* no-login use, host the static files without the server — §3 Option 1.)
- **The worksheet window didn't open.** — The browser blocked the pop-up. Allow pop-ups for the
  site, then click "Re-open the worksheet."
- **3-D view is blank.** — The Three.js library or a texture failed to load; it's fetched from a
  public CDN, so the machine needs internet access. Simulators degrade gracefully (a plain-colored
  Earth) if a texture is blocked, but the CDN script itself is required.
- **Progress didn't save across devices.** — That's standalone mode (per-browser storage). Use the
  server (Option 2) for progress that follows the student.
- **Lost accounts.** — Restore `academy_data.json` from its `.bak` (same folder) or your backup.

---

## 11. Deep dive — the complexities of L1 (halo) orbits

Module 6's libration "zoo" and NRHO scenario provoke sharp questions. This section arms you to
field them. It is background for the instructor, pitched above the student level.

**1. These are not Keplerian orbits.** A satellite in LEO or around the Moon traces an **ellipse**
about a single dominant body, fully named by six orbital elements (a TLE). A **halo orbit around a
Lagrange point has no single central body** — it circles an *empty point in space* where Earth's
and the Moon's pulls, together with the motion needed to keep pace with the rotating Earth–Moon
line, balance out. There is **no focus, no fixed ellipse, no TLE.** It is a periodic solution of the
*restricted three-body problem*. When a student says "but it's not centered on anything!" — exactly.
That's the whole point, and it's the single most mind-expanding idea in the course.

**2. One parameter, not six.** Astonishingly, the entire family of halos around a given Lagrange
point is labeled by **one number** — the **Jacobi constant**, the conserved energy-like quantity of
the rotating frame (higher amplitude ↔ lower Jacobi constant). Fix it and the size, the out-of-plane
height, and the period are all determined. Contrast the six-plus elements of an ordinary orbit. In
the zoo, the amplitude sliders + frequency-ratio buttons expose this: at a **1:1** frequency lock the
in-plane and out-of-plane amplitudes are tied together by a constraint (one free parameter → a true
halo); at other ratios they're independent (a two-parameter **Lissajous/quasi-periodic** family that
never closes). A whole-number ratio closes into a figure; an irrational ratio fills a 3-D band forever.

**3. Why the near-degeneracy matters.** Near a collinear point the motion splits into an unstable
saddle × an in-plane oscillation (ω_p) × an out-of-plane oscillation (ω_v). For Earth–Moon L1 these
are **ω_p ≈ 2.37, ω_v ≈ 2.30** (units of the monthly rate) — very close but unequal. A generic
bounded orbit is therefore a **Lissajous** that never closes. A **halo** is the special amplitude at
which nonlinear terms drag ω_p and ω_v into an exact **1:1 lock** so the path closes into a single
loop. Because the two frequencies start so close, that lock happens at modest amplitude — which is
why real Sun–Earth L1/L2 halos (SOHO, Gaia, JWST) are rounded, moderate loops, not wild shapes.

**4. The NRHO is deliberately lopsided — and that's correct.** A near-rectilinear halo (CAPSTONE,
Gateway) skims a few thousand km over one lunar pole and swings ~70,000 km over the other. Students
(and instructors) balk: the gravity field is mirror-symmetric top-to-bottom, so shouldn't the orbit
be? **No.** A symmetric field yields a mirror-image *pair* of solutions — a **northern** and a
**southern** halo — and each individual orbit picks a side (like a ball settling into one well of a
symmetric double-well). Gateway flies a southern NRHO; its northern twin is equally valid. The orbit
*is* still symmetric, just about the plane through the Earth–Moon line and the poles, not the orbital
plane. **Second gem:** because it's a very eccentric loop, Kepler's second law applies locally — the
craft **whips through the close pole pass in hours but loiters for days at the far end**, so a
"lunar" orbit spends ~99% of its time *far* from the Moon.

**5. What supplies the torque? (The subtle one.)** In the rotating frame the halo holds a fixed
orientation, so in the inertial sky its orientation — and its angular-momentum vector — **sweeps
around once a month.** A changing angular momentum requires a **real torque.** Where from? **The
Moon's off-axis gravity.** Earth's pull is central about Earth (zero torque about Earth), but the
Moon sits off to the side, so its tug does not point through Earth and exerts a genuine torque that
swings the orbit around to keep pace with the Earth–Moon line. This is *not* a rotating-frame
artifact — it is honest Newtonian gravity, and it vindicates the course's "banish fictitious forces"
rule. (Numerically the Moon's torque about Earth on a representative halo point is ~0.2 in
km²/s² per unit mass — nonzero, exactly as required.)

**6. Honesty about the tool.** The zoo uses the **linearized** (Richardson) equations plus a
lookup-table nudge for how the loop's center migrates toward the Moon at high amplitude. The shapes
and rhythms are faithful; it is **not** a full nonlinear integration, and it is labeled as such in
the UI. If a student asks whether they could fly one, the answer is yes — but station-keeping is
required because L1/L2/L3 are unstable (the halo is a controlled dance around an unstable point).

---

## 12. Credits & license

MIT licensed. Built for JASON / US Space Force training; companion to the CISLUNAR PATROL game and
the xGEO simulator. Three.js is © its authors, loaded from a pinned CDN (SRI-checked).
