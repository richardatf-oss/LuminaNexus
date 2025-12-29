// /scripts/chavruta.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";

  // If this runs, hide the warning banner immediately.
  const jsWarning = document.getElementById("jsWarning");
  if (jsWarning) jsWarning.style.display = "none";

  const $ = (id) => document.getElementById(id);

  const els = {
    stream: $("stream"),
    form: $("form"),
    input: $("input"),
    send: $("send"),
    stop: $("btnStop"),
    gen11: $("btnGen11"),
    btnNew: $("btnNew"),
    btnClear: $("btnClear"),
    btnExport: $("btnExport"),
    statusPill: $("statusPill"),
    statusHint: $("statusHint"),
    optHebrew: $("optHebrew"),
    optCitations: $("optCitations"),
    modeButtons: Array.from(document.querySelectorAll(".chip[data-mode]")),
  };

  // If any required element is missing, fail loudly (and visibly).
  const required = ["stream","form","input","send","btnStop","btnGen11","btnNew","btnClear","btnExport","statusPill","statusHint"];
  for (const key of required) {
    if (!els[key]) {
      console.error("[chavruta] missing element:", key);
      return;
    }
  }

  const state = {
    mode: "peshat",
    includeHebrew: false,
    askForCitations: true,
    history: [],
    inFlight: null, // { controller }
  };

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

  function modePromptHint(mode) {
    if (mode === "sources") return "Give primary sources with references. Keep it Torah-first.";
    if (mode === "chavruta") return "Text first, then 3–7 questions. Speculation clearly labeled.";
    return "Peshat: plain meaning first, minimal speculation.";
  }

  function setMode(mode) {
    state.mode = mode;
    els.modeButtons.forEach(btn => {
      const on = btn.dataset.mode === mode;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    els.statusHint.textContent = modePromptHint(mode);
  }

  function stopInFlight() {
    if (state.inFlight?.controller) state.inFlight.controller.abort();
    state.inFlight = null;
    setDisabled(false);
    setStatus("Ready", false);
  }

  async function postJSON(payload, { timeoutMs = 45000 } = {}) {
    // Cancel any existing request (prevents “tail chasing”)
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

      return { ok: res.ok, status: res.status, data };
    } finally {
      clearTimeout(timer);
      if (state.inFlight?.controller === controller) state.inFlight = null;
    }
  }

  async function sendText(text) {
    const t = String(text || "").trim();
    if (!t) return;

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
          includeHebrew: state.includeHebrew,
          askForCitations: state.askForCitations,
        },
      };

      const r = await postJSON(payload);

      if (!r.ok || !r.data?.ok) {
        const msg = r.data?.error || (r.status ? `HTTP ${r.status}` : "Request failed");
        addMessage("Chavruta", `Chavruta error: ${msg}`, "error");
        return;
      }

      const reply = String(r.data.content || r.data.reply || "").trim() || "(No response text returned.)";
      addMessage("Chavruta", reply, "assistant");
      pushHistory("assistant", reply);
    } catch (err) {
      const isAbort = err?.name === "AbortError";
      addMessage("Chavruta", isAbort ? "Chavruta error: Request aborted / timed out." : `Chavruta error: ${err?.message || err}`, "error");
    } finally {
      setDisabled(false);
      setStatus("Ready", false);
      els.input.focus();
    }
  }

  function exportThread() {
    const lines = [];
    lines.push(`# Chavruta Export`);
    lines.push(`- Mode: ${state.mode}`);
    lines.push(`- Include Hebrew: ${state.includeHebrew ? "yes" : "no"}`);
    lines.push(`- Ask for citations: ${state.askForCitations ? "yes" : "no"}`);
    lines.push("");

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
    clearUI();
    addMessage("Chavruta", "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.", "assistant");
  }

 // wiring (guarded: NEVER die silently)
try {
  // mode buttons (optional)
  if (els.modeButtons?.length) {
    els.modeButtons.forEach(btn =>
      btn.addEventListener("click", () => setMode(btn.dataset.mode))
    );
  } else {
    console.warn("[chavruta] no mode buttons found (.chip[data-mode])");
  }

  // options (optional)
  if (els.optHebrew) {
    els.optHebrew.addEventListener("change", () => {
      state.includeHebrew = !!els.optHebrew.checked;
    });
  } else {
    console.warn("[chavruta] missing optHebrew checkbox (#optHebrew)");
  }

  if (els.optCitations) {
    els.optCitations.addEventListener("change", () => {
      state.askForCitations = !!els.optCitations.checked;
    });
  } else {
    console.warn("[chavruta] missing optCitations checkbox (#optCitations)");
  }

  // required buttons
  els.stop.addEventListener("click", stopInFlight);
  els.gen11.addEventListener("click", () => { els.input.value = "Genesis 1:1"; els.input.focus(); });

  els.btnClear.addEventListener("click", () => { stopInFlight(); clearUI(); });
  els.btnNew.addEventListener("click", newThread);
  els.btnExport.addEventListener("click", exportThread);

  // submit: trim BEFORE clearing + always show something if it fails
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const v = String(els.input.value || "").trim();
    if (!v) {
      setStatus("Type a question first", false);
      return;
    }

    els.input.value = "";
    sendText(v);
  });

} catch (err) {
  console.error("[chavruta] wiring crash:", err);
  setStatus("Chavruta crashed (see console)", false);
}


  // boot
  setMode("peshat");
  state.includeHebrew = !!els.optHebrew.checked;
  state.askForCitations = !!els.optCitations.checked;

  addMessage("Chavruta", "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.", "assistant");
  setStatus("Ready", false);

  console.log("[chavruta] boot ok");
})();
