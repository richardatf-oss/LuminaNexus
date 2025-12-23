// ===== ChavrutaGPT Front-End Logic =====

// DOM elements
const chatLog     = document.getElementById("chat-log");
const messageBox  = document.getElementById("message");
const sendBtn     = document.getElementById("send");
const modeSelect  = document.getElementById("mode");
const statusLine  = document.getElementById("status");
const newChatBtn  = document.getElementById("new-chat");
const exportBtn   = document.getElementById("export-chat");
const titleEl     = document.getElementById("session-title");

// 🔑 API key (client-side is never perfect security, but this is fine for your private tool)
const OPENAI_API_KEY = "PASTE_YOUR_API_KEY_HERE";

// Session state
let conversation = []; // [{ role: "user" | "assistant", content: string }]
let sessionTitle = "New session";

// localStorage key
const STORAGE_KEY = "lnx_chavruta_session_v1";

// ---------- Helpers ----------

function systemPromptForMode(mode) {
  switch (mode) {
    case "laws":
      return "You are ChavrutaGPT. Teach the Seven Noahide Laws with calm, concrete practice. No psak. No coercion. Plain meaning, clear examples, and honest boundaries.";
    case "ivrit":
      return "You are ChavrutaGPT. Teach Hebrew respectfully and concretely: pronunciation (in easy Latin letters), root meaning, related words, and short usage examples. Be modest with grammar.";
    case "kabbalah":
      return "You are ChavrutaGPT. Use Kabbalah only as ethical and spiritual metaphor, not as magic or power. No theurgy, no grand claims, no 'secrets revealed'. Always tie ideas back to character, responsibility, and humility.";
    case "physics":
      return "You are ChavrutaGPT. Use physics and cosmology only as ANALOGY for ethical and spiritual ideas. Science is not proof of theology. Be very explicit when something is an analogy. Keep the tone sober and non-hyped.";
    default:
      return "You are ChavrutaGPT. A Torah-first chavruta partner. For each question, prioritize peshat (plain meaning), optionally one classical note if it genuinely clarifies, then 1–3 questions for reflection and one small, realistic next step. No psak. No conversion guidance. No coercion.";
  }
}

function modeLabel(mode) {
  switch (mode) {
    case "laws":     return "Seven Laws (practice)";
    case "ivrit":    return "Hebrew (Ivrit)";
    case "kabbalah": return "Ethical Kabbalah (bounded)";
    case "physics":  return "Physics & Order (analogy)";
    default:         return "Torah (peshat first)";
  }
}

function renderMessage(role, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message chat-message--${role}`;

  const roleLabel = document.createElement("div");
  roleLabel.className = "chat-role";
  roleLabel.textContent = role === "user" ? "You" : "ChavrutaGPT";

  const body = document.createElement("div");
  body.className = "chat-text";

  // Keep it simple: basic text; let markdown just appear as plain text
  body.textContent = text;

  wrapper.appendChild(roleLabel);
  wrapper.appendChild(body);
  chatLog.appendChild(wrapper);

  // Scroll so latest message is visible
  wrapper.scrollIntoView({ behavior: "smooth", block: "end" });
}

function renderConversation() {
  chatLog.innerHTML = "";
  conversation.forEach(msg => {
    renderMessage(msg.role, msg.content);
  });
}

function setStatus(text) {
  statusLine.textContent = text || "";
}

function setSessionTitle(fromText) {
  if (sessionTitle !== "New session") return; // already set
  const clean = (fromText || "").replace(/\s+/g, " ").trim();
  if (!clean) return;
  sessionTitle = clean.slice(0, 60) + (clean.length > 60 ? "…" : "");
  titleEl.textContent = sessionTitle;
}

function saveSession() {
  try {
    const payload = {
      mode: modeSelect.value,
      title: sessionTitle,
      conversation
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save session:", err);
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    if (data.mode && modeSelect) modeSelect.value = data.mode;
    if (data.title) {
      sessionTitle = data.title;
      titleEl.textContent = sessionTitle;
    }
    if (Array.isArray(data.conversation)) {
      conversation = data.conversation;
      renderConversation();
    }
  } catch (err) {
    console.warn("Could not load session:", err);
  }
}

function resetSession(keepMode = true) {
  conversation = [];
  sessionTitle = "New session";
  titleEl.textContent = sessionTitle;
  chatLog.innerHTML = "";

  if (!keepMode) {
    // already handled by the mode change listener
  }

  saveSession();
}

// ---------- Chat logic ----------

async function sendMessage() {
  const text = messageBox.value.trim();
  if (!text) return;

  if (!OPENAI_API_KEY || OPENAI_API_KEY === "PASTE_YOUR_API_KEY_HERE") {
    alert("You need to paste your OpenAI API key into scripts/chavruta.js.");
    return;
  }

  // Initialize title from first user message
  setSessionTitle(text);

  // Add user message to conversation and UI
  const userMsg = { role: "user", content: text };
  conversation.push(userMsg);
  renderMessage("user", text);
  messageBox.value = "";
  saveSession();

  // Show "thinking…" placeholder
  const thinking = document.createElement("div");
  thinking.className = "chat-message chat-message--assistant";
  thinking.innerHTML = `<div class="chat-role">ChavrutaGPT</div>
                        <div class="chat-text"><em>Thinking…</em></div>`;
  chatLog.appendChild(thinking);
  thinking.scrollIntoView({ behavior: "smooth", block: "end" });

  // Disable send while request is in flight
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending…";
  setStatus("Asking ChavrutaGPT…");

  try {
    const mode = modeSelect.value;

    const apiMessages = [
      { role: "system", content: systemPromptForMode(mode) },
      ...conversation
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: apiMessages
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I wasn't able to respond this time.";

    // Remove "Thinking…" placeholder
    chatLog.removeChild(thinking);

    const assistantMsg = { role: "assistant", content: reply };
    conversation.push(assistantMsg);
    renderMessage("assistant", reply);
    saveSession();

    setStatus(`Mode: ${modeLabel(mode)}`);
  } catch (err) {
    console.error(err);
    chatLog.removeChild(thinking);
    renderMessage("assistant", "Sorry — there was an error reaching the API. Please try again in a moment.");
    setStatus("Error talking to ChavrutaGPT.");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
}

// ---------- Export ----------

function exportSession() {
  if (!conversation.length) {
    alert("No conversation to export yet.");
    return;
  }

  const mode = modeLabel(modeSelect.value);
  const header = [
    "ChavrutaGPT Session — LuminaNexus",
    `Mode: ${mode}`,
    `Title: ${sessionTitle}`,
    "",
    "----------------------------------------",
    ""
  ];

  const lines = conversation.map(msg => {
    const who = msg.role === "user" ? "You" : "ChavrutaGPT";
    return `${who}:\n${msg.content}\n`;
  });

  const content = header.concat(lines).join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chavruta-session.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- Event wiring ----------

sendBtn.addEventListener("click", sendMessage);

messageBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

newChatBtn.addEventListener("click", () => {
  if (conversation.length && !confirm("Start a new chat? This will clear the current session (it is not exported).")) {
    return;
  }
  resetSession(true);
  setStatus("New session started.");
});

exportBtn.addEventListener("click", exportSession);

// Changing mode starts a fresh session
modeSelect.addEventListener("change", () => {
  resetSession(false);
  setStatus(`Mode set to: ${modeLabel(modeSelect.value)}`);
});

// Load any saved session on page load
loadSession();
setStatus(`Mode: ${modeLabel(modeSelect.value)}`);
