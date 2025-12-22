// scripts/chavruta.js

const chatWindow = document.getElementById("chatWindow");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");

let messages = [
  {
    role: "assistant",
    content:
      "Shalom. Paste a short passage. Then say: “Peshat first. One classical note. Then ask me 3 questions.”",
  },
];

function render() {
  chatWindow.innerHTML = "";
  for (const m of messages) {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "assistant"}`;
    div.textContent = m.content;
    chatWindow.appendChild(div);
  }
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function send() {
  const text = (chatInput.value || "").trim();
  if (!text) return;

  messages.push({ role: "user", content: text });
  chatInput.value = "";
  render();

  // lightweight "typing" placeholder
  const typing = { role: "assistant", content: "…" };
  messages.push(typing);
  render();

  try {
    const res = await fetch("/.netlify/functions/chavruta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `Request failed: ${res.status}`);
    }

    const data = await res.json();

    // remove typing bubble
    messages = messages.filter((m) => m !== typing);

    messages.push({ role: "assistant", content: data.reply || "(No reply.)" });
    render();
  } catch (err) {
    messages = messages.filter((m) => m !== typing);
    messages.push({
      role: "assistant",
      content:
        "I couldn’t reach the study function yet. This usually means the API key isn’t set on Netlify, or the function hasn’t deployed.",
    });
    render();
    console.error(err);
  }
}

sendBtn.addEventListener("click", send);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});

clearBtn.addEventListener("click", () => {
  messages = messages.slice(0, 1);
  render();
});

render();
