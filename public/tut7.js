/* tut7.js — interactive layer for Module 7 (Observability).
   Six scenes, switched by the top tabs:
     cam    · take-a-picture (two kinds of streaking)
     phase  · satellite illumination viewer (real rendered frames + Sun/observer geometry)  ← hero
     radec  · RA/DEC sky coordinates
     iod    · tag the satellite & fit an orbit (angles-only IOD)
     radar  · radar echo vs. range (range⁴ law + integration)
   Plain 2-D canvas; no dependencies beyond the (optional) Three.js already loaded for future use. */
"use strict";
const $=id=>document.getElementById(id);
// Size a canvas's backing store to its CSS box × devicePixelRatio. We read the CSS size from
// getBoundingClientRect (layout px), NOT clientWidth/Height — the latter reflect the backing-store
// attributes we're about to set, which caused a feedback loop that grew canvases on every resize.
// If the element has no laid-out height yet (hidden scene), fall back to the HTML height attribute.
function fit(cv){ if(!cv) return null; const d=Math.min(2,devicePixelRatio||1);
  const r=cv.getBoundingClientRect();
  const cssW=r.width||cv.clientWidth||300;
  const cssH=r.height|| (cv.getAttribute('height')?+cv.getAttribute('height'):cssW*0.6);
  cv.width=Math.round(cssW*d); cv.height=Math.round(cssH*d); return cv.getContext('2d'); }

/* ===================== scene switching ===================== */
let scene='phase';
function showScene(s){ scene=s;
  document.querySelectorAll('.scene').forEach(e=>e.classList.toggle('on', e.id==='s-'+s));
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('sel', b.dataset.s===s));
  // (re)size canvases for the now-visible scene, then draw
  setTimeout(()=>{ sizeAll(); drawStatic(); }, 0);
}
window.showScene=showScene;

/* ===================== SCENE: satellite illumination (hero) ===================== */
const NFRAMES=216, DEG_PER_FRAME=360/NFRAMES;   // 1.667° of Sun rotation per frame
let sunIdx=0, sunPlaying=false;
const frameImgs=[];   // lazy-loaded <img> cache
function frameSrc(i){ return 'satellite_orbit_frames/f'+String(i).padStart(4,'0')+'.png'; }
function preloadFrames(){ for(let i=0;i<NFRAMES;i+=1){ const im=new Image(); im.src=frameSrc(i); frameImgs[i]=im; } }
function setSun(i){ sunIdx=((i%NFRAMES)+NFRAMES)%NFRAMES;
  $('satFrame').src=frameSrc(sunIdx);
  const ang=Math.round(sunIdx*DEG_PER_FRAME);
  // phase angle = Sun–satellite–observer angle; here it maps to how far around the render we are.
  // illuminated fraction of the disc we see ≈ (1+cos(phaseAngle))/2, with 0°=full, 180°=back-lit(dark).
  const phase=ang; const lit=Math.max(0,(1+Math.cos(phase*Math.PI/180))/2);
  $('phaseAng').textContent=phase+'°';
  $('phaseLit').textContent=Math.round(lit*100)+'%';
  $('phaseName').textContent = phase<15?'full — brightest' : (sunIdx>=28&&sunIdx<=38)?'specular glint ✦' :
    phase<75?'gibbous' : phase<105?'half (quarter phase)' : phase<160?'crescent — faint' : 'back-lit — nearly dark';
  const sl=$('sunAngle'); if(sl && +sl.value!==sunIdx) sl.value=sunIdx;
  $('phaseMag') && ($('phaseMag').textContent = magForPhase(phase).toFixed(1));
  drawGeoDiagram(phase);
  drawMagPlot(phase);
}
window.setSun=setSun;

/* ---- apparent-magnitude light curve --------------------------------------------------------------
   Flux model (arbitrary units, but the SHAPE is right):
     • diffuse (Lambertian-ish) term ∝ lit fraction = ½(1+cos φ) — bright at full, zero when back-lit
     • a narrow SPECULAR GLINT spike where a flat panel mirrors the Sun to the observer (~φ of frame 32)
     • a tiny ambient/earthshine floor so it never goes truly infinite
   Magnitude = m₀ − 2.5·log₁₀(F/F_full). The 2.5·log₁₀ is what makes 5 mag = 100× in brightness. */
const GLINT_ANG = 32*DEG_PER_FRAME;    // frame 32 is the specular glint (~53°)
// physical phase angle is 0…180° then folds back as the Sun continues around (frames 0…215 → 0…358°)
function foldPhase(ang){ ang=((ang%360)+360)%360; return ang>180?360-ang:ang; }
const GLINT_AMP = 60;                                        // specular flux at the glint peak (mirror flash)
const _dGlint = 0.5*(1+Math.cos(GLINT_ANG*Math.PI/180));     // diffuse contribution at the glint angle
// ambient/earthshine floor chosen so (glint-peak flux)/(back-lit flux) = 10⁴ → a 10-magnitude span.
// (5 mag = 100×, 10 mag = 100×100 = 10,000×.)
const AMBIENT = (_dGlint + GLINT_AMP) / 9999;
const _Fpeak = AMBIENT + _dGlint + GLINT_AMP;                // flux at the glint peak
const MAG_ZP = 4 + 2.5*Math.log10(_Fpeak);                   // zero-point → glint peak lands at mag 4 (dip → 14)
function magForPhase(ang0){ const raw=((ang0%360)+360)%360, ang=foldPhase(ang0), r=ang*Math.PI/180;
  const diffuse=0.5*(1+Math.cos(r));                        // symmetric: 1 at full, 0 at back-lit
  // the specular glint is ONE-SIDED — the flat solar panel faces one way, so it flashes only on the
  // outbound (0–180°) branch near GLINT_ANG. No mirror glint on the 180–360° return.
  const glint=(raw<=180)? GLINT_AMP*Math.exp(-Math.pow((raw-GLINT_ANG)/4,2)) : 0;
  const F=AMBIENT + diffuse + glint;
  return MAG_ZP - 2.5*Math.log10(F);                        // absolute scale: glint peak=4, back-lit dip=14
}
let magCtx=null;
function drawMagPlot(curAng){ const cv=$('magPlot'); if(!cv) return; if(!magCtx) magCtx=fit(cv);
  const g=magCtx,w=cv.width,h=cv.height; g.clearRect(0,0,w,h); g.fillStyle='#02060e'; g.fillRect(0,0,w,h);
  // Font size keyed to WIDTH (the stable, larger dimension in this column) so labels stay readable
  // even though the canvas is short. All text uses this one size.
  const fs=Math.round(w*0.021);
  const ml=fs*5.0, mr=fs*1.6, mt=fs*2.6, mb=fs*4.2;   // plot margins in units of the font size
  const px=w-ml-mr, py=h-mt-mb, angMax=360;
  // magnitude range: glint peak = mag 4, faintest back-lit dip = mag 14 — a full 10-magnitude span.
  const magBright=3, magFaint=15;
  const xFor=a=>ml + Math.max(0,Math.min(angMax,a))/angMax*px;   // linear 0…360, NO wrap (else 360→0 draws a flat line back)
  const yFor=m=>mt + (Math.max(magBright,Math.min(magFaint,m))-magBright)/(magFaint-magBright)*py;
  // y-axis: magnitude tick LABELS + short ticks only (no full-width horizontal gridlines)
  g.font='bold '+fs+'px monospace'; g.fillStyle='#8fa8d0'; g.strokeStyle='rgba(120,160,220,.3)'; g.lineWidth=1;
  g.textAlign='right';
  for(let m=4;m<=14;m+=2){ const y=yFor(m); g.beginPath(); g.moveTo(ml-fs*0.4,y); g.lineTo(ml,y); g.stroke();
    g.fillText('m '+m, ml-fs*0.6, y+fs*0.35); }
  // vertical axis line
  g.strokeStyle='rgba(120,160,220,.35)'; g.beginPath(); g.moveTo(ml,mt); g.lineTo(ml,mt+py); g.lineTo(w-mr,mt+py); g.stroke();
  // x-axis: phase-angle ticks (light vertical guides)
  g.textAlign='center';
  for(let a=0;a<=360;a+=90){ const x=xFor(a); g.strokeStyle='rgba(120,160,220,.10)';
    g.beginPath(); g.moveTo(x,mt); g.lineTo(x,mt+py); g.stroke(); g.fillStyle='#8fa8d0'; g.fillText(a+'°',x,mt+py+fs*1.5); }
  // axis titles
  g.fillStyle='#b9cdea';
  g.fillText('phase angle →',ml+px/2,h-fs*0.3);
  g.save(); g.translate(fs*1.2,mt+py/2); g.rotate(-Math.PI/2); g.fillText('fainter →  magnitude',0,0); g.restore();
  // the light curve (full 0–360° sweep — one-sided glint on the outbound branch only)
  g.strokeStyle='#ffd257'; g.lineWidth=3.5; g.beginPath();
  for(let a=0;a<=angMax;a+=1){ const x=xFor(a), y=yFor(magForPhase(a)); a?g.lineTo(x,y):g.moveTo(x,y); }
  g.stroke();
  // single glint label (one-sided specular flash on the outbound branch)
  g.fillStyle='#fff2b0'; g.textAlign='left';
  { const gx=xFor(GLINT_ANG), gy=yFor(magForPhase(GLINT_ANG)); g.fillText('✦ glint',gx+fs*0.5,gy+fs*0.4); }
  // current-geometry red dot (uses the actual swept angle, 0–360°)
  const ca=((curAng%360)+360)%360, cx=xFor(ca), cy=yFor(magForPhase(ca));
  g.fillStyle='#ff5a52'; g.beginPath(); g.arc(cx,cy,fs*0.55,0,7); g.fill();
  g.strokeStyle='#ff5a52'; g.lineWidth=2; g.setLineDash([4,4]); g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx,mt+py); g.stroke(); g.setLineDash([]);
  g.fillStyle='#7fbf8f'; g.textAlign='left';
  g.fillText('LIGHT CURVE',ml,mt-fs*0.6);
}
function toggleSunPlay(){ sunPlaying=!sunPlaying; $('sunPlayBtn').textContent=sunPlaying?'⏸ stop':'▶ auto-sweep'; }
window.toggleSunPlay=toggleSunPlay;
// top-view geometry: Sun direction, satellite at center, observer eye below, phase-angle wedge
let geoCtx=null;
function drawGeoDiagram(phaseDeg){ const cv=$('geoDiagram'); if(!cv) return; if(!geoCtx) geoCtx=fit(cv);
  const g=geoCtx,w=cv.width,h=cv.height; g.clearRect(0,0,w,h);
  g.fillStyle='#020a14'; g.fillRect(0,0,w,h);
  const cx=w*0.5, cy=h*0.40, R=Math.min(w,h)*0.24;
  const fs=Math.round(w*0.026);   // width-keyed; sized so the longest label ("phase angle NNN°") fits the canvas
  g.fillStyle='#7fa6d8'; g.font='bold '+fs+'px monospace'; g.textAlign='left'; g.fillText('TOP VIEW',fs*0.6,fs*1.4);
  // Screen convention: +y is DOWN. The observer sits at the BOTTOM looking up at the satellite (center).
  // phase angle 0° = FULL: Sun is behind the observer, i.e. sunlight arrives from the SAME side (bottom).
  // 180° = BACK-LIT: Sun is directly opposite the observer (top). So the Sun sits at screen-angle (90°+phase).
  const a=(90-phaseDeg)*Math.PI/180;
  const sx=cx+Math.cos(a)*R*1.7, sy=cy+Math.sin(a)*R*1.7;   // Sun's position
  // satellite bus at center
  g.fillStyle='#caa64a'; g.fillRect(cx-w*0.035,cy-w*0.035,w*0.07,w*0.07);
  g.fillStyle='#9fb6d8'; g.font='bold '+fs+'px monospace'; g.textAlign='center'; g.fillText('satellite',cx,cy-w*0.07);
  // Sunlight ARRIVING: an arrow emanating from the Sun's direction and pointing INWARD to the satellite.
  const ux=(cx-sx), uy=(cy-sy), ul=Math.hypot(ux,uy), dx=ux/ul, dy=uy/ul;   // unit vector Sun→sat
  const tipX=cx-dx*R*0.55, tipY=cy-dy*R*0.55;        // stop the arrow just short of the bus
  g.strokeStyle='#ffcf4d'; g.lineWidth=4; g.beginPath(); g.moveTo(sx,sy); g.lineTo(tipX,tipY); g.stroke();
  // arrowhead at the inward tip
  const ah=h*0.05, pa=Math.atan2(dy,dx);
  g.fillStyle='#ffcf4d'; g.beginPath(); g.moveTo(tipX,tipY);
  g.lineTo(tipX-Math.cos(pa-0.4)*ah, tipY-Math.sin(pa-0.4)*ah);
  g.lineTo(tipX-Math.cos(pa+0.4)*ah, tipY-Math.sin(pa+0.4)*ah); g.closePath(); g.fill();
  // label the incident-sunlight ray (no Sun disc / no "Sun" tag)
  g.fillStyle='#ffdf7a'; g.font='bold '+fs+'px monospace';
  g.fillText('incident sunlight', (sx+cx)/2, (sy+cy)/2 - fs*0.6);
  // observer eye pinned at the BOTTOM, looking UP at the satellite
  const ex=cx, ey=cy+R*1.75;
  g.strokeStyle='#5fd0ff'; g.setLineDash([6,5]); g.lineWidth=2.5; g.beginPath(); g.moveTo(ex,ey); g.lineTo(cx,cy); g.stroke(); g.setLineDash([]);
  g.fillStyle='#5fd0ff'; g.beginPath(); g.arc(ex,ey,h*0.055,0,7); g.fill();
  g.fillStyle='#04121f'; g.beginPath(); g.arc(ex,ey,h*0.024,0,7); g.fill();   // pupil
  g.fillStyle='#5fd0ff'; g.font='bold '+fs+'px monospace'; g.textAlign='center'; g.fillText('👁 you (ground)',ex,ey+fs*1.8);
  // phase-angle label
  g.fillStyle='#cfe3ff'; g.font='bold '+Math.round(fs*1.15)+'px monospace'; g.textAlign='center'; g.fillText('phase angle '+Math.round(phaseDeg)+'°',cx,h-fs*0.5);
  g.textAlign='left';
}

