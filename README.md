# 🛰 ORBIT ACADEMY — v2.4

An interactive course that teaches orbital dynamics to non-specialists — from "what is an orbit?"
through cislunar space — using a live 3-D simulator, guided worksheets, quizzes, and a real
course-management backend (accounts, prerequisite gating, progress tracking, instructor roster).

Built for JASON / US Space Force technical-staff training. Companion to the CISLUNAR PATROL game
and the xGEO simulator.

## 👀 Reviewers — quickest way to try it

You have repo access, so just run it locally (nothing is exposed on the public internet):

```bash
git clone https://github.com/JASONSS26/orbit-academy.git
cd orbit-academy/academy
node server.js                     # needs Node.js (nodejs.org); no packages to install
```
Then open **http://localhost:8080/gallery.html** — a no-login gallery with a link to every
worksheet and simulator. (Worksheets opened there run in *standalone mode* and save progress in
your browser; use the main hub at `http://localhost:8080/` if you want to create an account.)

**Even simpler, no Node at all:** open `academy/public/gallery.html` directly in a browser — every
page works, progress saves locally. (A couple of features degrade without the server; see below.)

## What's here (v2.4)

- **Module 1 — How Orbits Work** (complete): circular/elliptical orbits, speed-vs-altitude,
  prograde/retrograde, geosynchronous vs. geostationary, inclination, launch geography.
- **Module 2 — Angular Rates & Geosync** (complete): split-view (top-down + ground telescope),
  the GEO belt & slots, geostationary vs. geosynchronous, sky-from-the-ground streaks & frames.
- **Module 3 — Naming Orbits & TLEs** (complete): the six Keplerian elements (live-slider
  ellipse), "TLE of your orbit," and real orbits incl. Molniya/Tundra.
- **Module 4 — Maneuvers & Perturbations** (complete): Δv burns (with a fuel "gas gauge"),
  GTO→GEO transfer, drag decay & re-entry, escape/unbound orbits, radiation pressure/HAMR,
  J2 & sun-synchronous — a 3-D simulator with real RK4 integration of gravity + drag.
- **Module 5 — xGEO / Cislunar Space & Reference Frames** (complete): the Earth–Moon–Sun system,
  four reference frames (ECI / synodic / MCI / Moon-fixed) with a 2×2 compare view, Hill spheres
  & Lagrange points, the potential surface, xGEO defined, and "lead-the-Moon" lunar transfers.
- **Module 6 — Lagrange Points & Complex Orbits** (complete): the five Lagrange points
  (drawn as ▲ markers, with a 1-D force-balance view), near-rectilinear halo orbits (NRHO,
  à la CAPSTONE/Gateway), TESS's 2:1 orbital resonance, and a live **RK4 fan-release** chaos
  sandbox — including a lunar-scatter mode (transfer-orbit slingshots, some flung unbound).
- The **live simulators** (`tut1.html`–`tut6.html`) with matching camera/time controls.
- **Interactive worksheets** (shared engine): each opens beside its simulator with learning
  **objectives**, a one-page **tutorial** (analogy + diagram), and **numbered exercises** built on a
  **predict → act → analyze** loop — teaching prose, a "predict first" prompt, hands-on steps that
  invite iteration, things to look for, reflection questions, then a check question — ending with a
  **final quiz**, **key-points summary**, and **resources**. Progress saves to the server, or — with
  no server — to the browser (**standalone mode**, so the static files run anywhere).
- A printable **controls cheat sheet** (`cheatsheet.html`) and a **resources index** by module
  (`resources.html`), linked from every worksheet and the hub.
- **Backend** (`server.js`, optional): accounts, login/sessions, per-task progress, prerequisite
  gating, instructor dashboard. Zero dependencies.

Modules 7–8 (lunar transfers & Artemis; observability) are
planned — see `docs/MODULE_NOTES.md`. **Instructors:** see `docs/INSTRUCTOR_GUIDE.md` for
download, install, hosting options, and teaching notes. (Note: standard GitHub Pages is
world-readable even for a private repo — for authorized-only access, have reviewers clone & run
locally, as above.)

## Run it

Requires **[Node.js](https://nodejs.org)** (any recent version; no packages to install).

```bash
cd academy
node server.js          # -> http://localhost:8080
```

- Open **http://localhost:8080**, register (the **first account becomes the instructor**),
  then start Module 1. The worksheet opens in its own window; keep the simulator beside it.
- Change the port with `PORT=9000 node server.js`.

> **No server?** The worksheets and simulators are static files and also run with no backend at
> all (opened locally, or served by any static host). In that **standalone mode** there are no
> logins — progress saves in the browser. Run the server (above) for central accounts, saved
> progress across devices, prerequisite gating, and the instructor roster. See
> `docs/INSTRUCTOR_GUIDE.md` for all three hosting options.

## Architecture

- **Fat client, thin server.** All physics/rendering/UI runs in the browser (Three.js from CDN,
  SRI-pinned). The server only does static files + auth + progress + prerequisites (~250 lines,
  zero dependencies).
- **Data store:** `academy_data.json` — holds password hashes (scrypt) and progress.
  **Gitignored; never committed.**

## Files

- `server.js` — backend (auth, progress, gating, roster)
- `public/index.html` — the Academy hub (login, flight-path map, instructor dashboard)
- `public/worksheetN.html` + `worksheetN.data.js` — each module's worksheet (shell + content)
- `public/worksheet-engine.js` / `.css` — the shared worksheet engine used by all modules
- `public/tutN.html` — the module simulators
- `public/cheatsheet.html` — printable controls wallet card
- `public/resources.html` — external-resources index, by module
- `public/quiz.js` — tutorial registry
- `docs/` — `INSTRUCTOR_GUIDE.md`, `SECURITY.md` (audit log), `CHANGELOG.md`, `TESTING.md`, `MODULE_NOTES.md`

## Tests

```bash
bash test/run.sh   # 34 functional + 22 security checks + DoS guard, isolated data file
```
See `docs/TESTING.md`. Zero dependencies; run before every release.

## Security

Each release passes a security audit (see `docs/SECURITY.md`). v1.0–v2.4: **PASS** — path traversal
contained, auth enforced, no privilege escalation, prerequisite gating server-side, input
validated, DoS-guarded, no XSS, no secrets committed. All modules and the v2.x worksheet engine are
static client-side files (no new server surface). For internet-facing use, front it with HTTPS +
rate-limiting (see SECURITY.md "Accepted").

## License

MIT.
