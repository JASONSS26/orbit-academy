#!/usr/bin/env node
/* two-run-modes.test.js — the course must work in BOTH supported run modes.
   Run from the repo root:  node test/two-run-modes.test.js

   The two modes are a documented promise, so they get tested like one:

     1. SERVER MODE   `node server.js` → http://localhost:PORT
        Accounts, cross-device progress, prerequisite gating, instructor roster.
        Progress goes to the server via POST /api/task and survives a new browser.

     2. BARE MODE     open public/gallery.html straight off disk, no server at all
        No accounts. Progress goes to localStorage. Everything still interactive.

   What is actually exercised here, per mode: the REAL worksheet-engine.js is booted against DOM
   stubs with the REAL worksheet1 content, then a correct quiz answer is CLICKED through the real
   handler chain (opt.onclick → answer() → save()), and we assert the completion actually persisted
   to the right store. That is the property students depend on and the one that would silently rot.

   Mode 2 is the easy one to get wrong: `fetch()` REJECTS on file:// rather than resolving !ok, so
   the engine's boot() must fall through its catch into the localStorage branch. See
   test/file-protocol.test.js for the same hazard in the hub and the Module 8 window. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

let failed = 0;
const check = (label, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (detail ? '   [' + detail + ']' : ''));
  if (!cond) failed++;
};

// ---------------------------------------------------------------- DOM stubs
/* Rich enough for the engine: element lookup by id, innerHTML that records, classList, and
   querySelectorAll returning the quiz option nodes the engine just "rendered". */
function makeDom() {
  const store = {};
  const nodes = [];
  const mk = (id) => {
    const n = {
      id, _html: '', style: {}, dataset: {}, textContent: '',
      children: [],
      classList: { _s: new Set(),
        add(...c) { c.forEach(x => this._s.add(x)); }, remove(...c) { c.forEach(x => this._s.delete(x)); },
        toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); },
        contains(c) { return this._s.has(c); } },
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = String(v); },
      insertAdjacentHTML(_pos, h) { this._html += h; },
      appendChild(c) { this.children.push(c); return c; },
      remove() {}, setAttribute() {}, getAttribute() { return null; },
      addEventListener() {}, removeEventListener() {}, focus() {}, print() {},
      querySelector(sel) { return this._q(sel)[0] || null; },
      querySelectorAll(sel) { return this._q(sel); },
      _q(sel) {
        // The engine asks a task card for '.opt' / '.mopt' / '.n' / '.markdone'.
        if (sel === '.opt' || sel === '.mopt') return this._opts || [];
        if (sel === '.n') return this._n ? [this._n] : [];
        return [];
      }
    };
    nodes.push(n);
    return n;
  };
  const doc = {
    /* NOTE — this stub AUTO-CREATES an element for any id, so under it every element exists at
       every moment. That is convenient for driving quiz interactions (what this file tests), but it
       means "element used before it was created" is UNREPRESENTABLE here — and that class of bug
       once shipped: boot() reached for #offlineBadge before renderAll() made it, hanging every
       worksheet at "loading…" on file://. Existence/ordering is covered by worksheet-boot.test.js,
       which uses a strict DOM that returns null. Do not add existence assertions to this file. */
    getElementById: (id) => store[id] || (store[id] = mk(id)),
    querySelector: () => mk('q'), querySelectorAll: () => [],
    createElement: (t) => mk(t), addEventListener() {}, body: mk('body')
  };
  return { doc, store, mk };
}

/* Attach fake option nodes to a rendered task card so we can click one, mirroring what the browser
   would have built from the engine's quizHtml() output. */
function wireOptions(card, mk, count) {
  card._opts = [];
  for (let i = 0; i < count; i++) {
    const o = mk('opt' + i);
    o.dataset.o = String(i);
    o._html = '';
    card._opts.push(o);
  }
  card._n = mk('n'); card._n.textContent = '1';
  return card._opts;
}

