#!/usr/bin/env bash
# ---------------------------------------------------------------------------------------------
# release.sh — the whole release, in one command.
#
#   bash tools/release.sh "commit message"        # test → build → commit → push → GitHub release
#   bash tools/release.sh --dry-run "message"     # do everything EXCEPT commit, push and release
#   bash tools/release.sh --no-release "message"  # commit and push, but skip the GitHub release
#
# ORDER MATTERS, and it is the repo's own release gate (CLAUDE.md): the test suites and the security
# audit run FIRST, and nothing is committed or pushed unless they pass. A broken push to a course used
# for training is far more expensive than a failed script.
#
# WHAT IT DOES
#   1. Refuses to run if the working tree has nothing to release, or if student data would be committed.
#   2. Clears a stale .git/index.lock (a crashed earlier git leaves a 0-byte file that blocks
#      `git add` and `git commit` while `git push` still appears to work — a genuinely confusing
#      failure we hit repeatedly).
#   3. Runs every suite: functional, security, DoS, air-gap, vendor integrity, both run modes,
#      file:// robustness, multi-instructor, and the Module 8 cockpit flights.
#   4. Checks the docs were actually updated for this version (the release gate most often skipped).
#   5. Builds BOTH distributable zips and verifies each one boots from a clean unpack.
#   6. Commits, pushes, tags, and — if the GitHub CLI is installed — creates the release with both
#      zips attached, so the download links in README.md actually resolve.
#
# The zips are gitignored on purpose: they are build outputs, and 20 MB of binaries per release would
# bloat the repository forever. They belong to the GitHub Release, not to git history.
# ---------------------------------------------------------------------------------------------
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT=$(pwd)
# Where to write the zips. Defaults to the repo, but a read-only checkout can point elsewhere:
#   BUNDLE_DIR=/tmp bash tools/release.sh --dry-run
BUNDLE_DIR="${BUNDLE_DIR:-$ROOT}"

DRY=0; DO_RELEASE=1
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)    DRY=1; shift ;;
    --no-release) DO_RELEASE=0; shift ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) break ;;
  esac
done
MSG="${1:-}"

