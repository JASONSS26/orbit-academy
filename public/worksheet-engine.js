/* ============================================================================
   Orbit Academy — shared worksheet engine (v1.5: quiz options shuffle at render).
   A worksheet HTML page provides two globals then includes this file:
     MODULE   = {id:'t5', title:'…', subtitle:'…', tool:'tut5.html', toolWindow:'cislunar5'}
     WORKSHEET = { objectives:[], tutorial:[…], elements?:{…}, parts:[…], tasks:[…],
                   summary:[], resources:[{t,u,note?}], exam:[{q,opts,a,why,feedback?}] }
   Renders: objectives → tutorial (paragraphs / analogy / figures) → definitions table
   (optional) → numbered exercises with interspersed quizzes → summary → final exam →
   resources. Progress saves to the server when present, else to localStorage
   (so the static pages work on GitHub Pages with no backend).
   ============================================================================ */
"use strict";
const $=id=>document.getElementById(id);
const TUT=MODULE.id;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---- windows / buttons ---- */
let SIMWIN=null;
function openSim(){ if(SIMWIN&&!SIMWIN.closed){SIMWIN.focus();return;}
  SIMWIN=window.open(MODULE.tool, MODULE.toolWindow||'orbitsim','width=1320,height=880'); }
function openControls(){ window.open('cheatsheet.html','orbitcheat','width=560,height=760'); }
function openResources(){ window.open('resources.html#'+MODULE.id,'orbitresources','width=900,height=800'); }
function printSheet(){ window.print(); }
function backToHub(){ window.opener?window.opener.focus():null; window.open('index.html','_self'); }

/* ---- progress store: server if reachable, else localStorage ---- */
let ME=null, state={}, OFFLINE=false;
const LS_KEY='orbit_progress_'+TUT;
function lsLoad(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}'); }catch(e){ return {}; } }
function lsSave(o){ try{ localStorage.setItem(LS_KEY,JSON.stringify(o)); }catch(e){} }

async function boot(){
  let d=null;
  try{ const r=await fetch('/api/me',{cache:'no-store'}); if(r.ok) d=await r.json(); }catch(e){}
  if(d&&d.user){ ME=d.user; $('who').innerHTML='<b>'+esc(ME.name)+'</b><br>'+esc(ME.role);
    const tasks=((ME.progress[TUT]||{}).tasks)||{};
    allTaskIds().forEach(id=>{ state[id]=!!(tasks[id]&&tasks[id].done); });
  } else {
    /* Standalone mode (bare HTML off disk, or GitHub Pages): no server → localStorage.
       NOTE: do NOT touch #offlineBadge here. It does not exist yet — renderHeaderButtons()
       creates it, and that runs inside renderAll(), below. Setting the flag is enough; the
       renderer reads it. (This ordering bug hung the page at "loading…" on file://.) */
    OFFLINE=true;
    $('who').innerHTML='<b>Guest</b><br>standalone';
    const saved=lsLoad(); allTaskIds().forEach(id=>{ state[id]=!!saved[id]; });
  }
  renderAll(); updateRail();
}
/* Show the standalone badge if it has been rendered yet. Null-guarded because the mid-session
   fallback in save() can flip us offline at any moment, including before the first render. */
function showOfflineBadge(){ const b=$('offlineBadge'); if(b) b.style.display='inline-block'; }
function allTaskIds(){ const ids=(WORKSHEET.tasks||[]).map(t=>t.id);
  (WORKSHEET.exam||[]).forEach((_,i)=>ids.push('exam'+i)); return ids; }
function totalCount(){ return allTaskIds().length; }
function doneCount(){ return allTaskIds().filter(id=>state[id]).length; }

async function save(tid){
  state[tid]=true;
  if(OFFLINE){ const o=lsLoad(); o[tid]=true; lsSave(o); flashSaved(); return; }
  $('status').innerHTML='saving…';
  try{
    const r=await fetch('/api/task',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({tutorial:TUT,task:tid,done:true,attempt:true,totalTasks:totalCount()})});
    if(r.ok){ const d=await r.json(); ME.progress=d.progress; flashSaved(); }
    else $('status').innerHTML='save failed (are you signed in?)';
  }catch(e){ // server vanished mid-session → fall back to localStorage
    OFFLINE=true; showOfflineBadge(); const o=lsLoad(); o[tid]=true; lsSave(o); flashSaved(); }
}
/* Report an INCORRECT answer so instructors can see where the cohort struggled. Deliberately
   fire-and-forget: the student's experience must not depend on it, and in standalone mode there is
   nowhere to send it, so it simply does nothing. Never sends done:true — the server refuses to let a
   miss un-complete a task, but we should not be asking it to either. */
