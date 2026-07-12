#!/usr/bin/env node
/* ORBIT ACADEMY v1.3 — course-management backend. Zero external dependencies.
   - Accounts (scrypt-hashed passwords), session cookies (random tokens).
   - Per-user progress, prerequisite gating, instructor dashboard.
   - JSON file store (academy_data.json). Suitable for a training cohort, not web-scale.
   Run:  node server.js   then open  http://localhost:8080
   SECURITY NOTES: see docs/SECURITY.md. Audited each version before release. */
const http=require('http'), fs=require('fs'), path=require('path'), crypto=require('crypto');
const PORT=process.env.PORT||8080;
const ROOT=path.join(__dirname,'public');
const DB_FILE=process.env.ORBIT_DATA||path.join(__dirname,'academy_data.json');

/* ---------------- data store ----------------
   Durability: on load, if the primary file is missing/corrupt we fall back to the most
   recent .bak. On save we write atomically (temp file + rename) and keep a rolling backup,
   so an accidental delete or a crash mid-write can't lose accounts. */
const BAK_FILE=DB_FILE+'.bak';
let DB={users:{}, sessions:{}};              // users[id]={id,name,email,role,salt,hash,progress:{}}
function readStore(f){ const d=JSON.parse(fs.readFileSync(f,'utf8')); if(!d||typeof d!=='object'||!d.users) throw new Error('bad shape'); return d; }
function loadDB(){
  try{ DB=readStore(DB_FILE); }
  catch(e){
    try{ DB=readStore(BAK_FILE); console.warn('primary store unreadable — recovered from backup'); saveNow(); }
    catch(e2){ DB={users:{},sessions:{}}; }
  }
}
function saveNow(){
  try{
    const tmp=DB_FILE+'.tmp';
    fs.writeFileSync(tmp, JSON.stringify(DB));      // write to temp
    try{ if(fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE,BAK_FILE); }catch(e){}   // roll current -> .bak
    fs.renameSync(tmp, DB_FILE);                     // atomic replace
  }catch(e){ console.error('save failed',e.message); }
}
let saveTimer=null;
function saveDB(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveNow,100); }
loadDB();

/* ---------------- course definition (prerequisites) ---------------- */
const COURSE=[
  {id:'t1', title:'Orbital Dynamics', prereq:[]},
  {id:'t2', title:'Angular Rates & Geosync', prereq:['t1']},
  {id:'t3a',title:'Naming Orbits & TLEs', prereq:['t2']},   // displayed as "Module 3"
  {id:'t4', title:'Maneuvers & Perturbations', prereq:['t3a']},
  {id:'t5', title:'xGEO / Cislunar Space', prereq:['t4']},
  {id:'t6', title:'Lagrange Points & Complex Orbits', prereq:['t5']},
  {id:'t7', title:'Lunar Transfers & Artemis', prereq:['t6']},
  {id:'t8', title:'Observability', prereq:['t7']},
];
function unlocked(progress){ // which tutorials are available given completed set
  const done=new Set(Object.keys(progress||{}).filter(k=>progress[k]&&progress[k].passed));
  const out={};
  for(const c of COURSE) out[c.id]=c.prereq.every(p=>done.has(p));
  return out;
}

/* ---------------- crypto helpers ---------------- */
function hashPw(pw, salt){ return crypto.scryptSync(pw, salt, 64).toString('hex'); }
function makeUser(name,email,pw,role){
  const salt=crypto.randomBytes(16).toString('hex');
  const id=crypto.randomBytes(8).toString('hex');
  return {id,name,email:String(email).toLowerCase(),role:role||'student',salt,hash:hashPw(pw,salt),progress:{},created:Date.now()};
}
function verifyPw(user,pw){
  const h=Buffer.from(hashPw(pw,user.salt),'hex'), stored=Buffer.from(user.hash,'hex');
  return h.length===stored.length && crypto.timingSafeEqual(h,stored);
}
function newSession(userId){ const tok=crypto.randomBytes(24).toString('hex');
  DB.sessions[tok]={userId,created:Date.now()}; saveDB(); return tok; }
function userFromReq(req){ const c=parseCookies(req).sid; if(!c)return null;
  const s=DB.sessions[c]; if(!s)return null; return DB.users[s.userId]||null; }
function parseCookies(req){ const h=req.headers.cookie||''; const o={};
  h.split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)o[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());}); return o; }

/* ---------------- http helpers ---------------- */
function send(res,code,obj,headers){ const body=Buffer.from(JSON.stringify(obj));
  res.writeHead(code,Object.assign({'content-type':'application/json','content-length':body.length},headers||{})); res.end(body); }
function readBody(req){ return new Promise((resolve)=>{ let d=''; let tooBig=false;
  req.on('data',c=>{ d+=c; if(d.length>1e5){tooBig=true;req.destroy();} });
  req.on('end',()=>{ if(tooBig)return resolve(null); try{resolve(JSON.parse(d||'{}'));}catch(e){resolve(null);} }); }); }
