/* sim-boot.test.js — every simulator must reach its first rendered frame.

   WHY THIS EXISTS
   A user reported module 6 showing nothing at all: "all four coordinate frames in module 6 are
   broken. nothing comes up on the screen." A simulator that throws during init leaves a black
   canvas — no error dialog, no layout damage, nothing to see. Exactly like the worksheet "loading…"
   hang, the failure is SILENT, which is why it reached a user twice.

   `node --check` only proves a file PARSES. Every bug of this kind is a RUNTIME error — an
   undefined global, a bad property, a function called before it is defined. The only way to catch
   those is to actually run the thing.

   So this boots each sim's inline script for real, against:
     • a Proxy-based THREE stub that answers any constructor or method the sim reaches for, so the
       harness does not need updating every time a sim uses a new three.js class;
     • a DOM stub that returns null for unknown ids (as a browser does — see worksheet-boot.test.js
       for what an auto-creating stub hides);
   then drives several animation frames and asserts the render loop is still alive.

   It cannot catch anything about how the pixels LOOK. It catches "the script died", which is the
   failure mode that has actually been shipping. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '\n         ' + detail : '')); }
}

/* ---------------------------------------------------------------- THREE stub
   A Proxy that manufactures a class for any name asked of it. Instances answer any method with a
   chainable stub and any property with 0/vector-like defaults. Keeps the harness from needing to
   track three.js's API surface. */
