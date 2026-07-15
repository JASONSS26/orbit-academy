/* Worksheet 7 — Lunar Transfers & Artemis (capstone piloting module).
   The student PLANS and FLIES a mission in the cockpit simulator (tut7.html). This session anchors
   on a Δv LOGBOOK: the student records the delta-v each maneuver costs and totals it against the
   budget — making "Δv is finite currency" concrete. Currently ships the GEO servicing mission
   (a clean two-burn Hohmann transfer); the lunar mission is in development. */
const WORKSHEET = {
  objectives: [
    'why every orbit change costs <b>delta-v (Δv)</b>, why Δv is a <b>finite budget</b>, and how to <b>keep a running Δv logbook</b> for a mission.',
    'how to <b>plan a two-burn transfer</b> from LEO up to GEO: raise apogee, then circularize — and compute the Δv each burn needs from the speeds involved.',
    'how to <b>fly the plan</b> in the cockpit: read the BURN-NOW cue, hold the right thruster to the target Δv, and use the <b>ILS-style</b> track + speed indicators.',
    'why <b>circularizing at GEO</b> costs so much (you arrive at apogee moving slowly and must speed up), and how the totals add up against your tank.',
  ],

  tutorial: [
    'This is the capstone: you stop <i>studying</i> orbits and <b>fly one</b>. Your mission — <b>service a satellite in geostationary orbit</b>. You start already parked in a 400 km low-Earth orbit (launch is automated); your job is to plan the transfer, then fly it from the cockpit.',
    'Everything hinges on <b>delta-v (Δv)</b> — the change in speed a burn produces, in m/s. It is the true <b>currency</b> of spaceflight: your spacecraft carries a finite tank, every maneuver has a price, and when the Δv runs out the mission is over. So a good pilot keeps a <b>logbook</b>: what each burn costs, and the running total against the budget.',
    { h:'The two-burn transfer to GEO' },
    'Moving to a much higher orbit is always a <b>two-step</b> maneuver (you met it in Module 4). First, <b>burn prograde</b> in LEO to stretch your orbit so its far side (apogee) reaches GEO altitude — you have raised the apogee but you are now on a long ellipse, not a circle. Second, when you coast up to that apogee you are moving <b>too slowly</b> to hold a circular orbit there, so you <b>burn prograde again</b> to speed up and <b>circularize</b>.',
    { analogy:'Think of it as two payments. Payment 1 buys the <b>climb</b> (raise apogee to GEO). Payment 2 buys the <b>circle</b> (match GEO’s speed once you arrive). Your logbook adds them up — and the total must fit your tank.' },
    'Here are the numbers you will confirm in the tool. In LEO you circle at <b>7.67 km/s</b>. To raise apogee to GEO you burn up to <b>10.07 km/s</b> — a Δv of about <b>2,400 m/s</b>. You then coast out to GEO, slowing to just <b>1.62 km/s</b> at apogee. GEO’s circular speed is <b>3.08 km/s</b>, so to circularize you must add about <b>1,460 m/s</b>. Total: roughly <b>3,860 m/s</b>.',
    { h:'Keep a Δv logbook (fill this in as you plan)' },
    { figure:'<svg viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg" style="max-width:520px"><style>text{font-family:monospace;font-size:13px;fill:#0a1a2e}</style><rect width="520" height="200" fill="#f4f7fb" stroke="#c6ccd4"/><line x1="0" y1="34" x2="520" y2="34" stroke="#1a4c8b" stroke-width="2"/><line x1="300" y1="0" x2="300" y2="200" stroke="#c6ccd4"/><line x1="410" y1="0" x2="410" y2="200" stroke="#c6ccd4"/><text x="12" y="23" font-weight="bold">Maneuver</text><text x="312" y="23" font-weight="bold">Δv (m/s)</text><text x="420" y="23" font-weight="bold">Running total</text><text x="12" y="60">1 · Raise apogee to GEO</text><text x="330" y="60">______</text><text x="440" y="60">______</text><text x="12" y="96">2 · Circularize at GEO</text><text x="330" y="96">______</text><text x="440" y="96">______</text><text x="12" y="140" font-weight="bold">MISSION TOTAL</text><text x="330" y="140">______</text><text x="12" y="176" fill="#5a6270">Budget: 4,000 m/s — did you stay under?</text></svg>', caption:'Your Δv logbook. Fill in each burn’s Δv from the planner, keep a running total, and check it against the 4,000 m/s budget. (Print this sheet, or jot it on paper.)'},
    'When your plan reaches GEO within budget, <b>load it into the cockpit and fly it</b>: at each burn the <b>🔴 BURN NOW</b> light flashes — hold the thruster until the "this burn Δv" readout hits your planned value, then release. The <b>ILS-style</b> panel shows if you are on-track (localizer) and on-speed (green dial) or need a forwards/backwards trim.',
  ],

  parts: [
    { title:'PART A · Δv as currency', blurb:'Why every maneuver has a price and the tank is finite.', tasks:['a1','a2'] },
    { title:'PART B · Plan the transfer & log the Δv', blurb:'Compute each burn, fill the logbook, check the budget.', tasks:['b1','b2','b3'] },
    { title:'PART C · Fly the mission', blurb:'Execute the burns with the BURN-NOW cue and the ILS indicators.', tasks:['c1','c2'] },
  ],

  tasks: [
    // ---- PART A ----
    { id:'a1', title:'Δv is the currency — and it’s finite',
      teach:[
        'Every time you fire a thruster you change your speed by some amount of <b>delta-v</b>. Your spacecraft launches with a fixed <b>Δv budget</b> (set by how much propellant it carries). Spend it wisely — a wasteful burn is Δv you will wish you had later, and when the tank hits zero the mission ends where it is.',
        'That is why we keep a <b>logbook</b>: list each planned maneuver, its Δv cost, and a running total. If the total exceeds the budget, the plan is impossible — you must find a cheaper route before you ever light the engine.',
      ],
      predict:'Before any numbers: do you think it costs MORE Δv to (a) raise your orbit’s far side up to GEO, or (b) circularize once you get there? Or about the same?',
      do:'Open the <b>🛠 Service a GEO satellite</b> mission in the planner (press 🗺 PLAN in the tool). Read the mission objective and your Δv budget.',
      observe:'the mission has a fixed Δv budget (4,000 m/s), and the plan will be rejected if your two burns add up to more than that. Δv is a hard currency, not an afterthought.',
      think:[
        'Why does a finite Δv budget make planning a mission a real constraint, not a formality?',
        'What happens to a mission that runs out of Δv partway through?',
        'Why keep a running total rather than just the final number?',
      ],
      quiz:{ q:'What is delta-v (Δv), and why does it matter so much?',
        opts:['The distance to the target orbit','The change in speed a burn produces — the finite "currency" of a mission; run out and the mission is over',
              'The time a transfer takes','The mass of the spacecraft'],
        a:1, why:'Correct — Δv measures how much velocity change your propellant can buy. It is finite, every maneuver spends some, and when it’s gone the mission ends.',
        feedback:['Δv is a speed change, not a distance.','','Δv is not time — though bigger transfers often cost both.','Mass sets how much Δv you get, but Δv itself is the velocity change.'] } },

    { id:'a2', title:'Start your logbook',
      teach:[
        'A Δv logbook is just a running tally: one row per maneuver, its Δv, and the cumulative total. For this mission there are exactly <b>two</b> burns — raise apogee, then circularize — so your logbook has two rows plus a total.',
        'You will fill in the actual numbers in Part B as you plan each burn. For now, set up the table (in the tutorial above, or on paper) and note the budget you must stay under.',
      ],
      predict:'How many burns do you expect a LEO→GEO transfer to take? Jot your guess and the reason.',
      do:'Copy the Δv logbook table from the tutorial (or print this worksheet). Label two rows — "raise apogee to GEO" and "circularize at GEO" — plus a MISSION TOTAL row, and write the budget (4,000 m/s) at the bottom.',
      observe:'a LEO→GEO transfer is a two-burn maneuver, so your logbook needs two entries and a total. Everything you plan next fills this in.',
      think:[
        'Why exactly two burns for this transfer (what does each one accomplish)?',
        'What would a THIRD burn be for, and why doesn’t a simple GEO transfer need one?',
        'How will the running total tell you, before you fly, whether the mission is affordable?',
      ],
      quiz:{ q:'How many burns does a LEO→GEO Hohmann transfer take, and what does each do?',
        opts:['One burn that does everything','Two: (1) raise apogee to GEO, then (2) circularize at GEO',
              'Three: raise, coast, and descend','It varies randomly'],
        a:1, why:'Correct — burn 1 stretches the orbit so apogee reaches GEO; burn 2, at that apogee, speeds you up to circular GEO speed. Two entries in your logbook.',
        feedback:['A single burn leaves you on an ellipse, not a circle at GEO.','','No third burn is needed for a simple two-impulse transfer.','It’s a definite two-burn maneuver, not random.'] } },

    // ---- PART B ----
    { id:'b1', title:'Burn 1 — raise apogee to GEO (log the Δv)',
      teach:[
        'In LEO you circle at <b>7.67 km/s</b>. To stretch your orbit so its apogee reaches GEO, you burn <b>prograde</b> until your speed at this low point is about <b>10.07 km/s</b>. The Δv you spent is the difference: 10.07 − 7.67 ≈ <b>2.40 km/s = 2,400 m/s</b>.',
        'Notice you are now on a tall, stretched ellipse — perigee still down at LEO, apogee way up at GEO. You have not arrived yet; you will coast up to apogee over the next few hours.',
      ],
      predict:'You’re at 7.67 km/s and need to reach 10.07 km/s at the burn point. What Δv is that — and will your speed later go up or down as you coast out to apogee?',
      do:'In the planner’s <b>STEP 1</b>, type Δv values into "Your Δv₁" until "raises apogee to" reads ~42,000 km (GEO). Record the Δv you needed in your logbook’s row 1.',
      observe:'about 2,400 m/s of prograde Δv raises apogee to GEO. Log it as burn 1. As you then coast outward, your speed drops (you’re trading speed for altitude) — you’ll arrive at apogee moving only ~1.6 km/s.',
      think:[
        'Why is Δv here just the difference between your new speed and your old speed?',
        'Why does your speed DROP as you coast from perigee out to apogee?',
        'If you overshoot (apogee past GEO), did you spend too much or too little Δv?',
      ],
      quiz:{ q:'You raise your LEO speed from 7.67 to 10.07 km/s to reach GEO apogee. What Δv did burn 1 cost?',
        opts:['About 250 m/s','About 2,400 m/s','About 10,000 m/s','About 42,000 m/s'],
        a:1, why:'Correct — Δv is the change in speed: 10.07 − 7.67 = 2.40 km/s = 2,400 m/s. Log that as burn 1.',
        feedback:['Too small — recompute 10.07 − 7.67 km/s.','','That’s roughly your speed, not the change in it.','42,000 km is the GEO radius (a distance), not a Δv.'] } },

    { id:'b2', title:'Burn 2 — circularize at GEO (log the Δv)',
      teach:[
        'You coast up to GEO apogee, slowing all the way, and arrive moving just <b>1.62 km/s</b>. But a <b>circular</b> orbit at GEO needs <b>3.08 km/s</b>. You are going too slow to hold that altitude — left alone you would fall back toward Earth. So you burn <b>prograde</b> again to speed up to circular speed.',
        'The Δv is the difference: 3.08 − 1.62 ≈ <b>1.46 km/s = 1,460 m/s</b>. That is a big second payment — and it surprises people, because you are "already there." The reason: arriving slow means a large speed gap to close.',
      ],
      predict:'You arrive at GEO going 1.62 km/s but need 3.08 km/s to circularize. Predict the Δv — and whether burn 2 is bigger or smaller than you’d guess.',
      do:'In the planner’s <b>STEP 2</b>, type Δv values into "Your Δv₂" until "your new speed" matches the circular speed shown (~3.08 km/s). Record the Δv in logbook row 2, then write the MISSION TOTAL and compare to the 4,000 m/s budget.',
      observe:'circularizing costs ~1,460 m/s — nearly as much as the raise burn — because you arrive at apogee moving slowly and must close a big speed gap. Total ≈ 3,860 m/s, just under the 4,000 m/s budget.',
      think:[
        'Why is the circularize burn so large, even though you’re "already at GEO"?',
        'What is your two-burn total, and how much margin does it leave against the budget?',
        'If you skipped burn 2 entirely, what would happen to your spacecraft?',
      ],
      quiz:{ q:'You arrive at GEO apogee at 1.62 km/s but need 3.08 km/s to circularize. What Δv is burn 2?',
        opts:['About 1,460 m/s','About 100 m/s','About 3,080 m/s','Zero — you’re already at GEO'],
        a:0, why:'Correct — 3.08 − 1.62 = 1.46 km/s = 1,460 m/s. Nearly as costly as the raise burn, because you arrive moving slowly and must close a big speed gap.',
        feedback:['','Far too small — you must close a 1.46 km/s gap.','That’s the target speed, not the change needed.','Without it you’d fall back — being at GEO altitude isn’t enough; you must match GEO speed.'] } },

    { id:'b3', title:'Total the logbook & check the budget',
      teach:[
        'Now add your two entries. Burn 1 (~2,400 m/s) + burn 2 (~1,460 m/s) ≈ <b>3,860 m/s</b>. Your budget is <b>4,000 m/s</b>, so you have ~140 m/s of margin — enough to fly, with a little slack for trim corrections.',
        'This is the payoff of the logbook: <b>before</b> lighting the engine you know the mission is affordable. If your total had come out over 4,000, you’d need a cheaper plan (or accept the mission is impossible with this tank).',
      ],
      predict:'Add your two logged burns. Do you come in under the 4,000 m/s budget? By how much?',
      do:'Sum your logbook. In the planner, confirm "total Δv" reads about 3,860 / 4,000 m/s and the verdict says the plan is on target. Use <b>✨ solve it for me</b> to check your numbers if needed.',
      observe:'the two burns total ~3,860 m/s, just inside the 4,000 m/s budget — so the plan is flyable. The logbook told you this before you ever fired the engine.',
      think:[
        'How much Δv margin do you have, and why is having some slack a good idea?',
        'What could you do if your plan came out OVER budget?',
        'Why is it striking that reaching GEO costs nearly 3,900 m/s — more than the speed of a rifle bullet, spent as orbit changes?',
      ],
      quiz:{ q:'Your logbook totals ~3,860 m/s against a 4,000 m/s budget. What does that tell you?',
        opts:['The mission is impossible','The mission is affordable, with ~140 m/s of margin to spare',
              'You need a third burn','You have twice the Δv you need'],
        a:1, why:'Correct — under budget with ~140 m/s to spare, so the plan is flyable and leaves a little slack for trim corrections.',
        feedback:['It’s under budget — the mission is affordable.','','Two burns suffice for a GEO transfer.','The margin is thin (~140 m/s), not double.'] } },

    // ---- PART C ----
    { id:'c1', title:'Fly it — hold each burn to its logged Δv',
      teach:[
        'With a good plan, click <b>✈ load into cockpit & fly</b>. The mission runs on a time-warped clock: it fast-forwards the coast and eases to real time as each burn approaches. When the <b>🔴 BURN NOW</b> light flashes, <b>hold the correct thruster</b> — the "this burn Δv" readout climbs; release when it reaches your logged value.',
        'For this transfer both burns are <b>FORWARDS</b> (prograde). Burn 1 (~2,400 m/s) leaves LEO; hours later, at apogee, burn 2 (~1,460 m/s) circularizes. Watch your logbook come to life.',
      ],
      predict:'When BURN NOW flashes for burn 1, which thruster do you hold, and to what Δv value?',
      do:'Fly the mission. At the first BURN NOW, hold <b>FORWARDS</b> until the this-burn Δv reaches ~2,400 m/s; release. Coast to apogee; at the second BURN NOW, hold <b>FORWARDS</b> to ~1,460 m/s. Compare what you actually spent to your logbook.',
      observe:'holding FORWARDS to the logged Δv at each cue executes the plan; the total you actually spend should match your logbook (± a little). Over- or under-burning shows up immediately on the nav track.',
      think:[
        'Why is precise release timing important — what does over-burning burn 1 do to your apogee?',
        'How closely did your actual Δv match your planned logbook values?',
        'Why does the sim fast-forward the coast but slow down for the burns?',
      ],
      quiz:{ q:'At the first BURN NOW cue for the LEO→GEO transfer, what do you do?',
        opts:['Hold BACKWARDS (retrograde) briefly','Hold FORWARDS (prograde) until the this-burn Δv reaches your planned ~2,400 m/s, then release',
              'Do nothing and wait','Hold UPWARDS (radial) to push outward'],
        a:1, why:'Correct — burn 1 is a prograde (FORWARDS) burn of ~2,400 m/s to raise apogee to GEO. Hold FORWARDS, watch the readout, release at your logged value.',
        feedback:['BACKWARDS would lower your orbit — the wrong way.','','Missing the burn window leaves you stuck in LEO.','A radial (UPWARDS) burn mostly rotates the orbit and shifts the high/low points — it won’t efficiently raise apogee to GEO.'] } },

    { id:'c2', title:'Read the ILS — on-track and on-speed',
      teach:[
        'The <b>ILS-style</b> panel (borrowed from aircraft landing aids) tells you at a glance whether you are flying the plan. The <b>localizer</b> needle on top shows if your path is left or right of the planned track — centered is good. The <b>speed dial</b> below compares your speed to the <b>circular speed at your current altitude</b> — the speed you would need to hold a perfect circle right where you are: the needle sits in the green center when you are on that circular speed, and swings into red <b>TOO SLOW</b> or <b>TOO FAST</b> zones when you need a forwards or backwards trim.',
        'Green dial + centered needle = you are on a clean circular orbit at this radius. If the dial reads TOO SLOW, a short <b>FORWARDS</b> burn nudges it back; TOO FAST, a short <b>BACKWARDS</b> burn. Small trims, watching the needle re-center.',
      ],
      predict:'If your speed dial needle sits in the red "TOO SLOW" zone, which thruster do you tap to fix it?',
      do:'While flying, watch the ILS cluster (bottom-right). After your circularize burn, check the localizer (on-track?) and the speed dial (green?). Apply small FORWARDS/BACKWARDS trims to center them.',
      observe:'the localizer shows cross-track error and the dial shows speed vs. the circular speed here; small FORWARDS (speed up) or BACKWARDS (slow down) trims re-center them. Green + centered means you’re on a clean circular orbit.',
      think:[
        'What does the localizer needle tell you that the speed dial does not?',
        'Why compare your speed to the circular speed at your current radius (rather than a fixed target number)?',
        'How is this like an aircraft’s instrument landing system on final approach?',
      ],
      quiz:{ q:'The ILS speed dial needle is in the red "TOO SLOW" zone. What do you do?',
        opts:['Hold BACKWARDS to slow down more','Tap FORWARDS (prograde) to speed up and bring the needle back to green',
              'Ignore it','Change your plan'],
        a:1, why:'Correct — TOO SLOW means you’re below the circular speed for this altitude, so a short FORWARDS (prograde) burn speeds you up and re-centers the needle. TOO FAST would call for a brief BACKWARDS trim.',
        feedback:['BACKWARDS would slow you further — the wrong way.','','A red needle means you’re off circular speed; trim it.','Your orbit is fine; you just need a small trim burn.'] } },
  ],

  summary: [
    'Your mission was to <b>service a GEO satellite</b>, starting from LEO — planned, then flown from the cockpit.',
    '<b>Delta-v (Δv)</b> is the finite currency of spaceflight. A <b>Δv logbook</b> — each burn’s cost and a running total — tells you before you fly whether a mission fits the tank.',
    'A LEO→GEO transfer is a <b>two-burn</b> maneuver: burn 1 raises apogee to GEO (~<b>2,400 m/s</b>); burn 2 circularizes at GEO (~<b>1,460 m/s</b>). Total ≈ <b>3,860 m/s</b>, inside a 4,000 m/s budget.',
    'Circularizing costs a lot because you arrive at apogee moving slowly (1.6 km/s) and must speed up to GEO’s 3.1 km/s.',
    'You <b>fly the plan</b> by holding the right thruster to each logged Δv at the <b>BURN NOW</b> cue, using the <b>ILS-style</b> localizer (on-track?) and speed dial (on-speed?) to stay on the planned trajectory.',
  ],

  resources: [
    { t:'Hohmann transfer orbit — Wikipedia', u:'https://en.wikipedia.org/wiki/Hohmann_transfer_orbit', note:'the efficient two-burn transfer you flew' },
    { t:'Delta-v budget — Wikipedia', u:'https://en.wikipedia.org/wiki/Delta-v_budget', note:'how missions tally Δv, just like your logbook' },
    { t:'Geostationary transfer orbit (GTO) — Wikipedia', u:'https://en.wikipedia.org/wiki/Geostationary_transfer_orbit' },
    { t:'Orbital station-keeping — Wikipedia', u:'https://en.wikipedia.org/wiki/Orbital_station-keeping' },
    { t:'Instrument landing system (the ILS metaphor) — Wikipedia', u:'https://en.wikipedia.org/wiki/Instrument_landing_system' },
    { t:'On-orbit satellite servicing — Wikipedia', u:'https://en.wikipedia.org/wiki/On-orbit_servicing' },
  ],

  exam: [
    { q:'What is a Δv logbook and why keep one?',
      opts:['A record of the spacecraft’s mass','A running tally of each maneuver’s Δv and the total, so you know before flying whether the mission fits the finite budget',
            'A log of the crew’s hours','A list of ground stations'],
      a:1, why:'Correct — the logbook sums each burn’s Δv against the budget, telling you up front whether the plan is affordable.',
      feedback:['Mass matters but that’s not the logbook.','','Not crew hours — it tracks Δv.','Not ground stations — it tracks the Δv budget.'] },
    { q:'A LEO→GEO transfer takes how many burns, and what does each accomplish?',
      opts:['One burn for everything','Two: raise apogee to GEO, then circularize at GEO','Three burns','None — you coast the whole way'],
      a:1, why:'Correct — burn 1 raises apogee to GEO; burn 2 circularizes there. Two logbook entries.',
      feedback:['One burn leaves you on an ellipse.','','A simple transfer needs only two.','Coasting alone never circularizes you at GEO.'] },
    { q:'Raising your LEO speed from 7.67 to 10.07 km/s to reach GEO apogee costs about…',
      opts:['250 m/s','2,400 m/s','10,000 m/s','42,000 m/s'],
      a:1, why:'Correct — Δv = 10.07 − 7.67 = 2.40 km/s = 2,400 m/s.',
      feedback:['Too small.','','That’s a speed, not a change in speed.','That’s the GEO radius in km.'] },
    { q:'You arrive at GEO apogee at 1.62 km/s but need 3.08 km/s to circularize. Why is that circularize burn so large (~1,460 m/s)?',
      opts:['GEO has extra gravity','You arrive moving slowly, so there’s a big speed gap to close to reach circular speed',
            'The spacecraft is heavier there','It isn’t large — it’s tiny'],
      a:1, why:'Correct — coasting out to apogee slows you to 1.62 km/s, so you must add ~1.46 km/s to reach GEO’s 3.08 km/s circular speed.',
      feedback:['Gravity is weaker at GEO, not extra.','','Mass doesn’t change with altitude.','It’s large — nearly as big as the raise burn.'] },
    { q:'While flying, the ILS speed dial reads "TOO FAST." What trim burn fixes it?',
      opts:['A short FORWARDS (prograde) burn','A short BACKWARDS (retrograde) burn to slow down and re-center the needle',
            'An UPWARDS (radial) burn','No burn — speed can’t be trimmed'],
      a:1, why:'Correct — TOO FAST means above the circular speed for this altitude, so a brief BACKWARDS (retrograde) burn slows you and brings the dial back to green.',
      feedback:['FORWARDS speeds you up — the wrong way when already too fast.','','A radial (UPWARDS) burn mostly reshapes the orbit, it won’t trim your speed to circular.','Speed is exactly what forwards/backwards trims adjust.'] },
  ],
};
if (typeof module !== 'undefined') module.exports = WORKSHEET;
