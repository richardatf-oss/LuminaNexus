(function () {
  const stream = document.getElementById("chat-stream");

  function addMessage(role, text) {
    if (!stream) return;

    const div = document.createElement("div");
    div.className = `message ${role}`;
    div.textContent = text;
    stream.appendChild(div);

    stream.scrollTop = stream.scrollHeight;
  }

  function clear() {
    if (stream) stream.innerHTML = "";
  }

  function status(text) {
    console.log("[Chavruta]", text);
  }

  window.ChavrutaUI = {
    addUser: (text) => addMessage("user", text),
    addAssistant: (text) => addMessage("assistant", text),
    addError: (text) => addMessage("error", text),
    clear,
    status
  };
})();
