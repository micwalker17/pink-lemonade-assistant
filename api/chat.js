// Shop-assistant endpoint. Claude answers with tools that read Pink Lemonade's live store:
// every product, size and price, plus any page on the site (policies, about, contact).
// The API key stays on the server.
import Anthropic from "@anthropic-ai/sdk";

const ORIGIN = process.env.STORE_ORIGIN || "https://pinklemonademi.com";
const keyName = Object.keys(process.env).find((k) => k.trim().toUpperCase() === "ANTHROPIC_API_KEY");
const client = new Anthropic({ apiKey: keyName ? process.env[keyName].trim() : undefined }); // key from the host's environment settings

const SYSTEM = `You are the friendly shop assistant on the Pink Lemonade boutique website (${ORIGIN}).
Pink Lemonade is a family-owned boutique with 4 brick-and-mortar locations in Michigan (Grand Rapids area), selling cute things for children, home and her. Free shipping on online orders over $100. Instagram and Facebook: @pinklemonadegr.

How to answer:
- Use your tools to check the live store before answering anything about products, stock, sizes, prices, policies, hours or locations. Never guess or invent those.
- search_products finds items; get_product gives one item's full details and which sizes are in stock; get_page reads any page on the site (for example /policies/shipping-policy, /policies/refund-policy, /pages/contact); list_site_pages shows which pages exist.
- "In stock" means available online. Store shelves can differ, so for a specific store suggest calling or messaging @pinklemonadegr.
- When you mention a product, give its name, price and in-stock sizes, and link it with its path, like [Fran Dress](/products/fran-dress-holiday-plaid).
- If a size is sold out, say so and suggest the nearest size or a similar item.
- Keep replies short and warm: 2 to 5 sentences or a short list. No headings. If you can't find something, say so and offer that a team member can help.`;

// ---------- live store data ----------
let cache = { at: 0, products: [] };
async function getJson(path) {
  const r = await fetch(ORIGIN + path, { headers: { "User-Agent": "PinkLemonadeAssistant/1.0", Accept: "application/json" } });
  if (!r.ok) throw new Error(`Store returned ${r.status} for ${path}`);
  return r.json();
}
async function allProducts() {
  if (Date.now() - cache.at < 10 * 60_000 && cache.products.length) return cache.products;
  const products = [];
  for (let page = 1; page <= 40; page++) {
    const { products: batch = [] } = await getJson(`/products.json?limit=250&page=${page}`);
    products.push(...batch);
    if (batch.length < 250) break;
  }
  cache = { at: Date.now(), products };
  return products;
}
const text = (html = "") =>
  html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
const price = (p) => {
  const ps = p.variants.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
  const lo = Math.min(...ps), hi = Math.max(...ps);
  return lo === hi ? `$${lo.toFixed(2)}` : `$${lo.toFixed(2)}–$${hi.toFixed(2)}`;
};
const sizes = (p) => {
  const label = (v) => (v.title === "Default Title" ? "one size" : v.title);
  return { in_stock: p.variants.filter((v) => v.available).map(label), sold_out: p.variants.filter((v) => !v.available).map(label) };
};
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();

