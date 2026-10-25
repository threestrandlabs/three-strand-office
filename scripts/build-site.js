#!/usr/bin/env node
'use strict';
// Builds the static GitHub Pages copy of the office into docs/.
// Same page and renderers as the local server, switched to "static" mode: it
// reads docs/status.json (names + coarse status only) and re-fetches it every
// 2 minutes instead of using the local server's live events.
//
//   node scripts/build-site.js        # then commit docs/ and push
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { publicStatus } = require('./public-status');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const cp = (from, to = from) => {
  const dst = path.join(OUT, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(path.join(ROOT, from), dst, { recursive: true });
};

// Keep an existing status.json so a rebuild doesn't publish a status change.
const statusFile = path.join(OUT, 'status.json');
const keepStatus = fs.existsSync(statusFile) ? fs.readFileSync(statusFile, 'utf8') : null;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
if (!html.includes('<html lang="en">')) throw new Error('index.html: <html lang="en"> not found');
// Build id: content hash of the page, scripts and roster. Baked into the page
// and written to version.json, so open tabs reload when a new build is live
// (GitHub Pages caches HTML/JS for 10 min).
const hash = crypto.createHash('sha256');
for (const f of ['public/index.html', 'public/office.js', 'public/wing.js', 'public/office3d.js', 'team.json']) hash.update(fs.readFileSync(path.join(ROOT, f)));
const BUILD = hash.digest('hex').slice(0, 12);
const page = html
  .replace('<html lang="en">', `<html lang="en" data-mode="static" data-build="${BUILD}">`)
  .replace('src="office.js"', `src="office.js?v=${BUILD}"`)
  .replace('src="wing.js"', `src="wing.js?v=${BUILD}"`)
  .replace("import('./office3d.js')", `import('./office3d.js?v=${BUILD}')`);
for (const s of [`office.js?v=${BUILD}`, `wing.js?v=${BUILD}`, `office3d.js?v=${BUILD}`]) if (!page.includes(s)) throw new Error('missing ' + s);
fs.writeFileSync(path.join(OUT, 'index.html'), page);
fs.writeFileSync(path.join(OUT, 'version.json'), JSON.stringify({ build: BUILD }) + '\n');
for (const f of ['office.js', 'wing.js', 'office3d.js', 'cord.svg']) cp(path.join('public', f), f);
cp('assets/kenney');
cp('assets/agents/grokbot.png');
cp('assets/avatars');
cp('LICENSE');

// Team roster: names, roles, colours and desk order only (same as team.json).
const team = JSON.parse(fs.readFileSync(path.join(ROOT, 'team.json'), 'utf8'));
const pub = {
  team: team.team.map(({ name, role, color, desk, avatar }) => ({ name, role, color, desk, avatar })),
  groupRoom: team.groupRoom,
};
fs.writeFileSync(path.join(OUT, 'team.json'), JSON.stringify(pub, null, 2) + '\n');
fs.writeFileSync(statusFile, keepStatus ?? JSON.stringify(publicStatus(), null, 2) + '\n');
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Built ${path.relative(ROOT, OUT)}/ (build ${BUILD})`);
