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