function makeThree(stats) {
  stats = stats || { renders: 0 };
  const vec = () => {
    const v = {
      x: 0, y: 0, z: 0, w: 0,
      set(a, b, c) { v.x = a || 0; v.y = b || 0; v.z = c || 0; return v; },
      copy(o) { v.x = o && o.x || 0; v.y = o && o.y || 0; v.z = o && o.z || 0; return v; },
      clone: () => vec(), add: () => v, sub: () => v, addVectors: () => v, subVectors: () => v,
      multiplyScalar: () => v, divideScalar: () => v, normalize: () => v, negate: () => v,
      applyQuaternion: () => v, applyMatrix4: () => v, applyAxisAngle: () => v,
      cross: () => v, crossVectors: () => v, dot: () => 0, length: () => 1,
      lengthSq: () => 1, distanceTo: () => 1, setFromSpherical: () => v,
      setLength: () => v, lerp: () => v, project: () => v, unproject: () => v,
      setScalar: () => v, toArray: () => [0, 0, 0], equals: () => false
    };
    return v;
  };

  const obj3 = () => {
    const o = {
      position: vec(), rotation: Object.assign(vec(), { order: 'XYZ' }), scale: vec(),
      quaternion: vec(), up: vec(), matrix: {}, matrixWorld: {},
      visible: true, children: [], userData: {}, material: null, geometry: null,
      frustumCulled: true, renderOrder: 0, name: '',
      add(...c) { c.forEach(x => x && o.children.push(x)); return o; },
      remove: () => o, clear: () => o,
      traverse(fn) { fn(o); o.children.forEach(c => c.traverse && c.traverse(fn)); },
      lookAt: () => o, updateMatrix: () => o, updateMatrixWorld: () => o,
      updateProjectionMatrix: () => o, getWorldPosition: () => vec(),
      applyMatrix4: () => o, rotateX: () => o, rotateY: () => o, rotateZ: () => o,
      translateX: () => o, translateY: () => o, translateZ: () => o,
      setRotationFromAxisAngle: () => o, dispose: () => o, copy: () => o, clone: () => obj3(),
      computeLineDistances: () => o, raycast: () => {}, attach: () => o,
      getObjectByName: () => null, localToWorld: (v) => v, worldToLocal: (v) => v
    };
    return o;
  };

  const geo = () => ({
    attributes: { position: { array: new Float32Array(3000), count: 1000, needsUpdate: false,
                              setXYZ() {}, setXYZW() {}, setXY() {}, setX() {}, setY() {}, setZ() {}, setW() {},
                              getX: () => 0, getY: () => 0, getZ: () => 0, getW: () => 0 } },
    setAttribute() { return this; }, setFromPoints() { return this; }, setDrawRange() { return this; },
    setIndex() { return this; }, computeVertexNormals() { return this; },
    rotateX() { return this; }, rotateY() { return this; }, rotateZ() { return this; },
    translate() { return this; }, scale() { return this; }, center() { return this; },
    applyMatrix4() { return this; }, clone() { return geo(); }, toNonIndexed() { return this; },
    computeBoundingSphere() { return this; }, boundingSphere: { radius: 1 },
    dispose() {}, index: null, groups: [], parameters: {}
  });

  const cache = Object.create(null);
  return new Proxy({}, {
    get(_t, name) {
      if (name === 'Symbol(Symbol.toPrimitive)' || typeof name !== 'string') return undefined;
      if (name in cache) return cache[name];

      // Numeric/enum-ish constants three.js exposes as plain values.
      if (/^(FrontSide|BackSide|DoubleSide|AdditiveBlending|NormalBlending|NoBlending|RGBAFormat|RGBFormat|LinearFilter|NearestFilter|LinearMipmapLinearFilter|ClampToEdgeWrapping|RepeatWrapping|MirroredRepeatWrapping|sRGBEncoding|LinearEncoding|UnsignedByteType|TrianglesDrawMode|StaticDrawUsage|DynamicDrawUsage|PCFSoftShadowMap|BasicShadowMap|NoToneMapping)$/.test(name))
        return (cache[name] = 1);

      if (name === 'Vector3' || name === 'Vector2' || name === 'Vector4')
        return (cache[name] = function () { return vec(); });
      if (name === 'MathUtils')
        return (cache[name] = { degToRad: d => d * Math.PI / 180, radToDeg: r => r * 180 / Math.PI,
                                clamp: (v, a, b) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t });
      if (name === 'Spherical')
        return (cache[name] = function () { return { radius: 1, phi: 0, theta: 0, set: function () { return this; },
                                                     setFromVector3: function () { return this; } }; });
      if (name === 'Color')
        return (cache[name] = function () { return { r: 1, g: 1, b: 1, set: function () { return this; },
                                                     setHex: function () { return this; }, getHex: () => 0xffffff,
                                                     setRGB: function () { return this; }, clone: function () { return this; },
                                                     lerp: function () { return this; }, copy: function () { return this; } }; });
      if (name === 'Quaternion' || name === 'Euler')
        return (cache[name] = function () { return Object.assign(vec(), {
          setFromAxisAngle: function () { return this; }, setFromEuler: function () { return this; },
          multiply: function () { return this; }, slerp: function () { return this; }, invert: function () { return this; } }); });
      if (name === 'Matrix4' || name === 'Matrix3')
        return (cache[name] = function () { return { elements: new Array(16).fill(0),
          set: function () { return this; }, identity: function () { return this; },
          makeRotationAxis: function () { return this; }, makeTranslation: function () { return this; },
          multiply: function () { return this; }, invert: function () { return this; },
          copy: function () { return this; }, lookAt: function () { return this; },
          extractRotation: function () { return this; }, compose: function () { return this; } }; });
      if (/Geometry$/.test(name)) return (cache[name] = function () { return geo(); });
      if (/(BufferAttribute)$/.test(name))
        return (cache[name] = function (arr, sz) { return { array: arr, itemSize: sz, count: (arr && arr.length / (sz || 3)) | 0,
          needsUpdate: false, setXYZ() {}, setXYZW() {}, setXY() {}, setX() {}, setY() {}, setZ() {}, setW() {},
                              getX: () => 0, getY: () => 0, getZ: () => 0, getW: () => 0 }; });
      if (/Material$/.test(name))
        return (cache[name] = function (p) { return Object.assign({ color: { set() {}, setHex() {} }, opacity: 1,
          transparent: false, visible: true, map: null, needsUpdate: false, uniforms: {},
          dispose() {}, side: 1, wireframe: false }, p || {}); });
      if (name === 'WebGLRenderer')
        return (cache[name] = function () {
          return { domElement: { style: {}, width: 1200, height: 800, addEventListener() {}, getContext: () => ({}) },
            setSize() {}, setPixelRatio() {}, setViewport() {}, setScissor() {}, setScissorTest() {},
            setClearColor() {}, clear() {}, render() { stats.renders++; },
            getContext: () => ({ getExtension: () => null, getParameter: () => 16 }),
            capabilities: { getMaxAnisotropy: () => 16, isWebGL2: true },
            outputEncoding: 1, shadowMap: { enabled: false }, info: { render: {} }, dispose() {} };
        });
      if (name === 'TextureLoader' || name === 'CubeTextureLoader' || name === 'FileLoader')
        return (cache[name] = function () {
          return { crossOrigin: '', setCrossOrigin() { return this; }, setPath() { return this; },
            load(_u, ok) { const t = { image: { width: 2, height: 1 }, needsUpdate: false, dispose() {},
              wrapS: 1, wrapT: 1, anisotropy: 1, minFilter: 1, magFilter: 1, encoding: 1 };
              if (ok) setTimeout(() => ok(t), 0); return t; } };
        });
      if (name === 'Texture' || name === 'CanvasTexture' || name === 'DataTexture')
        return (cache[name] = function () { return { image: { width: 2, height: 1 }, needsUpdate: false,
          wrapS: 1, wrapT: 1, anisotropy: 1, minFilter: 1, magFilter: 1, encoding: 1, dispose() {} }; });

      // Everything else — Scene, Mesh, Group, Line, Points, cameras, lights, helpers…
      if (name === 'ArrowHelper')
        return (cache[name] = function () {
          const o = obj3();
          o.line = Object.assign(obj3(), { material: { transparent: false, opacity: 1, color: { set() {} }, dispose() {} } });
          o.cone = Object.assign(obj3(), { material: { transparent: false, opacity: 1, color: { set() {} }, dispose() {} } });
          o.setDirection = () => o; o.setLength = () => o; o.setColor = () => o;
          return o;
        });

      return (cache[name] = function (arg0, arg1) {
        const o = obj3();
        /* Line/Mesh/Points are built as new THREE.X(geometry, material) and the sims then reach
           straight through to .geometry.setFromPoints(...) / .material.opacity. Preserve what was
           passed, and default to a live stub rather than null. */
        o.geometry = (arg0 && typeof arg0 === 'object' && 'setAttribute' in arg0) ? arg0 : geo();
        o.material = (arg1 && typeof arg1 === 'object') ? arg1
          : { color: { set() {}, setHex() {} }, opacity: 1, transparent: false, visible: true,
              map: null, needsUpdate: false, dispose() {} };
        if (/Camera$/.test(name)) { o.aspect = 1; o.fov = 50; o.near = 0.1; o.far = 1e9; o.zoom = 1;
          o.left = -1; o.right = 1; o.top = 1; o.bottom = -1; }
        if (name === 'Scene') { o.background = null; o.fog = null; }
        if (/Light$/.test(name)) { o.intensity = 1; o.color = { set() {} }; o.target = obj3(); }
        return o;
      });
    }
  });
}

