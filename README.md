# Pink Lemonade shop assistant (staff demo)

A copy of the Pink Lemonade storefront with an AI chat assistant. Anyone with the link can use it; no sign-in.

## What's here

- `index.html`: the storefront page and chat bubble.
- `catalog.js`: the products, sizes and store facts the assistant knows. The page and the server both read this file.
- `api/chat.js`: the small server function that talks to Claude. The API key stays here, on the host, and is never sent to visitors' browsers.
- `package.json`: tells the host to install the Anthropic library.

## Putting it online (Vercel, free plan)

1. Get an API key at console.anthropic.com (add a little prepaid credit, and set a monthly spend limit under Limits).
2. Put this folder in a GitHub repository.
3. At vercel.com, sign in with GitHub, choose "Add New Project", and import that repository. No build settings are needed.
4. Under the project's Settings > Environment Variables, add `ANTHROPIC_API_KEY` with the key, then redeploy.
5. Share the `https://<project>.vercel.app` link.

If the key is missing or the AI is down, the chat falls back to a simple catalog search, so the page never breaks.

## Cost

The assistant uses Claude Opus 5.5 at low effort. Each question costs roughly 1 to 2 cents. Changing `model` in `api/chat.js` to `claude-haiku-5-5` makes it far cheaper, with somewhat simpler answers.
