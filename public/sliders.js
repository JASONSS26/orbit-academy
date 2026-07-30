/* sliders.js — give every range slider a typeable number box, and a finer wheel.

   WHY THIS EXISTS
   The first external reviewer raised this twice, and gave up on an exercise because of it:

     "Can you modify all the SIMs to let you put in a specific value instead of using the slider?
      It is hard to get to these requested values and it is frustrating to want to hit 2000 and you
      go back and forth and back and forth and give up getting to exactly 2000."

   Several worksheet exercises name an exact figure — a 2,400 m/s burn, a 700 km orbit, a 12-hour
   period — and a drag-only slider makes those a game of pixel-hunting. A typed value is the natural
   input for a number the text has already given you.

   HOW IT WORKS, and why it is safe to bolt onto every module
   Each module's own code reads `element.value` and listens for `input`/`change` on the slider. So
   this script never talks to module code directly: it writes the slider's value and re-dispatches
   the same events the browser would have fired. Everything downstream — readouts, redraws, physics —
   runs exactly as if the user had dragged. No module needed editing.

   Include it once, after the module's own script tag:  <script src="sliders.js"></script>

   Also fixes a second complaint — "make the mousepad adjustments to zooming in and out less
   trigger-happy. Once you are zoomed in and want small adjustments, make that easy to do." Holding
   Shift while scrolling over a slider gives tenth-steps for fine trimming. (Canvas zoom damping is
   handled separately, inside each simulator's own wheel handler.) */
'use strict';
(function () {

  /* Every upgraded slider, watched by ONE timer (started on first upgrade). */
  const watched = [];
  let poll = null;
  function startPoll() {
    if (poll) return;
    poll = setInterval(() => {
      for (const w of watched) {
        if (w.range.value !== w.last) { w.last = w.range.value; w.sync(); }
      }
    }, 200);
  }

  function decimals(step) {
    const s = String(step);
    return s.indexOf('.') >= 0 ? s.length - s.indexOf('.') - 1 : 0;
  }

  function upgrade(range) {
    if (range.dataset.numboxed) return;              // idempotent — safe if included twice
    range.dataset.numboxed = '1';

    const min  = range.min  !== '' ? +range.min  : 0;
    const max  = range.max  !== '' ? +range.max  : 100;
    const step = range.step !== '' && range.step !== 'any' ? +range.step : 1;
    const dp   = decimals(step);

    const box = document.createElement('input');
    box.type = 'number';
    box.min = min; box.max = max; box.step = step;
    box.value = (+range.value).toFixed(dp);
    box.className = 'numbox';
    box.setAttribute('aria-label', 'type an exact value');
    box.title = 'Type an exact value and press Enter';
    box.style.cssText =
      'width:7.2em;margin-left:8px;padding:3px 6px;font-family:inherit;font-size:14px;' +
      'background:#0a1526;color:#cfe3ff;border:1px solid #2b5686;border-radius:6px;vertical-align:middle';

    /* Sit the box right after the slider. Modules lay sliders out in their own containers, so append
       to the slider's parent rather than assuming any particular structure. */
    if (range.nextSibling) range.parentNode.insertBefore(box, range.nextSibling);
    else range.parentNode.appendChild(box);

    const clamp = v => Math.min(max, Math.max(min, v));

    /* Typed value -> slider. Re-dispatch BOTH events: modules variously listen for one or the other,
       and the browser fires both when a user drags. */
    function push(commit) {
      let v = parseFloat(box.value);
      if (!isFinite(v)) return;
      v = clamp(v);
      // Snap to the slider's step so the widget and the value never disagree.
      if (step > 0) v = min + Math.round((v - min) / step) * step;
      v = clamp(v);
      range.value = v;
      range.dispatchEvent(new Event('input',  { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      if (commit) box.value = (+range.value).toFixed(dp);
    }
    box.addEventListener('input', () => push(false));
    box.addEventListener('change', () => push(true));
    box.addEventListener('keydown', e => { if (e.key === 'Enter') { push(true); box.blur(); } });

    // Slider -> box, including programmatic changes made by presets and "reset" buttons.
    const sync = () => { box.value = (+range.value).toFixed(dp); };
    range.addEventListener('input', sync);
    range.addEventListener('change', sync);

    /* Presets set .value directly without firing an event, so the box has to be re-synced somehow.
       One SHARED poll for the whole page (see below) rather than one timer per slider — a module with
       six sliders would otherwise run six timers forever to watch six variables. */
    watched.push({ range: range, sync: sync, last: range.value });

    /* Wheel over the slider nudges it. Shift = tenth-steps, for the "I want exactly 2000" case. */
    range.addEventListener('wheel', e => {
      e.preventDefault();
      const fine = e.shiftKey ? 0.1 : 1;
      const dir  = e.deltaY < 0 ? 1 : -1;
      range.value = clamp(+range.value + dir * step * fine);
      range.dispatchEvent(new Event('input',  { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    }, { passive: false });
  }

  function upgradeAll() {
    document.querySelectorAll('input[type="range"]').forEach(upgrade);
    if (watched.length) startPoll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', upgradeAll);
  else upgradeAll();

  // Modules that build controls later can re-run this; it skips anything already done.

  /* ------------------------------------------------------------------ ZOOM DAMPING
     Reviewer, twice: "Make the mousepad adjustments to zooming in and out less trigger-happy. Once
     you are zoomed in and want small adjustments, make that easy to do." / "Mousepad interactions
     for user are jerky and frustrating."

     THE CAUSE was the same expression in every simulator:

         camR *= 1 + Math.sign(e.deltaY) * 0.1

     Math.sign() DISCARDS THE MAGNITUDE. A feather-light two-finger nudge and a hard flick both
     produce an identical 10% jump, so fine control was impossible by construction — the input was
     being thrown away before it was used.

     This replaces it with a proportional response:
       • deltaY is normalised across deltaMode (0 = pixels, 1 = lines, 2 = pages), because a mouse
         wheel and a trackpad report in completely different units;
       • the response is exponential in the (clamped) delta, so zooming feels the same at every
         scale — one "notch" is always the same RATIO, never the same number of km;
       • Shift gives quarter-speed for the last bit of precision;
       • the clamp stops one violent flick from crossing the whole range.

     Typical results: a gentle trackpad event (|delta| ≈ 4) moves ~0.6%; a mouse notch (|delta| ≈ 100)
     moves ~16%; the hardest possible flick is capped at 42%. */
  function zoomFactor(e, opts) {
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;          // lines  -> approx pixels
    else if (e.deltaMode === 2) d *= 100;    // pages  -> approx pixels
    let k = d * 0.0015 * ((opts && opts.gain) || 1);
    if (e.shiftKey) k *= 0.25;               // fine trim
    k = Math.max(-0.35, Math.min(0.35, k));  // one flick can never cross the range
    return Math.exp(k);
  }
  window.OA_ZOOM = { factor: zoomFactor };

  window.OA_SLIDERS = { upgradeAll: upgradeAll,
    /* for tests and teardown: stop the shared poll */
    _stop: function () { if (poll) { clearInterval(poll); poll = null; } } };
})();