/* ------------------------------------------------------------------ DOM stub */
function makeDom(html, stats) {
  stats = stats || { draws: 0 };
  const known = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  const store = Object.create(null);
  const missed = [];
  const mk = (id) => ({
    id, tagName: 'DIV', style: { cssText: '', setProperty() {} }, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [], childNodes: [], textContent: '', value: '0', checked: false, disabled: false,
    min: '0', max: '100', step: '1', type: 'range',
    _html: '', get innerHTML() { return this._html; }, set innerHTML(v) { this._html = String(v); },
    insertAdjacentHTML(_p, h) { this._html += h; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, contains: () => false,
    prepend(c) { this.children.unshift(c); return c; },
    append(...c) { c.forEach(x => this.children.push(x)); },
    replaceChildren() { this.children.length = 0; },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    getBoundingClientRect: () => ({ width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800 }),
    getContext: () => ({
      fillRect() { stats.draws++; }, clearRect() {}, drawImage() { stats.draws++; },
      fillText() { stats.draws++; }, strokeText() { stats.draws++; },
      beginPath() {}, moveTo() {}, lineTo() {}, arc() {},
      stroke() { stats.draws++; }, fill() { stats.draws++; }, closePath() {},
      save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      getImageData: () => ({ data: new Uint8ClampedArray(4 * 64 * 32), width: 64, height: 32 }),
      putImageData() {}, measureText: () => ({ width: 10 }),
      setLineDash() {}, getLineDash: () => [], ellipse() {}, rect() {}, roundRect() {},
      quadraticCurveTo() {}, bezierCurveTo() {}, arcTo() {}, clip() {}, isPointInPath: () => false,
      createPattern: () => null, createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      transform() {}, resetTransform() {}, strokeRect() {},
      lineDashOffset: 0, globalAlpha: 1, globalCompositeOperation: 'source-over',
      font: '', textAlign: 'left', textBaseline: 'alphabetic', lineWidth: 1,
      lineCap: 'butt', lineJoin: 'miter', shadowBlur: 0, shadowColor: '',
      fillStyle: '', strokeStyle: '', filter: 'none', imageSmoothingEnabled: true
    }),
    width: 1200, height: 800, offsetWidth: 1200, offsetHeight: 800,
    clientWidth: 1200, clientHeight: 800, querySelector: () => null, querySelectorAll: () => []
  });
  const doc = {
    getElementById(id) {
      if (!known.has(id)) { missed.push(id); return null; }
      return store[id] || (store[id] = mk(id));
    },
    createElement: (t) => { const n = mk(t); n.tagName = String(t).toUpperCase(); return n; },
    createElementNS: (_n, t) => mk(t),
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t), nodeValue: String(t) }),
    createDocumentFragment: () => mk('fragment'),
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    get body() { return store.body || (store.body = mk('body')); },
    get documentElement() { return store.docEl || (store.docEl = mk('html')); },
    readyState: 'complete', title: ''
  };
  return { doc, store, missed, mk };
}

