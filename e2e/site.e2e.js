// End-to-end tests: a real browser clicks through the site like a visitor, with the AI APIs faked.
// Run: npm run test:e2e   (CHROME_PATH=/path/to/chrome to use a local browser)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const SITE = path.resolve('site');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.png': 'image/png' };

// Fake AI answers (the real APIs are tested in test/*.test.js)
function fakeApi(url, body) {
  if (url === '/api/chat') {
    const q = body.messages.at(-1).content;
    if (/book|לקבוע/i.test(q)) return { reply: 'Thanks! The team will call you to confirm.', card: { type: 'booking', mode: body.mode, name: 'Noa', phone: '050-1234567', service: 'Family law', time: 'Sunday', notes: '' } };
    return { reply: 'This is exactly what Amir builds. Try the demo: https://portfolio-amirrahm.vercel.app/legal/' };
  }
  if (url === '/api/legal') {
    if (body.action === 'ask') return { answer: 'המוכר משלם מס שבח.', refs: [{ doc: 'contract', quote: 'מס שבח, ככל שיחול, ישולם על ידי המוכר', verified: true }] };
    return {
      summary: 'עסקת מכר דירה בנהריה.',
      issues: [{ severity: 'high', title: 'הערת אזהרה לצד שלישי', detail: 'd', action: 'a', refs: [{ doc: 'tabu', quote: 'שם המוטב: כהן שלמה', verified: true }] }],
      fields: [{ label: 'תמורה', value: '1,850,000', refs: [{ doc: 'contract', quote: 'היא 1,850,000 ש"ח', verified: true }, { doc: 'contract', quote: 'לא קיים', verified: false }] }],
    };
  }
}

let server, base, browser;
before(async () => {
  server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    if (url.startsWith('/api/')) {
      let b = ''; req.on('data', (c) => (b += c));
      req.on('end', () => setTimeout(() => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(fakeApi(url, JSON.parse(b || '{}')))); }, 150));
      return;
    }
    let f = path.join(SITE, url); if (url.endsWith('/')) f = path.join(f, 'index.html');
    if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
});
after(async () => { await browser?.close(); server?.close(); });

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1366, height: 900 } };
async function open(url, device) {
  const ctx = await browser.newContext(device);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('JS error: ' + e.message));
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
  await page.goto(base + url);
  await page.evaluate(() => { try { sessionStorage.setItem('introSeen', '1'); } catch {} document.querySelectorAll('.rv').forEach((e) => e.classList.add('in')); });
  return { page, problems, close: () => ctx.close() };
}
const idle = (page) => page.waitForFunction(() => !document.querySelector('.typing') && !document.getElementById('aiSend')?.disabled);

for (const [name, device] of [['desktop', DESK], ['phone', PHONE]]) {
  for (const url of ['/', '/he/', '/legal/']) {
    test(`${url} on ${name}: loads cleanly and never scrolls sideways`, async () => {
      const { page, problems, close } = await open(url, device);
      await page.waitForTimeout(400);
      const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth }));
      assert.ok(sw <= vw + 1, `page is ${sw}px wide on a ${vw}px screen`);
      assert.deepEqual(problems, []);
      await close();
    });
  }
}

test('Hebrew page: RTL, language switch, nothing left in English in the header', async () => {
  const { page, close } = await open('/he/', DESK);
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.equal(await page.getAttribute('.lang-sw', 'href'), '/');
  assert.equal((await page.textContent('h1')).trim().startsWith('אתרים'), true);
  await close();
});

for (const [url, label] of [['/', 'English'], ['/he/', 'Hebrew']]) {
  test(`${label} chat: a demo booking shows the card and the reply stays in view (phone)`, async () => {
    const { page, problems, close } = await open(url, PHONE);
    await page.locator('#assistant').scrollIntoViewIfNeeded();
    await page.locator('#aiModes [data-mode=law]').click();
    await page.fill('#aiInput', url === '/' ? 'Please book an intro call' : 'אני רוצה לקבוע שיחה');
    await page.press('#aiInput', 'Enter');
    await idle(page);
    assert.equal(await page.locator('.req').count(), 1, 'booking card');
    const visible = await page.evaluate(() => { const l = document.getElementById('aiLog'); return l.scrollTop + l.clientHeight >= l.scrollHeight - 2; });
    assert.ok(visible, 'chat is scrolled to the latest message');
    await page.locator('#aiModes [data-mode=buildlab]').click();
    assert.equal(await page.locator('.req').count(), 0, 'each business keeps its own conversation');
    assert.deepEqual(problems, []);
    await close();
  });
}

test('chat links read left-to-right inside Hebrew text', async () => {
  const { page, close } = await open('/he/', PHONE);
  await page.locator('#assistant').scrollIntoViewIfNeeded();
  await page.fill('#aiInput', 'יש לי המון מסמכים'); await page.press('#aiInput', 'Enter'); await idle(page);
  const a = page.locator('#aiLog .msg.bot a').last();
  assert.equal(await a.textContent(), 'portfolio-amirrahm.vercel.app/legal');
  assert.equal(await a.evaluate((e) => getComputedStyle(e).direction), 'ltr');
  await close();
});

test('legal demo: review → red flags → click a source highlights it → ask the file', async () => {
  const { page, problems, close } = await open('/legal/', DESK);
  await page.click('#run');
  await page.waitForSelector('.summary');
  assert.equal(await page.locator('.issue.high').count(), 1);
  assert.equal(await page.locator('.ref.unv').count(), 1, 'unverified source is marked');
  await page.locator('.issue .ref').first().click();
  assert.equal(await page.textContent('#hl'), 'שם המוטב: כהן שלמה');
  await page.locator('#askChips button', { hasText: 'מס השבח' }).click();
  await page.waitForSelector('.qa .a:not(.wait)');
  assert.match(await page.textContent('.qa .a'), /מס שבח/);
  // adding your own document resets the old results
  await page.click('#addBtn'); await page.fill('#addName', 'חוזה'); await page.fill('#addText', 'הסכם שכירות לתקופה של 12 חודשים, דמי שכירות 5,000 ש"ח לחודש.');
  await page.click('#addForm button[type=submit]');
  assert.equal(await page.locator('#out').isHidden(), true);
  assert.deepEqual(problems, []);
  await close();
});
