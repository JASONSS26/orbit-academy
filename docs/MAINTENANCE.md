# Orbit Academy — Programmer's Maintenance Manual

For whoever maintains or extends this codebase. The Instructor's Guide covers *running and
teaching* the course; this covers *changing* it. Assumes basic JavaScript; no framework knowledge
needed (there are no frameworks).

---

## 1. Architecture in one paragraph

Fat client, thin server. `server.js` (~300 lines, **zero npm dependencies** — Node built-ins only)
does static files, accounts (scrypt), sessions, per-user progress, server-enforced prerequisite
gating, the instructor roster, and the worksheet-editor API. *Everything else* runs in the
browser: each module is a self-contained simulator page (`public/tutN.html`) plus a data-driven
worksheet (`public/worksheetN.html` + a `worksheetN.data.js` content file) rendered by one shared
engine (`public/worksheet-engine.js`). Worksheets work with **no server at all** (standalone mode:
progress in `localStorage`), so the static files run anywhere.

## 2. File map

| Path | What it is |
|---|---|
| `server.js` | The only server code. Static + auth + progress + gating + roster + editor API. |
| `public/index.html` | Academy hub: login, module map ("flight path"), certificate, instructor dashboard. |
| `public/quiz.js` | Pure registry: module id → `{worksheet, tool, blurb}`. No quiz content lives here. |
| `public/worksheet-engine.js` | Shared worksheet renderer: objectives → tutorial → exercises → final check. Saves via `/api/task`, falls back to localStorage. Quiz options shuffle at render. |
| `public/worksheetN.html` | Thin shell per module: sets `MODULE={id,title,tool,toolWindow}` then loads the data + engine. |
| `public/worksheetN.data.js` | The module's *content* (`const WORKSHEET={…}`). Served copy for **standalone mode only** — see §5. |
| `public/tutN.html` | The module's simulator. Self-contained; loads `vendor/three.min.js` (LOCAL — see §2.5) then `textures.js`. |
| `public/flight8.js`, `sat8.js` | Module 8's shared 2-D three-body flight model (planner and cockpit both use it) and the 3-D target satellite. |
| `public/worksheet-final.data.js`, `final.html` | Course-wide final quiz (different schema: `const EXAM=[…]`). |
| `public/gallery.html`, `guide.html`, `glossary.*`, `cheatsheet.html`, `controls.html`, `resources.html`, `editor.html` | Support pages. `guide.html` is the HTML rendering of `docs/INSTRUCTOR_GUIDE.md` — keep them in step. |
| `workbooks/active/*.data.js` | The **published** worksheet set the server actually serves (see §5). |
| `academy_data.json` | User store (password hashes + progress). **Gitignored — never commit.** |
| `slides/moduleN.pptx` | 8-slide intro lecture deck per module (see Instructor Guide §6). |
| `public/textures.js` | Planet-texture resolution for every sim + a loud banner if three.js is missing. See §2.5. |
| `public/vendor/` | Third-party + generated assets: `three.min.js` (fetched once), `textures/*_schematic.jpg` (committed). |
| `tools/fetch-vendor.sh` | Populates `public/vendor/` once, with a SHA-384 check. Also `--check` / `--cdn`. See §2.5. |
| `tools/make-textures.py` | Regenerates the committed schematic Earth/Moon maps (numpy + PIL, fixed seed). |
| `test/` | `run.sh` spins up a fresh server and runs functional + security + DoS + **air-gap** suites. Bash (Git Bash/WSL on Windows). |
| `test/no-external-calls.test.js` | Proves the client makes zero outbound calls (static + runtime). See §2.5. |
| `test/tut8-cockpit.verify.js` | Headless cockpit harness: flies both Module 8 missions to completion against DOM stubs. |
| `start-academy.bat` / `.command` | Double-click launchers with a Node-missing check. |

## 2.5 Third-party assets and the air-gap posture

**The course must install and run on a standalone, air-gapped machine.** That is a hard requirement
(US Space Force training use), not a nice-to-have, and it shapes the asset architecture.

**Default posture: local-first.** A running install makes **zero outbound network calls**. Two things
make that true:

1. **three.js loads from `public/vendor/three.min.js`** — a local path in all eight sims. It is the one
   file not committed (~600 KB of third-party minified JS), so `tools/fetch-vendor.sh` fetches it once
   and verifies it against the **published SHA-384** (the same hash the old CDN tags pinned); a
   mismatch aborts rather than installing an unverified library. If it is missing, `textures.js` paints
   an explanatory banner instead of leaving a blank canvas — the failure mode that used to look like
   broken physics.
