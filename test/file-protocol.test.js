#!/usr/bin/env node
/* file-protocol.test.js — the course must survive being opened as a FILE, not just served.
   Run from the repo root:  node test/file-protocol.test.js

   WHY THIS EXISTS. "Download the ZIP and double-click it" is the primary install path for a
   non-technical user, which means the pages run from a file:// URL with no origin and no server.
   Two browser behaviours bite there, and both shipped as silent hangs in v5.0:

     1. fetch() on file:// REJECTS. It does not resolve with ok=false. Any code shaped like
        `const r = await fetch(...); if(!r.ok){ handle(); }` therefore never handles anything — the
        promise rejects, the handler is skipped, and the page sits blank with no diagnostic. That is
        exactly what public/index.html did, and the README was telling people to open it.
     2. getImageData() on a canvas holding a file:// image throws SecurityError. Browsers treat a
        local image as cross-origin, so the canvas is tainted and its pixels cannot be read back.
        tut8's window raytracer samples planet pixels; because the render loop catches and logs once,
        the symptom was a frozen cockpit that looked like broken physics.

   Both are asserted structurally AND by simulation: a rejecting fetch must reach the no-server
   handler, and a throwing getImageData must degrade to null rather than escape. */
'use strict';
process.chdir(require('path').resolve(__dirname, '..'));
const fs=require('fs'); let bad=0;
const ok=(l,c,d)=>{ console.log((c?'  PASS  ':'  FAIL  ')+l+(d?'   ['+d+']':'')); if(!c) bad++; };

// ---- 1. the hub -----------------------------------------------------------------
const hub=fs.readFileSync('public/index.html','utf8');
const m=/async function refresh\(\)\{([\s\S]*?)\n\}/.exec(hub);
ok('refresh() found', !!m);
const body=m[1];
ok('the /api/me fetch is inside a try', /try\s*\{[^}]*fetch\('\/api\/me'\)/.test(body));
ok('a rejection is caught, not ignored', /catch\s*\(\s*e\s*\)\s*\{\s*showNoServer\(\)/.test(body));
ok('showNoServer() is defined', /function showNoServer\(\)/.test(hub));
ok('it names gallery.html as the working door', /showNoServer[\s\S]{0,1600}gallery\.html/.test(hub));
ok('it distinguishes file:// from a dead server', /location\.protocol\s*===\s*'file:'/.test(hub));
// simulate: rejecting fetch must reach showNoServer, NOT hang
let reached=null;
global.fetch=()=>Promise.reject(new TypeError('Failed to fetch'));
const sim=new Function('fetch','showAuth','showNoServer','return (async function refresh(){'+body+'\n})();');
sim(global.fetch,()=>reached='showAuth',()=>reached='showNoServer')
  .then(()=>{ ok('a REJECTED fetch lands in showNoServer (was: hung forever)', reached==='showNoServer', 'reached='+reached);
    // ---- 2. tut8 window ---------------------------------------------------------
    const t8=fs.readFileSync('public/tut8.html','utf8');
    const gp=/function getPix\(tex\)\{([\s\S]*?)\n    return p; \}/.exec(t8);
    ok('getPix() found', !!gp);
    if(gp){ const g=gp[1];
      ok('getImageData is wrapped in try/catch', /try\s*\{[^}]*getImageData/.test(g));
      ok('the failure is CACHED (no per-frame retry)', /catch[\s\S]{0,120}_winPix\[tex\.src\]=null/.test(g));
      ok('cached failure short-circuits on re-entry', /if\(p===null\) return null;/.test(g));
      ok('sets a flag the UI can report', /_winPixBlocked=true/.test(g)); }
    ok('the window labels the degraded mode on screen', /_winPixBlocked[\s\S]{0,260}flat shading/.test(t8));
    // simulate a tainted canvas: getPix must return null, not throw
    let threw=false, res='x';
    const tex={complete:true,naturalWidth:2048,naturalHeight:1024,src:'file:///earth.jpg'};
    global.window={_winPix:{}}; global.document={createElement:()=>({width:0,height:0,
      getContext:()=>({drawImage(){}, getImageData(){ const e=new Error('Tainted canvases may not be exported.'); e.name='SecurityError'; throw e; }})})};
    const getPix=new Function('tex','window','document',''+gp[0].replace(/^function getPix\(tex\)\{/,'')
      .replace(/\n    return p; \}$/,'\n    return p;'));
    try{ res=getPix(tex,global.window,global.document); }catch(e){ threw=true; }
    ok('a SecurityError does NOT escape getPix (was: killed the render loop)', !threw);
    ok('it degrades to null so the sim draws flat spheres', res===null, 'returned '+JSON.stringify(res));
    console.log(bad?'\n'+bad+' check(s) failed':'\nfile:// ROBUSTNESS VERIFIED — 13/13');
    process.exit(bad?1:0); });
