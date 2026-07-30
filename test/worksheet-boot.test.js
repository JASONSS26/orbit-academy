/* worksheet-boot.test.js — every worksheet must finish booting, in BOTH run modes.

   WHY THIS EXISTS
   A user reported: "worksheets are hanging when I try to go there from the simulator, in the
   non-node mode. Says 'loading' perpetually."

   The cause was four words of ordering:

       OFFLINE=true; $('offlineBadge').style.display='inline-block';   // in boot()
       ...
       $('who').insertAdjacentHTML('beforebegin','<span id="offlineBadge">...')  // in renderAll()

   boot() reached for #offlineBadge BEFORE renderAll() created it. In a browser that is
   `null.style` → TypeError. boot() is async, so the throw became an unhandled promise rejection:
   no error dialog, no broken layout, just "loading…" forever. It only fired in standalone mode,
   because the server path never touches the badge.

   WHY THE EXISTING SUITE MISSED IT — the important part
   test/two-run-modes.test.js stubs the DOM like this:

       getElementById: (id) => store[id] || (store[id] = mk(id))

   That AUTO-CREATES an element for any id ever asked for. Under that stub every element exists at
   every moment, so "used before it was created" is not merely undetected — it is UNREPRESENTABLE.
   The test asserted standalone mode worked while the real page died on load. A convenience in the
   harness silently deleted the failure mode it was supposed to be guarding.

   So this file uses a STRICT DOM:
     • ids are seeded from the real worksheetN.html skeleton;
     • getElementById returns NULL for anything else — like a browser;
     • ids appearing in injected innerHTML / insertAdjacentHTML become available from then on,
       so legitimate render-then-use is fine and only USE-BEFORE-CREATE fails.

   And it checks the symptom the user actually saw, not just the mechanism: after boot, the status
   line must no longer read "loading…". Any future crash on the boot path — whatever its cause —
   fails here. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ---------------------------------------------------------------- strict DOM */
function makeStrictDom(seedIds) {
  const store = Object.create(null);
  const known = new Set(seedIds);
  const missed = [];                       // every id asked for before it existed

  const mk = (id) => {
    const n = {
      id, tagName: 'DIV', style: {}, dataset: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
      children: [], textContent: '', value: '', checked: false,
      get innerHTML() { return this._html || ''; },
      set innerHTML(v) { this._html = String(v); harvest(this._html); },
      insertAdjacentHTML(_pos, h) { this._html = (this._html || '') + h; harvest(h); },
      appendChild(c) { this.children.push(c); return c; },
      remove() {}, setAttribute() {}, getAttribute() { return null; },
      addEventListener() {}, removeEventListener() {}, focus() {}, print() {},
      querySelector() { return null; }, querySelectorAll() { return []; },
      getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0 }; }
    };
    return n;
  };

  /* Any id that appears in markup written into the page is henceforth reachable — that is what a
     browser does, and it keeps render-then-use legal. */
  function harvest(html) {
    const re = /id="([^"]+)"/g; let m;
    while ((m = re.exec(String(html)))) known.add(m[1]);
  }

  const doc = {
    getElementById(id) {
      if (!known.has(id)) { missed.push(id); return null; }     // ← a browser returns null
      return store[id] || (store[id] = mk(id));
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement: (t) => mk(t),
    addEventListener() {},
    get body() { return store.body || (store.body = mk('body')); }
  };
  return { doc, store, mk, missed, known };
}

/* Hosts that legitimately do not exist on every worksheet page. Worksheets 7 and 8 teach no
   orbital-element table and so carry no #elemTable div. Anything listed here MUST be null-guarded
   in the engine — enforced below — otherwise this list becomes a way to silence a real crash. */
const OPTIONAL_HOSTS = new Set(['elemTable']);

function idsIn(html) {
  const out = []; const re = /id="([^"]+)"/g; let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