function reportMiss(tid){
  if(OFFLINE) return;
  try{ fetch('/api/task',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({tutorial:TUT,task:tid,done:false,attempt:true,wrong:true,totalTasks:totalCount()})})
    .catch(()=>{}); }catch(e){}
}
function flashSaved(){ $('status').innerHTML='<b>saved ✓</b> '+doneCount()+'/'+totalCount()+' complete'; }

/* ---- render ---- */
function renderAll(){ renderHeaderButtons(); renderObjectives(); renderTutorial();
  renderElemTable(); renderTasks(); renderExam(); renderEndmatter(); }

function renderHeaderButtons(){
  $('who').insertAdjacentHTML('beforebegin','<span id="offlineBadge">● standalone (saved in this browser)</span>');
  if(OFFLINE) showOfflineBadge();   // the badge is born hidden; it is ours to reveal
}

function renderObjectives(){
  if(!WORKSHEET.objectives) return;
  $('objectives').innerHTML='<div class="card objectives"><h2>🎯 In this module you will learn…</h2><ul>'+
    WORKSHEET.objectives.map(o=>'<li>'+o+'</li>').join('')+'</ul></div>';
}
function renderTutorial(){
  if(!WORKSHEET.tutorial) return;
  const blocks=WORKSHEET.tutorial.map(b=>{
    if(typeof b==='string') return '<p>'+b+'</p>';
    if(b.analogy) return '<div class="analogy"><b>Picture this:</b> '+b.analogy+'</div>';
    if(b.figure) return '<figure>'+b.figure+(b.caption?'<figcaption>'+b.caption+'</figcaption>':'')+'</figure>';
    if(b.h) return '<p style="font-weight:700;color:var(--accent);margin-top:14px">'+b.h+'</p>';
    return '';
  }).join('');
  $('tutorial').innerHTML='<div class="card tutorial"><h2>Quick-start tutorial</h2>'+blocks+'</div>';
}
function renderElemTable(){
  /* The element table is OPTIONAL — worksheets 7 and 8 have no #elemTable div at all, because they
     teach no orbital-element table. Reaching for it unconditionally threw on those two pages and
     took the whole boot with it. Absent host + absent content are both simply "nothing to do". */
  const host=$('elemTable'); if(!host) return;
  if(!WORKSHEET.elements){ host.innerHTML=''; return; }
  const E=WORKSHEET.elements;
  let html='<div class="card"><h2>'+esc(E.title)+'</h2><p>'+E.blurb+'</p>';
  html+='<table class="elem"><tr><th>'+(E.cols?E.cols[0]:'What it sets')+'</th><th>'+(E.cols?E.cols[1]:'Plain-language meaning')+'</th><th>'+(E.cols?E.cols[2]:'In the tool')+'</th></tr>';
  E.rows.forEach(r=>{ html+='<tr><td>'+r.name+'</td><td>'+r.meaning+'</td><td>'+r.tool+'</td></tr>'; });
  html+='</table>'+(E.foot?'<p style="color:var(--dim);font-size:15px">'+E.foot+'</p>':'')+'</div>';
  host.innerHTML=html;
}
function renderTasks(){
  const host=$('tasks'); host.innerHTML=''; let n=0;
  for(const part of WORKSHEET.parts){
    const pd=document.createElement('div'); pd.className='part';
    pd.innerHTML='<h2>'+esc(part.title)+'</h2>'+(part.blurb?'<p style="color:var(--dim)">'+part.blurb+'</p>':'');
    host.appendChild(pd);
    for(const tid of part.tasks){ n++;
      const t=WORKSHEET.tasks.find(x=>x.id===tid); const done=state[tid];
      const card=document.createElement('div'); card.className='task'+(done?' done':''); card.id='card_'+tid;
      let html='<div class="n">EXERCISE '+n+(done?' ✓':'')+'</div><h3>'+esc(t.title)+'</h3>';
      // teaching prose first — the "why", read before doing anything. Accepts a string or array of paragraphs.
      if(t.teach){ const paras=Array.isArray(t.teach)?t.teach:[t.teach];
        html+='<div class="teach">'+paras.map(p=>'<p>'+p+'</p>').join('')+'</div>'; }
      if(t.body) html+=t.body;   // optional rich HTML (sample TLE, extra diagram, etc.)
      // PREDICT before acting — a hypothesis to test (predict → act → analyze → iterate)
      if(t.predict) html+='<div class="predict"><b>🔮 Predict first:</b> '+t.predict+'</div>';
      // the hands-on step(s) — a prominent "Try it" box. `do` may be a string or an array of steps.
      // Optional t.doLabel overrides the header (e.g. '💭 Think it through — no sim needed' for
      // exercises that have no simulator scene; saying "Try it in the simulator" there confused reviewers).
      if(t.do){ const steps=Array.isArray(t.do)?t.do:[t.do];
        html+='<div class="tryit"><div class="tryit-h">'+(t.doLabel||'▶ Try it in the simulator')+'</div>'+
          (steps.length>1?'<ol>'+steps.map(s=>'<li>'+s+'</li>').join('')+'</ol>':'<p>'+steps[0]+'</p>')+'</div>'; }
      if(t.observe) html+='<p class="observe">👁 <b>What to look for:</b> '+t.observe+'</p>';
      // ungraded reflection prompts to keep them engaged with the sim, not racing to the quiz
      if(t.think){ html+='<div class="think"><b>🤔 While you watch, think about:</b><ul>'+
        t.think.map(q=>'<li>'+q+'</li>').join('')+'</ul></div>'; }
      if(t.quiz){ html+='<div class="checklabel">✓ Check your understanding</div>'+quizHtml(tid,t.quiz,done); }
      else if(!done){ html+='<div class="markdone"><button class="btn ghost" onclick="markDone(\''+tid+'\')">✓ I did this — mark the exercise done</button></div>'; }
      card.innerHTML=html; host.appendChild(card);
      if(t.quiz && !done) wireQuiz(card,tid,t.quiz);
    }
  }
  maybeFinish();
}
/* Options render in a per-quiz SHUFFLED order (so the correct answer isn't always in the same
   slot — several data files habitually put it second). data-o keeps each option's ORIGINAL
   index, so the answer key and feedback arrays need no remapping. The order is drawn once per
   quiz object and cached, so a re-render within the session doesn't reshuffle. */
