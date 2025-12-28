(() => {
  "use strict";

  const STORAGE_KEY = "luminanexus_gate_settings_v2";

  function $(sel) { return document.querySelector(sel); }
  function getRadio(name, fallback) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : fallback;
  }

  function getDestFromURL() {
    const url = new URL(window.location.href);
    const dest = (url.searchParams.get("dest") || "").toLowerCase().trim();
    if (dest === "231" || dest === "231-gates" || dest === "gates") return "231";
    return "chavruta";
  }

  function destToPath(dest) {
    if (dest === "231") return "/pages/231-gates.html";
    return "/pages/chavruta.html";
  }

  function showError(msg) {
    const el = $("#gateError");
    if (el) el.textContent = msg || "";
  }

  function hydrateDestUI(dest) {
    const destField = $("#gateDest");
    if (destField) destField.value = dest;

    const continueA = $("#btnContinueGate");
    if (continueA) continueA.setAttribute("href", destToPath(dest));
  }

  function saveSettings(dest) {
    const consent = getRadio("consent", "yes");
    const settings = {
      dest,
      boundary: getRadio("boundary", "avoid-speculation"),
      pace: getRadio("pace", "slow"),
      style: getRadio("style", "sources-first"),
      consent,
      intention: ($("#intention") && $("#intention").value || "").trim(),
      destination: destToPath(dest),
      gateIntent: dest === "231" ? "231-gates" : "chavruta",
      version: 2,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return settings;
  }

  function go(dest) {
    // Basic consent behavior: if user chose read-first, push them to Torah First instead.
    const consent = getRadio("consent", "yes");
    if (consent === "read-first") {
      showError("Please read Torah First, then return and select “Yes”. / אנא קרא תורה־תחילה ואז חזור ובחר “כן”.");
      window.location.href = "/pages/torah-first.html";
      return;
    }

    saveSettings(dest);
    window.location.href = destToPath(dest);
  }

  function wire() {
    const dest = getDestFromURL();
    hydrateDestUI(dest);

    const btnContinue = $("#btnContinueGate");
    const btnSkip = $("#btnSkipChavruta");

    if (btnContinue) {
      btnContinue.addEventListener("click", (e) => {
        e.preventDefault();
        showError("");
        go(dest);
      });
    }

    if (btnSkip) {
      btnSkip.addEventListener("click", (e) => {
        // Skip always means Chavruta, but still save the chosen kavanah.
        e.preventDefault();
        showError("");
        saveSettings("chavruta");
        window.location.href = "/pages/chavruta.html";
      });
    }
  }

  // Make sure DOM exists even with defer weirdness / header injection.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
