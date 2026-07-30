# Student feedback — modules 1–6 (first full external review)

Reviewer: E. Carrington Gregory. First person outside the project to work the course end to end.
Roughly 150 discrete items. This file triages all of them so nothing is lost, records the
**disagreements** where the reviewer's suggestion conflicts with a project decision or with the
physics, and tracks what has been done.

Status key: **TODO** · **DONE** · **DECIDE** (needs a call from the owner) · **WONTFIX** (with reason)

---

## P0 — Assessment validity — **RESOLVED**

> "A lazy student could choose the longest answer in all the quizzes and get them all right. The
> wrong answers are always short, and the right answers are always long."

This is the most important item in the review, and it is worse than the reviewer could have known.
Measured across all 201 single-answer questions in all 8 worksheets:

| Worksheet | Beatable by always picking the longest option |
|---|---|
| 1 | 20/26 (77%) |
| 2 | 17/20 (85%) |
| 3 | 17/18 (94%) |
| 4 | **30/30 (100%)** |
| 5 | **21/21 (100%)** |
| 6 | 27/28 (96%) |
| 7 | 26/30 (87%) |
| 8 | 27/28 (96%) |
| **All** | **185/201 = 92%** |

Chance is 25%. The pass mark is 70%. **So a student who reads nothing, understands nothing, and
always clicks the longest option passes every module and earns the certificate.** The option shuffle
added in worksheet-engine v1.5 does not help at all: the tell is length, not position.

Size of the repair: the correct answer is a median of **56 characters longer** than its longest
distractor (p25 29, p75 81, worst 156). Only 17 of 201 questions are currently safe. Fixing this means
bringing distractors up to the same level of detail as the correct answer — a real content pass over
~185 questions, not a formatting tweak. Writing *plausible, equally specific* wrong answers is also
the single best way to make the quizzes teach, because good distractors encode the common
misconceptions.

**FIXED — all eight worksheets repaired.** Every distractor in the course was rewritten so that each
wrong answer is a *real misconception stated with the same specificity as the truth*. That removes the
length tell and makes a wrong click informative, which is the point of a distractor.

| Worksheet | Before | After |
|---|---|---|
| 1 | 77% | **0%** |
| 2 | 85% | **15%** |
| 3 | 94% | **0%** |
| 4 | 100% | **3%** |
| 5 | 100% | **24%** |
| 6 | 96% | **11%** |
| 7 | 87% | **3%** |
| 8 | 96% | **4%** |
| **All** | **92%** | **7%** |

The median gap between the correct answer and the mean distractor fell from **56 characters to 5**.
Course-wide exploitability is now **7%**, well below the 25% chance line — the heuristic is worse than
guessing, which is the correct end state.

**A note on the metric, because it changed mid-repair.** The original detector counted a question as
beatable whenever the correct option was longest by *any* margin. Once options are balanced they land
within a few characters of one another, and a 2-character "win" is not something a reader can act on —
so that measure would have understated the repair. `test/quiz-quality.test.js` now reports two numbers:
`strict` (longest by any margin, ties broken by position) and `clear` (longest by more than 10
characters, i.e. actually spottable). The gate uses `clear`; `strict` prints alongside so the softer
number can never hide a regression. Both are visible in every run.

The test is a **ratchet**: per-worksheet ceilings that may only ever be lowered, so no module can
regress behind the others.

---

## P0 — Physics and factual errors

