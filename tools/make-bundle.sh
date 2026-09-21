#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# make-bundle.sh — roll the course into one distributable zip.
#
#   bash tools/make-bundle.sh              # orbit-academy-<version>.zip           (everything)
#   bash tools/make-bundle.sh --vanilla    # orbit-academy-<version>-standalone.zip (learner only)
#   bash tools/make-bundle.sh --full       # add tests + build tools (for developers)
#
# TWO ZIPS, NOT TWO FOLDERS. It is tempting to ship a "vanilla" folder and a "course management"
# folder side by side, but they would share the same ~11 MB of public/ content: every worksheet fix
# would have to land twice, they would drift, and anyone who started vanilla and later wanted
# tracking would have to migrate. One tree already does both jobs — gallery.html needs no server,
# server.js adds the accounts — and START-HERE.html presents that as two buttons. What IS worth
# separating is the DOWNLOAD: --vanilla omits the server, the instructor docs and the slides, so a
# learner who will never teach gets a smaller file with nothing confusing in it.
#
# WHY A ZIP AND NOT A .pkg / .msi
# The course has exactly ONE dependency (Node.js) and it is only needed for the tracked/roster mode.
# Everything else is already "copy this folder". So a native installer would exist to install one
# thing we cannot redistribute anyway, while adding real costs:
#   - an UNSIGNED .pkg or .msi produces a scarier warning than a zip, and signing needs a paid
#     Apple Developer ID / Windows code-signing certificate;
#   - in an accredited or air-gapped facility, installers frequently cannot run at all (admin rights,
#     application allowlisting) whereas an unpacked folder passes review easily;
#   - an installer implies an uninstaller, a receipt database, and per-OS packaging to maintain.
# A versioned zip with START-HERE.html gives the same "download one file, double-click" experience
# with none of that, and stays air-gap friendly. If removing the Node.js step ever matters more than
# the signing cost, the next step is a Node single-executable build — per-platform and ~90 MB each.
#
# EXCLUDED ALWAYS: academy_data.json (password hashes + student progress) and .git.
# ---------------------------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

FULL=0; VANILLA=0
case "${1:-}" in
  --full)    FULL=1 ;;
  --vanilla) VANILLA=1 ;;
  '')        ;;
  *) echo "unknown option: $1  (use --vanilla or --full)" >&2; exit 1 ;;
esac
VER=$(grep -m1 -o 'ORBIT ACADEMY v[0-9.]*' server.js | grep -o '[0-9.]*' | head -1)
[ -n "$VER" ] || { echo "ERROR: could not read the version from server.js" >&2; exit 1; }
# BUNDLE_DIR lets a build write somewhere other than the repo (read-only checkouts, CI).
SUFFIX=""; [ "$VANILLA" = "1" ] && SUFFIX="-standalone"
OUT="${BUNDLE_DIR:-$PWD}/orbit-academy-v$VER$SUFFIX.zip"
STAGE=$(mktemp -d); trap 'rm -rf "$STAGE"' EXIT
DEST="$STAGE/academy"
mkdir -p "$DEST"

echo "Orbit Academy v$VER — building $OUT"

# --- the course itself: identical in both bundles ---
cp -R public "$DEST/"
# moon_hires.jpg is gitignored but travels in a bundle if the machine building it has fetched the
# NASA upgrade — that is the point: one person fetches it, everyone downstream gets the sharp Moon.
if [ -s public/vendor/textures/moon_hires.jpg ]; then
  echo "  including the NASA LRO lunar upgrade ($(du -h public/vendor/textures/moon_hires.jpg | cut -f1))"
fi
cp START-HERE.html "$DEST/"

if [ "$VANILLA" = "1" ]; then
  echo "  vanilla: learner only — no server, no instructor material"
  # A learner bundle deliberately has no server.js, so nothing in it can ask for Node.js and there is
  # no half-working "sign in" page to stumble into. index.html would be exactly that, so drop it and
  # let START-HERE.html and gallery.html be the only doors.
  rm -f "$DEST/public/index.html" "$DEST/public/editor.html" "$DEST/public/faq.html"
  cp docs/CHANGELOG.md "$DEST/" 2>/dev/null || true
  python3 - "$DEST" "v$VER" <<'PYEOF'