/* ===================== SCENE: RADAR SIM (sky view + oscilloscope) =====================
   Top view: Earth at the bottom, radar at the surface firing an expanding arc-pulse that FADES as it
   spreads (constant angular span, dropping intensity/width). Targets sit at LEO/MEO/GEO ranges. When
   the pulse reaches a target, an echo is launched back; when it returns to the radar, a ping paints on
   the scope. The scope is a green oscilloscope trace with Gaussian noise; ping amplitude ∝ 1/range⁴,
   so LEO saturates (clips), MEO is modest, GEO barely clears the noise. */
let skyCtx=null, scopeCtx=null;
const RADAR={ maxR:45000 };   // km shown across the sky view (a bit past GEO's 42,164)
const RTARGETS=[ {name:'LEO', r:800,  col:'#39d353'}, {name:'MEO', r:20000, col:'#5fd0ff'}, {name:'GEO', r:42164, col:'#ffcf4d'} ];
let pulses=[];        // active outgoing pulses: {r0(km emitted-radius), t0}
let echoes=[];        // returning echoes: {fromR, launchDist, amp, tgt}
let scopeTrace=[];    // last painted ping amplitudes vs range bin (decays)
let radarLastFire=0;
function fireRadar(){ pulses.push({r:0, born:perfNow()}); }
window.fireRadar=fireRadar;
function perfNow(){ return (typeof performance!=='undefined')?performance.now():0; }
function drawRadarSky(dt){ const cv=$('radarSky'); if(!cv) return; if(!skyCtx) skyCtx=fit(cv);
  const w=cv.width,h=cv.height,g=skyCtx; g.clearRect(0,0,w,h); g.fillStyle='#04070e'; g.fillRect(0,0,w,h);
  const gx=w*0.5, gy=h*0.94, sc=(h*0.9)/RADAR.maxR;   // radar at bottom-center; range → up the screen
  // Earth surface arc across the bottom
  g.fillStyle='#123'; g.strokeStyle='#2a5a8a'; g.lineWidth=2;
  g.beginPath(); g.arc(gx, gy+w*0.5, w*0.5, Math.PI*1.2, Math.PI*1.8); g.fill();
  g.fillStyle='#3a7fd0'; g.beginPath(); g.arc(gx,gy,h*0.02,0,7); g.fill();   // the radar
  g.fillStyle='#9fb6d8'; g.font=(h*0.035)+'px monospace'; g.textAlign='center'; g.fillText('RADAR',gx,gy+h*0.05);
  // range rings + target labels
  g.textAlign='left';
  for(const T of RTARGETS){ const ry=gy-T.r*sc; g.strokeStyle='rgba(90,120,160,.2)'; g.lineWidth=1;
    g.beginPath(); g.arc(gx,gy,T.r*sc,Math.PI,2*Math.PI); g.stroke();
    T.sx = gx+ (T===RTARGETS[1]?w*0.12:T===RTARGETS[2]?-w*0.14:w*0.04); T.sy = ry;   // remember screen pos
    g.fillStyle=T.col; g.beginPath(); g.arc(T.sx, T.sy, h*0.02,0,7); g.fill();
    g.font=(h*0.032)+'px monospace'; g.fillText(T.name+' '+T.r.toLocaleString()+' km', gx+w*0.03, ry-h*0.02); }
  // advance + draw pulses (expand at a visual rate; strength fades with radius)
  const spd=RADAR.maxR/2.2;   // km per second of wall time (so a pulse crosses in ~2 s)
  for(const p of pulses){ p.r += spd*dt;
    const frac=p.r/RADAR.maxR; const strength=Math.max(0, 1-frac);          // fades as it spreads
    g.strokeStyle='rgba(120,220,150,'+(0.15+0.7*strength)+')'; g.lineWidth=Math.max(1, 6*strength);
    g.beginPath(); g.arc(gx,gy,p.r*sc,Math.PI,2*Math.PI); g.stroke();
    // when the pulse crosses a target, launch an echo (once)
    for(const T of RTARGETS){ if(!p['hit'+T.name] && p.r>=T.r){ p['hit'+T.name]=true;
      // TRUE echo strength follows the two-way range⁴ law, relative to the LEO reference (=1).
      // The scope shows this honest ratio scaled by the operator's GAIN knob — that's the whole lesson:
      // the dynamic range is ~69 dB (7.7M×), so no one gain reveals all three at once.
      const trueRatio=Math.pow(RTARGETS[0].r/T.r,4);
      // The echo is a wavelet re-radiated FROM the target (not the whole ring), so start it at r=0
      // measured as distance travelled back down its own sightline to the radar.
      echoes.push({r:T.r, amp:trueRatio, trueRatio, tgt:T, born:perfNow()}); } }
  }
  pulses=pulses.filter(p=>p.r<RADAR.maxR*1.05);
  // draw returning echoes: LIMITED-ANGLE concentric arcs centered ON the satellite, expanding back
  // toward the radar as the return propagates. Only the satellite re-radiates — not the arc. The
  // wavefront radius tracks the distance actually travelled back, so the leading arc reaches the
  // radar just as the echo lands and the ping paints. Stays bold the whole way in.
  for(const e of echoes){ e.r -= spd*dt;
    if(e.r>0){ const T=e.tgt;
      const back=(T.r-e.r)*sc;   // px the wavefront has travelled back down toward the radar
      const toRadar=Math.atan2(gy-T.sy, gx-T.sx), halfSpan=0.55;   // ±~31° wedge toward the radar
      g.strokeStyle='rgba(255,150,120,0.9)'; g.lineWidth=3;
      g.beginPath(); g.arc(T.sx,T.sy, h*0.02+back, toRadar-halfSpan, toRadar+halfSpan); g.stroke(); }
  }
  echoes=echoes.filter(e=>e.r>-200);   // return time ∝ range: GEO takes ~2× as long back as MEO
}

