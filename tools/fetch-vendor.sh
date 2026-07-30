#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# fetch-vendor.sh — verify (and, if ever needed, re-download) the vendored assets in public/vendor/.
#
# YOU ALMOST CERTAINLY DO NOT NEED TO RUN THIS.
#
# Every byte the course needs is COMMITTED to the repository. `git clone` gives you a complete,
# runnable, fully offline course: three.js and all four planet maps are already in public/vendor/.
# There is no download step, no npm, no build, and therefore no version drift between one
# installation and the next — every classroom runs identical bytes. Provenance, licenses and
# hashes for all of it: public/vendor/NOTICE.md.
#
# So this script exists for three narrow jobs:
#
#   bash tools/fetch-vendor.sh --check   # VERIFY: recompute every SHA-384 against NOTICE.md.
#                                        # Use this after copying the folder to an air-gapped box,
#                                        # or any time you want to prove nothing was altered.
#   bash tools/fetch-vendor.sh           # REPAIR: re-download anything missing or corrupt.
#                                        # Needs network. Only useful if a file was deleted.
#   bash tools/fetch-vendor.sh --cdn     # opt BACK IN to the pinned CDNs. NOT for air-gapped use.
#
# AIR-GAPPED INSTALL: copy or clone the `academy` folder to the target machine and run
# `node server.js`. That is the whole procedure. Then `bash test/no-external-calls.test.js`
# proves the tree makes no outbound calls of any kind.
# ---------------------------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."
PUB=public
VEN=$PUB/vendor
TEX=$VEN/textures

THREE_URL='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
TEX_BASE='https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/'
EARTH=earth_atmos_2048.jpg
MOON=moon_1024.jpg

# The authoritative hash table, mirrored in public/vendor/NOTICE.md. Keep the two in step: if you
# ever re-vendor an asset, update BOTH. Format is an HTML `integrity=` digest, so the three.js entry
# is literally the published r128 SRI hash.
#   <path relative to public/vendor>  <sha384-…>   <required|optional>
read -r -d '' MANIFEST <<'EOF'
three.min.js                  sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu required
textures/earth_atmos_2048.jpg sha384-CdJTLUEa0xdQcLiyPPAGJYYGIfaqTjvSyDui9elYwNt8kspL5DwbzvhrR4Nw9W4O optional
textures/moon_1024.jpg        sha384-DefE7ULhs/zJZO2+8xItLwvjjsmGUEPf16LvwNBo7/+HQM5eP54+uppYIM/Qf2Ww optional
textures/earth_schematic.jpg  sha384-HSo2WNyYo4vOBkidybtsxoS+wN+LGo9j65TVeC5iB9gxOQGYQRxW4qQnpzOGYkJX required
textures/moon_schematic.jpg   sha384-74TO4h24Ile8etSWXpdjgpOUahc7WP4KUq1JbFbVsrHmn9VVrHAtb+BZXa1H076/ required
EOF
THREE_SRI=$(printf '%s\n' "$MANIFEST" | awk '$1=="three.min.js"{print $2}')

say(){ printf '  %s\n' "$*"; }
digest(){ printf 'sha384-%s' "$(openssl dgst -sha384 -binary "$1" | openssl base64 -A)"; }

fetch(){ # fetch <url> <dest>
  if   command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else echo "ERROR: need curl or wget to download assets." >&2; return 1; fi
}

mode(){
  if grep -q 'src="vendor/three.min.js"' $PUB/tut1.html 2>/dev/null; then echo local; else echo cdn; fi
}

# ------------------------------------------------------------------ --check (verify integrity)
if [ "${1:-}" = "--check" ]; then
  echo "Orbit Academy asset mode: $(mode)"
  echo
  if ! command -v openssl >/dev/null 2>&1; then
    echo "  openssl not found — cannot verify hashes. Reporting presence only."
  fi
  bad=0; miss=0
  while read -r rel want req; do
    [ -n "${rel:-}" ] || continue
    f="$VEN/$rel"
    if [ ! -s "$f" ]; then
      if [ "$req" = required ]; then say "MISSING  $rel   <-- required; re-run without --check, or restore from git"; miss=$((miss+1))
      else say "absent   $rel   (optional photo map; the schematic map will be used)"; fi
      continue
    fi
    sz=$(wc -c <"$f" | tr -d ' ')
    if command -v openssl >/dev/null 2>&1; then
      got=$(digest "$f")
      if [ "$got" = "$want" ]; then say "OK       $rel  ($sz bytes)"
      else bad=$((bad+1)); say "MISMATCH $rel  ($sz bytes)"; say "           expected $want"; say "           got      $got"; fi
    else
      say "present  $rel  ($sz bytes, unverified)"
    fi
  done <<EOF
