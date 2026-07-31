/* tut6-views.test.js — view state must survive scenario and fan-mode transitions.

   WHY THIS EXISTS
   The L1-force and L1-halo view presets zoomed all four frames in (R = 240,000 / 170,000 vs the
   default D_EM*1.9 = 730,360) — and resetView() restored angles and target but NOT R. Visit either
   preset once and every coordinate view in every other scenario stayed zoomed into a tiny patch of
   mostly-empty space: "it seems to have broken the coordinate views. did you test it?"

   The honest answer was no: the halo work was tested for physics (release, integration, lifetimes)
   and for boot, but nothing exercised TRANSITIONS — preset in, preset out, what state is left
   behind. This file drives the real shipped functions through those transitions. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

/* ---- minimal DOM + real three.js (renderer stubbed), same recipe as the halo verification ---- */
const mk = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  textContent: '', innerHTML: '', value: '0', checked: false, children: [],
  appendChild(c) { return c; }, addEventListener() {}, setAttribute() {}, getAttribute: () => null,
  querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ width: 800, height: 600 }),
  getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }),
  width: 800, height: 600, clientWidth: 800, clientHeight: 600, prepend() {}, remove() {} });
const doc = { getElementById: () => mk(), createElement: () => mk(), createElementNS: () => mk(),
  createTextNode: t => ({ textContent: t }), querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, body: mk() };
const g = { document: doc, requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {},
  setInterval: () => 0, clearInterval() {}, addEventListener() {}, removeEventListener() {},
  innerWidth: 1400, innerHeight: 900, devicePixelRatio: 1,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { search: '', href: '' }, navigator: { userAgent: 'node' },
  performance: { now: () => Date.now() },
  Image: function () { return { set src(v) {}, addEventListener() {}, setAttribute() {}, removeAttribute() {} }; },
  fetch: () => Promise.reject(new Error('x')), console, Math, JSON, Date, Object, Array, Number,
  String, Boolean, isFinite, isNaN, parseFloat, parseInt, Float32Array, Uint8ClampedArray,
  Uint8Array, alert() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }) };
vm.createContext(g); g.window = g; g.self = g; g.globalThis = g;
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'vendor', 'three.min.js'), 'utf8'), g, { filename: 'three' });
g.THREE.WebGLRenderer = function () { return { domElement: mk(), setSize() {}, setPixelRatio() {},
  setViewport() {}, setScissor() {}, setScissorTest() {}, setClearColor() {}, render() {},
  getContext: () => ({}), capabilities: { getMaxAnisotropy: () => 16 }, shadowMap: {}, dispose() {} }; };