/* ---- SCOPE MODEL (honest radar physics) ------------------------------------------------------
   • GAIN amplifies signal AND noise together → it NEVER improves SNR, it only decides what saturates.
     So you can crank the gain forever and GEO stays buried: the noise rises right along with it.
   • Only PULSE INTEGRATION helps. Averaging the returns lets the signal (fixed range bin) add up while
     the random noise partly cancels, so SNR grows as √(pulses integrated). Watch it climb pulse-by-pulse.
   • Vertical axis is dB (the true LEO→GEO drop is ~69 dB; we compress the spacing a little for legibility).
   • Horizontal axis is RANGE = round-trip TIME (linear), so GEO's spike sits at ~2× MEO's, matching the
     round-trip you see in the sky view. */
const TGT_SNR_DB = { LEO:26, MEO:-2, GEO:-22 };   // single-pulse SNR of each target (compressed spread)
let integCount = 1;        // pulses currently integrated (1 = single-pulse mode)
let averaging = null;      // {target, count, rate} while an averaging run is active
function gainOffsetDb(){ return (+($('radarGain')?$('radarGain').value:20))/100*40; }   // 0…40 dB
function targetN(){ const s=+($('radarAvg')?$('radarAvg').value:0); return Math.max(1,Math.round(Math.pow(10, s/100*3))); }  // 1…1000
function radarAvgChanged(){ integCount=1; averaging=null; const N=targetN();
  if($('radarAvgV')) $('radarAvgV').textContent=N.toLocaleString();
  const btn=$('radarStart'); if(btn) btn.style.display = N>1?'inline-block':'none'; }
window.radarAvgChanged=radarAvgChanged;
function startAveraging(){ const N=targetN(); if(N<=1) return; integCount=1; averaging={target:N, count:0, rate:N/4}; }
window.startAveraging=startAveraging;
function drawScope(){ const cv=$('radarScope'); if(!cv) return; if(!scopeCtx) scopeCtx=fit(cv);
  const w=cv.width,h=cv.height,g=scopeCtx; g.clearRect(0,0,w,h); g.fillStyle='#020a04'; g.fillRect(0,0,w,h);
  const railY=h*0.10, base=h*0.88, margin=w*0.06;   // saturation rail on top, baseline near bottom
  const dbMin=-6, dbMax=48;                          // absolute dB window
  const yForDb=db=>base-(Math.max(dbMin,Math.min(dbMax,db))-dbMin)/(dbMax-dbMin)*(base-railY);
  const rToX=r=>margin + (r/RADAR.maxR)*(w-2*margin);   // LINEAR range axis (∝ round-trip time)
  if($('radarGainV')) $('radarGainV').textContent='+'+Math.round(gainOffsetDb())+' dB';
  // graticule (dB gridlines)
  g.strokeStyle='rgba(60,180,90,.15)'; g.lineWidth=1; g.font=(h*0.032)+'px monospace';
  for(let db=0;db<=dbMax;db+=12){ const y=yForDb(db); g.beginPath(); g.moveTo(margin,y); g.lineTo(w-2,y); g.stroke();
    g.fillStyle='#2f6f45'; g.textAlign='left'; g.fillText(db+' dB',2,y+h*0.012); }
  // range ticks under each target
  for(const T of RTARGETS){ const x=rToX(T.r); g.strokeStyle='rgba(60,120,90,.25)';
    g.beginPath(); g.moveTo(x,railY); g.lineTo(x,base); g.stroke(); }
  // saturation rail
  g.strokeStyle='rgba(255,80,80,.6)'; g.setLineDash([8,6]); g.lineWidth=1.5;
  g.beginPath(); g.moveTo(0,railY); g.lineTo(w,railY); g.stroke(); g.setLineDash([]);
  g.fillStyle='#ff8080'; g.textAlign='right'; g.fillText('saturation rail',w-6,railY-4); g.textAlign='left';
  // noise floor level: rises with GAIN, falls by 10·log10(N) as integration accumulates
  const gOff=gainOffsetDb(), integDb=10*Math.log10(integCount), noiseDb=gOff-integDb;
  const nY=yForDb(noiseDb), jitter=(h*0.06)/Math.sqrt(integCount);   // grass level + fluctuation both drop with N
  g.strokeStyle='#39d353'; g.lineWidth=1.4; g.beginPath();
  for(let x=margin;x<=w;x+=2){ const n=(Math.sin(x*0.7+perfNow()*0.004)+Math.sin(x*0.31+perfNow()*0.006))*0.5;
    const rnd=(((x*2654435761)>>>0)%1000/1000-0.5); const y=nY-(n*0.5+rnd)*jitter;
    x===margin?g.moveTo(x,y):g.lineTo(x,y); }
  g.stroke();
  g.fillStyle='#2f8f52'; g.textAlign='left'; g.fillText('noise floor',margin+2,nY-h*0.015);
  // target spikes
  let sat=[],vis=[],lost=[];
  for(const T of RTARGETS){ const sigDb=TGT_SNR_DB[T.name]+gOff, x=rToX(T.r);
    const clipped=sigDb>=dbMax, yTop=yForDb(sigDb), snr=sigDb-noiseDb, buried=snr<3;
    g.strokeStyle=T.col; g.lineWidth=4; g.globalAlpha=buried?0.32:1;
    if(buried) g.setLineDash([3,4]);
    g.beginPath(); g.moveTo(x,base); g.lineTo(x,yTop); g.stroke(); g.setLineDash([]);
    g.globalAlpha=1; g.fillStyle=T.col; g.font='bold '+(h*0.04)+'px monospace'; g.textAlign='center';
    const tag=clipped?' ⚠SAT':buried?' (in noise)':' '+Math.round(snr)+' dB';
    g.fillText(T.name+tag, x, Math.max(railY-h*0.012, Math.min(base-h*0.02, yTop-h*0.02)));
    (clipped?sat:buried?lost:vis).push(T.name); }
  g.textAlign='left'; g.fillStyle='#7fbf8f'; g.font=(h*0.038)+'px monospace';
  g.fillText('range / round-trip time →   (LEO near · GEO ≈2× MEO)',margin+2,base+h*0.05);
  // status line
  if($('radarMsg')){ let msg;
    if(averaging) msg='integrating… '+integCount.toLocaleString()+' / '+averaging.target.toLocaleString()+' pulses · SNR +'+Math.round(integDb)+' dB';
    else { const parts=[]; if(sat.length)parts.push(sat.join('/')+' saturated'); if(vis.length)parts.push(vis.join('/')+' clean'); if(lost.length)parts.push(lost.join('/')+' in noise');
      msg = integCount>1? ('integrated '+integCount.toLocaleString()+' pulses · '+parts.join(' · ')) : parts.join(' · '); }
    $('radarMsg').textContent=msg; }
}


/* ===================== SCENE: RA/DEC — 3-D celestial sphere =====================
   Earth at the center; a wireframe celestial sphere (RA meridians + DEC parallels) painted around it.
   RA/DEC are read in DECIMAL DEGREES. Standard view controls: drag=rotate, wheel=zoom, arrows=rotate. */
let radecCtx=null;
const rdCam={ theta:-0.9, phi:1.05, zoom:1, panx:0, pany:0 };
// unit direction on the celestial sphere for a given RA/Dec (both degrees)
function rdDir(raDeg,decDeg){ const ra=raDeg*Math.PI/180, dec=decDeg*Math.PI/180;
  return [Math.cos(dec)*Math.cos(ra), Math.cos(dec)*Math.sin(ra), Math.sin(dec)]; }
// project a 3-D point (celestial-sphere units, radius 1) to screen through the orbiting camera
function rdProject(P,cx,cy,R){ const d=[Math.sin(rdCam.phi)*Math.cos(rdCam.theta), Math.sin(rdCam.phi)*Math.sin(rdCam.theta), Math.cos(rdCam.phi)];
  let right=[-Math.sin(rdCam.theta),Math.cos(rdCam.theta),0];
  let up=[ -d[2]*right[1], d[2]*right[0], d[0]*right[1]-d[1]*right[0] ];   // up = d × right
  const sx=P[0]*right[0]+P[1]*right[1]+P[2]*right[2];
  const sy=P[0]*up[0]+P[1]*up[1]+P[2]*up[2];
  const depth=P[0]*d[0]+P[1]*d[1]+P[2]*d[2];   // camera sits at +d → front hemisphere has depth > 0
  return [cx+rdCam.panx+sx*R*rdCam.zoom, cy+rdCam.pany-sy*R*rdCam.zoom, depth];
}
// Draw a closed 3-D curve as a MESH line: split into front (bright) and back (dim) segments by depth,
// so the whole wireframe globe is visible with a proper near/far shading instead of being culled away.
// Convention matches the globe: front hemisphere = depth > 0 (nearer the camera at +d).
function rdMesh(g,pts,cx,cy,R,front,back,lwF,lwB){
  let prev=null;
  for(const P of pts){ const q=rdProject(P,cx,cy,R); const isBack=q[2]<0;
    if(prev){ g.strokeStyle=isBack||prev.b?back:front; g.lineWidth=isBack||prev.b?lwB:lwF;
      g.beginPath(); g.moveTo(prev.x,prev.y); g.lineTo(q[0],q[1]); g.stroke(); }
    prev={x:q[0],y:q[1],b:isBack}; } }
