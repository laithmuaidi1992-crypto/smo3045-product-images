// Mirrors the 200px product thumbnails from Supabase storage into orders-app/img/<product id>.jpg so the
// web app serves them from Netlify's CDN (Supabase storage misses cost ~1.8s per picture from Jordan).
// Also writes orders-app/img/manifest.json: { product id: storage path } for every local copy.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const SB_URL = "https://oxrqkgbbccstbetxpnsn.supabase.co";
const SB_KEY = "sb_publishable_ZZTqt5iEvQBsDIomZCIVQw_bvcaJ5_g";
const OUT = "orders-app/img";
await mkdir(OUT, { recursive: true });

const r = await fetch(`${SB_URL}/rest/v1/rpc/orders_app_sm_list`, { method: "POST", headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" }, body: "{}" });
if (!r.ok) throw new Error(`list ${r.status}: ${await r.text()}`);
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
      const res = await fetch(`${SB_URL}/storage/v1/object/public/product-images/${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
