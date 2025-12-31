// /scripts/ivrit-haor.js
(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    grid: $("ivhGrid"),
    detail: $("ivhDetail"),
    search: $("ivhSearch"),
    filter: $("ivhFilter"),
    showHebrew: $("ivhHebrewToggle"),
  };

  if (!els.grid || !els.detail || !els.search || !els.filter || !els.showHebrew) {
    console.error("[ivrit-haor] missing required elements");
    return;
  }

  // Minimal starter dataset (safe). Extend this list freely.
  // Add audio files later: /assets/audio/aleph.mp3 etc.
  const DATA = [
    {
      type: "letter",
      key: "alef",
      heb: "א",
      name: "Aleph",
      translit: "ʾAlef",
      sound: "silent / glottal stop (varies)",
      gematria: 1,
      meaning: "Oneness, origin, breath-before-speech",
      practice: "Breathe in silence for 3 breaths; then speak one honest sentence.",
      audio: "/assets/audio/alef.mp3",
    },
    {
      type: "letter",
      key: "bet",
      heb: "ב",
      name: "Bet",
      translit: "Bet / Vet",
      sound: "b (with dagesh) / v (without)",
      gematria: 2,
      meaning: "House, within-ness, blessing through container",
      practice: "Name one boundary that protects what you love.",
      audio: "/assets/audio/bet.mp3",
    },
    {
      type: "letter",
      key: "gimel",
      heb: "ג",
      name: "Gimel",
      translit: "Gimel",
      sound: "g",
      gematria: 3,
      meaning: "Movement, giving, the step toward the other",
      practice: "Do one small act of giving today without announcing it.",
      audio: "/assets/audio/gimel.mp3",
    },
    {
      type: "hidden",
      key: "alef-olam",
      heb: "אלף עולם",
      name: "Alef Olam (Hidden Gate)",
      translit: "Alef Olam",
      sound: "a-lef o-lam",
      gematria: null,
      meaning: "The hidden continuity of Oneness through worlds",
      practice: "Hold stillness above the head for 10 seconds; return to the breath.",
      audio: "/assets/audio/alef-olam.mp3",
    },
    {
      type: "names",
      key: "ariir",
      heb: "אריר",
      name: "Ari’ir",
      translit: "Ari’ir",
      sound: "ah-REE-eer",
      gematria: null,
      meaning: "Sacred name (app: meditations)",
      practice: "Chant softly 7 times; then sit in quiet for 20 seconds.",
      audio: "/assets/audio/ariir.mp3",
    },
  ];

  const state = {
    q: "",
    filter: "all",
    showHebrew: true,
    selectedKey: null,
  };

  function matches(item) {
    const q = state.q.trim().toLowerCase();
    if (state.filter !== "all" && item.type !== state.filter) return false;
    if (!q) return true;

    const hay = [
      item.key,
      item.name,
      item.translit,
      item.heb,
      item.meaning,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  }

  function tileLabel(item) {
    const h = state.showHebrew ? `<div class="ivh-tile-heb">${item.heb || ""}</div>` : "";
    return `
      <button class="ivh-tile ${state.selectedKey === item.key ? "is-active" : ""}" type="button" data-key="${item.key}">
        ${h}
        <div class="ivh-tile-name">${item.name}</div>
        <div class="ivh-tile-sub">${item.type === "letter" ? "Letter" : item.type === "hidden" ? "Hidden Gate" : "Name"}</div>
      </button>
    `;
  }

  function renderGrid() {
    const items = DATA.filter(matches);
    els.grid.innerHTML = items.map(tileLabel).join("") || `<div class="ivh-muted">No matches.</div>`;

    els.grid.querySelectorAll(".ivh-tile").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedKey = btn.dataset.key;
        renderGrid();
        renderDetail();
      });
    });
  }

  function renderDetail() {
    const item = DATA.find((x) => x.key === state.selectedKey);
    if (!item) {
      els.detail.innerHTML = `
        <div class="ivh-empty">
          <div class="ivh-empty-mark">◈</div>
          <h3>Select a letter</h3>
          <p>Choose a tile on the left. You’ll get pronunciation, meaning, gematria, and a short practice.</p>
        </div>
      `;
      return;
    }

    const heb = state.showHebrew && item.heb ? `<div class="ivh-big-heb">${item.heb}</div>` : "";
    const gem = item.gematria != null ? `<div><span class="ivh-k">Gematria:</span> ${item.gematria}</div>` : "";

    const audioBtn = item.audio
      ? `<button id="ivhPlay" class="ivh-btn" type="button">Play pronunciation</button>`
      : "";

    els.detail.innerHTML = `
      <div class="ivh-detail-head">
        ${heb}
        <div>
          <h3 class="ivh-title">${item.name}</h3>
          <div class="ivh-sub">${item.translit || ""}</div>
          <div class="ivh-meta">
            <div><span class="ivh-k">Sound:</span> ${item.sound || "—"}</div>
            ${gem}
            <div><span class="ivh-k">Type:</span> ${item.type}</div>
          </div>
          <div class="ivh-actions">
            ${audioBtn}
            <button id="ivhCopy" class="ivh-btn ghost" type="button">Copy</button>
          </div>
        </div>
      </div>

      <div class="ivh-panels">
        <div class="ivh-panel">
          <div class="ivh-panel-title">Meaning</div>
          <div class="ivh-panel-body">${item.meaning || "—"}</div>
        </div>
        <div class="ivh-panel">
          <div class="ivh-panel-title">Practice</div>
          <div class="ivh-panel-body">${item.practice || "—"}</div>
        </div>
      </div>
    `;

    const playBtn = $("ivhPlay");
    if (playBtn && item.audio) {
      playBtn.addEventListener("click", async () => {
        try {
          const a = new Audio(item.audio);
          await a.play();
        } catch (e) {
          alert("Audio not found yet. Add the file at: " + item.audio);
        }
      });
    }

    const copyBtn = $("ivhCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const text = [
          item.heb ? `${item.heb} — ${item.name}` : item.name,
          item.translit ? `Translit: ${item.translit}` : "",
          item.sound ? `Sound: ${item.sound}` : "",
          item.gematria != null ? `Gematria: ${item.gematria}` : "",
          item.meaning ? `Meaning: ${item.meaning}` : "",
          item.practice ? `Practice: ${item.practice}` : "",
        ].filter(Boolean).join("\n");

        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied ✓";
          setTimeout(() => (copyBtn.textContent = "Copy"), 900);
        } catch {
          alert(text);
        }
      });
    }
  }

  // wiring
  els.search.addEventListener("input", (e) => {
    state.q = e.target.value || "";
    renderGrid();
  });

  els.filter.addEventListener("change", (e) => {
    state.filter = e.target.value;
    renderGrid();
    renderDetail();
  });

  els.showHebrew.addEventListener("change", (e) => {
    state.showHebrew = !!e.target.checked;
    renderGrid();
    renderDetail();
  });

  // boot
  state.selectedKey = "alef";
  renderGrid();
  renderDetail();
  console.log("[ivrit-haor] boot ok");
})();
