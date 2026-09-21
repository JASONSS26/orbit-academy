#!/usr/bin/env bash
# make-doc-pdfs.sh — regenerate the documentation PDFs in pdf/ for the download page.
#   pdf/instructor-guide.pdf   — all of docs/INSTRUCTOR_GUIDE.md
#   pdf/sysadmin-guide.pdf     — the install / hosting / data / admin / update /
#                                troubleshooting sections of the guide, plus the
#                                deployment guidance from docs/SECURITY.md
#   pdf/security-notes.pdf     — all of docs/SECURITY.md (the per-release audit log)
# Pipeline: markdown → (strip emoji, replace mermaid blocks with a note) → pandoc/xelatex.
set -euo pipefail
cd "$(dirname "$0")/.."
VER=$(grep -m1 -o 'ORBIT ACADEMY v[0-9.]*' server.js | grep -o '[0-9.]*' | head -1)
mkdir -p pdf

prep() {  # $1 in.md  $2 out.md  — de-emoji + mermaid → bracketed note
python3 - "$1" "$2" <<'PYEOF'
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
s = re.sub(r'```mermaid.*?```', '*[Diagram — see the online version of this document.]*', s, flags=re.S)
s = re.sub(r'[\U0001F000-\U0001FAFF️‍⭐⭕]', '', s)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
PYEOF
}

topdf() { # $1 in.md  $2 out.pdf  $3 title
  pandoc "$1" -o "$2" --pdf-engine=xelatex --toc --toc-depth=2 --columns=80 \
    -V mainfont="DejaVu Serif" -V monofont="DejaVu Sans Mono" \
    -V geometry:margin=2.2cm -V fontsize=11pt -V colorlinks=true -V linkcolor=blue \
    --metadata title="$3" --metadata date="v$VER" 2>/dev/null
  echo "  $2  ($(du -h "$2" | cut -f1))"
}

prep docs/INSTRUCTOR_GUIDE.md /tmp/ig.md
topdf /tmp/ig.md pdf/instructor-guide.pdf "Orbit Academy — Instructor's Guide"

# SysAdmin guide: guide sections 2,3,4,7,8,9 + SECURITY's deployment guidance
python3 - <<'PYEOF'
import re
g = open('/tmp/ig.md', encoding='utf-8').read()
def sec(md, head):           # grab '## N. Title' ... up to the next '## '
    m = re.search(r'(^## ' + head + r'.*?)(?=^## |\Z)', md, flags=re.S | re.M)
    return m.group(1) if m else ''
parts = ['''This guide collects the system-administration material for Orbit Academy: getting
the files, the two run modes, hosting for a classroom, where the data lives and what
to back up, account administration, updating, and troubleshooting. It is extracted
from the Instructor's Guide (which adds the module-by-module teaching notes) and the
Security Notes (which add the full per-release audit log); both ship alongside this file.
''']
for h in [r'2\. Download', r'3\. Ways to run', r'4\. The data file', r'7\. Instructor dashboard',
          r'8\. Updating', r'9\. Troubleshooting']:
    parts.append(sec(g, h))
s = open('docs/SECURITY.md', encoding='utf-8').read()
s = re.sub(r'[\U0001F000-\U0001FAFF️‍⭐⭕]', '', s)
m = re.search(r'(^## Deployment.*?)(?=^## v|\Z)', s, flags=re.S | re.M)
if m: parts.append(m.group(1))
open('/tmp/sa.md', 'w', encoding='utf-8').write('\n\n'.join(p for p in parts if p.strip()))
PYEOF
topdf /tmp/sa.md pdf/sysadmin-guide.pdf "Orbit Academy — System Administrator's Guide"

prep docs/SECURITY.md /tmp/sec.md
topdf /tmp/sec.md pdf/security-notes.pdf "Orbit Academy — Security Notes & Audit Log"
echo "done — doc PDFs at v$VER"
