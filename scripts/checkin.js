#!/usr/bin/env node
'use strict';
// Write a coarse status check-in for one bot. Keep it to a few words and
// never put message contents, names of people outside the team, or secrets
// in it: the office shows it to anyone looking at the screen.
//
//   node scripts/checkin.js Crackers working "Building the office app"
//   node scripts/checkin.js Madeleine chatting
//   node scripts/checkin.js Cookies idle
const fs = require('fs');
const path = require('path');
const [name, state, ...words] = process.argv.slice(2);
const team = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'team.json'), 'utf8')).team.map((m) => m.name);
if (!team.includes(name) || !['working', 'chatting', 'idle'].includes(state)) {
  console.error(`usage: checkin.js <${team.join('|')}> <working|chatting|idle> [short activity]`);
  process.exit(1);
}
const dir = path.join(__dirname, '..', 'status', 'checkins');
fs.mkdirSync(dir, { recursive: true });
const rec = { state, activity: words.join(' ').slice(0, 60) || null, at: new Date().toISOString() };
const tmp = path.join(dir, `.${name}.json.tmp`);
fs.writeFileSync(tmp, JSON.stringify(rec) + '\n');
fs.renameSync(tmp, path.join(dir, `${name}.json`));
console.log(`${name}: ${state}${rec.activity ? ' · ' + rec.activity : ''}`);
