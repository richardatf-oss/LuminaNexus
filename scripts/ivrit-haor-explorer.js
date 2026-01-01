// /scripts/ivrit-haor-explorer.js
(() => {
  const FAV_KEY = "ivh_favorites_v1";

  // ====== DATA SOURCE ======
  // If you already have a data file/array, wire it here.
  // Supported options:
  // 1) window.IVRIT_HAOR_DATA (array of items)
  // 2) fetch("/data/ivrit-haor.json") (if you have it)
  //
  // Item shape expected:
  // { key, name, hebrew, type, sound, gematria, meaning, practice }
  //
  // We'll try window.IVRIT_HAOR_DATA first; if missing, we fallback to a tiny starter set.
  const STARTER = [
    {
      key: "alef",
      name: "Aleph",
      hebrew: "א",
      type: "Letter",
      sound: "silent / glottal stop (varies)",
      gematria: 1,
      meaning: "Oneness, origin, breath-before-speech",
      practice: "Breathe in silence for 3 breaths; then speak one honest sentence.",
    },
    {
      key: "alef-olam",
      name: "Alef Olam",
      hebrew: "אלף עולם",
      type: "Hidden Gate",
      sound: "ah-LEF oh-LAHM",
      gematria: "",
      meaning: "A hidden gate of humility and restraint: learning that returns to simple service.",
      practice: "Whisper: ‘I am here to learn.’ Then sit quietly for 20 seconds.",
    },
    {
      key: "ariir",
      name: "Ari’ir",
      hebrew: "אריר",
      type: "Name",
      sound: "ah-REE-eer",
      gematria: "",
      meaning: "Sacred name (meditation). Use with humility and clean intention.",
      practice: "Chant softly 7 times; then sit in quiet for 20 seconds.",
    },
  ];

  async function loadData() {
    if (Array.isArray(window.IVRIT_HAOR_DATA) && window.IVRIT_HAOR_DATA.length) {
      return window.IVRIT_HAOR_DATA;
    }
    // Optional JSON if you have it
    try {
      const r = await fetch("/data/ivrit-haor.json", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j.length) return j;
      }
    } catch {}
    return STARTER;
  }

  // ====== FAVS ======
  function loadFavs() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function saveFavs(favs) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
    } catch {}
  }

  // ====== UI MOUNT ======
  function findExplorerCard() {
    // Prefer a specific mount if you add one:
    const explicit = document.getElementById("ivhExplorerMount");
    if (explicit) return explicit;

    // Otherwise mount inside the first ".card" after the hero on ivrit-haor page
    const cards = Array.from(document.querySelectorAll("main .card"));
    if (cards.length) return cards[0];

    // Fallback: main wrap
    return document.querySelector("main .wrap") || document.body;
  }

  function el(tag, className, html) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function safeText(s) {
    return String(s ?? "").trim();
  }

  function normalizeKey(x, idx) {
    const k = safeText(x.key) || `${safeText(x.name).toLowerCase().replace(/\s+/g, "-")}-${idx}`;
    return k;
  }

  function latinFirstLetter(name) {
    const s = safeText(name);
    const m = s.match(/[A-Za-z]/);
    return m ? m[0].toUpperCase() : "";
  }

  function hebFirstLetter(h) {
    const s = safeText(h);
    // first Hebrew letter char
    const m = s.match(/[\u0590-\u05FF]/);
    return m ? m[0] : "";
  }

  // ====== APP STATE ======
  const state = {
    data: [],
    query: "",
    type: "All",
    showHebrew: true,
    favs: loadFavs(),
    favOnly: false,
    selectedKey: "",
  };

  // ====== RENDER ======
  let root, gridEl, detailEl, qInput, typeSel, showHebToggle, favBtn;

  function buildUI(mount) {
    root = el("section", "");
    root.id = "ivhExplorer";

    // Header line (matches your existing tone)
    const h = el("div", "card-tag", `MODULE · <span class="hebrew-inline">מודול</span>`);
    const title = el("h2", "", "Ivrit HaOr Explorer");

    const topbar = el("div", "ivh-topbar");

    // Controls row
    const controlsRow = el("div", "ivh-row");
    const left = el("div", "ivh-left");
    const right = el("div", "ivh-right");

    qInput = el("input", "ivh-input");
    qInput.type = "search";
    qInput.placeholder = "Search letter or name…";
    qInput.addEventListener("input", () => {
      state.query = qInput.value || "";
      renderGrid();
      renderDetail();
    });

    typeSel = el("select", "ivh-select");
    [
      "All",
      "Letter",
      "Final",
      "Name",
      "Hidden Gate",
    ].forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      typeSel.appendChild(o);
    });
    typeSel.addEventListener("change", () => {
      state.type = typeSel.value;
      renderGrid();
      renderDetail();
    });

    const hebLabel = el("label", "ivh-toggle");
    showHebToggle = document.createElement("input");
    showHebToggle.type = "checkbox";
    showHebToggle.checked = true;
    showHebToggle.addEventListener("change", () => {
      state.showHebrew = !!showHebToggle.checked;
      renderGrid();
      renderDetail();
    });
    hebLabel.appendChild(showHebToggle);
    hebLabel.appendChild(document.createTextNode(" Show Hebrew"));

    favBtn = el("button", "ivh-fav-btn", "★ Favorites");
    favBtn.type = "button";
    favBtn.addEventListener("click", () => {
      state.favOnly = !state.favOnly;
      favBtn.classList.toggle("is-on", state.favOnly);
      renderGrid();
      renderDetail();
    });

    left.appendChild(qInput);
    left.appendChild(typeSel);
    left.appendChild(hebLabel);
    left.appendChild(favBtn);

    controlsRow.appendChild(left);
    controlsRow.appendChild(right);

    // Jump bars row
    const jumpRow = el("div", "ivh-row");
    const jumpLeft = el("div", "ivh-left");
    const jumpRight = el("div", "ivh-right");

    const az = makeJumpBar("A–Z", "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), (ch) => jumpLatin(ch));
    const heb = makeJumpBar("א–ת", ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל","מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"], (ch) => jumpHeb(ch));

    jumpLeft.appendChild(az);
    jumpRight.appendChild(heb);
    jumpRow.appendChild(jumpLeft);
    jumpRow.appendChild(jumpRight);

    topbar.appendChild(controlsRow);
    topbar.appendChild(jumpRow);

    // Layout
    const layout = el("div", "ivh-layout");
    gridEl = el("div", "ivh-grid");
    detailEl = el("div", "ivh-detail");

    layout.appendChild(gridEl);
    layout.appendChild(detailEl);

    root.appendChild(h);
    root.appendChild(title);
    root.appendChild(topbar);
    root.appendChild(layout);

    // Mount into the existing card (preserve your look)
    // If mount is already the card, append; otherwise just append to mount.
    mount.appendChild(root);
  }

  function makeJumpBar(label, chars, onClick) {
    const bar = el("div", "ivh-jumpbar");
    const l = el("span", "ivh-jumplabel", label);
    bar.appendChild(l);
    chars.forEach((ch) => {
      const b = el("button", "ivh-jump", ch);
      b.type = "button";
      b.addEventListener("click", () => onClick(ch));
      bar.appendChild(b);
    });
    return bar;
  }

  function filteredList() {
    const q = safeText(state.query).toLowerCase();
    return state.data
      .filter((x) => {
        if (state.type !== "All" && safeText(x.type) !== state.type) return false;
        if (state.favOnly && !state.favs.has(x.key)) return false;
        if (!q) return true;
        const blob = [
          x.key, x.name, x.hebrew, x.type, x.sound, x.meaning, x.practice
        ].map(safeText).join(" ").toLowerCase();
        return blob.includes(q);
      });
  }

  function renderGrid() {
    if (!gridEl) return;
    gridEl.innerHTML = "";

    const list = filteredList();

    if (!list.length) {
      gridEl.appendChild(el("div", "", "No results."));
      return;
    }

    list.forEach((item) => {
      const tile = el("div", "ivh-tile");
      tile.dataset.key = item.key;
      if (item.key === state.selectedKey) tile.classList.add("is-active");

      const star = el("button", "ivh-star", state.favs.has(item.key) ? "★" : "☆");
      star.type = "button";
      if (state.favs.has(item.key)) star.classList.add("is-on");

      star.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.favs.has(item.key)) state.favs.delete(item.key);
        else state.favs.add(item.key);
        saveFavs(state.favs);
        renderGrid();
        renderDetail();
      });

      const heb = state.showHebrew ? el("div", "ivh-hebrew", safeText(item.hebrew)) : null;
      const name = el("div", "ivh-name", safeText(item.name) || "(untitled)");
      const meta = el("div", "ivh-meta", `${safeText(item.type) || "Item"}${item.gematria !== "" && item.gematria !== undefined ? ` · Gematria: ${item.gematria}` : ""}`);

      if (heb) tile.appendChild(heb);
      tile.appendChild(name);
      tile.appendChild(meta);
      tile.appendChild(star);

      tile.addEventListener("click", () => {
        state.selectedKey = item.key;
        renderGrid();
        renderDetail();
      });

      gridEl.appendChild(tile);
    });

    // Ensure something is selected
    if (!state.selectedKey && list[0]) {
      state.selectedKey = list[0].key;
      renderGrid();
      renderDetail();
    }
  }

  function renderDetail() {
    if (!detailEl) return;

    const list = filteredList();
    const item = list.find(x => x.key === state.selectedKey) || list[0];

    if (!item) {
      detailEl.innerHTML = "<p>No selection.</p>";
      return;
    }

    const title = safeText(item.name) || "Selection";
    const heb = safeText(item.hebrew);
    const sound = safeText(item.sound);
    const type = safeText(item.type);
    const gem = item.gematria !== "" && item.gematria !== undefined ? String(item.gematria) : "";
    const meaning = safeText(item.meaning);
    const practice = safeText(item.practice);

    detailEl.innerHTML = "";

    const h3 = el("h3", "", title);
    const chip = el("div", "ivh-chip", `${type || "Item"}${gem ? ` · Gematria: ${gem}` : ""}`);

    if (state.showHebrew && heb) {
      const hebBig = el("div", "", `<div style="font-size:2rem; margin: 6px 0 6px;">${heb}</div>`);
      detailEl.appendChild(hebBig);
    }

    detailEl.appendChild(h3);
    detailEl.appendChild(chip);

    if (sound) detailEl.appendChild(el("p", "", `<strong>Sound:</strong> ${sound}`));

    const actions = el("div", "ivh-actions");

    const btnPlay = el("button", "ivh-btn", "Play pronunciation");
    btnPlay.type = "button";
    btnPlay.addEventListener("click", () => {
      playPronunciation(title, heb, sound);
    });

    const btnCopy = el("button", "ivh-btn", "Copy");
    btnCopy.type = "button";
    btnCopy.addEventListener("click", async () => {
      const txt =
        `${title}\n` +
        `${heb ? `Hebrew: ${heb}\n` : ""}` +
        `${sound ? `Sound: ${sound}\n` : ""}` +
        `${gem ? `Gematria: ${gem}\n` : ""}` +
        `${meaning ? `Meaning: ${meaning}\n` : ""}` +
        `${practice ? `Practice: ${practice}\n` : ""}`;
      try { await navigator.clipboard.writeText(txt); } catch {}
    });

    const btnSend = el("button", "ivh-btn", "Send to Chavruta");
    btnSend.type = "button";
    btnSend.addEventListener("click", () => {
      const prompt =
        `Ivrit HaOr — help me study:\n` +
        `Name: ${title}\n` +
        `${heb ? `Hebrew: ${heb}\n` : ""}` +
        `${sound ? `Sound: ${sound}\n` : ""}` +
        `${gem ? `Gematria: ${gem}\n` : ""}` +
        `\nPlease give: (1) peshat meaning, (2) one classical note if appropriate, (3) 3–7 questions.\n` +
        `Keep it Torah-first and clearly label speculation.`;

      window.location.href = `/pages/chavruta?prefill=${encodeURIComponent(prompt)}`;
    });

    actions.appendChild(btnPlay);
    actions.appendChild(btnCopy);
    actions.appendChild(btnSend);

    detailEl.appendChild(actions);

    if (meaning) {
      detailEl.appendChild(el("div", "", `<strong>Meaning</strong><p>${meaning}</p>`));
    }
    if (practice) {
      detailEl.appendChild(el("div", "", `<strong>Practice</strong><p>${practice}</p>`));
    }
  }

  function jumpLatin(letter) {
    const list = filteredList();
    const found = list.find(x => latinFirstLetter(x.name) === letter);
    if (!found) return;
    state.selectedKey = found.key;
    renderGrid();
    renderDetail();
    scrollToKey(found.key);
  }

  function jumpHeb(h) {
    const list = filteredList();
    const found = list.find(x => hebFirstLetter(x.hebrew) === h);
    if (!found) return;
    state.selectedKey = found.key;
    renderGrid();
    renderDetail();
    scrollToKey(found.key);
  }

  function scrollToKey(key) {
    setTimeout(() => {
      const node = gridEl?.querySelector(`[data-key="${CSS.escape(key)}"]`);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  // Minimal, safe pronunciation: uses SpeechSynthesis if available
  function playPronunciation(name, hebrew, sound) {
    try {
      const txt = sound || hebrew || name;
      if (!txt) return;
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance(txt);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // ====== BOOT ======
  document.addEventListener("DOMContentLoaded", async () => {
    const mount = findExplorerCard();
    buildUI(mount);

    const data = await loadData();
    state.data = data.map((x, i) => ({ ...x, key: normalizeKey(x, i) }));

    // choose a default selection
    state.selectedKey = state.data[0]?.key || "";

    renderGrid();
    renderDetail();
    console.log("[ivrit-haor-explorer] boot ok");
  });
})();
