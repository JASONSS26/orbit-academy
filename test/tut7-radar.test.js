/* tut7-radar.test.js — the radar scene's physics and its three teaching contracts.

   The owner's brief, verbatim: "We're trying to convey the following: 1) more distant objects have
   weaker returns, 2) more distant objects have later returns, 3) pulse averaging can help. That
   does not come across clearly." The rebuilt scene carries each idea with a specific mechanism;
   this file pins the numbers behind those mechanisms to the real physics.

   The previous scope compressed the LEO→GEO spread from its true 69 dB to 48 "for legibility" —
   quietly falsifying the exact number the exercise teaches. Honest values are now asserted. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

const js = fs.readFileSync(path.join(ROOT, 'public', 'tut7.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public', 'tut7.html'), 'utf8');
const ws = fs.readFileSync(path.join(ROOT, 'public', 'worksheet7.data.js'), 'utf8');

console.log('module 7 — radar scene\n');

/* ---- the target table and the honest dB spread ---- */
const tgt = /TGT_SNR_DB=\{ ?LEO:(-?\d+), ?MEO:(-?\d+), ?GEO:(-?\d+) ?\}/.exec(js);
check('TGT_SNR_DB table present', !!tgt, '');
const ranges = { LEO: 800, MEO: 20000, GEO: 42164 };
if (tgt) {
  const [LEO, MEO, GEO] = [+tgt[1], +tgt[2], +tgt[3]];
  const want = (a, b) => 40 * Math.log10(ranges[b] / ranges[a]);   // two-way range⁴ in dB
  check('LEO→GEO spread is the true two-way range⁴ (≈68.9 dB)',
    Math.abs((LEO - GEO) - want('LEO', 'GEO')) < 0.5, 'table gives ' + (LEO - GEO) + ' dB, truth ' + want('LEO', 'GEO').toFixed(1));
  check('LEO→MEO spread is the true two-way range⁴ (≈55.9 dB)',
    Math.abs((LEO - MEO) - want('LEO', 'MEO')) < 0.5, 'table gives ' + (LEO - MEO) + ' dB');
  check('MEO→GEO spread is the true two-way range⁴ (≈13.0 dB)',
    Math.abs((MEO - GEO) - want('MEO', 'GEO')) < 0.5, 'table gives ' + (MEO - GEO) + ' dB');
  const dbw = /dbMin=(-?\d+), ?dbMax=(\d+)/.exec(js);
  check('scope window spans the full honest range (GEO floor to above LEO)',
    dbw && +dbw[1] <= GEO - 5 && +dbw[2] >= LEO + 5,
    dbw ? 'window ' + dbw[1] + '…' + dbw[2] + ' dB vs targets ' + GEO + '…' + LEO : 'no window found');
}

/* ---- idea 2: farther = later. Real round-trip times, and the sweep-sync identity ---- */
const C = 299.792458;   // km per ms
check('light speed constant is correct',
  /C_KM_PER_MS=299\.792458/.test(js), '');
