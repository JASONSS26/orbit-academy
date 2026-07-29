# 🛰 ORBIT ACADEMY — v5.0

An interactive course that teaches orbital dynamics to non-specialists — from "what is an orbit?"
through cislunar space — using a live 3-D simulator, guided worksheets, quizzes, and a real
course-management backend (accounts, prerequisite gating, progress tracking, instructor roster).

Built for JASON / US Space Force technical-staff training. Companion to the CISLUNAR PATROL game
and the xGEO simulator.

**Runs fully offline.** The course makes **zero outbound network calls** — no CDNs, no fonts, no
telemetry — so it installs and runs on standalone / air-gapped machines. One preparation step on a
networked machine (`bash tools/fetch-vendor.sh`) puts the 3-D library inside the folder; after that
copy it anywhere. Verify any time with `node test/no-external-calls.test.js`.

## Requirements

Deliberately minimal. **No `npm install`, no build step, no database, and no internet at run time.**

### To run the course (what students and instructors need)

| Need | Version / notes | Required for |
|---|---|---|
| **A modern browser with WebGL** | Chrome, Edge, Firefox or Safari, last ~3 years. Hardware acceleration on. | Everything. The simulators are 3-D. |
| **three.js r128** | ~600 KB, held in `public/vendor/`. Not in the repo — fetch once (below). | The 8 simulators. |
| **Node.js** — LTS (18+; tested on 22) | One ~50 MB install from <https://nodejs.org>. Uses **only Node built-ins** — nothing to install with it, ever. | *Only* the tracked mode: accounts, saved progress, prerequisite gating, instructor roster. |

Node is **optional**. Without it, open `public/index.html` and the whole course works, saving progress
in that browser (`localStorage`). Node adds central accounts and the roster.

### One-time preparation (needs internet, once)

```bash
cd academy
bash tools/fetch-vendor.sh      # downloads three.js into public/vendor/, verifies its SHA-384
```

Windows: run it from **Git Bash** or **WSL**, or download `three.min.js` (r128) by hand into
`academy/public/vendor/`. After this the folder is self-contained — copy it to any machine, including
one that has never seen the internet.

### Developer-only extras (not needed to run or teach the course)

| Need | Used by |
|---|---|
| **bash** + `curl` or `wget` | `tools/fetch-vendor.sh`, `test/run.sh` (Git Bash/WSL on Windows) |
| **openssl** | the checksum verification in `fetch-vendor.sh` (skipped with a warning if absent) |
| **Python 3** + `numpy`, `Pillow` | `tools/make-textures.py`, only to regenerate the committed schematic maps |
| **python-pptx** | only to edit the `slides/*.pptx` decks programmatically |

### Explicitly NOT required

No npm packages · no bundler/transpiler · no database server · no Docker · no internet access while
running · no GPU beyond what the browser already uses · no admin rights (except installing Node, if
you want the tracked mode).

### Platforms

Windows, macOS and Linux, identically — `server.js` is plain Node with no OS-specific code. The only
bash pieces are the developer test suite and `fetch-vendor.sh`.

## 🍎 macOS — step by step

Tested on macOS 13–15, Intel and Apple Silicon (the M-series chips need nothing special — Node ships
a native arm64 build). Nothing needs admin rights except the optional Node install.

### A. Get the course onto the Mac

1. Download the ZIP from GitHub (green **`<> Code`** → **Download ZIP**), or copy the `academy` folder
   from a USB stick / share.
2. Double-click the `.zip` in Finder — macOS unzips it in place. Inside is an **`academy`** folder:
   that is the whole course.
3. Move it somewhere simple, e.g. `~/academy` (your home folder). Avoid a folder synced by
   iCloud Drive for the server mode — file locking can interfere.

### B. Fetch the 3-D library (once, needs internet)

Open **Terminal** (⌘-Space → type `Terminal` → Return) and run:

```bash
cd ~/academy                    # tip: type "cd " then DRAG the academy folder onto the window
bash tools/fetch-vendor.sh
```

