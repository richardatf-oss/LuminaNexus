// /scripts/chavruta.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";

  const jsWarning = document.getElementById("jsWarning");
  if (jsWarning) jsWarning.style.display = "none";

  const $ = (id) => document.getElementById(id);

  const els = {
    // core
    stream: $("stream"),
    form: $("form"),
    input: $("input"),
    send: $("send"),
    statusPill: $("statusPill"),
    statusHint: $("statusHint"),

    // options
    optHebrew: $("optHebrew"),
    optCitations: $("optCitations"),

    // text + lock + sources UI
    textPreset: $("textPreset"),
    refInput: $("refInput"),
    optLockText: $("optLockText"),
    btnOpenSefaria: $("btnOpenSefaria"),
    btnSources: $("btnSources"),

    // drawer
    sourcesDrawer: $("sourcesDrawer"),
    sourcesList: $("sourcesList"),
    btnSourcesClose: $("btnSourcesClose"),

    // quick actions
    stop: $("btnStop"),
    gen11: $("btnGen11"),
    btnNew: $("btnNew"),
    btnClear: $("btnClear"),
    btnExport: $("btnExport"),

    // chips
    modeButtons: Array.from(document.querySelectorAll(".chip[data-mode]")),
    voiceButtons: Array.from(document.querySelectorAll(".chip[data-voice]")),
  };

  const required = [
    "stream","form","input","send","statusPill","statusHint",
    "optHebrew","optCitations",
    "textPreset","refInput","optLockText","btnOpenSefaria","btnSources",
    "sourcesDrawer","sourcesList","btnSourcesClose",
    "btnStop","btnGen11","btnNew","btnClear","btnExport"
  ];

  for (const key of required) {
    if (!els[key]) {
      console.error("[chavruta] missing element:", key);
      alert(`Chavruta wiring error: missing #${key}. Check chavruta.html IDs.`);
      return;
    }
  }

  const state = {
    mode: "peshat",
    voice: "balanced",
    includeHebrew: false,
    askForCitations: true,

    textPreset: "",
    ref: "",
    lockText: false,

    sources: [], // [{ text, kind }]
    history: [], // [{ role, content }]
    inFlight: null, // { controller }
  };

  // ---------- helpers ----------
  function nowTs() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function setStatus(text, thinking = false) {
    els.statusPill.textContent = text;
    els.statusPill.classList.toggle("is-thinking", !!thinking);
  }

  function setDisabled(disabled) {
    els.send.disabled = disabled;
    els.stop.disabled = !disabled;
    els.input.disabled = disabled;
    els.form.classList.toggle("ch-disabled", disabled);
  }

  function scrollToBottom() {
    els.stream.scrollTop = els.stream.scrollHeight;
  }

  function addMessage(who, body, kind = "assistant") {
    const wrap = document.createElement("div");
    wrap.className = `msg ${kind === "user" ? "user" : ""} ${kind === "error" ? "error" : ""}`;

    const meta = document.createElement("div");
    meta.className = "meta";

    const whoEl = document.createElement("div");
    whoEl.className = "who";
    whoEl.textContent = who;

    const timeEl = document.createElement("div");
    timeEl.textContent = nowTs();

    meta.appendChild(whoEl);
    meta.appendChild(timeEl);

    const b = document.createElement("div");
    b.className = "body";
    b.textContent = body;

    wrap.appendChild(meta);
    wrap.appendChild(b);

    els.stream.appendChild(wrap);
    scrollToBottom();
  }

  function pushHistory(role, content) {
    state.history.push({ role, content });
    if (state.history.length > 24) state.history.splice(0, state.history.length - 24);
  }

  function prettyVoice(v) {
    if (v === "ibn_ezra") return "Ibn Ezra";
    return String(v || "balanced")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function modePromptHint(mode) {
    if (mode === "sources") return "Sources-first. Minimal commentary. References required when possible.";
    if (mode === "chavruta") return "Peshat → one classical note → 2–4 questions back.";
    return "Peshat: plain meaning first, minimal speculation.";
  }

  function refreshHint() {
    const base = modePromptHint(state.mode);
    const voice = `Voice: ${prettyVoice(state.voice)}.`;
    const lock = state.lockText && state.ref ? `Locked: ${state.ref}.` : "";
    els.statusHint.textContent = [base, voice, lock].filter(Boolean).join(" ");
  }

  function setMode(mode) {
    state.mode = mode;
    els.modeButtons.forEach((btn) => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    refreshHint();
  }

  function setVoice(voice) {
    state.voice = voice;
    els.voiceButtons.forEach((btn) => {
      const on = btn.dataset.voice === voice;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    refreshHint();
  }

  function stopInFlight() {
    if (state.inFlight?.controller) state.inFlight.controller.abort();
    state.inFlight = null;
    setDisabled(false);
    setStatus("Ready", false);
  }

  function openDrawer(open) {
    els.sourcesDrawer.classList.toggle("is-open", !!open);
    els.sourcesDrawer.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function openOnSefaria(ref) {
    const q = encodeURIComponent(String(ref || "").trim());
    if (!q) return;
    window.open(
      `https://www.sefaria.org/search?q=${q}&tab=text&tvar=1&tsort=relevance`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function computeActiveRef() {
    const typed = String(els.refInput.value || "").trim();
    const preset = String(els.textPreset.value || "").trim();
    return typed || preset || "";
  }

  function syncRefState() {
    state.textPreset = String(els.textPreset.value || "").trim();
    state.ref = computeActiveRef();
    state.lockText = !!els.optLockText.checked;
    refreshHint();
  }

  // ---------- Sources drawer ----------
  function dedupeSources(list) {
    const seen = new Set();
    const out = [];
    for (const s of list) {
      const t = String(s?.text || "").trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: t, kind: s.kind || "source" });
    }
    return out.slice(0, 60);
  }

  function setSources(list) {
    state.sources = dedupeSources(list || []);
    els.btnSources.textContent = `Sources (${state.sources.length})`;
    renderSourcesDrawer();
  }

  function renderSourcesDrawer() {
    els.sourcesList.innerHTML = "";

    if (!state.sources.length) {
      const empty = document.createElement("div");
      empty.style.opacity = "0.85";
      empty.style.fontSize = "13px";
      empty.textContent = "No sources captured yet. Ask a question with citations enabled.";
      els.sourcesList.appendChild(empty);
      return;
    }

    for (const s of state.sources) {
      const row = document.createElement("div");
      row.className = "ln-src";

      const left = document.createElement("div");

      const t = document.createElement("div");
      t.className = "t";
      t.textContent = s.text;

      const a = document.createElement("div");
      a.className = "a";
      a.textContent = s.kind;

      left.appendChild(t);
      left.appendChild(a);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = "Open";
      btn.addEventListener("click", () => openOnSefaria(s.text));

      row.appendChild(left);
      row.appendChild(btn);
      els.sourcesList.appendChild(row);
    }
  }

  function extractSourcesFromText(reply) {
    const txt = String(reply || "");
    const lines = txt.split(/\r?\n/).map((l) => l.trim());
    const found = [];

    // Prefer an explicit "Sources:" section
    const idx = lines.findIndex((l) => /^sources\s*:/i.test(l));
    if (idx !== -1) {
      for (let i = idx; i < Math.min(lines.length, idx + 14); i++) {
        const l = lines[i].replace(/^sources\s*:\s*/i, "").trim();
        if (!l) continue;
        l.split(/;|•|\u2022|,\s(?=[A-Zא-ת])/).forEach((part) => {
          const p = part.trim();
          if (p) found.push({ text: p, kind: "source" });
        });
      }
    }

    // Light heuristic for Tanakh style refs
    const refMatches =
      txt.match(/\b(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Psalms|Proverbs)\s+\d+:\d+\b/g) || [];
    for (const m of refMatches) found.push({ text: m, kind: "Tanakh" });

    return found;
  }

  // ---------- network ----------
  async function postJSON(payload, { timeoutMs = 45000 } = {}) {
    if (state.inFlight?.controller) state.inFlight.controller.abort();

    const controller = new AbortController();
    state.inFlight = { controller };

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
      if (state.inFlight?.controller === controller) state.inFlight = null;
    }
  }

  async function sendText(text) {
    const t = String(text || "").trim();
    if (!t) return;

    syncRefState();

    addMessage("You", t, "user");
    pushHistory("user", t);

    setDisabled(true);
    setStatus("Thinking…", true);

    try {
      const payload = {
        input: t,
        history: state.history,
        options: {
          mode: state.mode,
          voice: state.voice,
          includeHebrew: state.includeHebrew,
          askForCitations: state.askForCitations,
          ref: state.ref,
          lockText: state.lockText,
        },
      };

      const r = await postJSON(payload);

      if (!r.ok || !r.data?.ok) {
        const msg = r.data?.error || r.data?.raw || (r.status ? `HTTP ${r.status}` : "Request failed");
        addMessage("Chavruta", `Chavruta error: ${msg}`, "error");
        return;
      }

      const reply = String(r.data.content || r.data.reply || "").trim() || "(No response text returned.)";
      addMessage("Chavruta", reply, "assistant");
      pushHistory("assistant", reply);

      // update sources
      const newly = extractSourcesFromText(reply);
      if (newly.length) setSources([...state.sources, ...newly]);
      else els.btnSources.textContent = `Sources (${state.sources.length})`;
    } catch (err) {
      const isAbort = err?.name === "AbortError";
      addMessage(
        "Chavruta",
        isAbort ? "Chavruta error: Request aborted / timed out." : `Chavruta error: ${err?.message || err}`,
        "error"
      );
    } finally {
      setDisabled(false);
      setStatus("Ready", false);
      els.input.focus();
    }
  }

  // ---------- export / clear ----------
  function exportThread() {
    const lines = [];
    lines.push(`# Chavruta Export`);
    lines.push(`- Mode: ${state.mode}`);
    lines.push(`- Voice: ${prettyVoice(state.voice)}`);
    lines.push(`- Include Hebrew: ${state.includeHebrew ? "yes" : "no"}`);
    lines.push(`- Ask for citations: ${state.askForCitations ? "yes" : "no"}`);
    lines.push(`- Reference: ${state.ref || "(none)"}`);
    lines.push(`- Lock text: ${state.lockText ? "yes" : "no"}`);
    lines.push("");

    if (state.sources.length) {
      lines.push(`## SOURCES`);
      for (const s of state.sources) lines.push(`- ${s.text}`);
      lines.push("");
    }

    for (const m of state.history) {
      lines.push(`## ${m.role.toUpperCase()}`);
      lines.push(m.content);
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `chavruta-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function clearUI() {
    els.stream.innerHTML = "";
    setStatus("Ready", false);
  }

  function newThread() {
    stopInFlight();
    state.history = [];
    state.sources = [];
    els.btnSources.textContent = "Sources (0)";
    clearUI();
    addMessage("Chavruta", "Bring a passage. Add a reference if you want. Then ask one question. I’ll keep speculation clearly labeled.", "assistant");
  }

  // ---------- wiring ----------
  if (els.modeButtons?.length) {
    els.modeButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
  }
  if (els.voiceButtons?.length) {
    els.voiceButtons.forEach((btn) => btn.addEventListener("click", () => setVoice(btn.dataset.voice)));
  }

  els.optHebrew.addEventListener("change", () => { state.includeHebrew = !!els.optHebrew.checked; });
  els.optCitations.addEventListener("change", () => { state.askForCitations = !!els.optCitations.checked; });

  els.textPreset.addEventListener("change", syncRefState);
  els.refInput.addEventListener("input", syncRefState);
  els.optLockText.addEventListener("change", syncRefState);

  els.btnOpenSefaria.addEventListener("click", () => openOnSefaria(computeActiveRef()));
  els.btnSources.addEventListener("click", () => openDrawer(true));
  els.btnSourcesClose.addEventListener("click", () => openDrawer(false));
  els.sourcesDrawer.addEventListener("click", (e) => { if (e.target === els.sourcesDrawer) openDrawer(false); });

  els.stop.addEventListener("click", stopInFlight);

  // Genesis 1:1 quick action (sets preset + typed ref)
  els.gen11.addEventListener("click", () => {
    els.textPreset.value = "Genesis";
    els.refInput.value = "Genesis 1:1";
    syncRefState();
    els.input.focus();
  });

  els.btnClear.addEventListener("click", () => { stopInFlight(); clearUI(); });
  els.btnNew.addEventListener("click", newThread);
  els.btnExport.addEventListener("click", exportThread);

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = String(els.input.value || "").trim();
    if (!v) { setStatus("Type a question first", false); return; }
    els.input.value = "";
    sendText(v);
  });

  // ---------- boot ----------
  setMode("peshat");
  setVoice("balanced");
  state.includeHebrew = !!els.optHebrew.checked;
  state.askForCitations = !!els.optCitations.checked;
  syncRefState();

  addMessage("Chavruta", "Bring a passage. Add a reference if you want. Then ask one question. I’ll keep speculation clearly labeled.", "assistant");
  setStatus("Ready", false);

  console.log("[chavruta] boot ok");
})();
