/* /scripts/chavruta.app.js
   Chavruta client app:
   - Receives UI events from chavruta-controls.js
   - Calls Netlify function /.netlify/functions/chavruta
   - Streams final result into window.__CHAVRUTA_UI
*/

(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";

  // Current in-flight request controller
  let currentAbort = null;

  // Keep last answer/sources around for "Sources" tab or export add-ons
  const state = {
    lastPayload: null,
    lastAnswer: "",
    lastSources: [],
    lastMeta: {}
  };

  // --- Helpers -------------------------------------------------------------

  function safeUI() {
    return window.__CHAVRUTA_UI || {
      setAnswer: (t) => console.log("[Chavruta Answer]", t),
      setSources: (s) => console.log("[Chavruta Sources]", s),
      setStatus: (t) => console.log("[Chavruta Status]", t)
    };
  }

  function setStatus(text) {
    safeUI().setStatus(text);
  }

  function abortInFlight() {
    try {
      if (currentAbort) currentAbort.abort();
    } catch (_) {}
    currentAbort = null;
  }

  function asText(x) {
    if (x == null) return "";
    if (typeof x === "string") return x;
    if (typeof x === "number" || typeof x === "boolean") return String(x);
    try {
      return JSON.stringify(x, null, 2);
    } catch {
      return String(x);
    }
  }

  // Normalize sources into a consistent shape your UI can handle later.
  // Supports: strings, {title,url}, Sefaria-like refs, etc.
  function normalizeSources(input) {
    const out = [];
    const add = (s) => {
      if (!s) return;
      if (typeof s === "string") {
        out.push({ title: s });
        return;
      }
      if (typeof s === "object") {
        const title =
          s.title ||
          s.ref ||
          s.source ||
          s.citation ||
          s.name ||
          s.label ||
          "Source";
        const url = s.url || s.link || s.href || null;
        const excerpt = s.excerpt || s.snippet || s.quote || null;
        out.push({ title, url, excerpt });
      }
    };

    if (Array.isArray(input)) input.forEach(add);
    else add(input);

    // De-dupe by title+url
    const seen = new Set();
    return out.filter((s) => {
      const key = `${s.title}::${s.url || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Many Netlify functions return different keys. We accept several.
  function normalizeResponse(json) {
    // Likely keys:
    // - answer / text / output / response
    // - sources / citations / refs
    // - meta / usage / model
    const answer =
      json.answer ??
      json.text ??
      json.output ??
      json.response ??
      json.message ??
      "";

    const sourcesRaw =
      json.sources ??
      json.citations ??
      json.refs ??
      json.references ??
      json.source_list ??
      [];

    const meta = json.meta ?? json.usage ?? { model: json.model };

    return {
      answer: asText(answer).trim(),
      sources: normalizeSources(sourcesRaw),
      meta
    };
  }

  // Turn sources into a readable block (until you build a dedicated Sources renderer)
  function sourcesToText(sources) {
    if (!sources || sources.length === 0) return "No sources available for this answer.";
    return sources
      .map((s, i) => {
        const n = i + 1;
        const line1 = `${n}. ${s.title || "Source"}`;
        const line2 = s.url ? `   ${s.url}` : "";
        const line3 = s.excerpt ? `   “${s.excerpt}”` : "";
        return [line1, line2, line3].filter(Boolean).join("\n");
      })
      .join("\n\n");
  }

  async function postJSON(url, body, signal) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });

    // Handle non-2xx with best-effort error message
    if (!res.ok) {
      let errText = "";
      try {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const j = await res.json();
          errText = j.error || j.message || JSON.stringify(j);
        } else {
          errText = await res.text();
        }
      } catch (_) {}
      const msg = `Request failed (${res.status}). ${errText || "No additional error details."}`;
      const e = new Error(msg);
      e.status = res.status;
      throw e;
    }

    // Parse JSON response
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await res.json();

    // If server returns text (rare), accept it
    const t = await res.text();
    return { answer: t };
  }

  function buildRequestPayload(detail) {
    // detail from chavruta-controls.js:
    // { reference, passage, question, prefs }
    const prefs = detail.prefs || {};

    // We send a generous payload; your function can ignore unknown keys.
    return {
      mode: inferModeFromUI(), // "peshat" | "chavruta" | "sources"
      reference: (detail.reference || "").trim(),
      passage: (detail.passage || "").trim(),
      question: (detail.question || "").trim(),
      voice: prefs.voice || "balanced",
      includeHebrew: !!prefs.includeHebrew,
      citations: !!prefs.citations,
      // handy context for your backend logs
      client: {
        app: "LuminaNexus-Chavruta",
        version: "1.0.0"
      }
    };
  }

  function inferModeFromUI() {
    // read active tab if present
    const active = document.querySelector(".tab.is-active");
    const tab = active?.getAttribute("data-tab");
    if (tab === "peshat" || tab === "chavruta" || tab === "sources") return tab;
    return "chavruta";
  }

  // --- Wire Stop button (true abort) --------------------------------------

  // chavruta-controls sets window.__CHAVRUTA_ABORT = true on stop.
  // We'll also listen for a custom event if you ever add it later.
  function installAbortWatcher() {
    // Poll is ugly; event-based is better. We'll do both lightly.
    let lastAbort = !!window.__CHAVRUTA_ABORT;

    setInterval(() => {
      const nowAbort = !!window.__CHAVRUTA_ABORT;
      if (nowAbort && !lastAbort) {
        abortInFlight();
        setStatus("Stopped");
      }
      lastAbort = nowAbort;
    }, 200);
  }

  // --- Main ask handler ----------------------------------------------------

  async function handleAsk(detail) {
    const ui = safeUI();

    // Stop any prior request
    abortInFlight();

    // Reset abort flag
    window.__CHAVRUTA_ABORT = false;

    const payload = buildRequestPayload(detail);
    state.lastPayload = payload;

    // If user clicked Sources tab without sources, we can respond locally
    if (payload.mode === "sources") {
      ui.setAnswer(sourcesToText(state.lastSources));
      ui.setSources(state.lastSources);
      return;
    }

    // Basic validation
    if (!payload.question) {
      ui.setAnswer("Please ask one clear question.");
      ui.setSources([]);
      return;
    }

    // Start request
    currentAbort = new AbortController();
    setStatus("Working…");

    try {
      const json = await postJSON(ENDPOINT, payload, currentAbort.signal);

      // If aborted mid-flight, do nothing
      if (window.__CHAVRUTA_ABORT) return;

      const normalized = normalizeResponse(json);

      // Save state
      state.lastAnswer = normalized.answer || "";
      state.lastSources = normalized.sources || [];
      state.lastMeta = normalized.meta || {};

      // Render
      ui.setAnswer(state.lastAnswer || "(No answer returned.)");
      ui.setSources(state.lastSources);

      setStatus("Ready");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("Stopped");
        return;
      }

      console.error("[Chavruta] error:", err);
      const msg =
        err?.message ||
        "Something went wrong while asking Chavruta. Please try again.";

      ui.setAnswer(`⚠️ ${msg}`);
      ui.setSources([]);
      setStatus("Ready");
    } finally {
      currentAbort = null;
    }
  }

  // --- Boot ---------------------------------------------------------------

  window.addEventListener("chavruta:ask", (e) => {
    handleAsk(e.detail);
  });

  // Optional: expose state for debugging
  window.__CHAVRUTA_APP = {
    abort: abortInFlight,
    state
  };

  installAbortWatcher();
})();