// Render Earth as a real sphere at screen (ex,ey) radius r, oriented by the current RA/DEC camera.
// The camera basis: view axis d (toward camera = −d), screen-right `right`, screen-up `up`. A screen
// pixel (sx,sy) inside the disc maps to sphere point  P = sx·right + sy·up + sz·(−d)  with sz=√(1−sx²−sy²);
// P's z is latitude, atan2(P.y,P.x) is longitude → sample the equirectangular texture. World +z is the
// celestial/rotation pole, so the globe tracks the grid exactly.
function rdDrawGlobe(g,ex,ey,r){
  const th=rdCam.theta, ph=rdCam.phi;
  const d=[Math.sin(ph)*Math.cos(th), Math.sin(ph)*Math.sin(th), Math.cos(ph)];
  const right=[-Math.sin(th),Math.cos(th),0];
  const up=[ -d[2]*right[1], d[2]*right[0], d[0]*right[1]-d[1]*right[0] ];
  if(!iodTexData){ const grd=g.createRadialGradient(ex-r*0.3,ey-r*0.3,r*0.2,ex,ey,r);
    grd.addColorStop(0,'#3aa0e6'); grd.addColorStop(1,'#123a63'); g.fillStyle=grd; g.beginPath(); g.arc(ex,ey,r,0,7); g.fill(); return; }
  const R2=r*r, x0=Math.floor(ex-r), y0=Math.floor(ey-r), sz=Math.ceil(2*r)+1;
  const img=g.getImageData(x0,y0,sz,sz), px=img.data, tw=iodTexW, thh=iodTexH, td=iodTexData;
  // light direction (from upper-left, in screen space projected to 3-D) for gentle shading
  const lit=v3norm([right[0]*0.5+up[0]*0.6-d[0]*0.6, right[1]*0.5+up[1]*0.6-d[1]*0.6, right[2]*0.5+up[2]*0.6-d[2]*0.6]);
  for(let yy=0; yy<sz; yy++){ for(let xx=0; xx<sz; xx++){
    const sx=(x0+xx-ex)/r, sy=-(y0+yy-ey)/r, rr=sx*sx+sy*sy; if(rr>1) continue;
    const szc=Math.sqrt(1-rr);                                   // toward the viewer (+d = camera side)
    // world point on the near hemisphere (facing the camera, along +d)
    const P=[ sx*right[0]+sy*up[0]+szc*d[0], sx*right[1]+sy*up[1]+szc*d[1], sx*right[2]+sy*up[2]+szc*d[2] ];
    const lat=Math.asin(Math.max(-1,Math.min(1,P[2]))), lon=Math.atan2(P[1],P[0]);
    let u=(lon/(2*Math.PI)+0.5), v=(0.5-lat/Math.PI);
    let tx=(u*tw)|0, ty=(v*thh)|0; if(tx<0)tx=0; if(tx>=tw)tx=tw-1; if(ty<0)ty=0; if(ty>=thh)ty=thh-1;
    const ti=(ty*tw+tx)*4;
    const sh=0.35+0.65*Math.max(0, P[0]*lit[0]+P[1]*lit[1]+P[2]*lit[2]);   // diffuse shading
    const o=(yy*sz+xx)*4;
    px[o]=td[ti]*sh; px[o+1]=td[ti+1]*sh; px[o+2]=td[ti+2]*sh; px[o+3]=255;
  }}
  g.putImageData(img,x0,y0);
}
function drawRadec(){ const cv=$('radec'); if(!cv) return; if(!radecCtx) radecCtx=fit(cv);
  const w=cv.width,h=cv.height,g=radecCtx; g.clearRect(0,0,w,h);
  g.fillStyle='#020814'; g.fillRect(0,0,w,h);
  const ra=+$('raSel').value, dec=+$('decSel').value, fs=Math.round(w*0.016);
  $('raV').textContent=ra.toFixed(1)+'°'; $('decV').textContent=(dec>=0?'+':'')+dec.toFixed(1)+'°';
  const cx=w*0.5, cy=h*0.5, R=Math.min(w,h)*0.42;
  // ---- celestial-sphere wireframe (full mesh, front bright / back dim) ----
  const FR='rgba(110,165,230,.55)', BK='rgba(70,110,165,.16)';   // front / back line colors
  // DEC parallels (rings of constant declination), every 15°
  for(let d=-75;d<=75;d+=15){ const ring=[]; for(let a=0;a<=360;a+=4) ring.push(rdDir(a,d));
    if(d===0) rdMesh(g,ring,cx,cy,R,'rgba(120,180,255,.85)','rgba(120,180,255,.28)',2,1.4);
    else rdMesh(g,ring,cx,cy,R,FR,BK,1.2,1); }
  // RA meridians (great half-circles pole to pole), every 15° (= 1 hour of RA)
  for(let a=0;a<360;a+=15){ const mer=[]; for(let d=-90;d<=90;d+=4) mer.push(rdDir(a,d));
    rdMesh(g,mer,cx,cy,R,FR,BK,1.2,1); }
  // poles + equator labels (small)
  g.font=fs+'px monospace'; g.textAlign='center';
  for(const [d,lab,col] of [[90,'N pole +90°','#9fd0ff'],[-90,'S pole −90°','#7a90b8']]){ const q=rdProject(rdDir(0,d),cx,cy,R);
    g.fillStyle=col; g.beginPath(); g.arc(q[0],q[1],Math.max(2.5,w*0.005),0,7); g.fill();
    if(q[2]>=0){ g.fillText(lab,q[0],q[1]-w*0.018); } }
  { const q=rdProject(rdDir(ra+50,0),cx,cy,R); if(q[2]>=0){ g.fillStyle='#7fa8dd'; g.fillText('celestial equator (Dec 0°)',q[0],q[1]-w*0.012); } }
  // ---- Earth as a TRUE 3-D globe, sampled through the same camera basis so it rotates exactly with the
  // mesh grid: look down the celestial N pole → Earth's N pole is centered; view edge-on → equator across. ----
  const eC=rdProject([0,0,0],cx,cy,R), ex=eC[0], ey=eC[1], eR=R*0.13*rdCam.zoom;
  rdDrawGlobe(g,ex,ey,eR);
  g.strokeStyle='rgba(120,190,255,.6)'; g.lineWidth=1.5; g.beginPath(); g.arc(ex,ey,eR,0,7); g.stroke();
  // ---- the (RA,Dec) direction: a ray from Earth out to the sphere + marker ----
  // The marker is OCCLUDED by the sphere when it's on the far side (depth pM[2] < 0): draw it hollow/dim
  // there so you can read front-vs-back at a glance; the ray dashes dim on the hidden segment too.
  const dir=rdDir(ra,dec), pM=rdProject(dir,cx,cy,R), pE=rdProject([0,0,0],cx,cy,R);
  const behind = pM[2] < 0;
  g.strokeStyle = behind?'rgba(57,211,83,.28)':'#39d353'; g.setLineDash([4,4]); g.lineWidth=2;
  g.beginPath(); g.moveTo(pE[0],pE[1]); g.lineTo(pM[0],pM[1]); g.stroke(); g.setLineDash([]);
  const md=Math.max(4,w*0.008);
  if(behind){ // on the far side of the celestial sphere — show a faint hollow ring only
    g.strokeStyle='rgba(57,211,83,.4)'; g.lineWidth=2; g.beginPath(); g.arc(pM[0],pM[1],md,0,7); g.stroke();
    g.fillStyle='rgba(159,224,175,.45)'; g.font=Math.round(fs*1.1)+'px monospace'; g.textAlign='left';
    g.fillText('(behind sphere)', pM[0]+w*0.02, pM[1]);
  } else {
    g.fillStyle='#39d353'; g.beginPath(); g.arc(pM[0],pM[1],md,0,7); g.fill();
    g.strokeStyle='#39d353'; g.lineWidth=2; g.beginPath(); g.arc(pM[0],pM[1],Math.max(8,w*0.016),0,7); g.stroke();
    g.fillStyle='#9fe0af'; g.font='bold '+Math.round(fs*1.25)+'px monospace'; g.textAlign='left';
    g.fillText('RA '+ra.toFixed(1)+'°, Dec '+(dec>=0?'+':'')+dec.toFixed(1)+'°', pM[0]+w*0.02, pM[1]);
  }
  // hint
  g.fillStyle='#3a4a66'; g.font=fs+'px monospace'; g.textAlign='left'; g.fillText('left-drag pan · shift/right-drag rotate · wheel zoom · R reset',w*0.03,h*0.97);
}


/* ===================== SCENE: IOD — tag the sat, watch the orbit converge =====================
   Realistic single-night astrometry of an INCLINED orbit (so Dec varies across the arc). The mount
   tracks the satellite → stars trail into streaks, the target stays a point. Click it → a plate-solve
   animation walks reticles onto ~10 star-streak centers, then reads off (time, RA, Dec). Each measured
   direction is a 3-D line of sight from a stationary Earth.
     • 2 sight-lines → they already span the orbit PLANE (size still unknown).
     • 3+ sight-lines → the plane is OVER-determined; the small measurement scatter gives the orbit a
       finite UNCERTAINTY, drawn as a translucent band that narrows as more/wider tags come in.
   Dynamics: 3-D circular orbit, forward-modeled to RA/Dec/time. Validated numerically. */
const IOD_MU=398600.4418, IOD_RE=6371, IOD_wE=7.2921159e-5;   // km, km, rad/s
const IOD_TRUTH={ a:42600, inc:20*Math.PI/180, Om:0.6, th0:2.15, lam0:0.42 };   // hidden orbit to recover
const IOD_TIMES=[0, 480, 960, 9600, 10080, 10560];           // cluster · GAP · cluster (seconds)
const IOD_NEXP=IOD_TIMES.length;
const IOD_AS=Math.PI/180/3600;                                // one arcsecond in radians
const IOD_NOISE=0.05*IOD_AS, IOD_MINPTS=3;                    // per-coordinate astrometric σ ≈ 0.05″
let iodFrame=0, iodTags=[], iodMainCtx=null, iodOrbCtx=null, iodSolve=null, iodStars=[];
// ---- vector helpers ----
function v3sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function v3dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function v3cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function v3norm(a){const n=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/n,a[1]/n,a[2]/n];}
// ---- 3-D circular-orbit model ----
function iodSat3(a,inc,Om,th0,t){ const n=Math.sqrt(IOD_MU/(a*a*a)), u=th0+n*t;
  const cu=Math.cos(u),su=Math.sin(u),cO=Math.cos(Om),sO=Math.sin(Om),ci=Math.cos(inc),si=Math.sin(inc);
  return [ a*(cu*cO-su*ci*sO), a*(cu*sO+su*ci*cO), a*su*si ]; }
