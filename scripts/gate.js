// /scripts/gate.js
// 231 Gates module (dynamic):
// - Loads JSON at runtime (no static gates file)
// - Generates 231 gates in memory
// - Maps gate -> theme via deterministic hybrid (families -> candidates, then numeric tie-breaker)
// - Picks Torah ref from the mapped theme bucket
// - Fetches English+Hebrew from Sefaria (English shown first)
// - Supports "Next in Theme" cycling (per-theme cursor stored in sessionStorage)
// - Sends gate+theme+ref to Chavruta via ?q=

// -------------------------
// REQUIRED ELEMENT IDS in your gate page HTML
// -------------------------
// gatesList        (container for 231 buttons)
// gateSearch       (input search)
// btnRandom        (random gate)
// btnNextTheme     (next in theme)
// btnSendChavruta  (send to chavruta)
// selectedGate     (text)
// selectedTheme    (text)
// selectedRef      (text)
// textEn           (pre/div for english)
// textHe           (pre/div for hebrew)
// readerStatus     (status pill)
// -------------------------

(() => {
  const PATHS = {
    letters: "/data/letters.json",
    themes: "/data/themes.json",
    buckets: "/data/theme_buckets_torah.json",
  };

  const SEFARIA = {
    base: "https://www.sefaria.org/api/texts/",
    params: "?context=0&commentary=0&pad=0&wrapLinks=0&lang=bi",
  };

  const $ = (s) => document.querySelector(s);

  const elList = $("#gatesList");
  const elSearch = $("#gateSearch");

  const btnRandom = $("#btnRandom");
  const btnNextTheme = $("#btnNextTheme");
  const btnSend = $("#btnSendChavruta");

  const elSelectedGate = $("#selectedGate");
  const elSelectedTheme = $("#selectedTheme");
  const elSelectedRef = $("#selectedRef");

  const elEn = $("#textEn");
  const elHe = $("#textHe");
  const elStatus = $("#readerStatus");

  // Defensive: if page wiring is incomplete, fail loudly but safely.
  const required = [
    elList, elSearch, btnRandom, btnNextTheme, btnSend,
    elSelectedGate, elSelectedTheme, elSelectedRef,
    elEn, elHe, elStatus
  ];
  if (required.some(x => !x)) {
    console.error("[gate] Missing required HTML element IDs. See header comment in /scripts/gate.js");
    return;
  }

  // Small in-memory cache for JSON and Sefaria responses.
  const cache = {
    json: new Map(),
    sefaria: new Map(),
  };

  function setStatus(text, kind = "ready") {
    elStatus.textContent = text;
    elStatus.dataset.kind = kind; // style hook
  }

  async function loadJson(url) {
    if (cache.json.has(url)) return cache.json.get(url);
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!resp.ok) throw new Error(`Failed to load ${url} (HTTP ${resp.status})`);
    const data = await resp.json();
    cache.json.set(url, data);
    return data;
  }

  function flattenToText(x) {
    if (!x) return "";
    if (typeof x === "string") return x.trim();
    if (Array.isArray(x)) return x.flat(Infinity).filter(v => typeof v === "string" && v.trim()).join("\n").trim();
    return "";
  }

  async function fetchSefaria(ref) {
    const key = ref;
    if (cache.sefaria.has(key)) return cache.sefaria.get(key);

    const url = `${SEFARIA.base}${encodeURIComponent(ref)}${SEFARIA.params}`;
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!resp.ok) throw new Error(`Sefaria fetch failed (HTTP ${resp.status})`);

    const data = await resp.json().catch(() => null);
    if (!data) throw new Error("Sefaria returned invalid JSON");

    const out = {
      ref: data.ref || ref,
      en: flattenToText(data.text),
      he: flattenToText(data.he),
    };

    cache.sefaria.set(key, out);
    return out;
  }

  // ----- Gate generation (231) -----
  function generateGates(lettersHe, trMap) {
    const gates = [];
    for (let i = 0; i < lettersHe.length; i++) {
      for (let j = i + 1; j < lettersHe.length; j++) {
        const a = lettersHe[i];
        const b = lettersHe[j];
        gates.push({
          he: `${a}${b}`,
          a,
          b,
          tr: `${trMap[a] || a}-${trMap[b] || b}`,
        });
      }
    }
    return gates;
  }

  // ----- Theme mapping (deterministic hybrid) -----
  // 1) letter families -> candidate theme IDs (up to 3)
  // 2) numeric tie-breaker -> select within candidates (or fall back to full list)
  //
  // NOTE: This is a STUDY mapping lens, not a metaphysical claim.
  function buildFamilyIndex(families) {
    // families is object {gutturals:[...], dentals:[...], ...}
    const idx = new Map();
    Object.entries(families || {}).forEach(([fam, arr]) => {
      (arr || []).forEach(letter => idx.set(letter, fam));
    });
    return idx;
  }

  // Family -> preferred theme candidates (in priority order)
  // (Chosen to feel pedagogically coherent; you can adjust later without touching UI code.)
  const FAMILY_THEME_CANDIDATES = {
    gutturals: ["keter", "binah", "hod"],
    dentals: ["gevurah", "tiferet", "malkhut"],
    sibilants: ["binah", "gevurah", "hod"],
    labials: ["chesed", "yesod", "malkhut"],
    velars: ["chokhmah", "netzach", "gevurah"],
    liquids: ["tiferet", "yesod", "netzach"],
  };

  function uniqueKeepOrder(arr) {
    const seen = new Set();
    const out = [];
    for (const x of arr) {
      if (!seen.has(x)) {
        seen.add(x);
        out.push(x);
      }
    }
    return out;
  }

  function mapGateToThemeId(gate, familyIndex, letterIndexMap, allThemeIds) {
    const famA = familyIndex.get(gate.a) || null;
    const famB = familyIndex.get(gate.b) || null;

    const candA = famA ? (FAMILY_THEME_CANDIDATES[famA] || []) : [];
    const candB = famB ? (FAMILY_THEME_CANDIDATES[famB] || []) : [];

    // Combine candidates; keep order; take first 3
    let candidates = uniqueKeepOrder([...candA, ...candB]).slice(0, 3);

    const idxA = letterIndexMap[gate.a] || 0;
    const idxB = letterIndexMap[gate.b] || 0;

    // Numeric tie-breaker: index sum mod 10 (0..9)
    const tie = (idxA + idxB) % 10;

    if (candidates.length > 0) {
      return candidates[tie % candidates.length];
    }

    // Fallback: select from all themes
    return allThemeIds[tie % allThemeIds.length];
  }

  // ----- Theme bucket selection -----
  function getThemeCursorKey(themeId) {
    return `gateThemeCursor:${themeId}`;
  }

  function getThemeCursor(themeId) {
    const raw = sessionStorage.getItem(getThemeCursorKey(themeId));
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function setThemeCursor(themeId, idx) {
    sessionStorage.setItem(getThemeCursorKey(themeId), String(idx));
  }

  function pickRefForTheme(themeId, buckets) {
    const arr = buckets?.[themeId] || [];
    if (!arr.length) return null;
    const cursor = getThemeCursor(themeId) % arr.length;
    return { ref: arr[cursor], cursor, size: arr.length };
  }

  function nextRefForTheme(themeId, buckets) {
    const arr = buckets?.[themeId] || [];
    if (!arr.length) return null;
    const cursor = (getThemeCursor(themeId) + 1) % arr.length;
    setThemeCursor(themeId, cursor);
    return { ref: arr[cursor], cursor, size: arr.length };
  }

  // ----- UI render -----
  function clearReader() {
    elSelectedGate.textContent = "Select a gate";
    elSelectedTheme.textContent = "Theme: —";
    elSelectedRef.textContent = "Torah ref: —";
    elEn.textContent = "(nothing loaded)";
    elHe.textContent = "(nothing loaded)";
    btnSend.disabled = true;
    btnNextTheme.disabled = true;
  }

  function renderGateButtons(gates) {
    elList.innerHTML = "";
    for (const g of gates) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gate-pill";
      b.textContent = g.he;
      b.dataset.key = g.he;
      b.addEventListener("click", () => selectGate(g.he));
      elList.appendChild(b);
    }
  }

  function markActiveGate(key) {
    elList.querySelectorAll(".gate-pill").forEach(btn => {
      btn.dataset.active = (btn.dataset.key === key) ? "1" : "0";
    });
  }

  function normalizeQuery(q) {
    return (q || "").trim().toLowerCase();
  }

  function filterGates(gates, q) {
    if (!q) return gates;
    // allow searching by hebrew pair or transliteration fragments
    return gates.filter(g =>
      g.he.includes(q) ||
      g.tr.toLowerCase().replace(/\s+/g, "").includes(q.replace(/\s+/g, ""))
    );
  }

  // ----- State -----
  let STATE = {
    letters: null,
    themes: null,
    buckets: null,
    gates: [],
    gateByHe: new Map(),
    themeById: new Map(),
    allThemeIds: [],
    familyIndex: null,
    letterIndexMap: null,
    selectedGateHe: null,
    selectedThemeId: null,
    selectedRef: null,
  };

  async function loadAll() {
    setStatus("Loading…", "busy");
    clearReader();

    const [lettersData, themesData, bucketsData] = await Promise.all([
      loadJson(PATHS.letters),
      loadJson(PATHS.themes),
      loadJson(PATHS.buckets),
    ]);

    const lettersHe = lettersData?.alphabet?.he || [];
    const trMap = lettersData?.alphabet?.transliteration || {};
    const families = lettersData?.families || {};

    const themesArr = themesData?.themes || [];
    const mapping = themesData?.mapping || {};
    const letterIndexMap = mapping?.tiebreaker?.letterIndex || {};
    const allThemeIds = themesArr.map(t => t.id);

    const gates = generateGates(lettersHe, trMap);
    const gateByHe = new Map(gates.map(g => [g.he, g]));
    const themeById = new Map(themesArr.map(t => [t.id, t]));
    const familyIndex = buildFamilyIndex(families);

    STATE = {
      letters: lettersData,
      themes: themesData,
      buckets: bucketsData?.buckets || {},
      gates,
      gateByHe,
      themeById,
      allThemeIds,
      familyIndex,
      letterIndexMap,
      selectedGateHe: null,
      selectedThemeId: null,
      selectedRef: null,
    };

    renderGateButtons(gates);
    setStatus("Ready", "ready");
  }

  async function loadPassage(themeId, ref) {
    setStatus("Fetching Torah text…", "busy");
    elEn.textContent = "(loading…)";
    elHe.textContent = "(loading…)";

    try {
      const t = await fetchSefaria(ref);
      // English primary in presence:
      elEn.textContent = t.en || "(No English returned.)";
      elHe.textContent = t.he || "(No Hebrew returned.)";
      setStatus("Ready", "ready");
      STATE.selectedRef = t.ref || ref;
      elSelectedRef.textContent = `Torah ref: ${STATE.selectedRef}`;
      btnSend.disabled = false;
      btnNextTheme.disabled = false;
    } catch (e) {
      setStatus(`Error: ${String(e.message || e)}`, "error");
      elEn.textContent = "";
      elHe.textContent = "";
      btnSend.disabled = true;
      btnNextTheme.disabled = false; // allow trying next
    }
  }

  async function selectGate(gateHe) {
    const gate = STATE.gateByHe.get(gateHe);
    if (!gate) return;

    const themeId = mapGateToThemeId(
      gate,
      STATE.familyIndex,
      STATE.letterIndexMap,
      STATE.allThemeIds
    );

    const theme = STATE.themeById.get(themeId);

    STATE.selectedGateHe = gateHe;
    STATE.selectedThemeId = themeId;

    markActiveGate(gateHe);

    elSelectedGate.textContent = `Gate ${gate.he} (${gate.tr})`;
    if (theme) {
      elSelectedTheme.textContent = `Theme: ${theme.label_en} · ${theme.secondary_en}`;
    } else {
      elSelectedTheme.textContent = `Theme: ${themeId}`;
    }

    const pick = pickRefForTheme(themeId, STATE.buckets);
    if (!pick?.ref) {
      setStatus("No Torah refs found for this theme.", "error");
      elSelectedRef.textContent = "Torah ref: —";
      elEn.textContent = "";
      elHe.textContent = "";
      btnSend.disabled = true;
      btnNextTheme.disabled = true;
      return;
    }

    elSelectedRef.textContent = `Torah ref: ${pick.ref}  (${pick.cursor + 1}/${pick.size})`;
    await loadPassage(themeId, pick.ref);
  }

  function selectRandomGate() {
    const q = normalizeQuery(elSearch.value);
    const list = filterGates(STATE.gates, q);
    if (!list.length) return;
    const g = list[Math.floor(Math.random() * list.length)];
    selectGate(g.he);
  }

  async function nextInTheme() {
    if (!STATE.selectedThemeId) return;
    const n = nextRefForTheme(STATE.selectedThemeId, STATE.buckets);
    if (!n?.ref) return;

    elSelectedRef.textContent = `Torah ref: ${n.ref}  (${n.cursor + 1}/${n.size})`;
    await loadPassage(STATE.selectedThemeId, n.ref);
  }

  function sendToChavruta() {
    if (!STATE.selectedGateHe || !STATE.selectedThemeId || !STATE.selectedRef) return;

    const gate = STATE.gateByHe.get(STATE.selectedGateHe);
    const theme = STATE.themeById.get(STATE.selectedThemeId);

    const themeLabel = theme
      ? `${theme.label_en} · ${theme.secondary_en}`
      : STATE.selectedThemeId;

    const prompt =
      `231 Gate ${gate.he} (${gate.tr}). ` +
      `Theme: ${themeLabel}. ` +
      `Torah passage: ${STATE.selectedRef}. ` +
      `Please begin with the text (English + Hebrew), then 3–7 study questions (peshat first).`;

    window.location.href = `/chavruta.html?q=${encodeURIComponent(prompt)}`;
  }

  // ----- Events -----
  elSearch.addEventListener("input", () => {
    const q = normalizeQuery(elSearch.value);
    renderGateButtons(filterGates(STATE.gates, q));
  });

  btnRandom.addEventListener("click", selectRandomGate);
  btnNextTheme.addEventListener("click", nextInTheme);
  btnSend.addEventListener("click", sendToChavruta);

  // Optional: load a gate from URL (?gate=אב)
  function tryGateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const g = (params.get("gate") || "").trim();
    if (g && STATE.gateByHe.has(g)) selectGate(g);
  }

  // ----- Boot -----
  (async () => {
    try {
      await loadAll();
      tryGateFromUrl();
    } catch (e) {
      console.error(e);
      setStatus(`Error: ${String(e.message || e)}`, "error");
      elEn.textContent = "";
      elHe.textContent = "";
    }
  })();
})();