2. **Planet textures resolve through `public/textures.js`**, first hit wins:

   | # | Source | Notes |
   |---|---|---|
   | 1 | `vendor/textures/earth_atmos_2048.jpg` | photographic, local. Placed by `fetch-vendor.sh`. |
   | 2 | the pinned CDN copy | **only if `ALLOW_CDN` is true — it defaults to `false`.** |
   | 3 | `vendor/textures/earth_schematic.jpg` | **committed to the repo.** Always available. |

   Step 3 is why the tree is self-contained out of the box. It is deliberately **schematic** — ocean
   blue, a 15 degree graticule, gold equator, dashed tropics/polar circles, green prime meridian — and
   *not* a fabricated photo: we have no coastline data offline, and inventing continents would put
   wrong geography in front of students. It is also pedagogically better for Modules 1-3: you can count
   meridians to see Earth rotate and read inclination off the grid. Regenerate with
   `python3 tools/make-textures.py` (numpy + PIL, fixed seed, so the output is reproducible).

**API for sim code** — never load a planet texture directly:

```js
OA_TEX.onto('earth', earthMat, 0x2b6fb5);   // usual case: put the map on a material
OA_TEX.load('moon', t => {…}, () => {…});   // when you need the THREE.Texture yourself
OA_TEX.image('earth');                      // an HTMLImageElement, for canvas pixel sampling (tut8)
OA_TEX.chain('earth');                      // the resolved URL list, honouring ALLOW_CDN
```

**`tools/fetch-vendor.sh`**

| Command | Effect |
|---|---|
| *(no args)* | Download into `public/vendor/`; verify the library hash. Run once, with network. |
| `--check` | Report what is present, the `ALLOW_CDN` value, and any outbound reference left in `public/`. |
| `--cdn` | Opt back in to the pinned CDNs. **Not for air-gapped use.** `--restore` is a synonym. |

**Air-gapped install:** run `fetch-vendor.sh` once on a networked machine, then copy or zip the whole
`academy` folder (with `public/vendor/`) to the target. No npm, no build step, no internet. Open
`public/index.html` directly, or run `node server.js` for the tracked/roster mode.

**Enforcement.** `node test/no-external-calls.test.js` (also part of `test/run.sh`) proves the property
in two independent passes: a **static** scan for fetchable constructs (`src=`, `<link href>`, `url()`,
`fetch()`, `XHR.open`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, `.src=`), and a
**runtime** pass that executes every sim's JavaScript against a DOM stub whose network primitives are
instrumented, failing on any absolute URL that reaches them. It deliberately does not flag URLs merely
*mentioned* in prose or in `<a href>` further-reading links (99 of those exist; inert until a human
clicks). The test was verified by injecting a CDN script tag, a `fetch()` and an `Image().src` and
confirming both passes caught all three.

## 3. Invariants — do not break these

- **The client makes no outbound network calls.** No CDN tags, no web fonts, no analytics, no `fetch()`
  to anything. Load assets from `public/vendor/` and textures via `OA_TEX` (2.5).
  `test/no-external-calls.test.js` fails the build if this slips. Module 1 once had an optional "paste
  your Anthropic API key" tutor that POSTed to `api.anthropic.com`; it was removed precisely because an
  air-gapped deployment should not even *contain* a field that could carry a credential off-box.

**Physics (see also CLAUDE.md):**
- Module 1 orbits are **analytic conics** from the injection state — no numerical propagation, so
  zero drift. The animated marker runs on Kepler's equation. Re-entering orbits are **clipped at
  the surface** (the flown arc, not the full ellipse) and the marker freezes at impact.
