'use strict';
// Provider: traces each Grok Bot leaves on this shared computer.
//
// Every bot has a folder in /home/box/agent-data/agents/<id>/ with a
// profile.json (name, title) and some local files. We read the profile's
// name only (to find the right folder) and the *modification times* of the
// files there. We never open conversations, attachments, settings or stores.
//
// What this can honestly tell us: "this bot last touched something on this
// computer N minutes ago". It can NOT tell us whether it is working, idle or
// chatting: conversations live on Grok Bot's servers, not on this computer,
// so this provider never sets `state`.
const fs = require('fs');
const path = require('path');

function newestMtime(dir, depth = 2) {
  let best = 0;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    try {
      if (e.isDirectory()) { if (depth > 0) best = Math.max(best, newestMtime(p, depth - 1)); }
      else best = Math.max(best, fs.statSync(p).mtimeMs);
    } catch {}
  }
  return best;
}

module.exports = function boxTraces({ root }) {
  let index = new Map();
  let indexedAt = 0;
  const reindex = (now) => {
    if (now - indexedAt < 60_000) return;
    indexedAt = now;
    index = new Map();
    let dirs = [];
    try { dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch {}
    for (const d of dirs) {
      try {
        const prof = JSON.parse(fs.readFileSync(path.join(root, d.name, 'profile.json'), 'utf8'));
        if (prof && typeof prof.name === 'string') index.set(prof.name.toLowerCase(), path.join(root, d.name));
      } catch {}
    }
  };
  return {
    id: 'box-traces',
    describe: `file modification times under ${root}/<bot>/ (no contents read)`,
    watchPaths: [],
    read(member, now) {
      reindex(now);
      const dir = index.get(member.name.toLowerCase());
      if (!dir) return null;
      const t = newestMtime(dir);
      return t ? { source: 'box traces', lastActiveAt: t, state: null, activity: null } : null;
    },
  };
};
