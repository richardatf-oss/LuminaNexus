// scripts/chavruta.js

// Grab DOM elements
const modeSelect = document.getElementById("mode");
const sessionSelect = document.getElementById("session");
const newChatBtn = document.getElementById("newChat");
const exportBtn = document.getElementById("export");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");
const logEl = document.getElementById("log");

// Simple in-memory history for this tab
let history = [];

// Utility: append a message to the log
function appendMessage(role, text) {
  if (!logEl) return;

  const wrap = document.createElement("div");
  // role === "user" gets the "user" class, everything else is "assistant"
  wrap.className = "chat-line " + (role === "user" ? "user" : "assistant");

  const who = document.createElement("div");
  who.className = "chat-line__who";
  who.textContent = role === "user" ? "You" : "ChavrutaGPT";

  const body = document.createElement("div");
  body.className = "chat-line__body";
  body.textContent = text;

  wrap.appendChild(who);
  wrap.appendChild(body);

  logEl.appendChild(wrap);
  logEl.scrollTop = logEl.scrollHeight;
}

// Utility: append a small status line (for errors/info)
function appendStatus(text) {
  if (!logEl) return;
  const p = document.createElement("p");
  p.style.fontSize = "0.8rem";
  p.style.opacity = "0.7";
  p.style.margin = "4px 0 10px";
  p.textContent = text;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

// Reset conversation
function newChat() {
  history = [];
  if (logEl) {
    logEl.innerHTML = "";
    appendStatus(
      "New chat started. Your messages and Chavruta’s responses will appear here."
    );
  }
}

// Export conversation as plain text
function exportChat() {
  if (!history.length) {
    alert("No conversation to export yet.");
    return;
  }
  const lines = history.map(
    (m) => `${m.role === "user" ? "You" : "Chavruta"}: ${m.content}`
  );
  const blob = new Blob([lines.join("\n\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "chavruta-session.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Send message to Netlify function
async function sendMessage() {
  const message = (messageInput?.value || "").trim();
  if (!message) return;

  const mode = modeSelect?.value || "peshat";
  const sessionMode = sessionSelect?.value || "new";

  // If user explicitly chose "New session", wipe the history first
  if (sessionMode === "new") {
    history = [];
    if (logEl) logEl.innerHTML = "";
    appendStatus(
      "New session: starting fresh with this message. Mode: " + mode
    );
  }

  // Add the user's message to the UI + local history
  appendMessage("user", message);
  history.push({ role: "user", content: message });

  // UX: disable while sending
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending…";
  }

  try {
    const res = await fetch("/.netlify/functions/chavruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, message, history }),
    });

    if (!res.ok) {
      const text = await res.text();
      appendStatus("Error: " + text.slice(0, 200));
      console.error("Chavruta function error:", text);
    } else {
      const data = await res.json();
      const reply = data.reply || "(No reply received.)";
      appendMessage("assistant", reply);
      history.push({ role: "assistant", content: reply });
    }
  } catch (err) {
    console.error("Network error:", err);
    appendStatus("Network error talking to Chavruta. Check console/logs.");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }
    if (messageInput) {
      messageInput.value = "";
      messageInput.focus();
    }
  }
}

// Wire up events
if (sendBtn) sendBtn.addEventListener("click", sendMessage);

if (messageInput) {
  messageInput.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      sendMessage();
    }
  });
}

if (newChatBtn) newChatBtn.addEventListener("click", () => newChat());
if (exportBtn) exportBtn.addEventListener("click", () => exportChat());

// Start with an empty chat but a small hint
newChat();
