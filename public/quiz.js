/* Tutorial registry + quizzes for Orbit Academy.
   Each tutorial: {tool, blurb, steps:[guided actions], quiz:[{q, opts, a, why, feedback:[per-option]}]}.
   - steps: an ordered "do this, then this" exercise that sets up the thinking for the quiz.
   - quiz: multiple choice. a=correct index. why=confirmation shown on correct.
     feedback[i]=guidance shown when the learner picks wrong option i (nudges thinking).
   Learners retry each question with unlimited attempts until correct.
   The server independently records the score and enforces prerequisites, so the client
   cannot unlock ahead by tampering. */
const TUTORIALS = {
  t6: {
    worksheet: 'worksheet6.html',   // Module 6 — Lagrange Points & Complex Orbits
    tool: 'tut6.html',
    blurb: 'The five Lagrange points, halo orbits, orbital resonance (TESS), and cislunar chaos.',
  },
  t5: {
    worksheet: 'worksheet5.html',   // Module 5 — xGEO / Cislunar Space
    tool: 'tut5.html',
    blurb: 'The Earth–Moon–Sun system, reference frames, Lagrange points, xGEO, and lunar transfers.',
  },
  t4: {
    worksheet: 'worksheet4.html',   // Module 4 — Maneuvers & Perturbations
    tool: 'tut4.html',
    blurb: 'Δv burns, GTO→GEO transfers, drag, radiation pressure, and sun-synchronous orbits.',
  },
  t3a: {
    worksheet: 'worksheet3a.html',  // Module 3 — Naming Orbits & TLEs
    tool: 'tut3a.html',
    blurb: 'The six Keplerian elements, TLEs, and why orbits like Molniya are chosen.',
  },
  t2: {
    worksheet: 'worksheet2.html',   // Module 2 — Angular Rates & Geosync
    tool: 'tut2.html',
    blurb: 'Angular rates and the geosynchronous belt.',
  },
  t1: {
    worksheet: 'worksheet1.html',   // opens the interactive worksheet in its own window
    tool: 'tut1.html',
    blurb: 'This is a hands-on orbit lab. Work through the guided steps below in the tool, thinking about what you see, then take the quiz. You can retry any question until you get it — the point is understanding, not speed.',
    steps: [
      '<b>Start with scale.</b> Only the Space Station (ISS, 420 km) is a real place people live. Notice on the to-scale globe it <b>skims just above the surface</b> — its altitude is only ~7% of Earth’s radius. Space is closer than most people think.',
      '<b>How far is “overhead”?</b> When the ISS passes directly over your head, it’s only ~420 km (~260 miles) away — about a DC-to-New-York hop, straight up. Keep that in mind for the quiz.',
      '<b>Speed ladder at 600 km.</b> Set release altitude to <b>600 km</b>. Start speed low, around <b>4.5 km/s</b>, and inject. The orbit is a steep ellipse whose far side plunges below the surface — it <b>smashes into Earth</b> (a suborbital lob).',
      'Nudge the speed up and inject again each time: 6, 7, 7.4 km/s. The crash point rises but it still re-enters — you’re not going fast enough to “fall around” the Earth yet.',
      'Reach <b>~7.56 km/s</b> (the “≈ circular” label). Now it’s a clean <b>circle</b> — the object falls toward Earth exactly as fast as the curved-away horizon drops. That’s what an orbit really is: perpetual falling that keeps missing.',
      'Go <b>faster</b> — 8.5, 9.5 km/s. Now your release point is the <b>perigee</b> and the far side balloons out into a tall <b>ellipse</b>. Past ~10.7 km/s it escapes entirely.',
      'Set <b>tangential speed</b> to the circular value at 1000 km and click <b>INJECT OBJECT</b>. You get a circle — the object holds a constant altitude.',
      'Now drag the speed <b>slower</b> by ~1 km/s and inject again. Watch where the orbit goes: your release point stays put, but the far side drops <i>lower</i>. Your release point is now the <b>apogee</b> (farthest point).',
      'Drag the speed <b>faster</b> than circular and inject. Now the far side climbs <i>higher</i> — your release point became the <b>perigee</b> (closest point).',
      'Click <b>“inject a fan (7 speeds)”</b>. All 7 objects share your release point but reach very different distances. Slower → tight inner ellipse; faster → big outer ellipse.',
      'Watch a single elliptical object’s marker as it goes around. <b>Notice it speeds up near perigee (close to Earth) and slows down near apogee (far away).</b> Keep this in mind for the quiz.',
      'Turn on the <b>real constellations</b> (LEO, GPS, GEO). Notice the far-out GEO satellites move slowly around their big circle, while low LEO whips around fast.',
    ],
    quiz: [
      { q: 'The Space Station orbits at about 420 km altitude. On the to-scale globe, that means it…',
        opts: ['Orbits far out, roughly a third of the way to the Moon',
               'Skims just above the surface — its altitude is only ~7% of Earth’s radius',
               'Sits at the same height as GPS satellites',
               'Is beyond the GEO belt'],
        a: 1,
        why: 'Correct. At 420 km the ISS hugs the surface — barely a fingernail’s width above the globe at true scale. “Space” starts much closer than most people picture.',
        feedback: [
          'Look at the to-scale globe: the ISS ring is right against the surface, nowhere near the Moon (which is ~60 Earth-radii away). Its altitude is only ~7% of one Earth radius.',
          '',
          'GPS is at 20,200 km — about 48× higher than the ISS. Toggle both and compare; the ISS is the one hugging the surface.',
          'GEO (35,786 km) is the far ring. The ISS is the innermost, skimming the surface.'
        ] },
      { q: 'When the Space Station passes directly overhead, roughly how far from you is it? (It’s at ~420 km / ~260 miles altitude.)',
        opts: ['About the distance from Washington DC to Arlington (~5 miles)',
               'About the distance from Washington DC to New York City (~200 miles)',
               'About the distance from Washington DC to Los Angeles (~2,300 miles)',
               'About the distance to the Moon (~240,000 miles)'],
        a: 1,
        why: 'Correct. Straight up, the ISS overhead is only ~260 miles away — a DC-to-NYC hop, just vertical. People are astonished how close “space” is.',
        feedback: [
          'Too close — 5 miles is across town. The ISS is ~260 miles up, more like a trip to another city.',
          '',
          'Too far — LA is ~2,300 miles. The ISS overhead is ~260 miles up, roughly DC-to-NYC.',
          'Way too far — the Moon is ~240,000 miles, about 900× farther. The ISS is only ~260 miles up.'
        ] },
      { q: 'At 600 km altitude you inject an object moving only 4.5 km/s (well below the ~7.6 km/s circular speed). What happens?',
        opts: ['It settles into a slightly lower circular orbit',
               'It follows an ellipse whose far side dips below the surface — it crashes back into Earth',
               'It escapes to deep space',
               'It hovers at 600 km'],
        a: 1,
        why: 'Correct. Too slow to “fall around” the Earth, the object traces an ellipse whose perigee is underground — a suborbital lob that re-enters. You need ~7.6 km/s at this altitude to sustain a circular orbit.',
        feedback: [
          'Too slow to hold ANY orbit at 600 km — it doesn’t circularize lower, it falls back. Re-run the speed ladder starting at 4.5 km/s.',
          '',
          'Escape needs ~10.7 km/s — the opposite extreme. At 4.5 km/s it’s far too slow and falls back to Earth.',
          'Nothing hovers in orbit — you’re always falling. Too slow means you fall INTO the Earth. Try the 4.5 km/s injection.'
        ] },
      { q: 'You release an object moving SLOWER than the local circular speed. Where is your release point on the resulting orbit?',
        opts: ['Perigee (closest point)', 'Apogee (farthest point)', 'It stays a circle', 'The object escapes'],
        a: 1,
        why: 'Right. Removing speed means the object can’t maintain that altitude, so it falls inward on the far side — making your release point the highest point, the apogee.',
        feedback: [
          'Think again: if you slow down, do you climb higher or fall lower on the far side? A slower-than-circular object falls inward, so the point you left is the HIGH point.',
          '', // correct
          'Only the exact circular speed gives a circle. You went slower than circular, so the shape changed — re-run step 2 and watch the far side.',
          'Escape needs ~11.2 km/s (much faster, not slower). Slower than circular does the opposite — it drops the far side. Re-run step 2.'
        ] },
      { q: 'On an elliptical orbit, WHERE does the object move fastest?',
        opts: ['At apogee (farthest from Earth)', 'At perigee (closest to Earth)', 'Same speed everywhere', 'At the exact midpoint'],
        a: 1,
        why: 'Correct — this is Kepler’s 2nd law. Deeper in Earth’s gravity well (perigee), the object trades altitude for speed and moves fastest; far away at apogee it slows down. Watch it again in step 5 to confirm.',
        feedback: [
          'That’s the opposite. Re-watch step 5: as the marker swings close to Earth it visibly speeds up; way out at apogee it crawls. Fastest = closest = perigee.',
          '',
          'Only a perfect circle has constant speed. On an ellipse the speed clearly changes — watch the marker in step 5 near Earth vs. far away.',
          'The speed doesn’t peak at the midpoint — it peaks at the closest approach (perigee). Re-watch step 5.'
        ] },
      { q: 'Looking down from above Earth’s North Pole, Earth spins counter-clockwise. An orbit that travels the SAME direction (counter-clockwise) is called:',
        opts: ['Retrograde', 'Prograde', 'Polar', 'Geostationary'],
        a: 1,
        why: 'Correct. Prograde = same direction as Earth’s rotation (CCW from the North Pole). It’s the default for launches because you start with Earth’s eastward spin, saving fuel. Retrograde is the opposite direction and costs more to reach.',
        feedback: [
          'That’s the opposite. Retrograde means going AGAINST Earth’s spin. Same-direction-as-Earth is the other term — starts with "pro".',
          '',
          'Polar orbits go over the poles (north–south), which is a different property from which way around (east–west) you travel. Same-as-Earth-spin is the term starting with "pro".',
          'Geostationary is a specific altitude/period, not a direction. The word for "same direction as Earth’s spin" starts with "pro".'
        ] },
      { q: 'Compared to a low satellite (LEO), a satellite far out at GEO moves…',
        opts: ['Faster', 'Slower', 'At the same speed', 'Backwards'],
        a: 1,
        why: 'Correct. The farther from the attracting mass, the slower the circular orbit speed (LEO ≈ 7.6 km/s; GEO ≈ 3.1 km/s). That’s why GEO takes a full day to circle while LEO takes ~90 minutes.',
        feedback: [
          'Look at the constellations in the tool: the far GEO ring moves slowly; the low LEO ring whips around. Farther out = slower.',
          '',
          'They’re quite different — LEO ≈ 7.6 km/s vs GEO ≈ 3.1 km/s. Farther out is slower. Toggle the constellations and watch.',
          'They all orbit the same direction (prograde). The real difference is speed: farther out is slower.'
        ] },
      { q: 'Why do rockets headed to low-inclination orbits launch EASTWARD from Florida?',
        opts: ['The Atlantic is calmer than the Pacific',
               'Launching east adds Earth’s eastward rotation speed, giving free velocity toward orbit',
               'Florida is closer to the equator so gravity is weaker',
               'It keeps the rocket over land for tracking'],
        a: 1,
        why: 'Correct. The ground itself is moving east at up to ~0.46 km/s near the equator. Launching east banks that speed for free, so the rocket needs less of its own fuel to reach orbital velocity.',
        feedback: [
          'Ocean conditions aren’t the reason. Think about which way the Earth spins and how that could give the rocket a free head start.',
          '',
          'Gravity barely changes with latitude. The real east-vs-west reason is the Earth’s rotation adding velocity — which way does it spin?',
          'Rockets actually launch out over open water for safety. The reason to go EAST specifically is Earth’s eastward spin giving free speed.'
        ] },
      { q: 'Why are polar orbits launched from Vandenberg (California) toward the SOUTH, not from Florida?',
        opts: ['California weather is better for launches',
               'A due-south launch from Vandenberg flies over open ocean, avoiding populated areas',
               'Polar orbits must launch westward',
               'Vandenberg is at a higher elevation'],
        a: 1,
        why: 'Correct. A polar orbit needs a north–south launch. From Vandenberg, launching south goes straight out over the Pacific; the same heading from Florida would fly over populated land. Safety sets the launch site.',
        feedback: [
          'Weather isn’t the driver. Think about what’s underneath the rocket’s path for a north–south launch from each coast.',
          '',
          'Polar orbits launch north or south, not west. The site choice is about what the rocket flies OVER — populated land vs. open ocean.',
          'Elevation isn’t the reason. It’s about launching over ocean (safe) vs. over populated land.'
        ] },
    ],
  },
  // t3b, t4, t5 added as their tools are built.
};
