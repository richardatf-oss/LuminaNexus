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

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function postWithRetry(payload) {
    // Retry only on transient failures
    const delays = [0, 800, 1600]; // 3 attempts total
    let last = null;

    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) return { ok: true, data };

        // Retry only if server says 502/503/504 or upstream timeout
        const msg = data?.error || `HTTP ${res.status}`;
        const retryable = [502, 503, 504].includes(res.status) || /timeout/i.test(msg);

        last = { ok: false, status: res.status, msg };
        if (!retryable) break;
      } catch (err) {
        last = { ok: false, status: 0, msg: err.message };
        // network glitch → retry
      }
    }

    return last || { ok: false, status: 0, msg: "Unknown error" };
  }

  async function ask(userText) {
    UI()?.setStatus("Thinking…");
    if (sendBtn()) sendBtn().disabled = true;
    if (input()) input().disabled = true;

    try {
      const result = await postWithRetry({ input: userText, history });

      if (!result.ok) {
        UI()?.addMessage("Chavruta", `Error: ${result.msg}`, "assistant");
        return;
      }

      const text = (result.data.content || "").trim() || "(No response text returned.)";
      UI()?.addMessage("Chavruta", text, "assistant");
      push("assistant", text);
    } finally {
      UI()?.setStatus("Ready");
      if (sendBtn()) sendBtn().disabled = false;
      if (input()) { input().disabled = false; input().focus(); }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!form() || !input() || !sendBtn() || !UI()) return;

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