It downloads `three.min.js` into `public/vendor/`, verifies its SHA-384 against the published hash, and
tries to grab the photographic planet maps too. Expected tail:

```
  three.min.js integrity verified (matches the pinned SRI hash)
  mode is now: local
```

Nothing else to install — macOS already has `bash`, `curl` and `openssl`.

After this the folder is self-contained. For an **air-gapped** Mac, run step B on a networked machine
and copy the whole `academy` folder across.

### C. Run it — no install, no accounts

```bash
open ~/academy/public/index.html
```

Or just double-click `index.html` in Finder. Progress saves in that browser.

> If Safari behaves oddly with local files, either use Chrome/Firefox, or serve the folder:
> `cd ~/academy/public && python3 -m http.server 8000` then open <http://localhost:8000>.
> (macOS includes `python3`.)

### D. Run it — full mode with accounts and an instructor roster

1. Install **Node.js LTS** — either the `.pkg` from <https://nodejs.org>, or with Homebrew:
   `brew install node`. Nothing else is ever installed; the server uses only Node's built-ins.
2. Verify: `node --version` → e.g. `v22.x`.
3. Start it — double-click **`start-academy.command`** in the `academy` folder.
   **First time, macOS Gatekeeper will refuse it.** Either:
   - right-click (or Control-click) the file → **Open** → **Open** in the dialog; or
   - clear the quarantine flag once, from Terminal:
     ```bash
     xattr -d com.apple.quarantine ~/academy/start-academy.command
     chmod +x ~/academy/start-academy.command
     ```
   Keep the window open — closing it stops the server.
4. Or skip the launcher entirely:
   ```bash
   cd ~/academy
   node server.js               # serves http://localhost:8080
   PORT=9000 node server.js     # if 8080 is taken
   ```
5. Browse to **http://localhost:8080**. **The first account registered becomes the instructor** — make
   yours first, then have students register.

**For a classroom:** run it on one Mac and give students that machine's address, e.g.
`http://192.168.1.20:8080`. Find the IP with `ipconfig getifaddr en0` (Wi-Fi) or `en1`/`en2` (Ethernet).
The first time, macOS asks whether to allow incoming connections for Node — choose **Allow**.

### macOS gotchas

| Symptom | Fix |
|---|---|
| `"start-academy.command" cannot be opened because it is from an unidentified developer` | Right-click → **Open** → **Open**, or `xattr -d com.apple.quarantine start-academy.command`. |
| Double-clicking the `.command` does nothing | It lost its execute bit: `chmod +x start-academy.command`. |
| `zsh: permission denied: ./tools/fetch-vendor.sh` | Run it as `bash tools/fetch-vendor.sh` (no execute bit needed). |
| `command not found: node` | Install Node (step D1), then open a **new** Terminal tab. |
| "Port 8080 already in use" | Already running — open http://localhost:8080 — or `PORT=9000 node server.js`. |
| Simulators blank / "3-D library not loaded" | Step B did not finish. Check `public/vendor/three.min.js` exists and is ~600 KB. |
| Students on the LAN cannot connect | Allow Node in System Settings → Network → Firewall; verify the IP with `ipconfig getifaddr en0`. |

## 🪟 Windows — step by step

Tested on Windows 10 and 11. Nothing here needs admin rights except the optional Node install.

### A. Get the course onto the machine

1. Download the ZIP from GitHub (green **`<> Code`** → **Download ZIP**), or copy the `academy`
   folder from a USB stick / network share.
2. **Unblock it** (Windows marks downloaded ZIPs): right-click `orbit-academy-main.zip` →
   **Properties** → tick **Unblock** at the bottom if it is there → **OK**. Then right-click →
   **Extract All…** → **Extract**.
3. Move the inner **`academy`** folder somewhere short and writable, e.g. `C:\Users\<you>\academy`.
   Avoid OneDrive-synced folders for the server mode (file locking can interfere).

### B. Fetch the 3-D library (once, needs internet)

The simulators need `three.min.js`, which is not in the repo. Two ways — pick either:

