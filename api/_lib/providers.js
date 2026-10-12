// The business tools a "Connect" button can link, each with its sign-in (OAuth) steps.
// To add another service, copy one entry: name the env vars that hold its app ID and secret,
// build its sign-in link, swap the returned code for a key, and (optionally) refresh that key.
import crypto from "node:crypto";

const form = (o) => new URLSearchParams(o).toString();
async function json(r, what) {
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`${what}: ${data.error_description || data.error?.message || data.message || data.error || r.status}`);
  return data;
}
const env = (name) => (process.env[name] || "").trim();

export const PROVIDERS = {
  shopify: {
    name: "Shopify",
    what: "Online and in-store sales, customers, and stock at each store.",
    envs: ["SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET"],
    needsShop: true,
    authorizeUrl: ({ redirectUri, state, shop }) => `https://${shop}/admin/oauth/authorize?` + form({
      client_id: env("SHOPIFY_CLIENT_ID"), redirect_uri: redirectUri, state,
      scope: "read_orders,read_customers,read_products,read_inventory,read_locations",
    }),
    // Shopify signs its callback; check the signature before trusting the shop name.
    verifyCallback(query) {
      const { hmac, signature, ...rest } = query;
      delete rest.provider; delete rest.step;
      const msg = Object.keys(rest).sort().map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`).join("&");
      const want = crypto.createHmac("sha256", env("SHOPIFY_CLIENT_SECRET")).update(msg).digest("hex");
      return Boolean(hmac) && hmac.length === want.length && crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(want))
        && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(String(query.shop || ""));
    },
    async exchange({ code, query }) {
      const r = await fetch(`https://${query.shop}/admin/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: env("SHOPIFY_CLIENT_ID"), client_secret: env("SHOPIFY_CLIENT_SECRET"), code }) });
      const t = await json(r, "Shopify");
      return { access_token: t.access_token, scope: t.scope, shop: query.shop, account: query.shop };
    },
  },

  square: {
    name: "Square",
    what: "Card and in-store sales if any register runs on Square.",
    envs: ["SQUARE_CLIENT_ID", "SQUARE_CLIENT_SECRET"],
    base: () => (env("SQUARE_ENVIRONMENT") === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com"),
    authorizeUrl({ state }) {
      return `${this.base()}/oauth2/authorize?` + form({ client_id: env("SQUARE_CLIENT_ID"), state, session: "false",
        scope: "MERCHANT_PROFILE_READ ORDERS_READ PAYMENTS_READ CUSTOMERS_READ ITEMS_READ INVENTORY_READ" });
    },
    async exchange({ code, redirectUri }) {
      const r = await fetch(`${this.base()}/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/json", "Square-Version": "2025-01-23" },
        body: JSON.stringify({ client_id: env("SQUARE_CLIENT_ID"), client_secret: env("SQUARE_CLIENT_SECRET"), code, grant_type: "authorization_code", redirect_uri: redirectUri }) });
      const t = await json(r, "Square");
      return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.parse(t.expires_at) || 0, account: t.merchant_id };
    },
    async refresh(conn) {
      const r = await fetch(`${this.base()}/oauth2/token`, { method: "POST", headers: { "Content-Type": "application/json", "Square-Version": "2025-01-23" },
        body: JSON.stringify({ client_id: env("SQUARE_CLIENT_ID"), client_secret: env("SQUARE_CLIENT_SECRET"), refresh_token: conn.refresh_token, grant_type: "refresh_token" }) });
      const t = await json(r, "Square refresh");
      return { ...conn, access_token: t.access_token, refresh_token: t.refresh_token || conn.refresh_token, expires_at: Date.parse(t.expires_at) || 0 };
    },
  },

  google: {
    name: "Google Analytics & Search Console",
    what: "Where website visitors come from and which Google searches find the shop.",
    envs: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    authorizeUrl: ({ redirectUri, state }) => "https://accounts.google.com/o/oauth2/v2/auth?" + form({
      client_id: env("GOOGLE_CLIENT_ID"), redirect_uri: redirectUri, state, response_type: "code",
      access_type: "offline", prompt: "consent", include_granted_scopes: "true",
      scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly openid email",
    }),
    async exchange({ code, redirectUri }) {
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: redirectUri, grant_type: "authorization_code" }) });
      const t = await json(r, "Google");
      let account = "Google account";
      try { account = JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url")).email || account; } catch {}
      return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + (t.expires_in || 3600) * 1000, account };
    },
    async refresh(conn) {
      const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ refresh_token: conn.refresh_token, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), grant_type: "refresh_token" }) });
      const t = await json(r, "Google refresh");
      return { ...conn, access_token: t.access_token, expires_at: Date.now() + (t.expires_in || 3600) * 1000 };
    },
  },

  meta: {
    name: "Instagram & Facebook",
    what: "Follower counts and post reach for @pinklemonadegr.",
    envs: ["META_APP_ID", "META_APP_SECRET"],
    graph: () => `https://graph.facebook.com/${env("META_GRAPH_VERSION") || "v23.0"}`,
    authorizeUrl: ({ redirectUri, state }) => `https://www.facebook.com/${env("META_GRAPH_VERSION") || "v23.0"}/dialog/oauth?` + form({
      client_id: env("META_APP_ID"), redirect_uri: redirectUri, state, response_type: "code",
      scope: "pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights",
    }),
    async exchange({ code, redirectUri }) {
      const short = await json(await fetch(`${this.graph()}/oauth/access_token?` + form({ client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri: redirectUri, code })), "Meta");
      // Swap the 1-hour key for a 60-day one.
      const long = await json(await fetch(`${this.graph()}/oauth/access_token?` + form({ grant_type: "fb_exchange_token", client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), fb_exchange_token: short.access_token })), "Meta long-lived");
      const me = await json(await fetch(`${this.graph()}/me?fields=name&access_token=${encodeURIComponent(long.access_token)}`), "Meta profile");
      return { access_token: long.access_token, expires_at: long.expires_in ? Date.now() + long.expires_in * 1000 : 0, account: me.name };
    },
  },

  mailchimp: {
    name: "Mailchimp",
    what: "Newsletter open and click rates, and list size.",
    envs: ["MAILCHIMP_CLIENT_ID", "MAILCHIMP_CLIENT_SECRET"],
    authorizeUrl: ({ redirectUri, state }) => "https://login.mailchimp.com/oauth2/authorize?" + form({
      response_type: "code", client_id: env("MAILCHIMP_CLIENT_ID"), redirect_uri: redirectUri, state }),
    async exchange({ code, redirectUri }) {
      const t = await json(await fetch("https://login.mailchimp.com/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ grant_type: "authorization_code", client_id: env("MAILCHIMP_CLIENT_ID"), client_secret: env("MAILCHIMP_CLIENT_SECRET"), redirect_uri: redirectUri, code }) }), "Mailchimp");
      // Each Mailchimp account lives on its own server; the metadata call says which.
      const meta = await json(await fetch("https://login.mailchimp.com/oauth2/metadata", { headers: { Authorization: `OAuth ${t.access_token}` } }), "Mailchimp metadata");
      return { access_token: t.access_token, api: meta.api_endpoint, account: meta.accountname || meta.login?.email };
    },
  },
};

export const configured = (p) => PROVIDERS[p].envs.every((n) => env(n));

// Keys that expire are refreshed a few minutes early.
export async function fresh(provider, conn) {
  const p = PROVIDERS[provider];
  if (p.refresh && conn.refresh_token && conn.expires_at && conn.expires_at - Date.now() < 5 * 60_000) return { conn: await p.refresh(conn), changed: true };
  return { conn, changed: false };
}
