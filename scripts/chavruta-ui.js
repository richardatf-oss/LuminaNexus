// /scripts/chavruta-ui.js
(() => {
  const UI = {};

  UI.streamEl = () => document.getElementById("chatStream");
  UI.statusEl = () => document.getElementById("statusPill");

  UI.setStatus = (text) => {
    const el = UI.statusEl();
    if (el) el.textContent = text;
  };

  UI.addMessage = (who, text, role) => {
    const stream = UI.streamEl();
    if (!stream) return;

    const row = document.createElement("div");
    row.className = "msg";

    const left = document.createElement("div");
    left.className = "who";
    left.textContent = who;

    const bubble = document.createElement("div");
    bubble.className = "bubble " + (role === "user" ? "user" : "assistant");
    bubble.textContent = text;

    row.appendChild(left);
    row.appendChild(bubble);
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  };

  UI.boot = () => {
    UI.setStatus("Ready");
    UI.addMessage(
      "Chavruta",
      "Shalom. Bring one passage or one question. We will go slowly, Torah-first.",
      "assistant"
    );
  };

  window.ChavrutaUI = UI;

  document.addEventListener("DOMContentLoaded", () => {
    // Basic sanity: if stream missing, surface it loudly
    if (!UI.streamEl()) {
      console.error("[Chavruta] Missing #chatStream on page.");
      return;
    }
    UI.boot();
  });
})();
