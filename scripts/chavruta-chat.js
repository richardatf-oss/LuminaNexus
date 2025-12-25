// /scripts/chavruta-chat.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";
  const history = [];
  let lastAssistant = "";

  const UI = () => window.ChavrutaUI;
  const form = () => document.getElementById("chatForm");
  const input = () => document.getElementById("chatInput");
  const sendBtn = () => document.getElementById("sendBtn");

  const btnContinue = () => document.getElementById("btnContinue");
  const btnClarify = () => document.getElementById("btnClarify");
  const btnSummarize = () => document.getElementById("btnSummarize");

  function push(role, content) {
    history.push({ role, content });
    if (history.length > 24) history.splice(0, history.length - 24);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function postWithRetry(payload) {
    const delays = [0, 800, 1600]; // 3 attempts
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

        const msg = data?.error || `HTTP ${res.status}`;
        const retryable = [502, 503, 504].includes(res.status) || /timeout/i.test(msg);
        last = { ok: false, status: res.status, msg };
        if (!retryable) break;
      } catch (err) {
        last = { ok: false, status: 0, msg: err.message };
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
      lastAssistant = text;
    } finally {
      UI()?.setStatus("Ready");
      if (sendBtn()) sendBtn().disabled = false;
      if (input()) { input().disabled = false; input().focus(); }
    }
  }

  async function submit(text) {
    const t = String(text || "").trim();
    if (!t) return;

    UI()?.addMessage("You", t, "user");
    push("user", t);
    if (input()) input().value = "";
    await ask(t);
  }

  function prefillFromLibraryLink() {
    // Library handoff via querystring:
    // /pages/chavruta?ref=Berakhot%204a
    // or /pages/chavruta?text=Genesis%201:1
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || params.get("text") || "";

    if (!ref) return;

    // Put it into input and clean the URL (so reloads don’t keep injecting)
    if (input()) input().value = ref;

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);
  }

  function wireQuickActions() {
    if (btnContinue()) {
      btnContinue().addEventListener("click", () => {
        const prompt =
          lastAssistant
            ? "Continue this sugya. Stay Torah-first. Quote no invented citations. If you speculate, label it. Give (1) one more key source line to focus, then (2) 5 study questions, then (3) one practical takeaway."
            : "Continue the last topic. Stay Torah-first. Give 5 study questions and a short takeaway.";
        submit(prompt);
      });
    }

    if (btnClarify()) {
      btnClarify().addEventListener("click", () => {
        submit("Ask me 3 clarifying questions that would make the learning more precise, then wait for my answers.");
      });
    }

    if (btnSummarize()) {
      btnSummarize().addEventListener("click", () => {
        submit("Summarize what we have covered so far in 6 bullet points. Then list 3 open questions to pursue next.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!form() || !input() || !sendBtn() || !UI()) return;

    prefillFromLibraryLink();
    wireQuickActions();

    form().addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = (input().value || "").trim();
      if (!text) return;
      await submit(text);
    });
  });
})();
