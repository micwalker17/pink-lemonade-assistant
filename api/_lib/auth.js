// Staff-only access for connecting business accounts and seeing private numbers.
// The owner sets ADMIN_PASSCODE in Vercel; entering it once sets a signed cookie for 30 days.
// Files in api/_lib are shared code, not endpoints.
import crypto from "node:crypto";

const DAY = 864e5;
export const passcodeSet = () => Boolean(process.env.ADMIN_PASSCODE);

// One secret for signing cookies and encrypting stored keys. APP_SECRET if set, otherwise derived from the passcode.
function secret(purpose) {
  const base = process.env.APP_SECRET || process.env.ADMIN_PASSCODE || "";
  return crypto.createHash("sha256").update(`pink-lemonade:${purpose}:${base}`).digest();
}
const sign = (value) => crypto.createHmac("sha256", secret("cookie")).update(value).digest("base64url");

export function readCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter(([k]) => k)
    .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
}
function cookie(name, value, maxAgeSec) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function isAdmin(req) {
  if (!passcodeSet()) return false;
  const [stamp, mac] = String(readCookies(req).pla_admin || "").split(".");
  return Boolean(stamp && mac) && safeEqual(mac, sign(stamp)) && Date.now() - Number(stamp) < 30 * DAY;
}
export function checkPasscode(given) {
  return passcodeSet() && safeEqual(String(given || "").trim(), process.env.ADMIN_PASSCODE.trim());
}
export const loginCookie = () => { const stamp = String(Date.now()); return cookie("pla_admin", `${stamp}.${sign(stamp)}`, 30 * 86400); };
export const logoutCookie = () => cookie("pla_admin", "", 0);

// Short-lived signed value that ties an OAuth callback to the browser that started it.
export const stateCookie = (provider, state) => cookie(`pla_oauth_${provider}`, `${state}.${sign(provider + state)}`, 600);
export function checkState(req, provider, state) {
  const [saved, mac] = String(readCookies(req)[`pla_oauth_${provider}`] || "").split(".");
  return Boolean(saved && state) && safeEqual(saved, state) && safeEqual(mac, sign(provider + saved));
}

// Keys from connected services are encrypted before they are stored.
export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", secret("store"), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}
export function decrypt(text) {
  try {
    const [iv, tag, data] = String(text).split(".").map((s) => Buffer.from(s, "base64url"));
    const d = crypto.createDecipheriv("aes-256-gcm", secret("store"), iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
  } catch {
    return null; // wrong secret (passcode changed) or damaged entry: treat as not connected
  }
}

// The site's public address; set PUBLIC_URL in Vercel so sign-in callbacks always match what each service has on file.
export const siteUrl = (req) => (process.env.PUBLIC_URL || `https://${req.headers["x-forwarded-host"] || req.headers.host}`).replace(/\/$/, "");
