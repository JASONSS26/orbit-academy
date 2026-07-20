# Orbit Academy — Security Notes & Audit Log

Each release passes a security audit before it is pushed. This backend has a **real auth
surface** (accounts, password hashing, sessions, roles, progress writes), so the audit is
more involved than a static toy.

## v3.0 — audit result: **PASS**
The v3.0 change set is overwhelmingly **client content** (worksheet data, tut HTML/JS, docs): the
QA-walkthrough fixes, the Module 8 lunar-mission enablement, instructor materials (decks, docs,
launchers), and Module 1's surface-clipped re-entry arcs. `server.js` changed in three strings —
the version header, the `t1` course title, and a friendlier port-in-use message — with **zero
changes** to auth, sessions, roles, gating, body-size limits, path handling, or the workbook
editor. The new launcher scripts (`start-academy.bat`/`.command`) only check for node, open a
localhost URL, and run `node server.js` — no privileged operations, nothing downloaded. New
client surface reviewed: tut8 now loads Three.js from cdnjs **SRI-pinned** (same tag as tut1); the lunar
unlock is a cosmetic localStorage flag (`m7_geo_done`) — it gates only a planner button, and module
completion remains server-enforced, so "unlocking" it by hand grants nothing. Quiz-option
shuffling is render-side only; answer keys never leave the data files (unchanged posture).
Full test suite re-run this date: **functional + security + DoS body-size — 30+ checks, all
passing** (`test/run.sh`). `academy_data.json` confirmed gitignored (verified with
`git check-ignore`). Cleared to ship v3.0.

