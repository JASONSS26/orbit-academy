# Module 7 — Lunar Transfers & Artemis (DRAFT for discussion)

**Status:** proposal only. Nothing built yet. Let's confer, then build.

Capstone piloting module. The student stops *studying* orbits and *flies* one — a crewed Artemis-class
mission to the Moon and back — spending a real Δv budget, timing burns, and reading a cockpit
instrument. Everything they learned in Modules 1–6 gets used in anger.

---

## What it builds on (reuse, don't reinvent)
- **Module 4:** Δv-as-currency, the ⛽ gas-gauge, prograde/retrograde/radial burn buttons, real RK4
  integration, "out of Δv = mission over." → reuse the burn+fuel machinery almost verbatim.
- **Module 5:** the arm → aim-the-lead-angle → launch **TLI** flow (lead the Moon). → the departure.
- **Module 6:** the 4 reference frames, the Moon's gravity well, free-return / three-body intuition.

---

## Learning goals (draft)
By the end, a student can:
1. **Sequence a full mission** end-to-end and name each phase: TLI → outbound coast → lunar-orbit
   insertion (LOI) → (loiter) → trans-Earth injection (TEI) → return coast → re-entry.
2. **Spend a Δv budget** — see that a round trip is a *chain* of burns, each with a price, and that
   running the tank dry strands the crew. Feel why margins matter.
3. **Time a burn**, not just aim it — LOI must fire at the right place *and* moment; too early/late
   or too big/small misses capture (flies past) or crashes.
4. Understand **lunar-orbit insertion** as "burn retrograde at closest approach to let the Moon
   capture you" — the mirror of escape.
5. Understand the **free-return trajectory** — a figure-8 that swings around the Moon and comes home
   *with no burn at all* (the Apollo 13 safety net) — and why crews favor it.
6. Read an **ILS-style on-slope indicator**: a needle/crosshair that shows whether you're on the
   correct approach or re-entry corridor (centered = good), and correct toward center.
7. Appreciate the **re-entry corridor**: too shallow → skip off the atmosphere back to space; too
   steep → burn up / crush the crew. A narrow keyhole you must hit.

## Explicitly OUT of scope (keep it flyable)
- No 3-D plane changes / inclination targeting in the main flow (mention only).
- No n-body station-keeping. LOI parking orbit is treated as stable for the loiter.
- No realistic engine throttle curves — impulsive burns like M4.

---

## The piloting loop (the core mechanic to nail down together)
Each phase = **predict → set up → fire → watch → correct**. The student:
1. reads the current situation + the instrument,
2. chooses a burn (direction from M4 buttons; magnitude via a slider or tap-to-add-Δv),
3. optionally picks *when* (arm now / fire at closest approach),
4. fires, watches the RK4 trajectory play out, and
5. gets feedback: on-corridor (green), fixable (amber), or failed (red — retry the phase).

**Forgiveness:** each phase has a **tolerance band** (the corridor). Inside inner band = clean;
inside outer band = "correctable, use a small trim burn"; outside = failure + retry. This is what
makes it a *game* you can win, not a knife-edge. We should tune these bands together.

---

## PART A opener — "Everything you know so far" recap (bulleted, as the capstone deserves)
The module opens by gathering the whole course into one page, so the student arrives at the capstone
knowing they already own the tools. Draft bullets (tighten wording later):

- **Close to the Earth or the Moon, orbits are ellipses** — ovals traced by a body under one dominant
  gravitational pull. It takes **six numbers (orbital elements)** to fully name one: its size, its
  shape (how flattened), its tilt and orientation in space, and where the object is along it.
