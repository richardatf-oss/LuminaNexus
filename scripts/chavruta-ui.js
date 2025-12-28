// /scripts/chavruta-ui.js
(// scripts/chavruta-ui.js
// Purpose: Library -> Chavruta handoff (q=...) + optional autosend
// Safe: does not assume internals of chavruta-chat.js; triggers form submit.

(function () {
  const $ = (s) => document.querySelector(s);

  const form = $("#chatForm");
  const input = $("#chatInput");
  const status = $("#statusPill");

  function setStatus(text) {
    if (!status) return;
    status.textContent = text;
  }

  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function removeParams(...names) {
    const url = new URL(window.location.href);
    names.forEach((n) => url.searchParams.delete(n));
    window.history.replaceState({}, document.title, url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""));
  }

  function focusInputEnd() {
    if (!input) return;
    input.focus({ preventScroll: false });
    const v = input.value;
    input.setSelectionRange(v.length, v.length);
  }

  function safeSubmit() {
    if (!form) return;
    // Trigger the existing submit handler in chavruta-chat.js
    const ev = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
  }

  // --- MAIN HANDOFF ---
  window.addEventListener("DOMContentLoaded", () => {
    if (!input) return;

    // Library sends: /chavruta.html?q=Genesis%201:1
    const q = getParam("q");
    const autosend = getParam("autosend"); // "1" to send immediately
    const mode = getParam("mode"); // optional future use

    if (q && q.trim()) {
      input.value = q.trim();

      // Helpful UX
      setStatus("Loaded from Library");
      focusInputEnd();

      // Optional: if autosend=1, submit after a short tick
      if (autosend === "1") {
        setStatus("Sending…");
        setTimeout(() => {
          safeSubmit();
          // Remove autosend so refresh doesn't re-fire
          removeParams("autosend");
        }, 150);
      }

      // Clean q from URL so refresh doesn't keep reloading the same prompt
      removeParams("q", "mode");
    }
  });
})();
() => {
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

  // Split Hebrew blocks if present
  let hebrew = "";
  let body = text;

  const hebrewMatch = text.match(/HEBREW:\s*([\s\S]*)$/i);
  if (hebrewMatch) {
    hebrew = hebrewMatch[1].trim();
    body = text.replace(hebrewMatch[0], "").trim();
  }

  // Semantic formatting
  body = body
    .replace(/^Text:\s*/im, '<div class="section-title">Text</div><div class="text-block">')
    .replace(/^Questions for study:\s*/im, '</div><div class="section-title">Questions for study</div><ol class="questions">')
    .replace(/^\s*-\s+/gm, "<li>")
    .replace(/\n(?=<li>)/g, "")
    .replace(/(<li>.*?)(?=<li>|$)/gs, "$1</li>")
    .replace(/<\/li>\s*<\/div>/, "</li></ol></div>");

  bubble.innerHTML = body;

  if (hebrew) {
    const toggle = document.createElement("div");
    toggle.className = "hebrew-toggle";
    toggle.textContent = "Show Hebrew";

    const heb = document.createElement("div");
    heb.className = "hebrew";
    heb.textContent = hebrew;

    toggle.onclick = () => {
      const open = heb.style.display === "block";
      heb.style.display = open ? "none" : "block";
      toggle.textContent = open ? "Show Hebrew" : "Hide Hebrew";
    };

    bubble.appendChild(toggle);
    bubble.appendChild(heb);
  }

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

  document.addEventListener("DOMContentLoaded", () => UI.boot());
})();
