(() => {
  const $ = (s) => document.querySelector(s);

  const ENDPOINT = "/.netlify/functions/chavruta";
  const LS_KEY = "LN_CHAVRUTA_THREAD_V3";
  const LS_PREFS = "LN_CHAVRUTA_PREFS_V3";
  const LS_GATE = "LN_GATE_SETTINGS_V2";

  const form = $("#chavForm");
  const input = $("#chavInput");
  const stream = $("#chavStream");
  const status = $("#chavStatus");
  const typing = $("#typing");
  const sendBtn = $("#chavSend");

  const btnNew = $("#btnNew");
  const btnClear = $("#btnClear");
  const btnExport = $("#btnExport");

  const chkHebrew = $("#chkHebrew");
  const chkCitations = $("#chkCitations");

  const contextBar = $("#contextBar");
  const ctxGate = $("#ctxGate");
  const ctxText = $("#ctxText");
  const ctxDismiss = $("#ctxDismiss");

  const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));

  // If key DOM nodes are missing, fail loudly (prevents weird half-state)
  if (!form || !input || !stream || !status || !typing || !sendBtn) {
    console.error("Chavruta boot failed: missing DOM elements.");
    return;
  }

  let inFlight = false;

  let state = {
    mode: "peshat",
    includeHebrew: false,
    askCitations: true,
    context: null,
    messages: []
  };

  function setStatus(t) { status.textContent = t || ""; }
  function setTyping(on) { typing.hidden = !on; }
  function setBusy(on) {
    inFlight = !!on;
    sendBtn.disabled = !!on;
    setTyping(!!on);
    setStatus(on ? "Thinking…" : "Ready");
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        mode: state.mode,
        includeHebrew: state.includeHebrew,
        askCitations: state.askCitations,
        context: state.context,
        messages: state.messages.slice(-80)
      }));
      localStorage.setItem(LS_PREFS, JSON.stringify({
        mode: state.mode,
        includeHebrew: state.includeHebrew,
        askCitations: state.askCitations
      }));
    } catch {}
  }

  function load() {
    try {
      const prefs = JSON.parse(localStorage.getItem(LS_PREFS) || "null");
      if (prefs) {
        state.mode = prefs.mode || state.mode;
        state.includeHebrew = !!prefs.includeHebrew;
        state.askCitations = prefs.askCitations !== false;
      }
    } catch {}

    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
      if (saved?.messages?.length) {
        state.mode = saved.mode || state.mode;
        state.includeHebrew = !!saved.includeHebrew;
        state.askCitations = saved.askCitations !== false;
        state.context = saved.context || null;
        state.messages = saved.messages;
      }
    } catch {}
  }

  function renderAll() {
    stream.innerHTML = "";
    state.messages.forEach(renderOne);
    stream.scrollTop = stream.scrollHeight;
  }

  function renderOne(msg) {
    const row = document.createElement("div");
    row.className = `msg ${msg.role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.text || "";

    if (msg.meta?.labels?.length || msg.meta?.notes?.length) {
      const meta = document.createElement("div");
      meta.className = "meta";
      const parts = [];
      if (msg.meta.labels?.length) parts.push(`Labels: ${msg.meta.labels.join(", ")}`);
      if (msg.meta.notes?.length) parts.push(msg.meta.notes.join(" · "));
      meta.textContent = parts.join(" · ");
      bubble.appendChild(meta);
    }

    row.appendChild(bubble);
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function add(role, text, meta = null) {
    const msg = { role, text: text ?? "", meta, ts: Date.now() };
    state.messages.push(msg);
    renderOne(msg);
    save();
  }

  function setMode(mode) {
    state.mode = mode;
    modeButtons.forEach(b => b.classList.toggle("is-on", b.dataset.mode === mode));
    save();
  }

  function setContext(obj) {
    state.context = obj;
    if (!obj) {
      contextBar.hidden = true;
      save();
      return;
    }
    ctxGate.textContent = obj.gate ? `Gate: ${obj.gate}` : "Context";
    ctxText.textContent = obj.text || "";
    contextBar.hidden = false;
    save();
  }

  function harvestContext() {
    const params = new URLSearchParams(location.search);
    const gate = (params.get("gate") || "").trim();
    const q = (params.get("q") || "").trim();

    let gateSettings = null;
    try { gateSettings = JSON.parse(localStorage.getItem(LS_GATE) || "null"); } catch {}

    const parts = [];
    if (gate) parts.push(`Selected gate: ${gate}`);
    if (gateSettings?.boundary) parts.push(`Boundary: ${gateSettings.boundary}`);
    if (gateSettings?.pace) parts.push(`Pace: ${gateSettings.pace}`);
    if (gateSettings?.style) parts.push(`Style: ${gateSettings.style}`);
    if (gateSettings?.intention) parts.push(`Intention: ${gateSettings.intention}`);

    if (parts.length) setContext({ gate: gate || (gateSettings?.gateIntent || ""), text: parts.join(" · ") });

    if (q) input.value = q;
  }

  async function postJSON(payload, { timeoutMs = 25000 } = {}) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ac.signal
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { ok: false, error: raw }; }

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      return data;
    } finally {
      clearTimeout(t);
    }
  }

  function buildPayload(userText) {
    return {
      prompt: userText,
      mode: state.mode,
      includeHebrew: state.includeHebrew,
      askCitations: state.askCitations,
      context: state.context,
      history: state.messages.slice(-18).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text
      }))
    };
  }

  async function onSubmit(e) {
    e.preventDefault();

    // Prevent double-firing / multi-submit loops
    if (inFlight) return;

    const text = (input.value || "").trim();
    if (!text) return;

    add("user", text);
    input.value = "";
    setBusy(true);

    try {
      const data = await postJSON(buildPayload(text), { timeoutMs: 25000 });
      add("assistant", data.reply || "(No reply returned.)", data.meta || null);
    } catch (err) {
      const msg =
        err?.name === "AbortError"
          ? "Request timed out. Try again (or shorten the passage)."
          : (err?.message || String(err));
      add("error", `Chavruta error: ${msg}`);
      console.error(err);
    } finally {
      // ALWAYS drop out of thinking state
      setBusy(false);
      input.focus();
    }
  }

  function clearThread() {
    state.messages = [];
    renderAll();
    save();
  }

  function newThread() {
    clearThread();
    setContext(null);
    add("assistant", "Ready. Paste the passage first, then ask one focused question.");
  }

  function exportThread() {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(),
      mode: state.mode,
      includeHebrew: state.includeHebrew,
      askCitations: state.askCitations,
      context: state.context,
      messages: state.messages
    }, null, 2)], { type: "application/json" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chavruta-thread-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Wire UI
  form.addEventListener("submit", onSubmit);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  modeButtons.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

  chkHebrew.addEventListener("change", () => { state.includeHebrew = chkHebrew.checked; save(); });
  chkCitations.addEventListener("change", () => { state.askCitations = chkCitations.checked; save(); });

  btnClear.addEventListener("click", clearThread);
  btnNew.addEventListener("click", newThread);
  btnExport.addEventListener("click", exportThread);

  ctxDismiss.addEventListener("click", () => setContext(null));

  // Init
  load();
  setMode(state.mode);
  chkHebrew.checked = state.includeHebrew;
  chkCitations.checked = state.askCitations;

  harvestContext();

  if (state.messages.length) renderAll();
  else add("assistant", "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.");

  setBusy(false);
})();
