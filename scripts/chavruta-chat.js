// /scripts/chavruta-chat.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";
  const history = [];

  const UI = () => window.ChavrutaUI;

  const form = () => document.getElementById("chatForm");
  const input = () => document.getElementById("chatInput");
  const sendBtn = () => document.getElementById("sendBtn");

  function push(role, content) {
    history.push({ role, content });
    if (history.length > 24) history.splice(0, history.length - 24);
  }

  async function ask(userText) {
    UI()?.setStatus("Thinking…");
    if (sendBtn()) sendBtn().disabled = true;
    if (input()) input().disabled = true;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userText, history }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const msg = data?.error ? data.error : `HTTP ${res.status}`;
        UI()?.addMessage("Chavruta", `Error: ${msg}`, "assistant");
        return;
      }

      const text = (data.content || "").trim() || "(No response text returned.)";
      UI()?.addMessage("Chavruta", text, "assistant");
      push("assistant", text);
    } catch (err) {
      UI()?.addMessage("Chavruta", `Error: ${err.message}`, "assistant");
    } finally {
      UI()?.setStatus("Ready");
      if (sendBtn()) sendBtn().disabled = false;
      if (input()) { input().disabled = false; input().focus(); }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    // HARD FAIL if the page isn't wired correctly
    if (!form() || !input() || !sendBtn() || !UI()) {
      console.error("[Chavruta] Wiring failure. Missing one of: chatForm, chatInput, sendBtn, or ChavrutaUI.");
      return;
    }

    form().addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = (input().value || "").trim();
      if (!text) return;

      UI().addMessage("You", text, "user");
      push("user", text);
      input().value = "";

      await ask(text);
    });
  });
})();
