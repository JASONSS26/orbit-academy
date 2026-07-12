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
t1 passes → t2 unlocks → all tasks recorded → progress persists on resume → t3a locked before
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
- Latest result: **v2.2 — 34 functional + 22 security + DoS, all passing.**
