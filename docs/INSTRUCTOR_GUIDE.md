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

The course currently covers **five complete modules** (Orbital Dynamics → Angular Rates & Geosync
→ Naming Orbits & TLEs → Maneuvers & Perturbations → xGEO / Cislunar Space), with three more
planned (see `docs/MODULE_NOTES.md`).

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

### Option 1 — Standalone / GitHub Pages (zero install, no accounts)

The worksheets and simulators are static files. If no backend is present, each worksheet
automatically runs in **standalone mode**: it renders normally and saves the student's progress in
that browser's own storage (`localStorage`). There are no logins and no central roster, but every
student can use the course immediately from a URL or even a local file.

- **Host on GitHub Pages (free):** In the GitHub repo, go to **Settings → Pages**, set the source
  to your default branch and the `/ (root)` (or `/academy` — see note) folder, and save. GitHub
  gives you a public URL like `https://JASONSS26.github.io/orbit-academy/academy/`. Share it and
  you're done. *(Note: Pages serves whatever folder you point it at; the app lives in `academy/`,
  so students open `.../academy/index.html`.)*
- **Or run it locally with no server at all:** open `academy/index.html` directly in a browser,
  or serve the folder with any static file server (e.g. `python3 -m http.server` from inside
  `academy/`).
- **Trade-off:** progress lives in each browser, so it doesn't follow a student between devices,
  and you get no roster. Best for open access, demos, and self-study.

> A small badge ("● standalone — saved in this browser") appears on the worksheet when it's in
> this mode, so students know their progress is local.

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
once, one clock) is the centerpiece; spend time there. Other key beats: the Hill sphere / L1
boundary (L1 is ~85% of the way to the Moon, *not* the midpoint), the definition of xGEO, and
"leading the Moon" for a transfer. Note: the tool idealizes the Moon's orbit as flat so the
rotating frame reads cleanly; the real ~5° tilt is taught as the reason eclipses are occasional.

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

## 10. Credits & license

MIT licensed. Built for JASON / US Space Force training; companion to the CISLUNAR PATROL game and
the xGEO simulator. Three.js is © its authors, loaded from a pinned CDN (SRI-checked).
