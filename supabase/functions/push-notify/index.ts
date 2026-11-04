// push-notify: sends an APNs push to every iOS device of a customer when their order status changes.
// Called by the DB trigger notify_order_status_push() with header x-hook-key (shared secret in job_secrets).
// Needs the Supabase Edge Function secret APNS_KEY_P8 (contents of the APNs .p8 key, Key ID below).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const KEY_ID = "X6KY475TGB";
const TEAM_ID = "3HBDN2WK2S";
const TOPIC = "com.market3045.app";
const APNS = "https://api.push.apple.com"; // TestFlight + App Store builds use production APNs

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

const MSG: Record<string, (o: Req) => [string, string]> = {
  confirmed: (o) => ["تم قبول طلبك ✅", `طلبك ${o.order_no} مؤكد وسنبدأ بتجهيزه.`],
  preparing: (o) => ["طلبك قيد التجهيز 🧺", `نجهّز طلبك ${o.order_no} الآن.`],
  ready: (o) => ["طلبك جاهز", `طلبك ${o.order_no} جاهز وبانتظار المندوب.`],
  out_for_delivery: (o) => ["المندوب في الطريق 🛵", o.driver ? `${o.driver} في الطريق إليك بطلبك ${o.order_no}.` : `طلبك ${o.order_no} في الطريق إليك.`],
  delivered: (o) => ["تم التسليم 🎉", `شكرًا لطلبك من 3045 Market. بالهناء!`],
  cancelled: (o) => ["أُلغي طلبك", o.reason ? `طلبك ${o.order_no}: ${o.reason}` : `أُلغي طلبك ${o.order_no}. تواصل معنا لأي استفسار.`],
};
type Req = { phone: string; order_no: string; status: string; reason?: string | null; driver?: string | null };

// ---- APNs provider token (ES256 JWT), cached ~50 min ----
let cached: { jwt: string; at: number } | null = null;
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ""; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
};
async function providerToken(): Promise<string> {
  if (cached && Date.now() - cached.at < 50 * 60_000) return cached.jwt;
  const pem = Deno.env.get("APNS_KEY_P8") ?? "";
  if (!pem.includes("PRIVATE KEY")) throw new Error("APNS_KEY_P8 not set");
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64url(JSON.stringify({ alg: "ES256", kid: KEY_ID }));
  const body = b64url(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`));
  cached = { jwt: `${head}.${body}.${b64url(sig)}`, at: Date.now() };
  return cached.jwt;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const { data: s } = await sb.from("job_secrets").select("value").eq("name", "push_hook_key").maybeSingle();
  if (!s?.value || req.headers.get("x-hook-key") !== s.value) return json({ error: "forbidden" }, 403);
  let o: Req; try { o = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const make = MSG[o.status]; if (!make) return json({ skipped: o.status });
  const [title, body] = make(o);
  const { data: rows } = await sb.from("push_tokens").select("token").eq("phone", o.phone);
  if (!rows?.length) return json({ sent: 0 });
  let jwt: string; try { jwt = await providerToken(); } catch (e) { return json({ error: String(e) }, 500); }
  const payload = JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, order_no: o.order_no, status: o.status });
  const results = await Promise.all(rows.map(async ({ token }) => {
    const r = await fetch(`${APNS}/3/device/${token}`, {
      method: "POST", body: payload,
      headers: { authorization: `bearer ${jwt}`, "apns-topic": TOPIC, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" },
    });
    if (r.status === 410 || r.status === 400) {
      const t = await r.text();
      if (r.status === 410 || /BadDeviceToken|DeviceTokenNotForTopic/.test(t)) await sb.from("push_tokens").delete().eq("token", token);
      return { status: r.status, reason: t.slice(0, 120) };
    }
    return { status: r.status };
  }));
  return json({ sent: results.filter((x) => x.status === 200).length, results });
});
