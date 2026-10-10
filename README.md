# Pink Lemonade shop assistant (staff demo)

A copy of the Pink Lemonade storefront with an AI chat assistant beside it. Anyone with the link can use it; no sign-in.

## Put it online with Streamlit Community Cloud

1. Go to share.streamlit.io and click **Create app**, then **Deploy a public app from GitHub**.
2. Repository: `micwalker17/pink-lemonade-assistant`, branch `main`, main file `streamlit_app.py`.
3. Open **Advanced settings** and paste this into **Secrets**, with your key:

   ```toml
   ANTHROPIC_API_KEY = "sk-ant-..."
   ```

4. Click **Deploy** and share the `….streamlit.app` link.

Secrets belong to each app, so the key needs to be pasted here even if another Streamlit app already has it. The key stays on Streamlit's server and is never sent to visitors.

## Files

- `streamlit_app.py`: the Streamlit app (storefront on the left, chat on the right).
- `storefront.html`: the storefront copy shown in the app.
- `system_prompt.txt`: what the assistant knows (store facts and the catalog snapshot).
- `catalog.js`: the catalog source. After editing it, regenerate the prompt with
  `node -e "import('./catalog.js').then(m=>require('fs').writeFileSync('system_prompt.txt', m.buildRules()))"`.
- `index.html`, `api/chat.js`, `package.json`: an alternative version for Vercel, if you ever want the chat bubble inside the storefront itself.

## Cost

The assistant uses Claude Opus 5.5 at low effort, roughly 1 to 2 cents per question, and each visitor is capped at 30 questions per session. Set a monthly spend limit in the Anthropic Console. Changing `model` in `streamlit_app.py` to `claude-haiku-5-5` makes it far cheaper, with somewhat simpler answers.