say(){ printf '\n\033[1m%s\033[0m\n' "$*"; }
ok(){  printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad(){ printf '  \033[31m✗\033[0m %s\n' "$*"; }
die(){ printf '\n\033[31mSTOPPED:\033[0m %s\n\n' "$*" >&2; exit 1; }

VER=$(grep -m1 -o 'ORBIT ACADEMY v[0-9.]*' server.js | grep -o '[0-9.]*' | head -1)
[ -n "$VER" ] || die "could not read the version from server.js"

say "ORBIT ACADEMY — release v$VER$([ "$DRY" = 1 ] && echo '  (DRY RUN)')"

# ---------------------------------------------------------------- 1. git sanity
say "1/6  Repository checks"

# A crashed git leaves a 0-byte index.lock. It blocks add/commit but NOT push, so you get a
# "successful" push of the previous commit and think the release worked. Clear it if it is stale.
if [ -f .git/index.lock ]; then
  if pgrep -x git >/dev/null 2>&1; then
    die "another git process is running. Quit it, then re-run."
  fi
  rm -f .git/index.lock && ok "cleared a stale .git/index.lock"
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not a git repository"

if git check-ignore -q academy_data.json; then ok "academy_data.json is gitignored (password hashes)"
else die "academy_data.json is NOT gitignored — it holds password hashes and student progress."; fi

if git ls-files --error-unmatch academy_data.json >/dev/null 2>&1; then
  die "academy_data.json is TRACKED by git. Remove it from the index before releasing:
       git rm --cached academy_data.json"
fi

if [ -z "$(git status --porcelain)" ]; then
  ok "working tree clean — nothing new to commit"
  CLEAN_TREE=1
else
  CLEAN_TREE=0
  echo "     $(git status --porcelain | wc -l | tr -d ' ') file(s) to release"
fi

if [ "$CLEAN_TREE" = "0" ] && [ -z "$MSG" ] && [ "$DRY" = "0" ]; then
  die "give a commit message:  bash tools/release.sh \"what changed\""
fi

# ---------------------------------------------------------------- 2. test suites
say "2/6  Test suites and security audit  (nothing is pushed if these fail)"
FAILED=0
if bash test/run.sh >/tmp/oa-run.log 2>&1; then
  grep -E '=== [0-9]+ passed' /tmp/oa-run.log | sed 's/^ */     /'
  ok "run.sh: all suites passed"
else
  bad "run.sh FAILED — last 25 lines:"; tail -25 /tmp/oa-run.log | sed 's/^/     /'; FAILED=1
fi

if node test/tut8-cockpit.verify.js >/tmp/oa-m8.log 2>&1; then ok "Module 8 cockpit: both missions flown"
else bad "Module 8 cockpit FAILED:"; tail -12 /tmp/oa-m8.log | sed 's/^/     /'; FAILED=1; fi

[ "$FAILED" = "0" ] || die "tests failed. Nothing was committed, pushed or built."

# ---------------------------------------------------------------- 3. doc gate
say "3/6  Documentation gate"
D=0
grep -q "v$VER" README.md            || { bad "README.md does not mention v$VER"; D=1; }
grep -q "v$VER" docs/CHANGELOG.md    || { bad "docs/CHANGELOG.md has no v$VER entry"; D=1; }
grep -q "v$VER" docs/SECURITY.md     || { bad "docs/SECURITY.md has no v$VER audit entry"; D=1; }
[ "$D" = "0" ] && ok "README, CHANGELOG and SECURITY all reference v$VER"

# The old version string lingering in docs is the classic missed step.
PREV=$(grep -o 'v[0-9]*\.[0-9]*' docs/CHANGELOG.md | sed -n '2p')
if [ -n "$PREV" ] && [ "$PREV" != "v$VER" ]; then
  HITS=$(grep -rl "$PREV" README.md docs/*.md public/*.html 2>/dev/null \
         | grep -v 'CHANGELOG\|SECURITY' | tr '\n' ' ')
  [ -n "$HITS" ] && echo "     note: previous version $PREV still appears in: $HITS"
fi
[ "$D" = "0" ] || die "update the docs for v$VER first (see CLAUDE.md — this is a release gate)."

# ---------------------------------------------------------------- 4. build zips
say "4/6  Building distributables"
FULL="$BUNDLE_DIR/orbit-academy-v$VER.zip"; SLIM="$BUNDLE_DIR/orbit-academy-v$VER-standalone.zip"
rm -f "$FULL" "$SLIM" 2>/dev/null
BUNDLE_DIR="$BUNDLE_DIR" bash tools/make-bundle.sh           >/tmp/oa-b1.log 2>&1 || { tail -20 /tmp/oa-b1.log; die "full bundle build failed"; }
BUNDLE_DIR="$BUNDLE_DIR" bash tools/make-bundle.sh --vanilla >/tmp/oa-b2.log 2>&1 || { tail -20 /tmp/oa-b2.log; die "standalone bundle build failed"; }
for z in "$FULL" "$SLIM"; do [ -s "$z" ] || die "expected $z but it was not created"; done
ok "$(basename "$FULL")  ($(du -h "$FULL" | cut -f1))"
ok "$(basename "$SLIM")  ($(du -h "$SLIM" | cut -f1))"

# Verify each zip unpacks and, for the full one, that the server actually serves the course. A
# distributable that does not boot is worse than no distributable.
say "     verifying the bundles unpack and run"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
for z in "$FULL" "$SLIM"; do
  d="$TMP/$(basename "$z" .zip)"; mkdir -p "$d"
  unzip -q "$z" -d "$d" || die "$z is not a readable zip"
  [ -s "$d/academy/START-HERE.html" ]      || die "$z has no START-HERE.html"
  [ -s "$d/academy/public/gallery.html" ]  || die "$z has no gallery.html"
  [ -e "$d/academy/academy_data.json" ]    && die "$z CONTAINS STUDENT DATA — aborting"
  ok "$(basename "$z"): unpacks, entry points present, no student data"
done
if command -v node >/dev/null 2>&1; then
  ( cd "$TMP/$(basename "$FULL" .zip)/academy" \
    && ORBIT_DATA="$TMP/probe.json" PORT=8199 node server.js >/dev/null 2>&1 & )
  sleep 2
  codes=""
  for p in /gallery.html /index.html /worksheet1.html /tut8.html /vendor/three.min.js; do
    codes="$codes$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:8199$p" 2>/dev/null) "
  done
  pkill -f "PORT=8199" >/dev/null 2>&1
  pkill -f "node server.js" >/dev/null 2>&1
  case "$codes" in
    *404*|*000*|*500*) bad "the built bundle did not serve everything: $codes"; die "bundle is not runnable" ;;
    *) ok "full bundle boots and serves the course ($codes)" ;;
  esac
fi

if [ "$DRY" = "1" ]; then
  say "DRY RUN — stopping here. Nothing committed, pushed or released."
  echo "  Built: $(basename "$FULL") and $(basename "$SLIM") in $BUNDLE_DIR"
  exit 0
fi

# ---------------------------------------------------------------- 5. commit + push
say "5/6  Commit and push"
if [ "$CLEAN_TREE" = "0" ]; then
  git add -A || die "git add failed"
  # the zips are gitignored; make sure that is still true so we never commit binaries
  if git diff --cached --name-only | grep -q '^orbit-academy-.*\.zip$'; then
    die "a bundle zip is staged — it should be gitignored. Check .gitignore."
  fi
  git commit -q -m "$MSG" || die "git commit failed"
  ok "committed: $(git log --oneline -1)"
else
  ok "nothing to commit"
fi

git push || die "git push failed — resolve it, then re-run (tests will simply pass again)"
ok "pushed to $(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo origin)"

# ---------------------------------------------------------------- 6. GitHub release
say "6/6  GitHub release v$VER"
if [ "$DO_RELEASE" = "0" ]; then
  ok "skipped (--no-release). Upload $FULL and $SLIM by hand if you want download links."
elif command -v gh >/dev/null 2>&1; then
  if gh release view "v$VER" >/dev/null 2>&1; then
    gh release upload "v$VER" "$FULL" "$SLIM" --clobber \
      && ok "replaced the assets on the existing release v$VER"
  else
    gh release create "v$VER" "$FULL" "$SLIM" \
      --title "Orbit Academy v$VER" \
      --notes "Download **$SLIM** for the course on its own (nothing to install), or **$FULL** to also get accounts, progress tracking and the instructor tools.

Unzip, then open \`START-HERE.html\`. See the [README](../blob/main/README.md) for per-OS steps." \
      && ok "created release v$VER with both zips attached"
  fi
  echo "     the README download links now resolve."
else
  cat <<EOF
     The GitHub CLI (gh) is not installed, so the release was not created.
     Either install it once:   brew install gh && gh auth login
     ...or do it by hand:
       1. Open the repository → Releases → "Draft a new release"
       2. Tag: v$VER    Title: Orbit Academy v$VER
       3. Attach: $FULL and $SLIM
       4. Publish. The README download links then resolve.
EOF
fi

say "Done — v$VER released."
echo "  Local zips left in place; they are gitignored, so delete them whenever you like."