**B1 — with Git Bash or WSL (recommended):**
```bash
cd /c/Users/<you>/academy      # Git Bash path style
bash tools/fetch-vendor.sh
```
(Git Bash comes with [Git for Windows](https://git-scm.com/download/win). WSL: `wsl` then `cd /mnt/c/...`.)

**B2 — no bash, using PowerShell:**
```powershell
cd C:\Users\<you>\academy
New-Item -ItemType Directory -Force public\vendor | Out-Null
Invoke-WebRequest -Uri "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" `
                  -OutFile "public\vendor\three.min.js"
# verify it is the expected file (should print True)
$want = "CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu"
$got  = [Convert]::ToBase64String(
  [System.Security.Cryptography.SHA384]::Create().ComputeHash(
    [IO.File]::ReadAllBytes("public\vendor\three.min.js")))
$got -eq $want
```
If that prints `False`, delete the file and download it again — do not use it.

After this the folder is self-contained. To deploy to an **offline/air-gapped** Windows machine, do
step B on a networked machine and then copy the whole `academy` folder across.

### C. Run it — no install, no accounts

Open `academy\public\index.html` by double-clicking. That is all. Progress saves in that browser.

> If the simulators show "3-D library not loaded", step B did not complete — check that
> `academy\public\vendor\three.min.js` exists and is ~600 KB.

### D. Run it — full mode with accounts and an instructor roster

1. Install **Node.js LTS** from <https://nodejs.org> (the `.msi`; click through the defaults — you do
   **not** need the "Tools for Native Modules" checkbox). Nothing else is ever installed: the server
   uses only Node's built-ins.
2. Verify in a **new** Command Prompt (Win key → `cmd`): `node --version` → e.g. `v22.x`.
   If it says *not recognized*, close the window and open a fresh one (PATH only updates for new windows).
3. In `File Explorer`, open the `academy` folder and double-click **`start-academy.bat`**. It checks for
   Node, starts the server and opens your browser. **Keep the window open** — closing it stops the server.
4. Browse to **http://localhost:8080**. **The first account registered becomes the instructor** — make
   yours first, then have students register.

Or from a terminal:

```cmd
cd C:\Users\<you>\academy
node server.js
```
```powershell
# PowerShell, with options:
$env:PORT=9000; node server.js
```

**For a classroom:** run it on one machine and give students that PC's address, e.g.
`http://192.168.1.20:8080` (find it with `ipconfig`). You may need to allow Node through the firewall
the first time — Windows will prompt; choose **Private networks**.

### Windows gotchas

| Symptom | Fix |
|---|---|
| `'node' is not recognized` | Open a **new** terminal after installing Node. |
| "Port 8080 is already in use" | It is probably already running — open http://localhost:8080. Or `$env:PORT=9000; node server.js`. |
| SmartScreen warns about `start-academy.bat` | **More info** → **Run anyway**, or start it from a terminal instead. |
| Simulators blank / "3-D library not loaded" | Step B incomplete — see above. |
| Students on the LAN cannot connect | Allow Node in Windows Defender Firewall (Private networks); confirm the host IP with `ipconfig`. |
| `bash: command not found` | The `tools/` and `test/` scripts are bash — use Git Bash or WSL. Instructors and students never need them. |

## 👀 Reviewers — the 60-second version

Everything runs on your own computer (nothing is exposed on the public internet), and it works
identically on **Windows, macOS, and Linux**.

> **Full step-by-step instructions are above: [🍎 macOS](#-macos--step-by-step) ·
> [🪟 Windows](#-windows--step-by-step).** The short version follows.

**Step 1 — get the files onto your computer.** No tools or GitHub knowledge needed:

1. In a web browser, go to **https://github.com/JASONSS26/orbit-academy** (sign in to GitHub if it
   asks — this is a private project, so use the account that was invited to it).
2. Find the green button labeled **`<> Code`** near the top-right of the file listing and click
   it. In the menu that drops down, click **Download ZIP**. A file called
   `orbit-academy-main.zip` lands in your Downloads folder.
3. Unzip it: on **Windows**, right-click the file → **Extract All…** → Extract; on **macOS**,
   just double-click it. Either way you get a folder — open it and you'll find an **`academy`**
   folder inside. That's the whole course. (You can move it anywhere you like, e.g. the Desktop.)

*(If you use git: `git clone https://github.com/JASONSS26/orbit-academy.git` does the same thing.)*

**Step 1b — fetch the 3-D library (once, needs internet).** Open a terminal in the `academy` folder and
run `bash tools/fetch-vendor.sh` (Windows: Git Bash or WSL). It downloads three.js into
`public/vendor/` and checks its checksum. Skip this and the simulators will tell you what is missing.

**Step 2 — run it.** Two options:

- **Zero-install (no Node, nothing to set up):** in the folder you just downloaded, open
  `academy/public/gallery.html` by double-clicking it — it opens in your browser, with a link to
  every worksheet and simulator. Progress saves in that browser. (A couple of features degrade
  without the server; see below.)
- **Full experience (accounts, roster) — needs Node.js:** the server is a JavaScript program, so
  the computer needs [Node.js](https://nodejs.org) — a one-time ~50 MB install (grab the **LTS**
  installer, click through it; no packages, no build step, nothing else to install, ever). Then
  in the `academy` folder, double-click **`start-academy.bat`** (Windows) or
  **`start-academy.command`** (macOS — first time: right-click → Open → Open); it checks for
  Node, starts the server, and opens your browser — keep its window open. (Terminal users:
  `cd orbit-academy/academy && node server.js`.) Then browse to
  **http://localhost:8080/gallery.html** for the no-login gallery, or the main hub at
  **http://localhost:8080/** to create an account — the first account registered becomes the
  instructor.

**If something doesn't start:** `'node' is not recognized` → open a *new* terminal window after
installing Node. "Port 8080 already in use" → the Academy is probably already running; just open
http://localhost:8080. Full install walkthrough: `docs/INSTRUCTOR_GUIDE.md` §2–3.

## What’s here (v5.0)

- **Module 1 — How Orbits Work** (complete): circular/elliptical orbits, speed-vs-altitude,
  prograde/retrograde, geosynchronous vs. geostationary, inclination, launch geography.
- **Module 2 — Angular Rates & Geosync** (complete): split-view (top-down + ground telescope),
  the GEO belt & slots, geostationary vs. geosynchronous, sky-from-the-ground streaks & frames.
- **Module 3 — Naming Orbits & TLEs** (complete): the six Keplerian elements (live-slider
  ellipse), "TLE of your orbit," and real orbits incl. Molniya/Tundra and a **sun-synchronous
  preset** with a live Sun marker and true **J2 nodal precession** (the node–Sun readout locks at
  98.2° — the orbit that tells time).
- **Module 4 — Maneuvers & Perturbations** (complete): Δv burns (with a fuel "gas gauge"),
  GTO→GEO transfer, drag decay & re-entry, escape/unbound orbits, radiation pressure/HAMR,
  J2 & sun-synchronous — a 3-D simulator with real RK4 integration of gravity + drag.
- **Module 5 — xGEO / Cislunar Space & Reference Frames** (complete): the Earth–Moon–Sun system,
  four reference frames (ECI / synodic / MCI / **ECL-EMBR**, the barycentric-rotating "Lagrange
  frame") with a 2×2 compare view, Hill spheres & Lagrange points, the true-position barycenter,
  xGEO defined, and "lead-the-Moon" lunar transfers.
- **Module 6 — Lagrange Points & Complex Orbits** (complete): the five Lagrange points
  (▲ markers + 1-D force balance + a toggleable **gravity landscape**, the co-rotating
  effective-potential surface), near-rectilinear halo orbits (NRHO, à la CAPSTONE/Gateway),
  TESS's 2:1 resonance, and **six live RK4 fan-release experiments** on the true restricted
  three-body field: lunar-scatter slingshots (one object flung past Earth's Hill sphere), the
  **L1 knife-edge** (≤8 m/s decides moonward vs earthward), stable **L4 tadpoles**,
  **DRO vs prograde** lunar parking (the Artemis I story), the Apollo **free-return figure-8**
  (4 of 7 eventually make it home — only the true free-returns on Apollo's schedule), and
  **temporary minimoons** captured and released by lunar flybys (à la 2006 RH120 / 2020 CD3),
  with green **capture halos**, a to-scale dashed **Hill-sphere ring**, and auto-zoom.
- **Module 7 — Observability** (complete): how we actually find & track objects — **radar**
  (range⁴ law, gain-vs-integration, pulse SNR ∝ √N), **optical** reflected-sunlight phases &
  light curves, **RA/DEC** on a 3-D celestial sphere, a **tag-&-fit initial-orbit-determination**
  tool, parallax, and the orbitology → characterization → intent ladder.
- **Module 8 — Lunar Transfers & Artemis** (the capstone flight sim): plan the transfer in a
  flight computer, then **fly it** from an Artemis-class cockpit — **two missions flown in
  order**: GEO servicing, then (unlocked by a successful GEO run) the **lunar graduation flight**,
  a genuine **three-burn** profile (TLI → lead the Moon → retrograde LOI brake → cued
  circularization in lunar orbit) — with a real RK4 three-body model, thrust in the **local
  flight frame** (Earth-relative, Moon-relative inside its sphere of influence), burn
  **countdowns** and **live guidance** recomputed from the current orbit, an **🤖 AUTO FLY**
  autopilot that flies the same controls as the pilot, ILS-style instruments + approach gates,
  a Δv budget/logbook, a true 3-D out-the-window view (physically-lit 3-D target satellite),
  a **TRAIN** free-flight sandbox, and a scored debrief.
- The **live simulators** (`tut1.html`–`tut8.html`) with matching camera/time controls.
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

All eight modules are complete. **Note on course order:** Observability is **Module 7** and the
flight-sim capstone is **Module 8** (file ids `tut7`/`worksheet7` = Observability, `tut8`/`worksheet8`
= flight sim). **Instructors:** see `docs/INSTRUCTOR_GUIDE.md` for
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

### New in v5.0

```
public/textures.js              planet-texture resolution (local → CDN if allowed → schematic)
public/vendor/                  three.min.js (fetched once) + committed schematic maps
tools/fetch-vendor.sh           one-time vendor fetch, with SHA-384 verification; --check / --cdn
tools/make-textures.py          regenerates the schematic Earth/Moon maps (numpy + PIL)
test/no-external-calls.test.js  proves zero outbound calls (static scan + runtime monitor)
test/tut8-cockpit.verify.js     headless cockpit: flies both Module 8 missions to completion
```

## Tests

```bash
bash test/run.sh   # 34 functional + 22 security checks + DoS guard, isolated data file
```
See `docs/TESTING.md`. Zero dependencies; run before every release.

```bash
bash test/run.sh                        # functional (34) + security (30) + DoS + air-gap
node test/no-external-calls.test.js     # air-gap check on its own (no server needed)
node test/tut8-cockpit.verify.js        # flies both Module 8 missions headlessly (17 checks)
bash tools/fetch-vendor.sh --check      # what is vendored; whether anything can call out
```

## Security

Each release passes a security audit (see `docs/SECURITY.md`). v1.0–v5.0: **PASS** — path traversal
contained, auth enforced, no privilege escalation, prerequisite gating server-side, input
validated, DoS-guarded, no XSS, no secrets committed. From **v5.0** the client is also verified to
make **no outbound network calls** (`test/no-external-calls.test.js`, static + runtime), and the
optional Module 1 "paste your API key" tutor has been removed so no field can carry a credential
off-box. All modules and the v2.x worksheet engine are
static client-side files (no new server surface). For internet-facing use, front it with HTTPS +
rate-limiting (see SECURITY.md "Accepted").

## License

MIT.
