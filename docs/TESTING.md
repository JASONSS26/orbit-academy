# Testing — Orbit Academy

Two zero-dependency suites plus a DoS check, wrapped in one runner. Run before every release
(part of the workflow in `CLAUDE.md`).

## Run everything

```bash
bash test/run.sh
```

This starts a **fresh server on an isolated temp data file** for each suite (so tests never
touch real user data, and "first user = instructor" holds), runs both suites, checks the DoS
body-size guard, and prints `ALL SUITES PASSED ✅` on success (non-zero exit on failure).

## What's covered

**`test/functional.test.js` (28 checks)** — every page loads (incl. Modules 3 & 4 tools and
worksheets); register → 6-module course → t1 unlocked/t2 locked → complete 11 worksheet tasks →
t1 passes → t2 unlocks → all tasks recorded → progress persists on resume → t3 locked before
t2 / unlocked after → partial progress saved → instructor roster lists users and pass state →
logout+login round-trip.

**`test/security.test.js` (22 checks)** — path traversal (source never served); all protected
endpoints reject no-session; first-user-instructor / no self-assigned role / student denied
roster (priv-esc); forged session rejected; prerequisite bypass blocked on `/complete` and
`/task`; score clamping; weak-password / duplicate-email / bad-email / wrong-password /
malformed-JSON rejection; logout invalidates the session.

**DoS (in `run.sh`)** — a 300 KB request body is dropped and the server stays healthy.

## Notes
- Isolated via the `ORBIT_DATA` env var (server reads its data path from it).
- Default test port is 8099 (override with `PORT=...`).
- Latest result: **v2.3 — 34 functional + 22 security + DoS, all passing.**

## Air-gap suite — `test/no-external-calls.test.js`

Proves the client makes **no outbound network calls**, which is a hard requirement for the standalone /
air-gapped deployments this course targets. Part of `test/run.sh`; also runnable alone (no server
needed). Two independent passes:

1. **Static** — scans every shipped `.html`/`.js`/`.css` for constructs a browser will actually fetch:
   `src=`, `<link href>`, css `url()`, `fetch()`, `XHR.open`, `WebSocket`, `EventSource`, `sendBeacon`,
   `importScripts`, `.src=`. Also asserts three.js loads from a local path in all eight sims, that
   `textures.js` defaults to `ALLOW_CDN = false`, and that the schematic texture fallbacks are
   committed. It deliberately does **not** flag URLs merely mentioned in prose or in `<a href>`
   further-reading links — a test that cries wolf is one people learn to ignore.
2. **Runtime** — executes each simulator's JavaScript against a DOM/THREE stub whose network
   primitives are instrumented, and fails on any absolute URL that reaches them. This catches URLs
   assembled at run time, which a static scan cannot see.

Expected output ends with `PASSED — the course makes no outbound network calls. Air-gap clean.`

To confirm the test still has teeth, inject a violation and watch it fail:

```bash
# temporary: add a CDN script tag / fetch() / Image().src to any public/tutN.html, run the test,
# then revert. Both passes should report it.
```

## Module 8 cockpit harness — `test/tut8-cockpit.verify.js`

Boots the real `tut8.html` script against DOM stubs, loads a plan through the real planner path,
engages AUTO FLY, and flies **both** missions frame-by-frame to completion (17 assertions: rendezvous
achieved, three lunar burns, Δv within tolerance of the reference, frame stability, loiter offered).
It exists because the render loop wraps everything in `try/catch`, so a thrown error silently blanks
the instruments — the harness surfaces those, plus autopilot pathologies that only appear over a whole
flight. Two fidelity rules: one shared clock (rAF timestamps and `performance.now()`), and open the
planner *before* solving.
