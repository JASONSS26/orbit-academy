#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# fetch-vendor.sh — populate public/vendor/ with the one third-party library the course needs.
#
# ORBIT ACADEMY IS LOCAL-FIRST BY DEFAULT. The simulators load three.js from public/vendor/ and
# resolve planet textures locally (public/textures.js, ALLOW_CDN=false), so a running install makes
# ZERO outbound network calls. That is what makes it deployable on standalone / air-gapped systems.
#
# Exactly one file cannot be committed to the repo for licensing/size hygiene, and this script
# fetches it:
#     three.js r128           REQUIRED — every simulator needs it (~600 KB)
# and two optional nice-to-haves:
#     earth_atmos_2048.jpg    photographic Earth map \ purely cosmetic: schematic maps ship IN the
#     moon_1024.jpg           photographic Moon map  / repo and are used if these are absent.
#
#   bash tools/fetch-vendor.sh          # download into public/vendor/ (run ONCE, with network)
#   bash tools/fetch-vendor.sh --check  # report what is present and whether anything can call out
#   bash tools/fetch-vendor.sh --cdn    # opt BACK IN to the pinned CDNs (not for air-gapped use)
#
# AIR-GAPPED INSTALL: run this once on a networked machine, then copy/zip the whole `academy`
# folder (public/vendor/ included) to the target. Nothing else is needed — no npm, no internet.
# Run  bash test/no-external-calls.test.js  to prove the tree makes no outbound calls.
# ---------------------------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."
PUB=public
VEN=$PUB/vendor
TEX=$VEN/textures

THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
THREE_SRI='sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu'
TEX_BASE='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/'
EARTH=earth_atmos_2048.jpg
MOON=moon_1024.jpg

say(){ printf '  %s\n' "$*"; }

fetch(){ # fetch <url> <dest>
  if   command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else echo "ERROR: need curl or wget to download assets." >&2; return 1; fi
}

mode(){
  if grep -q 'src="vendor/three.min.js"' $PUB/tut1.html 2>/dev/null; then echo local; else echo cdn; fi
}

# ------------------------------------------------------------------ --check
if [ "${1:-}" = "--check" ]; then
  echo "Orbit Academy asset mode: $(mode)"
  for f in "$VEN/three.min.js" "$TEX/$EARTH" "$TEX/$MOON" "$TEX/earth_schematic.jpg" "$TEX/moon_schematic.jpg"; do
    if [ -s "$f" ]; then say "present  $f  ($(wc -c <"$f" | tr -d ' ') bytes)"
    else say "absent   $f$([ "${f##*_}" = "schematic.jpg" ] && echo '   <-- ships with the repo; run tools/make-textures.py')"; fi
  done
  say "textures.js ALLOW_CDN: $(grep -o 'ALLOW_CDN = [a-z]*' $PUB/textures.js | head -1 | awk '{print $3}')"
  echo
  echo "Remaining outbound references in public/ (excluding <a href> reading links):"
  grep -rhoE 'https?://[^"'"'"' )]+' $PUB/*.html $PUB/*.js 2>/dev/null \
    | grep -vE 'w3\.org|en\.wikipedia\.org|nasa\.gov|goes-r\.gov|celestrak|space-track|github\.com|nodejs\.org|localhost|10\.0\.0' \
    | sort -u | sed 's/^/    /'
  exit 0
fi

# ------------------------------------------------------------------ --cdn (opt back in)
if [ "${1:-}" = "--cdn" ] || [ "${1:-}" = "--restore" ]; then
  echo "Opting back in to the pinned CDNs (NOT suitable for air-gapped use)…"
  for f in $PUB/tut*.html; do
    perl -0pi -e 's{<script src="vendor/three\.min\.js"></script>}{<script src="'"$THREE_URL"'"\n  integrity="'"$THREE_SRI"'"\n  crossorigin="anonymous"></script>}g' "$f"
  done
  perl -pi -e 's{^const ALLOW_CDN = false;}{const ALLOW_CDN = true;}' $PUB/textures.js
  say "mode is now: $(mode)"
  say "textures: CDN permitted again (public/textures.js)"
  exit 0
fi

# ------------------------------------------------------------------ download + switch
echo "1/2  Downloading into $VEN …"
mkdir -p "$TEX"
# three.js is REQUIRED (the sims cannot run without it). The photographic planet maps are OPTIONAL:
# schematic ones ship in the repo, so a failure here degrades fidelity, not function.
if [ ! -s "$VEN/three.min.js" ]; then
  fetch "$THREE_URL" "$VEN/three.min.js" || { echo "ERROR: could not download three.js — the simulators need it." >&2
    echo "       Retry with network access, or copy three.min.js (r128) into $VEN/ by hand." >&2; exit 1; }
fi
[ -s "$TEX/$EARTH" ] || fetch "$TEX_BASE$EARTH" "$TEX/$EARTH" || say "note: Earth photo map unavailable — the schematic map will be used"
[ -s "$TEX/$MOON" ]  || fetch "$TEX_BASE$MOON"  "$TEX/$MOON"  || say "note: Moon photo map unavailable — the schematic map will be used"

# integrity check on the library (same hash the CDN tags pin)
if command -v openssl >/dev/null 2>&1; then
  got="sha384-$(openssl dgst -sha384 -binary "$VEN/three.min.js" | openssl base64 -A)"
  if [ "$got" = "$THREE_SRI" ]; then say "three.min.js integrity verified (matches the pinned SRI hash)"
  else echo "ERROR: three.min.js hash mismatch!" >&2; echo "  expected $THREE_SRI" >&2; echo "  got      $got" >&2
       echo "  Refusing to switch. Delete $VEN/three.min.js and retry." >&2; exit 1; fi
else say "openssl not found — skipping the integrity check (assets downloaded)"
fi

# The simulators already point at vendor/three.min.js and textures.js already has ALLOW_CDN=false —
# local is the DEFAULT posture, so there is nothing to rewrite. Just make sure nobody left the tree
# in --cdn mode.
perl -pi -e 's{^const ALLOW_CDN = true;}{const ALLOW_CDN = false;}' $PUB/textures.js
for f in $PUB/tut*.html; do
  perl -0pi -e 's{<script src="\Qhttps://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js\E"\s*\n?\s*integrity="[^"]*"\s*\n?\s*crossorigin="anonymous"></script>}{<script src="vendor/three.min.js"></script>}g' "$f"
done

echo "2/2  Verifying …"
left=$(grep -l 'cdnjs.cloudflare.com\|cdn.jsdelivr.net' $PUB/tut*.html $PUB/*.js 2>/dev/null | tr '\n' ' ')
if [ -n "$left" ]; then echo "  WARNING: CDN references remain in: $left"; else say "no CDN references remain in the simulators"; fi
say "mode is now: $(mode)"
cat <<'EOF'

Done. public/vendor/ is populated; the course runs entirely from disk.

For an AIR-GAPPED install: zip or copy this whole `academy` folder (with public/vendor/) to the
target machine. Then either open public/index.html directly, or run `node server.js` for the
tracked/roster mode. No internet, no npm, no build step.

Still worth knowing for a fully sealed deployment:
  • The Wikipedia / NASA / CelesTrak links in the worksheets are <a href> reading links. They are
    never fetched unless a student clicks one; on an isolated network they simply fail to open.
  • The Earth/Moon maps fall back to the SCHEMATIC versions that ship in the repo if the
    photographic ones are absent, so the sims never depend on a download to function.
  • Run  bash tools/go-offline.sh --check  at any time to see the current mode.
EOF
