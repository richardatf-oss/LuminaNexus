(() => {
  "use strict";

  const STORAGE_KEY = "luminanexus_gate_settings_v2";

  const LETTERS = [
    { he: "א", en: "aleph" },
    { he: "ב", en: "bet" },
    { he: "ג", en: "gimel" },
    { he: "ד", en: "dalet" },
    { he: "ה", en: "he" },
    { he: "ו", en: "vav" },
    { he: "ז", en: "zayin" },
    { he: "ח", en: "chet" },
    { he: "ט", en: "tet" },
    { he: "י", en: "yod" },
    { he: "כ", en: "kaf" },
    { he: "ל", en: "lamed" },
    { he: "מ", en: "mem" },
    { he: "נ", en: "nun" },
    { he: "ס", en: "samekh" },
    { he: "ע", en: "ayin" },
    { he: "פ", en: "pe" },
    { he: "צ", en: "tsadi" },
    { he: "ק", en: "kuf" },
    { he: "ר", en: "resh" },
    { he: "ש", en: "shin" },
    { he: "ת", en: "tav" }
  ];

  function $(sel) { return document.querySelector(sel); }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function requireKavanahOrRedirect(settings) {
    // If missing settings, or settings are not for dest=231, require kavanah.
    const ok = settings && (settings.dest === "231" || settings.gateIntent === "231-gates");
    if (!ok) {
      const req = $("#gateRequire");
      const app = $("#gateApp");
      if (req) req.style.display = "block";
      if (app) app.style.display = "none";
      return false;
    }
    return true;
  }

  function buildPairs() {
    // 22 choose 2 = 231
    const pairs = [];
    for (let i = 0; i < LETTERS.length; i++) {
      for (let j = i + 1; j < LETTERS.length; j++) {
        const a = LETTERS[i];
        const b = LETTERS[j];
        pairs.push({
          a, b,
          he: `${a.he}${b.he}`,
          // search helpers
          search: `${a.he}${b.he} ${a.en} ${b.en} ${a.en}-${b.en}`.toLowerCase()
        });
      }
    }
    return pairs;
  }

  function renderSettings(settings) {
    const pre = $("#gateSettings");
    if (!pre) return;
    pre.textContent = JSON.stringify(settings, null, 2);
  }

  function renderGrid(pairs) {
    const grid = $("#gateGrid");
    if (!grid) return;

    grid.innerHTML = "";

    pairs.forEach((p) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill";
      btn.style.cursor = "pointer";
      btn.style.border = "1px solid rgba(255,255,255,.14)";
      btn.style.background = "rgba(255,255,255,.06)";
      btn.style.padding = "8px 12px";
      btn.style.borderRadius = "999px";
      btn.style.fontWeight = "600";
      btn.textContent = p.he;

      btn.addEventListener("click", () => openGate(p));
      grid.appendChild(btn);
    });
  }

  function setCount(shown, total) {
    const el = $("#gateCount");
    if (!el) return;
    el.textContent = `${shown} / ${total} gates`;
  }

  function openGate(pair) {
    const title = $("#selectedTitle");
    const body = $("#selectedBody");
    const toChavruta = $("#selectedToChavruta");

    const label = `${pair.he} — ${pair.a.en} + ${pair.b.en}`;
    if (title) title.textContent = label;

    if (body) {
      body.innerHTML = `
        <div style="display:grid; gap:10px;">
          <div>
            <div class="muted">Letters</div>
            <div style="font-size:22px; font-weight:700; margin-top:4px;">${pair.a.he} + ${pair.b.he}</div>
            <div class="muted" style="margin-top:4px;">${pair.a.en} + ${pair.b.en}</div>
          </div>
          <div>
            <div class="muted">Torah-first use</div>
            <div style="margin-top:4px;">
              Choose a passage, read peshat slowly, then ask: “What boundary does this gate protect?”
              (We’ll map themes + passages next.)
            </div>
          </div>
        </div>
      `;
    }

    // Pass gate pair into Chavruta via query param (safe even if you ignore it there)
    if (toChavruta) {
      const q = encodeURIComponent(pair.he);
      toChavruta.setAttribute("href", `/pages/chavruta.html?gate=${q}`);
    }
  }

  function wireSearch(allPairs) {
    const input = $("#gateSearch");
    if (!input) return;

    const total = allPairs.length;
    setCount(total, total);

    input.addEventListener("input", () => {
      const q = (input.value || "").toLowerCase().trim();
      if (!q) {
        renderGrid(allPairs);
        setCount(total, total);
        return;
      }
      const filtered = allPairs.filter(p => p.search.includes(q) || p.he.includes(q));
      renderGrid(filtered);
      setCount(filtered.length, total);
    });
  }

  function init() {
    const settings = loadSettings();

    const ok = requireKavanahOrRedirect(settings);
    if (!ok) return;

    // show app
    const app = $("#gateApp");
    const req = $("#gateRequire");
    if (app) app.style.display = "block";
    if (req) req.style.display = "none";

    renderSettings(settings);

    const pairs = buildPairs();
    renderGrid(pairs);
    wireSearch(pairs);
    setCount(pairs.length, pairs.length);

    // auto-select the first gate so the page feels “alive”
    if (pairs[0]) openGate(pairs[0]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
