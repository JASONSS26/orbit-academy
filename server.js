#!/usr/bin/env node
/* ORBIT ACADEMY v4.1 — course-management backend. Zero external dependencies.
   - Accounts (scrypt-hashed passwords), session cookies (random tokens).
   - Per-user progress, prerequisite gating, instructor dashboard.
   - JSON file store (academy_data.json). Suitable for a training cohort, not web-scale.
   Run:  node server.js   then open  http://localhost:8080
   SECURITY NOTES: see docs/SECURITY.md. Audited each version before release. */
const http=require('http'), fs=require('fs'), path=require('path'), crypto=require('crypto'), vm=require('vm');
const PORT=process.env.PORT||8080;
const ROOT=path.join(__dirname,'public');
const DB_FILE=process.env.ORBIT_DATA||path.join(__dirname,'academy_data.json');
/* Workbooks live OUTSIDE public/ so the raw editable sources can't be fetched as static
   files, and so a bad edit can never white-screen a live worksheet mid-session.
   workbooks/active/ is the published set the browser reads (via /worksheet/<id>.data.js).
   Sibling folders (workbooks/2026-spring/, …) are inactive versions; "publishing" a set is
   just a folder rename — identical on Windows and macOS, no symlinks. */
const WORKBOOKS=path.join(__dirname,'workbooks');
const ACTIVE=path.join(WORKBOOKS,'active');

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
  {id:'t1', title:'How Orbits Work', prereq:[]},   // title matches worksheet1/README everywhere
  {id:'t2', title:'Angular Rates & Geosync', prereq:['t1']},
  {id:'t3', title:'Naming Orbits & TLEs', prereq:['t2']},   // displayed as "Module 3"
  {id:'t4', title:'Maneuvers & Perturbations', prereq:['t3']},
  {id:'t5', title:'xGEO / Cislunar Space', prereq:['t4']},
  {id:'t6', title:'Lagrange Points & Complex Orbits', prereq:['t5']},
  {id:'t7', title:'Observability', prereq:['t6']},                 // Module 7 — file ids now match module order
  {id:'t8', title:'Lunar Transfers & Artemis', prereq:['t7']},     // Module 8 — the capstone flight sim (finale)
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

/* ---------------- workbook editor (instructor-only) ----------------
   Data files are `const WORKSHEET = {...}` (JS, not JSON, because they carry HTML/SVG).
   We LOAD by running the file in a sandboxed vm and reading WORKSHEET back (robust — no
   regex parsing), and SAVE by re-serializing to `const WORKSHEET = <pretty-json>;`. JSON
   round-trips the HTML/SVG strings exactly. Every save is re-executed in the vm first, so a
   syntactically broken worksheet is rejected before it can overwrite a good one. */
/* Editable worksheets use the `const WORKSHEET={...tasks...}` schema. worksheet-final is a
   different format (`const EXAM=[...]`, the course final) — it is SERVED from the active set
   like the rest, but not offered in the editor (which only understands the WORKSHEET shape). */
