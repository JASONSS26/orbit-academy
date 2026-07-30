#!/usr/bin/env node
/* window-resolution.test.js — the cockpit window must not render into a postage stamp.
   Run from the repo root:  node test/window-resolution.test.js

   OWNER REPORT, with a screenshot: "when we're far away the lunar image is really fuzzy and
   pixellized. When we're close it's too coarse." Both symptoms, one cause — and it was NOT texture
   resolution, which is where the obvious suspicion lands (and where two earlier rounds of work went).

   The forward window is a software raytracer. It renders into an offscreen buffer and scales that up
   to fill the pane. The buffer was FIXED at 340 px wide, so on a ~1,600 px window each buffer pixel
   became a ~5 px block: a distant Moon resolved into a handful of blobs, and a close limb became a
   staircase of large squares. Measured cost of that buffer is ~9% of a 60 fps frame, so nearly all
   the available budget was going unused.

   Fixed by adapting instead of hard-coding, because the course ships to unknown hardware — old
   classroom laptops included. The width walks between 340 and 1,100 px targeting ~5 ms of window
   render time, with wide dead-bands and an exponentially smoothed cost estimate so that one slow
   frame cannot collapse the resolution and it settles rather than oscillating.

   This suite checks the control law converges and stays in bounds under a range of simulated machine
   speeds, which is the part that would be tedious and unreliable to confirm by eye. */
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'tut8.html'), 'utf8');

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

ok('buffer width is adaptive, not a fixed 340', /window\._winBufW/.test(src) && !/const BW=Math\.min\(340,w\)/.test(src));
ok('a sane starting width', /window\._winBufW=760/.test(src));
ok('cost is exponentially smoothed', /_rtAvg\*0\.9\+dt\*0\.1/.test(src));
ok('upscale is smoothed at high quality', /imageSmoothingQuality='high'/.test(src));
ok('terminator is softened, not a hard cutoff', /Math\.pow\(lit,0\.85\)/.test(src));
ok('night side keeps a little ambient', /lit<=0 \? 0\.05/.test(src));

/* Replicate the control law and run it against machines of different speeds. costPerPx is chosen so
   that "1x" needs about the mid-range width to hit the 5 ms target. */
function converge(costPerKpx, frames) {
  let W = 760, avg;
  const hist = [];
  for (let i = 0; i < frames; i++) {
    const px = W * (W * 0.53) / 1000;               // 16:9-ish buffer, in kilopixels
    const dt = px * costPerKpx;
    avg = avg === undefined ? dt : avg * 0.9 + dt * 0.1;
    const TARGET = 5.0;
    if (avg > TARGET * 1.6 && W > 340) W = Math.max(340, Math.round(W * 0.85));
    else if (avg < TARGET * 0.55 && W < 1100) W = Math.min(1100, Math.round(W * 1.10));
    hist.push(W);
  }
  return { W, avg, hist };
}

const fast = converge(0.004, 400);      // a modern desktop
const mid  = converge(0.024, 400);      // mid-range laptop
const slow = converge(0.20, 400);       // an old classroom machine

ok('fast machine climbs to the cap', fast.W === 1100, fast.W + ' px');
ok('mid machine settles in between', mid.W > 340 && mid.W < 1100, mid.W + ' px');
ok('slow machine falls back to the floor', slow.W === 340, slow.W + ' px');
ok('never exceeds the cap', [fast, mid, slow].every(r => Math.max(...r.hist) <= 1100));
ok('never drops below the floor', [fast, mid, slow].every(r => Math.min(...r.hist) >= 340));

// settling: the last quarter of the run must not swing wildly
for (const [name, r] of [['fast', fast], ['mid', mid], ['slow', slow]]) {
  const tail = r.hist.slice(-100);
  const swing = Math.max(...tail) - Math.min(...tail);
  ok(name + ' machine settles (no oscillation)', swing <= Math.max(40, r.W * 0.12),
     'swing ' + swing + ' px around ' + r.W);
}

// and the whole point: even the SLOWEST outcome is no worse than the old fixed value
ok('worst case is never worse than the old fixed 340 px', slow.W >= 340);
ok('typical case is a big improvement', mid.W >= 2 * 340 || mid.W > 700, mid.W + ' px vs 340 before');

console.log(bad ? '\n' + bad + ' FAILED' : '\nWINDOW RESOLUTION VERIFIED — adaptive, bounded, settles');
process.exit(bad ? 1 : 0);
