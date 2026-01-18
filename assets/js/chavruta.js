// assets/js/chavruta.js

(function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");

  if (!form || !input || !log) return;

  let conversation = [];

  function addMessage(role, content) {
    const div = document.createElement("div");
    div.classList.add("chat-message", role);
    div.textContent = content;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage("user", text);
    conversation.push({ role: "user", content: text });
    input.value = "";
    input.focus();

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
        addMessage(
          "assistant",
          "Sorry, something went wrong talking to ChavrutaGPT."
        );
        return;
      }

      const data = await res.json();
      const reply =
        data &&
        data.reply &&
        typeof data.reply.content === "string"
          ? data.reply.content
          : "";

      if (reply) {
        conversation.push({ role: "assistant", content: reply });
        addMessage("assistant", reply);
      } else {
        addMessage(
          "assistant",
          "I didn't receive a clear response. Please try again."
        );
      }
    } catch (err) {
      log.removeChild(thinking);
      console.error(err);
      addMessage(
        "assistant",
        "Network error while reaching ChavrutaGPT. Please try again."
      );
    }
  });
})();