const tools = [
  {
    name: "search_products",
    description: "Search the live Pink Lemonade catalog. Returns up to 10 matches with name, brand, price, in-stock and sold-out sizes, and the product path. Use for any question about what the shop carries.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to match in name, brand, type or tags, e.g. 'jellycat bunny' or 'holiday dress'. Empty to browse." },
        size: { type: "string", description: "Only return items with this size in stock, e.g. '4T' or '2-3Y'." },
        max_price: { type: "number" },
        min_price: { type: "number" },
      },
    },
    async run({ query = "", size, max_price, min_price }) {
      const words = norm(query).split(" ").filter((w) => w.length > 1);
      const want = size ? norm(size).replace(/ /g, "") : null;
      const rows = (await allProducts()).map((p) => {
        const hay = norm([p.title, p.vendor, p.product_type, ...(p.tags || [])].join(" "));
        const score = words.reduce((s, w) => s + (hay.includes(w) ? (w.length > 3 ? 2 : 1) : 0), 0);
        const lo = Math.min(...p.variants.map((v) => Number(v.price)));
        return { p, score, lo, s: sizes(p) };
      }).filter((r) => (!words.length || r.score > 0)
        && (max_price == null || r.lo <= max_price) && (min_price == null || r.lo >= min_price)
        && r.s.in_stock.length
        && (!want || r.s.in_stock.some((x) => norm(x).replace(/ /g, "").includes(want))));
      rows.sort((a, b) => b.score - a.score || b.p.updated_at?.localeCompare(a.p.updated_at || "") || 0);
      return { total_matches: rows.length, results: rows.slice(0, 10).map(({ p, s }) => ({
        name: p.title, brand: p.vendor, price: price(p), in_stock: s.in_stock, sold_out: s.sold_out, path: `/products/${p.handle}` })) };
    },
  },
  {
    name: "get_product",
    description: "Full live details for one product: description, price, every size or option and whether it is in stock. Pass the handle from a product path (/products/<handle>).",
    input_schema: { type: "object", properties: { handle: { type: "string" } }, required: ["handle"] },
    async run({ handle }) {
      const h = String(handle).replace(/^.*\/products\//, "").split(/[?#/]/)[0];
      const p = (await allProducts()).find((x) => x.handle === h) || (await getJson(`/products/${encodeURIComponent(h)}.json`)).product;
      if (!p) throw new Error("No product with that handle");
      return { name: p.title, brand: p.vendor, type: p.product_type, price: price(p), ...sizes(p),
        description: text(p.body_html).slice(0, 1500), path: `/products/${p.handle}` };
    },
  },
  {
    name: "get_page",
    description: "Read the text of any page on the Pink Lemonade website by its path, e.g. /policies/refund-policy, /policies/shipping-policy, /pages/contact, /pages/about, or a collection like /collections/new.",
    input_schema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    async run({ path }) {
      const p = "/" + String(path).replace(/^https?:\/\/[^/]+/, "").replace(/^\/+/, "");
      if (/^\/(cart|checkout|account|admin)/i.test(p)) throw new Error("That page is not available");
      const r = await fetch(ORIGIN + p, { headers: { "User-Agent": "PinkLemonadeAssistant/1.0" } });
      if (!r.ok) throw new Error(`Page not found (${r.status})`);
      const html = await r.text();
      const main = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
      return { path: p, text: text(main).slice(0, 6000) };
    },
  },
  {
    name: "list_site_pages",
    description: "List the pages, policies and collections that exist on the website, so you know which paths get_page can read.",
    async run() {
      const index = await (await fetch(ORIGIN + "/sitemap.xml")).text();
      const subs = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"))
        .filter((u) => /pages|collections|blogs|policies/.test(u)).slice(0, 6);
      const paths = new Set(["/policies/shipping-policy", "/policies/refund-policy", "/policies/privacy-policy"]);
      for (const u of subs) {
        const xml = await (await fetch(u)).text();
        for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) paths.add(new URL(m[1]).pathname);
      }
      return [...paths].slice(0, 200);
    },
  },
];
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
const apiTools = tools.map(({ name, description, input_schema }) => ({ name, description, input_schema: input_schema || { type: "object", properties: {} } }));

// ---------- request handling ----------
const hits = new Map(); // best-effort per-visitor limit; the real cap is the Console spend limit
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export async function answer(history, pagePath) {
  const system = [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }];
  if (pagePath) system.push({ type: "text", text: `The shopper is looking at this page right now: ${pagePath}` });
  const messages = [...history];
  for (let round = 0; round < 6; round++) {
    const response = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      output_config: { effort: "low" },
      system,
      tools: apiTools,
      messages,
    });
    if (response.stop_reason === "refusal") return "I can only help with questions about our shop. A team member is happy to help with anything else!";
    const calls = response.content.filter((b) => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || !calls.length) {
      return response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    }
    messages.push({ role: "assistant", content: response.content });
    const results = await Promise.all(calls.map(async (c) => {
      try {
        const out = await byName[c.name].run(c.input || {});
        return { type: "tool_result", tool_use_id: c.id, content: JSON.stringify(out).slice(0, 20000) };
      } catch (e) {
        return { type: "tool_result", tool_use_id: c.id, content: String(e.message || e), is_error: true };
      }
    }));
    messages.push({ role: "user", content: results });
  }
  return "Sorry, I couldn't finish looking that up. Could you ask again a little more simply?";
}

// Open /api/chat?check=1 in a browser to see whether the key and the store connection work.
async function healthCheck(res) {
  const report = { key_present: Boolean(keyName), key_starts_with: keyName ? process.env[keyName].trim().slice(0, 7) : "",
    similar_variable_names: Object.keys(process.env).filter((k) => /anthropic|api.?key|claude/i.test(k)),
    vercel_env: process.env.VERCEL_ENV, deployed_commit: (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 7) };
  try {
    const r = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 200, output_config: { effort: "low" }, messages: [{ role: "user", content: "Say OK." }] });
    report.claude = "ok: " + r.content.filter((b) => b.type === "text").map((b) => b.text).join("").slice(0, 40);
  } catch (e) {
    report.claude = `error ${e.status || ""} ${e.error?.error?.type || e.name}: ${e.error?.error?.message || e.message}`;
  }
  try {
    report.store_products = (await allProducts()).length;
  } catch (e) {
    report.store_products = "error: " + e.message;
  }
  return res.status(200).json(report);
}

export default async function handler(req, res) {
  if (req.method === "GET" && /check=1/.test(req.url || "")) return healthCheck(res);
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
  if (tooMany(ip)) return res.status(429).json({ error: "Too many questions, try again in a minute" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-10)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history.at(-1).role !== "user") return res.status(400).json({ error: "Send a question" });
  const pagePath = typeof body.page === "string" ? body.page.slice(0, 200) : "";

  try {
    const reply = await answer(history, pagePath);
    return res.status(200).json({ reply: reply || "Sorry, I didn't catch that. Could you ask again?" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Busy, try again shortly" });
    console.error(err);
    return res.status(502).json({ error: "Assistant unavailable", detail: `${err.status || ""} ${err.error?.error?.type || err.name}` });
  }
}

export { tools };