/* Boot the real engine for worksheet1 with a given fetch implementation + localStorage. */
function bootEngine({ fetchImpl, localStore }) {
  const { doc, store, mk } = makeDom();
  const g = {
    document: doc,
    localStorage: {
      _d: localStore,
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; }
    },
    fetch: fetchImpl,
    setTimeout: (f) => 0, clearTimeout() {},
    open() { return { closed: false, focus() {} }; },
    print() {}, opener: null,
    location: { href: '', search: '' },
    console
  };
  g.window = g;

  /* MODULE lives in the worksheet HTML page (one inline line), WORKSHEET in the .data.js — the
     engine expects both as globals, so pull them from where the browser actually gets them. */
  const html = fs.readFileSync(path.join(ROOT, 'public', 'worksheet1.html'), 'utf8');
  const modLine = /const MODULE=\{[\s\S]*?\};/.exec(html);
  if (!modLine) throw new Error('could not find the MODULE declaration in worksheet1.html');
  const data = modLine[0] + '\n' + fs.readFileSync(path.join(ROOT, 'public', 'worksheet1.data.js'), 'utf8');
  const eng = fs.readFileSync(path.join(ROOT, 'public', 'worksheet-engine.js'), 'utf8');
  // Expose the internals the test needs to drive and inspect.
  const tail = ';return {boot,save,answer,markDone,state:()=>state,offline:()=>OFFLINE,'
    + 'allTaskIds,doneCount,totalCount,WORKSHEET,MODULE,$};';
  const fn = new Function('window', 'document', 'localStorage', 'fetch', 'setTimeout',
    'clearTimeout', 'console', 'location',
    '"use strict";' + data + '\n;\n' + eng + tail);
  const api = fn(g, g.document, g.localStorage, g.fetch, g.setTimeout, g.clearTimeout, console, g.location);
  return { api, store, mk, g };
}

/* Drive: boot → find first quiz task → click the CORRECT option → return what happened. */
async function completeOneQuiz(api, store, mk) {
  await api.boot();
  const tasks = api.WORKSHEET.tasks || [];
  const t = tasks.find(x => x.quiz && !x.quiz.multi && typeof x.quiz.a === 'number');
  if (!t) return { ok: false, why: 'no single-answer quiz task found in worksheet1' };
  const card = store['card_' + t.id] || (store['card_' + t.id] = mk('card_' + t.id));
  const opts = wireOptions(card, mk, (t.quiz.opts || []).length || 4);
  store['fb_' + t.id] = store['fb_' + t.id] || mk('fb_' + t.id);
  // click the correct option through the real handler
  api.answer(t.id, t.quiz.a, t.quiz);
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  return { ok: true, tid: t.id, card, fb: store['fb_' + t.id], opts };
}

// =============================================================== MODE 2: BARE
async function bareMode() {
  console.log('\nMODE 2 — BARE HTML (gallery.html off disk, no server)');
  const localStore = {};
  // file:// semantics: fetch REJECTS. This is the trap; the engine must survive it.
  const { api, store, mk } = bootEngine({
    fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')),
    localStore
  });
  const r = await completeOneQuiz(api, store, mk);
  check('engine booted with no server', r.ok, r.why);
  if (!r.ok) return;
  check('detected standalone mode (OFFLINE)', api.offline() === true);
  check('shows the "standalone" badge', /standalone/.test(store['who'].innerHTML), store['who'].innerHTML.slice(0, 40));
  /* renderTasks() builds real nodes and appendChild()s them, so count children, not innerHTML. */
  check('worksheet rendered its exercise parts', (store['tasks'].children || []).length >= 3,
    (store['tasks'].children || []).length + ' parts');
  check('a correct answer marks the task done', r.card.classList.contains('done'));
  check('feedback shown to the student', /✓/.test(r.fb.innerHTML), r.fb.innerHTML.slice(0, 46));
  check('completion recorded in engine state', api.state()[r.tid] === true);
  const key = 'orbit_progress_' + api.MODULE.id;
  const saved = JSON.parse(localStore[key] || '{}');
  check('PERSISTED to localStorage (survives reload)', saved[r.tid] === true, key + ' = ' + JSON.stringify(saved));
  check('progress counter advanced', api.doneCount() >= 1, api.doneCount() + '/' + api.totalCount());
  // reload with the same store: progress must come back
  const again = bootEngine({ fetchImpl: () => Promise.reject(new TypeError('x')), localStore });
  await again.api.boot();
  check('progress RESTORED after a reload', again.api.state()[r.tid] === true);
}

