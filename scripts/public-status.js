#!/usr/bin/env node
'use strict';
// Prints the PUBLIC status snapshot for the GitHub Pages copy of the office.
// It asks the same providers as the local server (src/status.js) and then keeps
// ONLY each bot's name and a coarse status. Nothing else leaves this computer:
// no check-in notes, no last-active times, no sources, no paths, no ids.
//
//   { "updatedAt": "2026-10-25T09:40:00.000Z",
//     "bots": [ { "name": "Crackers", "status": "working" }, ... ] }
//
// status is one of: working | chatting | on a break | unknown
const { TeamStatus } = require('../src/status');

const PUBLIC = { working: 'working', chatting: 'chatting', idle: 'on a break', unknown: 'unknown' };

function publicStatus(now = new Date()) {
  const team = new TeamStatus();
  const names = new Set(team.team.team.map((m) => m.name));
  const bots = team.sessions()
    .filter((s) => names.has(s.name))
    .map((s) => ({ name: String(s.name), status: PUBLIC[s.state] || 'unknown' }));
  return { updatedAt: now.toISOString(), bots };
}

module.exports = { publicStatus, PUBLIC };
if (require.main === module) process.stdout.write(JSON.stringify(publicStatus(), null, 2) + '\n');