import sys, pathlib, re
dest = pathlib.Path(sys.argv[1])
VER_TAG = sys.argv[2] if len(sys.argv) > 2 else ''
p = dest / 'START-HERE.html'
s = p.read_text(encoding='utf-8')
# drop the whole instructor card: in this bundle there is nothing to run
s = re.sub(r'<div class="c">\s*<span class="tag b">.*?</div>\s*(?=<p class="dim">)', '', s, flags=re.S)
# replace the doc footer, which points at files this bundle does not contain
s = re.sub(r'<p class="dim">Full documentation:.*?</p>',
           '<p class="dim">Want accounts, progress that follows you between machines, and an '
           'instructor roster? Download the <b>full edition</b> \u2014 the same course plus a small '
           'local server.</p>', s, flags=re.S)
s = s.replace('nothing to download, no internet required, ever.',
              'nothing to install, no account, no internet required, ever.')
p.write_text(s, encoding='utf-8')

readme = [
 'ORBIT ACADEMY ' + VER_TAG + ' - standalone edition',
 '=' * (len('ORBIT ACADEMY ' + VER_TAG + ' - standalone edition')),
 '',
 'An interactive course in orbital mechanics: 8 modules, each pairing a written',
 'worksheet with a live 3-D simulator you fly yourself.',
 '',
 '',
 'START HERE',
 '----------',
 '',
 '  1. Unzip this folder anywhere you like (Desktop is fine).',
 '  2. Open the file  START-HERE.html  by double-clicking it.',
 '  3. Pick Module 1 and work down the list.',
 '',
 'That is the entire installation. Nothing to install, no account to make, and no',
 'internet connection is needed - now or ever. Everything runs inside your browser',
 'from the files in this folder.',
 '',
 'Use Chrome, Edge or Firefox. Safari is stricter about pages opened directly from',
 'disk and a few simulators misbehave there.',
 '',
 '',
 'HOW THE COURSE WORKS',
 '--------------------',
 '',
 'Each module is a pair:',
 '',
 '  - a WORKSHEET  - the reading, the exercises, and a short quiz. Answer a quiz',
 '                   question correctly and that exercise is ticked off.',
 '  - a SIMULATOR  - the thing you actually fly. Every worksheet exercise tells you',
 '                   what to do in it and what to look for.',
 '',
 'Keep both open side by side. Every simulator has a  [] Back to worksheet  button',
 'at its top-left, and every worksheet has a button that opens its simulator.',
 '',
 'The modules, in order:',
 '',
 '   1. How orbits work            5. xGEO / cislunar space and reference frames',
 '   2. Angular rates and geosync  6. Lagrange points and complex orbits',
 '   3. Naming orbits and TLEs     7. Observability - how we see satellites',
 '   4. Maneuvers and delta-v      8. Lunar transfers - the flight-sim capstone',
 '',
 'Budget roughly 45-90 minutes per module if you do the exercises properly. There',
 'is also a course-wide final quiz and a printable completion certificate.',
 '',
 '',
 'DRIVING THE SIMULATORS',
 '----------------------',
 '',
 '  drag                rotate or pan the view',
 '  scroll / pinch      zoom (hold Shift for fine control)',
 '  arrow keys          rotate, hands-free',
 '  , and .             slow down / speed up TIME. You will use these constantly:',
 '                      a low orbit takes 90 minutes, a lunar trip takes days.',
 '  R                   reset the view if you get lost',
 '',
 'Every slider also has a box beside it - type an exact number and press Enter',
 'when an exercise asks for a specific value.',
 '',
 '',
 'YOUR PROGRESS',
 '-------------',
 '',
 'Ticked exercises are saved in the browser you used, on that computer. Use the',
 'same browser to pick up where you left off. Progress does NOT follow you to',
 'another machine, and clearing your browsing data will clear it.',
 '',
 'Working through it more than once, or sharing a computer? Each browser profile',
 'keeps its own separate progress.',
 '',
 '',
 'TEACHING A GROUP?',
 '-----------------',
 '',
 'Download the FULL edition instead. Same course, plus: student accounts, progress',
 'that follows each student between machines, modules that unlock in order, an',
 'instructor roster showing exactly where the class struggled, and an editor for',
 'the worksheets. It needs Node.js (one free installer) and starts by',
 'double-clicking a launcher.',
 '',
 '',
 'IF SOMETHING LOOKS WRONG',
 '------------------------',
 '',
 'A blank or frozen simulator is almost always a browser issue rather than a',
 'broken file: try reloading the page, and try Chrome if you are not already using',
 'it. CHANGELOG.md in this folder lists what changed in each version.',
 '']
