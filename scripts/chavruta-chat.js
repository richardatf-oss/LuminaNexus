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

  function getQS() {
    const params = new URLSearchParams(window.location.search);
    return {
      // ✅ New standard (from Library)
      q: (params.get("q") || "").trim(),
      // ✅ Back-compat
      ref: (params.get("ref") || "").trim(),
      text: (params.get("text") || "").trim(),
      // ✅ Optional behavior
      autosend: (params.get("autosend") || "").trim(), // "1"
      mode: (params.get("mode") || "").trim(),
    };
  }

  function cleanQS(keys = ["q", "ref", "text", "autosend", "mode"]) {
    const url = new URL(window.location.href);
    keys.forEach(k => url.searchParams.delete(k));
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", url.pathname + (qs ? `?${qs}` : ""));
  }

  async function postWithRetry(payload) {
    const delays = [0, 800, 1600]; // 3 attempts
    let last = null;

    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);

      // ✅ Mobile-safe timeout
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) return { ok: true, data };

        const msg = data?.error || `HTTP ${res.status}`;
        const retryable = [502, 503, 504].includes(res.status) || /timeout/i.test(msg);
        last = { ok: false, status: res.status, msg };
        if (!retryable) break;
      } catch (err) {
        const isAbort = err?.name === "AbortError";
        last = { ok: false, status: 0, msg: isAbort ? "Timeout (15s)" : (err.message || "Network error") };
      } finally {
        clearTimeout(timer);
      }
    }

    return last || { ok: false, status: 0, msg: "Unknown error" };
  }

  async function ask(userText) {
    UI()?.setStatus("Thinking…");
    if (sendBtn()) sendBtn().disabled = true;
    if (input()) input().disabled = true;

    try {
      // ✅ Payload accepts input; server also accepts message, but we standardize on input
      const result = await postWithRetry({ input: userText, history });

      if (!result.ok) {
        UI()?.addMessage("Chavruta", `Error: ${result.msg}`, "assistant");
        return;
      }

      // ✅ Support both server fields
      const text =
        (String(result.data.content || "").trim()) ||
        (String(result.data.reply || "").trim()) ||
        "(No response text returned.)";

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
    // ✅ Supports:
    // /chavruta.html?q=Genesis%201:1
    // /chavruta.html?ref=Berakhot%204a
    // /chavruta.html?text=Genesis%201:1
    // Optional: &autosend=1
    const { q, ref, text, autosend, mode } = getQS();
    const seed = q || ref || text;

    if (!seed) return;

    if (input()) input().value = seed;

    // Optional: apply a mode prompt wrapper (future-proof)
    // e.g. /chavruta.html?q=Genesis%201:1&mode=clarify
    if (mode && input()) {
      // Don’t overwrite user’s seed; just leave it in input.
      // Mode can be used later if you want.
    }

    // ✅ Remove params so reload doesn't re-inject
    cleanQS();

    // ✅ Optional autosend
    if (autosend === "1") {
      // Wait for DOM + event handlers to be wired, then submit
      setTimeout(() => {
        const current = (input()?.value || "").trim();
        if (current) submit(current);
      }, 120);
    }
  }

  function wireQuickActions() {
    // If these buttons don't exist on the page, no problem.
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