**Process note:** v2.6 shipped without a logged entry here (caught by the v3.0 QA walkthrough —
finding #64). The v2.6 change set was client/docs-only plus the COURSE reordering; this v3.0 audit
covers the cumulative state. The release checklist gate stands: no push without a logged PASS.

## v2.5 — audit result: **PASS**
The v2.5 change set is **client + docs only**: the Module 6 simulator (`tut6.html`) gained a libration-
zoo scenario and physics fixes, the worksheet (`worksheet6.data.js`) gained a Part E capstone + exam
questions, and docs were updated (`CHANGELOG`, `README`, new `TODO.md`). **`server.js` has a zero
diff** — no change to accounts, sessions, roles, prereq gating, input handling, or DoS guards. The new
simulator code is self-contained, Three.js from the SRI-pinned CDN, no network calls, no untrusted-
data DOM sinks (all worksheet content is trusted-author HTML through the already-audited engine). Re-
ran the full suite on fresh isolated servers — **34 functional + 22 security checks + DoS guard, all
passing**. `academy_data.json` confirmed gitignored. Cleared to ship v2.5.

## v2.4 — audit result: **PASS**
The v2.4 change set is **Module 6** (three new client files — `tut6.html`, `worksheet6.html`,
`worksheet6.data.js`), Module 4/5 worksheet content edits, and **one small `server.js` change**: an
`'error'` handler that exits cleanly on `EADDRINUSE` (port already in use). That handler touches no
request path, auth, session, role, or input logic — the entire auth/gating/DoS surface is unchanged.
Module 6 is static client-side files rendered by the already-audited worksheet engine through the
same trusted-author HTML path used since v1.0; its simulator (`tut6.html`) is self-contained with
Three.js from the SRI-pinned CDN, no network calls, no untrusted-data DOM sinks. `t6` was added to
`COURSE` (server-side prereq chain) — exercised by the suite (course length now 8, prereq gating
green). Re-ran the full suite on fresh isolated servers — **34 functional + 22 security checks + DoS
guard, all passing**. `academy_data.json` confirmed gitignored. Cleared to ship v2.4.

## v2.3 — audit result: **PASS** (re-run)
The v2.3 change set is **four worksheet data files** (`worksheet2/3a/4/5.data.js`) only — enriched
author-authored exercise content (`teach`/`predict`/`think`/`do` prose), rendered by the already-
audited engine through the same trusted-author HTML path used since v1.0. **`server.js` has a zero
diff**, so the entire auth/gating/DoS surface is unchanged. No new files, endpoints, inputs, user
or network data, or DOM sinks fed by untrusted data. Re-ran the full suite — **34 functional + 22
security checks + DoS guard, all passing**. `academy_data.json` confirmed gitignored. Cleared to
ship v2.3.

## v2.2 — audit result: **PASS** (re-run)
Client-side only; **`server.js` has a zero diff** from v2.1, so the audited auth/gating/DoS surface
is unchanged and re-verified by the suite. Reviewed the touched files:
- **`resources.html`** — now `fetch`es the same-origin `worksheetN.data.js` files and runs each via
  `Function(text)` to read its `resources` array. This evaluates **same-origin, author-authored**
  code — the same trust boundary as the `<script src>` it replaced — with no user input and no
  cross-origin fetch. (An attacker who could alter those files could already alter the site.)
- **`worksheet-engine.js`** — added rendering of the new `teach`/`predict`/`think`/`do` fields, all
  author-authored worksheet content rendered as HTML by design (unchanged trusted-author model).
  The only dynamic value, `ME.name`/`ME.role`, is still `esc()`-escaped before DOM insertion.
- **`worksheet-engine.css` / `worksheet1.data.js`** — styling and author content only.
No new endpoints, secrets, external calls, or user-input sinks. Re-ran the full suite — **34
functional + 22 security checks + DoS guard, all passing**. `academy_data.json` confirmed
gitignored. Cleared to ship v2.2.

## v2.1 — audit result: **PASS** (re-run)
v2.1 is client-side only; **`server.js` has a zero diff** from v2.0, so the audited auth/gating/DoS
surface is unchanged and re-verified by the suite. Reviewed the touched files:
- **`tut1.html`** — physics/rendering fixes (hyperbolic Kepler propagation, frustum-culling flags,
  removed the velocity-arrow checkbox). No new inputs, network calls, or injection of untrusted
  data into the DOM.
- **`gallery.html`** — a new static page of same-origin links (`worksheetN.html`, `tutN.html`) with
  no user input and no `innerHTML` of external data.
- **`worksheet-engine.js` / `resources.html`** — the only change was replacing absolute paths
  (`'/'`, `href="/"`) with relative ones (`index.html`); no security impact.
- Worksheet content (`worksheet1.data.js`) is author-authored, rendered through the existing
  `esc()`-based engine (user/server data still escaped).
No new endpoints, secrets, or external calls. Re-ran the full suite — **34 functional + 22 security
checks + DoS guard, all passing**. `academy_data.json` confirmed gitignored. Cleared to ship v2.1.

## v2.0 — audit result: **PASS** (re-run)
The v2.0 worksheet overhaul is entirely **client-side**; `server.js` has a **zero diff** from
v1.3, so the audited auth surface (path traversal, sessions, roles/priv-esc, prerequisite gating,
DoS body cap, input validation, timing-safe password compare) is unchanged and re-verified by the
suite. Reviewed the new client code:
- **XSS:** the only non-author data rendered is `ME.name`/`ME.role` (server-held, set by the user
  at registration) — both are `esc()`-escaped before `innerHTML` in `worksheet-engine.js`. Quiz
  question/option/feedback text is also `esc()`-escaped (defense in depth). Author-written
  worksheet content (objectives/tutorial/inline SVG/exercises) is intentionally rendered as HTML,
  the same trusted-author model used since v1.0.
- **Standalone/localStorage:** stores only booleans keyed by author-defined task IDs, read back via
  `JSON.parse` in a `try/catch`, and used only as truthy completion flags — never re-inserted into
  the DOM. No injection path, no secrets stored. Note that standalone mode has **no server-side
  gating** by design (it's for open/self-study); tracked cohorts must run the server.
- **resources.html:** loads same-origin, author-authored `worksheetN.data.js` as `<script>`; no
  user input is involved.
- **cheatsheet.html / instructor guide:** static content, no inputs.
No new endpoints, secrets, or external calls (Three.js remains the same SRI-pinned CDN build).
Re-ran the full suite — **34 functional + 22 security checks + DoS guard, all passing**
(`bash test/run.sh`). `academy_data.json` confirmed gitignored. Cleared to ship v2.0.

## v1.3 — audit result: **PASS** (re-run)
Module 5 and the Module 2 rebalance added **no new server attack surface**: everything new is
static client-side files (`tut5.html`, `worksheet5.*`, and the inert `worksheet6.data.js` seed),
rendered in the browser through the existing `esc()`-based renderer and using only the already-
audited `/api/task` and `/api/complete` endpoints. The course expansion to 8 modules
(t6/t7/t8 added) is a `COURSE`-array change only — `unlocked()` gating logic is unchanged and
still walks the prereq chain. Three.js remains the same SRI-pinned CDN build; the new tool loads
the moon texture from the same pinned `cdn.jsdelivr.net/gh/mrdoob/three.js@r128` path. No new
endpoints, secrets, or external calls; new worksheet text is static (no user input interpolated
into HTML). Re-ran the full suite — **34 functional + 22 security checks + DoS guard, all
passing** (`bash test/run.sh`). Confirmed `academy_data.json` remains gitignored. Cleared to ship v1.3.

## v1.2 — audit result: **PASS** (re-run)
Modules 3 and 4 added **no new server attack surface**: both are static client-side files
(`tut3a.html`, `tut4.html`, and their worksheets/data), rendered in the browser and using only
the existing, already-audited `/api/task` and `/api/complete` endpoints (prerequisite gating and
score clamping enforced server-side). The course re-order (Maneuvers → Module 4; xGEO → 5;
Observability → 6) is a `COURSE`-array change only — the gating logic (`unlocked()`) is unchanged
and still walks the prereq chain. Reviewed: new worksheet data is static text rendered through the
existing `esc()`-based renderer (no new HTML injected from user input); Three.js remains the same
SRI-pinned CDN build; no new endpoints, secrets, or external calls. Updated the stale `/complete`
prereq-bypass test (it referenced the removed `t3b` id) to target `t4`; re-ran the full suite —
**28 functional + 22 security checks + DoS guard, all passing** (`bash test/run.sh`).
Cleared to ship v1.2.

## v1.1 — audit result: **PASS** (re-run)
Module 2 added **no new server attack surface**: it's all client-side rendering plus the
existing, already-audited `/api/task` endpoint (which enforces prerequisites and score clamping
server-side). Re-ran the full suite — **25 functional + 22 security checks + DoS guard, all
passing** (`bash test/run.sh`). Durability changes reviewed: atomic temp-file writes + rolling
`.bak` (no new external input; the `.bak`/`.tmp` files are gitignored alongside the data file).
The optional bring-your-own Claude key remains browser-only (never sent to this server). No
new secrets, no new endpoints, no XSS sinks introduced (new user-facing text is static/escaped).
Cleared to ship v1.1.


## Threat model

- Small-cohort training tool, run on a trusted machine/LAN or a modestly-hosted instance.
- Holds: user names/emails, **scrypt password hashes**, per-user progress. No payment data,
  no PII beyond name/email.
- First registered account becomes the **instructor** (sees the roster); everyone else is a student.
- Store: single JSON file (`academy_data.json`) — **gitignored, never committed**.

## Audit checklist (run every version)

| Area | Check | Method |
|------|-------|--------|
| Path traversal | can any request read files outside `public/`? | live requests + canary files above web root |
| AuthN | are protected endpoints unreachable without a session? | unauth requests to /me,/roster,/complete,/task |
| AuthZ / priv-esc | can a student reach instructor-only data or self-assign a role? | student hits /roster; register with role field |
| Session integrity | forged/garbage cookies rejected; logout invalidates | crafted sid; logout then reuse |
| Prerequisite bypass | can the client complete a locked module? | student POSTs locked tutorial to /complete & /task |
| Input validation | score clamped; weak pw / dup email / bad email rejected | boundary POSTs |
| DoS | oversized request body doesn't crash the server | 300 KB body, then health check |
| Client XSS | user data escaped before hitting the DOM | grep innerHTML sinks + esc() coverage |
| Secrets | no keys/tokens committed; data file gitignored | repo-wide grep |
| Supply chain | external scripts integrity-pinned | Three.js SRI (in tut1.html) |

## v1.0 — audit result: **PASS**

**Verified safe (all tested live):**
- **Path traversal — contained.** `path.normalize` + a `startsWith(ROOT + sep)` guard reject every
  `../`, encoded, and absolute variant (all 404). Canary files placed above `public/` were never served.
- **Authentication enforced.** `/api/me` (401), `/api/roster` (403), `/api/complete` (401), `/api/task`
  (401) all reject requests with no session.
- **No privilege escalation.** A student is denied `/api/roster` (403). Sending `role:"instructor"`
  in the register body is ignored — role is assigned server-side (first user only = instructor).
- **Session integrity.** Forged/garbage `sid` cookies → 401. Logout deletes the session server-side;
  reusing the old cookie → 401.
- **Prerequisite gating is server-side.** A student cannot `/complete` or `/task` a locked module
  (403) — the client cannot unlock ahead by tampering.
- **Input validation.** Scores clamped to 0–100; weak password (<8), duplicate email, and malformed
  email all rejected. Passwords hashed with **scrypt** + per-user random salt; compared with
  `timingSafeEqual` (constant-time).
- **DoS guard.** Request bodies over 100 KB are dropped (`req.destroy()`); the server stays alive
  and keeps serving normal requests (verified with a 300 KB body).
- **No client XSS.** Every `innerHTML` write of user-controlled data (`ME.name`) is wrapped in
  `esc()`. No `eval` / `new Function(userdata)` / `document.write`.
- **No secrets committed.** `academy_data.json` (password hashes) is **gitignored**. The only
  "key" in the client is the optional bring-your-own Anthropic key for the AI tutor, held solely
  in the user's browser tab and never transmitted to this server or stored.

**Accepted (documented, consistent with the trusted-cohort threat model):**
- **No HTTPS / rate-limiting / CSRF token in this build.** Session cookies are `HttpOnly` +
  `SameSite=Strict` (mitigates CSRF and JS cookie theft), but there is no TLS or per-IP throttling.
  *For any internet-facing deployment: put it behind an HTTPS reverse proxy, add rate-limiting on
  `/api/login` and `/api/register`, and consider account-lockout on repeated failures.*
- **JSON-file store** is fine for a cohort; not concurrent-write-safe at scale. Move to a real DB
  if usage grows.

**Net:** no confidentiality/integrity/priv-esc/code-exec issues for the intended use. Cleared to ship v1.0.
