// Staff passcode and the list of connected services.
//   GET  /api/admin                       -> who's connected (no keys are ever returned)
//   POST /api/admin {action:"login", passcode} | {action:"logout"} | {action:"disconnect", provider}
import { PROVIDERS, configured } from "./_lib/providers.js";
import { isAdmin, passcodeSet, checkPasscode, loginCookie, logoutCookie, decrypt, siteUrl } from "./_lib/auth.js";
import { storeReady, getConn, delConn, delCache } from "./_lib/store.js";

const tries = new Map(); // slow down passcode guessing
function tooMany(ip) {
  const now = Date.now();
  const recent = (tries.get(ip) || []).filter((t) => now - t < 15 * 60_000);
  recent.push(now); tries.set(ip, recent);
  return recent.length > 10;
}

async function status(req) {
  const admin = isAdmin(req);
  const out = { passcode_set: passcodeSet(), admin, storage_ready: storeReady(), callback_base: siteUrl(req) + "/connect/", services: [] };
  for (const [id, p] of Object.entries(PROVIDERS)) {
    const s = { id, name: p.name, what: p.what, configured: configured(id), env: p.envs, needs_shop: Boolean(p.needsShop), connected: false };
    if (admin && storeReady()) {
      try {
        const conn = decrypt(await getConn(id));
        if (conn) Object.assign(s, { connected: true, account: conn.account || "", since: conn.connected_at });
      } catch (e) { s.error = e.message; }
    }
    out.services.push(s);
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json(await status(req));
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  if (body.action === "login") {
    if (!passcodeSet()) return res.status(400).json({ error: "No passcode yet. Add ADMIN_PASSCODE in Vercel, then redeploy." });
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
    if (tooMany(ip)) return res.status(429).json({ error: "Too many tries. Wait 15 minutes." });
    if (!checkPasscode(body.passcode)) return res.status(401).json({ error: "That passcode isn't right." });
    res.setHeader("Set-Cookie", loginCookie());
    return res.status(200).json({ ok: true });
  }
  if (body.action === "logout") { res.setHeader("Set-Cookie", logoutCookie()); return res.status(200).json({ ok: true }); }
  if (body.action === "disconnect") {
    if (!isAdmin(req)) return res.status(401).json({ error: "Enter the staff passcode first." });
    if (!PROVIDERS[body.provider]) return res.status(400).json({ error: "Unknown service" });
    await delConn(body.provider);
    await delCache("insights");
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "Unknown action" });
}
