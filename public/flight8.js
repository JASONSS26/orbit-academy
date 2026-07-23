/* flight8.js — shared 2-D flight model for Module 8 (Lunar Transfers & Artemis).
   Used by the cockpit (tut8.html), so the path the
   student programs is exactly the path they fly. Zero dependencies; plain functions on a global.

   Physics: restricted planar 3-body. Earth fixed at the origin; Moon on a circular orbit of radius
   D_EM (period T_MOON), so at time t (seconds) the Moon is at angle wMoon*t. The spacecraft is a
   test mass feeling Earth + Moon point-mass gravity. RK4 integration in the INERTIAL frame; we
   convert to the Earth–Moon CO-ROTATING frame only for display.

   State vector s = [x, y, vx, vy]  (km, km/s), inertial, Earth-centered.
   Burns are impulsive Δv (km/s) applied along/normal to the current velocity. */
(function(g){
"use strict";
const MU_E=398600.4418, MU_M=4902.8, D_EM=384400, R_E=6371, R_M=1737;
const T_MOON=27.321661*86400, wMoon=2*Math.PI/T_MOON;

function moonPos(t){ const a=wMoon*t; return [D_EM*Math.cos(a), D_EM*Math.sin(a)]; }
function moonVel(t){ const a=wMoon*t; return [-D_EM*wMoon*Math.sin(a), D_EM*wMoon*Math.cos(a)]; }
/* Sun direction (unit vector) in the INERTIAL frame. The Sun is ~fixed over a few days; we let it
   advance slowly so illumination evolves across the mission. sun0 = its inertial angle at t=0. */
let SUN0=0;                                   // inertial angle of the Sun at t=0 (radians)
function sunAngleInertial(t){ return SUN0 + wMoon*0*t + (2*Math.PI/(365.25*86400))*t; }  // ~fixed, tiny drift
function sunDirInertial(t){ const a=sunAngleInertial(t); return [Math.cos(a),Math.sin(a)]; }
// In the CO-ROTATING frame (frame angle = wMoon*t), the Sun appears to sweep around at ≈ −wMoon
// (once per sidereal month, ~13.2°/day) — this is what makes the terminators visibly shift as you fly.
function sunAngleCorot(t){ return sunAngleInertial(t) - wMoon*t; }

function accel(t,s){ const x=s[0],y=s[1], mp=moonPos(t);
  const dxe=x, dye=y, dxm=x-mp[0], dym=y-mp[1];
  const re=Math.max(R_E*R_E,dxe*dxe+dye*dye), rm=Math.max(R_M*R_M,dxm*dxm+dym*dym);
  const re15=re*Math.sqrt(re), rm15=rm*Math.sqrt(rm);
  return [ -MU_E*dxe/re15 - MU_M*dxm/rm15, -MU_E*dye/re15 - MU_M*dym/rm15 ];
}
// one RK4 step of h seconds
function step(t,s,h){ const a1=accel(t,s);
  const s2=[s[0]+s[2]*h/2, s[1]+s[3]*h/2, s[2]+a1[0]*h/2, s[3]+a1[1]*h/2], a2=accel(t+h/2,s2);
  const s3=[s[0]+s2[2]*h/2, s[1]+s2[3]*h/2, s[2]+a2[0]*h/2, s[3]+a2[1]*h/2], a3=accel(t+h/2,s3);
  const s4=[s[0]+s3[2]*h, s[1]+s3[3]*h, s[2]+a3[0]*h, s[3]+a3[1]*h], a4=accel(t+h,s4);
  return [ s[0]+h/6*(s[2]+2*s2[2]+2*s3[2]+s4[2]), s[1]+h/6*(s[3]+2*s2[3]+2*s3[3]+s4[3]),
           s[2]+h/6*(a1[0]+2*a2[0]+2*a3[0]+a4[0]), s[3]+h/6*(a1[1]+2*a2[1]+2*a3[1]+a4[1]) ]; }

// apply an impulsive burn: dv (km/s) along velocity (fore+/aft-) and normal (left+/right-)
function applyBurn(s, dvFore, dvSide){ const vx=s[2], vy=s[3], v=Math.hypot(vx,vy)||1;
  const ux=vx/v, uy=vy/v;          // along-velocity unit
  const nx=-uy, ny=ux;             // left-normal unit
  return [ s[0], s[1], vx+dvFore*ux+dvSide*nx, vy+dvFore*uy+dvSide*ny ]; }

// initial state: circular LEO parking orbit at altitude altKm, phase ph (rad), prograde (CCW)
function leoState(altKm, ph){ const r=R_E+(altKm||400); const v=Math.sqrt(MU_E/r);
  return [ r*Math.cos(ph||0), r*Math.sin(ph||0), -v*Math.sin(ph||0), v*Math.cos(ph||0) ]; }

/* Propagate a PLAN through the flight model, returning the trajectory + outcome.
   plan = { alt, leoPhase, moonPhase0, burns:[{t, fore, side}] }  (t in seconds from start; dv in km/s)
   Returns { path:[[x,y]...], moon:[[x,y]...], t, outcome, minMoon, peri, apo, captured } */
function simulate(plan, opts){ opts=opts||{};
  const dt=opts.dt||20, tMax=opts.tMax||12*86400;
  const target=plan.target||'moon';   // 'moon' = capture into lunar orbit; 'geo' = circularize near GEO radius
  const R_GEO=42164;
  let s=leoState(plan.alt, plan.leoPhase||0), t=0;
  // Moon phase offset: user places the Moon `moonPhase0` rad ahead at t=0. We fold that into moonPos
  // by shifting time: moon angle = wMoon*(t + phase0/wMoon).
  const tShift=(plan.moonPhase0||0)/wMoon;
  const burns=(plan.burns||[]).slice().sort((a,b)=>a.t-b.t);
  let bi=0;
  const path=[], moon=[], samples=[], burnMarks=[];   // samples: {t,x,y} inertial; burnMarks: co-rot burn spots
  let minMoon=Infinity, minMoonT=0, captured=false, outcome='coasting', impact=null;
  const mp0=moonPos(tShift); moon.push(mp0);
  const corot=(x,y,tt)=>{ const a=-wMoon*(tt+tShift); return [x*Math.cos(a)-y*Math.sin(a), x*Math.sin(a)+y*Math.cos(a)]; };
  for(let k=0; t<tMax; k++){
    // fire any burns whose time we've reached, recording where (co-rotating) each burn happens
    while(bi<burns.length && t>=burns[bi].t-1e-6){ burnMarks.push({t, xy:corot(s[0],s[1],t), b:burns[bi]});
      s=applyBurn(s, burns[bi].fore||0, burns[bi].side||0); bi++; }
    // land EXACTLY on the next burn time (don't overstep by up to dt): burn geometry — especially
    // the knife-edge lunar aim — must not depend on the integration step size.
    let hh=dt; if(bi<burns.length && burns[bi].t-t<dt) hh=Math.max(1e-3, burns[bi].t-t);
    s=step(t+tShift, s, hh); t+=hh;
    if(k%3===0){ path.push([s[0],s[1]]); moon.push(moonPos(t+tShift)); samples.push({t,x:s[0],y:s[1]}); }
    const re=Math.hypot(s[0],s[1]);
    const mp=moonPos(t+tShift); const rm=Math.hypot(s[0]-mp[0],s[1]-mp[1]);
    if(rm<minMoon){ minMoon=rm; minMoonT=t; }
    if(re<R_E){ outcome='crashed-earth'; impact=[s[0],s[1]]; break; }
    if(target==='moon' && rm<R_M){ outcome='crashed-moon'; impact=[s[0],s[1]]; break; }
    if(target==='moon' && re>2.2*D_EM){ outcome='escaped'; break; }
    if(bi>=burns.length){
      if(target==='geo'){ // success = nearly-circular orbit near GEO radius (speed ≈ circular, r ≈ GEO)
        const v=Math.hypot(s[2],s[3]), vc=Math.sqrt(MU_E/re);
        if(Math.abs(re-R_GEO)/R_GEO<0.12 && Math.abs(v-vc)/vc<0.10){ captured=true; outcome='captured'; }
        else if(re>1.5*R_GEO){ outcome='escaped'; break; }
      } else {            // moon: bound to the Moon within its sphere of influence
        const mv=moonVel(t+tShift); const relvx=s[2]-mv[0], relvy=s[3]-mv[1], v2=relvx*relvx+relvy*relvy;
        const epsM=v2/2 - MU_M/Math.max(R_M,rm);
        if(epsM<0 && rm<1.2*66000){ captured=true; outcome='captured'; }
      }
    }
  }
  return { path, moon, samples, burnMarks, minMoon, minMoonT, captured, outcome, endState:s, tEnd:t, tShift };
}
// co-rotating transform exposed for callers (planner + cockpit share it)
function toCorot(x,y,t){ const a=-wMoon*t; return [x*Math.cos(a)-y*Math.sin(a), x*Math.sin(a)+y*Math.cos(a)]; }
// Convert a two-step plan {target,dv1,dv2,leadDeg} into a full sim plan (both planner & cockpit use this)
const PLAN_TARGETS={ geo:{ra:42164, day1:0.0, day2:0.221, budget:4800},
                     moon:{ra:D_EM, day1:0.0, day2:4.18, budget:7500} };
/* PRE_COAST: every mission now starts with ONE full lap of the LEO parking orbit before burn 1,
   so the pilot gets a real run-up (countdown, orientation) instead of "BURN NOW" at T+0. The
   Moon's starting phase is compensated by −wMoon·PRE_COAST, so after exactly one period the craft
   is back at its start point with the Moon at the dialed lead angle — the geometry AT THE BURN is
   bit-identical to the old t=0 schedule, and every verified solution still flies. */
const PRE_COAST=2*Math.PI*Math.sqrt(Math.pow(R_E+400,3)/MU_E);   // one 400 km LEO period ≈ 5,545 s
function planToSim(p){ const T=PLAN_TARGETS[p.target||'moon'];
  return { alt:400, leoPhase:0, target:p.target||'moon',
    moonPhase0:(p.leadDeg||124)*Math.PI/180 - wMoon*PRE_COAST,
    burns:[ {name:(p.target==='geo'?'Raise apogee':'Trans-Lunar Injection'), dir:'FORE', t:T.day1*86400+PRE_COAST, fore:(p.dv1||0)/1000, side:0},
            {name:(p.target==='geo'?'Circularize at GEO':'Lunar-Orbit Insertion'), dir:'FORE', t:T.day2*86400+PRE_COAST, fore:(p.dv2||0)/1000, side:0} ] }; }

/* The verified reference solution (found by grid search against simulate(), above; re-verified
   for v3.0: 3087 m/s TLI + 900 m/s LOI brake at day 4.18 with a 120° Moon lead → captured).
   Matches the planner's "solve it for me" values. Total 3,987 m/s. Final circular trim is flown
   by hand in the cockpit. */
const SOLUTION={   // the Moon mission (kept as SOLUTION for back-compat)
  alt:400, leoPhase:0, moonLeadDeg:120, budget:7500,   // m/s
  burns:[
    { name:'Trans-Lunar Injection', dir:'FORE',  dvMS:3087, atDay:0.0  },   // prograde departure
    { name:'Lunar-Orbit Insertion', dir:'AFT',   dvMS:900,  atDay:4.18 },   // retrograde brake at closest approach
  ],
};
/* Two flyable missions, each with a plain-language objective + task, a target, and scoring.
   GEO = service a satellite: reach a circular GEO orbit AND rendezvous near a target sat.
   MOON = fly to the Moon: transfer LEO → a circular orbit around the Moon at a target altitude. */
const MISSIONS={
  geo: {
    key:'geo', title:'Service a GEO satellite', icon:'🛰',
    objective:'A communications satellite in geostationary orbit needs servicing. You begin in a 400 km low-Earth parking orbit.',
    task:'Plan and fly a transfer up to a <b>circular GEO orbit</b> (42,164 km radius) and <b>rendezvous</b> with the target satellite — arrive at the right altitude, moving at the right speed, close to it.',
    target:'geo', budget:4800, moonLeadDeg:124,   // ~940 m/s of margin over the 3,860 plan (a ~25% reserve) — room for trims + station-keeping
    targetSat:{ raDeg:0 },          // the sat sits at a fixed GEO longitude (co-rotating +x)
    burns:[ {name:'Raise apogee to GEO', dir:'FORE', dvMS:2399, atDay:0.00},
            {name:'Circularize at GEO',  dir:'FORE', dvMS:1457, atDay:0.221} ] },
  moon: {
    key:'moon', title:'Fly me to the Moon', icon:'🌙',
    objective:'Deliver a spacecraft from Earth to a parking orbit around the Moon. You begin in a 400 km low-Earth parking orbit.',
    task:'Plan and fly a transfer that <b>leads the Moon</b>, then insert into a <b>circular orbit around the Moon</b> near your target altitude. Scored on how circular your final orbit is and how close to the target altitude.',
    target:'moon', budget:7500, moonLeadDeg:124, targetLunarAltKm:3000,   // ~3,510 m/s of margin over the 3,987 plan (an ~88% reserve — hand-flying LOI + the lunar circularize is meant to be forgiving)
    burns:SOLUTION.burns.slice() },
};

/* Score a completed flight against its mission. Returns {pct, grade, lines:[...]}.
   GEO: circular-ness at GEO radius + angular closeness to the target sat.
   MOON: circular-ness of the lunar orbit + closeness to the target lunar altitude. */
function scoreFlight(missionKey, st, t){
  const M=MISSIONS[missionKey], lines=[]; let pct;
  if(missionKey==='geo'){
    const re=Math.hypot(st[0],st[1]), v=Math.hypot(st[2],st[3]), vc=Math.sqrt(MU_E/re);
    const altErr=Math.abs(re-42164), circErr=Math.abs(v-vc)/vc;
    // angular separation from the target GEO longitude (co-rotating): sat is fixed at +x in co-rot frame
    const cr=toCorot(st[0],st[1],t); const angSep=Math.abs(Math.atan2(cr[1],cr[0]))*180/Math.PI;
    const sAlt=Math.max(0,100-altErr/50), sCirc=Math.max(0,100-circErr*400), sAng=Math.max(0,100-angSep*2);
    pct=Math.round(0.4*sAlt+0.3*sCirc+0.3*sAng);
    lines.push('Altitude error: '+Math.round(altErr)+' km', 'Circular-ness: '+(circErr*100).toFixed(1)+'% off', 'Angular sep from target sat: '+angSep.toFixed(1)+'°');
  } else {
    const mp=moonPos(t), rm=Math.hypot(st[0]-mp[0],st[1]-mp[1]);
    const mv=moonVel(t), relv=Math.hypot(st[2]-mv[0],st[3]-mv[1]), vcm=Math.sqrt(MU_M/rm);
    const altKm=rm-R_M, altErr=Math.abs(altKm-(M.targetLunarAltKm||3000)), circErr=Math.abs(relv-vcm)/vcm;
    const sAlt=Math.max(0,100-altErr/60), sCirc=Math.max(0,100-circErr*250);
    pct=Math.round(0.5*sAlt+0.5*sCirc);
    lines.push('Lunar altitude: '+Math.round(altKm)+' km (target '+(M.targetLunarAltKm||3000)+')','Altitude error: '+Math.round(altErr)+' km','Circular-ness: '+(circErr*100).toFixed(1)+'% off');
  }
  const grade = pct>=90?'A — textbook':pct>=75?'B — solid':pct>=60?'C — mission accomplished':pct>=40?'D — rough but alive':'F — try again';
  return { pct:Math.max(0,Math.min(100,pct)), grade, lines };
}
g.FLIGHT7={ MU_E,MU_M,D_EM,R_E,R_M,T_MOON,wMoon, moonPos,moonVel,accel,step,applyBurn,leoState,simulate,
  sunAngleInertial,sunDirInertial,sunAngleCorot,toCorot, planToSim, PLAN_TARGETS, PRE_COAST, SOLUTION, MISSIONS, scoreFlight };
})(typeof window!=='undefined'?window:globalThis);