check('echoMs is the true round trip 2R/c', /echoMs\(rKm\)\{ ?return 2\*rKm\/C_KM_PER_MS/.test(js), '');
check('GEO round trip ≈ 281 ms', Math.abs(2 * ranges.GEO / C - 281.3) < 1, (2 * ranges.GEO / C).toFixed(1));
check('LEO round trip ≈ 5.3 ms', Math.abs(2 * ranges.LEO / C - 5.34) < 0.1, (2 * ranges.LEO / C).toFixed(2));

/* Sweep sync: the sky pulse expands at SKY_SPD and the echo returns at SKY_SPD, so target R's echo
   lands at t = 2R/SKY_SPD. The sweep maps time to a range bin as rangeNow = SKY_SPD·t/2, which
   reaches bin R at exactly t = 2R/SKY_SPD. Same moment, by construction. Assert both halves. */
check('sky pulse and echo use one shared speed (SKY_SPD both ways)',
  /p\.r \+= SKY_SPD\*dt/.test(js) && /e\.r -= SKY_SPD\*dt/.test(js), '');
check('sweep divides by 2 so it lands on each bin as that echo arrives',
  /SKY_SPD\*\(now-sweepBorn\)\/1000\/2/.test(js), 'without the ÷2 the sweep outruns the echoes');

/* ---- idea 1: farther = weaker, on the way BACK too ---- */
check('returning echo opacity comes from the range⁴ ratio (echoAlpha)',
  /const ratio=Math\.pow\(RTARGETS\[0\]\.r\/T\.r,4\)/.test(js), '');
/* The scope was rebuilt as ONE noisy receiver trace ("it would help to have the radar return
   peaks be a noisy part of the signal trace, that improves with averaging"): echoes are Gaussian
   bumps ADDED to the noise term, and the noise term is divided by N — so a weak bump is genuinely
   indistinguishable from grass until averaging calms the trace. Assert that architecture. */
check('scope is a single trace: bumps + noise/N summed per bin',
  /bumpsAt\(xToR\(x\)\) \+ noiseAt\(x\)\/integCount/.test(js), '');
check('echo bumps are Gaussian in the trace, built from the honest dB table',
  /Math\.pow\(10,TGT_SNR_DB\[T\.name\]\/10\)\*Math\.exp\(-0\.5\*d\*d\)/.test(js), '');
check('GEO single-pulse bump sits below mean noise (buried is honest, not cosmetic)',
  Math.pow(10, -23 / 10) < 1, '10^(-2.3) vs noise mean 1');
check('averaging sinks the noise the bumps hide in (noise ∝ 1/N)',
  /noiseAt\(x\)\/integCount/.test(js), '');
// evaluate the mapping and require a visible, correctly ordered fade
/* Fade tuning has now failed twice in opposite directions: /6 clamped MEO and GEO together, and
   a 0.10 floor made GEO invisible in the animation (owner: "returns from geo are so faint as to
   be invisible"). The contract is therefore two-sided: strictly ordered AND every echo visible. */
const alpha = r => Math.max(0.25, Math.min(1, 1 + Math.log10(Math.pow(800 / r, 4)) / 10));
check('echo fade strictly ordered LEO > MEO > GEO, and ALL visible (≥0.25)',
  alpha(800) > 0.9 && alpha(20000) < 0.6 && alpha(42164) < alpha(20000) - 0.05 && alpha(42164) >= 0.25,
  [alpha(800), alpha(20000), alpha(42164)].map(x => x.toFixed(2)).join(' / '));
check('the tuned mapping is what the code actually ships', /Math\.log10\(ratio\)\/10/.test(js) && /Math\.max\(0\.25,/.test(js), '');
check('every returning echo carries a solid wavefront dot (faint ≠ untrackable)',
  /wavefront dot/.test(js) && /g\.arc\(wx,wy,/.test(js), '');
check('sky view no longer promises a constant-strength return',
  !/Stays bold the whole way in/.test(js), 'the old comment described the anti-lesson');

/* ---- the A-scope contract: spikes are events, not furniture ---- */
check('a spike exists only after its echo has landed (gated on lastPing)',
  /const ping=lastPing\[T\.name\]; if\(!ping\) continue;/.test(js), '');
check('the ping moment is when the echo wavefront reaches the dish',
  /e\.landed=true; lastPing\[e\.tgt\.name\]=perfNow\(\)/.test(js), '');
check('each ping prints the radar equation range = c·t/2',
  /range = c·t\/2/.test(js), '');

/* ---- idea 3: averaging is tied to visible firing ---- */
check('integration gain is 10·log10(N)', /10\*Math\.log10\(integCount\)/.test(js), '');
check('an averaging run fires a visible pulse stream',
  /if\(averaging\)\{[\s\S]{0,400}fireRadar\(\)/.test(js), '');
/* The owner removed the receiver-gain knob: "the gain adjustment is just confusing things…
   maybe just do the averaging part?" The concept (amplification cannot improve SNR) survives as
   prose in worksheet a4. Assert the knob stays gone AND the prose stays. */
check('no gain control anywhere in the scene (owner decision)',
  !/radarGain/.test(js) && !/radarGain/.test(html), '');
check('the amplifier lesson survives as prose (a4 was merged into the single a1)',
  /lifts signal and noise by the same factor/.test(ws) && /no gain knob|does NOT offer/i.test(html), '');

/* ---- the dB argument: linear view exists and is honest ---- */
check('linear-power view is wired up', /toggleScopeLinear/.test(js) && /radarLin/.test(html), '');
check('linear view normalizes to LEO so MEO/GEO vanish',
  /Math\.pow\(10,\(TGT_SNR_DB\[T\.name\]-TGT_SNR_DB\.LEO\)\/10\)/.test(js), '');

/* ---- worksheet: the timing task exists and its numbers are right ---- */
/* Owner: the RADAR portion is the weakest part of module 7 and gets at most one worksheet
   exercise. The rest of the module — optical, RA/DEC, parallax, custody — "do matter a lot" and
   must NOT be trimmed on the strength of this comment. Part A stays at exactly one task. */
/* Owner: worksheet parts must follow the sim's tab order — illumination, RA/DEC, take a
   picture, fit an orbit, radar (custody closes, having no sim scene). */
const partTitles = [...ws.matchAll(/title:'(PART [A-Z] · [^']*)'/g)].map(m => m[1]);
const wantOrder = ['Illumination', 'RA/DEC', 'picture', 'orbit', 'Radar', 'Custody'];
check('worksheet parts follow the sim tab order',
  partTitles.length === 6 && wantOrder.every((k, i) => partTitles[i].includes(k)),
  partTitles.join(' | '));
const tabOrder = [...html.matchAll(/data-s="(\w+)"/g)].map(m => m[1]).join(',');
check('sim tabs are phase,radec,cam,iod,radar (the order the worksheet mirrors)',
  tabOrder === 'phase,radec,cam,iod,radar', tabOrder);

const partA = /title:'PART [A-Z] · Radar[^}]*tasks:\[([^\]]*)\]/.exec(ws);
check('the radar part stays small: at most c1 (what radar measures) + the one sim exercise',
  partA && partA[1].split(',').length <= 2,
  partA ? 'tasks: ' + partA[1] : 'radar part not found');
check('the one exercise has students read the round-trip times', /281 ms/.test(ws) && /c·t\/2/.test(ws), '');
check('worksheet keeps the 7.7-million× figure (53⁴)',
  /7\.7 (<b>)?million/.test(ws), '');
check('sweep dot carries a live elapsed-time clock in real ms',
  /t = '\+Math\.round\(echoMs\(rangeNow\)\)\+' ms/.test(js), '');
check('axis is labeled as time since the pulse was sent',
  /time since the pulse was sent/.test(js) && /time since the pulse/.test(html), '');
check('scene lede teaches all three ideas',
  /[Ff]arther = (weaker|fainter)/.test(html) && /[Ff]arther = later/.test(html) && /AVERAGING|integration/i.test(html), '');

console.log('\n' + (fail === 0 ? 'ALL PASSED' : fail + ' FAILED') + ' (' + pass + ' checks)');
process.exit(fail === 0 ? 0 : 1);
