// scripts/gate-kavanah.js
// Saves Gate kavanah se// /scripts/gate-kavanah.js
// Orientation routing (authoritative).
// This file FORCE-ROUTES:
// - Continue through the Gate -> /pages/231-gates.html
// - If "read covenant first" selected -> /pages/torah-first.html
// - Skip -> Chavruta (normal link), but still saves kavanah

(() => {
  const $ = (s) => document.querySelector(s);

  const btnContinue = $("#continueGate");
  const btnSkip = $("#skipChavruta");
  const status = $("#saveStatus");

  if (!btnContinue) {
    console.warn("[gate-kavanah] Missing #continueGate on this page.");
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
    window.location.assign(url);
  }

  // Capture-phase ensures we beat any older click handlers.
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
lections locally and routes into Chavruta.

(function () {
  const KEY = "luminanexus_gate_kavanah_v1";

  const $ = (sel) => document.querySelector(sel);

  const getRadioValue = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : "";
  };

  const save = (payload) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch {}
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const restoreRadios = (name, value) => {
    if (!value) return;
    const el = document.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
    if (el) el.checked = true;
  };

  document.addEventListener("DOMContentLoaded", () => {
    // Restore prior selections
    const prior = load();
    if (prior) {
      restoreRadios("boundary", prior.boundary);
      restoreRadios("pace", prior.pace);
      restoreRadios("style", prior.style);
      restoreRadios("consent", prior.consent);
      const note = $("#kavanah-note");
      if (note && prior.note) note.value = prior.note;
    }

    const form = $("#gate-form");
    const btn = $("#continue-btn");
    const msg = $("#gate-msg");

    const validate = () => {
      const boundary = getRadioValue("boundary");
      const pace = getRadioValue("pace");
      const style = getRadioValue("style");
      const consent = getRadioValue("consent");
      const ok = boundary && pace && style && consent === "yes";
      if (btn) btn.disabled = !ok;
      return ok;
    };

    form?.addEventListener("change", validate);
    $("#kavanah-note")?.addEventListener("input", validate);

    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      const boundary = getRadioValue("boundary");
      const pace = getRadioValue("pace");
      const style = getRadioValue("style");
      const consent = getRadioValue("consent");
      const note = ($("#kavanah-note")?.value || "").trim();

      if (!(boundary && pace && style && consent === "yes")) {
        if (msg) msg.textContent = "Please complete the Gate with consent to proceed.";
        return;
      }

      const payload = {
        boundary,
        pace,
        style,
        consent,
        note,
        savedAt: new Date().toISOString()
      };

      save(payload);

      if (msg) msg.textContent = "Saved. Entering Chavruta…";

      // Use clean URL if redirects are installed; fallback to .html
      window.location.href = "/pages/chavruta.html";
    });

    validate();
  });
})();
