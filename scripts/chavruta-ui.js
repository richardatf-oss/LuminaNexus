// scripts/chavruta-ui.js
// Minimal Chavruta chat UI that calls Netlify Function: /.netlify/functions/chavruta

(function () {
  const ENDPOINT = "/.netlify/functions/chavruta";

  const el = (id) => document.getElementById(id);

  function addMsg(role, text) {
    const log = el("chatLog");
    if (!log) return;

    const row = document.createElement("div");
    row.className = "msg " + (role === "user" ? "user" : "assistant");

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = role === "user" ? "You" : "Chavruta";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    row.appendChild(badge);
    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setStatus(text) {
    const s = el("chatStatus");
    if (s) s.textContent = text || "";
  }

  async function sendMessage() {
    const input = el("chatInput");
    const btn = el("chatSend");
    const text = (input?.value || "").trim();
    if (!text) return;

    addMsg("user", text);
    input.value = "";
    input.focus();

    setStatus("Thinking…");
    btn.disabled = true;

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          // optional: include kavanah saved from the Gate, if present
          kavanah: (() => {
            try { return JSON.parse(localStorage.getItem("luminanexus_gate_kavanah_v1") || "null"); }
            catch { return null; }
          })()
        })
      });

      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { reply: raw }; }

      if (!res.ok) {
        addMsg("assistant", `Error (${res.status}): ${data?.error || raw}`);
      } else {
        const reply = data?.reply || data?.message || data?.output || raw || "(no reply)";
        addMsg("assistant", reply);
      }
    } catch (err) {
      addMsg("assistant", `Network error: ${err?.message || err}`);
    } finally {
      setStatus("");
      btn.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = el("chatInput");
    const btn = el("chatSend");

    btn?.addEventListener("click", sendMessage);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Seed greeting
    addMsg("assistant", "Shalom. Bring one text or one question. We will go slowly, Torah-first.");
  });
})();
