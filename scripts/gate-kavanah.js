// /scripts/gate-kavanah.js
// Orientation routing (authoritative) — Continue -> 231 Gates
// If this file is not loading, the inline fallback in the page will still work.

(() => {
  console.log("[gate-kavanah] loaded");

  const $ = (s) => document.querySelector(s);

  const btnContinue = $("#continueGate");
  const btnSkip = $("#skipChavruta");
  const status = $("#saveStatus");

  if (!btnContinue) {
    console.warn("[gate-kavanah] Missing #continueGate. Check orientation/index.html button id.");
    return;
  }

  function getCheckedValue(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function saveKavanah() {
    const noteEl =
      $("#kavanahNote") ||
      document.querySelector('textarea[name="note"]') ||
      document.querySelector("textarea");

    const payload = {
      boundary: getCheckedValue("boundary"),
      pace: getCheckedValue("pace"),
      style: getCheckedValue("style"),
      consent: getCheckedValue("consent"),
      note: (noteEl?.value || "").trim(),
      savedAt: new Date().toISOString(),
    };

    sessionStorage.setItem("kavanah", JSON.stringify(payload));
    if (status) status.textContent = "Saved.";
    return payload;
  }

  function go(url) {
    console.log("[gate-kavanah] routing ->", url);
    window.location.assign(url);
  }

  btnContinue.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();

      const k = saveKavanah();

      if (k.consent === "read_covenant_first") {
        if (status) status.textContent = "Saved. Opening Torah First…";
        go("/pages/torah-first.html");
        return;
      }

      if (status) status.textContent = "Saved. Entering the 231 Gates…";
      go("/pages/231-gates.html");
    },
    { capture: true }
  );

  if (btnSkip) {
    btnSkip.addEventListener(
      "click",
      () => {
        saveKavanah();
        if (status) status.textContent = "Saved.";
      },
      { capture: true }
    );
  }
})();
