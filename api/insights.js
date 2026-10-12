// Real numbers from connected services, for the Shop Insights page. Staff passcode required.
// Each service is optional: whatever is connected fills in its charts; the rest stay as labeled samples.
import { PROVIDERS, fresh } from "./_lib/providers.js";
import { isAdmin, encrypt, decrypt } from "./_lib/auth.js";
import { storeReady, getConn, setConn, getCache, setCache } from "./_lib/store.js";

const WEEKS = 8; // Shopify shares the last 60 days of orders by default, so 8 weeks fits
const DAY = 864e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(r, what) {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${what} returned ${r.status}: ${data.errors?.[0]?.detail || data.error?.message || data.detail || data.errors || ""}`.trim());
  return data;
}

// ---------- shared shape: orders -> weekly sales, customers, locations, products ----------
export function weekBuckets(now = new Date()) {
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return Array.from({ length: WEEKS }, (_, i) => {
    const stop = new Date(end.getTime() - (WEEKS - 1 - i) * 7 * DAY);
    return { start: stop.getTime() - 7 * DAY, stop: stop.getTime(), label: stop.toISOString().slice(0, 10) };
  });
}
// order: {at, total, channel: "online"|"store", location, customer: "new"|"returning"|null, items:[{title, total}]}
export function summarizeOrders(orders, now = new Date()) {
  const weeks = weekBuckets(now);
  const idx = (t) => weeks.findIndex((w) => t > w.start && t <= w.stop);
  const online = Array(WEEKS).fill(0), store = Array(WEEKS).fill(0), fresh = Array(WEEKS).fill(0), back = Array(WEEKS).fill(0);
  const loc = new Map(), prod = new Map();
  let total = 0, count = 0;
  for (const o of orders) {
    const i = idx(o.at);
    if (i < 0) continue;
    count++; total += o.total;
    (o.channel === "store" ? store : online)[i] += o.total;
    if (o.customer === "new") fresh[i]++;
    if (o.customer === "returning") back[i]++;
    loc.set(o.location, (loc.get(o.location) || 0) + o.total);
    for (const it of o.items || []) prod.set(it.title, (prod.get(it.title) || 0) + it.total);
  }
  const round = (a) => a.map((n) => Math.round(n));
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return {
    weeks: weeks.map((w) => w.label), total: Math.round(total), orders: count,
    sales: [{ label: "In stores", data: round(store) }, { label: "Online", data: round(online) }],
    customers: fresh.some(Boolean) || back.some(Boolean) ? [{ label: "Returning", data: back }, { label: "New", data: fresh }] : null,
    locations: total ? top(loc, 6).map(([label, v]) => ({ label, value: Math.round((v / total) * 100) })) : [],
    products: top(prod, 6).map(([label, v]) => ({ label, value: Math.round(v) })),
  };
}

// ---------- Shopify ----------
const SHOPIFY_QUERY = `query($cursor: String, $q: String) {
  orders(first: 50, after: $cursor, query: $q, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      createdAt sourceName test cancelledAt
      totalPriceSet { shopMoney { amount } }
      retailLocation { name }
      customer { numberOfOrders }
      lineItems(first: 10) { nodes { title originalTotalSet { shopMoney { amount } } } }
    }
  }
}`;
export function shopifyOrder(n) {
  const inStore = n.sourceName === "pos" || Boolean(n.retailLocation);
  return {
    at: Date.parse(n.createdAt), total: Number(n.totalPriceSet?.shopMoney?.amount || 0),
    channel: inStore ? "store" : "online", location: n.retailLocation?.name || (inStore ? "In store" : "Online"),
    customer: n.customer ? (Number(n.customer.numberOfOrders) > 1 ? "returning" : "new") : null,
    items: (n.lineItems?.nodes || []).map((li) => ({ title: li.title, total: Number(li.originalTotalSet?.shopMoney?.amount || 0) })),
  };
}
async function shopifyOrders(conn, since) {
  const version = process.env.SHOPIFY_API_VERSION || "2026-07";
  const out = [];
  let cursor = null;
  for (let page = 0; page < 20; page++) {
    let data;
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await fetch(`https://${conn.shop}/admin/api/${version}/graphql.json`, { method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": conn.access_token },
        body: JSON.stringify({ query: SHOPIFY_QUERY, variables: { cursor, q: `created_at:>=${since.toISOString().slice(0, 10)}` } }) });
      data = await json(r, "Shopify");
      if (!data.errors?.some((e) => e.extensions?.code === "THROTTLED")) break;
      await sleep(1500); // Shopify refills its query allowance every second
    }
    if (data.errors) throw new Error("Shopify: " + data.errors.map((e) => e.message).join("; "));
    const o = data.data.orders;
    out.push(...o.nodes.filter((n) => !n.test && !n.cancelledAt).map(shopifyOrder));
    if (!o.pageInfo.hasNextPage) break;
    cursor = o.pageInfo.endCursor;
  }
  return out;
}