function iodObs3(lam0,t){ const p=lam0+IOD_wE*t; return [IOD_RE*Math.cos(p), IOD_RE*Math.sin(p), 0]; }
function iodRADec(a,inc,Om,th0,lam0,t){ const s=iodSat3(a,inc,Om,th0,t), o=iodObs3(lam0,t);
  const d=v3sub(s,o), r=Math.hypot(d[0],d[1],d[2]); return { ra:Math.atan2(d[1],d[0]), dec:Math.asin(d[2]/r) }; }
function iodAng(x){ return Math.atan2(Math.sin(x),Math.cos(x)); }
function iodFrameTime(i){ return IOD_TIMES[i]; }
function iodUnit(ra,dec){ return [Math.cos(dec)*Math.cos(ra), Math.cos(dec)*Math.sin(ra), Math.sin(dec)]; }
// ---- Earth image for the orbit panel (same texture the 3-D modules use); gradient fallback if blocked ----
const iodEarthImg=new Image(); let iodEarthReady=false;
// equirectangular texture pixels, sampled to render Earth as a TRUE 3-D globe in the RA/DEC panel
let iodTexData=null, iodTexW=0, iodTexH=0;
iodEarthImg.crossOrigin='anonymous';
iodEarthImg.onload=()=>{ iodEarthReady=true;
  try{ const tw=256, th=128, tc=document.createElement('canvas'); tc.width=tw; tc.height=th;
    const tg=tc.getContext('2d'); tg.drawImage(iodEarthImg,0,0,tw,th);
    iodTexData=tg.getImageData(0,0,tw,th).data; iodTexW=tw; iodTexH=th; }catch(e){ iodTexData=null; }
  if(scene==='iod') iodDrawOrbit(); if(scene==='radec') drawRadec(); };
iodEarthImg.onerror=()=>{ iodEarthReady=false; };
// resolved through OA_TEX (local photo → pinned CDN → schematic); falls back to a flat globe
{ const _c=(window.OA_TEX?OA_TEX.chain('earth'):['vendor/textures/earth_schematic.jpg']); let _i=0;
  iodEarthImg.onerror=()=>{ if(++_i<_c.length) iodEarthImg.src=_c[_i]; else iodEarthReady=false; };
  iodEarthImg.src=_c[0]; }
// ---- star field ----
function iodBuildStars(){ iodStars=[]; let s=20260714;
  const rnd=()=>{ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; };
  for(let i=0;i<11;i++) iodStars.push({x:0.1+0.8*rnd(), y:0.14+0.72*rnd(), b:0.5+0.5*rnd()}); }
iodBuildStars();
// mount tracks the target: satellite ~centered (small per-frame shift); the STAR FIELD marches right.
const IOD_STREAK=0.06, IOD_STARSHIFT=0.11;
function iodSatScreen(i,w,h){ const t=iodFrameTime(i), p=iodRADec(IOD_TRUTH.a,IOD_TRUTH.inc,IOD_TRUTH.Om,IOD_TRUTH.th0,IOD_TRUTH.lam0,t);
  const dx=(i-(IOD_NEXP-1)/2)*w*0.018, dy=Math.sin(i*1.1+0.4)*h*0.06;
  return { x:w*0.5+dx, y:h*0.5+dy, ra:p.ra, dec:p.dec, t }; }
function iodDrawMain(){ const cv=$('iodMain'); if(!cv) return; if(!iodMainCtx) iodMainCtx=fit(cv);
  const g=iodMainCtx,w=cv.width,h=cv.height; g.clearRect(0,0,w,h);
  g.fillStyle='#01040a'; g.fillRect(0,0,w,h);
  const fs=Math.round(w*0.026);
  g.fillStyle='#3a4a66'; g.font=fs+'px monospace'; g.textAlign='left';
  g.fillText('tracking the target — stars STREAK, the satellite holds',fs*0.6,fs*1.4);
  const sl=w*IOD_STREAK, shift=iodFrame*w*IOD_STARSHIFT;
  for(const st of iodStars){ let cx=((st.x*w+shift)%w+w)%w; const cy=st.y*h;
    g.strokeStyle='rgba(200,218,255,'+(0.35+0.5*st.b)+')'; g.lineWidth=Math.max(1.5,w*0.0028*(0.55+0.8*st.b)); g.lineCap='round';
    g.beginPath(); g.moveTo(cx-sl/2,cy); g.lineTo(cx+sl/2,cy); g.stroke(); st._cx=cx; st._cy=cy; }
  // plate-solve reticles: animate on during the solve, then STAY on for an already-solved frame
  // (so the astrometry lock stays visible until you step to the next exposure).
  const solvingHere = iodSolve && iodSolve.frame===iodFrame;
  const solvedHere = iodTags.some(t=>t.i===iodFrame);
  if(solvingHere || solvedHere){ const k=solvingHere? Math.min(iodStars.length, iodSolve.n) : iodStars.length;
    for(let j=0;j<k;j++){ const st=iodStars[j], cx=st._cx, cy=st._cy, rr=w*0.02;
      g.strokeStyle=solvedHere&&!solvingHere?'rgba(57,211,83,.55)':'#39d353'; g.lineWidth=2; g.beginPath(); g.arc(cx,cy,rr,0,7); g.stroke();
      g.beginPath(); g.moveTo(cx-rr*1.5,cy); g.lineTo(cx-rr*0.6,cy); g.moveTo(cx+rr*0.6,cy); g.lineTo(cx+rr*1.5,cy);
      g.moveTo(cx,cy-rr*1.5); g.lineTo(cx,cy-rr*0.6); g.moveTo(cx,cy+rr*0.6); g.lineTo(cx,cy+rr*1.5); g.stroke(); } }
  const p=iodSatScreen(iodFrame,w,h), tagged=iodTags.some(t=>t.i===iodFrame), solving=iodSolve&&iodSolve.frame===iodFrame;
  const r=w*0.016;
  g.strokeStyle=tagged?'#39d353':(solving?'#ffcf4d':'#ff9b52'); g.lineWidth=3; g.beginPath(); g.arc(p.x,p.y,r,0,7); g.stroke();
  g.fillStyle=tagged?'#39d353':'#ffcf4d'; g.beginPath(); g.arc(p.x,p.y,Math.max(3,w*0.006),0,7); g.fill();
  g.fillStyle=tagged?'#39d353':'#ffe38a'; g.font='bold '+fs+'px monospace'; g.textAlign='center';
  g.fillText(tagged?'✓ solved':'← the satellite (click me)',p.x,p.y-r*2.0);
}
function iodStartSolve(){ if(iodSolve) return; iodSolve={ frame:iodFrame, n:0, t0:performance.now() };
  $('iodTagState').innerHTML='<b style="color:#ffcf4d">Plate-solving…</b> locking onto star-streak centers to define the sky grid.'; }
function iodOnClick(ev){ const cv=$('iodMain'); if(!cv||iodSolve) return;
  if(iodTags.some(t=>t.i===iodFrame)){ $('iodTagState').textContent='this exposure is already solved ✓'; return; }
  const rect=cv.getBoundingClientRect(); if(!rect.width) return; const dpr=cv.width/rect.width;
  const mx=(ev.clientX-rect.left)*dpr, my=(ev.clientY-rect.top)*dpr;
  const p=iodSatScreen(iodFrame,cv.width,cv.height), R=cv.width*0.05;
  if(Math.hypot(mx-p.x,my-p.y)<=R) iodStartSolve();
  else $('iodTagState').textContent='that’s a streaked star — click the crisp POINT (the tracked satellite)'; }
function iodFinishSolve(){ const i=iodSolve.frame, t=iodFrameTime(i);
  const p=iodRADec(IOD_TRUTH.a,IOD_TRUTH.inc,IOD_TRUTH.Om,IOD_TRUTH.th0,IOD_TRUTH.lam0,t);
  // deterministic pseudo-random helpers keyed on the frame index (so a tag is reproducible)
  const rnd=s=>{ let x=Math.sin((i+1)*s)*43758.5453; return (x-Math.floor(x))-0.5; };
  const gau=s=>rnd(s)+rnd(s*2.3)+rnd(s*5.1);                       // ~gaussian (sum of 3 uniforms), σ≈0.5
  // each measurement's reported 1σ clusters around 0.05″ with a little scatter (0.035–0.075″)
  const sigma=IOD_NOISE*(0.7+0.8*(rnd(9.7)+0.5));                  // per-tag reported uncertainty (rad)
  const nr=gau(12.9)*sigma/1.5, nd=gau(78.2)*sigma/1.5;           // actual offsets drawn at that σ
  iodTags.push({ i, t, ra:p.ra+nr, dec:p.dec+nd, sigma, u:iodUnit(p.ra+nr,p.dec+nd) }); iodTags.sort((a,b)=>a.t-b.t);
  iodSolve=null; iodRenderTable(); iodDrawMain(); iodDrawOrbit();
  $('iodTagState').innerHTML='Solved exposure '+(i+1)+' ✓ — a new <b style="color:#5fd0ff">line of sight</b> is added at right.'; }
