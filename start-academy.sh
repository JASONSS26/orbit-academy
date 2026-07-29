#!/bin/bash
# =====================================================================
#  ORBIT ACADEMY launcher (Linux) — run:  bash start-academy.sh
#
#  Checks for Node.js, starts the course server, opens your browser.
#  Close the terminal (or Ctrl-C) to stop it.
#
#  You do NOT need this file for the no-install mode: just open
#  public/gallery.html in a browser.
# =====================================================================
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  cat <<'MSG'

  Node.js is not installed — it is only needed for the tracked mode
  (accounts, saved progress, instructor roster).

  Install it with your package manager, for example:
      Debian/Ubuntu   sudo apt install nodejs
      Fedora/RHEL     sudo dnf install nodejs
      Arch            sudo pacman -S nodejs
      openSUSE        sudo zypper install nodejs
  ...or download the LTS build from https://nodejs.org

  NO INSTALL NEEDED? Open public/gallery.html in your browser instead.
  Every module works; progress saves in that browser.

MSG
  exit 1
fi

PORT="${PORT:-8080}"
echo
echo "  ORBIT ACADEMY starting at http://localhost:$PORT"
echo "  KEEP THIS TERMINAL OPEN — closing it (or Ctrl-C) stops the server."
echo
# xdg-open is the freedesktop standard; ignore failure on a headless box
( sleep 1.5; command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:$PORT" >/dev/null 2>&1 ) &
exec node server.js
