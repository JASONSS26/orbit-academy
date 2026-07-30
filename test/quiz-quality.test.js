#!/usr/bin/env node
/* quiz-quality.test.js — the quizzes must actually test something.
   Run from the repo root:  node test/quiz-quality.test.js

   FOUND BY THE FIRST EXTERNAL REVIEWER, not by us:
     "A lazy student could choose the longest answer in all the quizzes and get them all right.
      The wrong answers are always short, and the right answers are always long."

   Measured when that was reported: the longest-option heuristic scored 185/201 = 92% across all eight
   worksheets, with modules 4 and 5 at a clean 100%. Chance is 25% and the pass mark is 70% — so a
   student who read nothing and always clicked the longest option passed every module and collected the
   certificate. The option shuffle in worksheet-engine v1.5 is no defence: the tell is LENGTH, not
   position.

   The cause is natural and worth naming, because it will creep back: a correct answer gets written
   carefully, with its caveats and units, while distractors get dashed off. The cure is to write
   distractors that are as specific as the truth — which also makes them teach, since a good wrong
   answer encodes a real misconception.

   This test is a RATCHET, not a pass/fail line in the sand. THRESHOLD starts loose enough to document
   today's reality and should be tightened as each module is repaired. Lower it; never raise it. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

/* TWO METRICS, AND WHY — read this before adjusting anything.

   The first version counted a question as beatable whenever the correct option was the longest, by
   ANY margin. That was right when gaps were 40-150 characters. It stops being right once a module is
   repaired: balanced options end up within a few characters of each other, and a 2-character "win"
   is not a signal a human can act on. Continuing to score those as beatable would understate the
   repair; scoring them as safe would overstate it. So report BOTH and be explicit:

     strict   — correct option is longest by any margin, ties broken by position (the original)
     clear    — correct option is longest by MORE THAN MARGIN characters, i.e. actually spottable

   The gate uses `clear`, because that is the exploitable case. `strict` is printed alongside so the
   softer number can never quietly hide a regression. Note the goal is BALANCE, not inversion: making
   correct answers reliably SHORTER would just flip the tell and score perfectly on both metrics. */
const MARGIN = 10;                       // characters — roughly two words, the point it becomes visible

/* Ceilings on the `clear` metric. Tighten as each worksheet is repaired; never loosen. */
const THRESHOLD = { 1: 0.20, 2: 0.90, 3: 0.95, 4: 0.10, 5: 0.30, 6: 0.15, 7: 0.90, 8: 0.15 };
/* Worksheet 1 repaired: 77% -> 15%, below the 25% chance line. Its ceiling drops to 0.30 and the
   ratchet now holds it there. The remaining four are TIES (+0 to +7 characters) — the heuristic no
   longer discriminates, which is the actual goal; forcing every correct answer to be shorter would
   just invert the tell. Repair the rest the same way and drop each ceiling as it lands. */
const GOAL = 0.40;

let bad = 0;
const ok = (l, c, d) => { console.log((c ? '  PASS  ' : '  FAIL  ') + l + (d ? '   [' + d + ']' : '')); if (!c) bad++; };

function questions(n) {
  const f = path.join(ROOT, 'public', 'worksheet' + n + '.data.js');
  if (!fs.existsSync(f)) return null;
  const W = new Function('const MODULE={};' + fs.readFileSync(f, 'utf8') + ';return WORKSHEET;')();
  const qs = [];
  (W.tasks || []).forEach(t => { if (t.quiz && !t.quiz.multi && typeof t.quiz.a === 'number') qs.push(t.quiz); });
  (W.exam || []).forEach(q => { if (!q.multi && typeof q.a === 'number') qs.push(q); });
  return qs;
}
const plain = s => String(s).replace(/<[^>]*>/g, '');

console.log('Longest-answer heuristic — how often does it pick the correct option?\n');
let tot = 0, hits = 0, strictTot = 0;
for (let n = 1; n <= 8; n++) {
  const qs = questions(n);
  if (!qs || !qs.length) continue;
  let strict = 0, clear = 0;
  qs.forEach(q => {
    const L = (q.opts || []).map(o => plain(o).length);
    const other = Math.max(...L.filter((_, i) => i !== q.a));
    if (L.indexOf(Math.max(...L)) === q.a) strict++;
    if (L[q.a] - other > MARGIN) clear++;
  });
  tot += qs.length; hits += clear; strictTot += strict;
  const rate = clear / qs.length;
  const lim = THRESHOLD[n];
  ok('worksheet' + n + ' at or under its current ceiling',
     rate <= lim + 1e-9,
     'clear ' + clear + '/' + qs.length + ' = ' + (rate * 100).toFixed(0) + '%  (strict ' + strict +
     ', ceiling ' + (lim * 100).toFixed(0) + '%, goal ≤' + (GOAL * 100) + '%)');
}
console.log('\n  overall CLEAR  ' + hits + '/' + tot + ' = ' + (100 * hits / tot).toFixed(1) + '%   (chance 25%, pass mark 70%)');
console.log('  overall strict ' + strictTot + '/' + tot + ' = ' + (100 * strictTot / tot).toFixed(1) + '%   (includes near-ties)');
if (hits / tot > GOAL) {
  console.log('  NOTE: still above the ' + (GOAL * 100) + '% goal — the quizzes remain partly beatable');
  console.log('        without understanding. Tracked as P0 in docs/STUDENT_FEEDBACK.md.');
}

/* A second, independent tell: even if the correct answer is not the LONGEST, it is suspicious if it is
   consistently far longer than the average distractor. Report it so the content pass has a target. */
let gaps = [];
for (let n = 1; n <= 8; n++) {
  const qs = questions(n) || [];
  qs.forEach(q => {
    const L = (q.opts || []).map(o => plain(o).length);
    const others = L.filter((_, i) => i !== q.a);
    gaps.push(L[q.a] - (others.reduce((a, b) => a + b, 0) / others.length));
  });
}
gaps.sort((a, b) => a - b);
const med = gaps[Math.floor(gaps.length / 2)];
console.log('\n  median (correct − mean distractor) = ' + med.toFixed(0) + ' characters');
ok('length gap is documented and not growing', med <= 90, 'median +' + med.toFixed(0) + ' chars');

console.log(bad ? '\n' + bad + ' worksheet(s) got WORSE than their recorded ceiling' : '\nQUIZ QUALITY: no regressions');
process.exit(bad ? 1 : 0);
