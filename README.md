# 🛰 ORBIT ACADEMY — v1.0

An interactive course that teaches orbital dynamics to non-specialists — from "what is an orbit?"
through cislunar space — using a live 3-D simulator, guided worksheets, quizzes, and a real
course-management backend (accounts, prerequisite gating, progress tracking, instructor roster).

Built for JASON / US Space Force technical-staff training. Companion to the CISLUNAR PATROL game
and the xGEO simulator.

## What's here (v1.0)

- **Module 1 — How Orbits Work** (complete): circular/elliptical orbits, speed-vs-altitude,
  prograde/retrograde, geosynchronous vs. geostationary, inclination, launch geography.
- The **live simulator** (`tut1.html`): real two-body physics (analytic conics, no numerical
  drift), to-scale Earth, ISS/Starlink/GPS/GEO constellations, inject-your-own-object, GEO-lock demo.
- An **interactive worksheet** (`worksheet1.html`) that opens beside the simulator: 11 tasks in a
  logical sequence, each with a check question and demo-specific remediation; progress saves as you go.
- A shared **controls reference** (`controls.html`) linked from every module.
- **Backend** (`server.js`): accounts, login/sessions, per-task progress, prerequisite gating,
  instructor dashboard. Zero dependencies.

Modules 2–5 (angular rates/geosync split-view, TLEs & orbit regimes, maneuvers & perturbations,
observability, xGEO) are planned — see `docs/MODULE_NOTES.md`.

## Run it

Requires **[Node.js](https://nodejs.org)** (any recent version; no packages to install).

```bash
cd academy
node server.js          # -> http://localhost:8080
```

- Open **http://localhost:8080**, register (the **first account becomes the instructor**),
  then start Module 1. The worksheet opens in its own window; keep the simulator beside it.
- Change the port with `PORT=9000 node server.js`.

> The simulator pages (`tut1.html`, `controls.html`) also open standalone, but the worksheet and
> progress tracking require the server + a login.

## Architecture

- **Fat client, thin server.** All physics/rendering/UI runs in the browser (Three.js from CDN,
  SRI-pinned). The server only does static files + auth + progress + prerequisites (~250 lines,
  zero dependencies).
- **Data store:** `academy_data.json` — holds password hashes (scrypt) and progress.
  **Gitignored; never committed.**

## Files

- `server.js` — backend (auth, progress, gating, roster)
- `public/index.html` — the Academy hub (login, flight-path map, instructor dashboard)
- `public/worksheet1.html` + `worksheet1.data.js` — Module 1 interactive worksheet
- `public/tut1.html` — the Module 1 simulator
- `public/controls.html` — shared controls reference
- `public/quiz.js` — tutorial registry
- `docs/` — `SECURITY.md` (audit log), `CHANGELOG.md`, `MODULE_NOTES.md`

## Tests

```bash
bash test/run.sh   # 18 functional + 22 security checks + DoS guard, isolated data file
```
See `docs/TESTING.md`. Zero dependencies; run before every release.

## Security

Each release passes a security audit (see `docs/SECURITY.md`). v1.0: **PASS** — path traversal
contained, auth enforced, no privilege escalation, prerequisite gating server-side, input
validated, DoS-guarded, no XSS, no secrets committed. For internet-facing use, front it with
HTTPS + rate-limiting (see SECURITY.md "Accepted").

## License

MIT.
