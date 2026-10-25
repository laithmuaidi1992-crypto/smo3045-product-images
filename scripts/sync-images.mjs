// Mirrors the 200px product thumbnails from Supabase storage into orders-app/img/<product id>.jpg so the
// web app serves them from Netlify's CDN (Supabase storage misses cost ~1.8s per picture from Jordan).
// Also writes orders-app/img/manifest.json: { product id: storage path } for every local copy.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const SB_URL = "https://oxrqkgbbccstbetxpnsn.supabase.co";
const SB_KEY = "sb_publishable_ZZTqt5iEvQBsDIomZCIVQw_bvcaJ5_g";
const OUT = "orders-app/img";
await mkdir(OUT, { recursive: true });

// Supabase sits behind Cloudflare; an occasional 5xx HTML page (gateway hiccup) must not fail the whole run — retry with backoff.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
async function fetchRetry(url, init, tries = 5) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      const body = await res.text();
      last = new Error(`HTTP ${res.status}: ${body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)}`);
      if (res.status < 500 && res.status !== 429) throw last; // a real client error — don't retry
    } catch (e) { last = e; if (!/HTTP (5\d\d|429)/.test(String(e)) && !(e instanceof TypeError)) throw e; }
    await sleep(Math.min(30000, 1500 * 2 ** i));
  }
  throw last;
}
const r = await fetchRetry(`${SB_URL}/rest/v1/rpc/orders_app_sm_list`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" }, body: "{}" });
const list = await r.json(); // [[id, path], ...]
console.log(`${list.length} pictures in storage`);

// remember which storage path each local file came from, so a re-chosen picture is refreshed
const mapFile = join(OUT, ".sources.json");
let sources = {};
try { sources = JSON.parse(await readFile(mapFile, "utf8")); } catch {}

const exists = async (f) => { try { await access(f); return true; } catch { return false; } };
const todo = [];
for (const [id, path] of list) {
  if (!/^[\w.-]+$/.test(id)) continue; // ids are plain tokens; anything else is skipped rather than written to disk
  const f = join(OUT, `${id}.jpg`);
  if (sources[id] !== path || !(await exists(f))) todo.push([id, path, f]);
}
console.log(`${todo.length} to download`);

let done = 0, failed = 0;
const worker = async () => {
  while (todo.length) {
    const [id, path, f] = todo.shift();
    try {
      const res = await fetchRetry(`${SB_URL}/storage/v1/object/public/product-images/${encodeURIComponent(path)}`, undefined, 3);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) throw new Error("too small");
      await writeFile(f, buf); sources[id] = path; done++;
    } catch (e) { failed++; console.log(`  ${id}: ${e.message}`); }
  }
};
await Promise.all(Array.from({ length: 16 }, worker));
await writeFile(mapFile, JSON.stringify(sources));
// manifest: { product id: storage path } — the app uses the path as a cache-busting version for img/<id>.jpg
const ids = Object.keys(sources).sort();
await writeFile(join(OUT, "manifest.json"), JSON.stringify(Object.fromEntries(ids.map((id) => [id, sources[id]]))));
console.log(`downloaded ${done}, failed ${failed}, ${ids.length} local pictures in manifest`);
