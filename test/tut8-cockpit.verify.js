#!/usr/bin/env node
/* tut8-cockpit.verify.js — HEADLESS COCKPIT HARNESS for Module 8.
   Run from the repo root:  node test/tut8-cockpit.verify.js

   Boots the REAL inline script from public/tut8.html against DOM/canvas stubs, loads a plan through
   the real planner path, engages 🤖 AUTO FLY, and flies both missions frame-by-frame to completion.

   Why this exists: the render loop wraps everything in try/catch and logs once, so a thrown error
   silently blanks the instruments and freezes the mission — exactly the failure mode that shipped
   during the display-frame refactor (a dropped `cp` definition threw on every frame). This harness
   surfaces those, plus autopilot pathologies that only appear over a whole flight (burns restarting
   every frame, station-keeping draining the tank, cues re-arming forever).

   Two details matter for fidelity:
     • ONE clock. rAF timestamps and performance.now() must share a timebase, or every frame trips
       the 0.25 s thrust cap and burns arrive in absurd 375 m/s bites.
     • Planner order. Open the planner BEFORE solving: the first open runs setMission(), which zeroes
       the Δv dials — solving first and opening after silently ships a zero-Δv plan.

   Expectations asserted below are the verified reference flights; update them deliberately. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* Each mission runs in its OWN process. Cockpit state is module-global by design, and leakage
   between runs is subtle and misleading (toggleAuto() is a toggle, so a second call silently
   disables the autopilot and the "flight" just sits in a burn window forever). */
const ONLY = process.argv[2];
if (!ONLY) {
  const { spawnSync } = require('child_process');
  console.log('MODULE 8 — headless cockpit flight verification\n');
  let bad = 0;
  for (const m of ['geo', 'moon']) {
    const r = spawnSync(process.execPath, [__filename, m], { encoding: 'utf8', maxBuffer: 1 << 26 });
    process.stdout.write(r.stdout.replace(/^\[thrust\].*\n/m, ''));
    if (r.stderr && r.stderr.trim()) process.stdout.write(r.stderr);
    if (r.status !== 0) bad++;
  }
  console.log(bad ? '\nFAILED — ' + bad + ' mission(s) with failing checks' : '\nALL MISSIONS PASSED');
  process.exit(bad ? 1 : 0);
}

// ----------------------------------------------------------------- DOM stubs
const noop = () => {};
const ctxStub = () => new Proxy({}, {
  get: (t, k) => {
    if (k === 'canvas') return { width: 40, height: 20 };
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
    return noop;
  }, set: () => true });
const el = (id) => ({
  id, style: {}, dataset: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop, removeEventListener: noop,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 40, height: 20, right: 40, bottom: 20 }),
  appendChild: noop, setAttribute: noop, getAttribute: () => null, remove: noop,
  getContext: () => ctxStub(),
  width: 40, height: 20, clientWidth: 40, clientHeight: 20, offsetWidth: 340, offsetHeight: 200,
  textContent: '', innerHTML: '', value: '0', checked: false, complete: true, naturalWidth: 0 });
const els = {};
global.document = {
  getElementById: (id) => els[id] || (els[id] = el(id)),
  querySelector: () => el('q'), querySelectorAll: () => [],
  createElement: (t) => el(t), addEventListener: noop, body: el('body') };
global.window = global;
global.__L = {};
global.addEventListener = (t, f) => { (global.__L[t] = global.__L[t] || []).push(f); };
global.removeEventListener = noop;
global.fire = (t, ev) => (global.__L[t] || []).forEach(f => { try { f(Object.assign({ preventDefault: noop }, ev)); } catch (e) {} });
global.devicePixelRatio = 1; global.innerWidth = 1600; global.innerHeight = 900;
global.CLK = 1000;                                  // the single shared clock
global.performance = { now: () => global.CLK };
global.localStorage = { getItem: (k) => (k === 'm7_tour' ? '1' : k === 'm7_geo_done' ? '1' : null),
                        setItem: noop, removeItem: noop };
global.Image = function () { return el('img'); };
global.getComputedStyle = () => ({ display: 'block' });
global.location = { search: '' }; global.alert = noop;
global.THREE = {}; global.Sat7 = undefined;
let rafCb = null;
global.requestAnimationFrame = (cb) => { rafCb = cb; return 1; };
global.cancelAnimationFrame = noop;

require(path.join(ROOT, 'public', 'flight8.js'));   // real physics

// ------------------------------------------------------- boot the real script
const html = fs.readFileSync(path.join(ROOT, 'public', 'tut8.html'), 'utf8');
const src = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
const EXPORTS = ';Object.assign(globalThis,{setMission,solvePlan,toggleMode,loadIntoCockpit,toggleAuto,'
  + 'getState:()=>({flying,fsT,warp,nextBurn,nBurns:planBurns.length,dvSpent,dvTotal,autoOn,'
  + 'mode:geoDispMode(),hold:holdStartT,msg:missionMsg,loiter:loiter})});';
