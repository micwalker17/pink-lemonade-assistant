"""Pink Lemonade shop assistant demo for Streamlit Community Cloud.

The storefront copy shows on the left and the AI assistant chat on the right.
The Anthropic API key lives in the app's Streamlit secrets, never in the page.
"""

from pathlib import Path

import anthropic
import streamlit as st

HERE = Path(__file__).parent
SYSTEM_PROMPT = (HERE / "system_prompt.txt").read_text()  # store facts + catalog, built from catalog.js
MAX_QUESTIONS = 30  # per visitor session, to keep costs predictable
SUGGESTIONS = [
    "Do you have the Fran Dress Holiday Plaid in 4-5Y?",
    "What Jellycat do you have under $30?",
    "Baby shower gift around $40?",
    "Do you ship free?",
]

st.set_page_config(page_title="Pink Lemonade Shop Assistant", page_icon="🍋", layout="wide")
st.markdown(
    """
    <style>
      .block-container {padding-top: 1.2rem; max-width: 1500px}
      .pl-title {font-family: Georgia, serif; color: #b2325f; font-size: 1.6rem; margin: 0}
      .pl-sub {color: #86707a; font-size: .9rem; margin: 0 0 .6rem}
      div.stButton > button {border-radius: 999px; border-color: #f0d6de; font-size: .85rem}
      div.stButton > button:hover {border-color: #e8668f; color: #b2325f}
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def get_client():
    try:
        key = st.secrets["ANTHROPIC_API_KEY"]
    except Exception as err:  # no secrets file, or the key isn't in it
        raise KeyError("ANTHROPIC_API_KEY") from err
    return anthropic.Anthropic(api_key=key)


def ask_claude(history):
    """Stream Claude's answer for the chat so far."""
    with get_client().beta.messages.stream(
        model="claude-opus-5-5",
        max_tokens=4000,
        output_config={"effort": "low"},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=history[-10:],
    ) as stream:
        yield from stream.text_stream
        if stream.get_final_message().stop_reason == "refusal":
            yield "I can only help with questions about our shop. A team member is happy to help with anything else!"


if "messages" not in st.session_state:
    st.session_state.messages = []

shop, chat = st.columns([3, 2], gap="large")

with shop:
    st.iframe(HERE / "storefront.html", height=1150)

with chat:
    st.markdown('<p class="pl-title">Pink Lemonade Assistant</p>', unsafe_allow_html=True)
    st.markdown('<p class="pl-sub">Staff preview. Ask about stock, sizes, gifts and shipping.</p>', unsafe_allow_html=True)

    picked = None
    cols = st.columns(2)
    for i, s in enumerate(SUGGESTIONS):
        if cols[i % 2].button(s, key=f"s{i}", use_container_width=True):
            picked = s

    box = st.container(height=620)
    with box:
        if not st.session_state.messages:
            with st.chat_message("assistant", avatar="🍋"):
                st.write("Hi! I'm the Pink Lemonade assistant. Ask me what's in stock, which sizes are left, or for gift ideas.")
        for m in st.session_state.messages:
            with st.chat_message(m["role"], avatar="🍋" if m["role"] == "assistant" else None):
                st.write(m["content"])

    typed = st.chat_input("Ask about a product, size or gift…")
    question = (typed or picked or "").strip()[:1000]

    if question:
        asked = sum(1 for m in st.session_state.messages if m["role"] == "user")
        with box:
            with st.chat_message("user"):
                st.write(question)
            with st.chat_message("assistant", avatar="🍋"):
                if asked >= MAX_QUESTIONS:
                    answer = "That's a lot of questions! Please refresh the page to start a new chat."
                    st.write(answer)
                else:
                    st.session_state.messages.append({"role": "user", "content": question})
                    try:
                        answer = st.write_stream(ask_claude(st.session_state.messages))
                    except KeyError:
                        answer = "The assistant isn't set up yet: the API key is missing from this app's secrets."
                        st.write(answer)
                    except anthropic.AuthenticationError:
                        answer = "The assistant isn't set up yet: the API key in this app's secrets was rejected."
                        st.write(answer)
                    except anthropic.RateLimitError:
                        answer = "I'm getting a lot of questions at once. Please try again in a minute."
                        st.write(answer)
                    except anthropic.APIError:
                        answer = "Sorry, that answer got interrupted. Please ask again."
                        st.write(answer)
                    st.session_state.messages.append({"role": "assistant", "content": answer})
