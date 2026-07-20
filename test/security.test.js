#!/usr/bin/env node
/* Security test suite for Orbit Academy. Zero dependencies.
   Usage: start server on PORT 8080, then: node test/security.test.js
   Covers: path traversal, authN, authZ/priv-esc, session integrity, prereq bypass,
   input validation, and score clamping. (DoS body-size guard is checked in run.sh.) */
const http=require('http');
const PORT=process.env.PORT||8080;
function req(m,p,b,ck,raw){return new Promise(r=>{const d=raw!==undefined?Buffer.from(raw):(b?Buffer.from(JSON.stringify(b)):null);
  const o={host:'localhost',port:PORT,path:p,method:m,headers:{}};
  if(d){o.headers['content-type']='application/json';o.headers['content-length']=d.length;}
  if(ck)o.headers.cookie=ck;
  const rq=http.request(o,res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>r({status:res.statusCode,body:s,
    cookie:(res.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')}));});
  rq.on('error',()=>r({status:0,body:'',cookie:''}));if(d)rq.write(d);rq.end();});}
let pass=0,fail=0; const P=(n,ok,x)=>{console.log((ok?'  ✓ ':'  ✗ FAIL ')+n+(x&&!ok?' — '+x:''));ok?pass++:fail++;};

(async()=>{
  console.log('=== SECURITY ===');
  // path traversal (server should 403/404, never serve source or files above web root)
  for(const u of ['/../server.js','/..%2f..%2fserver.js','/../../academy/server.js','/./../server.js']){
    const r=await req('GET',u); P('path traversal blocked: '+u, r.status===403||r.status===404, 'status '+r.status+(r.body.includes('scryptSync')?' LEAKED SRC':'')); }

  // unauthenticated access
  P('/api/me needs auth',(await req('GET','/api/me')).status===401);
  P('/api/roster needs auth',[401,403].includes((await req('GET','/api/roster')).status));
  P('/api/complete needs auth',(await req('POST','/api/complete',{tutorial:'t1',score:100})).status===401);
  P('/api/task needs auth',(await req('POST','/api/task',{tutorial:'t1',task:'x',done:true})).status===401);

  const inst=await req('POST','/api/register',{name:'I',email:'i@j.org',password:'orbits123'});
  const stu =await req('POST','/api/register',{name:'S',email:'s@j.org',password:'orbits123'});
  P('first user = instructor',JSON.parse(inst.body).user.role==='instructor');
  P('second user = student',JSON.parse(stu.body).user.role==='student');
  P('cannot self-assign role at register',JSON.parse((await req('POST','/api/register',{name:'E',email:'e@j.org',password:'orbits123',role:'instructor'})).body).user.role==='student');
  P('student denied roster (priv-esc)',(await req('GET','/api/roster',null,stu.cookie)).status===403);
  P('forged session rejected',(await req('GET','/api/me',null,'sid=deadbeefdeadbeef')).status===401);
  P('prereq bypass blocked /complete',(await req('POST','/api/complete',{tutorial:'t4',score:100},stu.cookie)).status===403);
  P('prereq bypass blocked /task',(await req('POST','/api/task',{tutorial:'t2',task:'x',done:true,totalTasks:1},stu.cookie)).status===403);
  P('score clamped to <=100',JSON.parse((await req('POST','/api/complete',{tutorial:'t1',score:99999},stu.cookie)).body).progress.t1.score<=100);
  P('weak password rejected',(await req('POST','/api/register',{name:'W',email:'w@j.org',password:'short'})).status===400);
  P('duplicate email rejected',(await req('POST','/api/register',{name:'D',email:'i@j.org',password:'orbits123'})).status===409);
  P('bad email rejected',(await req('POST','/api/register',{name:'B',email:'notanemail',password:'orbits123'})).status===400);
  P('wrong password rejected',(await req('POST','/api/login',{email:'i@j.org',password:'nope'})).status===401);
  P('malformed JSON rejected',(await req('POST','/api/login',null,null,'{not json')).status===400);

  // ---- worksheet editor (instructor-only file writes) ----
  P('workbook/list needs auth',(await req('GET','/api/workbook/list')).status===401);
  P('workbook/list denies student',(await req('GET','/api/workbook/list',null,stu.cookie)).status===403);
  P('workbook/get denies student',(await req('GET','/api/workbook/get?id=worksheet1',null,stu.cookie)).status===403);
  P('workbook/save denies student',(await req('POST','/api/workbook/save',{id:'worksheet1',data:{tasks:[]}},stu.cookie)).status===403);
  P('workbook/get rejects bad id (path traversal)',[400,403,404].includes((await req('GET','/api/workbook/get?id=..%2f..%2fserver',null,inst.cookie)).status));
  P('workbook/save rejects bad id',(await req('POST','/api/workbook/save',{id:'../server',data:{tasks:[]}},inst.cookie)).status===400);
  P('workbook/save rejects malformed payload',(await req('POST','/api/workbook/save',{id:'worksheet1',data:{nope:1}},inst.cookie)).status===400);
  P('served worksheet data route rejects unknown id',[404].includes((await req('GET','/worksheet42.data.js')).status));

  // logout invalidates
  await req('POST','/api/logout',null,inst.cookie);
  P('session invalid after logout',(await req('GET','/api/me',null,inst.cookie)).status===401);

  console.log('\n  === '+pass+' passed, '+fail+' failed ===');
  process.exit(fail?1:0);
})().catch(e=>{console.error('test harness error',e);process.exit(2);});
