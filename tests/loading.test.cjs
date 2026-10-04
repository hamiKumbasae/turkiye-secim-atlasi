const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let browser;
before(async () => { browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined}); });
after(async () => { await browser?.close(); });

// Serve the real built page/data locally through routing. No third-party network or server needed.
async function setup(t, intercept = async () => false){
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const requests = [], errors = [];
  page.on('pageerror', e => errors.push(e.message));
  t.after(() => assert.deepEqual(errors, [], 'no uncaught browser errors'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if(url.hostname !== 'atlas.test') return route.abort();
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    requests.push(name);
    const serve = async () => route.fulfill({
      status: 200,
      contentType: name.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/json',
      body: await fs.readFile(path.join(root, name)),
    });
    if(await intercept(name, route, serve)) return;
    await serve();
  });
  await page.goto('http://atlas.test/');
  return {page, requests};
}
const ready = page => page.locator('#results[aria-busy="false"]').waitFor();
const year = (page, label) => page.locator('#yearPicker button').filter({hasText: new RegExp('^'+label+'$')}).click();
const activeYear = page => page.locator('#yearPicker .active').textContent();
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

test('initial load excludes neighborhood geometry and votes', async t => {
  const {page, requests} = await setup(t);
  await ready(page);
  assert.equal(await activeYear(page), '2023');
  assert(!requests.includes('geo/mahalle_geo.json'));
  assert(!requests.some(x => x.startsWith('data/mahalle_votes/')));
 });

test('startup network failure can be retried without reloading', async t => {
  let attempts = 0;
  const {page} = await setup(t, async (name, route) => {
    if(name === 'data/parties.json' && ++attempts === 1){ await route.abort('internetdisconnected'); return true; }
  });
  await page.locator('#retryLoad').waitFor();
  assert.equal(await page.locator('#results').getAttribute('aria-busy'), 'true');
  await page.locator('#retryLoad').click();
  await ready(page);
  assert.equal(attempts, 2);
 });

test('failed election request is evicted and retries recover', async t => {
  let attempts = 0;
  const {page} = await setup(t, async (name, route) => {
    if(name === 'data/elections/2018.json' && ++attempts === 1){ await route.abort('internetdisconnected'); return true; }
  });
  await ready(page); await year(page, '2018');
  await page.locator('#retryLoad').waitFor();
  assert.equal(await page.locator('#results').evaluate(el => el.inert), true);
  await page.locator('#retryLoad').click(); await ready(page);
  assert.equal(await activeYear(page), '2018'); assert.equal(attempts, 2);
 });

test('late historical geometry cannot overwrite the selected modern year', async t => {
  let release;
  const {page} = await setup(t, async (name, route, serve) => {
    if(name === 'geo/eras/era1950.geojson'){
      await new Promise(resolve => { release = resolve; }); await serve(); return true;
    }
  });
  await ready(page); await year(page, '1950');
  while(!release) await tick(page);
  await year(page, '2023'); await ready(page);
  const finished = page.waitForEvent('requestfinished', request => request.url().includes('era1950.geojson'));
  release(); await finished; await tick(page);
  // A subsequent render catches stale shared GEO even if the old request did not redraw immediately.
  await year(page, '2018'); await ready(page);
  assert.equal(await activeYear(page), '2018');
  assert.equal(await page.locator('#mapSvg path.geo-path').count(), 81);
 });

test('two years in the same era share an in-flight geometry request safely', async t => {
  let release, attempts = 0;
  const {page} = await setup(t, async (name, route, serve) => {
    // 1961 ve 1965 ayni il donemi (era1957_1965: Kaynarca Kocaeli'de)
    if(name === 'geo/eras/era1957_1965.geojson'){
      attempts++; await new Promise(resolve => { release = resolve; }); await serve(); return true;
    }
  });
  await ready(page); await year(page, '1961');
  while(!release) await tick(page);
  await year(page, '1965'); release(); await ready(page);
  assert.equal(await activeYear(page), '1965');
  assert.equal(await page.locator('#mapSvg path.geo-path').count(), 67);
  assert.equal(attempts, 1);
 });

test('district drilldown loads neighborhood geometry on demand and retries failures', async t => {
  let attempts = 0;
  const {page, requests} = await setup(t, async (name, route) => {
    if(name === 'geo/mahalle_geo.json' && ++attempts === 1){ await route.fulfill({status:503, body:'unavailable'}); return true; }
  });
  await ready(page);
  await page.locator('#mapSvg path[data-plaka="1"]').click();
  await page.locator('#dDistrictList [data-geom-id="TR-D-01-001"]').click();
  await page.locator('#retryLoad').waitFor();
  await page.locator('#retryLoad').click();
  await page.locator('#mapSvg path[data-mahalle-id]').first().waitFor();
  assert.equal(attempts, 2);
  assert(requests.includes('data/mahalle_votes/2023.json'));
 });

test('late neighborhood response cannot replace a newly selected election', async t => {
  let release;
  const {page, requests} = await setup(t, async (name, route, serve) => {
    if(name === 'data/mahalle_votes/2023.json'){
      await new Promise(resolve => { release = resolve; }); await serve(); return true;
    }
  });
  await ready(page);
  await page.locator('#mapSvg path[data-plaka="1"]').click();
  await page.locator('#dDistrictList [data-geom-id="TR-D-01-001"]').click();
  while(!release) await tick(page);
  await year(page, '2018'); await ready(page);
  release();
  await page.waitForResponse('**/geo/mahalle_geo.json*');
  await tick(page);
  assert.equal(await activeYear(page), '2018');
  assert.equal(await page.locator('#mapSvg path[data-mahalle-id]').count(), 0);
 });

test('failed historical geometry is requested again on retry', async t => {
  let attempts = 0;
  const {page} = await setup(t, async (name, route) => {
    if(name === 'geo/eras/era1950.geojson' && ++attempts === 1){ await route.abort(); return true; }
  });
  await ready(page); await year(page, '1950');
  await page.locator('#retryLoad').waitFor();
  await page.locator('#retryLoad').click(); await ready(page);
  assert.equal(await activeYear(page), '1950');
  assert.equal(await page.locator('#mapSvg path.geo-path').count(), 63);
  assert.equal(attempts, 2);
});

test('switching election type updates year choices while loading', async t => {
  let release;
  const {page} = await setup(t, async (name, route, serve) => {
    if(name === 'data/elections/2024yerel.json'){
      await new Promise(resolve => { release = resolve; }); await serve(); return true;
    }
  });
  await ready(page); await page.locator('#btnTurYerel').click();
  while(!release) await tick(page);
  assert.equal(await page.locator('#yearPicker button').first().textContent(), '2024');
  await year(page, '2019'); await ready(page);
  release(); await tick(page);
  assert.equal(await activeYear(page), '2019');
  assert.match(await page.locator('#tableTitle').textContent(), /2019/);
});

test('mobile viewport exposes retry and preserves controls after recovery', async t => {
  let attempts = 0;
  const {page} = await setup(t, async (name, route) => {
    if(name === 'data/elections/2018.json' && ++attempts === 1){ await route.abort(); return true; }
  });
  await page.setViewportSize({width:390, height:844});
  await ready(page); await year(page, '2018');
  await page.locator('#retryLoad').click(); await ready(page);
  assert.equal(await activeYear(page), '2018');
  assert.equal(await page.locator('#results').evaluate(el => el.inert), false);
});
