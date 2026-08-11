/**
 * Post-deploy smoke test.
 *
 * Verifies, against the *deployed* site (correct base path included):
 *   1. the app shell boots and React renders
 *   2. the games index and a sample of game files resolve (incl. CDN-offloaded ones)
 *   3. the proxy runtime files load and Scramjet can encode + fetch a URL
 *
 * Usage: SITE_URL=https://owner.github.io/repo/ node scripts/smoke-test.mjs
 */
import { chromium } from 'playwright';

const SITE = (process.env.SITE_URL || 'http://localhost:8080/').replace(/\/?$/, '/');
const SAMPLE_GAMES = 12;

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function head(url) {
  const res = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-1024' } });
  return res.status;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on('console', m => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 200)));

try {
  // 1. App shell
  const res = await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  record('app shell responds', res?.status() === 200, `HTTP ${res?.status()}`);
  await page.waitForSelector('#root *', { timeout: 30_000 });
  record('react renders', true);

  // 2. Runtime files under the deployed base path
  for (const file of ['sw.js', 'scramjet/scramjet.all.js', 'scramjet/scramjet.wasm.wasm', 'epoxy/index.mjs', 'baremux/worker.js']) {
    const status = await head(SITE + file);
    record(`runtime file ${file}`, status >= 200 && status < 400, `HTTP ${status}`);
  }

  // 3. Games index + sample of game bundles
  const indexRes = await fetch(SITE + 'games.json');
  record('games.json loads', indexRes.ok, `HTTP ${indexRes.status}`);
  const games = indexRes.ok ? await indexRes.json() : [];
  record('games.json non-empty', games.length > 0, `${games.length} entries`);

  const local = games.filter(g => !g.f.startsWith('http') && !g.f.startsWith('/__l5e/'));
  const offloaded = games.filter(g => g.f.startsWith('/__l5e/'));
  const pick = arr => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / SAMPLE_GAMES)) === 0).slice(0, SAMPLE_GAMES);

  for (const g of pick(local)) {
    const url = SITE + g.f.replace(/^\/+/, '');
    const status = await head(url);
    record(`game "${g.t}"`, status >= 200 && status < 400, `HTTP ${status} ${url}`);
  }
  for (const g of pick(offloaded).slice(0, 3)) {
    const url = `https://snoopy-web.lovable.app${g.f}`;
    const status = await head(url);
    record(`offloaded game "${g.t}"`, status >= 200 && status < 400, `HTTP ${status}`);
  }

  // 4. Proxy: boot Scramjet in the page and fetch through it
  const proxy = await page.evaluate(async () => {
    const BASE = new URL(document.baseURI).pathname;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `${BASE}scramjet/scramjet.all.js`;
        s.onload = resolve;
        s.onerror = () => reject(new Error('scramjet.all.js failed to load'));
        document.head.appendChild(s);
      });
      const { ScramjetController } = window.$scramjetLoadController();
      const controller = new ScramjetController({
        prefix: `${BASE}scramjet/service/`,
        files: {
          wasm: `${BASE}scramjet/scramjet.wasm.wasm`,
          all: `${BASE}scramjet/scramjet.all.js`,
          sync: `${BASE}scramjet/scramjet.sync.js`,
        },
      });
      const reg = await navigator.serviceWorker.register(`${BASE}sw.js`, { scope: BASE });
      await navigator.serviceWorker.ready;
       await controller.init();
       const { BareMuxConnection } = await import(`${BASE}baremux/index.mjs`);
       const conn = new BareMuxConnection(`${BASE}baremux/worker.js`);
       await conn.setTransport(`${BASE}epoxy/index.mjs`, [{ wisp: 'wss://wisp.mercurywork.shop/' }]);
      const encoded = controller.encodeUrl('https://example.com');
       return { ok: true, encoded, scope: reg.scope, controlled: Boolean(navigator.serviceWorker.controller) };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  });
  record('scramjet boots on deployed base path', proxy.ok, proxy.ok ? `prefix ok, sw scope ${proxy.scope}` : proxy.error);

  if (proxy.ok) {
    record('proxy encodes URL under base path', proxy.encoded.startsWith(new URL(SITE).pathname), proxy.encoded);
    record('service worker controls smoke-test page', proxy.controlled, proxy.scope);

    const targets = [
      'https://example.com',
      ...pick(local).slice(0, 8).map(g => new URL(g.f.replace(/^\/+/, ''), SITE).href),
    ];
    for (const target of targets) {
      const result = await page.evaluate(async targetUrl => {
        const BASE = new URL(document.baseURI).pathname;
        const { ScramjetController } = window.$scramjetLoadController();
        const controller = new ScramjetController({
          prefix: `${BASE}scramjet/service/`,
          files: {
            wasm: `${BASE}scramjet/scramjet.wasm.wasm`,
            all: `${BASE}scramjet/scramjet.all.js`,
            sync: `${BASE}scramjet/scramjet.sync.js`,
          },
        });
        await controller.init();
        const encoded = controller.encodeUrl(targetUrl);
        try {
          const response = await fetch(encoded);
          return { status: response.status, encoded };
        } catch (error) {
          return { status: 0, encoded, error: String(error?.message || error) };
        }
      }, target);
      const label = target === 'https://example.com' ? 'external request' : `game via proxy "${decodeURIComponent(target.split('/').pop() || '')}"`;
      record(label, result.status >= 200 && result.status < 400, `HTTP ${result.status} ${result.error || result.encoded}`);
    }
  }
} finally {
  await browser.close();
}

if (consoleErrors.length) console.log('\nConsole errors:\n' + consoleErrors.join('\n'));

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.error('Failed checks:\n' + failed.map(f => ` - ${f.name}: ${f.detail}`).join('\n'));
  process.exit(1);
}