| # | Where | Issue | Status |
|---|---|---|---|
| 1 | M5 Ex 15 | **Lead angle — the reviewer is mistaken; the original text was correct.** See the note below. | **WONTFIX (reviewer wrong)** |
| 2 | M3 throughout | **"Shape" is used to mean eccentricity, but shape is set by size *and* eccentricity.** The reviewer caught the internal contradiction: Ex 2 demonstrates that period doesn't change when "shape" changes, then a later question asks why period stays fixed "if neither the size nor the shape changed". Terminology needs one consistent definition. | DECIDE |
| 3 | M4 Ex 17 + Key Points | **"Drag makes it speed up" is at best misleading.** Reviewer: "friction doesn't speed you up." Correct framing: drag removes energy → orbit shrinks → at the lower altitude the *circular speed is higher*, so orbital speed increases. Needs rewording in both places. | **DONE v5.3** (objectives + tutorial now carry the careful framing; d2 already had it) |
| 4 | M4 Ex 3 | "What you're spending is delta-v" — you're spending propellant; Δv is the accounting unit. Reviewer's fix is correct and worth adopting. | **DONE v5.3** (propellant is spent; Δv is the budget unit — with the why) |
| 5 | M5 tutorial | Hill-sphere percentages don't add up: "85%" in one place, "16%" in another. Round consistently (85/15 or 84/16). | **DONE v5.3** — they are two *different*, nearly coincident quantities (L1 at ~85%, Hill radius ~16%); the text now says so explicitly instead of rounding one to match the other |
| 6 | M3 Ex 13 | Sun-synchronous **cannot be demonstrated**: the sim caps inclination at 90°, so i = 98.2° is unreachable, and the preset shows 90°. Owner already flagged: "does the SIM include J2 precession, if not we need to fudge it." | DECIDE |
| 7 | M1 | "Re-entry" is used ambiguously — reviewer read it as re-entering *orbit*. Say "re-enters the atmosphere". | **DONE v5.3** |
| 8 | M3 Ex 7 | TLE element order doesn't match the order the six elements were taught, and the table omits size/shape. Reviewer wants them introduced in TLE order with cross-references. Good idea, moderate rework. | DECIDE |

### Note on item 1 — the lead angle, and a mistake worth recording

The reviewer wrote: *"Text says 'too little lead and you get there early… too much and the Moon has
already swept past.' Backwards."* That correction was accepted and the passage was rewritten. **The
reviewer was wrong and the original text was right**, so the rewrite introduced a physics error into
the course. It has been reverted, and `test/tut5-lead-angle.test.js` now pins it.

The geometry, taken from the simulator's own constants rather than from intuition:

- You burn at perigee; apogee is a half-turn — **180°** — away.
- The lead angle is how far **ahead of your launch point** the Moon sits at ignition, so the Moon
  must still cover **180° − lead** to reach your apogee. `tut5.html` encodes exactly this:
  `TLI_IDEAL_LEAD = 180 − TLI_MOON_TRAVEL`.
- Flight time is **4.98 d**, in which the Moon covers **65.6°** — so the ideal lead is **114.4°**.

| lead | Moon reaches apogee | you reach apogee | result |
|---|---|---|---|
| 80° | day 7.59 | day 4.98 | **early** by 2.6 d — Moon still inbound |
| 114° | day 4.98 | day 4.98 | together |
| 160° | day 1.52 | day 4.98 | **late** by 3.5 d — Moon already swept past |

A *smaller* lead leaves the Moon *more* ground to cover than you have flying time, so you get there
first and wait. The lesson: a reviewer reporting a **symptom** ("this confused me") is nearly always
worth acting on, but a reviewer supplying a **correction** must still be checked against the model.
Deferring to the correction without checking is how a confident wrong answer gets published.

---

## P0 — Simulator bugs (behaviour, not text)

