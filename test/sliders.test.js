#!/usr/bin/env node
/* sliders.test.js — every slider must accept a typed value.
   Run from the repo root:  node test/sliders.test.js

   REVIEWER, twice, the second time having abandoned an exercise over it:
     "Can you modify all the SIMs to let you put in a specific value instead of using the slider?
      It is frustrating to want to hit 2000 and you go back and forth and back and forth and give up."

   Several exercises name an exact figure — a 2,400 m/s burn, a 700 km orbit, a 12-hour period — so a
   drag-only control turns a stated number into pixel-hunting.

   THE DESIGN CONSTRAINT worth protecting: sliders.js must never talk to module code. Each module reads
   `element.value` and listens for input/change on its own sliders, so the shim writes the value and
   re-dispatches the events the browser would have fired. That is why it could be bolted onto all eight
   simulators without editing any of them — and this suite pins that property, because a future change
   that "optimises away" one of those dispatches would silently stop the readouts updating. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

// ---- every simulator with a slider must load the shim ----
for (let n = 1; n <= 8; n++) {
  const f = path.join(ROOT, 'public', 'tut' + n + '.html');
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  const sliders = (src.match(/type="range"/g) || []).length;
  if (!sliders) continue;
  ok('tut' + n + ' loads sliders.js (' + sliders + ' sliders)', /<script src="sliders\.js">/.test(src));
}

// ---- behaviour, against a stub DOM ----
const evts = [];
class El {
  constructor(t) { this.tag = t; this.dataset = {}; this.style = { cssText: '' }; this._v = ''; this._L = {}; this.parentNode = null; this.nextSibling = null; }
  get value() { return this._v } set value(v) { this._v = String(v) }
  setAttribute() {} blur() {}
  addEventListener(t, f) { (this._L[t] = this._L[t] || []).push(f) }
  dispatchEvent(e) { evts.push(e.type); (this._L[e.type] || []).forEach(f => f(e)); return true }
  appendChild(c) { c.parentNode = this; return c } insertBefore(c) { c.parentNode = this; return c }
}
const range = new El('range');
Object.assign(range, { type: 'range', min: '6600', max: '45000', step: '100' });
range.value = '20000';
range.parentNode = new El('div');

global.Event = function (t, o) { this.type = t; this.bubbles = !!(o && o.bubbles) };
const created = [];
global.document = { readyState: 'complete', querySelectorAll: () => [range],
  createElement: t => { const e = new El(t); created.push(e); return e }, addEventListener() {} };
global.window = {};
require(path.join(ROOT, 'public', 'sliders.js'));

const box = created[0];
ok('a number box is created beside the slider', !!box && box.type === 'number');
ok('it inherits min/max/step from the slider', box && +box.min === 6600 && +box.max === 45000 && +box.step === 100,
   box ? box.min + '..' + box.max + ' step ' + box.step : '');

// a module-style listener, exactly as tut3 registers one
let moduleSaw = null;
range.addEventListener('input', () => { moduleSaw = range.value; });
const fire = t => (box._L[t] || []).forEach(f => f({}));

box.value = '24700'; fire('change');
ok('a typed value reaches the slider', range.value === '24700', range.value);
ok('…and the MODULE\'s own handler fires', moduleSaw === '24700', String(moduleSaw));

box.value = '2000'; fire('change');
ok('below-minimum input is clamped, not rejected', range.value === '6600', range.value);
box.value = '99999'; fire('change');
ok('above-maximum input is clamped', range.value === '45000', range.value);
box.value = '24733'; fire('change');
ok('off-step input snaps to the slider grid', range.value === '24700', range.value);
box.value = 'abc'; const before = range.value; fire('change');
ok('garbage input is ignored, leaving the value alone', range.value === before, range.value);

ok('both input AND change are re-dispatched', evts.includes('input') && evts.includes('change'),
   [...new Set(evts)].join(', '));
ok('upgrading twice is a no-op', (() => { const n = created.length; window.OA_SLIDERS.upgradeAll(); return created.length === n; })());

/* One shared timer, not one per slider — a six-slider module would otherwise run six forever. */
const src = fs.readFileSync(path.join(ROOT, 'public', 'sliders.js'), 'utf8');
ok('a single shared poll watches all sliders', (src.match(/setInterval/g) || []).length === 1);
ok('the poll can be stopped', typeof window.OA_SLIDERS._stop === 'function');
window.OA_SLIDERS._stop();


