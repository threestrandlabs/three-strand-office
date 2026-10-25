#!/usr/bin/env bash
# Start the office in the background on http://localhost:${PORT:-4646} (loopback only).
cd "$(dirname "$0")"
PORT="${PORT:-4646}"
if curl -fs "http://localhost:$PORT/api/sessions" >/dev/null 2>&1; then echo "Already running: http://localhost:$PORT"; exit 0; fi
PORT="$PORT" setsid nohup node src/server.js > office.log 2>&1 < /dev/null &
sleep 1; cat office.log
