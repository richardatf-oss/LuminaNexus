(() => {
  const chat = document.getElementById("chat");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");

  if (!chat || !form || !input) {
    console.warn("[chavruta-fixed] Missing required DOM elements:", {
      chat: !!chat,
      form: !!form,
      input: !!input
    });
    return;
  }

  let isThinking = false;

  function addMessage(text, sender) {
    const div = document.createElement("div");
    div.className = `message ${sender}`;
    div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isThinking) return;

    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addMessage(text, "user");

    isThinking = true;
    const thinkingEl = addMessage("…", "bot");

    try {
      const res = await fetch("/.netlify/functions/chavruta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        // if response isn't JSON
      }

      thinkingEl.remove();

      if (!res.ok) {
        addMessage(data?.error || `Server error (${res.status})`, "bot");
        return;
      }

      addMessage(data?.reply || "I’m here. Say more.", "bot");
    } catch (err) {
      thinkingEl.remove();
      addMessage("Network error. Try again.", "bot");
      console.error(err);
    } finally {
      isThinking = false;
    }
  });
})();