(dest / 'README.txt').write_text('\n'.join(readme), encoding='utf-8')

# Any link to a page this bundle does not ship is a dead end for a learner. Strip them rather than
# leave a 404: gallery.html points at the hub and the instructor FAQ, neither of which is here.
for name in ['gallery.html', 'guide.html', 'resources.html', 'glossary.html', 'cheatsheet.html', 'controls.html', 'final.html']:
    f = dest / 'public' / name
    if not f.exists():
        continue
    t = f.read_text(encoding='utf-8')
    before = t
    # drop whole anchor elements whose target is missing from this bundle
    for gone in ['index.html', 'editor.html', 'faq.html']:
        t = re.sub(r'<a\b[^>]*href="' + re.escape(gone) + r'"[^>]*>.*?</a>', '', t, flags=re.S)
        t = re.sub(r'<button\b[^>]*location\.href=.' + re.escape(gone) + r'.[^>]*>.*?</button>', '', t, flags=re.S)
    if t != before:
        f.write_text(t, encoding='utf-8')
        print('  pruned dead links in public/' + name)

PYEOF
else
  cp server.js README.md start-academy.command start-academy.bat start-academy.sh "$DEST/"
  mkdir -p "$DEST/docs"; cp docs/*.md "$DEST/docs/"
  mkdir -p "$DEST/tools"; cp tools/fetch-vendor.sh tools/set-role.js "$DEST/tools/"
  [ -d slides ] && cp -R slides "$DEST/" || true
  [ -d workbooks ] && cp -R workbooks "$DEST/" || true
  # served copy, so http://localhost:8080/START-HERE.html works as well as double-clicking the file
  cp START-HERE.html "$DEST/public/" 2>/dev/null || true
fi

if [ "$FULL" = "1" ]; then
  cp -R test "$DEST/"
  cp tools/make-textures.py tools/make-bundle.sh "$DEST/tools/" 2>/dev/null || true
  echo "  including tests + build tools (--full)"
fi

# --- never ship these ---
rm -f "$DEST"/academy_data.json* 2>/dev/null || true
find "$DEST" -name '.DS_Store' -delete 2>/dev/null || true
find "$DEST" -name '*.bak' -delete 2>/dev/null || true
find "$DEST" -name '*.tmp' -delete 2>/dev/null || true

# the launchers must arrive executable; a zip preserves the mode bits
chmod +x "$DEST/start-academy.command" "$DEST/start-academy.sh" 2>/dev/null || true

# --- sanity: refuse to ship a bundle that cannot run ---
fail=0
NEED="START-HERE.html public/gallery.html public/vendor/three.min.js \
      public/vendor/textures/earth_schematic.jpg public/worksheet1.html public/tut8.html"
[ "$VANILLA" = "1" ] || NEED="$NEED server.js public/index.html public/faq.html"
for f in $NEED; do
  [ -s "$DEST/$f" ] || { echo "  MISSING: $f"; fail=1; }
done
if grep -RIlq 'cdnjs.cloudflare.com\|cdn.jsdelivr.net' "$DEST/public"/*.html 2>/dev/null; then
  echo "  WARNING: a CDN reference survived in public/*.html — bundle is not air-gap clean"; fail=1
fi
[ -e "$DEST/academy_data.json" ] && { echo "  FATAL: student data got into the bundle"; fail=1; }
[ "$fail" = "0" ] || { echo "Build FAILED — nothing written." >&2; exit 1; }

( cd "$STAGE" && zip -qr "$OUT" academy )
SIZE=$(du -h "$OUT" | cut -f1)
echo
echo "✓ $(basename "$OUT")  ($SIZE)"
echo "  written to: $OUT"
echo
if [ "$VANILLA" = "1" ]; then
  echo "Standalone edition — for learners. Unzip, open academy/START-HERE.html, done."
  echo "No Node.js, no server, no accounts, nothing to configure."
else
  echo "Full edition. Unzip and open academy/START-HERE.html, which offers both modes:"
  echo "no-install learning (gallery.html) or the tracked classroom (a launcher + Node.js)."
fi
echo
echo "Checksum to publish alongside it:"
if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$OUT" | sed 's/^/  /'
elif command -v sha256sum >/dev/null 2>&1; then sha256sum "$OUT" | sed 's/^/  /'; fi
