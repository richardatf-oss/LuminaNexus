const chat = document.getElementById("chat");
const form = document.getElementById("composer");
const messageEl = document.getElementById("message");
const modeEl = document.getElementById("mode");
const statusEl = document.getElementById("status");
const newChatBtn = document.getElementById("newChat");

const STORAGE_KEY = "lnx_chavruta_session_v1";

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { mode: "peshat", messages: [] };
  } catch {
    return { mode: "peshat", messages: [] };
  }
}

function saveSession(session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function addMessage(role, text) {
  const wrapper = el("div", `msg ${role === "user" ? "msg--user" : "msg--ai"}`);
  const bubble = el("div", "msg__bubble");
  bubble.textContent = text;
  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function ensureModeInUI(session) {
  if (session.mode) modeEl.value = session.mode;
  modeEl.addEventListener("change", () => {
    session.mode = modeEl.value;
    saveSession(session);
  });
}

function renderFromSession(session) {
  // Keep the first greeting already in the HTML; add saved history under it.
  for (const m of session.messages) addMessage(m.role, m.content);
}

async function sendToServer({ mode, messages }) {
  const res = await fetch("/.netlify/functions/chavruta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data; // { reply: "...", messages?: [...] }
}

const session = loadSession();
ensureModeInUI(session);
renderFromSession(session);

newChatBtn.addEventListener("click", () => {
  if (!confirm("Clear this chat on this device?")) return;
  localStorage.removeItem(STORAGE_KEY);

  // reset UI
  session.mode = "peshat";
  session.messages = [];
  modeEl.value = "peshat";
  saveSession(session);

  // remove all messages except the initial greeting
  const all = chat.querySelectorAll(".msg");
  all.forEach((node, idx) => {
    if (idx === 0) return;
    node.remove();
  });

  setStatus("New chat started.");
  setTimeout(() => setStatus(""), 900);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = (messageEl.value || "").trim();
  if (!text) return;

  // show user message immediately
  addMessage("user", text);
  session.messages.push({ role: "user", content: text });
  saveSession(session);

  // clear input
  messageEl.value = "";
  messageEl.focus();

  // send
  try {
    setStatus("Thinking…");

    // show a temporary “typing” bubble
    const typing = el("div", "msg msg--ai");
    const bubble = el("div", "msg__bubble", "…");
    bubble.dataset.typing = "1";
    typing.appendChild(bubble);
    chat.appendChild(typing);
    chat.scrollTop = chat.scrollHeight;

    const data = await sendToServer({
      mode: session.mode || modeEl.value || "peshat",
      messages: session.messages,
    });

    // remove typing
    typing.remove();

    const reply = data.reply || "(No reply returned.)";
    addMessage("assistant", reply);

    session.messages.push({ role: "assistant", content: reply });
    saveSession(session);

    setStatus("");
  } catch (err) {
    setStatus("");
    addMessage("assistant", `Sorry — I hit an error: ${err.message}`);
  }
});

// UX: Enter sends, Shift+Enter newline
messageEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});
