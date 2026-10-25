#!/usr/bin/env bash
# Refresh the public status on GitHub Pages.
# Regenerates docs/status.json from the same providers the local server uses
# (names + coarse status only), and commits + pushes it ONLY if a bot's status
# changed. Safe to run on a schedule (e.g. every 5 minutes).
#
#   ./scripts/publish-status.sh            # publish if changed
#   ./scripts/publish-status.sh --dry-run  # show what would be published
set -euo pipefail
cd "$(dirname "$0")/.."
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1

exec 9>.publish-status.lock
flock -n 9 || { echo "Another publish is running; skipping."; exit 0; }

TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
node scripts/public-status.js > "$TMP"

# Safety check: only {updatedAt, bots:[{name,status}]}, known names and states.
node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const team = new Set(JSON.parse(fs.readFileSync("team.json", "utf8")).team.map((m) => m.name));
const ok = new Set(["working", "chatting", "on a break", "unknown"]);
const keys = (o) => Object.keys(o).sort().join(",");
if (keys(s) !== "bots,updatedAt" || isNaN(Date.parse(s.updatedAt)) || !Array.isArray(s.bots)) throw new Error("bad shape");
for (const b of s.bots) if (keys(b) !== "name,status" || !team.has(b.name) || !ok.has(b.status)) throw new Error("bad entry " + JSON.stringify(b));
' "$TMP"

same() { node -e '
const fs = require("fs");
const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")), b = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
process.exit(JSON.stringify(a.bots) === JSON.stringify(b.bots) ? 0 : 1);' "$1" "$2" 2>/dev/null; }

if [[ -f docs/status.json ]] && same "$TMP" docs/status.json; then
  echo "No change ($(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).bots.map(b=>b.name+": "+b.status).join(", "))' "$TMP")). Nothing pushed."
  exit 0
fi
if (( DRY )); then echo "Would publish:"; cat "$TMP"; exit 0; fi

git pull --quiet --rebase --autostash origin main || echo "warning: could not pull; pushing anyway"
cp "$TMP" docs/status.json
git add docs/status.json
git commit --quiet -m "Status update $(TZ=Asia/Singapore date '+%a %d %b %H:%M SGT')" -- docs/status.json
git push --quiet origin HEAD:main
echo "Published: $(node -e 'console.log(JSON.parse(require("fs").readFileSync("docs/status.json")).bots.map(b=>b.name+": "+b.status).join(", "))')"
