#!/usr/bin/env bash
pkill -f "node src/server.js" && echo "Stopped." || echo "Not running."