function optOrder(q){ if(!q._ord){ q._ord=q.opts.map((_,i)=>i);
    for(let i=q._ord.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=q._ord[i]; q._ord[i]=q._ord[j]; q._ord[j]=t; } }
  return q._ord; }
function quizHtml(key,q,done){
  let html='<div class="quiz"><div class="q">'+esc(q.q)+(q.multi?' <span style="font-weight:400;color:var(--dim);font-size:15px">(check all that apply)</span>':'')+'</div>';
  if(q.multi){
    optOrder(q).forEach(oi=>{ const o=q.opts[oi]; html+='<label class="opt mopt" data-t="'+key+'" data-o="'+oi+'"'+(done?' style="pointer-events:none"':'')+'><input type="checkbox" style="margin-right:9px;pointer-events:none">'+esc(o)+'</label>'; });
    if(!done) html+='<button class="btn" style="margin-top:10px" id="sub_'+key+'">Submit answer</button>';
    html+='<div class="fb'+(done?' ok':'')+'" id="fb_'+key+'">'+(done?'✓ '+esc(q.why):'')+'</div></div>';
  } else {
    optOrder(q).forEach(oi=>{ const o=q.opts[oi]; html+='<label class="opt" data-t="'+key+'" data-o="'+oi+'"'+(done?' style="pointer-events:none"':'')+'>'+esc(o)+'</label>'; });
    html+='<div class="fb'+(done?' ok':'')+'" id="fb_'+key+'">'+(done?'✓ '+esc(q.why):'')+'</div></div>';
  }
  return html;
}
function wireQuiz(card,key,q){
  if(q.multi){ card.querySelectorAll('.mopt').forEach(el=>el.onclick=()=>{ const cb=el.querySelector('input'); cb.checked=!cb.checked; el.classList.toggle('sel',cb.checked); });
    const sub=$('sub_'+key); if(sub) sub.onclick=()=>answerMulti(key,q);
  } else { card.querySelectorAll('.opt').forEach(el=>el.onclick=()=>answer(key,+el.dataset.o,q)); }
}
function answerMulti(key,q){
  const card=$('card_'+key), opts=card.querySelectorAll('.mopt'), fb=$('fb_'+key);
  const picked=[]; opts.forEach(el=>{ if(el.querySelector('input').checked) picked.push(+el.dataset.o); });
  const want=q.a.slice().sort().join(','), got=picked.slice().sort().join(',');
  if(want===got){ opts.forEach(el=>{el.style.pointerEvents='none'; el.classList.add('correct');});
    const sub=$('sub_'+key); if(sub) sub.remove();
    fb.className='fb ok'; fb.innerHTML='✓ '+esc(q.why);
    card.classList.add('done'); const nl=card.querySelector('.n'); if(nl&&!/✓/.test(nl.textContent)) nl.textContent+=' ✓';
    save(key); updateRail(); maybeFinish();
  } else { fb.className='fb no'; fb.innerHTML='✗ '+esc(q.whyWrong||'Not quite — reconsider which factors matter, and check all that apply.');
    reportMiss(key);
    opts.forEach(el=>{ const i=+el.dataset.o, chosen=el.querySelector('input').checked, shouldBe=q.a.includes(i);
      if(chosen!==shouldBe){ el.classList.add('wrong'); setTimeout(()=>el.classList.remove('wrong'),1400); } }); }
}
function answer(key,oi,q){
  const card=$('card_'+key); const opts=card.querySelectorAll('.opt'); const fb=$('fb_'+key);
  const correct=oi===q.a;
  opts.forEach(el=>{const i=+el.dataset.o; el.classList.remove('wrong','correct'); if(i===oi) el.classList.add(correct?'correct':'wrong');});
  if(correct){ opts.forEach(el=>el.style.pointerEvents='none');
    fb.className='fb ok'; fb.innerHTML='✓ '+esc(q.why);
    card.classList.add('done'); const nl=card.querySelector('.n'); if(nl&&!/✓/.test(nl.textContent)) nl.textContent+=' ✓';
    save(key); updateRail(); maybeFinish();
  } else { fb.className='fb no'; fb.innerHTML='✗ '+esc((q.feedback&&q.feedback[oi])||'Not quite — review and try again.');
    reportMiss(key);
    setTimeout(()=>opts.forEach(el=>el.classList.remove('wrong')),1200); }
}
function markDone(tid){ const card=$('card_'+tid); card.classList.add('done');
  const nl=card.querySelector('.n'); if(nl&&!/✓/.test(nl.textContent)) nl.textContent+=' ✓';
  const btn=card.querySelector('.markdone'); if(btn) btn.remove();
  save(tid); updateRail(); maybeFinish(); }

