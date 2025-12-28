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
      q: (params.get("q") || "").trim(),
      ref: (params.get("ref") || "").trim(),
      text: (params.get("text") || "").trim(),
      autosend: (params.get("autosend") || "").trim(),
      mode: (params.get("mode") || "").trim(),
    };
  }

  function cleanQS(keys = ["q", "ref", "text", "autosend", "mode"]) {
    const url = new URL(window.location.href);
    keys.forEach(k => url.searchParams.delete(k));
    const qs = url.searchParams.toString();
    window.history.replaceState({}, "", url.pathname + (qs ? `?${qs}` : ""));
  }

  // ---- Sanitization helpers (same idea as Library) ----

  function decodeHtmlEntities(str) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }

  function stripTagsKeepingLineBreaks(html) {
    let s = String(html || "");

    s = s.replace(/<span[^>]*class="[^"]*\bpoetry\b[^"]*"[^>]*>/gi, "\n");
    s = s.replace(/<span[^>]*class="[^"]*\bindentAllDouble\b[^"]*"[^>]*>/gi, "\n    ");
    s = s.replace(/<span[^>]*class="[^"]*\bindentAll\b[^"]*"[^>]*>/gi, "\n  ");

    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/p\s*>/gi, "\n");
    s = s.replace(/<p[^>]*>/gi, "");
    s = s.replace(/<\/div\s*>/gi, "\n");
    s = s.replace(/<div[^>]*>/gi, "");

    s = s.replace(/<\/?[^>]+>/g, "");
    s = decodeHtmlEntities(s);
    s = s.replace(/\u00A0/g, " ");

    s = s.replace(/[ \t]+\n/g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    s = s.replace(/[ \t]{3,}/g, "  ");

    return s.trim();
  }

  function sanitizeSefariaText(raw) {
    return stripTagsKeepingLineBreaks(raw);
  }

  function readBundle() {
    try {
      const raw = sessionStorage.getItem("LN_CHAVRUTA_BUNDLE");
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;

      const ref = String(data.ref || "").trim();
      const en = sanitizeSefariaText(String(data.en || ""));
      const he = sanitizeSefariaText(String(data.he || ""));

      if (!ref && !en && !he) return null;
      return { ref, en, he };
    } catch {
      return null;
    }
  }

  function clearBundle() {
    try { sessionStorage.removeItem("LN_CHAVRUTA_BUNDLE"); } catch {}
  }

  function formatTextFirstBlock(bundle) {
    const lines = [];
    lines.push(bundle.ref ? `Reference: ${bundle.ref}` : "Reference: (none)");

    if (bundle.en) {
      lines.push("\nENGLISH:");
      lines.push(bundle.en);
    }
    if (bundle.he) {
      lines.push("\nHEBREW:");
      lines.push(bundle.he);
    }

    lines.push("\nSTUDY REQUEST:");
    lines.push("Start with the text above. Then give 3–7 study questions. Speculation must be labeled.");

    return lines.join("\n");
  }

  async function postWithRetry(payload) {
    const delays = [0, 800, 1600];
    let last = null;

    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await sleep(delays[i]);

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
      const result = await postWithRetry({ input: userText, history });

      if (!result.ok) {
        UI()?.addMessage("Chavruta", `Error: ${result.msg}`, "assistant");
        return;
      }

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
    const { q, ref, text, autosend } = getQS();
    const seed = q || ref || text;

    if (seed && input()) input().value = seed;

    if (seed || autosend) cleanQS();

    if (autosend === "1") {
      setTimeout(() => {
        const current = (input()?.value || "").trim();
        if (current) submit(current);
      }, 120);
    }
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

    const bundle = readBundle();
    if (bundle) {
      const block = formatTextFirstBlock(bundle);
      clearBundle();

      UI()?.addMessage("System", "Loaded full text from Library.", "assistant");

      if (bundle.ref && input()) input().value = bundle.ref;

      // Send sanitized full text upstream
      submit(block);
    } else {
      prefillFromLibraryLink();
    }

    wireQuickActions();

    form().addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = (input().value || "").trim();
      if (!text) return;
      await submit(text);
    });
  });
})();
