// scripts/chavruta.js

document.addEventListener("DOMContentLoaded", () => {
  const modeSelect = document.getElementById("mode");
  const messageInput = document.getElementById("message");
  const form = document.getElementById("chavruta-form");
  const log = document.getElementById("chat-log");
  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("chat-status");

  if (!form || !modeSelect || !messageInput || !log) {
    console.error("Chavruta DOM elements not found. Check IDs in chavruta.html.");
    return;
  }

  let history = [];

  function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `chat-row chat-row--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.textContent = text;

    row.appendChild(bubble);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setBusy(isBusy) {
    if (isBusy) {
      sendBtn.disabled = true;
      statusEl.textContent = "Chavruta is thinking…";
    } else {
      sendBtn.disabled = false;
      statusEl.textContent = "";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    const mode = modeSelect.value || "torah";

    // Show user message
    appendMessage("user", text);

    // Add to local history we send to the function
    history.push({ role: "user", content: text });

    messageInput.value = "";
    messageInput.focus();

    setBusy(true);

    try {
      const res = await fetch("/.netlify/functions/chavruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: text, history }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Server error:", res.status, errText);
        appendMessage(
          "system",
          "Sorry, something went wrong talking to Chavruta. Please try again."
        );
        return;
      }

      const data = await res.json();
      const reply = data.reply || data.error || "(no reply)";
      appendMessage("assistant", reply);

      // Update history with assistant turn
      history.push({ role: "assistant", content: reply });
    } catch (err) {
      console.error("Fetch error:", err);
      appendMessage(
        "system",
        "Network error while talking to Chavruta. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  });
});