/* ------------------------------------------------------------------ run a sim */
function bootSim(file) {
  const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
  const rafQueue = [];
  const stats = { renders: 0, draws: 0, errors: [] };

  const { doc, missed } = makeDom(html, stats);
  const g = {
    document: doc,
    requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    addEventListener() {}, removeEventListener() {},
    innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { href: 'file:///x/' + file, protocol: 'file:', search: '', hash: '' },
    navigator: { userAgent: 'node', platform: 'test' },
    performance: { now: () => Date.now() },
    Image: function () { return { crossOrigin: undefined, width: 2, height: 1, complete: false,
      set src(v) { this._src = v; }, get src() { return this._src; },
      addEventListener() {}, removeEventListener() {},
      setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
      decode: () => Promise.resolve() }; },
    fetch: () => Promise.reject(new TypeError('Failed to fetch')),   // file:// semantics
    alert() {}, confirm: () => true, open: () => ({ focus() {}, closed: false }), close() {},
    /* Capture console.error. Every sim wraps its render loop in try/catch and reports through
       console.error, so a fatal per-frame error NEVER escapes as a thrown exception — which is
       exactly how a dead loop passed this test while the screen stayed black. */
    console: { log() {}, warn() {}, info() {},
               error(...a) { stats.errors.push(a.map(x => (x && x.message) || String(x)).join(' ')); } },
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Math, JSON, Date, Object, Array, String, Number, Boolean, Error, TypeError, RangeError,
    Promise, Map, Set, WeakMap, WeakSet, Symbol, RegExp, Function, isFinite, isNaN,
    parseFloat, parseInt, encodeURIComponent, decodeURIComponent, Uint8Array, Uint8ClampedArray,
    Float32Array, Int32Array, Uint16Array, Uint32Array, ArrayBuffer, DataView
  };
  /* A REAL global object, via vm — not `new Function`. This matters: the page's helper scripts
     publish themselves with `window.OA_TEX = {...}` and the sim then refers to a BARE `OA_TEX`.
     That only resolves if window IS the global, which is true in a browser and false inside a
     function scope. Getting this wrong makes the harness report failures the product does not have. */
  vm.createContext(g);
  g.window = g; g.globalThis = g; g.self = g;

  /* Run against the REAL vendored three.js, not a hand-written stub. A stub only proves the sim
     called methods the stub happened to implement; the real library rejects genuinely wrong usage
     (bad geometry parameters, attribute size mismatches, methods that do not exist on that class).
     Only WebGLRenderer is replaced, because there is no GL context in node. */
  const threePath = path.join(ROOT, 'public', 'vendor', 'three.min.js');
  let usingReal = false;
  if (fs.existsSync(threePath)) {
    try {
      vm.runInContext(fs.readFileSync(threePath, 'utf8'), g, { filename: 'three.min.js' });
      usingReal = !!(g.THREE && g.THREE.REVISION);
    } catch (e) { usingReal = false; }
  }
  if (!usingReal) g.THREE = makeThree(stats);
  else {
    const R = makeThree(stats).WebGLRenderer;
    g.THREE.WebGLRenderer = R;
    // r128 warns loudly through these if a texture is odd; keep the log clean.
    g.THREE.Cache = g.THREE.Cache || { enabled: false };
  }

  /* Load exactly what the page loads, in page order: <script src> siblings first (three.js is
     replaced by the stub), then the inline script or the external module script. */
  const parts = [];
  const tagRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const attrs = m[1], inline = m[2];
    const src = /src="([^"]+)"/.exec(attrs);
    if (src) {
      if (/three(\.min)?\.js$/.test(src[1])) continue;             // stubbed above
      const p = path.join(ROOT, 'public', src[1]);
      if (fs.existsSync(p)) parts.push({ name: src[1], code: fs.readFileSync(p, 'utf8') });
    } else if (inline.trim()) {
      parts.push({ name: file + ' (inline)', code: inline });
    }
  }
  if (!parts.length) throw new Error('no script found in ' + file);

  for (const p of parts) {
    try { vm.runInContext(p.code, g, { filename: p.name, timeout: 15000 }); }
    catch (e) { e.message = '[' + p.name + '] ' + e.message; throw e; }
  }

  // Drive a few frames — init can succeed and the loop still die on frame 1.
  let frameErr = null, frames = 0, t = 16;
  for (let i = 0; i < 5 && rafQueue.length; i++) {
    const next = rafQueue.shift();
    if (typeof next !== 'function') continue;
    try { next(t); frames++; } catch (e) { if (!frameErr) frameErr = e; }
    t += 16;
  }
  return { missed, frames, frameErr, rafQueued: rafQueue.length, usingReal,
           renders: stats.renders, draws: stats.draws, errors: stats.errors,
           webgl: /WebGLRenderer/.test(html) };
}