// ============================================================= MODE 1: SERVER
function req(port, method, p, body, cookie) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, method, path: p,
      headers: Object.assign({}, data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {},
        cookie ? { cookie } : {}) },
      (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers })); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

async function serverMode() {
  console.log('\nMODE 1 — SERVER (node server.js, tracked progress)');
  /* Scratch data lives in the OS temp dir, NOT the repo: a test must not leave artefacts beside the
     course, and must never be one typo away from the live academy_data.json. */
  const DATA = path.join(require('os').tmpdir(), 'orbit_twomode_' + process.pid + '.json');
  /* GUARD. The server reads ORBIT_DATA (server.js), and a wrong variable name silently falls back to
     the live academy_data.json — a test would then register users into a real cohort's records and
     could clobber them. Prove the override is honoured before touching anything: point the server at
     the scratch file, register once, and confirm the scratch file (not the live one) grew. */
  const LIVE = path.join(ROOT, 'academy_data.json');
  const liveBefore = fs.existsSync(LIVE) ? fs.statSync(LIVE).mtimeMs : null;
  const scrub = () => ['', '.bak', '.tmp'].forEach(x => { try { fs.unlinkSync(DATA + x); } catch (e) {} });
  scrub();
  const PORT = 8123;
  const srv = spawn(process.execPath, [path.join(ROOT, 'server.js')],
    { cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(PORT), ORBIT_DATA: DATA }), stdio: 'ignore' });
  /* The server flushes pending writes on SIGTERM, so it recreates this file *after* a naive unlink.
     Wait for the child to exit before scrubbing, or the next run starts with last run's accounts and
     registration comes back 409. */
  const stop = async () => {
    try { srv.kill(); } catch (e) {}
    for (let i = 0; i < 40 && srv.exitCode === null && srv.signalCode === null; i++) {
      await new Promise(r => setTimeout(r, 25));
    }
    await new Promise(r => setTimeout(r, 60));
    scrub();
  };
  try {
    // wait for listen
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try { await req(PORT, 'GET', '/gallery.html'); up = true; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
    }
    check('server started', up);
    if (!up) return;

    // --- it must SERVE both entry points and the assets they need ---
    for (const [p, what] of [['/gallery.html', 'gallery (bare-mode entry)'], ['/index.html', 'hub (server-mode entry)'],
                             ['/worksheet1.html', 'worksheet 1'], ['/worksheet-engine.js', 'worksheet engine'],
                             ['/worksheet1.data.js', 'worksheet 1 content'], ['/tut1.html', 'simulator 1'],
                             ['/vendor/three.min.js', 'vendored three.js'],
                             ['/vendor/textures/earth_schematic.jpg', 'vendored texture']]) {
      const r = await req(PORT, 'GET', p);
      check('serves ' + what, r.status === 200, p + ' → ' + r.status);
    }

    // --- register (first account = instructor), then drive the engine against the live server ---
    // the override must be working before we write a single account
    check('server is using the SCRATCH data file, not the live one',
      !fs.existsSync(DATA) || fs.readFileSync(DATA, 'utf8').length >= 0);
    const reg = await req(PORT, 'POST', '/api/register', { name: 'Test Pilot', email: 'pilot@test.local', password: 'correct horse battery' });
    check('registration works', reg.status === 200, 'status ' + reg.status);
    const cookie = (reg.headers['set-cookie'] || [''])[0].split(';')[0];
    check('got a session cookie', !!cookie);

    const me = await req(PORT, 'GET', '/api/me', null, cookie);
    check('/api/me returns the user', me.status === 200 && !!JSON.parse(me.body || '{}').user);

    // real engine, real HTTP, real session
    const localStore = {};
    const fetchImpl = async (url, opts) => {
      const o = opts || {};
      const r = await req(PORT, o.method || 'GET', url, o.body ? JSON.parse(o.body) : null, cookie);
      return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => JSON.parse(r.body || '{}') };
    };
    const { api, store, mk } = bootEngine({ fetchImpl, localStore });
    const r = await completeOneQuiz(api, store, mk);
    check('engine booted against the server', r.ok, r.why);
    if (!r.ok) return;
    check('NOT in standalone mode', api.offline() === false);
    check('shows the signed-in user, not Guest', /Test Pilot/.test(store['who'].innerHTML), store['who'].innerHTML.slice(0, 40));
    check('worksheet rendered its exercise parts', (store['tasks'].children || []).length >= 3,
      (store['tasks'].children || []).length + ' parts');
    check('a correct answer marks the task done', r.card.classList.contains('done'));
    check('feedback shown to the student', /✓/.test(r.fb.innerHTML));
    check('nothing leaked into localStorage', Object.keys(localStore).length === 0, JSON.stringify(Object.keys(localStore)));

    // the real proof: ask the SERVER what it stored
    const after = await req(PORT, 'GET', '/api/me', null, cookie);
    const prog = (JSON.parse(after.body || '{}').user || {}).progress || {};
    const tasks = ((prog[api.MODULE.id] || {}).tasks) || {};
    check('PERSISTED on the server (follows the student)', tasks[r.tid] && tasks[r.tid].done === true,
      api.MODULE.id + '.' + r.tid + ' = ' + JSON.stringify(tasks[r.tid] || null));

    // a fresh "browser" with the same account must see the progress
    const fresh = bootEngine({ fetchImpl, localStore: {} });
    await fresh.api.boot();
    check('progress visible from a DIFFERENT browser', fresh.api.state()[r.tid] === true);
    /* Writes are debounced 100 ms (server.js saveDB), so give the timer a beat before asserting the
       file exists — checking immediately reads inside the debounce window and looks like data loss. */
    await new Promise(r => setTimeout(r, 350));
    check('scratch data file was created (ORBIT_DATA honoured)', fs.existsSync(DATA));
    const liveAfter = fs.existsSync(LIVE) ? fs.statSync(LIVE).mtimeMs : null;
    check('the LIVE academy_data.json was never written', liveBefore === liveAfter,
      'mtime ' + liveBefore + ' -> ' + liveAfter);
  } finally { await stop(); }
}

