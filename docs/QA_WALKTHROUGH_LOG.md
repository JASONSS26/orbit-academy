# Field-Test Log — Orbit Academy v2.6

**Tester persona:** USSF technical sergeant, no orbital-mechanics background, doing every worksheet exercise in order with the simulator open beside it.
**Date:** 2026-07-20
**Scope:** Modules 1–8, final exam, hub, cheat sheet/controls, glossary, guide, gallery, docs.
**Method:** every referenced control was grepped against the corresponding tut HTML/JS; every quiz answer key and stated number was independently recomputed (vis-viva, Hohmann, TLE checksums, angular rates). All quiz `a:` indices match their `why:` text and all `feedback` arrays are correctly aligned across all modules — no answer-key bugs anywhere. The problems below are almost all *worksheet prose describing a tool that has since changed*, plus stale 6-module-era text.

Severity: **BLOCKER** = task cannot be done as written · **ERROR** = factually wrong or broken feature · **INCON** = contradicts the sim or itself · **IMPROVE** / **NIT**.

---

## Fix-first list (a trainee fails through no fault of their own)

1. **M6 e1 (capstone) is unfollowable** — worksheet tells me to use a "planar Lyapunov (flat)" family selector, a "🎚 energy" slider, a "1:1 lock snap button," and "Lissajous / quasi-periodic" buttons. The libration zoo actually has two amplitude sliders (Ax/Az) and frequency-ratio buttons. Nothing named in the task exists. (`worksheet6.data.js` ~332–335 vs `tut6.html` ~67–91)
2. **M4 e1 radiation-pressure task observes nothing** — tut4's `accel()` has no solar-radiation-pressure term and drag is zero above 1,000 km, exactly where the task says to fly. The area-to-mass slider does nothing there. Same false promise in the worksheet's perturbation table and tut4's own slider note. (`worksheet4.data.js` ~508 vs `tut4.html` `accel()`)
3. **Dead keys taught on day one** — Worksheet 1 Part A and the cheat sheet both say `space` = pause; no simulator handles the space bar (and warp bottoms out at 1/32 — there is no pause). Cheat sheet also says `R` reset "works in every simulator"; tut2 has no R handler. (`worksheet1.data.js` ~46, `cheatsheet.html` 41/47)
4. **M2 c1 starts on the wrong drive** — worksheet says "leave the drive on track a GEO SATELLITE," but the default radio is `stars` (`tut2.html` 76). A literal trainee photographs the exact opposite of the promised result right before the quiz on it.
5. **M2 a3 is impossible** — "Find the XM 'Rock' and 'Roll' satellites": GEO sats render as identical unlabeled dots (names never displayed), and `tut2.data.js` puts both at −115.0° so they overlap as one dot. (Real-world nit: XM "Rock"/"Roll" are XM-2/XM-1 at 85°W/115°W; the file labels XM-3/XM-4, which were "Rhythm"/"Blues".)
6. **M8's lunar mission is advertised everywhere but doesn't exist** — the Moon button is a hardcoded `alert('coming soon')`; the GEO debrief announces "🌙 Lunar mission unlocked… now available in the planner" and sets `m7_geo_done`, which is **never read**. Meanwhile the module title, quiz.js blurb, gallery, guide §6, README ("and a lunar insertion"), and the certificate ("lunar transfers") all claim it. Either ship the mission or re-frame the module. (`tut8.html` 261 vs 886)
7. **tut8 never loads Three.js** — `sat8.js` requires `THREE` ("already loaded by tut7" — it isn't), so `Sat7.build()` fails and the 3-D target-satellite close-up + shadow cue can never render, while the cockpit tour promises "the target satellite grows as you close in."
8. **Glossary module tags swapped** — `MODNAMES` has `7:'M7 Transfers', 8:'M8 Observability'`; course order is 7 = Observability, 8 = Transfers. Every term is chip-tagged with the wrong module. (`glossary.html` 61)

---

## Hub / course plumbing

9. **INCON** — hub says "Finish **all six** to earn your certificate"; the course has 8 modules. (`index.html` 102)
10. **INCON** — badge `ROMAN` array ends at VI, so modules 7–8 get arabic-numeral badges unlike the rest. (`index.html` 299)
11. **INCON** — certificate text lists six topics ("orbital dynamics, angular rates, orbit taxonomy, maneuvers, observability, and cislunar space") — no Lagrange points, no lunar transfers/capstone. (`index.html` 137)
12. **INCON** — Module 1 is titled "Orbital Dynamics" on the hub (`server.js` COURSE) but "How Orbits Work" in the worksheet, README, and guide. Only module whose names disagree.
13. **ERROR (dead code)** — `quiz.js` t1's entire 120-line steps+quiz block, and index.html's whole quiz path (`startQuiz`/`renderQuestion`/`finishQuiz`, ~90 lines), are unreachable: `openTut()` returns early whenever `t.worksheet` exists, and all 8 tutorials have worksheets. The in-hub quiz can never run. Notably the only content bugs found in it (an ~11.2 vs ~10.7 km/s escape-speed contradiction between Q3 and Q4 feedback; feedback referencing "step 2"/"step 5" that don't match the 12-step list) are all in this dead code — delete or wire it up.
14. **NIT** — `quiz.js` trailing comment "t3b, t4, t5 added as their tools are built" is stale; everything is built.
15. **IMPROVE** — dual sources of truth for worksheet data: `public/worksheetN.data.js` (used in file:// standalone mode) vs `workbooks/active/` (served by the server, edited by the editor). Currently byte-identical, but any instructor edit silently strands the public copies. Consider generating one from the other at startup or documenting the sync step.

## Module 1 — How Orbits Work

16. **INCON** — three unqualified escape speeds: worksheet teach says "~10.7 km/s… and you escape" (true only at 600 km), tut1 legend and `builtinExplain` hardcode "~11.2 km/s at this altitude" for every altitude — so esc1 has me inject 11.0 km/s at 1,000 km (v_esc = 10.4 there) and the tutor congratulates me for exceeding ~11.2. (`worksheet1.data.js` 17, `tut1.html` 113/397)
17. **INCON** — r_geo teach: GEO "takes **precisely 24 hours**" — it's the sidereal day (23 h 56 m), and the sim itself uses 86,164 s. Soften to "almost exactly one day." (`worksheet1.data.js` ~227)
18. **IMPROVE** — fan-injection task: at the suggested settings the two slowest fan members have underground perigees and render as red "⚠ RE-ENTERS" ellipses; the teach text never warns, so it reads as a bug. (~318)
19. **NIT** — a2 quiz option says DC→NYC "~200 miles" while the teach/why say "~260 miles" for the same comparison. (~170)

## Module 2 — Angular Rates & Geosync

20. **ERROR** — tut2 exposure caption: "streak ≈ 7.5′ per min; the sky moves 15″/s" — 15″/s is 15′/min. Self-contradictory (the drawn 1°/4 min streak is correct). (`tut2.html` 572)
21. **ERROR** — e5 promises the terminator sweeps "once per day" in ride mode (checkbox agrees: "Sun sweeps by once/day"); the code moves the Sun at the compressed-year rate — one sweep ≈ 13 sim-days. Physically it *should* be once/day in the co-rotating frame; the sim just doesn't implement it. (`worksheet2.data.js` ~263 vs `tut2.html` 400)
22. **INCON** — e1 says open the "🔬 satellite anatomy" view; the button is "🛰 Fly out for a close-up (inspector view)". e4 later uses the right name. (~210)
23. **INCON** — b2 tells me to watch a ground track "tracing a figure-8 (an analemma)"; tut2 draws no ground track at all. (~106)
24. **IMPROVE** — the module is titled "Angular Rates" and objective #1 promises degrees-per-hour, but no task ever exercises an angular rate in °/hr; it first appears as exam Q1. Scope readouts use ″/s and ′/min only.
25. **NIT** — c3 says "sidereal drive **off**" (no off state exists; two radios), c0 says watch "star streaks" in the live view whose caption says everything is a point, e1 feedback says "any geostationary sat, inclined or not" (inclined ⇒ geosynchronous, not geostationary), a3 says GEO sees "about a third of the globe" (~42%).

## Module 3 — Naming Orbits & TLEs

26. **ERROR** — intro SVG labels perigee and apogee **backwards** (Earth drawn right of center; "perigee" dot placed at the far vertex). The caption is right; the picture teaches the opposite. (`worksheet3.data.js` 22)
27. **ERROR** — marker colors reversed in prose: tool renders perigee **green**, apogee **red** (same convention as tut4's legend); worksheet a3 and the elements table say "red (perigee) and green (apogee)". Trainee IDs the apses backwards. (48/129 vs `tut3.html` 179)
28. **ERROR** — the "real ISS TLE" sample is corrupted: line 2 is 68 cols (space inserted in mean-motion/rev field, digit dropped) and line 1's mod-10 checksum fails — in a module whose tool brags about correct checksums. (~207)
29. **ERROR** — d2 capstone: "click the Molniya preset and compare your ghost ellipse to it — then tweak" — presets overwrite all six sliders, destroying the hand-built orbit; they match by construction. Comparison impossible. (~288 vs `tut3.html` `loadSat()`)
30. **INCON** — c2 says step the position slider evenly near perigee vs apogee and compare jumps — the slider is **true anomaly**, so the marker jumps *farther at apogee*, contradicting the Kepler's-2nd-law lesson. Use the auto-move animation (correctly driven by mean anomaly) instead. (~227)
31. **INCON** — d2 says "set inclination to 63.4°"; the slider is `step="1"`. (287 vs `tut3.html` 55)
32. **INCON** — Tundra preset credits "SiriusXM / SBIRS"; SBIRS HEO payloads fly Molniya-type 12-h orbits, not Tundra. (`tut3.html` 298)
33. **NIT** — b2 quiz has the same pair as two options ("RAAN and inclination" / "Inclination and RAAN"); a2's suggested settings trip the "⚠ perigee below surface" warning unwarned; "TLE of your orbit" panel needs no opening; generated TLE zero-pads mean motion where NORAD space-pads.

## Module 4 — Maneuvers & Perturbations

34. *(See fix-first #2 — SRP task.)*
35. **ERROR** — sun-sync scenario's gold "elliptical" ring (a = R⊕+700, e = 0.35) has perigee ≈ 4,600 km — it visibly passes through the Earth. (`tut4.html` 285)
36. **INCON** — f2 claims each sun-sync ring "was given the inclination that makes its own altitude precess at the sun-sync rate"; the code gives both identical i = 98° and one hard-coded rotation rate. The think-question asks me to infer physics the schematic doesn't model. (~574 vs 279–286)
37. **INCON** — the "a burn changes the opposite side of the orbit" rule is presented as general but is stated for a **radial** burn (b4), where it's wrong (radial burns rotate the apsides ~90°; the opposite point keeps its radius). Net crash outcome is right; the mental model isn't. (~21, ~212)
38. **IMPROVE** — "↺ refuel/reset" only zeroes Δv spent; it does not reset the orbit, which c0a/x4 imply. And b1 says "launch a circular orbit" with no scenario named while tut4 boots into drag-decay at 300 km with drag on — contaminating the clean-impulse lesson.
39. **IMPROVE (both M3+M4)** — **all 34 task quizzes have `a:1`**, almost always the longest option. Test-wise trainees will spot "option 2 is always right" in one part. Shuffle at render time or vary keys. (Exams do vary.)

## Module 5 — xGEO / Cislunar

40. **ERROR** — a1: "Start in the Low lunar orbit zoom (it opens there)" — it opens at Earth–Moon scale (`setFrame('eci'); setScale('em')`). First instruction of the module is false. (`worksheet5.data.js` 92 vs `tut5.html` 671)
41. **ERROR** — the Earth-wobble lesson can't be seen: the sim pins Earth at the origin and moves the *barycenter marker* around it (physically backwards); the worksheet (and INSTRUCTOR_GUIDE §6) promise "students see Earth wobble about it." Also self-contradictory: the wobble is claimed *in the rotating frame*, where Earth would be frozen. (42/240 vs `tut5.html` 552–562; same in tut6)
42. **ERROR** — d3: "see the Moon's orbit plane tilted ~5° to the ecliptic… tilt the view to see the planes fail to line up" — the sim deliberately models the Moon's orbit flat in the ecliptic (code comment admits it). Trainee looks and sees perfect alignment. (321 vs `tut5.html` 322)
43. **INCON** — exam q4's correct option says the frames differ by being "centered on Earth or Moon" — the module's fourth frame is **barycenter**-centered, which the worksheet itself calls "the deep insight."
44. **IMPROVE** — "released at rest feels no net tug at ~85%" — pure gravity balance for an object truly at rest is ~90% (9:1); 85% (L1) assumes co-rotation. One clause fixes it; a sharp trainee doing the inverse-square check concludes the course is wrong. Also: synodic is billed as THE transfer frame, but the only transfer demo force-switches to ECI without a word.
45. **NIT** — "add the elliptical science orbit" (already on, labeled differently); stale "Moon-locked" frame name in tut5's initial overlay + header comments (CLAUDE.md's release gate explicitly says grep for removed frame names).

## Module 6 — Lagrange Points & Complex Orbits

46. *(See fix-first #1 — libration zoo controls.)* Note the worksheet's "ONE number (Jacobi constant) sets everything" framing also contradicts the tool's own "two amplitude knobs + a frequency ratio" panel. INSTRUCTOR_GUIDE §6 describes the tool correctly — the worksheet is the stale one.
47. **INCON** — L1/L2 numbers disagree across the course: worksheet6 table "83.7% / ~116%", tut6 readout "85% / 119%", code constants L1F=0.8513/L2F=1.1858 (declared from-Earth-center, but the header comment quotes barycentric values), Module 5 teaches "~85%". True from-Earth: 84.9% / 116.8%. L2F=1.1858 is wrong under either convention (~7,000 km far). (`worksheet6.data.js` 48 vs `tut6.html` 158–198)
48. **ERROR** — c2 promises TESS's ellipse "slowly precesses" in ECI and "locks into a repeating figure" in synodic; the tool draws one static ellipse, no trail — neither is visible. Also the drawn ellipse's period is ~13.94 d (1.96:1), not the taught 13.7 d / 2:1, so the resonance geometry drifts over a few laps. (212 vs `tut6.html` 502–507)
49. **ERROR** — d1 chaos demo: teach/predict say all 7 objects are "launched almost the same"; in mixed-fan mode only 3 are — two are retrograde and two aim at the Moon by design, so the "scatter" readout explodes for non-chaos reasons and swamps the careful comparison. (233 vs `tut6.html` 557)
50. **IMPROVE** — e1's "a halo orbit goes around nothing at all" sits unreconciled next to the showcase NRHO that visibly wraps the Moon; b1 promises station-keeping "while everything orbits" in a frame where nothing visibly moves; d1b promises a banner "for each" escape but it fires once per release.

## Module 7 — Observability

51. **INCON** — c6 says take a picture and "watch the star field drift left→right"; default camera mode holds the **stars fixed** (satellite drifts). Works only in track-a-SATELLITE mode, never mentioned. (260 vs `tut7.js` 674)
52. **INCON** — intro says brightness plunges "~10 magnitudes from fully lit to back-lit"; the 10-mag swing is glint→back-lit; fully-lit diffuse is ~5.5 mag above back-lit (line 21 and the tool agree). (22)
53. **INCON** — three different radar headline numbers for the same lesson: worksheet "~24 million×", tut7 "~7.7 million×" (different ranges, fine-ish), guide §6 "≈300,000×" — not derivable from either range pair.
54. **IMPROVE** — tut7 claims "every scene maps to an exercise," but the two best scenes (🎯 tag-&-fit IOD, 📡 radar gain-vs-integration) have **no worksheet task at all**. The strongest content in the module is undiscovered. Consider one task each.
55. **NIT** — radar scene labels GEO range "42,164 km" (that's geocentric radius; ground-to-GEO overhead ≈ 35,786 km); scope dB spread is compressed ~3× with disclosure only in a code comment.

## Module 8 — Lunar Transfers & Artemis

56. *(See fix-first #6/#7.)*
57. **ERROR** — final exam's "Module 8 · Lunar Transfers" question tests leading the Moon — never taught in shipped M8 — and its `why:` says the Moon moves "~½ of the way around the sky" during the coast; a 3.8-day transfer moves it ~50° (~1/7 orbit). (`worksheet-final.data.js` 54–59)
58. **IMPROVE** — b1/b2 say "**type** Δv values" into the planner; the input is a per-digit ▲/▼ stepper, nothing typable. a1 says "read the mission objective"; `MISSIONS.geo.objective` is never displayed. Part C never mentions the real success conditions: hold the target box a full orbit, and scoring includes angular separation from the target (phasing — a concept the worksheet never teaches). A trainee who nails both burns can still get dinged with no idea why.
59. **NIT** — pervasive stale "module 7" internals in Module 8 (`m7plan`, `m7_tour`, `m7_geo_done`, `FLIGHT7`, `Sat7`, worksheet8 header comment says "Worksheet 7 … tut7.html"); planner subtitle "iterate until it threads lunar capture" shown for the GEO mission; `#planBudget` hardcoded to the moon budget 4200.

## Final exam & support pages

60. **NIT** — final.html: picking any option reveals the correct answer and re-answering is allowed before "Next," so the 70% certificate gate is trivially gameable (the page even advertises this). Fine if intentional mastery-model — then drop the "70%" framing.
61. **NIT** — final question order interleaves M8 before the M7 questions.
62. **INCON** — cheat sheet's "module-specific" table stops at M4–5; both W7 and W8 point trainees there, and its global "arrow keys rotate the view" is actively wrong in tut8 where arrows fire thrusters. `controls.html` says "there's a 'Controls' button in every module's header" — there isn't (it's in the worksheet header, and it opens `cheatsheet.html`, not `controls.html`; the two reference pages disagree on trackpad zoom too — controls.html is the correct one).
63. **NIT** — glossary tags free-return/LOI as M8 and graveyard orbits as M7; neither worksheet teaches them.

## Docs / release hygiene (CLAUDE.md release gates)

64. **ERROR** — `docs/SECURITY.md`'s latest audit entry is **v2.5**, but README claims "v1.0–v2.6: PASS." Per the repo's own release workflow, the v2.6 audit either wasn't run or wasn't logged. Also there are uncommitted changes to `server.js`/`index.html`/`test/security.test.js` and an untracked `public/editor.html` — the shipped state and audited state have diverged.
65. **INCON** — INSTRUCTOR_GUIDE §6 lists Module 8 *before* Module 7, and repeats the two-missions ("go to the Moon") and Earth-wobble claims contradicted above.
66. **NIT** — ~130 macOS Finder duplicates ("`* 2.*`" — tut6/tut7/worksheets/docs/frames). All byte-identical to their originals and untracked by git, but they ARE served by the local server and bloat the folder. Delete them (`find . -name '* 2.*' -delete` after review).
67. **NIT** — `worksheet-engine.js` comment says progress falls back to localStorage "so the static pages work on GitHub Pages" — README insists nothing is exposed publicly; pick one story.

---

## What's solid (so it doesn't get "fixed")

Answer keys and feedback alignment: 100% clean across every module and exam. The headline physics is right everywhere it counts: v_circ/v_esc ladders, Hohmann LEO→GEO 3,860 m/s and the flight-computer targets matching to the meter, Molniya (26,562 km / 63.4° / argp 270°), sun-sync 0.9856°/day, GEO sidereal 86,164 s locked to Earth spin (GEO sats genuinely hold station), TESS distances, NRHO 3,000/70,000 km, radar range⁴ arithmetic, 15″/s sidereal rate and the 1°/4-min streak. The predict→act→analyze worksheet structure works, and Module 7's simulator is the best thing in the course. The recurring failure mode is simply that worksheet prose lags the tools — a "grep the worksheet for every control name against the tut file" pass per release would catch most of this class automatically.

---

## Resolution — v3.0 (2026-07-20)

All findings addressed in the v3.0 release (see `docs/CHANGELOG.md`). Notes:

**Errata:** finding #3 overclaimed — `space` = pause DOES exist in tuts 4–6 (it is absent in tuts 1–3 and 8). The cheat sheet was scoped per-module rather than stripped. Finding #6's lunar mission was **built out and enabled** (per the owner) rather than reframed: the Moon button now unlocks after a GEO success, the planner is mission-aware with a sim-verified capture gate, and Worksheet 8 gained a Part D — the previously-broken cockpit fallback plan (prograde LOI) was also fixed.

**Intentionally kept:** final.html's reveal-on-pick mastery model (copy now describes it accurately instead of implying a blind 70% gate); Module 8's internal `m7*` localStorage keys and `FLIGHT7`/`Sat7` globals (renaming would orphan saved plans/tour state for no user-visible gain); tut7's radar-scope dB compression (disclosed in its lede now); the dual `public/` + `workbooks/active/` data copies (documented — sync step added to the release routine; #15).
