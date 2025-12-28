/* /scripts/gate-kavanah.js */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  function getDestFromQuery() {
    const p = new URLSearchParams(window.location.search);
    const d = (p.get("dest") || "").trim().toLowerCase();
    if (d === "chavruta") return "chavruta";
    return "231";
  }

  function formToObject(form) {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = String(v || "").trim();
    return obj;
  }

  function showError(on) {
    const el = $("#k-error");
    if (!el) return;
    el.style.display = on ? "block" : "none";
  }

  function setSavedVisible(on) {
    const el = $("#k-saved");
    if (!el) return;
    el.style.display = on ? "block" : "none";
  }

  function isFilled(form) {
    const requiredNames = ["boundary", "pace", "style", "consent"];
    for (const name of requiredNames) {
      const chosen = form.querySelector(`input[name="${name}"]:checked`);
      if (!chosen) return false;
    }
    return true;
  }

  function safeSave(payload) {
    try {
      localStorage.setItem("ln_kavanah", JSON.stringify(payload));
      localStorage.setItem("ln_kavanah_at", String(Date.now()));
    } catch (e) {
      console.warn("[gate-kavanah] localStorage failed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("#kavanah-form");
    if (!form) return;

    // Put dest into hidden input (so non-JS submit still carries it)
    const dest = getDestFromQuery();
    const destInput = $("#dest");
    if (destInput) destInput.value = dest;

    // Restore previous values if any
    try {
      const raw = localStorage.getItem("ln_kavanah");
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          ["boundary", "pace", "style", "consent"].forEach((name) => {
            const val = data[name];
            if (!val) return;
            const el = form.querySelector(`input[name="${name}"][value="${CSS.escape(val)}"]`);
            if (el) el.checked = true;
          });
          const ta = form.querySelector('textarea[name="intention"]');
          if (ta && typeof data.intention === "string") ta.value = data.intention;
        }
      }
    } catch (_) {}

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      showError(false);

      if (!isFilled(form)) {
        showError(true);
        return;
      }

      const data = formToObject(form);

      // Covenant-first detour
      if (data.consent === "read-covenant") {
        safeSave({ ...data, dest, gateIntent: "read-covenant-first" });
        window.location.href = "/pages/torah-first.html";
        return;
      }

      // Must explicitly consent=yes
      if (data.consent !== "yes") {
        showError(true);
        return;
      }

      const destination = dest === "chavruta" ? "/pages/chavruta.html" : "/pages/231-gates.html";

      safeSave({
        ...data,
        dest,
        destination,
        gateIntent: dest === "chavruta" ? "chavruta" : "231-gates",
        version: 2
      });

      setSavedVisible(true);
      window.location.href = destination;
    });
  });
})();