for (const f of ['winpix.js', 'textures.js', 'sliders.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', f), 'utf8'), g, { filename: f });
const html = fs.readFileSync(path.join(ROOT, 'public', 'tut6.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
vm.runInContext(script + `
;globalThis.T6={ scenario, setFanMode, setFrame, views, FRAMES, D_EM, releaseFan, fan, loop,
  get simT(){return simT}, set simT(v){simT=v}, get warp(){return warp}, set warp(v){warp=v},
  get scen(){return scen}, get fanMode(){return fanMode} };`, g, { filename: 'tut6-inline' });
const T = g.T6;
const DEF_R = T.D_EM * 1.9;
const allR = () => T.FRAMES.map(f => Math.round(T.views[f].R));
const allDefault = () => T.FRAMES.every(f => Math.abs(T.views[f].R - DEF_R) < 1 &&
  T.views[f].target.length() < 1);

console.log('module 6 — view state across scenario/mode transitions\n');

/* 1. the default state */
check('boot: all four frames at the default zoom and origin target', allDefault(), allR().join(','));

/* 2. the force preset applies... */
T.scenario('force');
check('force scenario: close-up preset actually applies (R=240,000, Moon-centered target)',
  T.FRAMES.every(f => Math.abs(T.views[f].R - 240000) < 1 && T.views[f].target.x > 300000),
  allR().join(','));

/* 3. ...and leaving the scenario hands the default view back — THE bug */
T.scenario('lpts');
check('leaving force: every frame back to default zoom (R leaked before this test existed)',
  allDefault(), allR().join(','));

/* 4. same discipline for the halo fan mode */
T.scenario('fan');
T.setFanMode('halo');
check('halo mode: preset applies (R=170,000, L1 target, tilted)',
  T.FRAMES.every(f => Math.abs(T.views[f].R - 170000) < 1 && Math.abs(T.views[f].ph - 0.62) < 1e-9),
  allR().join(','));
T.setFanMode('scatter');
check('leaving halo for another fan mode: default view restored', allDefault(), allR().join(','));

/* 5. halo -> different scenario entirely */
T.setFanMode('halo');
T.scenario('tess');
check('halo then a different scenario: default view restored', allDefault(), allR().join(','));

/* 6. transitions must not corrupt the release machinery */
T.scenario('fan'); T.setFanMode('halo'); T.releaseFan();
check('after all that, a halo release still produces its 4 objects',
  T.fan.filter(p => p._on).length === 4, T.fan.filter(p => p._on).length + ' on');

/* ---------------------------------------------------------------- RUN THE CLOCK
   The halo pacing cap limits the frame's time step. The first version capped only the simT
   increment while the fan integrator still used the raw `warp*wall`, so the objects integrated
   further than the clock advanced, ran ahead of the Moon and diverged: "the moment I click Release
   for the L1 halo fan option, it dies… it says 'After NaN days'".

   Boot tests cannot see this — the divergence needs FRAMES to accumulate. So drive the real loop
   at the highest warp on the ladder, which is exactly where the cap engages hardest. */
console.log('\nclock: run the loop after a halo release (this is where NaN appeared)');
T.scenario('fan'); T.setFanMode('halo'); T.warp = 2592000;   // top rung: 30 d/s, cap fully engaged
T.releaseFan();
const t0 = T.simT;
/* Seed the frame clock from the SAME source the sim reads (performance.now), then step it like
   rAF does. Starting ts at an arbitrary small number makes (ts - last) hugely negative, which is a
   harness artifact — not the product bug — and would mask or fake the very NaN we are hunting. */
let ts = g.performance.now();
for (let i = 0; i < 240; i++) { ts += 16; T.loop(ts); }      // ~4 s of wall clock
check('simT stays finite with the pacing cap engaged', Number.isFinite(T.simT), 'simT = ' + T.simT);
check('elapsed mission time is a real number (the "NaN days" readout)',
  Number.isFinite(T.simT - t0) && T.simT - t0 > 0, 'elapsed = ' + (T.simT - t0));
const states = T.fan.filter(p => p._on && p.st);
check('every released object still has a finite state vector',
  states.length > 0 && states.every(p => p.st.every(Number.isFinite)),
  states.map(p => p.st.map(v => Math.round(v)).join(',')).join(' | ').slice(0, 120));
check('the cap actually slowed the clock (≤2 d/s, not 30 d/s)',
  (T.simT - t0) < 2.5 * 4, 'advanced ' + (T.simT - t0).toFixed(2) + ' days in ~4 s of wall clock');

/* ------------------------------------------------------------ MODE TABLE COMPLETENESS
   The NaN came from ONE missing key: FAN_WARP had no 'halo', so releaseFan() assigned
   warp=undefined. Every fan mode is looked up in five separate tables; a mode registered in four
   of them is a live crash. Derive the mode list from the BUTTONS (what a user can actually click)
   and require every table to cover it — this catches the next half-registered mode automatically. */
console.log('\nfan-mode tables are complete for every clickable mode');
{ const modes = [...html.matchAll(/data-mode="(\w+)"/g)].map(m => m[1]);
  check('found the fan-mode buttons', modes.length >= 7, modes.join(','));
  for (const tbl of ['FAN_WARP', 'FAN_MODE_LBL', 'FAN_METRIC_LBL', 'FAN_MODE_NOTE', 'FAN_MSG']) {
    const i = script.indexOf('const ' + tbl + '=');
    const body = i < 0 ? '' : script.slice(i, script.indexOf('\n};', i) > 0
      ? Math.min(script.indexOf('\n};', i), i + 6000) : i + 6000);
    const missing = modes.filter(m => !new RegExp('[{,\\s]' + m + '\\s*:').test(body));
    check(tbl + ' covers every mode', i >= 0 && missing.length === 0,
      i < 0 ? 'table not found' : 'missing: ' + missing.join(', '));
  }
  /* And the defensive fallback, so a miss degrades instead of poisoning the clock with NaN. */
  check('releaseFan cannot assign an undefined warp',
    /warp=FAN_WARP\[fanMode\] \?\? \d+/.test(script), 'needs a ?? fallback');
}

console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + pass + ' checks)');
process.exit(fail === 0 ? 0 : 1);
