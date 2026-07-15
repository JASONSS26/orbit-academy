/* Orbit Academy — course-wide FINAL EXAM.
   10 questions spanning all eight modules. a = correct index; why = shown on correct;
   feedback[k] = nudge shown when wrong option k is picked. Rendered by final.html. */
const EXAM = [
  { mod:'Module 1 · How Orbits Work',
    q:'What actually keeps a satellite in orbit?',
    opts:['There is no gravity in space, so it just floats',
          'It is falling toward Earth, but moving sideways fast enough that it keeps missing',
          'A motor runs constantly to hold it up',
          'It is beyond the reach of Earth’s gravity'],
    a:1, why:'An orbit is continuous free-fall: gravity pulls it down while its sideways speed carries it past the horizon, so it perpetually "misses" the Earth.',
    feedback:['Gravity is very much present in orbit — that’s what curves the path.','','Satellites coast engine-off; gravity does the work.','Low orbits are deep in Earth’s gravity, not beyond it.'] },

  { mod:'Module 2 · Angular Rates & Geosync',
    q:'A satellite in a retrograde orbit at GEO altitude (going the "wrong" way). How often does it pass over a given ground longitude?',
    opts:['Once a day (like a normal GEO sat)','Never — it stays fixed','About every 12 hours','It never returns to the same longitude'],
    a:2, why:'A retrograde GEO-altitude satellite moves west at the GEO rate while the Earth turns east at the same rate; they close on each other at twice that rate, so a fixed ground point is overflown about every 12 hours.',
    feedback:['A prograde geostationary sat hangs over one longitude; a retrograde one sweeps past it.','It moves relative to the ground — it doesn’t hover.','','Earth and the westbound sat close at 2× the GEO rate, so it recurs every ~12 h.'] },

  { mod:'Module 3 · Naming Orbits & TLEs',
    q:'Two satellites are in the exact same orbit but at different points along it. Which orbital element differs?',
    opts:['Semi-major axis','Eccentricity','Inclination','Mean anomaly (their position along the orbit)'],
    a:3, why:'Same orbit means same size, shape, and orientation — only the mean anomaly (where each sits along the path) differs.',
    feedback:['Same orbit → same semi-major axis (and hence same period).','Same orbit → same eccentricity.','Same orbit → same inclination.',''] },

  { mod:'Module 4 · Maneuvers & Perturbations',
    q:'You want to raise a circular orbit to a much higher circular orbit. What’s the efficient way?',
    opts:['One big radial (outward) burn','Burn prograde to raise the far side, then burn again at that high point to circularize (a two-step transfer)',
          'Point the thrusters straight up and hold','Slow down until you drift outward'],
    a:1, why:'Radial burns mostly waste fuel; the efficient route is a two-step tangential transfer — raise apogee with a prograde burn, then circularize at apogee.',
    feedback:['Radial burns are wasteful and just tilt the ellipse.','','You can’t "hold" against gravity with thrust; and radial thrust is inefficient.','Slowing down lowers the orbit, not raises it.'] },

  { mod:'Module 5 · xGEO / Cislunar & Frames',
    q:'The Earth–Moon L1 point sits where along the Earth–Moon line?',
    opts:['Exactly halfway between Earth and Moon','About 85% of the way from Earth to the Moon',
          'Just above Earth’s surface','Beyond the Moon, on the far side'],
    a:1, why:'Because the Moon is much lighter than Earth, the balance point is pushed far out toward it — L1 is ~85% of the way to the Moon, not the midpoint.',
    feedback:['It’s not the midpoint — the mass difference shoves it toward the Moon.','','L1 is far from Earth, out near the Moon.','That’s L2 (beyond the Moon); L1 is between them.'] },

  { mod:'Module 6 · Lagrange Points & Complex Orbits',
    q:'A halo orbit (like the NRHO that CAPSTONE/Gateway fly) is unusual because…',
    opts:['it is a perfect circle around the Moon','it circles an empty Lagrange point — it is not a Kepler ellipse and no TLE describes it',
          'it needs no navigation at all','it orbits the Sun directly'],
    a:1, why:'A halo loops around an empty balance point in the combined Earth+Moon field — non-Keplerian, no central body at the focus, and the whole family is set by essentially one parameter.',
    feedback:['It’s a lopsided 3-D loop, not a circle, and it’s around an empty point.','','Unstable points require regular station-keeping nudges.','It’s an Earth–Moon orbit, not a solar one.'] },

  { mod:'Module 6 · Chaos',
    q:'Why is keeping long-term custody of a cislunar object so much harder than a LEO satellite?',
    opts:['Cislunar objects are invisible','The chaotic Earth+Moon field amplifies tiny "where is it now" errors into huge future errors, so predictions go stale fast',
          'There is no gravity out there','They move faster than light'],
    a:1, why:'Cislunar dynamics are chaotic: small present-day uncertainties blow up quickly, so you must re-observe often to keep custody.',
    feedback:['They’re trackable — the problem is predicting them.','','Plenty of gravity — it’s the tangled, chaotic field.','Nothing moves near light speed; it’s sensitivity to initial conditions.'] },

  { mod:'Module 8 · Lunar Transfers',
    q:'To send a spacecraft from LEO to the Moon, why do you fire the departure burn well before the Moon is overhead?',
    opts:['To save fuel by burning at night','Because the coast takes days — you aim for where the Moon WILL BE, leading it like a receiver',
          'The Moon’s gravity would otherwise repel you','You don’t — you wait until the Moon is directly overhead'],
    a:1, why:'The trans-lunar coast takes several days, during which the Moon moves ~½ of the way around the sky; you launch toward the Moon’s future position, not its current one.',
    feedback:['Fuel cost doesn’t depend on time of day like that.','','Gravity attracts, never repels.','Aiming at where the Moon is now would miss — it will have moved on.'] },

  { mod:'Module 7 · Observability (radar)',
    q:'A radar’s returned echo weakens with target range as…',
    opts:['1/range','1/range² (like a star’s light)','1/range⁴ — out and back each cost range²','it doesn’t depend on range'],
    a:2, why:'The pulse spreads as 1/range² going out and the echo spreads as 1/range² coming back, so the received echo falls as 1/range⁴ — which is why radar owns LEO but fades at GEO and beyond.',
    feedback:['Far steeper than linear.','1/range² is one-way (a beacon); a radar echo is two-way.','','It depends very strongly — as the fourth power.'] },

  { mod:'Module 7 · Observability (optical)',
    q:'A single optical telescope image of a point of light gives you…',
    opts:['its exact distance but not its direction','its precise DIRECTION (RA/DEC) but no distance — you need parallax or radar for range',
          'its mass and composition','its full 3-D position instantly'],
    a:1, why:'Optical pins the sky angle precisely but carries no range from one frame; distance comes from parallax (the shift between two viewpoints) or from radar.',
    feedback:['It’s the reverse — direction is the strength, distance is missing.','','A position measurement doesn’t reveal mass or composition.','One image is a direction only; 3-D position needs a second measurement.'] },
];
if (typeof module !== 'undefined') module.exports = EXAM;