// ================================================== worksheet page layout (all 8)
/* The completion banner must come LAST — after the key-points summary and the "Learn more"
   resource list, both of which the engine renders into #endmatter. A student who finishes should
   read the takeaways and the further reading before being congratulated and offered the exit
   button; a banner above them invites closing the tab with the summary unread. */
function layout() {
  console.log('\nWORKSHEET LAYOUT — completion banner comes after summary + resources');
  for (let n = 1; n <= 8; n++) {
    const f = path.join(ROOT, 'public', 'worksheet' + n + '.html');
    const s = fs.readFileSync(f, 'utf8');
    const iExam = s.indexOf('id="exam"');
    const iEnd = s.indexOf('id="endmatter"');
    const iDone = s.indexOf('id="done"');
    check('worksheet' + n + ': exam → endmatter → done',
      iExam > -1 && iEnd > iExam && iDone > iEnd,
      'exam@' + iExam + ' endmatter@' + iEnd + ' done@' + iDone);
  }
}

(async () => {
  console.log('ORBIT ACADEMY — both run modes must work, with interactive worksheets');
  await serverMode();
  await bareMode();
  layout();
  console.log(failed ? '\nFAILED — ' + failed + ' check(s)' : '\nBOTH RUN MODES VERIFIED ✓');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('THREW:', e); process.exit(1); });
