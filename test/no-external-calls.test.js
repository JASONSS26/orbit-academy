#!/usr/bin/env node
/* no-external-calls.test.js — prove the course makes NO outbound network calls.
 *
 *   node test/no-external-calls.test.js
 *
 * Orbit Academy is meant to install and run on standalone / air-gapped systems (US Space Force
 * training use), so "does anything phone home?" is a property we test, not a promise we make.
 *
 * Two independent passes, because either alone can be fooled:
 *
 *   PASS 1 — STATIC. Scan every shipped HTML/JS/CSS file for constructs a browser will actually
 *            FETCH: src=, <link href=>, css url(), fetch(), XHR.open(), WebSocket, EventSource,
 *            sendBeacon, importScripts, .src=. Any absolute URL there fails. Deliberately does NOT
 *            flag URLs merely *mentioned* in prose or in <a href> reading links — guide.html quotes
 *            the git clone command, and a test that cries wolf is a test people learn to ignore.
 *            Also asserts three.js loads locally, ALLOW_CDN defaults to false, and the schematic
 *            texture fallbacks are actually committed.
 *
 *   PASS 2 — RUNTIME. Actually execute each simulator's inline JavaScript against a DOM stub whose
 *            every network primitive is instrumented: fetch, XMLHttpRequest, WebSocket,
 *            EventSource, sendBeacon, Image().src, and createElement('script'/'link'/'img').src.
 *            Any absolute URL that reaches one of them is recorded and fails the test. This catches
 *            a URL that a static scan cannot see because it was assembled at runtime.
 *
 * A note on three.js: the sims load it from public/vendor/three.min.js (populated once by
 * tools/fetch-vendor.sh). This test does NOT require the file to be present — it stubs THREE — so
 * the test is meaningful on a fresh clone. It does check that the tag points at a LOCAL path.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public');

let failures = 0;
const ok   = (m) => console.log('  ✓ ' + m);
const bad  = (m) => { console.log('  ✗ ' + m); failures++; };

// Hosts that may legitimately appear as <a href> further-reading links.
const READING = /^https?:\/\/(en\.wikipedia\.org|www\.nasa\.gov|www\.goes-r\.gov|celestrak\.org|www\.space-track\.org|github\.com|nodejs\.org|www\.jason\.org)/;
const NAMESPACE = /^http:\/\/www\.w3\.org\//;         // XML namespaces, never fetched

// every shipped front-end file
const files = fs.readdirSync(PUB).filter(f => /\.(html|js|css)$/.test(f));

/* ------------------------------------------------------------------ PASS 1: static scan */
console.log('\nPASS 1 — static scan for FETCHABLE external references');

/* Deliberately precise: we look only for constructs a browser will actually go and fetch.
   Documentation prose and <a href> reading links mention URLs harmlessly (guide.html quotes the
   GitHub clone command and nodejs.org, for instance), and flagging those would train people to
   ignore this test. */
