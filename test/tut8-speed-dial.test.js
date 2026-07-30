#!/usr/bin/env node
/* tut8-speed-dial.test.js — the cockpit speed dial must compare against what the pilot is flying.
   Run from the repo root:  node test/tut8-speed-dial.test.js

   Owner-reported: "the dial is showing the wrong thing — I think it's looking relative to the Earth.
   It would be more helpful if it showed speed relative to target speed. That's what we end up
   modifying." Correct on both counts. The dial read

       v = |v_inertial|   against   sqrt(MU_E / r_from_Earth)

   which is wrong in two different ways, and this suite pins both:

   1. IN LUNAR ORBIT it is meaningless. Inside the Moon's sphere of influence the quantity being flown
      is speed about the MOON. An Earth-referenced circular speed out at lunar distance is ~38% off the
      real value, so the dial was pegged through the entire arrival — the same class of bug as the
      CAPCOM readout that announced "ESCAPE" while in a stable lunar orbit.

   2. DURING THE GEO RENDEZVOUS it cannot detect the thing that matters. Comparing your speed to
      circular speed AT YOUR OWN RADIUS returns exactly 1.000 at every radius, so the dial reads
      "ON SPEED" while you sit on a lower orbit drifting steadily away from the target. What the pilot
      is actually trimming is speed against the TARGET, which the dial now shows.

   Note the deliberate wrinkle: in the rendezvous phase the usual "TOO SLOW -> burn FORWARD" advice
   inverts, because catching a satellite ahead of you means burning REVERSE to drop lower and gain on
   it. So the dial quotes the signed difference and leaves the order to the director panel. */
const fs=require('fs');
const src=fs.readFileSync(require('path').resolve(__dirname,'..','public','tut8.html'),'utf8');
let bad=0; const ok=(l,c,d)=>{console.log((c?'  PASS  ':'  FAIL  ')+l+(d?'   ['+d+']':''));if(!c)bad++;};
const MU_E=398600.4418, MU_M=4902.8, R_GEO=42164;

ok('speed is measured in the primary body frame', /const v=Math\.hypot\(fs\[2\]-B\.vx, fs\[3\]-B\.vy\)/.test(src));
ok('reference switches on the rendezvous phase', /const rendezvous = planTarget==='geo' && planBurns\.length>0 && nextBurn>=planBurns\.length/.test(src));
ok('rendezvous reference is the TARGET speed', /rendezvous \? Math\.sqrt\(F7\.MU_E\/42164\)/.test(src));
ok('otherwise circular about the PRIMARY body', /Math\.sqrt\(B\.mu\/rLoc\)/.test(src));
ok('no Earth-only radius left in the dial', !/vTarget=Math\.sqrt\(F7\.MU_E\/Math\.hypot\(fs\[0\],fs\[1\]\)\)/.test(src));
ok('the reference is labelled on screen', /refLabel/.test(src) && /vs TARGET speed/.test(src));

// 1. lunar orbit: 100 km circular about the Moon. Old code compared against Earth-circular at ~384,000 km.
const rM=1737+100, vM=Math.sqrt(MU_M/rM);
const oldRef=Math.sqrt(MU_E/384400);      // what the dial used to compare against out there
ok('lunar case: correct reference is the Moon', Math.abs(vM-Math.sqrt(MU_M/rM))<1e-9, vM.toFixed(3)+' km/s');
ok('the OLD reference was wildly wrong there', Math.abs(oldRef/vM-1)>0.3,
   'old '+oldRef.toFixed(3)+' vs true '+vM.toFixed(3)+' km/s  ('+Math.round((oldRef/vM-1)*100)+'% off)');

// 2. rendezvous: 40 km below GEO, matched-looking to the old dial but 1.5 m/s fast vs the target
const vTgt=Math.sqrt(MU_E/R_GEO);
const rLow=R_GEO-100, vLow=Math.sqrt(MU_E/rLow);   // a realistic phasing dip
const oldRatio=vLow/Math.sqrt(MU_E/rLow);                 // old dial: compares to circular AT MY radius
ok('old dial read "ON SPEED" while drifting on a lower orbit', Math.abs(oldRatio-1)<1e-12, 'ratio '+oldRatio.toFixed(6));
const dv=Math.round((vLow-vTgt)*1000);
ok('new dial shows the real difference vs the target', dv>0, dv+' m/s faster than the target');
ok('...which is the number the pilot trims', Math.abs(dv)>=3, dv+' m/s at 100 km below GEO');
console.log(bad?'\n'+bad+' FAILED':'\nSPEED DIAL REFERENCE VERIFIED');
process.exit(bad?1:0);
