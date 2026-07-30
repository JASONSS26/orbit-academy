#!/usr/bin/env node
/* tut3-sunsync.test.js — sun-synchronous must be reachable in Module 3.
   Run from the repo root:  node test/tut3-sunsync.test.js

   REPORTED BY THE EXTERNAL REVIEWER: "SIM cannot go past 90 degrees… So Sun-synch in the SIM says 90
   degrees (it doesn't say 98.2 degrees and cannot due to limitations of the SIM). Is that a problem
   with the SIM or are you saying SUN-SYNCH can be 90 degrees?" — and the exercise asks the student to
   watch the node-Sun angle lock, which could never happen.

   THE DIAGNOSIS MATTERS, because the instinct was to fudge the model. Nothing needed fudging. The J2
   nodal precession in tut3 is the real formula,

       Omega_dot = -3/2 * J2 * (Re/p)^2 * n * cos(i)

   and it was always driving the animation. The blocker was a single HTML attribute: the inclination
   slider was capped at max="90", so cos(i) could never go negative, so the precession could never be
   POSITIVE, so it could never match the Sun's +0.9856 deg/day. The sso preset already specified
   i = 98.2 and was being silently clamped. Raising the cap to 180 fixed it with no change to the
   physics — which is the outcome to prefer: a real model, exposed, rather than a special case. */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'tut3.html'), 'utf8');

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

// ---- the slider must admit retrograde inclinations ----
const m = /<input id="i" type="range" min="(\d+)" max="(\d+)"/.exec(src);
ok('inclination slider found', !!m);
ok('slider reaches past 90° (retrograde)', m && +m[2] >= 180, m ? m[1] + '–' + m[2] + '°' : '');

// ---- the preset must ask for the real value ----
const p = /\{id:'sso',[^}]*?i:\s*([\d.]+)/.exec(src);
ok('the sun-sync preset asks for i = 98.2°', p && Math.abs(+p[1] - 98.2) < 0.05, p ? 'i=' + p[1] : 'preset not found');
const pa = /\{id:'sso',[^}]*?a:\s*(\d+)/.exec(src);
ok('…at a ≈ 7078 km (700 km altitude)', pa && Math.abs(+pa[1] - 7078) < 30, pa ? 'a=' + pa[1] : '');

// ---- replicate the SHIPPED formula and confirm the lock is actually achievable ----
const c = /const J2=([\d.e-]+), RE_J2=([\d.]+)/.exec(src);
ok('J2 constants present', !!c);
const J2 = +c[1], RE = +c[2], MU = 398600.4418;
const rdot = (a, e, iDeg) => {
  const pp = a * (1 - e * e), n = Math.sqrt(MU / (a * a * a)), iR = iDeg * Math.PI / 180;
  return -1.5 * J2 * Math.pow(RE / pp, 2) * n * Math.cos(iR) * 86400 * 180 / Math.PI;
};
const SUN = 0.9856;                              // deg/day, the Sun's apparent annual motion
const LOCK = 0.05;                               // the tolerance tut3 uses for its "☀-synchronous!" flag

ok('at i = 98.2° the plane precesses at the Sun\'s rate',
   Math.abs(rdot(7078, 0.001, 98.2) - SUN) < LOCK,
   '+' + rdot(7078, 0.001, 98.2).toFixed(3) + '°/day vs Sun +' + SUN);
ok('at i = 90° it is ZERO — the old cap made the lock unreachable',
   Math.abs(rdot(7078, 0.001, 90)) < 0.01, rdot(7078, 0.001, 90).toFixed(3) + '°/day');
ok('below 90° the precession is NEGATIVE (wrong direction)',
   rdot(7078, 0.001, 80) < 0 && rdot(7078, 0.001, 45) < 0,
   'i=80° ' + rdot(7078, 0.001, 80).toFixed(2) + ', i=45° ' + rdot(7078, 0.001, 45).toFixed(2));
ok('the ISS drifts about −5°/day, as the text claims',
   Math.abs(rdot(6798, 0.0007, 51.6) - (-5)) < 0.6, rdot(6798, 0.0007, 51.6).toFixed(2) + '°/day');
ok('the lock is sharp — a few degrees off breaks it',
   Math.abs(rdot(7078, 0.001, 95) - SUN) > LOCK && Math.abs(rdot(7078, 0.001, 101) - SUN) > LOCK,
   'i=95° ' + rdot(7078, 0.001, 95).toFixed(2) + ', i=101° ' + rdot(7078, 0.001, 101).toFixed(2));

// ---- and the readout logic must actually flag it ----
ok('the ☀-synchronous flag uses the same 0.05°/day tolerance', /Math\.abs\(rd-0\.9856\)<0\.05/.test(src));
ok('J2 precession drives the animation (not a static label)', /animRaan \+ raanDotDegDay\(\)\*simDt\/86400/.test(src));

console.log(bad ? '\n' + bad + ' FAILED' : '\nSUN-SYNCHRONOUS IS REACHABLE — real J2, no fudge');
process.exit(bad ? 1 : 0);
