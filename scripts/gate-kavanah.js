/* scripts/gate-kavanah.js
   Purpose:
   - Make "Continue through the Gate" reliable (works even if JS fails).
   - Enforce Kavanah selection (HTML required) + extra logic:
     - If "read-covenant" is selected, redirect to Torah First instead.
   - Save selections to localStorage for use in 231-gates page.
*/

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  function formToObject(form) {
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) obj[k] = String(v || "").trim();
    return obj;
  }

  function setSavedVisible(on) {
    const el = $("#k-saved");
    if (!el) return;
    el.style.display = on ? "block" : "none";
  }

  function showError(on) {
    const el = $("#k-error");
    if (!el) return;
    el.style.display = on ? "block" : "none";
  }

  function isFilled(form) {
    // HTML "required" handles most, but anchor fallback / custom validation can still be helpful.
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
      // If storage fails, we still allow navigation.
      console.warn("[gate-kavanah] localStorage failed:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("#kavanah-form");
    if (!form) return;

    // Restore previous selections if present (nice UX)
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

    // If user chooses "read-covenant", nudge them to Torah First immediately
    form.addEventListener("change", (ev) => {
      const t = ev.target;
      if (t && t.name === "consent" && t.value === "read-covenant" && t.checked) {
        // Don’t auto-navigate (can be annoying). Just reveal a small message via error box.
        showError(true);
      } else {
        showError(false);
      }
    });

    form.addEventListener("submit", (ev) => {
      // Always prevent default and handle ourselves (clean + consistent)
      ev.preventDefault();
      showError(false);

      // Enforce filled
      if (!isFilled(form)) {
        showError(true);
        return;
      }

      const data = formToObject(form);

      // If they chose covenant-first, send them there and do NOT proceed
      if (data.consent === "read-covenant") {
        safeSave({ ...data, gateIntent: "read-covenant-first" });
        window.location.href = "/pages/torah-first.html";
        return;
      }

      // Require consent=yes to proceed to 231 gates
      if (data.consent !== "yes") {
        showError(true);
        return;
      }

      // Save and go
      safeSave({
        ...data,
        gateIntent: "231-gates",
        destination: "/pages/231-gates.html",
        version: 1
      });

      setSavedVisible(true);

      // Navigate
      window.location.href = "/pages/231-gates.html";
    });
  });
})();
