#!/usr/bin/env bash
# fetch-moon-hires.sh — kept as the name already referenced in the docs. The Moon and Earth upgrades
# are handled by one script now, since they are the same job with different URLs.
exec bash "$(dirname "$0")/fetch-hires.sh" "${1:-moon}"
