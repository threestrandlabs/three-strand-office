'use strict';
// Local-only server for the Three Strand Labs office. Adapted from
// whatsmyagentdoing's src/server.js (MIT, Charonyuu): same static files,
// loopback-only Host check and Server-Sent Events, minus the parts that touch
// the network (self-update, scene downloads).
const fs = require('fs');
const http = require('http');
const path = require('path');
const { TeamStatus } = require('./status');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/office.js': ['office.js', 'text/javascript; charset=utf-8'],
  '/office3d.js': ['office3d.js', 'text/javascript; charset=utf-8'],
  '/wing.js': ['wing.js', 'text/javascript; charset=utf-8'],
  '/cord.svg': ['cord.svg', 'image/svg+xml'],
};
const TYPES = { '.js': 'text/javascript; charset=utf-8', '.glb': 'model/gltf-binary', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const ASSETS = path.join(ROOT, 'assets');

function serveFile(res, root, rel) {
  const file = path.normalize(path.join(root, rel));
  const type = TYPES[path.extname(file)];
  if (!type || !file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

const status = new TeamStatus().start();
const snapshot = () => ({ now: Date.now(), lang: 'en', providers: status.providers(), sessions: status.sessions() });

const clients = new Set();
let last = '';
const push = (force) => {
  const body = JSON.stringify(snapshot());
  const sig = body.replace(/^\{"now":\d+,/, '{');
  if (!force && sig === last) return;
  last = sig;
  for (const res of clients) res.write(`data: ${body}\n\n`);
};
status.on('change', () => setTimeout(() => push(false), 200));
setInterval(() => push(false), 10_000).unref();
setInterval(() => { for (const res of clients) res.write(': ping\n\n'); }, 20_000).unref();

const server = http.createServer((req, res) => {
  const host = String(req.headers.host || '').replace(/:\d+$/, '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) { res.writeHead(403).end(); return; }
  const url = new URL(req.url, 'http://localhost');
  if (STATIC[url.pathname]) {
    const [file, type] = STATIC[url.pathname];
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    fs.createReadStream(path.join(PUBLIC, file)).pipe(res);
  } else if (url.pathname.startsWith('/assets/')) {
    serveFile(res, ASSETS, decodeURIComponent(url.pathname.slice('/assets/'.length)));
  } else if (url.pathname === '/api/scenes') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ installed: [], available: [] }));
  } else if (url.pathname === '/api/sessions') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(snapshot()));
  } else if (url.pathname === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else {
    res.writeHead(404).end();
  }
});

const port = Number(process.env.PORT || process.argv[2] || 4646);
server.listen(port, '127.0.0.1', () => console.log(`Three Strand Labs office: http://localhost:${port}`));
