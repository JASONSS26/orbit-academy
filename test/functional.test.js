#!/usr/bin/env node
/* Functional test suite for Orbit Academy. Zero dependencies.
   Usage: start the server (node server.js) on PORT 8080, then: node test/functional.test.js
   Or run test/run.sh which starts a fresh server against a temp data file. */
const http=require('http');
const PORT=process.env.PORT||8080;
function req(m,p,b,ck){return new Promise(r=>{const d=b?Buffer.from(JSON.stringify(b)):null;
  const o={host:'localhost',port:PORT,path:p,method:m,headers:{}};
  if(d){o.headers['content-type']='application/json';o.headers['content-length']=d.length;}
  if(ck)o.headers.cookie=ck;
  const rq=http.request(o,res=>{let s='';res.on('data',c=>s+=c);res.on('end',()=>r({status:res.statusCode,body:s,
    cookie:(res.headers['set-cookie']||[]).map(x=>x.split(';')[0]).join('; ')}));});if(d)rq.write(d);rq.end();});}
let pass=0,fail=0; const P=(n,ok,x)=>{console.log((ok?'  ✓ ':'  ✗ FAIL ')+n+(x&&!ok?' — '+x:''));ok?pass++:fail++;};

(async()=>{
  console.log('=== FUNCTIONALITY ===');
  for(const [pg,needle] of [['/','ORBIT ACADEMY'],['/worksheet1.html','How Orbits Work'],
    ['/tut1.html','How orbits work'],['/controls.html','Simulator Controls'],
    ['/quiz.js','TUTORIALS'],['/worksheet1.data.js','WORKSHEET'],
    ['/tut2.html','Angular Rates'],['/worksheet2.html','Angular Rates'],['/worksheet2.data.js','WORKSHEET'],['/tut2.data.js','GEO_SATS'],
    ['/tut3a.html','Naming Orbits'],['/worksheet3a.html','Naming Orbits'],['/worksheet3a.data.js','WORKSHEET'],
    ['/tut4.html','Maneuvers'],['/worksheet4.html','Maneuvers'],['/worksheet4.data.js','WORKSHEET'],
    ['/tut5.html','Cislunar'],['/worksheet5.html','Cislunar'],['/worksheet5.data.js','WORKSHEET']]){
    const r=await req('GET',pg); P('page loads: '+pg,r.status===200&&r.body.includes(needle),'status '+r.status); }

  const inst=await req('POST','/api/register',{name:'Prof',email:'prof@j.org',password:'orbits123'});
  P('register instructor',inst.status===200); const ick=inst.cookie;
  const md=JSON.parse((await req('GET','/api/me',null,ick)).body);
  P('course has 8 modules',md.course.length===8,'got '+md.course.length);
  P('t1 unlocked at start',md.unlocked.t1===true);
  P('t2 locked at start',md.unlocked.t2===false);

  const tasks=['a1','a2','b1','b2','b3','b4','c1','c2','d1','e1','e2']; let last;
  for(const t of tasks) last=await req('POST','/api/task',{tutorial:'t1',task:t,done:true,attempt:true,totalTasks:11},ick);
  const p1=JSON.parse(last.body);
  P('t1 passed after 11 tasks',p1.progress.t1.passed===true);
  P('t2 unlocked after t1',p1.unlocked.t2===true);
  P('all 11 tasks recorded',Object.keys(p1.progress.t1.tasks).length===11,'got '+Object.keys(p1.progress.t1.tasks).length);
  P('progress persists on resume',JSON.parse((await req('GET','/api/me',null,ick)).body).user.progress.t1.passed===true);

  // Module 2: t3a locked until t2 done; complete t2's 15 tasks -> t3a unlocks
  P('t3a locked before t2',(await req('POST','/api/task',{tutorial:'t3a',task:'x',done:true,totalTasks:1},ick)).status===403);
  const t2=['a2','a3','a4','b1','b2','b3','c1','c0','c2','c3','e1','e2','e4','e3','e5']; let l2;
  for(const t of t2) l2=await req('POST','/api/task',{tutorial:'t2',task:t,done:true,attempt:true,totalTasks:15},ick);
  const p2=JSON.parse(l2.body);
  P('t2 passed after 15 tasks',p2.progress.t2.passed===true);
  P('t3a unlocked after t2',p2.unlocked.t3a===true);

  const stu=await req('POST','/api/register',{name:'Lee',email:'lee@j.org',password:'orbits123'});
  await req('POST','/api/task',{tutorial:'t1',task:'a1',done:true,attempt:true,totalTasks:11},stu.cookie);
  const sp=JSON.parse((await req('GET','/api/me',null,stu.cookie)).body);
  P('partial progress saved (1 task, not passed)',sp.user.progress.t1.passed!==true&&Object.keys(sp.user.progress.t1.tasks).length===1);

  const rd=JSON.parse((await req('GET','/api/roster',null,ick)).body);
  P('roster lists both users',rd.roster.length===2);
  P('roster shows Prof passed t1',rd.roster.find(u=>u.email==='prof@j.org').progress.t1==='pass');

  await req('POST','/api/logout',null,ick);
  const li=await req('POST','/api/login',{email:'prof@j.org',password:'orbits123'});
  P('logout+login round-trip',li.status===200&&JSON.parse(li.body).user.progress.t1.passed===true);

  console.log('\n  === '+pass+' passed, '+fail+' failed ===');
  process.exit(fail?1:0);
})().catch(e=>{console.error('test harness error',e);process.exit(2);});
