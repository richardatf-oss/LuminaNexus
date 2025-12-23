// scripts/chavruta.js
// Simple Torah-first chat UI that talks to the Netlify function.
// No API key lives in the browser. All secrets stay on Netlify.

const modeSelect = document.getElementById("mode");
const sessionSelect = document.getElementById("session");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");

let currentSessionId = null;

// --- helpers --------------------------------------------------------------

function makeSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "sess_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function appendMessage(role, text) {
  if (!logEl) return;
  const block = document.createElement("div");
  block.className = "msg msg--" + role;

  const label = document.createElement("div");
  label.className = "msg__label";
  label.textContent = role === "user" ? "You" :
                      role === "assistant" ? "ChavrutaGPT" :
                      "Notice";

  const body = document.createElement("div");
  body.className = "msg__body";
  body.textContent = text;

  block.appendChild(label);
  block.appendChild(body);
  logEl.appendChild(block);
  logEl.scrollTop = logEl.scrollHeight;
}

function clearLog() {
  if (logEl) logEl.innerHTML = "";
}

// --- session controls -----------------------------------------------------

function startNewSession() {
  currentSessionId = makeSessionId();
  clearLog();
  appendMessage(
    "system",
    "New Chavruta session started. Torah-first: peshat before speculation, ethics before excitement."
  );
  if (sessionSelect) {
    sessionSelect.value = "new";
  }
}

if (sessionSelect) {
  sessionSelect.addEventListener("change", () => {
    if (sessionSelect.value === "new") {
      startNewSession();
    }
  });
}

// --- send message ---------------------------------------------------------

async function sendMessage() {
  const text = (inputEl?.value || "").trim();
  if (!text) return;

  if (!currentSessionId) {
    currentSessionId = makeSessionId();
  }

  appendMessage("user", text);
  if (inputEl) inputEl.value = "";
  setStatus("Thinking…");

  try {
    const res = await fetch("/.netlify/functions/chavruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: modeSelect ? modeSelect.value : "torah",
        message: text,
        sessionId: currentSessionId
      })
    });

    if (!res.ok) {
      const bodyText = await res.text();
      throw new Error(`HTTP ${res.status}: ${bodyText}`);
    }

    const data = await res.json();
    if (data.sessionId) {
      currentSessionId = data.sessionId;
    }

    if (data.reply) {
      appendMessage("assistant", data.reply);
    } else {
      appendMessage(
        "system",
        "Chavruta replied with an empty message. This usually means the server had trouble."
      );
    }

    setStatus(
      "Torah-first boundaries: no psak, no conversion guidance, no theurgy or power-claims, no urgency or coercion."
    );
  } catch (err) {
    console.error("Chavruta error:", err);
    appendMessage(
      "system",
      "Sorry — Chavruta is having trouble right now. If this keeps happening, please tell Kiah Aviyu."
    );
    setStatus("Error talking to Chavruta.");
  }
}

// --- wire up UI -----------------------------------------------------------

if (sendBtn) {
  sendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendMessage();
  });
}

if (inputEl) {
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// Kick things off with a fresh session
startNewSession();
setStatus(
  "Torah-first boundaries: no psak, no conversion guidance, no theurgy or power-claims, no urgency or coercion."
);
