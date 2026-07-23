// Verify ALL six tut6 fan scenarios by executing the SHIPPED functions + arrays verbatim
// (MAINTENANCE §6.5). Slow (~40 s per mode) — not part of run.sh; run per mode:
//   node test/tut6-physics.verify.js public/tut6.html scatter|l1knife|tadpole|dro|freeret
// Release geometry mirrors releaseFan() at simT=0 (exact by rotational symmetry).
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'public/tut6.html','utf8');
const fn=name=>{ const m=src.match(new RegExp('function '+name+'\\([^)]*\\)\\{[^}]*\\}')); if(!m) throw new Error('extract '+name); return m[0]; };
const arr=name=>{ const m=src.match(new RegExp('const '+name+'\\s*=\\s*(\\[.*?\\]);')); if(!m) throw new Error('extract '+name); return JSON.parse(m[1]); };
const num=name=>{ const m=src.match(new RegExp('const '+name+'\\s*=\\s*([0-9.eE+]+)')); if(!m) throw new Error('extract '+name); return +m[1]; };
global.THREE={Vector3:class V{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}}};
const R_EARTH=6371,R_MOON=1737,D_EM=384400,T_MOON=27.32,MU_E=398600.4418,MU_M=4902.8;
eval(fn('orbPoint')); eval(fn('moonPos')); eval(fn('fanAcc')); eval(fn('fanStep'));
const SCAT_ANG=arr('SCAT_ANG'), SCAT_YINC=arr('SCAT_YINC'), SCAT_SF=arr('SCAT_SF');
const KNIFE=arr('KNIFE').map(JSON.stringify).map(JSON.parse), TAD=arr('TAD');
const DRO_SET=arr('DRO_SET'), FRET=arr('FRET');
const L1KX=num('L1KX'), SCAT_RP=num('SCAT_RP'), FR_RP=R_EARTH+330, HILL_KM=1.5e6;
const W_MOON=2*Math.PI/(T_MOON*86400), D2R=Math.PI/180;
const names=['red','yellow','green','cyan','purple','pink','pale'];

// ---- release geometry identical to shipped releaseFan() at simT=0 ----
const mp=moonPos(0); const ux=mp.x/D_EM, uz=mp.z/D_EM;
const wx=uz, wz=-ux;
const corotVx=(x,z)=>W_MOON*z, corotVz=(x,z)=>-W_MOON*x;
const mkXfer=rp=>{ const a=(rp+D_EM)/2, Th=Math.PI*Math.sqrt(a**3/MU_E)/86400;
  const apoM=moonPos(Th), pa=Math.atan2(apoM.z,apoM.x)+Math.PI;
  return {vp:Math.sqrt(MU_E*(2/rp-1/a)), pa}; };

function state(mode,i){
  let x,y=0,z,vx,vy=0,vz;
  if(mode==='scatter'){ const {vp,pa}=mkXfer(SCAT_RP);
    x=SCAT_RP*Math.cos(pa); z=SCAT_RP*Math.sin(pa);
    const tgx=-Math.sin(pa),tgz=Math.cos(pa),rax=Math.cos(pa),raz=Math.sin(pa);
    const dth=SCAT_ANG[i]*D2R, spd=vp*SCAT_SF[i];
    vx=spd*(tgx*Math.cos(dth)+rax*Math.sin(dth)); vz=spd*(tgz*Math.cos(dth)+raz*Math.sin(dth)); vy=spd*SCAT_YINC[i];
  } else if(mode==='l1knife'){ x=L1KX*ux; z=L1KX*uz; const k=KNIFE[i];
    vx=corotVx(x,z)+(k[0]*ux+k[1]*wx)/1000; vz=corotVz(x,z)+(k[0]*uz+k[1]*wz)/1000; vy=k[2]/1000;
  } else if(mode==='tadpole'){ const c=0.5,s=Math.sqrt(3)/2;
    const u4x=ux*c+wx*s, u4z=uz*c+wz*s, w4x=u4z, w4z=-u4x;
    x=D_EM*u4x; z=D_EM*u4z; const k=TAD[i];
    vx=corotVx(x,z)+(k[0]*u4x+k[1]*w4x)/1000; vz=corotVz(x,z)+(k[0]*u4z+k[1]*w4z)/1000; vy=k[2]/1000;
  } else if(mode==='dro'){ const [r0,s]=DRO_SET[i], vc=Math.sqrt(MU_M/r0);
    x=mp.x+r0*ux; z=mp.z+r0*uz;
    vx=W_MOON*mp.z - s*vc*wx; vz=-W_MOON*mp.x - s*vc*wz;
  } else { const {vp,pa}=mkXfer(FR_RP);
    x=FR_RP*Math.cos(pa); z=FR_RP*Math.sin(pa); const spd=vp*FRET[i];
    vx=-Math.sin(pa)*spd; vz=Math.cos(pa)*spd; }
  return [x,y,z,vx,vy,vz];
}

