// /scripts/chavruta-live.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";
  const $ = (id) => document.getElementById(id);

  // Required
  const stream = $("stream");
  const form = $("form");
  const input = $("input");
  const send = $("send");
  const statusPill = $("statusPill");

  // Optional UI toggles
  const cbHebrew = $("includeHebrew");
  const cbCite = $("askForCitations");

  // Top-right buttons (optional but supported)
  const btnGen11 = $("btnGen11");
  const btnNew = $("btnNew");
  const btnClear = $("btnClear");
  const btnExport = $("btnExport");
  const btnStop = $("btnStop");

  // Mode pills container
  const modePills = document.querySelector(".mode-pills");

  let currentMode = "peshat";

  function hardFail(msg) {
    console.error("[chavruta-live]", msg);
    if (statusPill) statusPill.textContent = "Error";
    if (stream) {
      stream.innerHTML = `
        <div class="msg error">
          <div class="meta"><div class="who">Chavruta</div><div></div></div>
          <div class="body">${msg}</div>
        </div>`;
    } else {
      alert(msg);
    }
  }

  if (!stream || !form || !input || !send || !statusPill) {
    return hardFail("Chavruta UI missing required elements. Need: #stream #form #input #send #statusPill");
  }

  // Hide JS warning if present
  const jsWarning = $("jsWarning");
  if (jsWarning) jsWarning.style.display = "none";

  const nowTs = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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

    stream.appendChild(wrap);
    stream.scrollTop = stream.scrollHeight;
    return wrap;
  }

  function setStatus(text, thinking = false) {
    statusPill.textContent = text;
    statusPill.classList.toggle("is-thinking", !!thinking);
  }

  async function callFunction(payload) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    return { ok: res.ok, status: res.status, data };
  }

  function getOptions() {
    return {
      mode: currentMode,
      includeHebrew: cbHebrew ? !!cbHebrew.checked : false,
      askForCitations: cbCite ? !!cbCite.checked : true,
    };
  }

  function setMode(nextMode) {
    currentMode = nextMode;

    if (modePills) {
      modePills.querySelectorAll("button[data-mode]").forEach((btn) => {
        const on = btn.dataset.mode === currentMode;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }

    setStatus(`Ready (${currentMode})`, false);
  }

  // Make mode pills work
  if (modePills) {
    modePills.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      setMode(btn.dataset.mode);
    });
  }

  async function sendText(text) {
    const clean = String(text || "").trim();
    if (!clean) return;

    addMessage("You", clean, "user");

    setStatus("Thinking…", true);
    send.disabled = true;
    if (btnStop) btnStop.disabled = true;

    const thinkingEl = addMessage("Chavruta", "…", "assistant");

    try {
      const payload = {
        input: clean,
        history: [], // keep simple for now
        options: getOptions(),
      };

      const r = await callFunction(payload);

      thinkingEl.remove();

      if (!r.ok || !r.data?.ok) {
        const msg = r.data?.error || r.data?.raw || `HTTP ${r.status}`;
        addMessage("Chavruta", `Chavruta error: ${msg}`, "error");
      } else {
        const reply = String(r.data.content || r.data.reply || "").trim() || "(No response text returned.)";
        addMessage("Chavruta", reply, "assistant");
      }
    } catch (err) {
      thinkingEl.remove();
      addMessage("Chavruta", `Chavruta error: ${err?.message || err}`, "error");
    } finally {
      send.disabled = false;
      if (btnStop) btnStop.disabled = true;
      setStatus(`Ready (${currentMode})`, false);
      input.focus();
    }
  }

  // Boot message
  addMessage("Chavruta", "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.", "assistant");
  setMode("peshat");

  // Submit handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = String(input.value || "").trim();
    if (!text) {
      setStatus("Type a question first", false);
      return;
    }
    input.value = "";
    sendText(text);
  });

  // Top-right button wiring
  if (btnGen11) btnGen11.addEventListener("click", () => {
    input.value = "Genesis 1:1 — please respond in the current mode, then give 2–4 honest questions.";
    input.focus();
  });

  if (btnNew) btnNew.addEventListener("click", () => {
    input.value = "";
    input.focus();
  });

  if (btnClear) btnClear.addEventListener("click", () => {
    stream.innerHTML = "";
    addMessage("Chavruta", "New session. Bring a passage, then ask one question.", "assistant");
  });

  if (btnExport) btnExport.addEventListener("click", () => {
    const text = Array.from(stream.querySelectorAll(".msg")).map((m) => {
      const who = m.querySelector(".who")?.textContent || "";
      const body = m.querySelector(".body")?.textContent || "";
      return `${who}: ${body}`;
    }).join("\n\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chavruta-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Ivrit HaOr -> Chavruta handoff (localStorage)
  const draft = localStorage.getItem("LN_CHAVRUTA_DRAFT");
  if (draft) {
    input.value = draft;
    input.focus();
    localStorage.removeItem("LN_CHAVRUTA_DRAFT");
  }

  console.log("[chavruta-live] boot ok");
})();
