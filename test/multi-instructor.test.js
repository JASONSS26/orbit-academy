#!/usr/bin/env node
/* multi-instructor.test.js — a course can have MORE THAN ONE instructor.
   Run from the repo root:  node test/multi-instructor.test.js

   Nothing caps the count: `role` is a plain string and every gate asks `role === 'instructor'`. But
   two guards change behaviour once a second instructor exists, and they are the reason this is tested
   rather than assumed:

     - "cannot delete the last instructor" must RELAX when a second one exists, otherwise co-teaching
       is impossible to unwind.
     - "cannot delete yourself" must hold REGARDLESS of how many instructors there are.

   Get those backwards and you either strand a course with no admin, or let someone delete their own
   account out from under an open session. Both are unrecoverable from the UI.

   Also asserts that a promoted instructor really gains every instructor-only surface (roster,
   analytics, worksheet editor, student reset), and that deleting an instructor kills their session
   rather than leaving a working cookie. Runs on a scratch data file via ORBIT_DATA — never the live
   academy_data.json. */
const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const ROOT=require('path').resolve(__dirname,'..');
const DATA='/tmp/_multi_test.json', PORT=8137;
let bad=0; const ok=(l,c,d)=>{console.log((c?'  PASS  ':'  FAIL  ')+l+(d?'   ['+d+']':''));if(!c)bad++;};
function req(m,p,b,ck){return new Promise((res,rej)=>{const d=b?JSON.stringify(b):null;
  const r=http.request({host:'127.0.0.1',port:PORT,method:m,path:p,headers:Object.assign({},
    d?{'content-type':'application/json','content-length':Buffer.byteLength(d)}:{},ck?{cookie:ck}:{})},
    x=>{let s='';x.on('data',c=>s+=c);x.on('end',()=>res({status:x.statusCode,body:s,
      cookie:(x.headers['set-cookie']||[''])[0].split(';')[0]}))});r.on('error',rej);if(d)r.write(d);r.end();});}
(async()=>{
  try{fs.unlinkSync(DATA)}catch(e){}
  const srv=spawn(process.execPath,[path.join(ROOT,'server.js')],{cwd:ROOT,
    env:Object.assign({},process.env,{PORT:String(PORT),ORBIT_DATA:DATA}),stdio:'ignore'});
  for(let i=0;i<60;i++){try{await req('GET','/gallery.html');break}catch(e){await new Promise(r=>setTimeout(r,100))}}

  const a=await req('POST','/api/register',{name:'Instr A',email:'a@t.local',password:'orbits12345'});
  const b=await req('POST','/api/register',{name:'Instr B',email:'b@t.local',password:'orbits12345'});
  const c=await req('POST','/api/register',{name:'Student C',email:'c@t.local',password:'orbits12345'});
  ok('first registrant is instructor',JSON.parse(a.body).user.role==='instructor');
  ok('second registrant starts as student',JSON.parse(b.body).user.role==='student');

  // promote B the supported way: offline, via the tool
  srv.kill(); await new Promise(r=>setTimeout(r,400));
  const {execFileSync}=require('child_process');
  execFileSync(process.execPath,[path.join(ROOT,'tools','set-role.js'),'b@t.local','instructor'],
    {cwd:ROOT,env:Object.assign({},process.env,{ORBIT_DATA:DATA}),encoding:'utf8'});
  const db=JSON.parse(fs.readFileSync(DATA,'utf8'));
  const insts=Object.values(db.users).filter(u=>u.role==='instructor');
  ok('TWO instructors can coexist in the data file',insts.length===2,insts.map(u=>u.name).join(' + '));

  const srv2=spawn(process.execPath,[path.join(ROOT,'server.js')],{cwd:ROOT,
    env:Object.assign({},process.env,{PORT:String(PORT),ORBIT_DATA:DATA}),stdio:'ignore'});
  for(let i=0;i<60;i++){try{await req('GET','/gallery.html');break}catch(e){await new Promise(r=>setTimeout(r,100))}}

  const la=await req('POST','/api/login',{email:'a@t.local',password:'orbits12345'});
  const lb=await req('POST','/api/login',{email:'b@t.local',password:'orbits12345'});
  const lc=await req('POST','/api/login',{email:'c@t.local',password:'orbits12345'});
  ok('instructor A sees the role',JSON.parse(la.body).user.role==='instructor');
  ok('instructor B sees the role after promotion',JSON.parse(lb.body).user.role==='instructor',JSON.parse(lb.body).user.role);

  for(const [who,ck] of [['A',la.cookie],['B',lb.cookie]]){
    ok('instructor '+who+' can read the roster',(await req('GET','/api/roster',null,ck)).status===200);
    ok('instructor '+who+' can read analytics',(await req('GET','/api/analytics',null,ck)).status===200);
    ok('instructor '+who+' can open the worksheet editor API',(await req('GET','/api/workbook/list',null,ck)).status===200);
    ok('instructor '+who+' can reset a student',(await req('POST','/api/user/reset',{email:'c@t.local'},ck)).status===200);
  }
  ok('student still denied the roster',(await req('GET','/api/roster',null,lc.cookie)).status===403);

  // with two instructors the last-instructor guard should now ALLOW removing one
  ok('A still cannot delete herself',(await req('POST','/api/user/delete',{email:'a@t.local'},la.cookie)).status===400);
  ok('A CAN delete the other instructor (2 exist)',(await req('POST','/api/user/delete',{email:'b@t.local'},la.cookie)).status===200);
  ok('now the last instructor is protected again',(await req('POST','/api/user/delete',{email:'a@t.local'},la.cookie)).status===400);
  ok("deleted instructor's session is dead",(await req('GET','/api/me',null,lb.cookie)).status===401);

  srv2.kill(); try{fs.unlinkSync(DATA)}catch(e){} try{fs.unlinkSync(DATA+'.bak')}catch(e){}
  console.log(bad?'\n'+bad+' FAILED':'\nMULTIPLE INSTRUCTORS: fully supported ✓');
  process.exit(bad?1:0);
})().catch(e=>{console.error('threw',e);process.exit(1)});
