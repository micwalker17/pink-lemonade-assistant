// Live catalog analytics for the staff dashboard, computed from the store's public product feed.
// Sales and customer figures are not in that feed; they need Shopify admin access.
const ORIGIN = process.env.STORE_ORIGIN || "https://pinklemonademi.com";

async function allProducts() {
  const products = [];
  for (let page = 1; page <= 40; page++) {
    const r = await fetch(`${ORIGIN}/products.json?limit=250&page=${page}`, { headers: { "User-Agent": "PinkLemonadeAssistant/1.0" } });
    if (!r.ok) throw new Error(`Store returned ${r.status}`);
    const { products: batch = [] } = await r.json();
    products.push(...batch);
    if (batch.length < 250) break;
  }
  return products;
}

export function summarize(products, now = new Date()) {
  const rows = products.map((p) => {
    const prices = p.variants.map((v) => Number(v.price)).filter((n) => !Number.isNaN(n));
    const sold = p.variants.filter((v) => !v.available).length;
    return {
      title: p.title, brand: (p.vendor || "Other").trim(), handle: p.handle,
      price: prices.length ? Math.min(...prices) : 0,
      variants: p.variants.length, soldOut: sold,
      onSale: p.variants.some((v) => Number(v.compare_at_price) > Number(v.price)),
      published: new Date(p.published_at || p.created_at || 0),
      soldOutSizes: p.variants.filter((v) => !v.available && v.title !== "Default Title").map((v) => v.title),
    };
  });
  const variants = rows.reduce((s, r) => s + r.variants, 0);
  const soldVariants = rows.reduce((s, r) => s + r.soldOut, 0);
  const prices = rows.map((r) => r.price).sort((a, b) => a - b);

  const byBrand = new Map();
  for (const r of rows) {
    const key = r.brand.toLowerCase();
    const b = byBrand.get(key) || { brand: r.brand, products: 0, variants: 0, soldOut: 0 };
    b.products++; b.variants += r.variants; b.soldOut += r.soldOut;
    byBrand.set(key, b);
  }
  const brands = [...byBrand.values()].sort((a, b) => b.products - a.products);

  const bands = [[0, 20, "Under $20"], [20, 40, "$20–40"], [40, 60, "$40–60"], [60, 80, "$60–80"], [80, 100, "$80–100"], [100, Infinity, "$100+"]];
  const priceBands = bands.map(([lo, hi, label]) => ({ label, products: rows.filter((r) => r.price >= lo && r.price < hi).length }));

  const week = 7 * 864e5;
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const end = new Date(now.getTime() - (11 - i) * week);
    const start = new Date(end.getTime() - week);
    return { week_ending: end.toISOString().slice(0, 10), added: rows.filter((r) => r.published > start && r.published <= end).length };
  });

  const restock = rows.filter((r) => r.soldOut > 0 && r.variants > 1)
    .sort((a, b) => b.soldOut / b.variants - a.soldOut / a.variants || b.soldOut - a.soldOut)
    .slice(0, 12)
    .map((r) => ({ title: r.title, brand: r.brand, price: r.price, sold_out: r.soldOutSizes, in_stock: r.variants - r.soldOut, path: `/products/${r.handle}` }));

  return {
    updated: now.toISOString(),
    totals: {
      products: rows.length, brands: brands.length, sizes_listed: variants,
      sizes_in_stock_pct: variants ? Math.round((1 - soldVariants / variants) * 1000) / 10 : 0,
      fully_sold_out: rows.filter((r) => r.soldOut === r.variants).length,
      median_price: prices.length ? prices[Math.floor(prices.length / 2)] : 0,
      on_sale: rows.filter((r) => r.onSale).length,
      added_last_30_days: rows.filter((r) => now - r.published <= 30 * 864e5).length,
    },
    top_brands: brands.slice(0, 10).map((b) => ({ brand: b.brand, products: b.products })),
    selling_out: brands.filter((b) => b.variants >= 15).map((b) => ({ brand: b.brand, sold_out_pct: Math.round((b.soldOut / b.variants) * 100) }))
      .sort((a, b) => b.sold_out_pct - a.sold_out_pct).slice(0, 8),
    price_bands: priceBands,
    weekly_new: weekly,
    restock,
  };
}

export default async function handler(req, res) {
  try {
    const data = summarize(await allProducts());
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "Could not load the store catalog right now" });
  }
}
