// Pink Lemonade shop-assistant bubble. Added to every page of the store copy.
// The conversation is kept for this browser tab, so it follows the shopper from page to page.
(function () {
  if (document.getElementById("pla-root")) return;
  const KEY = "pla-chat-v1";
  const load = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || { turns: [], open: false, banner: true }; } catch { return { turns: [], open: false, banner: true }; } };
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  const state = load();
  const SUGG = ["What's new this week?", "Jellycat under $30?", "Baby gift around $40", "What's your return policy?"];

  const root = document.createElement("div");
  root.id = "pla-root";
  root.innerHTML = `
    <div id="pla-banner" ${state.banner ? "" : "hidden"}>Staff preview of pinklemonademi.com with the new shop assistant. Buying is turned off.<button type="button" aria-label="Hide notice">×</button></div>
    <a id="pla-insights" href="/analytics"><span aria-hidden="true">📊</span>Shop Insights</a>
    <button id="pla-fab" type="button" aria-expanded="false" aria-controls="pla-panel"><i></i>Ask Pink Lemonade</button>
    <section id="pla-panel" hidden aria-label="Shop assistant">
      <div class="pla-head"><div><strong>Pink Lemonade Assistant</strong><small>Stock, sizes, gifts, shipping and returns</small></div><button type="button" class="pla-x" aria-label="Close chat">×</button></div>
      <div class="pla-msgs" aria-live="polite"></div>
      <div class="pla-sugg">${SUGG.map((s) => `<button type="button">${s}</button>`).join("")}</div>
      <form class="pla-form"><input id="pla-q" autocomplete="off" placeholder="Ask about a product, size or gift…" aria-label="Your question"><button type="submit">Send</button></form>
    </section>`;
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const panel = $("#pla-panel"), fab = $("#pla-fab"), msgs = $(".pla-msgs"), input = $("#pla-q");
  let busy = false;

  // Show [label](/path) links from the assistant as real links; everything else stays plain text.
  function fill(el, text) {
    el.textContent = "";
    const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      el.append(text.slice(last, m.index));
      const a = document.createElement("a");
      a.href = m[2]; a.textContent = m[1];
      el.append(a);
      last = re.lastIndex;
    }
    el.append(text.slice(last).replace(/\*\*/g, ""));
  }
  function add(role, text) {
    const d = document.createElement("div");
    d.className = "pla-m " + (role === "user" ? "pla-me" : "pla-bot");
    fill(d, text);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }
  function render() {
    msgs.textContent = "";
    add("assistant", "Hi! I'm the Pink Lemonade assistant. Ask me what's in stock, which sizes are left, gift ideas, or anything about our shop.");
    state.turns.forEach((t) => add(t.role, t.content));
  }
  function setOpen(open) {
    state.open = open; save();
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) { msgs.scrollTop = msgs.scrollHeight; input.focus(); }
  }

  async function ask(q) {
    if (busy || !q.trim()) return;
    busy = true;
    state.turns.push({ role: "user", content: q.trim() }); save();
    add("user", q.trim());
    const bubble = add("assistant", "Looking that up…");
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: state.turns.slice(-10), page: location.pathname }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(data.error || "failed"), { status: r.status });
      fill(bubble, data.reply);
      state.turns.push({ role: "assistant", content: data.reply }); save();
    } catch (e) {
      state.turns.pop(); save();
      fill(bubble, e.status === 429 ? "I'm getting a lot of questions at once. Please try again in a minute." : "Sorry, I can't answer right now. Please try again, or ask a team member.");
    }
    busy = false;
  }

  fab.onclick = () => setOpen(panel.hidden);
  $(".pla-x").onclick = () => setOpen(false);
  $(".pla-sugg").addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });
  $(".pla-form").addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; ask(v); });
  $("#pla-banner button").onclick = () => { state.banner = false; save(); $("#pla-banner").hidden = true; };

  // Buying is off in the preview: stop add-to-cart and checkout before the store's own scripts run.
  function toast(msg) {
    let t = document.getElementById("pla-toast");
    if (!t) { t = document.createElement("div"); t.id = "pla-toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
  }
  document.addEventListener("submit", (e) => {
    const action = e.target.getAttribute && (e.target.getAttribute("action") || "");
    if (/\/cart|checkout/i.test(action)) { e.preventDefault(); e.stopImmediatePropagation(); toast("This is a staff preview, so buying is turned off. Try the chat instead!"); }
  }, true);
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest('[name="add"], [name="checkout"], .shopify-payment-button, a[href^="/cart"], a[href*="checkout"]');
    if (el && !root.contains(el)) { e.preventDefault(); e.stopImmediatePropagation(); toast("This is a staff preview, so buying is turned off. Try the chat instead!"); }
  }, true);

  render();
  setOpen(state.open);
})();