// ---------- Square ----------
async function squareOrders(conn, since) {
  const base = PROVIDERS.square.base();
  const headers = { Authorization: `Bearer ${conn.access_token}`, "Square-Version": "2025-01-23", "Content-Type": "application/json" };
  const { locations = [] } = await json(await fetch(`${base}/v2/locations`, { headers }), "Square locations");
  const names = Object.fromEntries(locations.map((l) => [l.id, l.name]));
  const ids = locations.filter((l) => l.status !== "INACTIVE").map((l) => l.id).slice(0, 10);
  if (!ids.length) return [];
  const out = [];
  let cursor;
  for (let page = 0; page < 20; page++) {
    const body = { location_ids: ids, limit: 500, cursor, query: { filter: {
      date_time_filter: { closed_at: { start_at: since.toISOString(), end_at: new Date().toISOString() } },
      state_filter: { states: ["COMPLETED"] } }, sort: { sort_field: "CLOSED_AT", sort_order: "ASC" } } };
    const d = await json(await fetch(`${base}/v2/orders/search`, { method: "POST", headers, body: JSON.stringify(body) }), "Square orders");
    for (const o of d.orders || []) out.push({
      at: Date.parse(o.closed_at || o.created_at), total: (o.total_money?.amount || 0) / 100, channel: "store",
      location: names[o.location_id] || "Square", customer: null,
      items: (o.line_items || []).map((li) => ({ title: li.name || "Item", total: (li.total_money?.amount || 0) / 100 })),
    });
    if (!d.cursor) break;
    cursor = d.cursor;
  }
  return out;
}

// ---------- Google Analytics 4 + Search Console ----------
async function google(conn) {
  const headers = { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" };
  const out = { sources: [], searches: [] };
  let property = process.env.GA4_PROPERTY_ID ? `properties/${process.env.GA4_PROPERTY_ID.replace(/\D/g, "")}` : "";
  if (!property) {
    const s = await json(await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", { headers }), "Google Analytics");
    property = s.accountSummaries?.flatMap((a) => a.propertySummaries || [])[0]?.property || "";
  }
  if (property) {
    const rep = await json(await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, { method: "POST", headers, body: JSON.stringify({
      dateRanges: [{ startDate: "28daysAgo", endDate: "today" }], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 }) }), "Google Analytics report");
    const rows = (rep.rows || []).map((r) => ({ label: r.dimensionValues[0].value, sessions: Number(r.metricValues[0].value) }));
    const sum = rows.reduce((s, r) => s + r.sessions, 0) || 1;
    out.sources = rows.map((r) => ({ label: r.label, value: Math.round((r.sessions / sum) * 100), sessions: r.sessions }));
    out.sessions = sum;
  }
  const sites = await json(await fetch("https://www.googleapis.com/webmasters/v3/sites", { headers }), "Search Console");
  const host = new URL(process.env.STORE_ORIGIN || "https://pinklemonademi.com").hostname.replace(/^www\./, "");
  const site = (sites.siteEntry || []).find((s) => s.siteUrl.includes(host))?.siteUrl || sites.siteEntry?.[0]?.siteUrl;
  if (site) {
    const day = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
    const q = await json(await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: "POST", headers,
      body: JSON.stringify({ startDate: day(31), endDate: day(3), dimensions: ["query"], rowLimit: 8 }) }), "Search Console report");
    out.searches = (q.rows || []).map((r) => ({ query: r.keys[0], clicks: r.clicks, position: Math.round(r.position * 10) / 10 }));
  }
  return out;
}

