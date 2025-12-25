// scripts/chavruta-chat.js
import { UI } from "/scripts/chavruta-ui.js";

const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

const ENDPOINT = "/.netlify/functions/chavruta";

// Keep a local history buffer (sent to the function to preserve context)
const history = [];

UI.bootGreeting();
UI.setStatus("Ready");

function pushHistory(role, content) {
  history.push({ role, content });
  // Keep it modest and fast
  if (history.length > 24) history.splice(0, history.length - 24);
}

async function sendToChavruta(userText) {
  UI.setStatus("Thinking…");
  sendBtn.disabled = true;
  input.disabled = true;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: userText,
        history
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      const msg = data?.error ? `Error: ${data.error}` : `Error: ${res.status}`;
      UI.addMessage("Chavruta", `Hebrew:\n(שגיאה)\n\nEnglish:\n${msg}`, "assistant");
      return;
    }

    UI.addMessage("Chavruta", data.content || "Hebrew:\n(אין תשובה)\n\nEnglish:\n(No response.)", "assistant");
    pushHistory("assistant", data.content || "");
  } catch (err) {
    UI.addMessage("Chavruta", `Hebrew:\n(שגיאה)\n\nEnglish:\n${err.message}`, "assistant");
  } finally {
    UI.setStatus("Ready");
    sendBtn.disabled = false;
    input.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = (input.value || "").trim();
  if (!text) return;

  UI.addMessage("You", text, "user");
  pushHistory("user", text);

  input.value = "";
  await sendToChavruta(text);
});
