(() => {
  const $ = (s) => document.querySelector(s);

  const form = $("#chavForm");
  const input = $("#chavInput");
  const stream = $("#chavStream");
  const status = $("#chavStatus");
  const sendBtn = $("#chavSend");

  const ENDPOINT = "/.netlify/functions/chavruta";

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function add(role, text) {
    if (!stream) return;
    const row = document.createElement("div");
    row.className = `msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text ?? "";

    row.appendChild(bubble);
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function setBusy(isBusy) {
    if (sendBtn) sendBtn.disabled = !!isBusy;
    setStatus(isBusy ? "Thinking…" : "Ready");
  }

  async function postJSON(url, payload) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok: false, error: text }; }

    if (!res.ok || data?.ok === false) {
      const msg = data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const prompt = (input?.value || "").trim();
    if (!prompt) return;

    add("user", prompt);
    input.value = "";
    setBusy(true);

    try {
      const data = await postJSON(ENDPOINT, { prompt });
      add("assistant", data.reply || "(No reply field returned.)");
    } catch (err) {
      add("error", `Chavruta error: ${err?.message || String(err)}`);
      console.error(err);
    } finally {
      setBusy(false);
      input?.focus();
    }
  }

  // HARD FAIL if DOM hooks are missing
  if (!form || !input || !stream || !status || !sendBtn) {
    console.error("Chavruta boot failed: missing required DOM elements.");
    return;
  }

  form.addEventListener("submit", handleSubmit);

  // Nice: Enter submits, Shift+Enter allowed (future multi-line)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // Optional: accept ?q=...&autosend=1
  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim();
  const autosend = params.get("autosend") === "1";

  if (q) {
    input.value = q;
    if (autosend) form.requestSubmit();
  }

  setStatus("Ready");
})();
