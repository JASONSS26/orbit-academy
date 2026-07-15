# CLAUDE.md — project guide for Orbit Academy

Context for Claude Code (or any AI assistant) working on this repo.

## What this is
An interactive orbital-dynamics course for non-specialists (JASON / US Space Force training).
Live 3-D simulator + guided worksheets + quizzes + a course-management backend.

## Architecture (fat client, thin server)
- **`server.js`** — the ONLY server-side code: static files + auth + progress + prerequisite
  gating + instructor roster. Zero dependencies (Node built-ins: http, fs, path, crypto). ~250 lines.
- **`public/`** — everything else runs in the browser:
  - `index.html` — Academy hub (login, tutorial map, instructor dashboard).
  - `worksheet1.html` + `worksheet1.data.js` — Module 1 worksheet (content is data-driven).
  - `tut1.html` — Module 1 simulator (self-contained; Three.js from CDN, **SRI-pinned**).
  - `controls.html` — shared controls reference (link from every module).
  - `quiz.js` — tutorial registry (which module → which worksheet/tool).
- **`academy_data.json`** — user store (scrypt hashes + progress). **GITIGNORED. Never commit.**

## Physics you must not break
- Module 1 orbits are drawn as **analytic conics** from the injection state — NO numerical
  propagation, so zero integration drift. A marker animates via Kepler's equation.
- Everything runs on ONE time base (`TIMESCALE`); Earth's spin is locked to it so **GEO is
  genuinely geostationary** (a GEO sat holds station over its ground point). Don't desync these.
- Prograde = CCW from the North Pole (matches Earth's spin). Keep satellites + Earth consistent.

## Release workflow (every version)
1. Bump the version (server.js header, README, docs/CHANGELOG.md).
2. **Update ALL documentation — this is a definitive release gate, not optional.** Every version MUST
   reconcile: `README.md` (title version, "What's here" heading, the FULL module list incl. any newly
   built modules, security-audit version line, and remove stale "planned"/"in development" lines);
   `docs/CHANGELOG.md` (new dated entry); `docs/INSTRUCTOR_GUIDE.md` (module order + per-module status);
   `docs/MODULE_NOTES.md`, `docs/TODO.md`, `docs/SECURITY.md`. Then **grep the repo for the OLD version
   string and for stale status words** ("planned", "in development", "coming soon", removed feature/frame
   names) and fix every hit. A doc edit is NOT done until it is pushed — verify the rendered GitHub README.
3. Run the **security audit** in `docs/SECURITY.md` — this backend has a real auth surface
   (accounts, sessions, roles, progress writes). Test: path traversal, unauth access, priv-esc,
   session forgery, prereq bypass, input validation, DoS body-size, XSS, secrets.
4. **Only push if the audit passes.** Confirm `academy_data.json` is gitignored (has password hashes).

## Conventions
- Keep it dependency-free.
- Worksheets are data-driven (`*.data.js`): parts → tasks → each task has do/observe/quiz(+feedback).
  A correct quiz answer auto-completes the task; all tasks done = module complete (server-enforced).
- Escape user data (`esc()`) before any `innerHTML`. No eval / document.write.
- Adding a module: new worksheet + data + tool in `public/`, register it in `quiz.js`, add it to
  `COURSE` in `server.js` (with its prereq). See `docs/MODULE_NOTES.md` for planned modules 2–5.
