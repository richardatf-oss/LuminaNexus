// /scripts/chavruta.app.js
// Connects UI (chavruta-controls.js) -> Netlify function (/.netlify/functions/chavruta)
//
// Your function expects:
//   { input: string, options: {...}, history: [{role:"user"|"assistant", content:string}] }
// Returns:
//   { ok: true, content: string }

(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";

  let controller = null;

  // Local conversation history sent to the function (it will trim/normalize again)
  const history = [];

  // Keep last parsed sources for the UI "Sources" tab count
  let lastSources = [];

  const ui = () => window.__CHAVRUTA_UI || {
    setAnswer: (t) => console.log("[answer]", t),
    setSources: (s) => console.log("[sources]", s),
    setStatus: (t) => console.log("[status]", t),
  };

  function pushHistory(role, content) {
    if (!content || typeof content !== "string") return;
    history.push({ role, content: content.slice(0, 4000) });
    while (history.length > 16) history.shift();
  }

  function abort() {
    try {
      if (controller) controller.abort();
    } catch (_) {}
    controller = null;
  }

  // Best-effort parsing of "Sources:" section from the model text
  function extractSources(text) {
    if (!text || typeof text !== "string") return [];

    const lower = text.toLowerCase();
    const idx = lower.lastIndexOf("sources:");
    if (idx === -1) return [];

    const after = text.slice(idx + "sources:".length).trim();
    if (!after) return [];

    const lines = after
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 40);

    const out = [];
    const seen = new Set();

    for (const line of lines) {
      // Stop parsing if it looks like a new section begins
      if (/^(hebrew:|questions?:|classical note:|note:|peshat:)/i.test(line)) break;

      const cleaned = line.replace(/^(\d+[\).\]]\s+|[-•]\s+)/, "").trim();
      if (!cleaned) continue;

      const urlMatch = cleaned.match(/https?:\/\/\S+/);
      const url = urlMatch ? urlMatch[0] : null;
      const title = url ? cleaned.replace(url, "").trim() : cleaned;

      const key = `${title}::${url || ""}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({ title: title || "Source", url });
    }

    return out;
  }

  function buildInput({ reference, passage, question }) {
    // Your Netlify function accepts one "input" string.
    // The function itself wraps it with its own userPrompt, so keep this concise.
    const parts = [];

    if (passage && passage.trim()) {
      parts.push(passage.trim());
    }

    if (question && question.trim()) {
      parts.push(question.trim());
    }

    // If no passage pasted, include reference in the input as a hint.
    // (Function already receives ref in options, but redundancy is harmless.)
    if ((!passage || !passage.trim()) && reference && reference.trim()) {
      parts.unshift(`Reference: ${reference.trim()}`);
    }

    return parts.join("\n\n").trim();
  }

  async function askChavruta(detail) {
    // Stop any in-flight request
    abort();

    // Reset abort flag used by controls.js
    window.__CHAVRUTA_ABORT = false;

    const prefs = detail.prefs || {};
    const lockTextEl = document.querySelector("#lockText");
    const lockText = lockTextEl ? !!lockTextEl.checked : false;

    // Determine mode based on active tab class (controls.js toggles this)
    const activeTab = document.querySelector(".tab.is-active");
    const mode = (activeTab?.dataset?.tab || "peshat").toLowerCase();

    // If the user clicked Sources tab, show parsed sources without calling backend
    if (mode === "sources") {
      if (!lastSources.length) {
        ui().setAnswer("No sources yet. Ask a question first — sources will appear after an answer.");
        ui().setSources([]);
        return;
      }
      const formatted =
        "Sources:\n\n" +
        lastSources
          .map((s, i) => {
            const n = i + 1;
            return s.url ? `${n}. ${s.title}\n   ${s.url}` : `${n}. ${s.title}`;
          })
          .join("\n\n");

      ui().setAnswer(formatted);
      ui().setSources(lastSources);
      return;
    }

    const input = buildInput(detail);
    if (!input) {
      ui().setAnswer("Please paste a passage or ask a question.");
      ui().setSources([]);
      ui().setStatus("Ready");
      return;
    }

    const options = {
      mode, // "peshat" | "chavruta" (and "sources" handled locally)
      voice: (prefs.voice || "balanced").toLowerCase(),
      includeHebrew: !!prefs.includeHebrew,
      askForCitations: !!prefs.citations,
      ref: (detail.reference || "").trim(),
      lockText
    };

    const payload = { input, options, history: history.slice() };

    controller = new AbortController();
    ui().setStatus("Working…");

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}). ${t || "No details."}`);
      }

      const json = await res.json().catch(() => null);
      if (!json || json.ok !== true) {
        throw new Error(json?.error || "Server returned an invalid response.");
      }

      // If Stop was pressed while awaiting, do nothing
      if (window.__CHAVRUTA_ABORT) return;

      const content = (json.content || "").trim() || "No response generated.";

      // Update history
      pushHistory("user", input);
      pushHistory("assistant", content);

      // Parse sources from the response text (best-effort)
      lastSources = extractSources(content);
      ui().setSources(lastSources);

      ui().setAnswer(content); // controls.js will append and set Ready
    } catch (err) {
      if (err?.name === "AbortError") {
        ui().setStatus("Stopped");
        return;
      }
      if (window.__CHAVRUTA_ABORT) {
        ui().setStatus("Stopped");
        return;
      }

      console.error("[chavruta.app] error:", err);
      ui().setAnswer(`⚠️ ${err?.message || "Something went wrong."}`);
      ui().setSources([]);
      ui().setStatus("Ready");
    } finally {
      controller = null;
    }
  }

  // Listen for the UI event dispatched by chavruta-controls.js
  window.addEventListener("chavruta:ask", (e) => {
    askChavruta(e.detail);
  });

  // Optional: allow Stop button to abort immediately (controls.js sets the flag)
  // If you'd like, controls.js could also dispatch a "chavruta:stop" event later.
  const abortPoll = setInterval(() => {
    if (window.__CHAVRUTA_ABORT) abort();
  }, 200);

  // Debug hook
  window.__CHAVRUTA_APP = {
    ask: askChavruta,
    abort,
    history,
    get lastSources() { return lastSources; },
    stopAbortPoll() { clearInterval(abortPoll); }
  };
})();