function iodStep(d){ if(iodSolve) return; iodFrame=(iodFrame+d+IOD_NEXP)%IOD_NEXP;
  $('iodFrameN').textContent=iodFrame+1;
  $('iodFrameT').textContent='t + '+(iodFrameTime(iodFrame)/3600).toFixed(2)+' h';
  $('iodTagState').innerHTML = iodTags.some(t=>t.i===iodFrame)?'this exposure is solved ✓'
    :'The telescope tracks the target, so <b>stars streak</b> and the satellite is the lone <b>point</b> — click it to plate-solve this exposure.';
  iodDrawMain(); iodDrawOrbit(); }
window.iodStep=iodStep;
function iodRenderTable(){ const el=$('iodTable'); if(!el) return;
  let html='<tr style="color:#93aacb;text-align:left"><th style="padding:4px 6px">#</th><th>time</th><th>RA (°)</th><th>Dec (°)</th><th>±σ (″)</th></tr>';
  if(!iodTags.length) html+='<tr><td colspan="5" style="padding:8px 6px;color:#6f86a8">no measurements yet — click the satellite to solve an exposure</td></tr>';
  iodTags.forEach((t,k)=>{ const sAS=(t.sigma/IOD_AS); html+='<tr style="border-top:1px solid #23406a"><td style="padding:5px 6px">'+(k+1)+
    '</td><td>+'+(t.t/3600).toFixed(2)+' h</td><td>'+(((t.ra*180/Math.PI)%360+360)%360).toFixed(3)+
    '</td><td>'+(t.dec>=0?'+':'')+(t.dec*180/Math.PI).toFixed(3)+
    '</td><td style="color:#7fbf8f">±'+sAS.toFixed(3)+'</td></tr>'; });
  el.innerHTML=html; $('iodFrameTot')&&($('iodFrameTot').textContent=IOD_NEXP); }
// ---- fit: plane from sight-lines, then in-plane size/phase ----
function iodPlaneNormal(us){ // smallest-eigenvector of M=Σ uuᵀ  via power-iterate on (cI−M)
  let M=[[0,0,0],[0,0,0],[0,0,0]];
  for(const u of us) for(let i=0;i<3;i++) for(let j=0;j<3;j++) M[i][j]+=u[i]*u[j];
  let v=[0.13,0.21,1];
  for(let k=0;k<160;k++){ let w=[0,0,0]; for(let i=0;i<3;i++){ let s=(3*v[i]); for(let j=0;j<3;j++) s-=M[i][j]*v[j]; w[i]=s; }
    v=v3norm(w); }
  if(v[2]<0) v=[-v[0],-v[1],-v[2]]; return v; }
function iodNormToElems(n){ return { inc:Math.acos(Math.max(-1,Math.min(1,n[2]))), Om:Math.atan2(n[0],-n[1]) }; }
function iodSSE(P){ let s=0; for(const g of iodTags){ const p=iodRADec(P.a,P.inc,P.Om,P.th0,IOD_TRUTH.lam0,g.t);
  s+=iodAng(p.ra-g.ra)**2+(p.dec-g.dec)**2; } return s; }
function iodFitSize(inc,Om){ // coarse (a,th0) seed in the given plane, by SSE over RA+Dec
  let best={sse:1e9,a:42164,th0:0};
  for(let ai=0;ai<120;ai++){ const a=36000+(50000-36000)*ai/119;
    for(let ti=0;ti<240;ti++){ const th0=2*Math.PI*ti/240; const s=iodSSE({a,inc,Om,th0});
      if(s<best.sse) best={sse:s,a,th0}; } }
  return best; }
function iodRefine(P){ // seeded coordinate-descent polish of all four elements to the true minimum
  let step={a:800,inc:0.02,Om:0.02,th0:0.02};
  for(let it=0;it<200;it++){ let improved=false;
    for(const key of ['a','inc','Om','th0']){ const s=step[key];
      for(const d of [s,-s]){ const Q={...P}; Q[key]+=d; if(iodSSE(Q)<iodSSE(P)){ P=Q; improved=true; break; } } }
    if(!improved){ step={a:step.a*0.5,inc:step.inc*0.5,Om:step.Om*0.5,th0:step.th0*0.5}; if(step.a<1e-4) break; } }
  return P; }
function iodSolveOrbit(){ // returns {stage, ...}
  const tags=iodTags, N=tags.length;
  if(N<2) return { stage:N, determinate:false };
  const consensus=iodPlaneNormal(tags.map(t=>t.u)), pe=iodNormToElems(consensus);
  if(N===2) return { stage:2, determinate:false, normal:consensus, inc:pe.inc, Om:pe.Om };
  // seed size in the plane, then polish all 4 elements against the full forward model
  const sz=iodFitSize(pe.inc,pe.Om);
  let P=iodRefine({a:sz.a, inc:pe.inc, Om:pe.Om, th0:sz.th0});
  const rms=Math.sqrt(iodSSE(P)/(2*N));                          // RMS angular residual (rad)
  // Uncertainty scales with the FIT RESIDUAL (robust & stable): a poorly-constrained short arc leaves a
  // large residual → wide band; a well-spread arc drives the residual to the ~0.05″ noise floor → tight.
  const rmsAS=rms/IOD_AS;                                        // residual in arcsec
  const planeSig=Math.min(0.44, Math.max(0.009, rms*260));      // rad half-thickness of the band (~0.5°..25°)
  const sda=Math.min(6000, Math.max(15, rmsAS*3));              // semi-major-axis 1σ (km) from residual
  const sAng=Math.min(30, Math.max(0.02, rmsAS*0.02));          // inc/Ω/M 1σ in degrees, from residual
  const normal=[Math.sin(P.inc)*Math.sin(P.Om), -Math.sin(P.inc)*Math.cos(P.Om), Math.cos(P.inc)];
  const determinate = N>=IOD_MINPTS && rmsAS < 20;              // determined once the fit nears the noise floor
  return { stage:N, determinate, normal, inc:P.inc, Om:P.Om, a:P.a, th0:P.th0, rms, rmsAS, sda, sAng, planeSig };
}
// ---- camera (same scheme as the 3-D modules: drag=pan, shift/right-drag=rotate, wheel=zoom, arrows=rotate, R=reset) ----
const iodCam={ theta:-1.1, phi:1.15, zoom:1, panx:0, pany:0 };
function iodProject(P,w,h){ const d=[Math.sin(iodCam.phi)*Math.cos(iodCam.theta), Math.sin(iodCam.phi)*Math.sin(iodCam.theta), Math.cos(iodCam.phi)];
  let right=v3norm(v3cross([0,0,1],d)); let up=v3cross(d,right);
  const base=(Math.min(w,h)*0.40/54000)*iodCam.zoom;
  const sx=v3dot(P,right), sy=v3dot(P,up);
  return [ w*0.5+iodCam.panx + sx*base, h*0.5+iodCam.pany - sy*base ]; }
function iodCircleInPlane(a,inc,Om,cx_unused){ const pts=[]; // generate a circle of radius a in orbit plane
  const cO=Math.cos(Om),sO=Math.sin(Om),ci=Math.cos(inc),si=Math.sin(inc);
  for(let k=0;k<=96;k++){ const u=2*Math.PI*k/96, cu=Math.cos(u),su=Math.sin(u);
    pts.push([ a*(cu*cO-su*ci*sO), a*(cu*sO+su*ci*cO), a*su*si ]); } return pts; }
function iodPlaneDisc(normal,a){ const n=v3norm(normal); let e1=v3norm(v3cross(Math.abs(n[2])<0.9?[0,0,1]:[1,0,0],n)); let e2=v3cross(n,e1);
  const pts=[]; for(let k=0;k<=64;k++){ const u=2*Math.PI*k/64; pts.push([ a*(Math.cos(u)*e1[0]+Math.sin(u)*e2[0]), a*(Math.cos(u)*e1[1]+Math.sin(u)*e2[1]), a*(Math.cos(u)*e1[2]+Math.sin(u)*e2[2]) ]); } return pts; }
// ray (from observer O, dir u) extended to the orbit plane, then scaled to radius a → dot on the orbit
function iodRayToOrbit(O,u,normal,a){ const nu=v3dot(u,normal); if(Math.abs(nu)<1e-6) return null;
  const s=-v3dot(O,normal)/nu; const Q=[O[0]+s*u[0],O[1]+s*u[1],O[2]+s*u[2]]; const q=Math.hypot(Q[0],Q[1],Q[2])||1;
  return [Q[0]/q*a, Q[1]/q*a, Q[2]/q*a]; }
