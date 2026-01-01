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

  // Optional UI
  const statusHint = $("statusHint");
  const jsWarning = $("jsWarning");

  // Buttons (optional but we will wire if present)
  const btnGen11 = $("btnGen11");
  const btnNew = $("btnNew");
  const btnClear = $("btnClear");
  const btnExport = $("btnExport");
  const btnStop = $("btnStop");

  // Options
  const optHebrew = $("optHebrew");
  const optCitations = $("optCitations");

  // Mode pills (in your HTML they are .chip)
  const modeButtons = Array.from(document.querySelectorAll(".chip[data-mode]"));

  // ---- Hard fail if core elements missing ----
  function hardFail(msg) {
    console.error("[chavruta-live]", msg);
    if (statusPill) statusPill.textContent = "Error";
    if (stream) {
      stream.innerHTML = `<div class="msg error"><div class="meta"><div class="who">Chavruta</div><div></div></div><div class="body">${msg}</div></div>`;
    } else {
      alert(msg);
    }
  }

  if (!stream || !form || !input || !send || !statusPill) {
    return hardFail(
      "Chavruta UI missing required elements. Need: #stream #form #input #send #statusPill"
    );
  }

  if (jsWarning) jsWarning.style.display = "none";

  // ---- Helpers ----
  const nowTs = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function addMessage(who, body, kind = "assistant") {
    const wrap = document.createElement("div");
    wrap.className = `msg ${kind === "user" ? "user" : ""} ${
      kind === "error" ? "error" : ""
    }`;

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

  function clearStream() {
    stream.innerHTML = "";
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function buildTranscript() {
    const msgs = Array.from(stream.querySelectorAll(".msg"));
    const lines = [];
    for (const m of msgs) {
      const who = m.querySelector(".who")?.textContent || "Unknown";
      const time = m.querySelector(".meta div:last-child")?.textContent || "";
      const body = m.querySelector(".body")?.textContent || "";
      lines.push(`[${time}] ${who}:`);
      lines.push(body);
      lines.push("");
    }
    return lines.join("\n");
  }

  // ---- State ----
  let history = [];
  let currentMode = "peshat";
  let controller = null;

  const modeHints = {
    peshat: "Peshat: plain meaning first, minimal speculation.",
    remez: "Remez: hints, patterns, connections (still grounded).",
    derash: "Derash: teachings, midrashic framing, moral lenses.",
    sod: "Sod: inner layer—mystical, clearly labeled and careful.",
  };

  function setMode(newMode) {
    currentMode = newMode || "peshat";

    modeButtons.forEach((btn) => {
      const active = btn.dataset.mode === currentMode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    if (statusHint) statusHint.textContent = modeHints[currentMode] || "";
  }

  // ---- Network ----
  async function callFunction(payload) {
    controller = new AbortController();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const raw = await res.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    return { ok: res.ok, status: res.status, data };
  }

  // ---- Boot ----
  function bootMessage() {
    addMessage(
      "Chavruta",
      "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.",
      "assistant"
    );
  }

  clearStream();
  bootMessage();
  setMode("peshat");
  setStatus("Ready", false);

  // ---- Wiring: mode pills ----
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  // ---- Core send routine ----
  async function sendText(text) {
    const cleaned = String(text || "").trim();
    if (!cleaned) return;

    input.value = "";
    addMessage("You", cleaned, "user");

    setStatus("Thinking…", true);
    send.disabled = true;
    if (btnStop) btnStop.disabled = false;

    const thinkingEl = addMessage("Chavruta", "…", "assistant");

    try {
      const payload = {
        input: cleaned,
        history, // keep conversation
        options: {
          mode: currentMode,
          includeHebrew: optHebrew ? !!optHebrew.checked : false,
          askForCitations: optCitations ? !!optCitations.checked : true,
        },
      };

      const r = await callFunction(payload);

      thinkingEl.remove();

      if (!r.ok || !r.data?.ok) {
        const msg = r.data?.error || r.data?.raw || `HTTP ${r.status}`;
        addMessage("Chavruta", `Chavruta error: ${msg}`, "error");
        return;
      }

      const reply =
        String(r.data.content || r.data.reply || "").trim() ||
        "(No response text returned.)";

      addMessage("Chavruta", reply, "assistant");

      // Update history for next turns
      history = [
        ...history,
        { role: "user", content: cleaned },
        { role: "assistant", content: reply },
      ];
    } catch (err) {
      thinkingEl.remove();

      // Abort is not a real error to show as scary
      if (err?.name === "AbortError") {
        addMessage("Chavruta", "Stopped.", "assistant");
      } else {
        addMessage("Chavruta", `Chavruta error: ${err?.message || err}`, "error");
      }
    } finally {
      send.disabled = false;
      if (btnStop) btnStop.disabled = true;
      setStatus("Ready", false);
      input.focus();
      controller = null;
    }
  }

  // Form submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendText(input.value);
  });

  // ---- Quick buttons ----
  if (btnGen11) {
    btnGen11.addEventListener("click", async () => {
      // You can choose either: just fill input, or fill+send.
      // This does fill + send:
      await sendText("Genesis 1:1");
    });
  }

  if (btnNew) {
    btnNew.addEventListener("click", () => {
      // Hard reset
      history = [];
      clearStream();
      bootMessage();
      setStatus("Ready", false);
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      // Clear only what you see, keep history so convo can continue
      clearStream();
      bootMessage();
      setStatus("Ready", false);
    });
  }

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      const txt = buildTranscript();
      const stamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      downloadText(`chavruta-${stamp}.txt`, txt);
    });
  }

  if (btnStop) {
    btnStop.addEventListener("click", () => {
      if (controller) controller.abort();
    });
  }

  console.log("[chavruta-live] boot ok");
})();