function runObj(mode,i,days,h){
  let st=state(mode,i), minRm=1e12,maxRm=0,maxRe=0,minReAfter=1e12,passed=false;
  let hitM=false,hitE=false,tHit=null,maxLib=0;
  const N=Math.round(days*86400/h);
  for(let k=0;k<N;k++){ const t=k*h/86400; st=fanStep(st,t,h);
    const m2=moonPos(t), rm=Math.hypot(st[0]-m2.x,st[1]-m2.y,st[2]-m2.z), re=Math.hypot(st[0],st[1],st[2]);
    minRm=Math.min(minRm,rm); maxRm=Math.max(maxRm,rm); maxRe=Math.max(maxRe,re);
    if(rm<66000)passed=true; if(passed)minReAfter=Math.min(minReAfter,re);
    if(mode==='tadpole'){ let d=(Math.atan2(-st[2],st[0])-Math.atan2(-m2.z,m2.x)-Math.PI/3)*180/Math.PI;
      d-=Math.round(d/360)*360; maxLib=Math.max(maxLib,Math.abs(d)); }
    if(rm<R_MOON){hitM=true;tHit=t;break;} if(re<R_EARTH){hitE=true;tHit=t;break;} }
  const de=Math.hypot(st[0],st[1],st[2]);
  const E=(st[3]**2+st[4]**2+st[5]**2)/2-MU_E/de;
  return {minRm,maxRm,maxRe,minReAfter,hitM,hitE,tHit,E,maxLib,de};
}

let fail=[];
const ONLY=process.argv[3]||'all';
const want=m=>ONLY==='all'||ONLY===m;
if(want('scatter')){
console.log('== SCATTER (30 d, h=2) ==');
for(let i=0;i<7;i++){ const r=runObj('scatter',i,30,2);
  const flung=r.E>=0||r.maxRe>HILL_KM;
  console.log(names[i].padEnd(7),(r.minRm/R_MOON).toFixed(2).padStart(6),'R_M',r.hitM?'IMPACT':(flung?'FLUNG (max r '+(r.maxRe/1e6).toFixed(2)+' Mkm)':'bound'));
  if(r.hitM) fail.push('scatter '+names[i]+' impacted');
  if(i===1&&!flung) fail.push('yellow not flung'); if(i===0&&(r.minRm/R_MOON>2||r.hitM)) fail.push('red hairpin off'); } }
if(want('l1knife')){
console.log('== L1 KNIFE-EDGE (25 d, h=4) ==');
for(let i=0;i<7;i++){ const r=runObj('l1knife',i,25,4);
  let fate = r.hitM?'MOON IMPACT d'+r.tHit.toFixed(1) : r.hitE?'EARTH IMPACT d'+r.tHit.toFixed(1)
    : r.minRm<20000?'went moonward' : r.de<150000?'fell earthward' : Math.hypot(...[0,1,2].map(j=>0))===0&&r.maxRe<400000&&r.minRm>50000?'hovering/roaming':'roaming';
  console.log(names[i].padEnd(7),fate,'· min rM '+(r.minRm/1000).toFixed(0)+'e3 · rE now '+(r.de/1000).toFixed(0)+'e3');
  if(i===1 && (r.minRm<40000||r.de<200000||r.de>460000)) fail.push('yellow knife not hovering'); } }
if(want('tadpole')){
console.log('== L4 TADPOLES (120 d, h=60) ==');
for(let i=0;i<7;i++){ const r=runObj('tadpole',i,120,60);
  console.log(names[i].padEnd(7),'max libration '+r.maxLib.toFixed(1)+'° · min moon dist '+(r.minRm/1000).toFixed(0)+'e3 km',r.hitM||r.hitE?'IMPACT!':'');
  if(i===0&&r.maxLib<60) fail.push('red tadpole did not break out');
  if(i>0&&r.maxLib>35) fail.push(names[i]+' tadpole not bounded'); if(r.hitM||r.hitE) fail.push(names[i]+' tadpole impacted'); } }
if(want('dro')){
console.log('== DRO vs PROGRADE (90 d, h=15) ==');
for(let i=0;i<7;i++){ const r=runObj('dro',i,90,15);
  const stripped=r.maxRm>90000;
  console.log(names[i].padEnd(7),'r0='+DRO_SET[i][0]/1000+'k '+(DRO_SET[i][1]>0?'DRO ':'prog'),r.hitM?'MOON IMPACT d'+r.tHit.toFixed(1):(stripped?'STRIPPED (max rM '+(r.maxRm/1000).toFixed(0)+'e3)':'bound 90 d ('+(r.minRm/1000).toFixed(0)+'–'+(r.maxRm/1000).toFixed(0)+'e3)'));
  if(DRO_SET[i][1]>0 && (stripped||r.hitM)) fail.push(names[i]+' DRO not stable');
  if(DRO_SET[i][1]<0 && DRO_SET[i][0]>=40000 && !(stripped||r.hitM)) fail.push(names[i]+' far prograde survived'); } }
if(want('freeret')){
console.log('== FREE RETURN (16 d, h=2) ==');
for(let i=0;i<7;i++){ const r=runObj('freeret',i,16,2);
  console.log(names[i].padEnd(7),'pass '+(r.minRm/R_MOON).toFixed(1)+' R_M ·',r.hitM?'MOON IMPACT d'+r.tHit.toFixed(1):(r.hitE?'RE-ENTERED d'+r.tHit.toFixed(1):'return perigee '+Math.round(r.minReAfter).toLocaleString()+' km'));
  if(i===2&&!r.hitE) fail.push('green did not come home'); if(i===3&&!r.hitE) fail.push('cyan did not come home');
  if(i===0&&!r.hitM) fail.push('red did not impact Moon'); } }
console.log(fail.length?('FAIL: '+fail.join(' | ')):('PASS ('+ONLY+') — shipped functions + arrays, extracted verbatim'));
