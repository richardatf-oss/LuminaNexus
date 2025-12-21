async function callChavruta({ message, mode }) {
  const res = await fetch("/.netlify/functions/chavruta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error || `Request failed (${res.status})`;
    throw new Error(err);
  }
  return data.reply || "";
}

function initChavrutaPage() {
  const promptEl = document.getElementById("prompt");
  const modeEl = document.getElementById("mode");
  const sendEl = document.getElementById("send");
  const clearEl = document.getElementById("clear");
  const outEl = document.getElementById("output");
  const statusEl = document.getElementById("status");

  if (!promptEl || !modeEl || !sendEl || !outEl || !statusEl) return;

  const setStatus = (s) => { statusEl.textContent = s || ""; };

  clearEl?.addEventListener("click", () => {
    promptEl.value = "";
    outEl.textContent = "";
    setStatus("");
    promptEl.focus();
  });

  sendEl.addEventListener("click", async () => {
    const message = (promptEl.value || "").trim();
    const mode = (modeEl.value || "torah").trim();
    if (!message) {
      setStatus("Type a prompt first.");
      return;
    }

    outEl.textContent = "";
    setStatus("Thinking…");

    try {
      const reply = await callChavruta({ message, mode });
      outEl.textContent = reply;
      setStatus("");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  });
}

initChavrutaPage();
