#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# fetch-hires.sh — upgrade the Earth and/or Moon maps to NASA originals. Run ONCE, with network.
#
#   bash tools/fetch-hires.sh              # both, recommended sizes
#   bash tools/fetch-hires.sh moon         # Moon only
#   bash tools/fetch-hires.sh earth        # Earth only
#   bash tools/fetch-hires.sh --big        # both, largest practical (slower download, sharper)
#   bash tools/fetch-hires.sh --revert     # remove both upgrades, back to the shipped maps
#
# WHY
# The maps that ship with the course come from the three.js examples: Earth 2048x1024 and Moon
# 1024x512 — for the WHOLE BODY. Module 8 flies to within a few hundred kilometres of the surface,
# which magnifies them hard. Better sampling and filtering (already done) remove the artefacts but
# cannot invent detail that was never photographed; the source map is the ceiling.
#
# SOURCES — both public domain, both NASA:
#   Moon   LRO/LROC natural-colour mosaic, "CGI Moon Kit"   https://svs.gsfc.nasa.gov/4720
#   Earth  Blue Marble Next Generation (MODIS/Terra)        https://visibleearth.nasa.gov/collection/1484/blue-marble
# NASA works are not subject to copyright in the United States; NASA asks for credit, which is
# recorded in public/vendor/NOTICE.md.
#
# ON THE URLS: NASA reorganises its sites from time to time, and a script that hardcodes one dead
# link is worse than useless. So each map has a LIST of candidate URLs and this tries them in order,
# reporting which one worked. If they all fail it prints the human page to visit and exactly where to
# drop the file by hand — the course then picks it up with no further steps.
#
# AIR-GAPPED SITES: run this on a networked machine, then copy the academy folder across, or build a
# bundle (tools/make-bundle.sh) and the sharper maps travel inside it. The course itself never
# downloads anything at run time.
# ---------------------------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."
TEX=public/vendor/textures
SVS='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720'
EOI='https://eoimages.gsfc.nasa.gov/images/imagerecords'

DO_MOON=1; DO_EARTH=1; BIG=0
case "${1:-}" in
  moon)     DO_EARTH=0 ;;
  earth)    DO_MOON=0 ;;
  --big)    BIG=1 ;;
  --revert) DO_MOON=2 ;;
  '')       ;;
  *) echo "unknown option: $1  (moon | earth | --big | --revert)" >&2; exit 2 ;;
esac

say(){ printf '  %s\n' "$*"; }
warn(){ printf '  !! %s\n' "$*"; }
die(){ printf '\nERROR: %s\n\n' "$*" >&2; exit 1; }

if [ "$DO_MOON" = 2 ]; then
  rm -f "$TEX/moon_hires.jpg" "$TEX/earth_hires.jpg"
  say "removed both upgrades — back to the maps that ship with the course"
  python3 tools/make-winpix.py || die "could not rebuild winpix.js"
  exit 0
fi

have(){ command -v "$1" >/dev/null 2>&1; }
have python3 || die "python3 with Pillow is required (for TIFF conversion and rebuilding winpix.js)"

