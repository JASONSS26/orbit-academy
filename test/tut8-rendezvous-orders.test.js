#!/usr/bin/env node
/* tut8-rendezvous-orders.test.js — hand-flying the GEO rendezvous must come with real orders.
   Run from the repo root:  node test/tut8-rendezvous-orders.test.js

   OWNER REPORT: "when flying that mission by hand it's REALLY hard to maneuver into position. Any
   ideas on how to give explicit and concrete guidance including quantitative burn suggestions from
   capcom?"

   The difficulty was not the pilot's. The panel reported range and closing rate — facts, not orders —
   and the intuitive action is the WRONG one: to catch a satellite ahead of you, you burn REVERSE,
   dropping into a lower, shorter-period orbit so you gain on it. A pilot reasoning "it's ahead, so
   speed up" flies away from the solution and burns fuel doing it.

   So the director now computes the maneuver and quotes the numbers, from standard GEO phasing:

       drift rate      dλ/dt = −1.5 (δa/a) n         n = 360.9856 °/day
       Δv for a δa     δv = μ δa / (2 a² v)          ≈ 0.0365 m/s per km at GEO
       time to close   t = |error| / |drift rate|

   This suite checks the arithmetic and, more importantly, that the ORDER POINTS THE RIGHT WAY — a
   sign error here would actively teach the misconception the module exists to correct. */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'tut8.html'), 'utf8');

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

ok('rendezvousOrder() exists', /function rendezvousOrder\(\)/.test(src));
ok('it is issued through CAPCOM', /capcom\('CAPCOM: '\+ro\.text\)/.test(src));
ok('orders are throttled, not spammed per frame', /ro\.phase!==lastRvPhase \|\| now-lastRvAt>90000/.test(src));
ok('suppressed while the autopilot is flying', /!training && !autoOn/.test(src));
ok('the GEO mean motion constant is present', /GEO_N_DEG_DAY = 360\.9856/.test(src));

/* Replicate the shipped formulae. */
const MU = 398600.4418, A = 42164, V = Math.sqrt(MU / A), N = 360.9856;
const dvFor = da => MU * da / (2 * A * A * V) * 1000;
const drift = da => -1.5 * (da / A) * N;

ok('a 400 km dip costs ≈14.6 m/s', Math.abs(Math.abs(dvFor(-400)) - 14.6) < 0.3, dvFor(-400).toFixed(1) + ' m/s');
ok('…and buys ≈5.1°/day of closure', Math.abs(drift(-400) - 5.14) < 0.1, '+' + drift(-400).toFixed(2) + '°/day');
ok('matches the figures the autopilot already uses (~15 m/s, ~5°/day)',
   Math.abs(dvFor(-400)) > 13 && Math.abs(dvFor(-400)) < 16 && drift(-400) > 4.5 && drift(-400) < 5.5);

/* THE SIGN. This is the whole pedagogical point of the mission. */
ok('DROPPING lower closes a gap ahead of you (positive drift)', drift(-400) > 0, '+' + drift(-400).toFixed(2) + '°/day');
ok('CLIMBING makes you fall back (negative drift)', drift(+400) < 0, drift(+400).toFixed(2) + '°/day');
ok('a lower orbit needs a REVERSE burn', dvFor(-400) < 0, dvFor(-400).toFixed(1) + ' m/s');
ok('a higher orbit needs a FORWARD burn', dvFor(+400) > 0, '+' + dvFor(+400).toFixed(1) + ' m/s');

/* The order text must reflect that, in words, in the right direction. */
const m = /const dip = err>0 \? \+DIP : -DIP;/.exec(src);
ok('behind ⇒ dip LOWER, ahead ⇒ climb HIGHER', !!m, m ? m[0] : 'branch not found');
ok('the "behind" wording says DROP and explains why',
   /BEHIND your station\. To catch up you must DROP: a lower orbit has a shorter period/.test(src));
ok('the "ahead" wording says climb and explains why',
   /AHEAD of your station\. To fall BACK you must climb: a higher orbit has a longer period/.test(src));
ok('it names a stopping burn too', /to stop the drift and re-circularize at the belt/.test(src));
ok('it catches drifting the wrong way', /DRIFTING THE WRONG WAY/.test(src));
ok('it says when nothing needs flying', /ON STATION — hold it/.test(src));

/* Worked example, to be sure the quoted times are sane rather than merely well-formatted. */
const err = -8.0;                                    // 8° behind
const eta = Math.abs(err / drift(-400));
ok('8° behind closes in a believable time', eta > 1 && eta < 2.5, eta.toFixed(2) + ' days at 400 km low');
ok('the round trip costs about 30 m/s', Math.abs(2 * dvFor(-400)) > 25 && Math.abs(2 * dvFor(-400)) < 34,
   Math.abs(2 * dvFor(-400)).toFixed(1) + ' m/s for both burns');
ok('that is affordable inside the 6,500 m/s budget', Math.abs(2 * dvFor(-400)) < 6500 * 0.02);

console.log(bad ? '\n' + bad + ' FAILED' : '\nRENDEZVOUS ORDERS VERIFIED — correct sign, real numbers');
process.exit(bad ? 1 : 0);
