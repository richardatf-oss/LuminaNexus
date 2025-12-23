const chatLog = document.getElementById("chat-log");
const messageBox = document.getElementById("message");
const sendBtn = document.getElementById("send");
const modeSelect = document.getElementById("mode");

// 🔑 PUT YOUR API KEY HERE
const OPENAI_API_KEY = "PASTE_YOUR_API_KEY_HERE";

function addMessage(role, text) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${role}`;
  msg.innerHTML = `<div class="chat-role">${role === "user" ? "You" : "ChavrutaGPT"}</div>
                   <div class="chat-text">${text}</div>`;
  chatLog.appendChild(msg);

  // 🔥 THIS FIXES YOUR SCROLL PROBLEM
  msg.scrollIntoView({ block: "start" });
}

function systemPromptForMode(mode) {
  switch (mode) {
    case "laws":
      return "You are ChavrutaGPT. Teach the Seven Laws clearly, calmly, and practically. No psak.";
    case "ivrit":
      return "You are ChavrutaGPT. Teach Hebrew concretely: pronunciation, meaning, usage.";
    case "kabbalah":
      return "You are ChavrutaGPT. Treat Kabbalah as ethical metaphor only. No mysticism or power claims.";
    case "physics":
      return "You are ChavrutaGPT. Physics analogies only. Science is not proof of theology.";
    default:
      return "You are ChavrutaGPT. Torah-first study. Give peshat, one classical note if helpful, questions, and one practical step.";
  }
}

async function sendMessage() {
  const text = messageBox.value.trim();
  if (!text) return;

  addMessage("user", text);
  messageBox.value = "";

  addMessage("assistant", "<em>Thinking…</em>");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPromptForMode(modeSelect.value) },
        { role: "user", content: text }
      ]
    })
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "No response.";

  // Replace the “Thinking…” message
  chatLog.lastChild.remove();
  addMessage("assistant", reply);
}

sendBtn.addEventListener("click", sendMessage);

messageBox.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
