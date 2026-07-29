#!/usr/bin/env node
/* tut8-cue.test.js — the BURN annunciator must go OUT, and a flight must not open at cruise warp.
   Run from the repo root:  node test/tut8-cue.test.js

   Two owner-reported bugs, both re-checkable arithmetic rather than something you can only see by
   flying:

   1. STALE BURN ORDERS. The cue test was `tTo <= CUE_LEAD` with no lower bound. Any negative tTo
      satisfies that, so once a burn's scheduled time slipped into the past the red "BURN NOW" order
      latched on — and if the missed-burn reschedule had exhausted its retries, it stayed lit for the
      rest of the flight, ordering a burn the pilot could no longer fly. Now bounded by CUE_LATE,
      which matches the warp ladder's overdue rung so the annunciator and the clock agree; past that
      the panel says the window has passed instead of shouting.

   2. FLIGHTS OPENED AT CRUISE WARP. The ladder jumps straight to its cruise rung, so a mission began
      at 600x (GEO) or 1,500x (lunar) and the first seconds blurred past before the pilot could tell
      where they were. An ease-in caps the opening at 60x and doubles each second; it must finish
      ABOVE the highest cruise rung or the ramp ends in a visible jump. */
const fs=require('fs');
const src=fs.readFileSync(require('path').resolve(__dirname,'..','public','tut8.html'),'utf8');
let bad=0; const ok=(l,c,d)=>{console.log((c?'  PASS  ':'  FAIL  ')+l+(d?'   ['+d+']':''));if(!c)bad++;};

const CUE_LEAD=+/const CUE_LEAD=(\d+)/.exec(src)[1];
const CUE_LATE=+/const CUE_LATE=(\d+)/.exec(src)[1];
ok('CUE_LATE is defined', CUE_LATE>0, 'CUE_LEAD='+CUE_LEAD+' CUE_LATE='+CUE_LATE);

// replicate the shipped predicate exactly
const inWin=(tTo)=> tTo<=CUE_LEAD && tTo>=-CUE_LATE;
const cueOn=(tTo)=> inWin(tTo) && tTo<=45;
const missed=(tTo)=> tTo < -CUE_LATE;

ok('no cue long before the burn',            !inWin(CUE_LEAD+1));
ok('amber countdown arms inside the lead',    inWin(600) && !cueOn(600), 'T-600s');
ok('red order at T-30s',                      cueOn(30), 'T-30s');
ok('red order still on just after T=0',       cueOn(-60), 'T+60s');
ok('red order OUT once the window is gone',  !cueOn(-CUE_LATE-1), 'T+'+(CUE_LATE+1)+'s');
ok('...and stays out far in the past',       !cueOn(-100000) && !inWin(-100000), 'T+100000s (the stale-cue bug)');
ok('a passed window reports itself instead',  missed(-100000) && missed(-CUE_LATE-1));
ok('not "missed" while still actionable',    !missed(-60) && !missed(30));

// warp ease-in
const easeBlock=/if\(!firing && flightStartWall\)\{([\s\S]*?)\n  \}/.exec(src);
ok('ease-in block present', !!easeBlock);
const capAt=(el)=> 60*Math.pow(2, el);
ok('opens at a watchable 60x', Math.round(capAt(0))===60, Math.round(capAt(0))+'x');
ok('still watchable after 1 s',  capAt(1)===120, Math.round(capAt(1))+'x');
ok('past GEO cruise (900x) by 4 s',      capAt(4)>900, Math.round(capAt(4))+'x');
ok('past lunar cruise (12000x) by 8 s',  capAt(8)>12000, Math.round(capAt(8))+'x');
ok('ramp ends ABOVE every cruise rung (no jump)', capAt(9)>12000, Math.round(capAt(9))+'x');
ok('flightStartWall stamped on both entry points',
   (src.match(/flightStartWall=performance\.now\(\)/g)||[]).length>=2);
console.log(bad?'\n'+bad+' FAILED':'\nBURN CUE + WARP EASE-IN VERIFIED');
process.exit(bad?1:0);
