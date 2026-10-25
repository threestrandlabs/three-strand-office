// node --experimental-websocket scripts/screenshot.js <url> <out.png> [waitMs] [w] [h]
// Headless Chrome via DevTools: load, wait (real time, so SSE pages work), screenshot.
const { spawn } = require('child_process');
const fs = require('fs');
const [url, out, wait = 12000, W = 1280, H = 1400] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  `--remote-debugging-port=${port}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(200); } }
  const tab = tabs.find((t) => t.type === 'page');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('console.error:', m.params.args.map((a) => a.value || a.description).join(' ')); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await sleep(+wait);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(r.result.data, 'base64'));
  console.log('wrote', out);
  chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