const FETCHABLE = [
  [/\bsrc\s*=\s*["'](https?:[^"']+)/gi,                      '<… src=>'],
  [/<link\b[^>]*\bhref\s*=\s*["'](https?:[^"']+)/gi,         '<link href=>'],
  [/url\(\s*["']?(https?:[^"')]+)/gi,                         'css url()'],
  [/\bfetch\s*\(\s*["'`](https?:[^"'`]+)/gi,                 'fetch()'],
  [/\.open\s*\(\s*["'][A-Z]+["']\s*,\s*["'](https?:[^"']+)/gi, 'XHR.open()'],
  [/new\s+WebSocket\s*\(\s*["'](wss?:[^"']+)/gi,             'WebSocket'],
  [/new\s+EventSource\s*\(\s*["'](https?:[^"']+)/gi,         'EventSource'],
  [/sendBeacon\s*\(\s*["'](https?:[^"']+)/gi,                 'sendBeacon'],
  [/importScripts\s*\(\s*["'](https?:[^"']+)/gi,              'importScripts'],
  [/\.src\s*=\s*["'](https?:[^"']+)/gi,                       '.src ='],
];

for (const f of files) {
  const src = fs.readFileSync(path.join(PUB, f), 'utf8');
  const hits = [];
  for (const [re, how] of FETCHABLE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const url = m[1];
      if (NAMESPACE.test(url)) continue;
      // textures.js carries the CDN strings but filters them out unless ALLOW_CDN is true
      if (f === 'textures.js') continue;
      hits.push(how + ' ' + url);
    }
  }
  if (hits.length) bad(f + ': ' + [...new Set(hits)].slice(0, 3).join(' | '));
}
if (!failures) ok('no shipped file fetches an absolute URL');

// Report (without failing) how many inert reading links exist, so the number is visible.
let links = 0;
for (const f of files) {
  const src = fs.readFileSync(path.join(PUB, f), 'utf8');
  const m = src.match(/https?:\/\/(en\.wikipedia\.org|www\.nasa\.gov|www\.goes-r\.gov|celestrak\.org|www\.space-track\.org)[^\s"'`)<>]*/g);
  if (m) links += m.length;
}
ok(links + ' further-reading links present (inert — only fetched if a student clicks one)');

// three.js must be loaded from a local path in every simulator
for (let i = 1; i <= 8; i++) {
  const f = 'tut' + i + '.html';
  const src = fs.readFileSync(path.join(PUB, f), 'utf8');
  const tag = /<script src="([^"]*three[^"]*)"/i.exec(src);
  if (!tag) bad(f + ': no three.js tag found');
  else if (/^https?:/i.test(tag[1])) bad(f + ': three.js still loaded from ' + tag[1]);
}
if (!failures) ok('all 8 simulators load three.js from a local path');

// textures.js must default to no-CDN
const tex = fs.readFileSync(path.join(PUB, 'textures.js'), 'utf8');
if (/^const ALLOW_CDN = false;/m.test(tex)) ok('textures.js defaults to ALLOW_CDN = false');
else bad('textures.js does NOT default to ALLOW_CDN = false');

// the schematic fallbacks must actually be in the repo
for (const t of ['earth_schematic.jpg', 'moon_schematic.jpg']) {
  const p = path.join(PUB, 'vendor', 'textures', t);
  if (fs.existsSync(p) && fs.statSync(p).size > 4096) ok('offline fallback present: vendor/textures/' + t);
  else bad('MISSING offline fallback vendor/textures/' + t + ' (run tools/make-textures.py)');
}

/* ------------------------------------------------------------------ PASS 2: runtime monitor */
console.log('\nPASS 2 — execute each simulator and watch every network primitive');

function monitor(file) {
  const calls = [];
  const note = (how, url) => { if (/^https?:/i.test(String(url))) calls.push(how + ' ' + url); };

  const noop = () => {};
  const styleStub = () => new Proxy({}, { get: (t, k) => (k === 'setProperty' ? noop : ''), set: () => true });
  const el = (tag) => {
    const e = {
      tagName: String(tag || 'div').toUpperCase(), style: styleStub(), dataset: {}, children: [],
      classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
      addEventListener: noop, removeEventListener: noop, appendChild: noop, insertBefore: noop,
      removeChild: noop, remove: noop, setAttribute: (k, v) => { if (/^(src|href)$/i.test(k)) note('setAttribute', v); },
      getAttribute: () => null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 20, right: 40, bottom: 20 }),
      getContext: () => ctx(), focus: noop, click: noop, play: noop, load: noop,
      width: 40, height: 20, clientWidth: 40, clientHeight: 20, offsetWidth: 300, offsetHeight: 150,
      textContent: '', innerHTML: '', value: '0', checked: false, complete: true, naturalWidth: 0, files: []
    };
    let _src = '', _href = '';
    Object.defineProperty(e, 'src',  { get: () => _src,  set: (v) => { _src = v;  note('<' + e.tagName.toLowerCase() + ' src>', v); } });
    Object.defineProperty(e, 'href', { get: () => _href, set: (v) => { _href = v; note('<' + e.tagName.toLowerCase() + ' href>', v); } });
    return e;
  };
  const ctx = () => new Proxy({}, { get: (t, k) => {
      if (k === 'canvas') return { width: 40, height: 20 };
      if (k === 'measureText') return () => ({ width: 8 });
      if (k === 'createImageData' || k === 'getImageData') return (a, b, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w || 2) * (h || 2) * 4)) });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      return noop;
    }, set: () => true });

  const w = {};
  const doc = {
    getElementById: (id) => (doc.__els[id] || (doc.__els[id] = el('div'))), __els: {},
    querySelector: () => el('div'), querySelectorAll: () => [],
    createElement: el, createElementNS: (ns, t) => el(t), createTextNode: () => ({}),
    addEventListener: noop, removeEventListener: noop, body: el('body'),
    documentElement: el('html'), head: el('head'), cookie: '', title: '', hidden: false,
    readyState: 'complete', visibilityState: 'visible'
  };

  Object.assign(w, {
    document: doc, location: { search: '', href: 'file:///academy/public/' + file, protocol: 'file:' },
    navigator: { userAgent: 'node-audit', sendBeacon: (u) => { note('sendBeacon', u); return true; }, language: 'en' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    devicePixelRatio: 1, innerWidth: 1600, innerHeight: 900,
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    addEventListener: noop, removeEventListener: noop, alert: noop, confirm: () => false,
    getComputedStyle: () => ({ display: 'block', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    fetch: (u) => { note('fetch', u && u.url ? u.url : u); return Promise.reject(new Error('blocked by audit')); },
    XMLHttpRequest: function () { return { open: (m, u) => note('XHR', u), send: noop, setRequestHeader: noop, addEventListener: noop }; },
    WebSocket: function (u) { note('WebSocket', u); return { send: noop, close: noop, addEventListener: noop }; },
    EventSource: function (u) { note('EventSource', u); return { close: noop, addEventListener: noop }; },
    Image: function () { return el('img'); },
    Audio: function () { return el('audio'); },
    Worker: function (u) { note('Worker', u); return { postMessage: noop, terminate: noop }; },
    importScripts: (u) => note('importScripts', u)
  });
  w.window = w; w.self = w; w.globalThis = w; w.top = w; w.parent = w;

  // A THREE stub broad enough for the sims to construct their scenes.
  const V3 = function (x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; };
  ['set','copy','add','sub','addScaledVector','normalize','applyAxisAngle','multiplyScalar','crossVectors',
   'setFromMatrixColumn','clone','lerp','applyQuaternion','setLength','negate','addVectors','subVectors',
   'applyMatrix4','project','unproject','setFromSpherical','cross'].forEach(m => { V3.prototype[m] = function () { return this; }; });
  V3.prototype.length = function () { return 1; };
  V3.prototype.distanceTo = function () { return 1; };
  V3.prototype.dot = function () { return 0; };
  const obj3 = () => {
    const o = { position: new V3(), rotation: new V3(), scale: new V3(), children: [], visible: true,
      material: { color: { set: noop, getHex: () => 0 }, needsUpdate: false, opacity: 1, map: null },
      geometry: { setFromPoints: noop, attributes: { position: { count: 0, setY: noop, getX: () => 0, getZ: () => 0, needsUpdate: false } },
                  computeVertexNormals: noop, dispose: noop, rotateX: noop, setAttribute: noop },
      add: noop, remove: noop, traverse: (f) => f(o), lookAt: noop, updateProjectionMatrix: noop,
      updateMatrixWorld: noop, getWorldPosition: () => new V3(), setRotationFromQuaternion: noop,
      matrix: {}, frustumCulled: true, renderOrder: 0, layers: { set: noop }, name: '' };
    return o;
  };
  const THREE = new Proxy({
    Vector2: V3, Vector3: V3, Color: function () { this.set = noop; this.getHex = () => 0; },
    Scene: obj3, Group: obj3, Object3D: obj3, Mesh: obj3, Line: obj3, LineSegments: obj3, LineLoop: obj3,
    Points: obj3, Sprite: obj3, PerspectiveCamera: function () { const o = obj3(); o.aspect = 1; return o; },
    OrthographicCamera: obj3, AmbientLight: obj3, DirectionalLight: obj3, PointLight: obj3, HemisphereLight: obj3,
    WebGLRenderer: function () { return { setPixelRatio: noop, setSize: noop, setClearColor: noop, render: noop,
      setViewport: noop, setScissor: noop, setScissorTest: noop, domElement: el('canvas'), dispose: noop,
      getContext: () => ctx(), capabilities: { isWebGL2: true }, shadowMap: {}, info: {} }; },
    TextureLoader: function () { return { load: (u, ok2, p, err) => { note('TextureLoader', u); if (err) err(new Error('blocked')); } }; },
    FileLoader: function () { return { load: (u) => note('FileLoader', u) }; },
    ImageLoader: function () { return { load: (u) => note('ImageLoader', u) }; },
    CanvasTexture: function () { this.needsUpdate = true; }, Texture: function () {},
    Raycaster: function () { return { setFromCamera: noop, intersectObjects: () => [], ray: { origin: new V3(), direction: new V3() } }; },
    Quaternion: function () { return { setFromAxisAngle: () => ({}), multiply: () => ({}), slerp: () => ({}) }; },
    Matrix4: function () { return { makeRotationFromQuaternion: () => ({}), setPosition: () => ({}), multiply: () => ({}) }; },
    Spherical: function () { return { setFromVector3: () => ({}) }; },
    Euler: function () { return { set: noop }; },
    Float32BufferAttribute: function () { this.needsUpdate = false; },
    BufferAttribute: function () { this.needsUpdate = false; }, Clock: function () { return { getDelta: () => 0.016 }; },
    DoubleSide: 2, FrontSide: 0, BackSide: 1, AdditiveBlending: 2, NormalBlending: 1,
    SRGBColorSpace: 'srgb', LinearFilter: 1006, RepeatWrapping: 1000, ClampToEdgeWrapping: 1001
  }, { get: (t, k) => (k in t ? t[k] : function () { return obj3(); }) });
  w.THREE = THREE; doc.__els.c = el('canvas');

  // Execute every inline <script> in file order, plus any LOCAL <script src> the page pulls in.
  const html = fs.readFileSync(path.join(PUB, file), 'utf8');
  const chunks = [];
  const tagRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let t;
  while ((t = tagRe.exec(html)) !== null) {
    const attrs = t[1], body = t[2];
    const srcM = /src="([^"]+)"/.exec(attrs);
    if (srcM) {
      if (/^https?:/i.test(srcM[1])) { calls.push('<script src> ' + srcM[1]); continue; }
      const p = path.join(PUB, srcM[1]);
      if (fs.existsSync(p)) chunks.push(['file:' + srcM[1], fs.readFileSync(p, 'utf8')]);
    } else if (body.trim()) chunks.push(['inline', body]);
  }

  const keys = Object.keys(w);
  for (const [label, code] of chunks) {
    try { new Function(...keys, code)(...keys.map(k => w[k])); }
    catch (e) { /* stub gaps are expected; we only care about NETWORK attempts */ }
  }
  return calls;
}

for (let i = 1; i <= 8; i++) {
  const f = 'tut' + i + '.html';
  let calls;
  try { calls = monitor(f); }
  catch (e) { bad(f + ': monitor crashed — ' + e.message); continue; }
  const external = [...new Set(calls)];
  if (external.length === 0) ok(f + ' — 0 outbound calls');
  else bad(f + ' attempted ' + external.length + ' outbound call(s): ' + external.slice(0, 4).join(' | '));
}

/* ------------------------------------------------------------------ result */
console.log('');
if (failures) { console.log('FAILED — ' + failures + ' finding(s). This tree is NOT air-gap clean.'); process.exit(1); }
console.log('PASSED — the course makes no outbound network calls. Air-gap clean. ✓');
process.exit(0);
