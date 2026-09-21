/* worksheet-to-html.js — emit a printable HTML edition of one worksheet data file.
   Usage: node tools/worksheet-to-html.js public/worksheet7.data.js "Module 7 — Observability" > out.html
   The output is fed to pandoc (xelatex) by tools/make-worksheet-pdfs.sh. Quiz/exam QUESTIONS and
   OPTIONS are printed; answers, explanations and feedback are NOT (per the printed-edition rule).
   Dynamic figures are reduced to bracketed figure notes with their captions. */
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const file = process.argv[2], title = process.argv[3] || path.basename(file);
// Not every data file has a module.exports guard (only 7, 8 and final do), so evaluate
// the file in a sandbox and capture the WORKSHEET global it defines.
const ctx = { module: { exports: {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.resolve(file), 'utf8') +
  '\n;__CAPTURE__(typeof WORKSHEET !== "undefined" ? WORKSHEET : module.exports);',
  Object.assign(ctx, { __CAPTURE__: w => { ctx.__W = w; } }) && ctx, { filename: file });
const W = ctx.__W;
if (!W || !W.tasks) { console.error('could not extract WORKSHEET from ' + file); process.exit(1); }

// strip emoji & pictographs (xelatex has no emoji font — they'd print as tofu)
// Only the astral-plane emoji (and variation selectors) lack glyphs in DejaVu; BMP symbols
// like → ✓ ☀ ″ ⁵√ render fine and are kept.
const deEmoji = s => String(s)
  .replace(/[\u{1F000}-\u{1FAFF}\u{FE0F}\u{200D}\u{2B50}\u{2B55}]/gu, '')
  .replace(/\s{2,}/g, ' ').trim();
const P = s => '<p>' + deEmoji(s) + '</p>\n';
const out = [];

out.push('<h1>' + deEmoji(title) + '</h1>');
out.push('<p><i>Printable edition. The interactive version — live simulator, self-checking questions — is the course website; open the matching tut/worksheet pages there. Dynamic diagrams appear here as bracketed figure notes.</i></p>');

if (W.objectives) {
  out.push('<h2>What you will learn</h2><ul>');
  for (const o of W.objectives) out.push('<li>' + deEmoji(o) + '</li>');
  out.push('</ul>');
}
if (W.tutorial) {
  out.push('<h2>Quick-start tutorial</h2>');
  for (const b of W.tutorial) {
    if (typeof b === 'string') out.push(b.trim().startsWith('<table') ? deEmoji(b) : P(b));
    else if (b.analogy) out.push('<blockquote><b>Picture this:</b> ' + deEmoji(b.analogy) + '</blockquote>');
    else if (b.h) out.push('<h3>' + deEmoji(b.h) + '</h3>');
    else if (b.figure) out.push('<p>[Figure' + (b.caption ? ': ' + deEmoji(b.caption) : '') + ']</p>');
  }
}
if (W.elements) {
  out.push('<h2>' + deEmoji(W.elements.title) + '</h2>' + P(W.elements.blurb));
  const c = W.elements.cols || ['What it sets', 'Plain-language meaning', 'In the tool'];
  out.push('<table><tr><th>' + c.map(deEmoji).join('</th><th>') + '</th></tr>');
  for (const r of W.elements.rows)
    out.push('<tr><td>' + [r.name, r.meaning, r.tool].map(deEmoji).join('</td><td>') + '</td></tr>');
  out.push('</table>');
}

let n = 0;
for (const part of (W.parts || [])) {
  out.push('<h2>' + deEmoji(part.title) + '</h2>');
  if (part.blurb) out.push(P('<i>' + part.blurb + '</i>'));
  for (const tid of part.tasks) {
    const t = W.tasks.find(x => x.id === tid); if (!t) continue; n++;
    out.push('<h3>Exercise ' + n + ' — ' + deEmoji(t.title) + '</h3>');
    if (t.teach) for (const p of [].concat(t.teach)) out.push(P(p));
    if (t.body) out.push(P('[Figure/insert: see the online worksheet]'));
    if (t.predict) out.push(P('<b>Predict first:</b> ' + t.predict));
    if (t.do) {
      const label = t.doLabel ? deEmoji(t.doLabel) : 'Try it in the simulator';
      const steps = [].concat(t.do);
      out.push('<p><b>' + label + ':</b></p>');
      if (steps.length > 1) out.push('<ol>' + steps.map(s => '<li>' + deEmoji(s) + '</li>').join('') + '</ol>');
      else out.push(P(steps[0]));
    }
    if (t.observe) out.push(P('<b>What to look for:</b> ' + t.observe));
    if (t.think) out.push('<p><b>While you watch, think about:</b></p><ul>' +
      t.think.map(q => '<li>' + deEmoji(q) + '</li>').join('') + '</ul>');
    if (t.quiz) {
      out.push(P('<b>Check your understanding' + (t.quiz.multi ? ' (select all that apply)' : '') + ':</b> ' + t.quiz.q));
      out.push('<ul>' + t.quiz.opts.map(o => '<li>' + deEmoji(o) + '</li>').join('') + '</ul>');
    }
  }
}
if (W.summary) {
  out.push('<h2>Key points</h2><ul>');
  for (const s of W.summary) out.push('<li>' + deEmoji(s) + '</li>');
  out.push('</ul>');
}
if (W.exam) {
  out.push('<h2>Final quiz</h2><p><i>Answers are checked in the online version.</i></p>');
  W.exam.forEach((q, i) => {
    out.push(P('<b>Q' + (i + 1) + (q.multi ? ' (select all that apply)' : '') + '.</b> ' + q.q));
    out.push('<ul>' + q.opts.map(o => '<li>' + deEmoji(o) + '</li>').join('') + '</ul>');
  });
}
if (W.resources) {
  out.push('<h2>Learn more</h2><ul>');
  for (const r of W.resources)
    out.push('<li>' + deEmoji(r.t) + (r.note ? ' — ' + deEmoji(r.note) : '') + '<br/><span style="font-size:small">' + r.u + '</span></li>');
  out.push('</ul>');
}
process.stdout.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + deEmoji(title) +
  '</title></head><body>\n' + out.join('\n') + '\n</body></html>\n');