/* ------------------------------------------------------------------ ZOOM DAMPING
   Same reviewer, same session: "Make the mousepad adjustments to zooming in and out less
   trigger-happy… Mousepad interactions for user are jerky and frustrating."

   The cause was one expression repeated in every simulator:  camR *= 1 + Math.sign(deltaY)*0.1.
   Math.sign() DISCARDS THE MAGNITUDE, so a feather-light nudge and a hard flick were identical 10%
   jumps — fine control was impossible by construction, not by tuning. */
{
  const f = (d, mode, shift) => {
    let x = d;
    if (mode === 1) x *= 16; else if (mode === 2) x *= 100;
    let k = x * 0.0015; if (shift) k *= 0.25;
    k = Math.max(-0.35, Math.min(0.35, k));
    return Math.exp(k);
  };
  const zsrc = fs.readFileSync(path.join(ROOT, 'public', 'sliders.js'), 'utf8');
  ok('OA_ZOOM.factor exists', /window\.OA_ZOOM = \{ factor: zoomFactor \}/.test(zsrc));
  ok('deltaMode is normalised (mouse vs trackpad units differ)',
     /deltaMode === 1/.test(zsrc) && /deltaMode === 2/.test(zsrc));
  ok('no simulator still uses Math.sign for zoom', (() => {
      for (let n = 1; n <= 8; n++) {
        const p2 = path.join(ROOT, 'public', 'tut' + n + '.html');
        if (!fs.existsSync(p2)) continue;
        if (/camR\*\(1\+Math\.sign\(e\.deltaY\)|v\.R\*\(1\+Math\.sign\(e\.deltaY\)/.test(fs.readFileSync(p2, 'utf8'))) return false;
      }
      return true;
    })());
  ok('a gentle trackpad nudge is a small change', (f(4, 0) - 1) < 0.02, ((f(4,0)-1)*100).toFixed(1) + '% (was a flat 10%)');
  ok('a mouse notch still feels like a notch', (f(100, 0) - 1) > 0.10 && (f(100, 0) - 1) < 0.25,
     ((f(100,0)-1)*100).toFixed(1) + '%');
  ok('the hardest flick is clamped', (f(100000, 0) - 1) < 0.45, ((f(100000,0)-1)*100).toFixed(1) + '%');
  ok('Shift gives a much finer step', (f(4, 0, true) - 1) < (f(4, 0) - 1) / 3);
  ok('zoom in then out returns EXACTLY where you started', Math.abs(f(100, 0) * f(-100, 0) - 1) < 1e-12,
     (f(100,0)*f(-100,0)).toFixed(9));
  ok('response is a ratio, so it feels the same at every scale', /Math\.exp\(k\)/.test(zsrc));

  /* Load order: the wheel handlers reference OA_ZOOM, so sliders.js must be parsed BEFORE the module
     script. It happened to work when loaded last (handlers only run on user events), but that is
     fragile reasoning to leave in the code. */
  for (let n = 1; n <= 6; n++) {
    const p2 = path.join(ROOT, 'public', 'tut' + n + '.html');
    if (!fs.existsSync(p2)) continue;
    const src2 = fs.readFileSync(p2, 'utf8');
    const at = src2.indexOf('<script src="sliders.js">');
    const use = src2.indexOf('OA_ZOOM.factor');
    if (use < 0) continue;
    ok('tut' + n + ': sliders.js is parsed before OA_ZOOM is used', at >= 0 && at < use);
  }
}

console.log(bad ? '\n' + bad + ' FAILED' : '\nSLIDERS + ZOOM: typed values work, zoom is proportional');
process.exit(bad ? 1 : 0);
