#!/bin/bash
# =====================================================================
#  ORBIT ACADEMY launcher (macOS) — double-click this file to start.
#  It checks that Node.js is installed, starts the course server, and
#  opens your browser to it. Close the window (or Ctrl-C) to stop.
#
#  If macOS blocks it the first time ("unidentified developer"):
#  right-click the file → Open → Open.
# =====================================================================
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "  Node.js is not installed."
  echo
  echo "  1. Your browser is opening https://nodejs.org — download the"
  echo "     green “LTS” installer and run it."
  echo "  2. Then double-click start-academy.command again."
  echo
  open "https://nodejs.org"
  read -n1 -s -p "  (press any key to close)"; echo
  exit 1
fi

echo
echo "  ORBIT ACADEMY starting at http://localhost:8080"
echo "  Your browser will open in a moment."
echo "  KEEP THIS WINDOW OPEN — closing it (or Ctrl-C) stops the server."
echo
( sleep 1.5; open "http://localhost:8080" ) &
exec node server.js
