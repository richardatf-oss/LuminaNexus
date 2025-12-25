// /scripts/chavruta-chat.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";
  const history = [];

  function push(role, content) {
    history.push({ role, content });
    if (history.length > 24) history.splice(0, history.length - 24);
  }

  async function ask(userText) {
    const UI = window.ChavrutaUI;
    if (!UI) return;

    UI.setStatus("Thinking…");

    if (UI.buttonEl) UI.buttonEl.disabled = true;
    if (UI.inputEl) UI.inputEl.disabled = true;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userText, history }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        const msg = data?.error ? data.error : `HTTP ${res.status}`;
        UI.addMessage("Chavruta", `Error: ${msg}`, "assistant");
        return;
      }

      const text = (data.content || "").trim() || "(No response text returned.)";
      UI.addMessage("Chavruta", text, "assistant");
      push("assistant", text);
    } catch (err) {
      UI.addMessage("Chavruta", `Error: ${err.message}`, "assistant");
    } finally {
      UI.setStatus("Ready");
      if (UI.buttonEl) UI.buttonEl.disabled = false;
      if (UI.inputEl) { UI.inputEl.disabled = false; UI.inputEl.focus(); }
    }
  }

  function submitFromInput() {
    const UI = window.ChavrutaUI;
    if (!UI || !UI.inputEl) return;

    const text = (UI.inputEl.value || "").trim();
    if (!text) return;

    UI.addMessage("You", text, "user");
    push("user", text);
    UI.inputEl.value = "";

    ask(text);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const UI = window.ChavrutaUI;

    if (!UI) {
      console.warn("[Chavruta] UI not found (window.ChavrutaUI missing).");
      return;
    }

    // Bind form submit if there is a form
    if (UI.formEl) {
      UI.formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        submitFromInput();
      });
    }

    // Bind Send button click regardless of form
    if (UI.buttonEl) {
      UI.buttonEl.addEventListener("click", (e) => {
        // If button is inside a form, submit handler will catch; prevent double fire
        if (UI.formEl) return;
        e.preventDefault();
        submitFromInput();
      });
    }

    // Bind Enter key on the input (works even without a form)
    if (UI.inputEl) {
      UI.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          // Don’t submit if user is holding Shift (future proof for textarea)
          if (e.shiftKey) return;
          e.preventDefault();
          submitFromInput();
        }
      });
    }

    console.log("[Chavruta] Chat bound");
  });
})();
