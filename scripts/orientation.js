// /scripts/orientation.js
(function () {
  const $ = (s) => document.querySelector(s);

  function checked(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function getPayload() {
    return {
      boundary: checked("boundary"),
      pace: checked("pace"),
      style: checked("style"),
      consent: checked("consent"),
      note: ($("#kavanahNote")?.value || "").trim(),
      savedAt: new Date().toISOString(),
    };
  }

  function toast(msg) {
    const t = $("#gateToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      t.classList.remove("show");
      t.textContent = "";
    }, 3500);
  }

  function scrollToKavanah() {
    const card = $("#kavanahCard");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function requireConsentOrRedirect(targetUrl) {
    const consent = checked("consent");
    const consentBlock = $("#consentBlock");

    // Save always
    try {
      sessionStorage.setItem("kavanah", JSON.stringify(getPayload()));
      const st = $("#saveStatus");
      if (st) st.textContent = "Saved.";
    } catch {}

    // If covenant-first, route there
    if (consent === "read_covenant_first") {
      window.location.href = "/pages/torah-first.html";
      return;
    }

    // Must accept “yes” to proceed to gates
    if (consent !== "yes") {
      if (consentBlock) {
        consentBlock.classList.add("needs-consent");
        setTimeout(() => consentBlock.classList.remove("needs-consent"), 2500);
      }
      toast("Please accept the Torah-first consent (Yes / כן) before entering the 231 Gates.");
      scrollToKavanah();
      return;
    }

    window.location.href = targetUrl;
  }

  function bindClickSuperSafely(id, handler) {
    const el = $(id);
    if (!el) return;

    // Normal click
    el.addEventListener("click", (e) => {
      e.preventDefault();
      handler();
    });

    // Mobile + overlay oddities: fire on pointerdown/touchstart too
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handler();
    }, { passive: false });

    el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handler();
    }, { passive: false });

    // Capture-phase fallback: if some layer interferes with bubbling
    document.addEventListener("click", (e) => {
      const hit = e.target && e.target.closest && e.target.closest(id);
      if (hit) {
        e.preventDefault();
        handler();
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindClickSuperSafely("#continueGate", () => requireConsentOrRedirect("/pages/231-gates.html"));
    bindClickSuperSafely("#heroGatesBtn", () => requireConsentOrRedirect("/pages/231-gates.html"));
  });
})();
