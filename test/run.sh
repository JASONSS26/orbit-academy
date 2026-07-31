#!/usr/bin/env bash
# Run the full test suite: starts a fresh server on a temp data file, runs functional +
# security tests + a DoS body-size check, then cleans up. Zero dependencies.
set -u
cd "$(dirname "$0")/.."
PORT=${PORT:-8099}
export PORT
# each suite gets a FRESH server + isolated data file (so "first user = instructor" holds,
# and tests never touch real user data)
start_server(){ local data="$1"; ORBIT_DATA="$data" node server.js >/tmp/orbit_test_server.log 2>&1 & echo $!;
  for i in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$PORT/" && break; sleep 0.2; done; }

D1=$(mktemp -d)/f.json; SRV=$(start_server "$D1")
trap 'kill $SRV 2>/dev/null' EXIT
echo "### functional suite (fresh server on :$PORT)"
node test/functional.test.js; F=$?
kill $SRV 2>/dev/null; sleep 0.5

D2=$(mktemp -d)/s.json; SRV=$(start_server "$D2")
echo "### security suite (fresh server on :$PORT)"
node test/security.test.js; S=$?

echo "=== DoS: 300KB body must not crash the server ==="
python3 -c "print('{\"name\":\"'+'x'*300000+'\",\"email\":\"a@b.com\",\"password\":\"orbits123\"}')" \
  | curl -s -o /dev/null -X POST -H content-type:application/json --data @- "http://localhost:$PORT/api/register" 2>/dev/null
sleep 0.3
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/")
if [ "$HEALTH" = "200" ]; then echo "  ✓ server alive after oversized body"; D=0; else echo "  ✗ FAIL server unhealthy ($HEALTH)"; D=1; fi

echo
echo "### air-gap suite (no server needed)"
node test/no-external-calls.test.js; N=$?

echo; echo "--- Module 3: sun-synchronous must be reachable ---"
node test/tut3-sunsync.test.js; SS=$?

echo; echo "--- sliders accept typed values (all sims) ---"
node test/sliders.test.js; SL=$?

echo; echo "--- quiz quality ratchet (longest-answer heuristic) ---"
node test/quiz-quality.test.js; QQ=$?

echo; echo "--- planet surface sampling + filtering ---"
node test/window-sampling.test.js; WS=$?
node test/window-resolution.test.js; WR=$?

echo; echo "--- planet textures must load from a file:// URL ---"
node test/texture-loading.test.js; TX=$?

echo; echo "--- Module 8 burn cue + warp ease-in ---"
node test/tut8-cue.test.js; C8=$?
node test/tut8-speed-dial.test.js; SD=$?
node test/tut8-rendezvous-orders.test.js; RV=$?

echo; echo "--- multiple instructors (role gates + last-instructor guard) ---"
node test/multi-instructor.test.js; MI=$?

echo; echo "--- both run modes: server-tracked AND bare gallery, worksheets interactive ---"
node test/two-run-modes.test.js; M=$?

echo; echo "--- worksheet boot, STRICT DOM (missing element = null, as in a real browser) ---"
node test/worksheet-boot.test.js; WB=$?

echo; echo "--- simulator boot: every sim runs against the REAL three.js and renders frames ---"
node test/sim-boot.test.js; SB=$?

echo; echo "--- module 5 lead angle + module 7 radar physics ---"
node test/tut5-lead-angle.test.js; LA=$?
node test/tut7-radar.test.js; RD=$?
node test/tut6-views.test.js; V6=$?

echo; echo "--- file:// robustness (the ZIP-and-double-click install path) ---"
node test/file-protocol.test.js; F2=$?

echo; echo "--- vendored asset integrity (every third-party byte is committed; verify it) ---"
bash tools/fetch-vendor.sh --check >/tmp/oa-vendor.$$ 2>&1; V=$?
tail -n 12 /tmp/oa-vendor.$$ | sed 's/^/  /'; rm -f /tmp/oa-vendor.$$

echo
if [ $F -eq 0 ] && [ $S -eq 0 ] && [ $D -eq 0 ] && [ $N -eq 0 ] && [ $V -eq 0 ] && [ $F2 -eq 0 ] && [ $M -eq 0 ] && [ $MI -eq 0 ] && [ $C8 -eq 0 ] && [ $TX -eq 0 ] && [ $WS -eq 0 ] && [ $SD -eq 0 ] && [ $WR -eq 0 ] && [ $QQ -eq 0 ] && [ $SS -eq 0 ] && [ $RV -eq 0 ] && [ $SL -eq 0 ] && [ $WB -eq 0 ] && [ $SB -eq 0 ] && [ $LA -eq 0 ] && [ $RD -eq 0 ] && [ $V6 -eq 0 ]; then echo "ALL SUITES PASSED ✅"; exit 0
else echo "SUITE FAILURES ❌ (func=$F sec=$S dos=$D airgap=$N vendor=$V file=$F2 modes=$M multi=$MI cue=$C8 tex=$TX samp=$WS dial=$SD res=$WR quiz=$QQ sso=$SS rv=$RV sliders=$SL wsboot=$WB simboot=$SB lead=$LA radar=$RD t6views=$V6)"; exit 1; fi