/* --------------------------------------------------------------- boot a worksheet */
function bootWorksheet(n, { online }) {
  const htmlPath = path.join(ROOT, 'public', 'worksheet' + n + '.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const { doc, store, missed } = makeStrictDom(idsIn(html));

  const modLine = /const MODULE=\{[\s\S]*?\};/.exec(html);
  if (!modLine) throw new Error('no MODULE declaration in worksheet' + n + '.html');
  const data = modLine[0] + '\n' +
    fs.readFileSync(path.join(ROOT, 'public', 'worksheet' + n + '.data.js'), 'utf8');
  const eng = fs.readFileSync(path.join(ROOT, 'public', 'worksheet-engine.js'), 'utf8');

  const localStore = {};
  const g = {
    document: doc,
    localStorage: {
      getItem: (k) => Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null,
      setItem: (k, v) => { localStore[k] = String(v); },
      removeItem: (k) => { delete localStore[k]; }
    },
    /* MODE 1 = node server present. MODE 2 = bare file:// — where fetch() REJECTS outright
       rather than resolving with ok:false. That distinction is the whole point of mode 2. */
    fetch: online
      ? () => Promise.resolve({ ok: true, json: () => Promise.resolve({
          user: { name: 'Test Student', role: 'student', progress: {} } }) })
      : () => Promise.reject(new TypeError('Failed to fetch')),
    setTimeout: (f) => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    open() { return { closed: false, focus() {} }; }, print() {}, opener: null,
    location: { href: '', search: '' },
    console: { log() {}, error() {}, warn() {} }
  };
  g.window = g;

  const tail = ';return {boot,state:()=>state,offline:()=>OFFLINE,allTaskIds,$};';
  const fn = new Function('window', 'document', 'localStorage', 'fetch', 'setTimeout',
    'clearTimeout', 'setInterval', 'clearInterval', 'console', 'location',
    '"use strict";' + data + '\n;\n' + eng + tail);
  const api = fn(g, g.document, g.localStorage, g.fetch, g.setTimeout, g.clearTimeout,
    g.setInterval, g.clearInterval, g.console, g.location);
  return { api, store, missed, g };
}

/* ------------------------------------------------------------------------ run */
async function main() {
  const sheets = fs.readdirSync(path.join(ROOT, 'public'))
    .map(f => /^worksheet(\d+)\.data\.js$/.exec(f)).filter(Boolean)
    .map(m => +m[1]).sort((a, b) => a - b);

  console.log('worksheet boot — ' + sheets.length + ' worksheets x 2 run modes, strict DOM\n');

  for (const mode of [{ online: true, label: 'node server' }, { online: false, label: 'bare file://' }]) {
    console.log('MODE — ' + mode.label);
    for (const n of sheets) {
      let threw = null, res = null;
      try {
        res = bootWorksheet(n, mode);
        await res.api.boot();                       // an unhandled rejection here IS the bug
        await new Promise(r => setImmediate(r));
      } catch (e) { threw = e; }

      const tag = 'worksheet' + n;
      check(tag + ': boot() completes without throwing', !threw,
        threw && (threw.message || String(threw)));
      if (threw) continue;

      /* The user-visible symptom: the status line is still the HTML placeholder. */
      const status = res.store.status ? (res.store.status.innerHTML || res.store.status.textContent || '') : '';
      check(tag + ': status no longer says "loading…"', !/loading/i.test(status),
        'status = ' + JSON.stringify(status));

      /* No element was reached for before it existed. This is the class-level guard: it catches
         ANY use-before-create on the boot path, not just the badge that started it.
         OPTIONAL_HOSTS are exempt — they legitimately do not exist on every page — but only
         because a separate check below proves the engine null-guards each one. */
      const unexpected = [...new Set(res.missed)].filter(id => !OPTIONAL_HOSTS.has(id));
      check(tag + ': no element used before it was created',
        unexpected.length === 0, 'null getElementById for: ' + unexpected.join(', '));

      // renderTasks() builds cards with appendChild, not innerHTML — count children.
      const host = res.store.tasks;
      check(tag + ': exercise cards were rendered',
        !!(host && host.children.length > 0), 'children = ' + (host ? host.children.length : 'no host'));
      check(tag + ': offline flag matches run mode', res.api.offline() === !mode.online,
        'OFFLINE=' + res.api.offline());
    }
    console.log('');
  }

  /* ---------------------------------------------------------------- regression pin
     Assert the ordering directly, so nobody reintroduces it by editing either half. */
  const eng = fs.readFileSync(path.join(ROOT, 'public', 'worksheet-engine.js'), 'utf8');
  const bootBody = /async function boot\(\)\{[\s\S]*?\n\}/.exec(eng);
  check('boot() never touches #offlineBadge directly',
    bootBody && !/\$\('offlineBadge'\)/.test(bootBody[0]),
    'boot() must set OFFLINE and let renderHeaderButtons() reveal the badge');
  check('every #offlineBadge access outside the renderer is null-guarded',
    !/\$\('offlineBadge'\)\.style/.test(eng),
    'use showOfflineBadge()');
  check('boot() has a .catch so a failure can never hang the page at "loading…"',
    /boot\(\)\s*\.catch\(/.test(eng), '');

  /* Keep OPTIONAL_HOSTS honest: an id may only be exempted from the use-before-create check if the
     engine never dereferences it directly. Otherwise the exemption would hide the very crash that
     took worksheets 7 and 8 down. */
  for (const id of OPTIONAL_HOSTS) {
    const bare = new RegExp("\\$\\('" + id + "'\\)\\s*[.\\[]");
    check('optional host #' + id + ' is never dereferenced without a null guard',
      !bare.test(eng), "found $('" + id + "'). — assign to a local and test it first");
  }

  /* Every id the engine reaches for must either exist in EVERY worksheet page, be created during
     render, or be declared optional. This catches a new worksheet that forgets a required div. */
  const engineIds = [...new Set([...eng.matchAll(/\$\('([a-zA-Z_][\w-]*)'\)/g)].map(m => m[1]))];
  const createdDuringRender = new Set([...eng.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const n of sheets) {
    const pageIds = new Set(idsIn(fs.readFileSync(path.join(ROOT, 'public', 'worksheet' + n + '.html'), 'utf8')));
    const missing = engineIds.filter(id =>
      !pageIds.has(id) && !createdDuringRender.has(id) && !OPTIONAL_HOSTS.has(id));
    check('worksheet' + n + '.html has every div the engine requires',
      missing.length === 0, 'missing: ' + missing.join(', '));
  }

  console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + pass + ' checks)');
  process.exit(fail === 0 ? 0 : 1);
}
main();
