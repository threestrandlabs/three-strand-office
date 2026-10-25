'use strict';
// Provider: voluntary check-in files. The ONLY source that can say what a bot
// is actually doing. Any bot (or James) writes one small JSON per bot:
//
//   status/checkins/<Name>.json
//   { "state": "working" | "chatting" | "idle", "activity": "Building the office app", "at": "2026-10-25T17:20:00+08:00" }
//
// Use scripts/checkin.js to write one safely. We only ever read these three
// fields, clamp the activity to one short line, and treat a check-in older
// than STALE_MS as expired, so a forgotten "working" never lingers.
const fs = require('fs');
const path = require('path');

const STATES = new Set(['working', 'chatting', 'idle']);
const STALE_MS = 30 * 60_000;

function clean(text) {
  return String(text || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || null;
}

module.exports = function checkins({ dir }) {
  return {
    id: 'checkins',
    describe: `check-in files in ${dir} (expire after ${STALE_MS / 60_000} min)`,
    watchPaths: [dir],
    read(member, now) {
      const file = path.join(dir, `${member.name}.json`);
      let raw;
      try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
      const at = Date.parse(raw.at) || fs.statSync(file).mtimeMs;
      if (!STATES.has(raw.state) || !at) return null;
      const fresh = now - at < STALE_MS;
      return {
        source: 'check-in',
        lastActiveAt: at,
        // An expired check-in still tells us when they were last active.
        state: fresh ? raw.state : null,
        activity: fresh ? clean(raw.activity) : null,
      };
    },
  };
};
module.exports.STALE_MS = STALE_MS;