try { new Function(src + EXPORTS)(); }
catch (e) { console.error('FAIL: tut8 inline script did not execute —', e.message); process.exit(1); }

// ------------------------------------------------------------------ fly a run
function fly(mission, maxFrames) {
  toggleMode();                 // open the planner FIRST (first open zeroes the dials)
  setMission(mission);
  solvePlan();                  // load the verified reference plan
  loadIntoCockpit();            // → hides planner, startFlight()
  if (!getState().autoOn) toggleAuto();   // 🤖 AUTO FLY (it's a toggle — never flip it off)
  const errs = [];
  const realErr = console.error;
  console.error = (...a) => errs.push(a.join(' '));
  let f = 0, modes = new Set(), loiterAt = 0;
  for (; f < maxFrames && rafCb; f++) {
    const cb = rafCb; rafCb = null; global.CLK += 16;
    try { cb(global.CLK); } catch (e) { errs.push('THROW frame ' + f + ': ' + e.message); break; }
    const st = getState();
    modes.add(st.mode);
    if (st.loiter) {                       // mission won: the pilot may loiter indefinitely
      if (!loiterAt) loiterAt = f;
      if (f - loiterAt > 1200) fire('keydown', { key: 'e' });   // ~20 s of loitering, then debrief
    }
    if (!st.flying) break;
  }
  console.error = realErr;
  return Object.assign(getState(), { frames: f, errs, modes: [...modes], loitered: loiterAt > 0 });
}

// --------------------------------------------------------------------- checks
let failed = 0;
const check = (label, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label + (detail ? '   [' + detail + ']' : ''));
  if (!cond) failed++;
};

// ---- Mission 1: GEO servicing (rendezvous with the target satellite) ----
if (ONLY === 'geo') {
  console.log('GEO servicing run (AUTO FLY):');
  const r = fly('geo', 40000);
  console.log('        ended T+' + (r.fsT / 86400).toFixed(2) + 'd · Δv ' + Math.round(r.dvSpent)
    + '/' + r.dvTotal + ' · frames ' + r.frames + ' · frames seen: ' + r.modes.join(','));
  console.log('        "' + String(r.msg).slice(0, 88) + '"');
  check('no runtime errors', r.errs.length === 0, r.errs.slice(0, 2).join(' | '));
  check('mission ended (did not hang)', !r.flying);
  check('RENDEZVOUS achieved', /ON STATION/i.test(String(r.msg)), String(r.msg).slice(0, 60));
  check('both planned burns flown', r.nextBurn >= 2, 'nextBurn=' + r.nextBurn);
  check('inside Δv budget', r.dvSpent < r.dvTotal, Math.round(r.dvSpent) + '/' + r.dvTotal);
  check('Δv within 20% of the 3,896 m/s reference', Math.abs(r.dvSpent - 3896) < 780, Math.round(r.dvSpent));
  // ECI is the standing frame for the whole GEO mission (belt-fixed stays reachable via F, but
  // nothing should switch frames on the pilot mid-flight).
  check('stayed in Earth Centered Inertial throughout', r.modes.length === 1 && r.modes[0] === 'eci', r.modes.join(','));
  check('completed under 4 days', r.fsT < 4 * 86400, (r.fsT / 86400).toFixed(2) + 'd');
}

// ---- Mission 2: lunar transfer (three burns) ----
if (ONLY === 'moon') {
  console.log('Lunar graduation flight (AUTO FLY):');
  const r = fly('moon', 40000);
  console.log('        ended T+' + (r.fsT / 86400).toFixed(2) + 'd · Δv ' + Math.round(r.dvSpent)
    + '/' + r.dvTotal + ' · frames ' + r.frames);
  console.log('        "' + String(r.msg).slice(0, 88) + '"');
  check('no runtime errors', r.errs.length === 0, r.errs.slice(0, 2).join(' | '));
  check('mission ended (did not hang)', !r.flying);
  check('CAPTURED into lunar orbit', /CAPTURED/i.test(String(r.msg)), String(r.msg).slice(0, 60));
  check('flew THREE burns (TLI, LOI, circularize)', r.nBurns === 3 && r.nextBurn >= 3,
    'nextBurn=' + r.nextBurn + '/' + r.nBurns);
  check('did NOT drain the tank', r.dvSpent < r.dvTotal * 0.85, Math.round(r.dvSpent) + '/' + r.dvTotal);
  check('Δv within 25% of the 3,771 m/s reference', Math.abs(r.dvSpent - 3771) < 943, Math.round(r.dvSpent));
  check('offered a LOITER instead of ejecting the pilot', r.loitered === true);
  check('completed under 12 days', r.fsT < 12 * 86400, (r.fsT / 86400).toFixed(2) + 'd');
}

if (failed) console.log('        ' + failed + ' check(s) failed');
process.exit(failed ? 1 : 0);
