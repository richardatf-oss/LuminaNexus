/* /scripts/chavruta.app.js
   Client for /netlify/functions/chavruta.js (your exact API)

   Backend expects:
   {
     input: string,
     history: [{role:"user"|"assistant", content:string}],
     options: {
       mode, voice, includeHebrew, askForCitations, ref, lockText
     }
   }

   Backend returns:
   { ok: true, content: string }
*/

(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";

  let currentAbort = null;

  // Keep conversational history in the exact format your function accepts.
  // We store "user" and "assistant" turns only.
  const history = [];

  // Last results for Sources tab
  const state = {
    lastAnswer: "",
    lastSources: [],
    lastPayload: null
  };

  function ui() {
    return window.__CHAVRUTA_UI || {
      setAnswer: (t) => console.log("[Chavruta Answer]", t),
      setSources: (s) => console.log("[Chavruta Sources]", s),
      setStatus: (t) => console.log("[Chavruta Status]", t)
    };
  }

  function setStatus(text) {
    ui().setStatus(text);
  }

  function abortInFlight() {
    try {
      if (currentAbort) currentAbort.abort();
    } catch (_) {}
    currentAbort = null;
  }

  // Keep history small and safe (your function itself trims to last 16,
  // but we enforce a cap too to keep payload lean).
  function pushHistory(role, content) {
    if (!content || typeof content !== "string") return;
    history.push({ role, content: content.slice(0, 4000) });
    // keep last 16 messages
    while (history.length > 16) history.shift();
  }

  // The model prints sources as plain text. We try to parse a "Sources:" block.
  // Returns array of {title, url?, excerpt?} (best-effort).
  function extractSourcesFromContent(text) {
    if (!text || typeof text !== "string") return [];

    // Look for a Sources section near the end
    const idx = text.toLowerCase().lastIndexOf("sources:");
    if (idx === -1) return [];

    const after = text.slice(idx + "sources:".length).trim();
    if (!after) return [];

    // Take up to ~30 lines after Sources:
    const lines = after.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 30);

    // Parse numbered bullets or dash bullets
    const sources = [];
    for (const line of lines) {
      // Stop if we hit something that clearly ends the sources section
      if (/^(hebrew:|questions?:|notes?:|classical note:)/i.test(line)) break;

      // Remove leading bullets like "1." "-" "•"
      const cleaned = line.replace(/^(\d+[\).\]]\s+|[-•]\s+)/, "").trim();
      if (!cleaned) continue;

      // Extract URL if present
      const urlMatch = cleaned.match(/https?:\/\/\S+/);
      const url = urlMatch ? urlMatch[0] : null;

      const title = url ? cleaned.replace(url, "").trim().replace(/\s{2,}/g, " ") : cleaned;

      // Avoid duplicates
      const key = `${title}::${url || ""}`.toLowerCase();
      if (sources.some(s => `${s.title}::${s.url || ""}`.toLowerCase() === key)) continue;

      sources.push({ title: title || "Source", url });
    }

    return sources;
  }

  // If user clicks Sources tab, we can show the last sources immediately
  function showSourcesLocally() {
    if (!state.lastSources || state.lastSources.length === 0) {
      ui().setAnswer("No sources yet. Ask a question first — then Sources will populate when available.");
      ui().setSources([]);
      return;
    }

    const text =
      state.lastSources
        .map((s, i) => {
          const n = i + 1;
          const line1 = `${n}. ${s.title || "Source"}`;
          const line2 = s.url ? `   ${s.url}` : "";
          return [line1, line2].filter(Boolean).join("\n");
        })
        .join("\n\n");

    ui().setAnswer(`Sources:\n\n${text}`);
    ui().setSources(state.lastSources);
  }

  async function postJSON(url, body, signal) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      let details = "";
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          details = j.error || j.message || JSON.stringify(j);
        } else {
          details = await res.text();
        }
      } catch (_) {}

      throw new Error(`Request failed (${res.status}). ${details || "No additional details."}`);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();
    const t = await res.text();
    return { ok: true, content: t };
  }

  function inferModeFromUI() {
    const active = document.querySelector(".tab.is-active");
    const tab = active?.getAttribute("data-tab");
    if (tab === "peshat" || tab === "chavruta" || tab === "sources") return tab;
    return "chavruta";
  }

  function buildBackendPayload(detail) {
    const prefs = detail.prefs || {};
    const mode = inferModeFromUI();

    // Your backend wants a single `input` string.
    // We'll combine passage + question in a clean, explicit way.
    const passage = (detail.passage || "").trim();
    const question = (detail.question || "").trim();
    const reference = (detail.reference || "").trim();

    const inputParts = [];
    if (passage) inputParts.push(passage);
    if (question) inputParts.push(`Question: ${question}`);
    const input = inputParts.join("\n\n").trim();

    return {
      input,
      history: history.slice(), // already trimmed
      options: {
        mode, // "peshat" | "chavruta" | "sources"
        voice: (prefs.voice || "balanced").toLowerCase(),
        includeHebrew: !!prefs.includeHebrew,
        // backend expects askForCitations; UI stores prefs.citations
        askForCitations: !!prefs.citations,
        ref: reference,
        lockText: !!detail.lockText // optionally passed from UI; else false
      }
    };
  }

  // Watch the global abort flag set by chavruta-controls.js
  function installAbortWatcher() {
    let last = !!window.__CHAVRUTA_ABORT;
    setInterval(() => {
      const now = !!window.__CHAVRUTA_ABORT;
      if (now && !last) {
        abortInFlight();
        setStatus("Stopped");
      }
      last = now;
    }, 200);
  }

  async function handleAsk(detail) {
    // Stop previous request
    abortInFlight();

    // Reset abort flag
    window.__CHAVRUTA_ABORT = false;

    // If user explicitly switched to Sources tab, show locally
    const mode = inferModeFromUI();
    if (mode === "sources") {
      showSourcesLocally();
      return;
    }

    const payload = buildBackendPayload(detail);
    state.lastPayload = payload;

    // Validate
    if (!payload.input || !payload.input.trim()) {
      ui().setAnswer("Please paste a passage or type a question.");
      ui().setSources([]);
      return;
    }

    currentAbort = new AbortController();
    setStatus("Working…");

    try {
      const json = await postJSON(ENDPOINT, payload, currentAbort.signal);

      if (window.__CHAVRUTA_ABORT) return;

      if (!json || json.ok !== true) {
        const err = json?.error || "Unknown error";
        throw new Error(err);
      }

      const content = (json.content || "").trim() || "No response generated.";

      // Save to history in the exact roles your backend expects
      // Note: The backend also adds system/user prompt wrappers, but history should be plain.
      pushHistory("user", payload.input);
      pushHistory("assistant", content);

      // Extract sources (best-effort) from content
      const sources = extractSourcesFromContent(content);

      state.lastAnswer = content;
      state.lastSources = sources;

      ui().setAnswer(content);
      ui().setSources(sources);

      setStatus("Ready");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("Stopped");
        return;
      }

      console.error("[Chavruta] error:", err);
      ui().setAnswer(`⚠️ ${err?.message || "Something went wrong. Please try again."}`);
      ui().setSources([]);
      setStatus("Ready");
    } finally {
      currentAbort = null;
    }
  }

  // Listen for UI "ask" events (emitted by chavruta-controls.js)
  window.addEventListener("chavruta:ask", (e) => {
    // Pull lockText from DOM if present (matches your backend option)
    const lock = document.querySelector("#lockText");
    const detail = {
      ...e.detail,
      lockText: lock ? !!lock.checked : false
    };

    handleAsk(detail);
  });

  // Expose for debugging
  window.__CHAVRUTA_APP = {
    abort: abortInFlight,
    history,
    state,
    showSourcesLocally
  };

  installAbortWatcher();
})();
