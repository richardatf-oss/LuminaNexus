// /scripts/chavruta-ui.js
// Purpose:
// 1) Provide a safe UI layer (setStatus, addMessage, boot) for chavruta-chat.js
// 2) Handle Library -> Chavruta handoff via query params: ?q=...&autosend=1
//
// SECURITY:
// - No innerHTML from assistant/user text. We render via textContent only.
// - Any formatting is done by constructing DOM elements, not injecting HTML.

(function () {
  const $ = (s) => document.querySelector(s);

  // ---------- Query helpers ----------
  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function removeParams(...names) {
    const url = new URL(window.location.href);
    names.forEach((n) => url.searchParams.delete(n));
    const qs = url.searchParams.toString();
    window.history.replaceState({}, document.title, url.pathname + (qs ? `?${qs}` : ""));
  }

  function focusInputEnd(inputEl) {
    if (!inputEl) return;
    inputEl.focus({ preventScroll: false });
    const v = inputEl.value || "";
    try {
      inputEl.setSelectionRange(v.length, v.length);
    } catch (_) {
      // some mobile browsers can throw; ignore
    }
  }

  function safeSubmitForm(formEl) {
    if (!formEl) return;
    const ev = new Event("submit", { bubbles: true, cancelable: true });
    formEl.dispatchEvent(ev);
  }

  // ---------- Text parsing (safe) ----------
  // We accept assistant output in a few patterns:
  // - "Text:" then content
  // - "Questions for study:" then bullets/numbered lines
  // - "Speculation:" then content
  // - optional "HEBREW:" section at end
  function splitHebrew(raw) {
    const text = String(raw || "");
    const m = text.match(/(^|\n)HEBREW:\s*([\s\S]*)$/i);
    if (!m) return { body: text.trim(), hebrew: "" };
    const hebrew = (m[2] || "").trim();
    const body = text.slice(0, m.index).trim();
    return { body, hebrew };
  }

  function normalizeNewlines(s) {
    return String(s || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function parseSections(rawBody) {
    const body = normalizeNewlines(rawBody).trim();
    if (!body) return [{ kind: "plain", title: "", content: "" }];

    // Basic heading detection by lines beginning with:
    // Text:
    // Questions for study:
    // Speculation:
    const lines = body.split("\n");
    const sections = [];
    let current = { kind: "plain", title: "", lines: [] };

    function pushCurrent() {
      if (current && (current.lines.length || current.title)) {
        sections.push({
          kind: current.kind,
          title: current.title,
          content: current.lines.join("\n").trim(),
        });
      }
    }

    function start(kind, title) {
      pushCurrent();
      current = { kind, title, lines: [] };
    }

    for (const line of lines) {
      const t = line.trim();

      if (/^text\s*:/i.test(t)) {
        start("text", "Text");
        const rest = line.replace(/^text\s*:/i, "").trim();
        if (rest) current.lines.push(rest);
        continue;
      }

      if (/^questions?\s+for\s+study\s*:/i.test(t) || /^study\s+questions\s*:/i.test(t)) {
        start("questions", "Questions for study");
        const rest = line.replace(/^((questions?\s+for\s+study)|(study\s+questions))\s*:/i, "").trim();
        if (rest) current.lines.push(rest);
        continue;
      }

      if (/^speculation\s*:/i.test(t)) {
        start("speculation", "Speculation (clearly labeled)");
        const rest = line.replace(/^speculation\s*:/i, "").trim();
        if (rest) current.lines.push(rest);
        continue;
      }

      // Default: collect
      current.lines.push(line);
    }

    pushCurrent();
    return sections.length ? sections : [{ kind: "plain", title: "", content: body }];
  }

  function extractQuestions(sectionContent) {
    const text = normalizeNewlines(sectionContent).trim();
    if (!text) return [];

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const items = [];

    for (const l of lines) {
      // Accept:
      // - bullets: "- foo", "• foo"
      // - numbered: "1. foo", "1) foo"
      const bullet = l.match(/^[-•]\s+(.*)$/);
      if (bullet) { items.push(bullet[1].trim()); continue; }

      const num = l.match(/^\d+\s*[\.\)]\s+(.*)$/);
      if (num) { items.push(num[1].trim()); continue; }

      // Otherwise treat as a continuation line; append to last item if present
      if (items.length) items[items.length - 1] += " " + l;
      else items.push(l);
    }

    // keep it sane
    return items.slice(0, 12);
  }

  // ---------- DOM builders ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function renderAssistantBubble(bubble, rawText) {
    const { body, hebrew } = splitHebrew(rawText);
    const sections = parseSections(body);

    // Render sections
    for (const sec of sections) {
      const title = (sec.title || "").trim();
      const content = (sec.content || "").trim();

      if (title) bubble.appendChild(el("div", "section-title", title));

      if (sec.kind === "questions") {
        const qs = extractQuestions(content);
        if (qs.length) {
          const ol = el("ol", "questions");
          for (const q of qs) {
            const li = el("li", "", q);
            ol.appendChild(li);
          }
          bubble.appendChild(ol);
        } else {
          // fallback plain
          const pre = el("div", "text-block pre", content);
          bubble.appendChild(pre);
        }
      } else {
        const blockClass =
          sec.kind === "text" ? "text-block pre" :
          sec.kind === "speculation" ? "spec-block pre" :
          "text-block pre";

        bubble.appendChild(el("div", blockClass, content));
      }
    }

    // Hebrew toggle (safe textContent)
    if (hebrew) {
      const toggle = el("button", "hebrew-toggle", "Show Hebrew");
      toggle.type = "button";

      const heb = el("div", "hebrew-block pre", hebrew);
      heb.style.display = "none";

      toggle.addEventListener("click", () => {
        const open = heb.style.display === "block";
        heb.style.display = open ? "none" : "block";
        toggle.textContent = open ? "Show Hebrew" : "Hide Hebrew";
      });

      bubble.appendChild(toggle);
      bubble.appendChild(heb);
    }
  }

  // ---------- UI object ----------
  const UI = {};

  UI.streamEl = () => document.getElementById("chatStream");
  UI.statusEl = () => document.getElementById("statusPill");

  UI.setStatus = (text) => {
    const status = UI.statusEl();
    if (status) status.textContent = String(text || "");
  };

  UI.addMessage = (who, text, role) => {
    const stream = UI.streamEl();
    if (!stream) return;

    const row = el("div", "msg");
    const left = el("div", "who", who || "");
    const bubble = el("div", "bubble " + (role === "user" ? "user" : "assistant"));

    if (role === "assistant") {
      renderAssistantBubble(bubble, String(text || ""));
    } else {
      // user: plain safe text
      bubble.appendChild(el("div", "text-block pre", String(text || "").trim()));
    }

    row.appendChild(left);
    row.appendChild(bubble);
    stream.appendChild(row);

    // scroll to bottom
    try { stream.scrollTop = stream.scrollHeight; } catch (_) {}
  };

  UI.boot = () => {
    UI.setStatus("Ready");
    UI.addMessage(
      "Chavruta",
      "Shalom. Bring one passage or one question. We will go slowly, Torah-first.\n\nText first. Then questions. Speculation clearly labeled.",
      "assistant"
    );
  };

  // Make it available for chavruta-chat.js
  window.ChavrutaUI = UI;

  // ---------- Library -> Chavruta handoff ----------
  window.addEventListener("DOMContentLoaded", () => {
    UI.boot();

    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");

    if (!input) return;

    // Library sends: /chavruta.html?q=Genesis%201:1
    const q = getParam("q");
    const autosend = getParam("autosend"); // "1" to send immediately

    if (q && q.trim()) {
      input.value = q.trim();
      UI.setStatus("Loaded from Library");
      focusInputEnd(input);

      // Optional autosend=1
      if (autosend === "1") {
        UI.setStatus("Sending…");
        setTimeout(() => {
          safeSubmitForm(form);
          removeParams("autosend");
        }, 150);
      }

      // Clean URL so refresh doesn't re-inject
      removeParams("q");
    }
  });
})();
