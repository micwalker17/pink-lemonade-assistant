// Serves a live copy of pinklemonademi.com: each request fetches the same page from her
// real store, keeps links pointing at this copy, turns off buying, and adds the chat bubble.
// Nothing is copied by hand, so every page, product and price stays identical to the live site.

const ORIGIN = process.env.STORE_ORIGIN || "https://pinklemonademi.com";
const ORIGIN_HOST = new URL(ORIGIN).host;
const BLOCKED = /^\/(cart|checkout|checkouts|account|apps\/|wpm|services\/|\.well-known)/i;
const EMPTY_CART = { token: "", note: null, attributes: {}, total_price: 0, total_discount: 0, total_weight: 0, item_count: 0, items: [], requires_shipping: false, currency: "USD", items_subtotal_price: 0, cart_level_discount_applications: [] };

// The theme's image links to collections carry aria-label="", so screen readers announce nothing.
function labelEmptyLink(tag) {
  if (!/aria-label=(["'])\1/i.test(tag)) return tag;
  const slug = (tag.match(/href=["'][^"']*\/collections\/([^"'/?#]+)/i) || [])[1];
  if (!slug) return tag;
  const name = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return tag.replace(/aria-label=(["'])\1/i, `aria-label="Shop ${name}"`);
}

function rewriteHtml(html) {
  const esc = ORIGIN_HOST.replace(/\./g, "\\.");
  // Links to her own domain become links within this copy (assets keep loading from her CDN).
  const own = new RegExp(`(href=["'])(?:https?:)?//(?:www\\.)?${esc}(?=[/"'?#])`, "gi");
  html = html.replace(/<a\b[^>]*>/gi, (tag) => labelEmptyLink(tag.replace(own, "$1").replace(/(href=["'])(?=["'])/i, "$1/")));
  // Shopify's performance beacon posts to her real domain, which the browser blocks from this copy;
  // point it at /api/collect here, which accepts and drops it.
  html = html.replace(new RegExp(`(data-shs-beacon-endpoint=["'])https?://(?:www\\.)?${esc}(?=/)`, "gi"), "$1");
  html = html.replace(/(<form[^>]*action=["'])(?:https?:)?\/\/(?:www\.)?[^"']*?(\/cart)/gi, "$1$2");
  const v = (process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7); // new version on every deploy, so browsers drop old copies
  const head = `<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/pl-assistant/widget.css?v=${v}">`;
  const tail = `<script src="/pl-assistant/widget.js?v=${v}" defer></script>`;
  html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, head + "</head>") : head + html;
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>(?![\s\S]*<\/body>)/i, tail + "</body>") : html + tail;
  return html;
}

export default async function handler(req, res) {
  const url = new URL(req.url, "http://local");
  const path = url.searchParams.get("path") || "/";
  url.searchParams.delete("path");
  const qs = url.searchParams.toString();
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (!path.startsWith("/") || path.startsWith("//")) return res.status(400).send("Bad path");
  if (BLOCKED.test(path)) {
    // The theme reads the cart and checkout preloads on every page; answer with an empty cart and an
    // empty script so the preview stays quiet instead of logging errors.
    if (/^\/cart\.js(on)?$/i.test(path)) return res.status(200).json(EMPTY_CART);
    if (path.endsWith(".js")) return res.status(200).setHeader("Content-Type", "application/javascript").send("/* turned off in the staff preview */");
    const wantsJson = path.endsWith(".json") || /json/.test(req.headers.accept || "");
    if (wantsJson) return res.status(403).json({ status: 403, message: "Demo copy: buying is turned off", description: "This is a staff preview. Shop at pinklemonademi.com." });
    return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:40px;text-align:center"><h2>This is a staff preview of Pink Lemonade</h2><p>Carts, checkout and accounts are turned off here.</p><p><a href="/">Back to the shop</a></p></body>`);
  }

  let upstream;
  try {
    upstream = await fetch(ORIGIN + path + (qs ? "?" + qs : ""), {
      headers: { "User-Agent": req.headers["user-agent"] || "Mozilla/5.0", "Accept": req.headers.accept || "*/*", "Accept-Language": "en-US" },
      redirect: "manual",
    });
  } catch {
    return res.status(502).send("The store could not be reached. Try again in a moment.");
  }

  // Keep redirects inside this copy.
  if (upstream.status >= 300 && upstream.status < 400) {
    const loc = upstream.headers.get("location") || "/";
    const to = new URL(loc, ORIGIN);
    return res.redirect(upstream.status, to.host.endsWith(ORIGIN_HOST) ? to.pathname + to.search : to.href);
  }

  const type = upstream.headers.get("content-type") || "application/octet-stream";
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  if (type.includes("text/html")) {
    return res.status(upstream.status).send(rewriteHtml(await upstream.text()));
  }
  return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
}

export { rewriteHtml };
