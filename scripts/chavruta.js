// scripts/chavruta.js

const form = document.getElementById("chavruta-form");
const modeSelect = document.getElementById("mode");
const sessionSelect = document.getElementById("session");
const messageInput = document.getElementById("message");
const logEl = document.getElementById("log");
const sendBtn = document.getElementById("sendBtn");

let conversation = [];

// Start a fresh conversation
function newSession() {
  conversation = [];
  if (logEl) logEl.textContent = "";
}

// Render the chat log
function renderLog() {
  if (!logEl) return;
  logEl.textContent = conversation
    .map(msg => {
      const prefix = msg.role === "user" ? "You: " : "Chavruta: ";
      return prefix + msg.content;
    })
    .join("\n\n");
}

// Send message to Netlify function (no API key here!)
async function sendMessage(evt) {
  evt.preventDefault();

  const userText = (messageInput?.value || "").trim();
  const mode = modeSelect?.value || "torah";

  if (!userText) return;

  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
  }

  try {
    conversation.push({ role: "user", content: userText });
    renderLog();
    if (messageInput) messageInput.value = "";

    const res = await fetch("/.netlify/functions/chavruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, messages: conversation })
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Server error:", text);
      alert("There was a problem talking to ChavrutaGPT.");
      return;
    }

    const data = await res.json();
    const reply = data.reply || "(no reply)";

    conversation.push({ role: "assistant", content: reply });
    renderLog();
  } catch (err) {
    console.error(err);
    alert("Network error. Please try again.");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
  }
}

// Hook up events
form?.addEventListener("submit", sendMessage);
sessionSelect?.addEventListener("change", () => {
  if (sessionSelect.value === "new") {
    newSession();
    sessionSelect.value = "current";
  }
});

// Initialize
newSession();
