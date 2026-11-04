// App Store screenshots (6.9" = 1320x2868) from the LIVE site, rendered as the iOS app renders it.
// Real catalog, prices and images. Only the demo customer's own order/track data is mocked,
// so no real customer data appears and nothing is written to the store's database.
// usage: node store-screenshots.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const SITE = process.env.SITE || 'https://3045orderapp.netlify.app/';
const out = process.argv[2] || 'screenshots';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, locale: 'ar-JO', timezoneId: 'Asia/Amman',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    geolocation: { latitude: 32.5556, longitude: 35.85 }, permissions: ['geolocation'],
  });
  await ctx.addInitScript(() => {
    const mk = () => new Proxy({}, { get: () => async () => ({ display: 'granted' }) });
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Haptics: mk(), LocalNotifications: mk(), StatusBar: mk(), SplashScreen: mk() } };
    localStorage.setItem('smo_customer', JSON.stringify({ phone: '0790000000', name: 'ليث', address: { area: 'الحصن', street: 'شارع الجامعة', lat: 32.5556, lng: 35.85 } }));
    localStorage.setItem('smo_orders', JSON.stringify(['ON-2611-0142']));
    localStorage.setItem('smo_view', '"grid"');
    localStorage.setItem('smo_ai_consent', 'no');
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  let demoOrder = null;
  await p.route('**/rest/v1/rpc/orders_app', async r => {
    const body = JSON.parse(r.request().postData() || '{}');
    if (['seen', 'register', 'place_order', 'delete_account'].includes(body.action)) return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (body.action === 'my_orders') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(demoOrder ? [demoOrder, { ...demoOrder, order_no: 'ON-2610-0977', status: 'delivered', created_at: new Date(Date.now() - 3 * 864e5).toISOString() }] : []) });
    if (body.action === 'order_by_no') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(demoOrder) });
    return r.fallback();
  });
  const shot = async (n, wait = 3000) => { await p.waitForTimeout(wait); await p.screenshot({ path: `${out}/${n}.png` }); console.log('saved', n); };

  await p.goto(SITE + '#home', { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__dbg && window.__dbg.S.ready, null, { timeout: 90000 });
  // demo cart from the store's real best sellers that have photos
  const picked = await p.evaluate(() => {
    const S = window.__dbg.S; const all = [...S.byId.values()].filter(x => x.sm && x.price >= 0.4 && x.price <= 6);
    const want = [/^حليب/, /^(أرز|ارز)/, /^زيت (ذرة|دوار|نباتي|قلي|زيتون)/, /^(معكرونة|معكرونه|مكرونة|سباغيتي)/, /^سكر/, /^(لبنة|جبنة)/];
    const out = []; for (const re of want) { const x = all.find(p => re.test(p.name) && !out.includes(p)); if (x) out.push(x); if (out.length >= 5) break; }
    const qty = [2, 1, 3, 1, 2]; S.cart = {}; out.forEach((x, i) => S.cart[x.id] = qty[i]);
    try { localStorage.setItem('smo_cart', JSON.stringify(S.cart)) } catch {}
    window.__dbg.render();
    return out.map((x, i) => ({ id: x.id, name: x.name, price: x.price, qty: qty[i] }));
  });
  const now = Date.now(); const total = picked.reduce((a, x) => a + x.price * x.qty, 0) + 0.5;
  demoOrder = { id: 'demo', order_no: 'ON-2611-0142', status: 'out_for_delivery', total: Math.round(total * 100) / 100,
    items: picked.map(x => ({ id: x.id, name: x.name, price: x.price, qty: x.qty, line: x.price * x.qty })),
    created_at: new Date(now - 22 * 60e3).toISOString(), updated_at: new Date(now - 6 * 60e3).toISOString(), assigned_driver: 'محمد',
    customer_address: 'الحصن، شارع الجامعة', customer_location_lat: 32.5556, customer_location_lng: 35.85 };

  await p.evaluate(() => window.scrollTo(0, 0)); await shot('1-home', 6000);
  await p.evaluate(() => window.__dbg.go('cats')); await shot('2-categories', 5000);
  await p.evaluate(() => window.__dbg.go('cart')); await shot('3-cart', 5000);
  await p.evaluate(() => { const S = window.__dbg.S; const c = S.cats.find(c => !c.parent && /حلويات/.test(c.name)) || S.cats.find(c => !c.parent);
    S.q = ''; S.catParent = c.id; S.catSub = null; S.shown = 60; window.__dbg.go('category'); window.scrollTo(0, 0); });
  await shot('4-products', 7000);
  await p.evaluate(() => window.__dbg.go('track', { order_no: 'ON-2611-0142' })); await shot('5-tracking', 6000);
  await p.evaluate(() => window.__dbg.go('account')); await shot('6-account', 5000);
  console.log('page errors:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