// ---------- Instagram & Facebook ----------
async function meta(conn) {
  const d = await json(await fetch(`${PROVIDERS.meta.graph()}/me/accounts?fields=name,fan_count,instagram_business_account{username,followers_count,media_count}&access_token=${encodeURIComponent(conn.access_token)}`), "Meta");
  return (d.data || []).map((p) => ({ page: p.name, page_fans: p.fan_count ?? null, instagram: p.instagram_business_account?.username || null,
    followers: p.instagram_business_account?.followers_count ?? null, posts: p.instagram_business_account?.media_count ?? null }));
}

// ---------- Mailchimp ----------
async function mailchimp(conn) {
  const headers = { Authorization: `Bearer ${conn.access_token}` };
  const reps = await json(await fetch(`${conn.api}/3.0/reports?count=20`, { headers }), "Mailchimp reports");
  const lists = await json(await fetch(`${conn.api}/3.0/lists?count=10`, { headers }), "Mailchimp lists");
  const campaigns = (reps.reports || []).filter((r) => r.send_time).sort((a, b) => Date.parse(a.send_time) - Date.parse(b.send_time)).slice(-6)
    .map((r) => ({ label: r.campaign_title || r.subject_line || "Campaign", open_rate: Math.round((r.opens?.open_rate || 0) * 1000) / 10, click_rate: Math.round((r.clicks?.click_rate || 0) * 1000) / 10 }));
  return { campaigns, subscribers: (lists.lists || []).reduce((s, l) => s + (l.stats?.member_count || 0), 0) };
}

// ---------- put it together ----------
async function load(id) {
  const raw = await getConn(id);
  if (!raw) return null;
  const saved = decrypt(raw);
  if (!saved) return null;
  const { conn, changed } = await fresh(id, saved);
  if (changed) await setConn(id, encrypt(conn));
  return conn;
}

export async function gather() {
  const since = new Date(Date.now() - WEEKS * 7 * DAY);
  const status = {};
  const result = { updated: new Date().toISOString(), status };
  const run = async (id, fn) => {
    try {
      const conn = await load(id);
      if (!conn) return null;
      const v = await fn(conn);
      status[id] = { ok: true };
      return v;
    } catch (e) {
      console.error(id, e);
      status[id] = { ok: false, error: String(e.message || e).slice(0, 300) };
      return null;
    }
  };
  const [shop, sq, g, m, mc] = await Promise.all([
    run("shopify", (c) => shopifyOrders(c, since)), run("square", (c) => squareOrders(c, since)),
    run("google", google), run("meta", meta), run("mailchimp", mailchimp)]);
  if (shop || sq) {
    result.commerce = summarizeOrders([...(shop || []), ...(sq || [])]);
    result.commerce.from = [shop && "Shopify", sq && "Square"].filter(Boolean).join(" + ");
  }
  if (g) result.google = g;
  if (m) result.social = m;
  if (mc) result.email = mc;
  return result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(401).json({ error: "Enter the staff passcode to see real numbers." });
  if (!storeReady()) return res.status(200).json({ status: {}, note: "Storage isn't set up yet." });
  try {
    if (!/refresh=1/.test(req.url || "")) {
      const cached = decrypt(await getCache("insights"));
      if (cached) return res.status(200).json({ ...cached, cached: true });
    }
    const data = await gather();
    await setCache("insights", encrypt(data), 15 * 60);
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Couldn't load the connected services right now." });
  }
}
