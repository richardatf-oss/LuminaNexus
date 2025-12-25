// /scripts/chavruta-ui.js
(() => {
  function findChavrutaSection() {
    // Find the area containing the "Talk to Chavruta" heading
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,div,p"));
    const hit = headings.find(el => (el.textContent || "").trim().toLowerCase() === "talk to chavruta");
    if (!hit) return document.body;

    // Walk up to a reasonable container (section/panel/card)
    return hit.closest("section, .panel, .card, .container, main, body") || document.body;
  }

  function pickInputAndButton(root) {
    // Prefer an input/textarea near a button that says "Send"
    const inputs = Array.from(root.querySelectorAll("input[type='text'], textarea"));
    const buttons = Array.from(root.querySelectorAll("button"));

    const sendBtn = buttons.find(b => /send/i.test((b.textContent || "").trim())) || null;

    // If a send button exists, choose the closest input to it
    if (sendBtn && inputs.length) {
      let best = inputs[0];
      let bestDist = Infinity;
      const br = sendBtn.getBoundingClientRect();
      for (const inp of inputs) {
        const ir = inp.getBoundingClientRect();
        const dist = Math.abs((ir.top + ir.height/2) - (br.top + br.height/2)) + Math.abs((ir.left + ir.width/2) - (br.left + br.width/2));
        if (dist < bestDist) { bestDist = dist; best = inp; }
      }
      return { input: best, button: sendBtn };
    }

    // Fallback: first input and first button
    return { input: inputs[0] || null, button: sendBtn || buttons[0] || null };
  }

  function ensureStream(root) {
    // If your page already has a big empty chat window, use it.
    // Heuristic: a large div with no children (or minimal)
    const divs = Array.from(root.querySelectorAll("div"));
    const bigEmpty = divs
      .filter(d => (d.children?.length || 0) === 0)
      .map(d => ({ d, r: d.getBoundingClientRect() }))
      .filter(x => x.r.width > 400 && x.r.height > 180)
      .sort((a,b) => (b.r.width*b.r.height) - (a.r.width*a.r.height))[0]?.d || null;

    // If it exists, we’ll use it as the message stream.
    // Otherwise we create our own stream container.
    const stream = bigEmpty || document.createElement("div");

    stream.id = "chatStream";
    stream.classList.add("chavruta-stream");
    stream.setAttribute("aria-live", "polite");

    if (!bigEmpty) {
      // Insert above the input row if possible
      const { input } = pickInputAndButton(root);
      if (input) {
        const parent = input.closest("form, div") || root;
        parent.parentNode.insertBefore(stream, parent);
      } else {
        root.appendChild(stream);
      }
    }

    return stream;
  }

  function ensureStatus(root) {
    let status = root.querySelector("#statusPill");
    if (status) return status;

    // Create a small status pill near the header if possible
    status = document.createElement("div");
    status.id = "statusPill";
    status.className = "chavruta-status";
    status.setAttribute("aria-live", "polite");
    status.textContent = "Ready";

    // Try to place it near the title
    const title = Array.from(root.querySelectorAll("*")).find(el => (el.textContent || "").trim().toLowerCase() === "talk to chavruta");
    if (title && title.parentNode) {
      title.parentNode.appendChild(status);
    } else {
      root.insertBefore(status, root.firstChild);
    }

    return status;
  }

  function softStyles() {
    // Minimal, modest styling (won’t fight your main.css)
    const css = `
      .chavruta-stream { padding: 12px 0; display: flex; flex-direction: column; gap: 10px; }
      .msg { display: grid; grid-template-columns: 84px 1fr; gap: 10px; align-items: start; }
      .who { font-size: 12px; opacity: .75; padding-top: 10px; }
      .bubble { border: 1px solid rgba(255,255,255,.06); background: rgba(0,0,0,.18); border-radius: 14px; padding: 12px 14px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
      .bubble.assistant { background: rgba(0,0,0,.24); }
      .bubble.user { background: rgba(0,0,0,.12); }
      .chavruta-status { font-size: 12px; opacity: .8; margin-left: 10px; display: inline-block; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.18); }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  const UI = {};

  UI.mount = () => {
    const root = findChavrutaSection();
    UI.root = root;

    softStyles();

    UI.statusEl = ensureStatus(root);
    UI.streamEl = ensureStream(root);

    // Ensure IDs on existing input/button so other code can rely on them
    const { input, button } = pickInputAndButton(root);
    if (input && !input.id) input.id = "chatInput";
    if (button && !button.id) button.id = "sendBtn";

    // If there is a form, give it an id; if not, we’ll handle click/enter directly
    const form = (input && input.closest("form")) ? input.closest("form") : null;
    if (form && !form.id) form.id = "chatForm";

    UI.inputEl = input || null;
    UI.buttonEl = button || null;
    UI.formEl = form || null;
  };

  UI.setStatus = (text) => {
    if (UI.statusEl) UI.statusEl.textContent = text;
  };

  UI.addMessage = (who, text, role) => {
    if (!UI.streamEl) return;

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
    UI.streamEl.appendChild(row);
    UI.streamEl.scrollTop = UI.streamEl.scrollHeight;
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
    UI.mount();
    UI.boot();
    console.log("[Chavruta] UI mounted");
  });
})();
