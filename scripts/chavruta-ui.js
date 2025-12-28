// /scripts/chavruta-ui.js
// Purpose:
// - Library -> Chavruta handoff via querystring (?q=...) + optional autosend=1
// - ALSO supports Library bundle handoff via sessionStorage key LN_CHAVRUTA_BUNDLE
//   so Chavruta receives the full sanitized EN/HE text.
// Safe: plain text only. No HTML injection. Does not assume internals of chavruta-chat.js.

(function () {
  const $ = (s) => document.querySelector(s);

  const form = $("#chatForm");
  const input = $("#chatInput");
  const status = $("#statusPill");

  function setStatus(text) {
    if (!status) return;
    status.textContent = text;
  }

  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

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
    // Trigger the existing submit handler in chavruta-chat.js
    const ev = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(ev);
  }

  function formatBundlePrompt(bundle) {
    const ref = String(bundle?.ref || "").trim();
    const en = String(bundle?.en || "").trim();
    const he = String(bundle?.he || "").trim();

    const parts = [];
    parts.push("TEXT (from Library / Sefaria):");
    if (ref) parts.push(`Reference: ${ref}`);
    parts.push("");

    if (en) {
      parts.push("ENGLISH:");
      parts.push(en);
      parts.push("");
    }

    if (he) {
      parts.push("HEBREW:");
      parts.push(he);
      parts.push("");
    }

    parts.push("QUESTIONS FOR STUDY:");
    parts.push("- (Please give 3–7 questions. Speculation must be labeled 'Speculation'.)");
    parts.push("- (Keep it Torah-first and do not invent citations.)");

    return parts.join("\n");
  }

  function tryLoadBundleFromSession() {
    try {
      const raw = sessionStorage.getItem("LN_CHAVRUTA_BUNDLE");
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      // Clear immediately to avoid repeat injection on refresh
      sessionStorage.removeItem("LN_CHAVRUTA_BUNDLE");

      // Basic validity: must have ref or some text
      const hasAnything =
        (parsed && (String(parsed.ref || "").trim() || String(parsed.en || "").trim() || String(parsed.he || "").trim()));

      if (!hasAnything) return null;
      return parsed;
    } catch {
      // If parsing fails, clear it so it doesn't loop
      try { sessionStorage.removeItem("LN_CHAVRUTA_BUNDLE"); } catch {}
      return null;
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    if (!input) return;

    const autosend = getParam("autosend"); // "1" to send immediately
    const q = getParam("q");               // ref-only fallback
    const mode = getParam("mode");         // future use

    // 1) Prefer full bundle from sessionStorage (best experience)
    const bundle = tryLoadBundleFromSession();
    if (bundle) {
      input.value = formatBundlePrompt(bundle);
      setStatus("Loaded full text from Library");
      focusInputEnd();

      // Clean q/mode params too (if present)
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

    // 2) Otherwise fall back to query param handoff (?q=Genesis 1:1)
    if (q && q.trim()) {
      input.value = q.trim();
      setStatus("Loaded from Library");
      focusInputEnd();

      // Clean q from URL so refresh doesn't keep reloading the same prompt
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

    // 3) Nothing to inject
    if (mode) removeParams("mode");
  });
})();
