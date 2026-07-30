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

/* Tighten these toward ~0.40 (a little above chance) as the content pass proceeds.
   Per-worksheet so a repaired module cannot regress behind a still-broken one. */
const THRESHOLD = { 1: 0.80, 2: 0.90, 3: 0.95, 4: 1.00, 5: 1.00, 6: 1.00, 7: 0.90, 8: 1.00 };
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
let tot = 0, hits = 0;
for (let n = 1; n <= 8; n++) {
  const qs = questions(n);
  if (!qs || !qs.length) continue;
  let hit = 0;
  qs.forEach(q => {
    const L = (q.opts || []).map(o => plain(o).length);
    if (L.indexOf(Math.max(...L)) === q.a) hit++;
  });
  tot += qs.length; hits += hit;
  const rate = hit / qs.length;
  const lim = THRESHOLD[n];
  ok('worksheet' + n + ' at or under its current ceiling',
     rate <= lim + 1e-9,
     hit + '/' + qs.length + ' = ' + (rate * 100).toFixed(0) + '%  (ceiling ' + (lim * 100).toFixed(0) + '%, goal ≤' + (GOAL * 100) + '%)');
}
console.log('\n  overall ' + hits + '/' + tot + ' = ' + (100 * hits / tot).toFixed(1) + '%   (chance 25%, pass mark 70%)');
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