- One time base (`TIMESCALE`); Earth's spin is locked to it so GEO is *genuinely* geostationary.
- Prograde = CCW viewed from above the North Pole, matching Earth's spin, everywhere.
- Module 8's planner and cockpit share `flight8.js` — the path a student plans is *exactly* the
  path they fly. Never fork the physics. The lunar plan's go/no-go comes from `simulate()`
  (capture is a three-body outcome; there is no vis-viva shortcut — don't invent one).
- Module 8 cockpit conventions: pad thrust acts in the **local flight frame** (Earth-relative,
  Moon-relative inside its SOI — inertial-frame retro burns near the Moon mostly *rotate* the
  lunar orbit instead of braking it); the lunar profile is **three cued burns** (TLI → LOI →
  circularize); 🤖 AUTO FLY drives the very same press-and-hold machinery as the pilot, so every
  gauge and CAPCOM call behaves identically under autopilot — keep it that way; every mission
  pre-coasts one full parking lap (`F7.PRE_COAST`) before burn 1, with the Moon phase compensated
  so burn-time geometry matches the planner.
- Hard language rule in cislunar modules: never "centrifugal"/"centripetal"; explain with real
  gravity + sideways motion.

**Security:**
- Prereqs, completion, and roles are enforced **server-side**; anything the client sends is
  untrusted. localStorage flags (e.g. the lunar-mission unlock) may gate *UI convenience* only.
- Escape user data (`esc()`) before any `innerHTML`. No `eval`/`document.write` in course pages
  (the server's `vm` sandbox for worksheet validation is the one deliberate exception).
- External scripts only from the pinned CDN, always with `integrity` + `crossorigin` (copy tut1's
  Three.js tag). Zero npm dependencies — keep it that way.

## 4. Data schemas

**Worksheet** (`worksheetN.data.js`, and what the editor round-trips):
```
const WORKSHEET = {
  objectives: [html, …],
  tutorial:   [html | {h:'heading'} | {analogy:html} | {figure:svg, caption:html}, …],
  elements?:  {title, blurb, cols?, rows:[{name,meaning,tool}], foot?},   // optional table
  parts:      [{title, blurb?, tasks:[taskId,…]}, …],                     // ids must exist in tasks[]
  tasks:      [{id, title, teach?, body?, predict?, do?, observe?, think?, quiz?}, …],
  summary:    [html,…],  resources:[{t,u,note?},…],
  exam:       [{q, opts:[…], a, why, feedback:[…], multi?, whyWrong?}, …],
};
```
Rules the engine and server assume: every `parts[].tasks` id exists; each quiz's `feedback` array
aligns 1:1 with `opts` with `''` at index `a`; `do` and `teach` accept string or array. A task
with no quiz gets a "mark done" button. Module completion = all task ids + `exam0…examN` done
(server counts via `totalTasks`). **Options are shuffled at render** — never write an option that
refers to another option's position ("all of the above").

**Registry & course:** `public/quiz.js` maps `tN → {worksheet, tool, blurb}`; `COURSE` in
`server.js` maps `tN → {title, prereq}`. Both must list every module; titles should match the
worksheet header (they're shown side by side on the hub).

**Progress record** (`academy_data.json`): `users[id].progress[tN] = {tasks:{taskId:{done,attempts,when}}, passed, score, when}`.

## 5. The two copies of worksheet content — read this twice

Worksheet data exists in **two places**:

- `workbooks/active/*.data.js` — the set the **server serves** (route `/worksheetN.data.js`) and
  the **only** set the instructor editor reads/writes. Editor saves are sandbox-validated,
  written atomically, and snapshot a timestamped `.bak` beside the file. Saves re-serialize to
  `const WORKSHEET = <json>;` — code comments in hand-written files don't survive an editor save.
- `public/*.data.js` — used **only** in standalone/no-server mode (file:// or static hosting).

They start identical; they drift the moment either side changes. **Whoever edits one syncs the
other** — after hand-editing: `cp public/worksheet*.data.js workbooks/active/`; after instructor
edits you want in the standalone build: copy the other way. The release checklist (§7) includes
this sync.

## 6. How to add a module

1. Build the simulator `public/tut9.html` (self-contained; copy an existing tut's header/controls
   conventions; pin any CDN script).
2. Write `public/worksheet9.data.js` to the §4 schema and a `worksheet9.html` shell (copy
   worksheet8.html, change `MODULE` + title).
3. Register it: `quiz.js` (`t9` entry) and `COURSE` in `server.js` (`{id:'t9', title, prereq:['t8']}`).
4. Add the id to `WB_IDS` in `server.js` and copy the data file into `workbooks/active/`.
5. Supporting material: glossary terms (`glossary.data.js`, correct `mod:` tag), cheat-sheet row
   if it has new controls, resources page, Instructor Guide §6 entry (goals + lecture outline),
   an 8-slide deck in `slides/`, README module list.
6. Hub cosmetics: `ROMAN` array in `index.html` and the certificate text if the module count grew.
7. Run §7.

## 6.5 Verification rules (learned the hard way)

> **Running the Module 6 fan suite:** it takes ~40 s **per mode** and is *not* part of `run.sh`. The
> first argument is the HTML file, the second the mode — getting that wrong makes it exit instantly
> with a file-read error that is easy to mistake for a pass:
> ```bash
> node test/tut6-physics.verify.js public/tut6.html scatter    # then l1knife, tadpole, dro, freeret
> ```
> Each mode prints its seven objects and ends with `PASS (mode)`. Expected figures are in
> `docs/SECURITY.md` under the v5.0 audit.


- **Verify by EXECUTING the shipped code, never by re-implementing it.** Extract the actual
  functions from the page (regex-slice the `<script>` and `eval` with stubs) and drive those.
  A re-implementation silently fixes the very bugs it is supposed to detect: the tut6 fan's RK4
  passed stage times mixing a days-clock with a seconds-step (`fanAcc(t+h/2)` with t in days,
  h in seconds — the mid/end stages sampled the Moon 1–2 *days* ahead), and a hand-rewritten
  harness "verified the physics sound" because its author instinctively wrote `h/2/86400`.
  The page and the harness were running different physics; only looking at the screen caught it.
- **Declare each integrator's time units in one comment at its definition** and grep any file
  that mixes a days-clock (`moonPos(tDays)`) with a seconds-step for raw `t+h` stage times.
  Current inventory: `flight8.js` all-seconds ✓ · tut4 static field (no t) ✓ · tut5 TLI analytic ✓
  · tut6 fan t=days/h=seconds, stages use `h/86400` ✓.
- A "physics verified" claim in a commit or changelog must name WHAT was executed (shipped file
  vs. harness). If it wasn't the shipped file, it isn't verification.

## 7. Release checklist (the QA-walkthrough distillation)

1. Bump the version: `server.js` header, `README.md` (title + "What's here" + security line),
   `docs/CHANGELOG.md` (dated entry).
2. **Worksheet↔simulator drift check** — the single highest-yield step. For each module, grep
   every control name, button label, preset, scenario, frame name, and key the worksheet mentions
   against the tut file. The v3.0 QA pass found ~50 issues and almost all were this class.
3. Numbers audit: any physical number stated in a worksheet must match the sim and the other
   modules (escape speeds carry an altitude; L-point percentages; period/ratio claims).
4. Sync the two worksheet copies (§5) — `diff -rq public workbooks/active` on the data files.
5. Stale-string grep: the OLD version string, "coming soon", "in development", "planned", removed
   feature/frame names, and the module count ("all eight").
6. Repo hygiene: no `* 2.*` Finder duplicates, `academy_data.json*` still gitignored
   (`git check-ignore academy_data.json`).
7. `bash test/run.sh` — functional + security + DoS must all pass.
8. Security audit per `docs/SECURITY.md` and **log the entry** (v2.6 shipped without one; don't
   repeat that). Only push on PASS, then verify the rendered README on GitHub.
9. Docs that must stay reconciled: `README`, `CHANGELOG`, `INSTRUCTOR_GUIDE` (+ regenerate
   `public/guide.html` from it), `MODULE_NOTES`, `TODO`, `SECURITY`, this file.

## 8. Debugging & tools

- **`?dev=1`** on tut8: calibration overlay (`C`), burn-light test (`B`), state HUD, and it
  bypasses the lunar-mission unlock.
- **Standalone mode** is the fastest way to iterate on worksheet content: open the worksheet
  file directly, no login. The "● standalone" badge confirms which mode you're in.
- **Editor recovery:** every save leaves `workbooks/active/worksheetN.data.<stamp>.bak`; rename
  one back over the `.data.js` to roll back. The server also keeps `academy_data.json.bak`
  (rolling) and recovers from it automatically if the primary is corrupt.
- **Syntax-check everything headlessly:** `node --check` works on every `.js` and `.data.js`;
  the inline scripts in tut pages can be extracted and checked the same way. `flight8.js` runs
  in plain node (`globalThis.FLIGHT7`) — regression-test plans against `simulate()` directly.
- **Port conflicts:** the server prints platform-appropriate commands on `EADDRINUSE`.

## 9. Known warts (accepted, documented)

- Module 8's internal names (`FLIGHT7`, `Sat7`, `m7plan`, `m7_tour`, `m7_geo_done`) predate the
  module renumbering. Renaming would orphan users' saved plans/tour state for zero user-visible
  gain; leave them (comments in the files say so).
- `final.html` reveals the correct answer on any pick and scores the settled answer (mastery
  model); its copy says so. Don't "fix" it into a blind exam without a course-design decision.
- tut7's radar scope compresses the true ~69 dB spread to fit the display; the lede discloses it.
- The sims idealize deliberately: Module 5 draws the Moon's orbit flat in the ecliptic; tut5 pins
  Earth and swings the barycenter *marker*. The worksheets teach the truth and say what the sim
  simplifies — keep that honesty contract when changing either side.
