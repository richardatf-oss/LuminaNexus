// assets/js/chavruta.js

(function () {
  // --- Nav toggle (same pattern as index) ---
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobileNav");

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      mobileNav.classList.toggle("is-open");
    });
  }

  // --- Chavruta chat wiring ---
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

  // Enter submits, Shift+Enter creates a new line
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit(); // triggers the submit handler below
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
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

      const data = await res.json();
      log.removeChild(thinking);

      const reply =
        (data && data.reply) ||
        "I’m here with you, but something went wrong talking to the server.";

      addMessage("assistant", reply);
      conversation.push({ role: "assistant", content: reply });
    } catch (err) {
      console.error(err);
      log.removeChild(thinking);
      addMessage(
        "system",
        "Sorry, there was an error talking to your chavruta. Please try again in a moment."
      );
    }
  });
})();
