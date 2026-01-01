// /scripts/chavruta-live.js
(() => {
  const ENDPOINT = "/.netlify/functions/chavruta";
  const $ = (id) => document.getElementById(id);

  const stream = $("stream");
  const form = $("form");
  const input = $("input");
  const send = $("send");
  const statusPill = $("statusPill");

  // Hard fail with visible output if something is missing
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

  // Hide JS warning if present
  const jsWarning = $("jsWarning");
  if (jsWarning) jsWarning.style.display = "none";

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

  async function callFunction(payload) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  // ---------------------------
  // Prefill support (Ivrit → Chavruta)
  // ---------------------------
  function applyPrefill() {
    let prefill = "";

    // 1) URL param: ?prefill=...
    try {
      const params = new URLSearchParams(window.location.search || "");
      prefill = params.get("prefill") || "";
    } catch {
      prefill = "";
    }

    // 2) sessionStorage fallback
    if (!prefill) {
      try {
        prefill = sessionStorage.getItem("chavrutaPrefill") || "";
      } catch {
        prefill = "";
      }
    }

    prefill = String(prefill || "").trim();

    if (prefill) {
      input.value = prefill;

      // Clear storage so it doesn't keep reloading
      try {
        sessionStorage.removeItem("chavrutaPrefill");
      } catch {}

      // Optional: clean the URL (remove ?prefill=...) without reloading
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("prefill")) {
          url.searchParams.delete("prefill");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}

      setStatus("Ready (prefilled)", false);
      // Put cursor in the input so user can edit or just hit Send
      setTimeout(() => input.focus(), 50);
    }
  }

  // BOOT message (so we know script is alive)
  addMessage(
    "Chavruta",
    "Bring a passage. Then ask one question. I’ll keep speculation clearly labeled.",
    "assistant"
  );
  setStatus("Ready", false);

  // Apply prefill AFTER boot UI exists
  applyPrefill();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = String(input.value || "").trim();
    if (!text) {
      setStatus("Type a question first", false);
      return;
    }

    input.value = "";
    addMessage("You", text, "user");

    setStatus("Thinking…", true);
    send.disabled = true;

    const thinkingEl = addMessage("Chavruta", "…", "assistant");

    try {
      const payload = {
        input: text,
        history: [], // keep simple for now
        options: { mode: "peshat", includeHebrew: false, askForCitations: true },
      };

      const r = await callFunction(payload);

      thinkingEl.remove();

      if (!r.ok || !r.data?.ok) {
        const msg = r.data?.error || r.data?.raw || `HTTP ${r.status}`;
        addMessage("Chavruta", `Chavruta error: ${msg}`, "error");
      } else {
        const reply =
          String(r.data.content || r.data.reply || "").trim() ||
          "(No response text returned.)";
        addMessage("Chavruta", reply, "assistant");
      }
    } catch (err) {
      thinkingEl.remove();
      addMessage("Chavruta", `Chavruta error: ${err?.message || err}`, "error");
    } finally {
      send.disabled = false;
      setStatus("Ready", false);
      input.focus();
    }
  });

  console.log("[chavruta-live] boot ok");
})();
