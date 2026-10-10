# Pink Lemonade shop assistant (staff preview)

A live copy of pinklemonademi.com with an AI shop assistant added to every page. Anyone with the link can use it; no sign-in.

## How it works

- **Every page is her real page.** When someone opens a page on the preview, `api/proxy.js` fetches the same page from pinklemonademi.com, keeps the links inside the preview, and adds the chat bubble. Nothing is copied by hand, so the design, menus, photos, prices and stock always match the live site.
- **Buying is turned off.** Cart, checkout and account pages show a "staff preview" notice instead.
- **The assistant reads the live store.** `api/chat.js` gives Claude four lookups: search all products, get one product's sizes and stock, read any page (policies, contact, about), and list the site's pages. It also knows which page the shopper is on, so "is this in 4T?" works on a product page.
- **Search engines are told to skip the preview**, so it can't compete with her real site in Google.
- The API key stays on the server and is never sent to visitors.

## Put it online (Vercel, free plan)

1. Get an API key at console.anthropic.com and set a monthly spend limit under Limits.
2. At vercel.com/new, sign in with GitHub and import `micwalker17/pink-lemonade-assistant`. Leave the build settings alone.
3. Before deploying, add an environment variable `ANTHROPIC_API_KEY` with the key.
4. Deploy and share the `https://<project>.vercel.app` link.

## Cost

Claude Opus 5.5 at low effort. A question usually costs a few cents, a bit more when it needs several lookups. Each visitor is limited to 8 questions a minute. Changing `model` in `api/chat.js` to `claude-haiku-5-5` makes it far cheaper, with somewhat simpler answers.

## Other files

The `streamlit-version` folder holds the earlier Streamlit version (a snapshot of about 95 products beside a chat panel). Vercel ignores it.