/* ------------------------------------------------------------------------ main */
const SIMS = fs.readdirSync(path.join(ROOT, 'public'))
  .filter(f => /^tut\d+\.html$/.test(f))
  .sort((a, b) => (+/\d+/.exec(a)[0]) - (+/\d+/.exec(b)[0]));

console.log('simulator boot smoke test — ' + SIMS.length + ' sims\n');
for (const f of SIMS) {
  let r = null, threw = null;
  try { r = bootSim(f); } catch (e) { threw = e; }

  check(f + ': inline script runs to completion', !threw,
    threw && ((threw.message || String(threw)) + '\n         ' +
      String(threw.stack || '').split('\n').slice(1, 3).join('\n         ')));
  if (threw) continue;

  check(f + ': render loop survives its first frames', !r.frameErr,
    r.frameErr && ((r.frameErr.message || String(r.frameErr)) + '\n         ' +
      String(r.frameErr.stack || '').split('\n').slice(1, 3).join('\n         ')));
  check(f + ': schedules animation frames', r.frames > 0 || r.rafQueued > 0, '');
  check(f + ': ran against the real three.js (not a stub)', r.usingReal, 'fell back to the stub');
  /* A getElementById that returns null is how a sim goes silently blank: pass a null canvas to
     THREE.WebGLRenderer and it quietly creates its OWN canvas, never attached to the page, then
     renders every frame into nothing. No exception, no warning, just a black stage. */
  /* THE CHECK THAT MATTERS. A sim can boot cleanly, schedule frames forever, and draw nothing —
     which is what a black screen IS. Only "renderer.render() actually ran" distinguishes a working
     sim from a loop that throws into its own catch block on every single frame. */
  const drew = r.webgl ? r.renders > 0 : r.draws > 0;
  check(f + ': actually draws (' + (r.webgl ? 'renderer.render' : '2-D canvas ops') + ')', drew,
    'nothing was drawn across ' + r.frames + ' frames — the screen would be black');
  check(f + ': render loop logs no errors', r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  check(f + ': every element it looks up exists in the page',
    r.missed.length === 0, 'null getElementById for: ' + [...new Set(r.missed)].join(', '));
}

/* ---------------------------------------------------------------- flex labels
   A user screenshot showed module 6's checkbox captions rendered as narrow side-by-side columns
   instead of sentences. Cause: `label.chk{display:flex}` makes EVERY child its own flex item, so a
   caption written as  text + <b>…</b> + text  is laid out as three columns. It is a pure-CSS bug —
   nothing throws, so no runtime test can see it. Guard it structurally: in any sim whose .chk label
   is a flex container, everything after the checkbox must be wrapped in a single element. */
/* ---------------------------------------------------------------- worksheet button
   "I don't seem to have a button to get to workbook from module 7 simulator… it's at the bottom.
    we need to be consistent about where that is."
   Contract: EVERY simulator has the standard "📋 Back to worksheet" button, it opens the module's
   own worksheet, and it lives in the TOP of the page (the first quarter of the file), never in a
   footer. Module 1's tutor text tells students to expect exactly this, so it must stay true. */
console.log('\nworksheet button — present, correct target, at the top');
for (const f of SIMS) {
  const n = /\d+/.exec(f)[0];
  const html = fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
  const i = html.indexOf('Back to worksheet');
  check(f + ': has the standard worksheet button', i >= 0, '');
  if (i < 0) continue;
  const btn = html.slice(Math.max(0, i - 400), i);
  check(f + ": button opens worksheet" + n + '.html', btn.includes("worksheet" + n + ".html"),
    'points at the wrong worksheet');
  check(f + ': button sits near the top, not in a footer',
    i < html.length * 0.25, 'found at ' + Math.round(100 * i / html.length) + '% of the file');
}

/* ------------------------------------------------------------- tut8 sun indicator
   The window's lighting is physically right but READS wrong (ecliptic-plane orbit, north =
   screen-right, so the terminator crosses pole-to-pole = horizontally). The owner mistook it for
   a bug; students will too. The ☀ marker + N→ tag are the legend that keeps the correct physics
   from looking broken — they must not be lost in a window-renderer rewrite. */
{ const t8 = fs.readFileSync(path.join(ROOT, 'public', 'tut8.html'), 'utf8');
  check('tut8: window carries the ☀ sun indicator', /SUN INDICATOR/.test(t8) && /sun behind you/.test(t8), '');
  check('tut8: indicator projects the SAME sun that lights the terminator',
    /sun3\[0\]\*Uc\[0\]\+sun3\[1\]\*Uc\[1\]/.test(t8), 'must derive from sun3, not a second sun');
  check('tut8: north tag explains the horizontal terminator (left edge: Rr = −ẑ, so north is left)',
    /'← N'/.test(t8), '');
  /* The GEO-mission somersault: camera up was a Gram–Schmidt residual that changed sign whenever
     the aim-blended boresight crossed the nadir axis — Earth flipped top↔bottom. Up must be the
     closed-form F × ẑ (continuous by construction) and right the CONSTANT −ẑ. */
  check('tut8: camera up is closed-form F × ẑ, not a sign-flipping residual',
    /const Uc=\[F\[1\],-F\[0\],0\]/.test(t8) && !/rhat\[0\]-rdF\*F\[0\]/.test(t8), '');
  check('tut8: camera right is the constant −ẑ', /const Rr=\[0,0,-1\]/.test(t8), '');
  /* Exposure history: flat 1.5x gain wasn't enough because the CAUSE is the map — the Blue
     Marble is radiometrically dark (oceans ~40-60/255); other sims use the punchy atmos map.
     Camera-style exposure now: gain 1.9 + gamma 0.82 via a 256-entry LUT, shading applied BEFORE
     the LUT so the terminator stays dark. Ocean 55→123, cloud 200→255 (rolls off, no hard clip). */
  /* PER-BODY exposure: the Earth curve on the already-bright LRO Moon clipped it to white
     ("moon is now washed-out saturated"). Each raytraced body carries its own LUT. */
  check('tut8: window exposes via PER-BODY gain+gamma LUTs',
    /EXPOSE_EARTH=new Uint8ClampedArray\(256\)/.test(t8) && /\*1\.9 ?\),0\.82\)/.test(t8) &&
    /EXPOSE_MOON/.test(t8) && /\*1\.08\),0\.95\)/.test(t8) &&
    /const LUT=hit\.expose/.test(t8) && /LUT\[\(D\[i00\]/.test(t8), '');
  check('tut8: nav map carries a persistent trace legend (actual / plan / predicted)',
    /actual — flown so far/.test(t8) && /the flight computer/.test(t8) &&
    /where the current orbit heads/.test(t8), '');
  check('tut8: both bodies carry an exposure curve (a new body cannot ship without one)',
    /expose:EXPOSE_EARTH/.test(t8) && /expose:EXPOSE_MOON/.test(t8), '');
  /* Limb-chasing pitch is MOON-ONLY. Applied to Earth it faked the departure — the camera rotated
     up to 72° nose-down so Earth never dropped out of the window after the first burn. Owner:
     "after the first burn the earth should drop in the window to be out of the frame… I'm not sure
     you'd see it out the front window after we leave LEO." He is right; verified geometry: at GEO
     the disc is ±8.7° sitting ~68° below a fixed-pitch boresight. */
  check('tut8: limb-chasing pitch applies only when the Moon is the primary',
    /if\(CB\.name==='Moon'\)\{\s*\n\s*const vHalf/.test(t8), '');
  /* Burn-time freeze fix + cockpit audio. simDtCap=0.6 stopped the world during a thrust hold;
     3.0 keeps steps interleaved AND the sky moving. Secondary panels drop to 10 Hz mid-burn.
     Audio is SYNTHESIZED ONLY (air-gap: no assets, no fetches), gesture-gated, mute persists. */
  check('tut8: pilot warp trim spans ×64 both ways and quotes the absolute rate',
    /Math\.min\(64, userWarp\*2\)/.test(t8) && /Math\.max\(1\/64, userWarp\/2\)/.test(t8) &&
    /warpTrimMsg/.test(t8), '');
  check('tut8: burn-time sim step cap lets the world keep moving (3.0, not 0.6)',
    /if\(firing\) simDtCap=3\.0/.test(t8), '');
  check('tut8: secondary panels throttle to 10 Hz while firing',
    /if\(!firing \|\| t-\(window\._panT\|\|0\)>100\)/.test(t8), '');
  check('tut8: raytracer trades resolution for cadence mid-burn',
    /TARGET=firing\?3\.5:5\.0/.test(t8), '');
  check('tut8: audio is synthesized WebAudio only — no media files, no fetches',
    /createBuffer\(1,/.test(t8) && !/new Audio\(|\.mp3|\.ogg|\.wav/.test(t8), '');
  check('tut8: audio context is gesture-gated and harness-safe',
    /function auInit\(\)/.test(t8) && /if\(!Ctx\) return/.test(t8), '');
  check('tut8: rumble follows thrust on AND off; NO radio beeps (owner call)',
    /auRumble\(true\)/.test(t8) && /auRumble\(false\)/.test(t8) && !/auRadio/.test(t8), '');
  /* The sound button ate the TRAIN button: both fixed at top:12px, sound at right:150px directly
     over TRAIN at right:132px, so every TRAIN click landed on 🔊 — "training function seems now
     dead". Fixed-position buttons on that row must not overlap; assert the audited offsets. */
  { const btns=[...t8.matchAll(/id="(modeToggle|trainBtn|gatesBtn|sndToggle)"[^>]*/g)];
    const rights={}; 
    for(const m of btns){ const css=(/right:(\d+)px/.exec(m[0])||[])[1];
      if(css) rights[m[1]]=+css; }
    // pull the stylesheet values for the ones styled in CSS
    for(const id of ['modeToggle','trainBtn','gatesBtn']){
      const m2=new RegExp('#'+id+'\\{[^}]*right:(\\d+)px').exec(t8); if(m2) rights[id]=+m2[1]; }
    const xs=Object.entries(rights).sort((a,b)=>a[1]-b[1]);
    let overlap=false;
    for(let i=1;i<xs.length;i++) if(xs[i][1]-xs[i-1][1]<100) overlap=true;
    check('tut8: top-row fixed buttons cannot overlap (TRAIN stays clickable)',
      !overlap && rights.sndToggle>rights.gatesBtn,
      JSON.stringify(rights)); } }

/* ------------------------------------------------------------- responsive side columns
   "panels are oversized" on Windows laptops (1366px, 125-150% scaling): fixed-px grid columns
   starved the center canvas. Every 3-column sim must clamp() its side columns to the viewport. */
/* ------------------------------------------------------------- tut2 eclipse dimming
   Satellites shine by reflected sunlight; in Earth's shadow they go dark (the module-7
   "headlights" fact, previewed here). Cylinder shadow + smoothstep penumbra, opacity floor. */
{ const t2 = fs.readFileSync(path.join(ROOT, 'public', 'tut2.html'), 'utf8');
  /* Owner-corrected model: "the satellites go dark when the illuminated side of them is not
     visible… as a function of illumination angle." Brightness = PHASE (illuminated fraction facing
     the camera, (1+cos α)/2 like the Moon's phases) × ECLIPSE (dark inside Earth's shadow from any
     angle). Both from the one sunV that lights the globe; the star field is never dimmed. */
  check('tut2: brightness carries the phase term (1+cos α)/2 toward the camera',
    /const phase=\(1\+sunV\.dot\(camDir\)\)\/2/.test(t2), '');
  check('tut2: eclipse term survives (shadow cylinder + penumbra)',
    /\(perp-0\.85\)\/0\.3/.test(t2), '');
  check('tut2: phase and terminator share one sun (sunV), phases stay in lockstep with Earth',
    /satBrightness=\(pos\)=>/.test(t2) && /pos\.dot\(sunV\)/.test(t2), '');
  check('tut2: applies to GEO sats, junk, AND injected objects',
    /\[satMeshes,junkMeshes\]/.test(t2) && /injected\) o\.mesh\.material\.opacity=satBrightness/.test(t2), '');
  check('tut2: the star field is not touched by satellite dimming',
    !/starPts[^\n]*satBrightness|satBrightness[^\n]*star/.test(t2), ''); }

/* ------------------------------------------------------------- tut6 L1 halo (easter egg)
   A real halo IC, differential-corrected against tut6's exact dynamics. FULL-precision constants
   are load-bearing: the orbit is unstable, and rounding the IC to whole km cost ~2.7 of its ~4.6
   uncorrected laps. Guard the numbers and the 3-D character (out-of-plane release). */
{ const t6 = fs.readFileSync(path.join(ROOT, 'public', 'tut6.html'), 'utf8');
  check('tut6: halo IC ships at full precision',
    /HALO_XI=322163\.493292/.test(t6) && /HALO_V=196\.130474/.test(t6) && /HALO_Y=30000/.test(t6), '');
  check('tut6: halo release is genuinely out-of-plane (y = HALO_Y)',
    /x=HALO_XI\*ux; z=HALO_XI\*uz; y=HALO_Y/.test(t6), '');
  check('tut6: halo mode registered in all three mode dictionaries',
    /halo:'🎯 L1 halo \(off-plane\)'/.test(t6) && /halo:'halo status'/.test(t6) &&
    /halo:'Four releases/.test(t6), '');
  check('tut6: ±5 m/s shadows ride the two unstable-manifold branches',
    /HALO_SET=\[0, 5, -5\]/.test(t6), '');
  /* Fourth release: a live NRHO (Gateway-class), the nearly-stable end of the halo family.
     Verified through the shipped fanStep at an arbitrary Moon phase: perilune ~3,460 km,
     apolune ~72,300 km, rode a 100-day test without departing. Full precision load-bearing. */
  check('tut6: live NRHO constants ship at full precision',
    /NRHO_XI=384202\.149284/.test(t6) && /NRHO_V=1652\.310379/.test(t6) && /NRHO_Y=-3463/.test(t6), '');
  /* Status/banner wording is plain-language by requirement: "i don't know what you mean when you
     say a shadow just departed". No internal jargon in anything the student reads. */
  check('tut6: halo status names the objects in plain language',
    /still there \(1 exact \+ 2 off by 5 m\/s\)/.test(t6) && /NRHO: '\+\(nrho\?'still going':'gone'\)/.test(t6), '');
  { const ui = [...t6.matchAll(/(?:banner\(|FAN_MODE_NOTE|FAN_MSG)[\s\S]{0,2200}?/g)].map(m=>m[0]).join(' ');
    check('tut6: no "shadow"/"manifold" jargon in student-facing halo text',
      !/shadow(s)? (just )?depart|two branches of the unstable manifold/i.test(
        t6.replace(/\/\*[\s\S]*?\*\//g,'')), 'found jargon outside comments'); } }

console.log('\nresponsive layout');
for (const f of SIMS) {
  const html = fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
  const m = /#app\{[^}]*grid-template-columns:([^;]*);/.exec(html);
  if (!m) continue;
  const fixedSide = /(^|\s)\d{3,}px/.test(m[1]);
  check(f + ': side columns are viewport-aware (clamp), not fixed px',
    !fixedSide || /clamp\(/.test(m[1]), 'columns = ' + m[1].trim());
}

console.log('\nflex-label layout');
for (const f of SIMS) {
  const html = fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
  if (!/label\.chk\{[^}]*display:flex/.test(html)) continue;
  const bad = [];
  for (const m of html.matchAll(/<label class="chk"[^>]*>([\s\S]*?)<\/label>/g)) {
    const rest = m[1].replace(/^\s*<input[^>]*>/, '').trim();
    if (!rest) continue;
    // One wrapper element spanning the whole caption is the only safe shape.
    const wrapped = /^<(span|div)\b[^>]*>[\s\S]*<\/\1>$/.test(rest);
    if (!wrapped) bad.push(rest.slice(0, 70).replace(/\s+/g, ' '));
  }
  check(f + ': flex .chk captions are wrapped in one element',
    bad.length === 0, bad.join('\n         '));
}

console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + pass + ' checks)');
process.exit(fail === 0 ? 0 : 1);
