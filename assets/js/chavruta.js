// assets/js/chavruta.js

(function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");

  if (!form || !input || !log) return;

  let conversation = [];

  function appendMessage(role, content) {
    const div = document.createElement("div");
    div.classList.add("chat-message", role);
    div.textContent = content;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    // Show user message
    appendMessage("user", text);
    input.value = "";
    input.focus();

    // Add to conversation
    conversation.push({ role: "user", content: text });

    // Show thinking indicator
    const thinking = document.createElement("div");
    thinking.classList.add("chat-message", "system");
    thinking.textContent = "Thinking…";
    log.appendChild(thinking);
    log.scrollTop = log.scrollHeight;

    try {
      const res = await fetch("/.netlify/functions/chavruta-gpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation }),
      });

      log.removeChild(thinking);

      if (!res.ok) {
        appendMessage(
          "assistant",
          "Sorry, something went wrong talking to ChavrutaGPT."
        );
        return;
      }

      const data = await res.json();
      const reply = data.reply && data.reply.content ? data.reply.content : "";

      if (reply) {
        conversation.push({ role: "assistant", content: reply });
        appendMessage("assistant", reply);
      } else {
        appendMessage(
          "assistant",
          "I didn't get a clear response from the server."
        );
      }
    } catch (err) {
      log.removeChild(thinking);
      appendMessage(
        "assistant",
        "Network error while reaching ChavrutaGPT. Please try again."
      );
      console.error(err);
    }
  });
})();
