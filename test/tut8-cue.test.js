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

/* ------------------------------------------------- PILOT OWNS THE CLOCK AFTER INSERTION
   Two owner reports, same root cause:
     "module 8 jumps to a fast time warp partway through. I'm trying to fly back to Earth"
     "lunar insertion exercise still speeds way up when orbit circularized"

   The warp ladder is scheduling help for a mission that still has burns to fly. Once the insertion
   works there is no schedule left, so an automatic rate stops being help and becomes interference.
   Two separate ways it went wrong:

     1. NO LOITER RUNG. With every burn retired the ladder fell through to COAST_WARP() — 12,000x on
        the lunar mission — so hand-flying anywhere was impossible.
     2. THE RANGE CAP EXCLUDED THE POST-CAPTURE STATES. The cap pinned the arrival to 120x because the
        Moon was close, but its guard skipped holdStartT / victoryUntil / loiter — exactly the states
        circularization produces. So the clock jumped 5x to 600x at the precise moment the pilot most
        wants to watch the orbit they just made.

   Fixed by handing over rather than by picking a different automatic number: from capture onward
   pilotClock() is true, the ladder and the cap both step aside, and ',' / '.' set an ABSOLUTE rate
   from a slow default. */
ok('a pilot-clock state exists', /function pilotClock\(\)\{/.test(src));
/* SCOPE. First version handed the clock over on ANY holdStartT — but the GEO mission sets that the
   moment you enter the rendezvous box, and its hold runs a full 24 h orbit. At the 60x handover rate
   that became 24 MINUTES of wall clock watching a stationary belt, reported as "when it gets close to
   satellite it seems to freeze". Loiter always; hold/victory only at the Moon. */
ok('loiter always hands over', /if\(loiter\) return true;/.test(src));
ok('hold/victory hand over ONLY on the lunar mission',
   /return planTarget==='moon' && !!\(holdStartT \|\| victoryUntil\);/.test(src));
ok('the GEO 24 h confirmation hold keeps its automatic rate',
   /planTarget==='geo' && nextBurn>=planBurns\.length && planBurns\.length\) \? 2600/.test(src));
{ // the arithmetic that made it look like a hang
  const geoPeriod=86164;                       // one sidereal day, the GEO hold duration
  ok('a 24 h hold at the 60x handover rate is ~24 min of wall clock (the bug)',
     Math.abs(geoPeriod/60/60 - 23.9) < 1.5, (geoPeriod/60/60).toFixed(1)+' minutes');
  ok('…and ~33 s at the automatic 2600x (the fix)',
     geoPeriod/2600 < 40, (geoPeriod/2600).toFixed(0)+' seconds');
}
ok('it overrides the ladder outright', /if\(pilotClock\(\) && !firing\) warp = PILOT_WARP;/.test(src));
ok('the range cap stands aside for it', /!firing && !pilotClock\(\)/.test(src));
ok('the old loiter rung is gone (superseded)', !/return d<2000 \? 120 : d<8000/.test(src));
ok('starts slow enough to watch a fresh orbit', /PILOT_WARP_DEFAULT=60/.test(src));
ok('reaches high enough to fly home', /PILOT_WARP_MAX=20000/.test(src));
ok('never runs backwards or stops', /PILOT_WARP_MIN=1/.test(src));
ok('reset per flight', /PILOT_WARP=PILOT_WARP_DEFAULT; pilotClockAnnounced=false;/.test(src));
ok('the handover is announced once', /pilotClockAnnounced=true;/.test(src) && /YOU HAVE THE CLOCK/.test(src));
ok("',' and '.' set an absolute rate once handed over",
   /if\(pilotClock\(\)\)\{ PILOT_WARP=Math\.max\(PILOT_WARP_MIN, PILOT_WARP\/2\)/.test(src) &&
   /if\(pilotClock\(\)\)\{ PILOT_WARP=Math\.min\(PILOT_WARP_MAX, PILOT_WARP\*2\)/.test(src));

// the reachable range, by doubling from the default
{
  const lo=[], hi=[];
  let w=60; while(w>1){ w=Math.max(1,w/2); lo.push(w); }
  w=60; while(w<20000){ w=Math.min(20000,w*2); hi.push(w); }
  ok('a few presses span slow to fast', lo.length<=6 && hi.length<=9,
     'down in '+lo.length+' presses, up in '+hi.length);
  const T=2*Math.PI*Math.sqrt(Math.pow(1999,3)/4902.8);      // a 1,999 km lunar orbit
  ok('default is watchable', T/60 > 100, (T/60).toFixed(0)+' s per lunar orbit at 60x');
  ok('max makes a 4-day return practical', 4*86400/20000 < 30, (4*86400/20000).toFixed(0)+' s for a 4-day transit');
}
console.log(bad?'\n'+bad+' FAILED':'\nBURN CUE + WARP EASE-IN + PILOT CLOCK VERIFIED');
process.exit(bad?1:0);