function iodPoly(g,pts,w,h){ g.beginPath(); for(let k=0;k<pts.length;k++){ const p=iodProject(pts[k],w,h); k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]); } }
function iodDrawOrbit(){ const cv=$('iodOrbit'); if(!cv) return; if(!iodOrbCtx) iodOrbCtx=fit(cv);
  const g=iodOrbCtx,w=cv.width,h=cv.height; g.clearRect(0,0,w,h); g.fillStyle='#02060e'; g.fillRect(0,0,w,h);
  const fs=Math.round(w*0.028);
  // equatorial GEO ring (reference)
  g.strokeStyle='rgba(120,160,220,.22)'; g.setLineDash([4,5]); g.lineWidth=1;
  iodPoly(g, iodCircleInPlane(42164,0,0), w,h); g.stroke(); g.setLineDash([]);
  // Earth at correct radius with the planet image
  const eC=iodProject([0,0,0],w,h), eR=(IOD_RE)*(Math.min(w,h)*0.40/54000)*iodCam.zoom;
  if(iodEarthReady){ g.save(); g.beginPath(); g.arc(eC[0],eC[1],eR,0,7); g.clip();
    g.drawImage(iodEarthImg, eC[0]-eR, eC[1]-eR, eR*2, eR*2); g.restore();
    g.strokeStyle='rgba(120,190,255,.6)'; g.lineWidth=1.5; g.beginPath(); g.arc(eC[0],eC[1],eR,0,7); g.stroke(); }
  else { const grd=g.createRadialGradient(eC[0]-eR*0.3,eC[1]-eR*0.3,eR*0.2,eC[0],eC[1],eR);
    grd.addColorStop(0,'#3aa0e6'); grd.addColorStop(1,'#123a63'); g.fillStyle=grd; g.beginPath(); g.arc(eC[0],eC[1],eR,0,7); g.fill(); }
  const sol=iodSolveOrbit(), tags=iodTags;
  // sight-lines
  for(const t of tags){ const O=iodObs3(IOD_TRUTH.lam0,t.t), far=[O[0]+t.u[0]*60000,O[1]+t.u[1]*60000,O[2]+t.u[2]*60000];
    const pO=iodProject(O,w,h), pF=iodProject(far,w,h);
    g.strokeStyle='rgba(95,208,255,.5)'; g.setLineDash([3,4]); g.lineWidth=1.5;
    g.beginPath(); g.moveTo(pO[0],pO[1]); g.lineTo(pF[0],pF[1]); g.stroke(); g.setLineDash([]); }
  if(sol && sol.stage===2){
    // exactly one plane is defined by two sight-lines (size still unknown) — show it as a disc
    g.strokeStyle='rgba(160,120,255,.55)'; g.lineWidth=1.6; iodPoly(g,iodPlaneDisc(sol.normal,44000),w,h); g.stroke();
    g.fillStyle='rgba(160,120,255,.10)'; g.fill();
  }
  if(sol && sol.stage>=3 && sol.a){
    // Translucent UNCERTAINTY BAND: many faint orbit rings with the plane normal jittered within ±planeSig,
    // building up a smear whose angular thickness = the plane uncertainty. It narrows as tags accumulate.
    const sig=Math.max(0.004, sol.planeSig);           // rad half-thickness (floor so it's always visible)
    const K=9;
    for(let k=0;k<K;k++){ const f=(k/(K-1)-0.5)*2;      // −1..+1
      // tilt the inclination and node by f·sig to sweep the plane through its 1σ cone
      const inc=sol.inc + f*sig, Om=sol.Om + f*sig*0.8;
      const al=0.05 + 0.10*(1-Math.abs(f));            // brighter near the center
      g.strokeStyle='rgba(255,207,77,'+al.toFixed(3)+')'; g.lineWidth=1;
      iodPoly(g, iodCircleInPlane(sol.a,inc,Om), w,h); g.stroke(); }
    // the best-fit orbit, bold on top of the band
    g.strokeStyle='#ffcf4d'; g.lineWidth=2.6; iodPoly(g, iodCircleInPlane(sol.a,sol.inc,sol.Om), w,h); g.stroke();
    // dots where each sight-line pierces the best orbit plane
    for(const t of tags){ const O=iodObs3(IOD_TRUTH.lam0,t.t); const hit=iodRayToOrbit(O,t.u,sol.normal,sol.a);
      if(hit){ const ph=iodProject(hit,w,h); g.fillStyle='#ff5a52'; g.beginPath(); g.arc(ph[0],ph[1],Math.max(4,w*0.008),0,7); g.fill();
        g.strokeStyle='#ff5a52'; g.lineWidth=1.5; g.beginPath(); g.arc(ph[0],ph[1],Math.max(7,w*0.014),0,7); g.stroke(); } }
  }
  // caption
  g.textAlign='center'; g.font='bold '+fs+'px monospace';
  if(!sol || sol.stage===0){ g.fillStyle='#6f86a8'; g.fillText('solve an exposure to cast the first sight-line',w*0.5,h*0.96); }
  else if(sol.stage===1){ g.fillStyle='#6f86a8'; g.fillText('1 sight-line — direction only',w*0.5,h*0.96); }
  else if(sol.stage===2){ g.fillStyle='#a884ff'; g.fillText('2 sight-lines → the orbit PLANE is fixed (size still unknown)',w*0.5,h*0.96); }
  else if(!sol.determinate){ g.fillStyle='#ff9b52'; g.fillText(sol.stage+' sight-lines — orbit found, but wide uncertainty band',w*0.5,h*0.96); }
  else { g.fillStyle='#ffe38a'; g.fillText('orbit locked:  a = '+sol.a.toFixed(0)+' ± '+sol.sda.toFixed(0)+' km',w*0.5,h*0.96); }
  iodUpdateStatus(sol);
}
function iodUpdateStatus(sol){ sol=sol||iodSolveOrbit(); const chip=$('iodFamState'), res=$('iodResult'), N=iodTags.length;
  if(chip){ chip.innerHTML = (sol&&sol.determinate)
    ? '<b style="color:#39d353">STATUS: DETERMINED ✓</b> — '+N+' sight-lines'
    : '<b style="color:#ff9b52">STATUS: INDETERMINATE</b> — '+N+' / '+IOD_MINPTS+'+ sight-lines'; }
  if(!res) return;
  if(N===0){ res.innerHTML='<div style="font-size:19px;color:#6f86a8">No measurements yet — click the satellite to solve exposures.</div>'; return; }
  if(N===1){ res.innerHTML='<div style="font-size:19px"><b>1 sight-line.</b> A single image gives a <b>direction</b> only — the object could be anywhere along that ray.</div>'; return; }
  if(sol.stage===2){ res.innerHTML='<div style="font-size:19px"><b style="color:#a884ff">Two sight-lines define a plane.</b> Both rays pass through Earth’s center region, so the orbit’s <b>plane</b> is pinned — trial inclination <b>≈ '+(sol.inc*180/Math.PI).toFixed(1)+'°</b>, node <b>≈ '+((sol.Om*180/Math.PI%360+360)%360).toFixed(0)+'°</b> — but its <b>size is still unknown</b> (any radius in that plane fits two directions).</div>'; return; }
  if(!sol.determinate){ res.innerHTML='<div style="font-size:19px"><b style="color:#ff9b52">Orbit found, but loosely constrained.</b> Three closely-spaced tags leave a wide <b>uncertainty band</b> (the translucent smear). Tag more exposures <b>across the gap</b> and the band tightens onto one orbit.</div>'; return; }
  const a=sol.a, n=Math.sqrt(IOD_MU/(a*a*a)), revday=n*86400/(2*Math.PI), P=2*Math.PI/n/3600;
  const sdn=1.5*n/a*sol.sda*86400/(2*Math.PI), sdP=1.5*P/a*sol.sda, dAng=sol.sAng;
  res.innerHTML='<div style="font-weight:bold;color:var(--accent);margin-bottom:4px">Recovered elements (TLE-style, ±1σ)</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:17px">'
    +iodRow('mean motion','n', revday.toFixed(6)+' rev/day','± '+sdn.toFixed(6))
    +iodRow('semi-major axis','a', a.toFixed(0)+' km','± '+sol.sda.toFixed(0))
    +iodRow('period','P', P.toFixed(3)+' h','± '+sdP.toFixed(3))
    +iodRow('inclination','i', (sol.inc*180/Math.PI).toFixed(2)+'°','± '+dAng.toFixed(2))
    +iodRow('RAAN','Ω', ((sol.Om*180/Math.PI%360+360)%360).toFixed(2)+'°','± '+dAng.toFixed(2))
    +iodRow('eccentricity','e', '0.000','(circular assumed)')
    +iodRow('arg. perigee','ω', '—','(undef. for e=0)')
    +iodRow('mean anomaly','M', ((sol.th0*180/Math.PI%360+360)%360).toFixed(2)+'°','± '+dAng.toFixed(2))
    +'</table>'
    +'<div class="note" style="font-size:15px;margin-top:8px">Two sight-lines already pin the <b>plane</b>; the 3rd and beyond <b>over-determine</b> it, so the ~0.05″ measurement scatter turns into the finite ±1σ error bars above. e is assumed circular.</div>';
}
function iodRow(name,sym,val,unc){ return '<tr style="border-top:1px solid #23406a">'
  +'<td style="padding:4px 6px;color:#93aacb">'+name+' <b style="color:#cfe3ff">'+sym+'</b></td>'
  +'<td style="text-align:right;color:#fff;font-weight:bold">'+val+'</td>'
  +'<td style="text-align:right;color:#7fbf8f;padding-left:10px">'+unc+'</td></tr>'; }
function iodReset(){ iodTags=[]; iodSolve=null; iodFrame=0; iodRenderTable(); iodStep(0); iodDrawMain(); iodDrawOrbit();
  $('iodTagState').innerHTML='Cleared. The telescope tracks the target, so <b>stars streak</b> and the satellite is the lone <b>point</b> — click it to plate-solve this exposure.'; }
window.iodReset=iodReset;
window.iodResetView=function(){ iodCam.theta=-1.1; iodCam.phi=1.15; iodCam.zoom=1; iodCam.panx=0; iodCam.pany=0; iodDrawOrbit(); };
// view controls — identical scheme to the 3-D modules
function iodInit(){ const cv=$('iodMain'); if(cv) cv.addEventListener('click',iodOnClick);
  const oc=$('iodOrbit'); if(oc){ let mode=0,lx=0,ly=0;
    oc.addEventListener('contextmenu',e=>e.preventDefault());
    oc.addEventListener('mousedown',e=>{ mode=(e.button===2||e.button===1||e.shiftKey||e.altKey)?2:1; lx=e.clientX; ly=e.clientY;
      oc.style.cursor=mode===2?'grabbing':'move'; e.preventDefault(); });
    addEventListener('mouseup',()=>{ mode=0; if(oc) oc.style.cursor='grab'; });
    addEventListener('mousemove',e=>{ if(!mode) return; const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
      if(mode===2){ iodCam.theta-=dx*0.006; iodCam.phi=Math.max(0.05,Math.min(Math.PI-0.05,iodCam.phi-dy*0.006)); }
      else { iodCam.panx+=dx; iodCam.pany+=dy; } iodDrawOrbit(); });
    oc.addEventListener('wheel',e=>{ iodCam.zoom=Math.max(0.4,Math.min(4,iodCam.zoom*(1-Math.sign(e.deltaY)*0.12))); iodDrawOrbit(); e.preventDefault(); },{passive:false});
    addEventListener('keydown',e=>{ if(scene!=='iod') return; const R=0.08;
      if(e.key==='ArrowLeft'){ iodCam.theta-=R; iodDrawOrbit(); e.preventDefault(); }
      else if(e.key==='ArrowRight'){ iodCam.theta+=R; iodDrawOrbit(); e.preventDefault(); }
      else if(e.key==='ArrowUp'){ iodCam.phi=Math.max(0.05,iodCam.phi-R); iodDrawOrbit(); e.preventDefault(); }
      else if(e.key==='ArrowDown'){ iodCam.phi=Math.min(Math.PI-0.05,iodCam.phi+R); iodDrawOrbit(); e.preventDefault(); }
      else if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey){ window.iodResetView(); } }); }
  iodRenderTable(); iodStep(0); }

