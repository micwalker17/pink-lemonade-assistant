// Small key-value store for connected-account keys: Upstash Redis (Vercel Marketplace "Upstash for Redis" / former Vercel KV)
// over its REST API, so no extra package is needed. Values are encrypted by the caller.
const env = (...names) => names.map((n) => process.env[n]).find(Boolean);
const URL_ = () => env("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
const TOKEN = () => env("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");

export const storeReady = () => Boolean(URL_() && TOKEN());

async function command(...args) {
  if (!storeReady()) throw new Error("Storage is not set up. Add Upstash for Redis to the Vercel project.");
  const r = await fetch(URL_(), { method: "POST", headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`Storage error: ${data.error || r.status}`);
  return data.result;
}

const PREFIX = "pla:conn:";
export const getConn = (provider) => command("GET", PREFIX + provider);
export const setConn = (provider, value) => command("SET", PREFIX + provider, value);
export const delConn = (provider) => command("DEL", PREFIX + provider);

// Short-lived cache so the dashboard doesn't re-download every order on each visit.
export const getCache = (key) => command("GET", "pla:cache:" + key);
export const setCache = (key, value, seconds) => command("SET", "pla:cache:" + key, value, "EX", String(seconds));
export const delCache = (key) => command("DEL", "pla:cache:" + key);
