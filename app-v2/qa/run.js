// Offline QA: serves the built app, answers the store RPCs from a catalog snapshot,
// walks the main flows on an iPhone-sized viewport and saves a screenshot per screen.
// usage: node qa/run.js <fixturesDir> <outDir>
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const FIX = process.argv[2], OUT = process.argv[3] || 'qa/out';
const DIST = path.join(__dirname, '../dist/app-v2/browser');
const IMG = path.join(__dirname, '../../orders-app/img');
fs.mkdirSync(OUT, { recursive: true });

const meta = JSON.parse(fs.readFileSync(path.join(FIX, 'catalog_meta.json')));
meta.settings = { ...(meta.settings || {}), store_open: true, store_phone: meta.settings?.store_phone || '0790000000' };
const pages = fs.readdirSync(FIX).filter(f => f.startsWith('products_')).sort().map(f => JSON.parse(fs.readFileSync(path.join(FIX, f))));
const all = pages.flat();
const orders = {};

function rpc(action, args) {
  switch (action) {
    case 'catalog_meta': return meta;
    case 'products_page': { const i = args.after ? all.findIndex(r => r[0] === args.after) + 1 : 0; return all.slice(i, i + 1000); }
    case 'place_order': {
      const o = { order_no: args.order_no, status: 'pending', total: args.total, items: args.items, created_at: new Date().toISOString(),
        customer_address: args.customer_address, customer_location_lat: args.lat, customer_location_lng: args.lng, customer_notes: args.notes };
      orders[o.order_no] = o; return { order_no: o.order_no };
    }
    case 'order_by_no': { const o = orders[args.order_no]; if (o && o._n === undefined) o._n = 0; return o || null; }
    case 'my_orders': return (args.nos || []).map(n => orders[n]).filter(Boolean);
    default: return { ok: true };
  }
}

const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  let f = u.startsWith('/img/') ? path.join(IMG, u.slice(5)) : path.join(DIST, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = u.startsWith('/img/') ? null : path.join(DIST, 'index.html');
  if (!f) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(4310, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ar-JO', timezoneId: 'Asia/Amman',
    geolocation: { latitude: 32.5502, longitude: 35.8571 }, permissions: ['geolocation'] });
  await ctx.route('**/rest/v1/rpc/orders_app', async route => {
    const { action, args } = JSON.parse(route.request().postData() || '{}');
    await new Promise(r => setTimeout(r, action === 'place_order' ? 700 : 120));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rpc(action, args || {})) });
  });
  await ctx.route(/tile\.openstreetmap\.org/, r => r.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(__dirname, 'tile.png')) }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  let n = 0;
  const shot = async (name, wait = 500) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`) }); console.log('shot', name); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(`STEP ${name}: ${e.message.split('\n')[0]}`); console.log('FAIL', name, e.message.split('\n')[0]); } };

  await page.goto('http://localhost:4310/');
  await shot('splash', 700);
  await step('home', async () => { await page.waitForSelector('app-product-card', { timeout: 15000 }); await shot('home', 1800); });
  await step('home-scroll', async () => { await page.evaluate(() => document.querySelector('ion-content')?.scrollToPoint?.(0, 900, 0)); await shot('home-scrolled', 900); });
  await step('add-from-home', async () => {
    const add = page.locator('app-product-card .add').first(); await add.click(); await page.waitForTimeout(250); await add.click().catch(() => {});
    await shot('home-added', 900);
  });
  await step('sheet', async () => { await page.locator('app-product-card .img, app-product-card img').nth(3).click(); await shot('product-sheet', 1100); await page.keyboard.press('Escape'); await page.waitForTimeout(500); });
  await step('aisles', async () => { await page.locator('ion-tab-button[tab="aisles"]').click(); await shot('aisles', 900); });
  await step('aisle', async () => { await page.locator('app-aisles a, app-aisles .row').first().click(); await shot('aisle', 1300); });
  await step('search', async () => {
    await page.goto('http://localhost:4310/search'); await page.waitForTimeout(2400);
    await page.keyboard.type('حليب', { delay: 60 }); await shot('search', 1200);
    const adds = page.locator('app-product-card .add'); const c = await adds.count();
    for (let i = 0; i < Math.min(c, 4); i++) await adds.nth(i).click();
  });
  await step('cart', async () => { await page.goto('http://localhost:4310/tabs/cart'); await shot('cart', 2600); await page.evaluate(() => document.querySelector('app-cart ion-content, ion-content')?.scrollToBottom?.(0)); await shot('cart-bottom', 700); });
  await step('welcome', async () => {
    await page.goto('http://localhost:4310/welcome?next=/address'); await page.waitForTimeout(2400);
    const inputs = page.locator('app-welcome input'); await inputs.nth(0).fill('0791234567'); await inputs.nth(1).fill('ليث المعيدي');
    await shot('welcome', 400); await page.locator('app-welcome button[type=submit], app-welcome .btn.primary').last().click();
  });
  await step('address', async () => {
    await page.waitForURL(/address/, { timeout: 5000 }); await page.waitForTimeout(1500);
    await page.locator('app-address .chip').first().click(); await page.locator('app-address input[name=street]').fill('شارع الجامعة، بناية 12');
    await shot('address', 600); await page.locator('app-address ion-footer .btn').click();
  });
  await step('checkout', async () => {
    await page.goto('http://localhost:4310/checkout'); await page.waitForTimeout(2600);
    await shot('checkout-top', 300); await page.locator('.seg button').nth(1).click(); await page.locator('.pays .pay').nth(2).click(); await shot('checkout', 600);
    const knob = page.locator('app-swipe-confirm .knob'); const b = await knob.boundingBox(); const tb = await page.locator('app-swipe-confirm .track').boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(b.x + b.width / 2 - (tb.width * i / 12), b.y + b.height / 2);
    await shot('checkout-swiping', 50); await page.mouse.up();
  });
  await step('placed', async () => { await page.waitForURL(/placed/, { timeout: 6000 }); await shot('placed-printing', 1300); await shot('placed', 2400); });
  await step('track', async () => {
    const no = page.url().split('/order/')[1].split('/')[0]; orders[no].status = 'out_for_delivery'; orders[no].assigned_driver = 'أبو أحمد';
    await page.locator('.cta .btn.red').click(); await shot('track', 2000);
    orders[no].status = 'delivered';
  });
  await step('orders', async () => { await page.goto('http://localhost:4310/tabs/orders'); await shot('orders', 2800); });
  await step('account', async () => { await page.goto('http://localhost:4310/tabs/account'); await shot('account', 2600); });
  await step('empty-cart', async () => { await page.goto('http://localhost:4310/tabs/cart'); await shot('cart-empty', 2600); });

  fs.writeFileSync(path.join(OUT, 'errors.txt'), errors.join('\n'));
  console.log('ERRORS', errors.length, '\n' + errors.slice(0, 30).join('\n'));
  await browser.close(); server.close();
})();
