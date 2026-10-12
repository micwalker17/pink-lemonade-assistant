// SEO and marketing checks for the staff dashboard, from the store's public pages and product feed.
// Traffic, search rankings and social numbers are not public; they need Google Search Console / Analytics access.
const ORIGIN = process.env.STORE_ORIGIN || "https://pinklemonademi.com";
const UA = { "User-Agent": "PinkLemonadeAssistant/1.0" };

async function allProducts() {
  const products = [];
  for (let page = 1; page <= 40; page++) {
    const r = await fetch(`${ORIGIN}/products.json?limit=250&page=${page}`, { headers: UA });
    if (!r.ok) throw new Error(`Store returned ${r.status}`);
    const { products: batch = [] } = await r.json();
    products.push(...batch);
    if (batch.length < 250) break;
  }
  return products;
}
const getText = async (path) => { try { const r = await fetch(ORIGIN + path, { headers: UA }); return r.ok ? r.text() : ""; } catch { return ""; } };
const plain = (html = "") => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&#\d+;|&\w+;/g, " ").replace(/\s+/g, " ").trim();

// How many pages of each kind the sitemap lists (products, collections, pages, blog posts).
async function sitemapCounts() {
  const index = await getText("/sitemap.xml");
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  const counts = {};
  await Promise.all(children.map(async (loc) => {
    const kind = (loc.match(/sitemap_(\w+?)_\d/) || [])[1] || "other";
    const xml = await getText(new URL(loc).pathname + new URL(loc).search);
    counts[kind] = (counts[kind] || 0) + (xml.match(/<url>/g) || []).length;
  }));
  return counts;
}

export function homepageChecks(html) {
  const pick = (re) => (html.match(re) || [])[1]?.trim() || "";
  const title = plain(pick(/<title[^>]*>([\s\S]*?)<\/title>/i));
  const desc = pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || pick(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const h1s = (html.match(/<h1\b/gi) || []).length;
  return [
    { check: "Page title", detail: title ? `"${title.slice(0, 80)}" (${title.length} characters)` : "Missing", ok: title.length >= 20 && title.length <= 65, tip: "Aim for 20–65 characters with the shop name and what it sells, e.g. \"Pink Lemonade | Kids' Boutique in Grand Rapids\"." },
    { check: "Meta description", detail: desc ? `${desc.length} characters` : "Missing", ok: desc.length >= 70 && desc.length <= 160, tip: "This is the grey text under the link on Google. Aim for 70–160 characters that mention Grand Rapids and the kinds of gifts she sells." },
    { check: "One main heading (H1)", detail: `${h1s} found`, ok: h1s === 1, tip: "Search engines expect exactly one H1 per page." },
    { check: "Social share image", detail: /property=["']og:image["']/i.test(html) ? "Present" : "Missing", ok: /property=["']og:image["']/i.test(html), tip: "Controls the picture shown when the site is shared on Facebook or in texts." },
    { check: "Canonical link", detail: /rel=["']canonical["']/i.test(html) ? "Present" : "Missing", ok: /rel=["']canonical["']/i.test(html), tip: "Tells Google which address is the real one." },
    { check: "Structured data", detail: /application\/ld\+json/i.test(html) ? "Present" : "Missing", ok: /application\/ld\+json/i.test(html), tip: "Lets Google show the shop's name, logo and products richly in results." },
    { check: "Local business info", detail: /LocalBusiness|Store"|"address"/i.test(html) ? "Present" : "Not found", ok: /LocalBusiness|Store"|"address"/i.test(html), tip: "Adding the four store addresses as structured data helps her show up in \"kids boutique near me\" searches." },
  ];
}

export function audit(products, now = new Date()) {
  const rows = products.map((p) => {
    const words = plain(p.body_html).split(" ").filter(Boolean).length;
    const images = p.images || [];
    const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || "").split(",").filter((t) => t.trim());
    const issues = [];
    if (words === 0) issues.push("No description");
    else if (words < 25) issues.push("Short description");
    if (!images.length) issues.push("No photo");
    else if (images.length < 2) issues.push("Only 1 photo");
    const noAlt = images.filter((i) => !String(i.alt || "").trim()).length;
    if (noAlt) issues.push("Photos missing alt text");
    if (p.title.length > 70) issues.push("Long title");
    if (!tags.length) issues.push("No tags");
    if (!String(p.product_type || "").trim()) issues.push("No product type");
    return { p, words, images: images.length, noAlt, issues, inStock: p.variants.some((v) => v.available),
      published: new Date(p.published_at || p.created_at || 0) };
  });
  const n = rows.length || 1;
  const pct = (f) => Math.round((rows.filter(f).length / n) * 100);
  const imgTotal = rows.reduce((s, r) => s + r.images, 0);
  const imgNoAlt = rows.reduce((s, r) => s + r.noAlt, 0);
  const card = (r) => ({ title: r.p.title, brand: r.p.vendor, path: `/products/${r.p.handle}`,
    price: Math.min(...r.p.variants.map((v) => Number(v.price)).filter((x) => !Number.isNaN(x))),
    image: r.p.images?.[0]?.src || "" });

  return {
    updated: now.toISOString(),
    totals: {
      products: rows.length,
      seo_ready_pct: pct((r) => r.issues.length === 0),
      no_description: rows.filter((r) => r.words === 0).length,
      short_description: rows.filter((r) => r.words > 0 && r.words < 25).length,
      images: imgTotal,
      images_alt_pct: imgTotal ? Math.round((1 - imgNoAlt / imgTotal) * 100) : 0,
      long_titles: rows.filter((r) => r.p.title.length > 70).length,
    },
    checks: [
      { label: "Has a description", pass_pct: pct((r) => r.words > 0) },
      { label: "Description 25+ words", pass_pct: pct((r) => r.words >= 25) },
      { label: "2+ photos", pass_pct: pct((r) => r.images >= 2) },
      { label: "All photos have alt text", pass_pct: pct((r) => r.images > 0 && r.noAlt === 0) },
      { label: "Title under 70 characters", pass_pct: pct((r) => r.p.title.length <= 70) },
      { label: "Has tags", pass_pct: pct((r) => !r.issues.includes("No tags")) },
      { label: "Has a product type", pass_pct: pct((r) => !r.issues.includes("No product type")) },
    ],
    // In-stock items with the most problems: fixing these helps people find things she can actually sell.
    fix_first: rows.filter((r) => r.inStock && r.issues.length).sort((a, b) => b.issues.length - a.issues.length || b.published - a.published)
      .slice(0, 12).map((r) => ({ ...card(r), issues: r.issues })),
    // Ready-made post ideas from this week's catalog.
    post_ideas: {
      new_arrivals: rows.filter((r) => r.inStock).sort((a, b) => b.published - a.published).slice(0, 6).map(card),
      almost_gone: rows.filter((r) => r.p.variants.length > 2 && r.p.variants.filter((v) => v.available).length === 1)
        .sort((a, b) => b.published - a.published).slice(0, 6).map(card),
      on_sale: rows.filter((r) => r.inStock && r.p.variants.some((v) => Number(v.compare_at_price) > Number(v.price))).slice(0, 6).map(card),
    },
  };
}

export default async function handler(req, res) {
  try {
    const [products, home, pages] = await Promise.all([allProducts(), getText("/"), sitemapCounts().catch(() => ({}))]);
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ ...audit(products), homepage: homepageChecks(home), sitemap: pages });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not check the website right now" });
  }
}
