#!/usr/bin/env bash
# make-worksheet-pdfs.sh — regenerate the printable worksheet PDFs into pdf/.
# Pipeline: worksheet data (public/worksheetN.data.js) → printable HTML
# (tools/worksheet-to-html.js) → pandoc → xelatex. Quiz answers are never printed.
# Requires: node, pandoc, xelatex (TeX Live), DejaVu fonts.
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -m1 -o 'ORBIT ACADEMY v[0-9.]*' server.js | grep -o '[0-9.]*' | head -1)
mkdir -p pdf
TITLES=(
  "Module 1 — How Orbits Work"
  "Module 2 — Angular Rates & the Geosynchronous Belt"
  "Module 3 — Naming Orbits & TLEs"
  "Module 4 — Maneuvers & Perturbations"
  "Module 5 — xGEO / Cislunar Space & Reference Frames"
  "Module 6 — Lagrange Points & Complex Orbits"
  "Module 7 — Observability"
  "Module 8 — Lunar Transfers & Artemis"
)
for i in 1 2 3 4 5 6 7 8; do
  t="${TITLES[$((i-1))]} (Orbit Academy v$VER)"
  node tools/worksheet-to-html.js "public/worksheet$i.data.js" "$t" > "/tmp/ws$i.html"
  # round-trip through pandoc markdown so tables become multiline tables with relative
  # column widths — the LaTeX writer then WRAPS long cells instead of running off the page
  # forbid simple/pipe tables so pandoc emits MULTILINE tables, which carry relative
  # column widths into LaTeX and wrap long cells instead of running off the page
  pandoc "/tmp/ws$i.html" -t markdown-simple_tables-pipe_tables -o "/tmp/ws$i.md" --columns=100
  pandoc "/tmp/ws$i.md" -o "pdf/worksheet$i.pdf" --pdf-engine=xelatex \
    -V mainfont="DejaVu Serif" -V monofont="DejaVu Sans Mono" \
    -V geometry:margin=2.2cm -V fontsize=11pt -V colorlinks=false \
    --metadata title="" 2>/dev/null
  echo "  pdf/worksheet$i.pdf  ($(du -h "pdf/worksheet$i.pdf" | cut -f1))"
done
cat > pdf/README.txt <<EOF
ORBIT ACADEMY v$VER — Worksheet printouts (Modules 1-8)
Printable editions of the eight guided worksheets: objectives, tutorial text,
every exercise (teach / predict / try-it / what-to-look-for / think-about
prompts), the check questions and final quiz (answers not printed), key
points, and further-reading links.
The interactive versions — with the live simulators and self-checking
questions — live in the course itself. Diagrams that are drawn dynamically
online appear here as bracketed figure notes.
Regenerate with: bash tools/make-worksheet-pdfs.sh
EOF
echo "done — pdf/ is at v$VER"
