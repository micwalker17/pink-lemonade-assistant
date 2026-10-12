// "Connect" buttons: sends the owner to the service's sign-in page, then saves the key it hands back.
//   /connect/<provider>           start (the dashboard links here)
//   /connect/<provider>/callback  where the service returns; register this address in each service's app settings
import crypto from "node:crypto";
import { PROVIDERS, configured } from "./_lib/providers.js";
import { isAdmin, stateCookie, checkState, encrypt, siteUrl } from "./_lib/auth.js";
import { storeReady, setConn, delCache } from "./_lib/store.js";

const back = (res, params) => res.redirect(302, "/analytics?" + new URLSearchParams(params) + "#connections");

export function normalizeShop(input) {
  const s = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const shop = s.includes(".") ? s : `${s}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : "";
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://local");
  const query = Object.fromEntries(url.searchParams);
  const id = query.provider;
  const p = PROVIDERS[id];
  if (!p) return res.status(404).send("Unknown service");
  if (!isAdmin(req)) return back(res, { error: "Enter the staff passcode first." });
  if (!configured(id)) return back(res, { error: `${p.name} isn't set up yet. Add ${p.envs.join(" and ")} in Vercel.` });
  if (!storeReady()) return back(res, { error: "Storage isn't set up yet. Add Upstash for Redis to the Vercel project." });
  const redirectUri = `${siteUrl(req)}/connect/${id}/callback`;

  if (query.step !== "callback") {
    const state = crypto.randomBytes(16).toString("hex");
    let shop;
    if (p.needsShop) {
      shop = normalizeShop(query.shop);
      if (!shop) return back(res, { error: "Enter the store's Shopify address, like pink-lemonade.myshopify.com." });
    }
    res.setHeader("Set-Cookie", stateCookie(id, state));
    return res.redirect(302, p.authorizeUrl.call(p, { redirectUri, state, shop }));
  }

  if (query.error) return back(res, { error: `${p.name} sign-in was cancelled.` });
  if (!checkState(req, id, query.state)) return back(res, { error: "That sign-in link expired. Please click Connect again." });
  if (p.verifyCallback && !p.verifyCallback(query)) return back(res, { error: `${p.name} sent back an answer that couldn't be verified.` });
  try {
    const conn = await p.exchange.call(p, { code: query.code, redirectUri, query });
    await setConn(id, encrypt({ ...conn, connected_at: new Date().toISOString() }));
    await delCache("insights");
    return back(res, { connected: id });
  } catch (e) {
    console.error(e);
    return back(res, { error: `Couldn't finish connecting ${p.name}: ${e.message}` });
  }
}
