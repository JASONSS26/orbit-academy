#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# fetch-moon-hires.sh — upgrade the lunar map to NASA's LRO mosaic. Run ONCE, with network.
#
#   bash tools/fetch-moon-hires.sh          # 4096x2048  (12.5 MB download)  <- recommended
#   bash tools/fetch-moon-hires.sh --8k     # 8192x4096  (48 MB download)
#   bash tools/fetch-moon-hires.sh --small  # 2048x1024  (0.4 MB download, already a JPEG)
#   bash tools/fetch-moon-hires.sh --revert # back to the three.js 1024x512 map
#
# WHY
# The Moon map that ships with the three.js examples is 1024x512 for the WHOLE MOON. Earth's is
# 2048x1024, so the Moon starts with a quarter of the pixels — and Module 8 flies you to within a few
# hundred kilometres of the surface, magnifying it hard. Bilinear sampling and anisotropic filtering
# removed the blockiness, but no filter invents detail that was never photographed: the source map is
# the limit, and at that size the surface reads as fuzzy up close.
#
# WHAT IT FETCHES
# NASA Scientific Visualization Studio, "CGI Moon Kit" (SVS id 4720) — the LROC Wide Angle Camera
# natural-colour mosaic, Hapke-normalised, assembled from over 100,000 WAC images, with the polar gaps
# filled from LOLA albedo. NASA imagery is not subject to copyright in the United States; NASA asks
# only for credit, which is recorded in public/vendor/NOTICE.md.
#   https://svs.gsfc.nasa.gov/4720
#
# The 4k and 8k versions are 16-bit TIFFs, so this converts them to JPEG locally (needs Python +
# Pillow). --small skips conversion entirely: NASA publishes that one as a JPEG already.
#
# AIR-GAPPED SITES: run this on a networked machine, then copy the whole academy folder across. The
# course itself never downloads anything.
# ---------------------------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."
TEX=public/vendor/textures
BASE='https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720'

MODE=4k
case "${1:-}" in
  --8k)     MODE=8k ;;
  --small)  MODE=small ;;
  --revert) MODE=revert ;;
  '')       ;;
  *) echo "unknown option: $1  (try --8k, --small or --revert)" >&2; exit 2 ;;
esac

say(){ printf '  %s\n' "$*"; }
die(){ printf '\nERROR: %s\n\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------ revert
if [ "$MODE" = revert ]; then
  rm -f "$TEX/moon_hires.jpg"
  say "removed $TEX/moon_hires.jpg — back to the 1024x512 three.js map"
  python3 tools/make-winpix.py || die "could not rebuild winpix.js"
  say "done. Reload the simulators."
  exit 0
fi

fetch(){ # fetch <url> <dest>
  if   command -v curl >/dev/null 2>&1; then curl -fL --progress-bar "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget --show-progress -q "$1" -O "$2"
  else die "need curl or wget"; fi
}

mkdir -p "$TEX"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

case "$MODE" in
  small) SRC_URL="$BASE/lroc_color_2k.jpg";            SRC="$TMP/moon.jpg"; NOTE='2048x1024 (2025 colour map, JPEG)';;
  4k)    SRC_URL="$BASE/lroc_color_poles_4k.tif";      SRC="$TMP/moon.tif"; NOTE='4096x2048 (2019 colour map, 16-bit TIFF)';;
  8k)    SRC_URL="$BASE/lroc_color_poles_8k.tif";      SRC="$TMP/moon.tif"; NOTE='8192x4096 (2019 colour map, 16-bit TIFF)';;
esac

echo
echo "Fetching the NASA LRO lunar mosaic — $NOTE"
say "source: $SRC_URL"
echo
fetch "$SRC_URL" "$SRC" || die "download failed. Check the network, or try --small (0.4 MB)."
[ -s "$SRC" ] || die "downloaded file is empty"
say "downloaded $(du -h "$SRC" | cut -f1)"

# ------------------------------------------------------------------ convert
# The globes can use more detail than the cockpit window (which samples through a canvas capped at
# 2048 wide), so keep the full width here and let make-winpix.py bake its own smaller copy.
if [ "$MODE" = small ]; then
  cp "$SRC" "$TEX/moon_hires.jpg"
else
  command -v python3 >/dev/null 2>&1 || die "python3 with Pillow is needed to convert the TIFF (or use --small)"
  python3 - "$SRC" "$TEX/moon_hires.jpg" <<'PY' || die "conversion failed — is Pillow installed?  pip3 install --user Pillow"
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None          # these are legitimately huge
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
# 16-bit TIFF -> 8-bit sRGB. Pillow handles I;16 via point(); RGB modes convert directly.
if im.mode in ('I;16', 'I;16B', 'I'):
    im = im.point(lambda v: v * (1.0 / 256)).convert('L').convert('RGB')
else:
    im = im.convert('RGB')
im.save(dst, 'JPEG', quality=90, optimize=True, progressive=True)
print(f'  converted -> {im.size[0]}x{im.size[1]} JPEG')
PY
fi

[ -s "$TEX/moon_hires.jpg" ] || die "no output written"
say "wrote $TEX/moon_hires.jpg ($(du -h "$TEX/moon_hires.jpg" | cut -f1))"

# ------------------------------------------------------------------ rebuild the baked maps
python3 tools/make-winpix.py || die "could not rebuild winpix.js (needed for offline/file:// use)"

cat <<EOF

Done. The simulators pick moon_hires.jpg up automatically — it is first in the texture chain in
public/textures.js, ahead of the old 1024x512 map, which stays as a fallback.

  • Reload any module with the Moon in it (5, 6 or 8) to see it.
  • Credit NASA's Scientific Visualization Studio if you publish screenshots.
  • Note the bundles get bigger: rebuild them with  bash tools/make-bundle.sh
  • To undo:  bash tools/fetch-moon-hires.sh --revert
EOF
