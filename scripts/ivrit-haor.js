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
// --- Ivrit HaOr -> Chavruta handoff (localStorage) --------------------
function buildChavrutaPacket(item) {
  // item should be your selected letter/name object
  // adjust property names to match your data model
  const title = `${item.title || item.name || "Ivrit HaOr"} — ${item.label || ""}`.trim();
  const heb = item.hebrew || item.letter || "";
  const type = item.type || "";
  const gem = item.gematria != null ? item.gematria : "";
  const sound = item.sound || "";
  const translit = item.transliteration || "";
  const meaning = item.meaning || "";
  const practice = item.practice || "";

  return [
    `Ivrit HaOr — ${title}`,
    heb ? `Hebrew: ${heb}` : "",
    type ? `Type: ${type}` : "",
    gem !== "" ? `Gematria: ${gem}` : "",
    sound ? `Sound: ${sound}` : "",
    translit ? `Transliteration: ${translit}` : "",
    meaning ? `Meaning: ${meaning}` : "",
    practice ? `Practice: ${practice}` : "",
    "",
    `Chavruta request: Please respond in the selected mode (Peshat/Remez/Derash/Sod). If Hebrew is enabled, place Hebrew on separate lines (no side-by-side columns).`,
  ].filter(Boolean).join("\n");
}

function sendToChavrutaFromItem(item, { autoSend = false } = {}) {
  const packet = buildChavrutaPacket(item);

  localStorage.setItem("LN_CHAVRUTA_DRAFT", packet);
  localStorage.setItem("LN_CHAVRUTA_AUTOSEND", autoSend ? "1" : "0");

  // Navigate. Query just tells Chavruta we came from Ivrit HaOr.
  window.location.href = "/pages/chavruta.html?from=ivrit-haor";
}

// Example: wire the big "Send to Chavruta" button (top-right)
// Make sure the button has id="btnSendToChavruta" (or change id below)
const btnTopSend = document.getElementById("btnSendToChavruta");
if (btnTopSend) {
  btnTopSend.addEventListener("click", () => {
    if (!window.__ivritSelectedItem) return;
    sendToChavrutaFromItem(window.__ivritSelectedItem, { autoSend: false });
  });
}

// Example: wire the per-item button in the detail panel
// If your detail panel button already exists, give it id="btnDetailSendToChavruta"
const btnDetailSend = document.getElementById("btnDetailSendToChavruta");
if (btnDetailSend) {
  btnDetailSend.addEventListener("click", () => {
    if (!window.__ivritSelectedItem) return;
    sendToChavrutaFromItem(window.__ivritSelectedItem, { autoSend: false });
  });
}

  const DATA = Array.isArray(window.IVRIT_HAOR_DATA) ? window.IVRIT_HAOR_DATA : [];
  if (!DATA.length) console.warn("[ivrit-haor] No data found. Did you include /scripts/ivrit-haor-data.js ?");

  const state = {
    q: "",
    filter: "all",
    showHebrew: true,
    selectedKey: null,
  };

  function typeLabel(t) {
    if (t === "letters") return "Letter";
    if (t === "finals") return "Final";
    if (t === "hidden") return "Hidden Gate";
    if (t === "names") return "Name";
    return t || "Item";
  }

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
        <div class="ivh-tile-sub">${typeLabel(item.type)}</div>
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
            <div><span class="ivh-k">Type:</span> ${typeLabel(item.type)}</div>
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

  // Ensure filter options match our types
  // If your HTML filter options differ, this still works — it just filters by raw values.
  // boot
  state.selectedKey = DATA[0]?.key || null;
  renderGrid();
  renderDetail();
  console.log("[ivrit-haor] boot ok");
})();