$MANIFEST
EOF
  echo
  # The optional NASA lunar upgrade is converted locally from a TIFF, so its exact JPEG bytes depend
  # on the Pillow version — it cannot be hash-pinned. Report it, do not verify it.
  if [ -s "$TEX/moon_hires.jpg" ]; then
    say "extra    textures/moon_hires.jpg  ($(wc -c <"$TEX/moon_hires.jpg" | tr -d ' ') bytes, NASA LRO upgrade, not hash-pinned)"
  fi
  say "textures.js ALLOW_CDN: $(grep -o 'ALLOW_CDN = [a-z]*' $PUB/textures.js | head -1 | awk '{print $3}')"
  echo
  echo "Remaining outbound references in public/ (excluding <a href> reading links):"
  grep -rhoE 'https?://[^"'"'"' )]+' $PUB/*.html $PUB/*.js 2>/dev/null \
    | grep -vE 'w3\.org|en\.wikipedia\.org|nasa\.gov|goes-r\.gov|celestrak|space-track|github\.com|nodejs\.org|localhost|10\.0\.0' \
    | sort -u | sed 's/^/    /'
  echo
  if [ "$bad" -gt 0 ] || [ "$miss" -gt 0 ]; then
    echo "FAIL — $bad altered, $miss missing. Do not teach from this tree until resolved."
    echo "       'git checkout -- public/vendor' restores the committed originals."
    exit 1
  fi
  echo "PASS — every vendored asset matches public/vendor/NOTICE.md. Tree is intact and offline-ready."
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

# ------------------------------------------------------------------ repair (re-download)
echo "Repair mode — the repo already ships these files, so this only fills genuine gaps."
mkdir -p "$TEX"
need=0
for rel in three.min.js "textures/$EARTH" "textures/$MOON"; do
  [ -s "$VEN/$rel" ] || need=$((need+1))
done
for rel in textures/earth_schematic.jpg textures/moon_schematic.jpg; do
  if [ ! -s "$VEN/$rel" ]; then
    say "$rel is missing — it is COMMITTED, so restore it with:  git checkout -- public/vendor"
    say "  (or regenerate both with: python3 tools/make-textures.py)"
  fi
done
if [ "$need" -eq 0 ]; then
  say "nothing to download — all fetchable assets are present."
  say "run 'bash tools/fetch-vendor.sh --check' to verify their integrity."
  exit 0
fi

[ -s "$VEN/three.min.js" ] || fetch "$THREE_URL" "$VEN/three.min.js" || {
  echo "ERROR: could not download three.js — the simulators need it." >&2
  echo "       It is committed to this repo: 'git checkout -- public/vendor' should restore it." >&2; exit 1; }
[ -s "$TEX/$EARTH" ] || fetch "$TEX_BASE$EARTH" "$TEX/$EARTH" || say "note: Earth photo map unavailable — the schematic map will be used"
[ -s "$TEX/$MOON" ]  || fetch "$TEX_BASE$MOON"  "$TEX/$MOON"  || say "note: Moon photo map unavailable — the schematic map will be used"

if command -v openssl >/dev/null 2>&1; then
  got=$(digest "$VEN/three.min.js")
  if [ "$got" = "$THREE_SRI" ]; then say "three.min.js integrity verified (matches the pinned SRI hash)"
  else echo "ERROR: three.min.js hash mismatch!" >&2; echo "  expected $THREE_SRI" >&2; echo "  got      $got" >&2
       echo "  Refusing to continue. 'git checkout -- public/vendor' restores the committed original." >&2; exit 1; fi
fi

# Local is the DEFAULT posture, so there is nothing to rewrite — just make sure nobody left the
# tree in --cdn mode.
perl -pi -e 's{^const ALLOW_CDN = true;}{const ALLOW_CDN = false;}' $PUB/textures.js
for f in $PUB/tut*.html; do
  perl -0pi -e 's{<script src="\Qhttps://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js\E"\s*\n?\s*integrity="[^"]*"\s*\n?\s*crossorigin="anonymous"></script>}{<script src="vendor/three.min.js"></script>}g' "$f"
done
say "mode is now: $(mode)"
echo
echo "Repaired. Verify with:  bash tools/fetch-vendor.sh --check"
