// /scripts/chavruta-ui.js
// Provides:
// 1) UI renderer required by scripts/chavruta-chat.js via window.ChavrutaUI
// 2) Library -> Chavruta handoff via querystring (?q=...) + optional autosend=1
// 3) Library bundle handoff via sessionStorage key LN_CHAVRUTA_BUNDLE

(function () {
  const $ = (s) => document.querySelector(s);

  const stream = $("#chatStream");
  const form = $("#chatForm");
  const input = $("#chatInput");
  const status = $("#statusPill");

  // ---------- UI RENDERER (required by chavruta-chat.js) ----------
  function setStatus(text) {
    if (!status) return;
    status.textContent = text || "";
  }

  function add(role, text) {
    if (!stream) return;

    const row = document.createElement("div");
    row.className = `msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text || "";

    row.appendChild(bubble);
    stream.appendChild(row);
    stream.scrollTop = stream.scrollHeight;
  }

  function clear() {
    if (stream) stream.innerHTML = "";
  }

  // Expose API expected by scripts/chavruta-chat.js
  window.ChavrutaUI = {
    setStatus,
    addUser: (t) => add("user", t),
    addAssistant: (t) => add("assistant", t),
    addError: (t) => add("error", t),
    clear,
  };

  // ---------- HANDOFF / AUTOSEND HELPERS ----------
  function removeParams(...names) {
    const url = new URL(window.location.href);
    names.forEach((n) => url.searchParams.delete(n));
    const qs = url.searchParams.toString();
    window.history.replaceState({}, document.title, url.pathname + (qs ? `?${qs}` : ""));
  }

  function focusInputEnd() {
    if (!input) return;
    input.focus({ preventScroll: false });
    const v = input.value || "";
    try { input.setSelectionRange(v.length, v.length); } catch {}
  }

  function safeSubmit() {
    if (!form) return;
    form.requestSubmit
      ? form.requestSubmit()
      : form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  window.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").trim();
    const autosend = (params.get("autosend") || "").trim();
    const mode = (params.get("mode") || "").trim();

    // 1) Prefer sessionStorage bundle if present
    try {
      const bundleRaw = sessionStorage.getItem("LN_CHAVRUTA_BUNDLE");
      if (bundleRaw) {
        sessionStorage.removeItem("LN_CHAVRUTA_BUNDLE");
        const bundle = JSON.parse(bundleRaw);

        const text = (bundle?.text || "").trim();
        if (text) {
          input.value = text;
          setStatus("Loaded from Library");
          focusInputEnd();

          removeParams("q", "text", "ref", "mode");

          if (autosend === "1") {
            setStatus("Sending…");
            setTimeout(() => {
              safeSubmit();
              removeParams("autosend");
            }, 150);
          }
          return;
        }
      }
    } catch {
      // ignore
    }

    // 2) Fallback: ?q=...
    if (q) {
      input.value = q;
      setStatus("Loaded from Library");
      focusInputEnd();

      removeParams("q", "mode");

      if (autosend === "1") {
        setStatus("Sending…");
        setTimeout(() => {
          safeSubmit();
          removeParams("autosend");
        }, 150);
      }
      return;
    }

    // 3) Clean stray mode param
    if (mode) removeParams("mode");
  });
})();
