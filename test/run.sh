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
if [ $F -eq 0 ] && [ $S -eq 0 ] && [ $D -eq 0 ]; then echo "ALL SUITES PASSED ✅"; exit 0; else echo "SUITE FAILURES ❌ (func=$F sec=$S dos=$D)"; exit 1; fi
