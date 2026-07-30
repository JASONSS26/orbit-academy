/* tut5-lead-angle.test.js — the trans-lunar lead angle, and which way "too little" goes.

   WHY THIS EXISTS
   The external reviewer flagged module 5's lead-angle passage as reversed:

     "Text says 'too little lead and you get there early… too much and the Moon has already swept
      past.' Backwards. Too little lead => you arrive late, behind the Moon."

   I accepted that and rewrote the passage. The reviewer was WRONG, and the original text was right,
   so the "fix" put a physics error into the course. This test exists so that never happens again:
   it derives the answer from the simulator's OWN constants instead of from anyone's intuition, then
   checks the worksheet prose agrees.

   THE GEOMETRY
   You burn at perigee; your apogee is half a turn — 180° — away on the far side of Earth. The lead
   angle is how far AHEAD OF YOUR LAUNCH POINT the Moon sits at ignition, so the Moon still has to
   cover (180° − lead) before it reaches your apogee. tut5.html encodes exactly this:

       TLI_IDEAL_LEAD = 180 − TLI_MOON_TRAVEL

   Therefore a SMALL lead leaves the Moon MORE ground to cover than you have flying time: you get
   there first and wait — EARLY. A LARGE lead leaves it less: it passes the spot while you are still
   climbing — you arrive LATE, behind it. Which is what the original text said. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

const sim = fs.readFileSync(path.join(ROOT, 'public', 'tut5.html'), 'utf8');
const num = (re, label) => {
  const m = re.exec(sim);
  if (!m) throw new Error('could not read ' + label + ' from tut5.html');
  return parseFloat(m[1]);
};

console.log('module 5 — trans-lunar lead angle\n');

/* ---- 1. the simulator's own constants ---- */
const R_EARTH = num(/const R_EARTH=(\d+)/, 'R_EARTH');
const D_EM    = num(/D_EM=(\d+)/, 'D_EM');
const T_MOON  = num(/const T_MOON=([\d.]+)/, 'T_MOON');
const MU = 398600.4418;

const rp = R_EARTH + 300, ra = D_EM, a = (rp + ra) / 2;
const TOF    = Math.PI * Math.sqrt(a ** 3 / MU) / 86400;   // days, perigee -> apogee
const travel = 360 * (TOF / T_MOON);                       // degrees the Moon covers meanwhile
const ideal  = 180 - travel;

check('the sim defines ideal lead as 180 - (Moon travel during flight)',
  /TLI_IDEAL_LEAD=180-TLI_MOON_TRAVEL/.test(sim.replace(/\s/g, '')),
  'that identity is what makes small lead => early');
check('time of flight is a plausible ~5 days', TOF > 4 && TOF < 6, TOF.toFixed(2) + ' d');
check('ideal lead lands inside the slider range 80-160',
  ideal > 80 && ideal < 160, ideal.toFixed(1) + '°');

/* ---- 2. what actually happens at each lead ---- */
// Days until the Moon reaches the apogee point, versus the days it takes you to get there.
const shipVsMoon = (lead) => TOF - (180 - lead) / (360 / T_MOON);   // >0 ship late, <0 ship early

check('SMALL lead (80°) => ship arrives EARLY, Moon still inbound',
  shipVsMoon(80) < -0.5, 'delta = ' + shipVsMoon(80).toFixed(2) + ' d');
check('LARGE lead (160°) => ship arrives LATE, Moon already swept past',
  shipVsMoon(160) > 0.5, 'delta = ' + shipVsMoon(160).toFixed(2) + ' d');
check('ideal lead => ship and Moon arrive together',
  Math.abs(shipVsMoon(ideal)) < 0.02, 'delta = ' + shipVsMoon(ideal).toFixed(4) + ' d');
check('arrival timing is monotonic in lead angle',
  shipVsMoon(80) < shipVsMoon(110) && shipVsMoon(110) < shipVsMoon(160), '');

/* ---- 3. the worksheet prose must agree with the geometry above ---- */
const ws = fs.readFileSync(path.join(ROOT, 'public', 'worksheet5.data.js'), 'utf8');
const EARLY = /(early|has not arrived|still coming|not there yet|waiting)/i;
const LATE  = /(late|swept past|gone by|already there|behind the Moon)/i;

// Take a window after each "little lead" / "much lead" phrase and check which family it uses.
function windows(re) {
  const out = [];
  for (const m of ws.matchAll(re)) out.push(ws.slice(m.index, m.index + 190));
  return out;
}
const little = windows(/[Tt]oo little lead/g);
const much   = windows(/[Tt]oo much lead|too much and/g);

check('worksheet mentions the "too little lead" case', little.length > 0, '');
check('worksheet mentions the "too much lead" case', much.length > 0, '');

little.forEach((w, i) => {
  /* Both clauses often sit in one sentence ("Too little lead and X; too much and Y"), so the
     window has to stop where the second clause begins or it reads as self-contradictory. */
  const cut = w.search(/too much/i);
  const txt = (cut > 0 ? w.slice(0, cut) : w).replace(/<[^>]+>/g, ' ');
  check('"too little lead" passage #' + (i + 1) + ' says EARLY, not late',
    EARLY.test(txt) && !/\blate\b|swept past|gone by/i.test(txt),
    txt.slice(0, 110).replace(/\s+/g, ' '));
});
much.forEach((w, i) => {
  const txt = w.replace(/<[^>]+>/g, ' ');
  check('"too much lead" passage #' + (i + 1) + ' says LATE / swept past, not early',
    LATE.test(txt) && !/\bearly\b/i.test(txt),
    txt.slice(0, 110).replace(/\s+/g, ' '));
});

console.log('\nderived from the sim: TOF ' + TOF.toFixed(2) + ' d, Moon travels ' +
  travel.toFixed(1) + '°, ideal lead ' + ideal.toFixed(1) + '°');
console.log(fail === 0 ? 'ALL PASSED' : fail + ' FAILED', '(' + pass + ' checks)');
process.exit(fail === 0 ? 0 : 1);