const emailRe=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------------- API ---------------- */
async function api(req,res,url){
  const p=url.pathname;
  if(p==='/api/register' && req.method==='POST'){
    const b=await readBody(req); if(!b) return send(res,400,{error:'bad request'});
    const name=String(b.name||'').trim().slice(0,80);
    const email=String(b.email||'').trim().toLowerCase().slice(0,120);
    const pw=String(b.password||'');
    if(!name||!emailRe.test(email)||pw.length<8) return send(res,400,{error:'name, valid email, and 8+ char password required'});
    if(Object.values(DB.users).some(u=>u.email===email)) return send(res,409,{error:'email already registered'});
    // first user becomes instructor
    const role=Object.keys(DB.users).length===0?'instructor':'student';
    const u=makeUser(name,email,pw,role); DB.users[u.id]=u; saveDB();
    const tok=newSession(u.id);
    return send(res,200,{ok:true,user:pub(u)},{'set-cookie':cookie(tok)});
  }
  if(p==='/api/login' && req.method==='POST'){
    const b=await readBody(req); if(!b) return send(res,400,{error:'bad request'});
    const email=String(b.email||'').trim().toLowerCase();
    const u=Object.values(DB.users).find(x=>x.email===email);
    if(!u||!verifyPw(u,String(b.password||''))) return send(res,401,{error:'invalid email or password'});
    const tok=newSession(u.id);
    return send(res,200,{ok:true,user:pub(u)},{'set-cookie':cookie(tok)});
  }
  if(p==='/api/logout' && req.method==='POST'){
    const c=parseCookies(req).sid; if(c) delete DB.sessions[c]; saveDB();
    return send(res,200,{ok:true},{'set-cookie':'sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'});
  }
  if(p==='/api/me'){
    const u=userFromReq(req); if(!u) return send(res,401,{error:'not logged in'});
    return send(res,200,{user:pub(u),course:COURSE,unlocked:unlocked(u.progress)});
  }
  if(p==='/api/complete' && req.method==='POST'){
    const u=userFromReq(req); if(!u) return send(res,401,{error:'not logged in'});
    const b=await readBody(req); if(!b) return send(res,400,{error:'bad request'});
    const tid=String(b.tutorial||''); const score=Math.max(0,Math.min(100,+b.score||0));
    const c=COURSE.find(x=>x.id===tid); if(!c) return send(res,400,{error:'unknown tutorial'});
    // enforce prerequisites server-side (never trust the client)
    if(!unlocked(u.progress)[tid]) return send(res,403,{error:'prerequisites not met'});
    const passed=score>=70;
    // preserve any granular task record already there
    const prev=u.progress[tid]||{};
    u.progress[tid]=Object.assign({},prev,{score,passed,when:Date.now()}); saveDB();
    return send(res,200,{ok:true,passed,progress:u.progress,unlocked:unlocked(u.progress)});
  }
  if(p==='/api/task' && req.method==='POST'){
    // granular worksheet-task progress so returning students resume where they left off
    const u=userFromReq(req); if(!u) return send(res,401,{error:'not logged in'});
    const b=await readBody(req); if(!b) return send(res,400,{error:'bad request'});
    const tid=String(b.tutorial||''), task=String(b.task||'').slice(0,40);
    const c=COURSE.find(x=>x.id===tid); if(!c) return send(res,400,{error:'unknown tutorial'});
    if(!unlocked(u.progress)[tid]) return send(res,403,{error:'prerequisites not met'});
    const rec=u.progress[tid]||{tasks:{}}; rec.tasks=rec.tasks||{};
    rec.tasks[task]={done:!!b.done, attempts:(rec.tasks[task]?rec.tasks[task].attempts||0:0)+(b.attempt?1:0), when:Date.now()};
    // module is complete when all required tasks are done
    const total=(b.totalTasks|0)||0; const doneCount=Object.values(rec.tasks).filter(t=>t.done).length;
    if(total>0 && doneCount>=total){ rec.passed=true; rec.score=Math.max(rec.score||0,100); rec.when=Date.now(); }
    u.progress[tid]=rec; saveDB();
    return send(res,200,{ok:true,progress:u.progress,unlocked:unlocked(u.progress)});
  }
  if(p==='/api/roster'){ // instructor only
    const u=userFromReq(req); if(!u||u.role!=='instructor') return send(res,403,{error:'instructor only'});
    const rows=Object.values(DB.users).map(x=>({name:x.name,email:x.email,role:x.role,
      progress:Object.fromEntries(COURSE.map(c=>[c.id, x.progress[c.id]?(x.progress[c.id].passed?'pass':'fail'):'—']))}));
    return send(res,200,{course:COURSE,roster:rows});
  }
  return send(res,404,{error:'not found'});
}
function pub(u){ return {name:u.name,email:u.email,role:u.role,progress:u.progress}; }
function cookie(tok){ return 'sid='+tok+'; HttpOnly; Path=/; Max-Age=2592000; SameSite=Strict'; }

/* ---------------- static files (path-traversal safe) ---------------- */
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
function serveStatic(req,res,pathname){
  let rel=decodeURIComponent(pathname); if(rel==='/')rel='/index.html';
  const full=path.join(ROOT, path.normalize(rel));
  if(!full.startsWith(ROOT+path.sep) && full!==path.join(ROOT,'index.html')){ res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(full,(e,data)=>{ if(e){res.writeHead(404);return res.end('not found');}
    res.writeHead(200,{'content-type':MIME[path.extname(full)]||'application/octet-stream','cache-control':'no-store'});
    res.end(data); });
}

const server=http.createServer((req,res)=>{
  let url; try{ url=new URL(req.url,'http://x'); }catch(e){ res.writeHead(400); return res.end(); }
  if(url.pathname.startsWith('/api/')) return api(req,res,url).catch(err=>{ console.error(err); send(res,500,{error:'server error'}); });
  serveStatic(req,res,url.pathname);
});
server.listen(PORT,()=>{
  console.log('ORBIT ACADEMY on http://localhost:'+PORT);
  console.log('First account registered becomes the instructor.');
});
