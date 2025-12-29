(() => {
  const $ = (s) => document.querySelector(s);

  const ENDPOINT = "/.netlify/functions/chavruta";
  const LS_KEY = "LN_CHAVRUTA_THREAD_V2";
  const LS_PREFS = "LN_CHAVRUTA_PREFS_V2";
  const LS_GATE = "LN_GATE_SETTINGS_V2"; // optional, if your Gate saves settings

  const form = $("#chavForm");
  const input = $("#chavInput");
  const stream = $("#chavStream");
  const status = $("#chavStatus");
  const typing = $("#typing");

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

  let state = {
    mode: "peshat",
    includeHebrew: false,
    askCitations: true,
    context: null,
    messages: []
  };

  function setStatus(t) { if (status) status.textContent = t || ""; }
  function setTyping(on) { if (typing) typing.hidden = !on; }

  function add(role, text, meta = null) {
    const msg = { role, text: text ?? "", meta, ts: Date.now() };
    state.messages.push(msg);
    renderOne(msg);
    save();
  }

  function renderOne(msg) {
    const row = document.createElement("div");
    row.className = `msg ${msg.role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = msg.text || "";

    row.appendChild(bubble);

    if (msg.meta && (msg.meta.citations || msg.meta.labels)) {
      const metaDiv = document.createElement("div");
      metaDiv.className = "meta";
      const parts = [];
      if (msg.meta.labels?.length) parts.push(`Labels: ${msg.meta.labels.join(", ")}`);
      if (msg.meta.citations?.length) parts.push(`Citations requested: ${msg.meta.citations.join(", ")}`);
      metaDiv.textContent = parts.join(" · ");
      bubble.appendChild(metaDiv);
    }

    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function renderAll() {
    stream.innerHTML = "";
    state.messages.forEach(renderOne);
    stream.scrollTop = stream.scrollHeight;
  }

  function busy(on) {
    form.querySelector("button[type=submit]").disabled = !!on;
    setTyping(on);
    setStatus(on ? "Thinking…" : "Ready");
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        mode: state.mode,
        includeHebrew: state.includeHebrew,
        askCitations: state.askCitations,
        context: state.context,
        messages: state.messages.slice(-80) // keep it light
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

    // If you have Gate settings saved (optional)
    let gateSettings = null;
    try { gateSettings = JSON.parse(localStorage.getItem(LS_GATE) || "null"); } catch {}

    const parts = [];
    if (gate) parts.push(`Selected gate: ${gate}`);
    if (gateSettings?.boundary) parts.push(`Boundary: ${gateSettings.boundary}`);
    if (gateSettings?.pace) parts.push(`Pace: ${gateSettings.pace}`);
    if (gateSettings?.style) parts.push(`Style: ${gateSettings.style}`);
    if (gateSettings?.intention) parts.push(`Intention: ${gateSettings.intention}`);

    const ctxText = parts.join(" · ");

    if (ctxText) setContext({ gate: gate || (gateSettings?.gateIntent || ""), text: ctxText });

    // Prefill prompt if q passed
    if (q) input.value = q;
  }

  async function postJSON(payload) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { ok: false, error: raw }; }

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function buildPayload(userText) {
    return {
      prompt: userText,
      mode: state.mode,
      includeHebrew: state.includeHebrew,
      askCitations: state.askCitations,
      context: state.context,
      history: state.messages.slice(-18).map(m => ({ role: m.role, content: m.text }))
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;

    add("user", text);
    input.value = "";
    busy(true);

    try {
      const data = await postJSON(buildPayload(text));
      add("assistant", data.reply || "(No reply returned.)", data.meta || null);
    } catch (err) {
      add("error", `Chavruta error: ${err?.message || String(err)}`);
      console.error(err);
    } finally {
      busy(false);
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

  // Boot checks
  if (!form || !input || !stream || !status) {
    console.error("Chavruta boot failed: missing DOM elements.");
    return;
  }

  // Wire
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

  setStatus("Ready");
})();