/* ---- final exam (4–5 summary questions) ---- */
function renderExam(){
  if(!WORKSHEET.exam||!WORKSHEET.exam.length){ $('exam').innerHTML=''; return; }
  let html='<div class="part"><h2>FINAL CHECK · '+WORKSHEET.exam.length+' questions</h2>'+
    '<p style="color:var(--dim)">A short quiz over the whole module. Answer all to finish.</p></div>';
  WORKSHEET.exam.forEach((q,i)=>{ const key='exam'+i, done=state[key];
    html+='<div class="task'+(done?' done':'')+'" id="card_'+key+'"><div class="n">Q'+(i+1)+(done?' ✓':'')+'</div>'+quizHtml(key,q,done)+'</div>';
  });
  $('exam').innerHTML=html;
  WORKSHEET.exam.forEach((q,i)=>{ const key='exam'+i; if(!state[key]) wireQuiz($('card_'+key),key,q); });
}

function renderEndmatter(){
  let html='';
  if(WORKSHEET.summary){
    html+='<div class="card"><h2>🎯 Key points to remember</h2><ul style="line-height:1.7;padding-left:22px;font-size:17px">'+
      WORKSHEET.summary.map(s=>'<li style="margin:8px 0">'+s+'</li>').join('')+'</ul></div>'; }
  if(WORKSHEET.resources){
    html+='<div class="card"><h2>📚 Learn more <span style="font-size:14px;font-weight:400">(<a href="resources.html" target="_blank" style="color:var(--accent)">all modules ↗</a>)</span></h2>'+
      '<ul style="line-height:1.8;padding-left:22px;font-size:17px">'+
      WORKSHEET.resources.map(r=>'<li><a href="'+esc(r.u)+'" target="_blank" rel="noopener" style="color:var(--accent)">'+esc(r.t)+'</a>'+(r.note?' — <span style="color:var(--dim);font-size:15px">'+r.note+'</span>':'')+'</li>').join('')+'</ul></div>'; }
  $('endmatter').innerHTML=html;
}

function updateRail(){ const total=totalCount(), done=doneCount();
  const rail=$('rail'); rail.innerHTML='';
  allTaskIds().forEach(id=>{const d=document.createElement('div');d.className='pip'+(state[id]?' done':'');rail.appendChild(d);});
  $('railTxt').textContent=done+' of '+total+' complete'+(done===total?' — module finished! 🎉':''); }
function maybeFinish(){ if(totalCount()>0 && doneCount()===totalCount()) showDone(); }
function showDone(){ const d=$('done'); if(d) d.style.display='block'; }

/* boot() is async, so an exception inside it becomes a REJECTED PROMISE, not a visible error: the
   page simply sits at "loading…" forever with nothing in the console but an unhandled rejection.
   That is exactly how the offlineBadge ordering bug reached a user. A worksheet is mostly static
   content, so failing to reach the server must never cost the student the text — if boot() dies we
   render anyway, in standalone mode, and say so. */
boot().catch(e=>{
  try{
    console.error('worksheet boot failed:', e);
    OFFLINE=true;
    const saved=lsLoad(); allTaskIds().forEach(id=>{ state[id]=!!saved[id]; });
    renderAll(); updateRail(); showOfflineBadge();
    $('status').innerHTML='<b>standalone</b> — progress saved in this browser';
  }catch(e2){ const s=$('status'); if(s) s.textContent='This worksheet failed to load: '+(e&&e.message||e); }
});