| # | Module | Issue | Status |
|---|---|---|---|
| 1 | M6 Ex 7 | **`.` (time warp) does nothing** in the L4-tadpole release scenario, though it works elsewhere in the same module (Ex 9). | **DONE v5.2** (warp ladder extended above the tadpole's starting rung) |
| 2 | M1 Ex 19 | **Earth lost its continents**; fixed by reopening the sim. This is the `crossOrigin`/`file://` texture failure fixed in v5.2 — the reviewer was on an older build. Worth confirming with them. | LIKELY FIXED |
| 3 | all | **Trackpad zoom is too coarse.** "Once you are zoomed in and want small adjustments, make that easy." Raised twice, called "jerky and frustrating". Needs non-linear zoom (fine control when close). | **DONE v5.2** (OA_ZOOM: proportional, deltaMode-normalised, Shift = fine) |
| 4 | M5 Ex 3 | **Reference frame doesn't persist when you change zoom scale** — switching zooms lands you in an inconsistent frame. Either persist the frame, or state frame *and* zoom in every instruction. | **DONE v5.3** (em-scale frame choice remembered and restored) |
| 5 | M2 Ex 11 | **No way back from the satellite-anatomy / inspector view.** Needs a back button. | **DONE v5.2** |
| 6 | M2 Ex 4 | The Sun rendered *inside* the GEO ring initially. | **DONE v5.3** (sprite spawned at the origin until frame 1; now positioned at creation) |
| 7 | all sims | **Sliders can't hit exact values.** "It is frustrating to want to hit 2000 and you go back and forth and give up." Add numeric entry beside each slider. Raised as a general request. | **DONE v5.2** (sliders.js: typed box on every slider) |
| 8 | M2 Ex 5, Ex 6 | **The figure-8 is not visible** where the text promises it. Reported twice. | **RESOLVED v5.3** — Earth-fixed ground-track trail built and verified (closes into the analemma), then the exercise was cut at the owner's call ("the pattern on the earth is not that valuable"); the trail remains in the sim. |
| 9 | M3 Ex 2 | Large eccentricity puts the satellite inside the Earth with no warning — reviewer asked "BUG?". Needs a perigee-below-surface indicator. | **DONE v5.3** (the warning existed but whispered from the dim hint bar; now alarm-styled + red perigee readout) |
| 10 | M3 Ex 3 | TWIST (argument of perigee) has no visible effect except at extreme eccentricity — true, but should be *said*. | TODO |
| 11 | M2 Ex 13 | Reviewer could not find the FREEZE checkbox the text refers to. | TODO |
| 12 | M6 Ex 3 | Could not get a view showing the Moon's arrow pointing back toward the Moon at L1. | **DONE v5.3** (the arrows were correct but spanned 2–4% of the default view; scenario now presets a close-up camera, 5e10 display scale, labeled rows) |
| 13 | M2 Ex 2 | Could not complete: find XM "Rock"/"Roll" in the belt. Also "USA is dark" (night side) making the footprint unreadable. | TODO |

---

## P1 — Units and accessibility

- **Add miles everywhere, in parentheses.** Requested repeatedly and specifically: 10.7 km/s → mph;
  35,800 km → 22,245 mi; 420 km → 260 mi; 20,200 km → mi. Reviewer's framing: "for high school
  graduates".
- **Add a km↔miles toggle button** in the sims.
- Give 260 mi a familiar comparison (they supplied several: LA→Las Vegas 270 mi, NYC→Boston ~215–260 mi).
- Spell out that `,` and `.` change *playback* speed, "as if you are changing the speed of a video.
  The satellites themselves are not slowing down." Requested for M1; applies to every module.
- Define terms on first use, not later: **zenith**, **nadir**, **retrograde**, **epoch**, **drag term**,
  **gravity well**, **conic section**, **halo orbit**, **actuation axis**, **Lagrange point / L1**,
  **inclination (i)**, **period = time**, **axis = a line**.
- Show both **Δv** and **delta-v** the first time it appears (M4).

## P1 — Structure and pedagogy

- **Put "Key Points to Remember" *before* the "Module complete" banner** — "I looked below for review.
  A user would skip." **DONE in v5.2** (banner moved below summary and resources in all 8 worksheets).
- **Put PREDICT boxes before the answer text.** Raised twice; second time more sharply: "You just
  stated the answer to this… Is this prediction unnecessary and perhaps insulting to the reader? Do
  you have to have a prediction for each exercise?" → **not every exercise needs one**, and where one
  exists it must come first.
- **Not every exercise needs a simulator task.** Said three times, escalating to "not going to do it.
  Tired of this pointless exercise" (M4 Ex 24) and "this seems like an easy idea and not worth my
  time" (M4 Ex 19). Cut the make-work ones; keep the text.
- **Remove repeated sentences.** Flagged in M4 Ex 21, 23; M5 Ex 14; and generally "finding more and
  more examples of repeat sentences".
- **Reduce AI-sounding phrasing.** M4 Ex 24: "Rewrite so it doesn't sound like ai-generated". Also
  "Leave out 'in this module'? It sounds dumb and ai-generated."
- **Consistent terminology, and match the sim to the worksheet.** "If using 'what it sets' names in the
  doc, then use those names on the SIM. Otherwise the user spends wasted minutes searching."
- Drop the word **"honest"** for the ECI frame (used repeatedly; reviewer objected three times).
- Use **apogee/perigee = farthest/closest** consistently, not "high point/low point".
- Exercises flagged as **redundant**: M1 Ex 5 vs its Predict box; M4 Ex 10 (welcome repeat), Ex 13 vs 14.
- Exercises flagged as **not doable / to cut**: M3 Ex 12 (Tundra dwell), M4 Ex 16, 22, 24; M5 Ex 3 Predict.

## P2 — Wording (long tail)

Roughly 60 individual sentence edits, most with the reviewer's own replacement text supplied. They are
in the raw feedback and should be applied module by module. Notable ones with real content value:

- M1: "falling sideways" → reviewer wants "speeding sideways". **See DISAGREEMENTS below.**
- M1: the speed diagram needs only *half* the red dashed ellipse, "because it crashed!" — correct.
- M2: add an explicit box contrasting geostationary / geosynchronous / inclined geosync. Reviewer
  drafted it; also "inclined geosync = geosynchronous, so don't use the term".
- M2: state in the sim that **the red dots are the satellites**.
- M2: remind the reader Earth spins counter-clockwise viewed from the North Pole.
- M2 Key Points: expand the polar-orbit point to cover longitude coverage over 24 h vs 10–16 days.
- M3: "mean anomaly = average angular position in the orbital ellipse".
- M5: give Earth/Moon radius, Hill radius, mass ratio and density as a table (they supplied figures).
- M5/M6: always say **whose** Hill sphere.
- M5: explain sidereal (27.3 d) vs synodic (29.5 d) — reviewer noticed the apparent contradiction and
  worked out the answer themselves. Worth a short box.
- M6: give the fun origin of the name "halo orbit".


---

## P1 — Tedium has a measurable cause: the 1:1:1 pattern

The reviewer's fatigue is not vague. Counting every worksheet:

| Worksheet | Tasks | With a sim step | With a Predict box | Words |
|---|---|---|---|---|
| 1 | 21 | 21 | 18 | 9,345 |
| 2 | 15 | 15 | 15 | 7,379 |
| 3 | 13 | 13 | 13 | 7,525 |
| 4 | **24** | **24** | 19 | **13,430** |
| 5 | 16 | 16 | 16 | 9,212 |
| 6 | 15 | 15 | 15 | 11,207 |
| 7 | 20 | 20 | 20 | 9,418 |
| 8 | 18 | 18 | 18 | 12,192 |
| **Total** | **142** | **142** | **134** | **79,708** |

**Every task has a simulator step. Almost every task has a Predict box.** No exceptions anywhere in
the course. That mechanical uniformity is the tedium — the reader learns the rhythm in module 1 and
then grinds it 142 times. It also devalues the good sim exercises by burying them among filler, and it
produces the two specific complaints:

- *"Don't need to have a SIM for every exercise, especially when it is so obvious."*
- *"You just stated the answer to this… Is this prediction unnecessary and perhaps insulting to the
  reader? Do you have to have a prediction for each exercise?"*
- and finally, on M4 Ex 24: *"not going to do it. Tired of this pointless exercise."*

**Recommended cure — break the pattern deliberately, don't just trim words:**

1. **Drop the sim step where the point is conceptual.** Reviewer named M4 Ex 16, 19, 22, 24; M3 Ex 12;
   M4 Ex 2. Keep the prose — they explicitly asked to "keep this text and insert elsewhere".
2. **Drop the Predict box wherever the surrounding text already gives the answer** (M1 Ex 5, M5 Ex 3),
   and where one is kept, **put it before the answer**.
3. **Merge the acknowledged duplicates**: M4 Ex 13/14, and the repeated sentences in M4 Ex 21 and 23.
4. **Target module 4 first** — it is the longest (13,430 words, 24 tasks) and drew the most complaints.

Aim for roughly two thirds of tasks having a sim step and half having a Predict, chosen because they
earn it. That is a content-editing pass, not a mechanical one.

**Status: TODO.** Sequenced after the module-1 quiz repair, per owner decision.

---

## DISAGREEMENTS — do not apply these silently

### 1. L4/L5 stability: the reviewer's text uses the Coriolis force  — **RESOLVED, rewritten**

**Decision: inertial-frame trajectory, no pseudo-forces.** Rewritten to follow what the object
actually *does*: at L4 it is an ordinary satellite on a 27.3-day Earth orbit, 60° ahead of the Moon;
a nudge changes its period so it drifts along the Moon's orbit; the Moon's pull and Earth's pull then
bend that drift back, and it overshoots into a long slow loop — the tadpole. The hilltop/bowl framing
is gone entirely (0 mentions remain), since it was what invited the question. No pseudo-force terms
appear anywhere in worksheet 6. **DONE.**

Original conflict, for the record:

The reviewer supplied a clear, well-written explanation of why L4/L5 are stable despite being
hilltops — and it attributes the stability to **the Coriolis force**.

**This directly contradicts a standing project decision.** The owner ruled: *"no coriolis forces,
please! we've avoided all pseudo forces in this. I think we need to say the motion under the combined
forces drives a certain trajectory"* and *"it should all be apparent in the inertial frames."* The
current text was rewritten specifically to remove Coriolis.

The reviewer's underlying complaint is still valid — the present wording ("the stability lives in the
motion, not the terrain") did not land: *"also don't understand"*. So the passage needs to be
**clearer without reintroducing pseudo-forces**: describe the actual inertial-frame trajectory (a
tadpole loop) rather than naming a force in a rotating frame. **DECIDE / TODO.**

### 2. "Falling sideways"

The reviewer wants "falling sideways" changed to "speeding sideways" as "more accurate". I'd push back:
a satellite in orbit **is** in free fall — that is the whole Newtonian insight, and "falling sideways
fast enough to keep missing the Earth" is the standard framing for exactly this reason. "Speeding
sideways" loses the physics.

But their confusion is real and appears twice more (M1 Ex 6: "it isn't falling"). The fix is probably to
*keep* "falling" and add one sentence making the free-fall idea explicit — that the satellite is
falling the whole time, and gravity is what curves its path — rather than to remove the word. **DECIDE.**

### 3. "The Moon is less massive, so its orbits are slower"

Reviewer's rewrite of "the Moon is smaller, so its orbits are gentler and slower". Their version is
fine for *speed* but note the period depends on radius too, so "slower" alone is ambiguous. Prefer:
"the Moon's gravity is weaker, so a given orbit is slower — you circle low at ~1.6 km/s instead of
~7.7." **TODO (adopt with correction).**

### 4. Their answer-key additions are correct

Where the reviewer says an answer *should* mention satellite velocity (M3 Ex 4), they are right: the
orbit is set by Earth's mass **and** the satellite's velocity. Adopt.

---

## Already fixed before this review landed

- Hub text now reads "Finish all **eight**" (reviewer's copy said "six").
- `centred` → `centered`, 32 occurrences across 7 files. **DONE.**
- Key Points now precede the completion banner in all 8 worksheets.
- The `file://` texture failure that caused "my Earth lost its continents".
