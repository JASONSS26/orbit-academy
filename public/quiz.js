/* Tutorial registry for Orbit Academy.
   Each module: {worksheet, tool, blurb}. Every module is worksheet-driven: the hub opens the
   worksheet in its own window, and the worksheet (worksheet-engine.js) runs the exercises,
   check questions, and final quiz. The server independently records completion and enforces
   prerequisites, so the client cannot unlock ahead by tampering. */
const TUTORIALS = {
  t1: {
    worksheet: 'worksheet1.html',   // Module 1 — How Orbits Work
    tool: 'tut1.html',
    blurb: 'What an orbit is: circular/elliptical orbits, speed vs. altitude, prograde/retrograde, and launch geography.',
  },
  t2: {
    worksheet: 'worksheet2.html',   // Module 2 — Angular Rates & Geosync
    tool: 'tut2.html',
    blurb: 'Angular rates and the geosynchronous belt.',
  },
  t3: {
    worksheet: 'worksheet3.html',   // Module 3 — Naming Orbits & TLEs
    tool: 'tut3.html',
    blurb: 'The six Keplerian elements, TLEs, and why orbits like Molniya are chosen.',
  },
  t4: {
    worksheet: 'worksheet4.html',   // Module 4 — Maneuvers & Perturbations
    tool: 'tut4.html',
    blurb: 'Δv burns, GTO→GEO transfers, drag, radiation pressure, and sun-synchronous orbits.',
  },
  t5: {
    worksheet: 'worksheet5.html',   // Module 5 — xGEO / Cislunar Space
    tool: 'tut5.html',
    blurb: 'The Earth–Moon–Sun system, reference frames, Lagrange points, xGEO, and lunar transfers.',
  },
  t6: {
    worksheet: 'worksheet6.html',   // Module 6 — Lagrange Points & Complex Orbits
    tool: 'tut6.html',
    blurb: 'The five Lagrange points, halo orbits, orbital resonance (TESS), and cislunar chaos.',
  },
  t7: {
    worksheet: 'worksheet7.html',   // Module 7 — Observability
    tool: 'tut7.html',
    blurb: 'Radar (range⁴), optical reflected-sunlight, thermal-IR, custody & cadence, RA/DEC, parallax, and intent.',
  },
  t8: {
    worksheet: 'worksheet8.html',   // Module 8 — Lunar Transfers & Artemis (capstone flight sim)
    tool: 'tut8.html',
    blurb: 'Fly an Artemis-class mission: plan the burns, then fly the cockpit to GEO — and graduate to the Moon.',
  },
};
