// Shop-assistant endpoint. The page sends the chat so far; this calls Claude with the
// store facts and catalog and returns the reply. The API key never leaves the server.
import Anthropic from "@anthropic-ai/sdk";
import { buildRules } from "../catalog.js";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the host's environment settings
const SYSTEM = buildRules();

// Light abuse guard: a few questions per minute per visitor. It is per server instance,
// so it is best-effort; the real cost cap is the monthly spend limit in the Anthropic Console.
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 8;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0] || "unknown";
  if (tooMany(ip)) return res.status(429).json({ error: "Too many questions, try again in a minute" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-10)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!messages.length || messages[0].role !== "user" || messages.at(-1).role !== "user") {
    return res.status(400).json({ error: "Send a question" });
  }

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages,
    });
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: "I can only help with questions about our shop. A team member is happy to help with anything else!" });
    }
    const reply = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return res.status(200).json({ reply: reply || "Sorry, I didn't catch that. Could you ask again?" });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Busy, try again shortly" });
    console.error(err);
    return res.status(502).json({ error: "Assistant unavailable" });
  }
}