# try_urls <dest-basename> <label> <url> [url...]
# Downloads the first candidate that works, converts to JPEG, writes $TEX/<dest>.
try_urls(){
  local out="$1"; shift
  local label="$1"; shift
  local tmp; tmp=$(mktemp -d)
  local got=""
  for u in "$@"; do
    say "trying $(basename "$u")"
    local ext="${u##*.}"
    local f="$tmp/src.$ext"
    if have curl; then curl -fL --progress-bar "$u" -o "$f" 2>/dev/null
    elif have wget; then wget -q --show-progress "$u" -O "$f" 2>/dev/null
    else rm -rf "$tmp"; die "need curl or wget"; fi
    if [ -s "$f" ]; then got="$f"; say "got it ($(du -h "$f" | cut -f1))"; break; fi
    warn "not available"
  done
  if [ -z "$got" ]; then rm -rf "$tmp"; return 1; fi
  python3 - "$got" "$TEX/$out" <<'PY'
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None            # these maps are legitimately enormous
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
if im.mode in ('I;16', 'I;16B', 'I'):    # 16-bit TIFF -> 8-bit sRGB
    im = im.point(lambda v: v * (1.0 / 256)).convert('L').convert('RGB')
else:
    im = im.convert('RGB')
# Equirectangular maps must be exactly 2:1. Some NASA products are cropped or tiled; fix the aspect
# rather than silently mapping a wrong projection onto the sphere.
w, h = im.size
if abs(w / h - 2.0) > 0.02:
    print(f'  note: {w}x{h} is not 2:1 — resampling to {w}x{w//2} so the projection stays correct')
    im = im.resize((w, w // 2), Image.LANCZOS)
im.save(dst, 'JPEG', quality=90, optimize=True, progressive=True)
print(f'  wrote {im.size[0]}x{im.size[1]}')
PY
  local rc=$?
  rm -rf "$tmp"
  [ "$rc" = 0 ] && [ -s "$TEX/$out" ]
}

mkdir -p "$TEX"
FAILED=""

# --------------------------------------------------------------------- Moon
if [ "$DO_MOON" = 1 ]; then
  echo; echo "MOON — NASA LRO/LROC colour mosaic"
  if [ "$BIG" = 1 ]; then
    SET=("$SVS/lroc_color_poles_8k.tif" "$SVS/lroc_color_poles_4k.tif" "$SVS/lroc_color_2k.jpg")
  else
    SET=("$SVS/lroc_color_poles_4k.tif" "$SVS/lroc_color_2k.jpg" "$SVS/lroc_color_poles_2k.tif")
  fi
  try_urls moon_hires.jpg 'Moon' "${SET[@]}" || FAILED="$FAILED moon"
fi

# -------------------------------------------------------------------- Earth
if [ "$DO_EARTH" = 1 ]; then
  echo; echo "EARTH — NASA Blue Marble Next Generation"
  # Several historical layouts; the first that answers wins. 3x5400x2700 is one tile-set naming, the
  # plain 5400x2700 another; both are the same December 2004 composite with topography+bathymetry.
  SET=("$EOI/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg"
       "$EOI/73000/73909/world.topo.bathy.200412.3x5400x2700.png"
       "$EOI/74000/74117/world.topo.bathy.200412.3x5400x2700.jpg"
       "$EOI/73000/73776/world.topo.bathy.200408.3x5400x2700.jpg"
       "$EOI/57000/57752/land_shallow_topo_2048.tif")
  try_urls earth_hires.jpg 'Earth' "${SET[@]}" || FAILED="$FAILED earth"
fi

# ------------------------------------------------------------------ rebuild
python3 tools/make-winpix.py || die "could not rebuild winpix.js (needed for offline/file:// use)"

echo
if [ -n "$FAILED" ]; then
  cat <<EOF
COULD NOT FETCH:$FAILED

NASA moves things around. Download by hand and drop the file in — nothing else is needed:

  Moon   https://svs.gsfc.nasa.gov/4720
         save any of the lroc_color* images as  $TEX/moon_hires.jpg
  Earth  https://visibleearth.nasa.gov/collection/1484/blue-marble
         save a "topo.bathy" image (5400x2700 or larger) as  $TEX/earth_hires.jpg

The file must be an equirectangular 2:1 map. Then run:  python3 tools/make-winpix.py
EOF
fi

echo "Present now:"
for f in moon_hires.jpg earth_hires.jpg; do
  if [ -s "$TEX/$f" ]; then say "$f  ($(du -h "$TEX/$f" | cut -f1))"; else say "$f  — not installed (shipped map in use)"; fi
done
cat <<EOF

The simulators pick these up automatically: they lead the texture chain in public/textures.js, with
the shipped maps as fallbacks. Reload any module to see them.

  • Rebuild the distributables so the sharper maps travel:  bash tools/make-bundle.sh
  • Credit NASA if you publish screenshots (see public/vendor/NOTICE.md).
  • Undo:  bash tools/fetch-hires.sh --revert
EOF