/* ===================== SCENE: take a picture (streaks) ===================== */
let camCtx=null, camMode='stars', camStars=[], camSat={x:0.5};
// random positions + realistic brightness spread (many dim, a few bright); size tracks brightness
for(let i=0;i<48;i++){ const m=Math.pow(Math.random(),2.2);
  camStars.push({x:Math.random(), y:0.06+0.88*Math.random(), b:0.35+0.6*m, r:0.8+1.6*m}); }
function setCamMode(m){ camMode=m; $('modeStars').classList.toggle('sel',m==='stars'); $('modeSat').classList.toggle('sel',m==='sat'); }
window.setCamMode=setCamMode;
function drawCam(live){ const cv=$('cam'); if(!cv) return; if(!camCtx) camCtx=fit(cv);
  const w=cv.width,h=cv.height,g=camCtx; g.clearRect(0,0,w,h); g.fillStyle='#03060f'; g.fillRect(0,0,w,h);
  // fixed drift: the sky sweeps LEFT→RIGHT (N up, E left convention). +drift moves things right.
  // ~4 s to cross the frame — clearly in motion at a glance.
  const drift=(camT*0.00025)%1;
  const sf=Math.max(1,w*0.0016);   // star radius
  // Track the STARS → stars are held fixed, the satellite moves. Track the SATELLITE → satellite held,
  // stars move. The moving thing DRIFTS as a point live, and STREAKS in a developed exposure.
  const starsMove=(camMode==='sat'), satMoves=(camMode==='stars');
  for(const s of camStars){ let sx=((s.x+(starsMove?drift:0))%1)*w, sy=s.y*h;
    if(live && starsMove){ g.strokeStyle='rgba(210,224,248,'+s.b+')'; g.lineWidth=Math.max(1.5,w*0.0022*s.r); g.lineCap='round';
      g.beginPath(); g.moveTo(sx,sy); g.lineTo(sx+w*0.05,sy); g.stroke(); }
    else { g.fillStyle='rgba(230,238,255,'+s.b+')'; g.beginPath(); g.arc(sx,sy,sf*s.r,0,7); g.fill(); } }
  let px=((camSat.x+(satMoves?drift:0))%1)*w, py=h*0.5;
  if(live && satMoves){ g.strokeStyle='#ff5a52'; g.lineWidth=Math.max(3,w*0.004); g.lineCap='round';
    g.beginPath(); g.moveTo(px,py); g.lineTo(px+w*0.05,py); g.stroke(); }
  else { g.fillStyle='#ff5a52'; g.beginPath(); g.arc(px,py,Math.max(4,w*0.006),0,7); g.fill(); }
  g.fillStyle='#8aa'; g.font=(h*0.05)+'px monospace';
  g.textAlign='left'; g.fillText('E',6,h/2); g.textAlign='right'; g.fillText('W',w-6,h/2); g.textAlign='left';
}
let picHeld=false;
function takePicture(){ picHeld=true; drawCam(true);
  $('camNote').innerHTML = camMode==='stars'
    ? '📷 Tracking the STARS → the <b style="color:#ff8a80">satellite streaks</b> (its motion smears across the frame). Stars are points.'
    : '📷 Tracking the SATELLITE → the <b>stars streak</b> while the satellite holds as a point.';
  setTimeout(()=>{ picHeld=false; },2600); }
window.takePicture=takePicture;

/* ===================== loop + sizing ===================== */
let camT=0, t0=performance.now();
function sizeAll(){ skyCtx=fit($('radarSky')); scopeCtx=fit($('radarScope')); radecCtx=fit($('radec'));
  geoCtx=fit($('geoDiagram')); magCtx=fit($('magPlot')); camCtx=fit($('cam'));
  iodMainCtx=fit($('iodMain')); iodOrbCtx=fit($('iodOrbit')); }
function drawStatic(){ // redraw the current scene's static bits after a resize/switch
  if(scene==='phase'){ setSun(sunIdx); }
  else if(scene==='radar'){ drawRadarSky(0); drawScope(); }
  else if(scene==='iod'){ iodDrawMain(); iodDrawOrbit(); }
  else if(scene==='radec') drawRadec();
  else if(scene==='cam') drawCam(false);
}
addEventListener('resize',()=>{ sizeAll(); drawStatic(); });
// input wiring
$('raSel')&&$('raSel').addEventListener('input',drawRadec);
$('decSel')&&$('decSel').addEventListener('input',drawRadec);
$('sunAngle')&&$('sunAngle').addEventListener('input',()=>setSun(+$('sunAngle').value));
// RA/DEC celestial-sphere — STANDARD 3-D viewer controls (same scheme as the 3-D modules):
// left-drag = PAN · Shift/right-drag = ROTATE · wheel = ZOOM · arrows = ROTATE · R = reset view
(function(){ const oc=$('radec'); if(!oc) return; let mode=0,lx=0,ly=0;
  oc.addEventListener('contextmenu',e=>e.preventDefault());
  oc.addEventListener('mousedown',e=>{ mode=(e.button===2||e.button===1||e.shiftKey||e.altKey)?2:1; lx=e.clientX; ly=e.clientY;
    oc.style.cursor=mode===2?'grabbing':'move'; e.preventDefault(); });
  addEventListener('mouseup',()=>{ mode=0; if(oc) oc.style.cursor='grab'; });
  addEventListener('mousemove',e=>{ if(!mode) return; const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
    if(mode===2){ rdCam.theta-=dx*0.006; rdCam.phi=Math.max(0.15,Math.min(Math.PI-0.15,rdCam.phi-dy*0.006)); }
    else { rdCam.panx+=dx; rdCam.pany+=dy; } drawRadec(); });
  oc.addEventListener('wheel',e=>{ rdCam.zoom=Math.max(0.6,Math.min(2.5,rdCam.zoom*(1-Math.sign(e.deltaY)*0.1))); drawRadec(); e.preventDefault(); },{passive:false});
  oc.style.cursor='grab';
  addEventListener('keydown',e=>{ if(scene!=='radec') return; const R=0.09;
    // arrows mimic a drag in that direction (drag does theta-=dx, phi-=dy)
    if(e.key==='ArrowLeft'){ rdCam.theta+=R; drawRadec(); e.preventDefault(); }
    else if(e.key==='ArrowRight'){ rdCam.theta-=R; drawRadec(); e.preventDefault(); }
    else if(e.key==='ArrowUp'){ rdCam.phi=Math.max(0.15,rdCam.phi+R); drawRadec(); e.preventDefault(); }
    else if(e.key==='ArrowDown'){ rdCam.phi=Math.min(Math.PI-0.15,rdCam.phi-R); drawRadec(); e.preventDefault(); }
    else if(e.key.toLowerCase()==='r'&&!e.metaKey&&!e.ctrlKey){ rdCam.theta=-0.9; rdCam.phi=1.05; rdCam.zoom=1; rdCam.panx=0; rdCam.pany=0; drawRadec(); } });
})();

let lastTs=performance.now();
function loop(ts){ requestAnimationFrame(loop);   // schedule NEXT frame first — a draw throw can't kill the loop
  camT=ts-t0; const dt=Math.min(0.05,(ts-lastTs)/1000); lastTs=ts;
  try {
  if(scene==='cam' && !picHeld) drawCam(false);
  else if(scene==='iod'){
    if(iodSolve){ const el=(ts-iodSolve.t0)/1000;                 // plate-solve walk: ~1 reticle / 90 ms
      iodSolve.n=Math.floor(el/0.09);
      if(iodSolve.n>=iodStars.length){ iodFinishSolve(); } else { iodDrawMain(); } } }
  else if(scene==='radar'){
    // Averaging run: a high-PRF STREAM of pulses. The integrated-pulse count climbs smoothly in time,
    // so the noise floor averages DOWN as 10·log10(count) while the signal spikes hold — SNR grows in
    // time exactly as √(pulses). We spray pulses fast in the sky view so it reads as a continuous burst.
    if(averaging){ averaging.count += averaging.rate*dt;          // accumulate ~rate pulses/sec
      integCount = Math.min(averaging.target, 1+averaging.count); // fractional → smooth noise decay
      if(ts-radarLastFire>90){ radarLastFire=ts; fireRadar(); }   // fast pulse stream (many in flight)
      if(integCount>=averaging.target){ integCount=averaging.target; averaging=null; } }
    // single-pulse auto-fire (off by default): one ping ↔ one return arc, only after the last cleared.
    else if($('radarAuto')&&$('radarAuto').checked && pulses.length===0 && echoes.length===0 && ts-radarLastFire>1200){
      radarLastFire=ts; fireRadar(); }
    drawRadarSky(dt); drawScope(); }
  } catch(err){ if(!loop._warned){ loop._warned=true; console.error('tut7 loop draw error:',err); } }
}
// separate slow ticker for the Sun sweep (independent of frame rate)
setInterval(()=>{ if(scene==='phase' && sunPlaying) setSun(sunIdx+1); }, 90);

/* ===================== init ===================== */
preloadFrames();
sizeAll();
setSun(0);
iodInit();
showScene('phase');
requestAnimationFrame(loop);
