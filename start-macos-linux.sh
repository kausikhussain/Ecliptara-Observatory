#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if command -v node >/dev/null 2>&1; then
    echo "Starting Ecliptara Observatory via Node.js..."
    exec node scripts/serve.js
elif command -v python3 >/dev/null 2>&1; then
    echo "Starting Ecliptara Observatory via Python 3..."
    exec python3 -m http.server 4173
elif command -v python >/dev/null 2>&1; then
    echo "Starting Ecliptara Observatory via Python..."
    exec python -m http.server 4173
else
    echo "Error: Neither Node.js nor Python is available."
    exit 1
fi
