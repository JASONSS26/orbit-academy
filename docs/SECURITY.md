# Orbit Academy — Security Notes & Audit Log

Each release passes a security audit before it is pushed. This backend has a **real auth
surface** (accounts, password hashing, sessions, roles, progress writes), so the audit is
more involved than a static toy.

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