- **A circular orbit is just the special case of an ellipse with no flattening** (zero eccentricity).
- **The orbital period depends only on the semi-major axis** (the orbit's size) — not on its shape,
  tilt, or which way it goes. Same size = same period.
- **There is a special orbit — GEO — with a ~one-day period**, so a *prograde* satellite there hangs
  over a fixed line of longitude (geostationary). *(Culmination-quiz gem, verified: a **retrograde**
  object at GEO altitude passes over a given ground point about **every 12 hours** — Earth and the
  westbound satellite close at twice the GEO rate.)*
- **Thrusting maneuvers change an orbit's energy**, so you can **transfer from one orbit to another** —
  and every big change is really a **two-step move** (raise the far side, then circularize). Δv is a
  **finite currency**: spend it, and it's gone.
- **Where you point a burn matters:** prograde/retrograde (tangential) burns reshape the orbit
  efficiently; radial burns mostly waste fuel. Burn hard enough and the orbit **opens up to escape**.
- **Out in the regions not tightly bound to Earth or Moon, things get strange:** objects can **orbit
  an empty point in space** (Lagrange/halo orbits — not Keplerian, no single body at the center), and
  a close pass can **slingshot** an object clean out of the system.
- **Cislunar space is chaotic:** tiny differences in where something is *now* blow up into huge
  differences later, which is why keeping **custody** (tracking) of objects out there is hard.
- *(Deliberately never stressed — and fine to leave implicit: that bodies orbit their common center
  of mass, or that the COM sits at the ellipse's focus. Not needed for this audience.)*

**Then: the hook.** Reference **Artemis II** — the crewed flight that loops around the Moon and returns
to Earth (a free-return-style figure-8) using a handful of controlled maneuvers. "You now know every
idea behind that mission. In this module, *you fly it.*"

## Exercise structure (draft — Parts A–F, ~one phase each)
Same worksheet engine (teach / predict / do / observe / think / quiz), each part driving the same
cockpit simulator to a checkpoint.

- **PART A · Mission briefing & the Δv budget.** Opens with the recap above; then the whole trip on
  one page; the tank; why a round trip is a chain of burns. (No flying yet — orient the panel, read
  the gauge, name the phases.)
- **PART B · Departure: Trans-Lunar Injection.** Reuse M5's lead-the-Moon aim; fire TLI; coast out.
  Learn: aim so you *arrive where the Moon will be*, and spend the big departure Δv.
- **PART C · Arrival: Lunar-Orbit Insertion — VICTORY.** At closest approach, fire retrograde to let
  the Moon capture you. Too little → fly past (miss); too much → crash into the Moon. Capture usually
  drops you into an **elliptical** lunar orbit, so a **second small burn to circularize** (the two-step
  maneuver from Module 4, now around the Moon) tidies it into a clean circular parking orbit.
  **Victory = captured into a stable lunar orbit; bonus = circularized.** *Timing + magnitude — the
  climax.* *(Return trip and re-entry deliberately OUT of scope — one-way to lunar orbit.)*

Then: **final exam** (5–6 Qs, incl. the retrograde-GEO 12-hour gem) + **summary** + **resources**.

---

## LOCKED-IN DESIGN (per discussion)

### Scope & simplifications
- **2-D simulation only** (everything in the Earth–Moon plane). No inclination/plane changes.
- **Victory condition = captured into a stable lunar orbit.** **One-way — no return, no re-entry**
  (both too complex; the outbound half is the whole lesson).
- The mission plan the student should arrive at: **start in LEO → burn to raise apogee → time it so
  apogee intersects the Moon → burn retrograde at closest approach to get captured → small burn to
  circularize the lunar orbit.** A short chain of **(Δv, when)** pairs — 3 burns total.

### Two-view simulator
- **Top-down 2-D view:** shows Earth, Moon (on its orbit), and the spacecraft. Draws **both the
  planned trajectory (ghost line) and the actual trajectory (solid)** so the student sees plan vs.
  reality diverge and converge.
- **Cockpit "look out the window" view:** Earth and Moon rendered at **correct angular size** for the
  current distance (Moon looms as you approach, Earth shrinks then grows on the way back). This is the
  immersive payoff.
- Toggle or side-by-side between the two.

### Controls
- **Four thrust buttons:** **along the velocity vector (±)** and **normal to it (±)** — i.e. tangential
  and radial for a circular orbit (reuse M4's semantics/labels). Plus the ⛽ Δv gauge from M4.
- Impulsive burns, RK4 propagation between them (2-D, Earth + Moon gravity — the Module-6 integrator,
  reduced to 2-D).

### The plan-then-fly loop (the heart of the module)
1. **Interactive mission planner / table.** The student fills in a table of **(Δv, time)** rows — one
   per planned burn (raise apogee, lunar insertion, exit, LEO circularize). The 2-D view immediately
   simulates *that* plan as a **ghost trajectory**.
2. **Iterate.** Tweak the numbers, re-simulate, watch the ghost path get closer to threading Moon
   capture and LEO return. (This *is* the learning — feel how Δv and timing trade off.)
3. **"Solve it for me" button.** Once they're close, one click snaps to the correct values so nobody
   gets stuck. (Great for the predict→act→analyze loop: guess, iterate, then see the exact answer.)
4. **Hand over the stick.** Switch to live cockpit control. At each planned burn time a **"🔴 BURN
   NOW" light flashes**; the student fires the right thruster for the right duration. The top view
   shows **actual vs. planned** in real time.
5. **ILS-style "in the boxes" display** for staying on the planned trajectory: a needle/gate display
   that goes green when actual matches planned (on-corridor), amber when drifting, so they can trim.

### Fidelity
- **Honest 2-D RK4** (Earth + Moon point-mass gravity) with **generous tolerance bands** so it's
  winnable. Small drifts → one-tap "auto-trim toward the planned path" to keep it fun, not knife-edge.

---

## Visuals — needs a decision on assets
The vision calls for **nicely rendered cockpit visuals** (window framing, Earth/Moon imagery). Honest
constraint: I build with **code — canvas/SVG/Three.js, procedural**, plus the existing SRI-pinned
CDN Earth/Moon textures we already use in Modules 5–6. I **cannot generate AI-painted art** as part of
this build. Options for the cockpit look:
- **(a) Procedural/photographic (recommended, buildable now):** textured Earth/Moon spheres (the CDN
  textures already in the course) seen through a coded cockpit window frame + HUD overlay — correct
  angular sizes, lit phases, starfield. Consistent with Modules 5/6, zero new dependencies, no
  external art pipeline.
- **(b) You supply AI-rendered art:** if you generate cockpit/window/Earth/Moon images elsewhere, drop
  them in `public/` and I'll wire them in as layered backgrounds behind the HUD.
- Likely best: **(a) now**, swap in **(b)** later if you produce the art. *Which do you want?*

## DECISIONS (locked during the graphics build)
- **Cockpit art:** user-supplied AI render `public/cockpit.jpg`; live canvas + HUD composited over it.
  Overlay zones calibrated in %: window 28.1–81 / 17.2–49.6; nav MFD 27–58 / 61–80; fuel gauge
  66–81 / 84–99; burn pad 46–65 / 83–99; burn meter ~26–45 / 83.
- **Real Earth/Moon imagery** in the window via the SRI-pinned CDN textures (same as M5/6), shaded.
- **Burn model:** press-and-hold thrusters (fore/aft + left/right), with a live "this burn Δv"
  cumulative readout so the pilot knows when to release; ~2–20 s burns; ⛽ budget gauge on an MFD.
- **Two nav views, both in the Earth–Moon CO-ROTATING frame, one a zoom of the other:**
  big side panel = wide (whole system), dashboard MFD = zoomed near the Moon (capture endgame).
- **Δv budget ≈ 4200 m/s** (TLI ~3084 + LOI ~700 + circularize ~200, plus margin). Verified numbers:
  400 km LEO (v 7.673 km/s); TLI +3.084 km/s prograde; ~5.0-day coast; Moon lead ~114° at t=0.
- **Mission planner = separate tab** (`plan7.html`): burn table + live RK4 predictor + "solve for me"
  + "load into cockpit" (via localStorage). Shared 2-D RK4 flight model (Earth+Moon), reused by both.

## KNOWN NUANCE to revisit (computed two-step planner)
- The two-step **compute-Δv-from-vis-viva** table is exact and beautiful for **GEO** (raise apogee →
  circularize; recompute() shows resulting apogee & arrival speed and checks them). For the **Moon**,
  true lunar *capture* is a retrograde burn *relative to the Moon* at closest approach (dv2≈−900 m/s),
  which the "circularize at apogee" framing doesn't literally match. Right now: GEO uses the honest
  computed model; Moon's "solve" fills verified clean-pass + capture values (dv1=3087, dv2=−900,
  lead=120) and the sim confirms capture. TODO: give the Moon step-2 its own "insertion burn at
  closest approach" framing rather than reusing the circularize wording, OR teach the Moon as
  "raise apogee to lunar distance + circularize into a high Earth orbit that the Moon then captures."

## Parked ideas (do AFTER a basic mission flies end-to-end)
- **Warm-up flight first:** a "get the feel" lap around the Earth (fly with the ILS target
  heading+speed controllers), then **refuel**, THEN go to the Moon. Eases the learning curve.
- **Planner progression:** start with a **go-to-GEO** exercise (familiar from Modules 2–3) before the
  full lunar transfer — a gentler first target that reuses the same planner + cockpit.
- **ILS as heading+speed capture:** frame the on-slope display as a **target heading & target speed**,
  with the fore/aft (speed) and left/right (heading) thrusters each nulling one needle. Clean mapping
  of the 4 buttons → 2 needles.
- **Flavor events (optional, fun):** mid-course surprises that force a correction burn — "uncharted
  black hole flyby, adjust course," micro-meteoroid nudge, etc. Great for engagement; keep them
  skippable so they don't undercut the core physics lesson.

## Remaining calls for you
1. **Visuals:** (a) procedural now, (b) you supply AI art, or (a)-then-(b)?  ← main one.
2. **Burn model:** timed-duration burns (hold the thruster) vs. tap-to-add-a-chosen-Δv (from the plan
   table). I lean **tap-to-add the planned Δv** so plan and flight use the same currency.
3. **How literal is the ILS?** aviation needles, "gates/boxes in space" you fly through, or both?
   (I lean both: gates on the top view, a needle strip in the cockpit.)
4. Scope now reads as **3 parts (A–C)**: A recap+plan, B raise-apogee/TLI, C lunar-orbit-insertion
   victory. Tight and capstone-appropriate. Good, or split the planner into its own part?
