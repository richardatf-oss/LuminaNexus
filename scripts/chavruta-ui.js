// scripts/chavruta-ui.js
export const UI = (() => {
  const stream = document.getElementById("chatStream");
  const statusPill = document.getElementById("statusPill");

  function setStatus(text) {
    if (statusPill) statusPill.textContent = text;
  }

  function addMessage(who, text, role = "assistant") {
    const row = document.createElement("div");
    row.className = "msg";

    const left = document.createElement("div");
    left.className = "who";
    left.textContent = who;

    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user" : "assistant"}`;
    bubble.textContent = text;

    row.appendChild(left);
    row.appendChild(bubble);

    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function bootGreeting() {
    addMessage(
      "Chavruta",
      "Hebrew:\nשלום. הביאו פסוק אחד או שאלה אחת. נלך לאט, תורה-תחילה.\n\nEnglish:\nShalom. Bring one passage or one question. We will go slowly, Torah-first.",
      "assistant"
    );
  }

  return { addMessage, setStatus, bootGreeting };
})();