const WB_IDS=['worksheet1','worksheet2','worksheet3','worksheet4','worksheet5','worksheet6','worksheet7','worksheet8'];
const WB_SERVE_IDS=WB_IDS.concat(['worksheet-final']);
function validId(id){ return WB_IDS.includes(String(id)); }        // editable ids only — no path chars ever reach fs
function servableId(id){ return WB_SERVE_IDS.includes(String(id)); }
function wbPath(id){ return path.join(ACTIVE, id+'.data.js'); }
function runWorksheetSource(src){
  // returns the WORKSHEET object, or throws on syntax/eval error. Sandbox has no require/fs/process.
  const sandbox={WORKSHEET:undefined};
  vm.runInNewContext(src+'\n;globalThis.__WS=WORKSHEET;', sandbox, {timeout:1000});
  const ws=sandbox.__WS!==undefined?sandbox.__WS:sandbox.WORKSHEET;
  if(!ws||typeof ws!=='object'||!Array.isArray(ws.tasks)) throw new Error('not a valid WORKSHEET (missing tasks[])');
  return ws;
}
function loadWorksheet(id){ return runWorksheetSource(fs.readFileSync(wbPath(id),'utf8')); }
function serializeWorksheet(obj){
  return '/* Edited via the instructor worksheet editor. Structured data — safe to hand-edit,\n'+
         '   but the editor validates on save. Shape: objectives/tutorial/elements/parts/tasks/'+
         'exam/summary/resources. */\nconst WORKSHEET = '+JSON.stringify(obj,null,2)+';\n';
}
function saveWorksheet(id,obj){
  const src=serializeWorksheet(obj);
  runWorksheetSource(src);                       // validate: must execute and yield a WORKSHEET
  const p=wbPath(id), tmp=p+'.tmp';
  fs.writeFileSync(tmp,src);
  if(fs.existsSync(p)){                           // timestamped backup so any edit is recoverable
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    try{ fs.copyFileSync(p, path.join(ACTIVE, id+'.data.'+stamp+'.bak')); }catch(e){}
  }
  fs.renameSync(tmp,p);
}
function listWorkbookSets(){
  try{ return fs.readdirSync(WORKBOOKS,{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name); }
  catch(e){ return []; }
}
function requireInstructor(req,res){ const u=userFromReq(req);
  if(!u){ send(res,401,{error:'not logged in'}); return null; }
  if(u.role!=='instructor'){ send(res,403,{error:'instructor only'}); return null; }
  return u; }

/* ---------------- http helpers ---------------- */
function send(res,code,obj,headers){ const body=Buffer.from(JSON.stringify(obj));
  res.writeHead(code,Object.assign({'content-type':'application/json','content-length':body.length},headers||{})); res.end(body); }
function readBody(req,max){ max=max||1e5; return new Promise((resolve)=>{ let d=''; let tooBig=false;
  req.on('data',c=>{ d+=c; if(d.length>max){tooBig=true;req.destroy();} });
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
  if(p==='/api/workbook/list'){                    // instructor: which worksheets + version folders exist
    if(!requireInstructor(req,res)) return;
    const items=WB_IDS.filter(id=>fs.existsSync(wbPath(id)));
    return send(res,200,{ids:items,sets:listWorkbookSets(),active:'active'});
  }
  if(p==='/api/workbook/get'){                      // instructor: load one worksheet as JSON
    if(!requireInstructor(req,res)) return;
    const id=url.searchParams.get('id');
    if(!validId(id)) return send(res,400,{error:'unknown worksheet id'});
    if(!fs.existsSync(wbPath(id))) return send(res,404,{error:'worksheet not found in active set'});
    try{ return send(res,200,{id,data:loadWorksheet(id)}); }
    catch(e){ return send(res,500,{error:'could not parse worksheet: '+e.message}); }
  }
  if(p==='/api/workbook/save' && req.method==='POST'){   // instructor: overwrite one worksheet
    if(!requireInstructor(req,res)) return;
    const b=await readBody(req,2e6); if(!b) return send(res,400,{error:'bad or oversized request'});  // worksheets can be ~90KB
    if(!validId(b.id)) return send(res,400,{error:'unknown worksheet id'});
    if(!b.data||typeof b.data!=='object'||!Array.isArray(b.data.tasks)) return send(res,400,{error:'payload must have data.tasks[]'});
    try{ saveWorksheet(b.id,b.data); return send(res,200,{ok:true,id:b.id}); }
    catch(e){ return send(res,400,{error:'rejected — worksheet would not validate: '+e.message}); }
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
  // worksheet data files are served from the PUBLISHED workbook set, not public/, so the
  // editor is the single source of truth. Strict allow-list — the id can't contain path chars.
  const wm=url.pathname.match(/^\/(worksheet(?:\d|-final))\.data\.js$/);
  if(wm && servableId(wm[1])){
    return fs.readFile(wbPath(wm[1]),(e,data)=>{ if(e){res.writeHead(404);return res.end('not found');}
      res.writeHead(200,{'content-type':'text/javascript','cache-control':'no-store'}); res.end(data); });
  }
  serveStatic(req,res,url.pathname);
});
server.on('error',err=>{
  if(err.code==='EADDRINUSE'){
    console.error('\n  Port '+PORT+' is already in use — Orbit Academy is probably ALREADY running.');
    console.error('  Open http://localhost:'+PORT+' in your browser, or stop the other copy first.');
    console.error('  Find it with:  lsof -nP -iTCP:'+PORT+' -sTCP:LISTEN   (macOS/Linux)');
    console.error('            or:  netstat -ano | findstr :'+PORT+'       (Windows)\n');
    process.exit(1);
  }
  throw err;
});
server.listen(PORT,()=>{
  console.log('ORBIT ACADEMY on http://localhost:'+PORT+'  (fixed port — set PORT env only if you must)');
  console.log('First account registered becomes the instructor.');
});
