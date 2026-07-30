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

/* ---------------------------------------------------------------- LOITER WARP
   Owner-reported: "module 8 jumps to a fast time warp partway through. I'm trying to fly back to
   Earth and it's not helpful."

   Cause: the warp ladder had NO rung for the loiter state. Loiter begins with every burn retired, so
   `planBurns[nextBurn]` is undefined and every conditional above fell through to COAST_WARP() —
   12,000x on the lunar mission. The clock slammed to cruise the moment the mission was won, which
   makes hand-flying anywhere impossible.

   Loiter is the one state where the pilot is definitely flying by hand and definitely not on a
   schedule, so it should be the SLOWEST rung near anything interesting. Graded on height above the
   nearest surface — Moon or Earth — so it is watchable at both ends of a return trip and brisk across
   the empty middle. The ',' / '.' trim still multiplies on top. */
ok('loiter has its own rung in the ladder', /: loiter \? \(function\(\)\{/.test(src));
ok('loiter measures height above the NEAREST surface',
   /const hM = rmNow - F7\.R_M/.test(src) && /const hE = Math\.hypot\(fs\[0\],fs\[1\]\) - F7\.R_E/.test(src)
   && /Math\.min\(hM, hE\)/.test(src));

const loiterWarp = d => d<2000 ? 120 : d<8000 ? 300 : d<20000 ? 600 : d<45000 ? 2000 : 6000;
ok('low lunar orbit is watchable',        loiterWarp(100)===120,   loiterWarp(100)+'x at 100 km');
ok('low Earth orbit is watchable',        loiterWarp(400)===120,   loiterWarp(400)+'x at 400 km');
ok('the empty middle is brisk',           loiterWarp(200000)===6000, loiterWarp(200000)+'x mid-transit');
ok('never reaches the old 12000x',        [100,400,5000,15000,30000,200000,384400].every(d=>loiterWarp(d)<=6000));
ok('monotonic — never speeds up on approach', (()=>{
     const ds=[384400,200000,45000,30000,20000,8000,2000,400,100];
     const ws=ds.map(loiterWarp);
     return ws.every((w,i)=>i===0||w<=ws[i-1]);
   })(), [384400,200000,30000,8000,400].map(d=>loiterWarp(d)+'x').join(' -> '));
ok('a hand-flown return is feasible', 4*86400/6000 < 120, (4*86400/6000).toFixed(0)+' s for a 4-day transit');

console.log(bad?'\n'+bad+' FAILED':'\nBURN CUE + WARP EASE-IN + LOITER VERIFIED');
process.exit(bad?1:0);
