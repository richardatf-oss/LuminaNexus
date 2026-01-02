// /scripts/library-ui.js
// LuminaNexus — Library UI (loads list from /data/library-texts.json, loads live text from Sefaria with cache)

(async function () {
  const isInPages = location.pathname.includes("/pages/");
  const root = isInPages ? ".." : ".";
  // Use absolute URL resolution so /pages/library (no .html) never breaks relative fetch
  const dataUrl = new URL(`${root}/data/library-texts.json`, location.href).toString();

  const listEl = document.querySelector("[data-library-list]");
  const searchEl = document.querySelector("[data-library-search]");
  const filterEl = document.querySelector("[data-library-filter]");
  const titleEl = document.querySelector("[data-library-title]");
  const enEl = document.querySelector("[data-library-english]");
  const heEl = document.querySelector("[data-library-hebrew]");

  const btnSend = document.querySelector("[data-send-chavruta]");
  const btnSefaria = document.querySelector("[data-open-sefaria]");
  const btnCopy = document.querySelector("[data-copy-ref]");

  if (!listEl) return;

  let all = [];
  let current = null;
  let currentLoadToken = 0;

  function stripHtml(s) {
    return String(s)
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "") // remove footnote markers
      .replace(/<i[^>]*class="footnote"[^>]*>.*?<\/i>/gi, "") // remove footnote bodies
      .replace(/<[^>]+>/g, "") // remove remaining tags
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderList(items) {
    listEl.innerHTML = items
      .map((t) => {
        return `
          <div class="text-row">
            <div class="text-main">
              <div class="text-title">${escapeHtml(t.title)}</div>
              <div class="text-blurb">${escapeHtml(t.blurb || "")}</div>
            </div>
            <div class="text-tags">
              <span class="chip">${escapeHtml(t.category || "Text")}</span>
              <button class="chip-btn" type="button" data-read-id="${escapeHtml(t.id)}">Read</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function setButtonsEnabled(t) {
    if (btnSefaria) btnSefaria.disabled = !t?.ref;
    if (btnCopy) btnCopy.disabled = !t?.ref;
    if (btnSend) btnSend.disabled = !t;
  }

  function renderLoading(title) {
    if (titleEl) titleEl.textContent = title || "Loading…";
    if (enEl) enEl.innerHTML = `<div class="pane-head">ENGLISH</div><p class="muted">Loading…</p>`;
    if (heEl) heEl.innerHTML = `<div class="pane-head">HEBREW</div><p class="muted" dir="rtl">טוען…</p>`;
  }

  function renderText(t, { english = [], hebrew = [], note = "" } = {}) {
    current = t;

    if (titleEl) titleEl.textContent = t.title || "Select a text";

    if (enEl) {
      enEl.innerHTML =
        `<div class="pane-head">ENGLISH</div>` +
        (english && english.length
          ? english.map((line) => `<p>${escapeHtml(stripHtml(line))}</p>`).join("")
          : `<p class="muted">(nothing loaded)</p>`) +
        (note ? `<p class="muted small">${escapeHtml(note)}</p>` : "");
    }

    if (heEl) {
      heEl.innerHTML =
        `<div class="pane-head">HEBREW</div>` +
        (hebrew && hebrew.length
          ? hebrew.map((line) => `<p dir="rtl">${escapeHtml(stripHtml(line))}</p>`).join("")
          : `<p class="muted" dir="rtl">(לא נטען)</p>`);
    }

    setButtonsEnabled(t);
  }

  function applyFilters() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const cat = (filterEl?.value || "All").toLowerCase();

    const filtered = all.filter((t) => {
      const matchesQ =
        !q ||
        (t.title || "").toLowerCase().includes(q) ||
        (t.ref || "").toLowerCase().includes(q) ||
        (t.blurb || "").toLowerCase().includes(q);

      const matchesCat = cat === "all" || (t.category || "").toLowerCase() === cat;
      return matchesQ && matchesCat;
    });

    renderList(filtered);
  }

  function buildCategoryOptions() {
    if (!filterEl) return;
    const cats = Array.from(new Set(all.map((t) => t.category).filter(Boolean))).sort();
    filterEl.innerHTML =
      `<option value="All">All categories</option>` +
      cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }

  async function loadData() {
    const res = await fetch(dataUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Library JSON HTTP ${res.status}`);
    const json = await res.json();
    // Accept either {texts:[...]} or bare [...]
    const arr = Array.isArray(json) ? json : (json.texts || json.items || json.data || []);
    if (!Array.isArray(arr)) return [];
    return arr;
  }

  async function loadLiveTextFor(t) {
    const token = ++currentLoadToken;

    renderLoading(t.title);
    setButtonsEnabled(t);

    // 1) Try live Sefaria if available
    if (t.ref && window.LN_Sefaria?.getText) {
      try {
        const live = await window.LN_Sefaria.getText(t.ref);
        if (token !== currentLoadToken) return; // stale click
        const note = live.cached ? "Loaded from cache (Sefaria)." : "Loaded live from Sefaria.";
        renderText(t, { english: live.english || [], hebrew: live.hebrew || [], note });
        return;
      } catch (e) {
        // fall through to local
        console.warn("Sefaria load failed, falling back to local", e);
      }
    }

    // 2) Fallback to local JSON content if present
    if (token !== currentLoadToken) return;
    const hasLocal = (t.english && t.english.length) || (t.hebrew && t.hebrew.length);
    renderText(t, {
      english: t.english || [],
      hebrew: t.hebrew || [],
      note: hasLocal
        ? "Loaded from local library fallback."
        : "Could not load from Sefaria; no local fallback available.",
    });
  }

  // Boot
  try {
    all = await loadData();
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    listEl.innerHTML = `
      <p class="muted"><strong>Library failed to load.</strong></p>
      <p class="muted">Tried: <span class="mono">${escapeHtml(dataUrl)}</span></p>
      <p class="muted">Error: <span class="mono">${escapeHtml(msg)}</span></p>
    `;
    console.error("Library load failed", { dataUrl, error: e });
    return;
  }

  buildCategoryOptions();
  renderList(all);

  // Default select first
  if (all[0]) {
    await loadLiveTextFor(all[0]);
  } else {
    renderText({ title: "No texts yet", ref: "" }, { english: [], hebrew: [] });
  }

  // Events
  listEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-read-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-read-id");
    const t = all.find((x) => x.id === id);
    if (t) loadLiveTextFor(t);
  });

  searchEl?.addEventListener("input", applyFilters);
  filterEl?.addEventListener("change", applyFilters);

  btnCopy?.addEventListener("click", async () => {
    if (!current?.ref) return;
    await navigator.clipboard.writeText(current.ref);
    btnCopy.textContent = "Copied!";
    setTimeout(() => (btnCopy.textContent = "Copy ref"), 900);
  });

  btnSefaria?.addEventListener("click", () => {
    if (!current?.ref) return;
    const url = `https://www.sefaria.org/${encodeURIComponent(current.ref)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  btnSend?.addEventListener("click", () => {
    if (!current) return;

    // Prefer whatever is currently displayed (if we loaded live, we want that)
    const enLines = Array.from(enEl?.querySelectorAll("p") || [])
      .map((p) => p.textContent)
      .filter(Boolean)
      .filter((t) => t !== "Loading…" && t !== "(nothing loaded)");

    const heLines = Array.from(heEl?.querySelectorAll("p") || [])
      .map((p) => p.textContent)
      .filter(Boolean)
      .filter((t) => t !== "טוען…" && t !== "(לא נטען)" && t !== "(nothing loaded)");

    localStorage.setItem(
      "LN_CHAVRUTA_PAYLOAD",
      JSON.stringify({
        ref: current.ref,
        title: current.title,
        english: enLines,
        hebrew: heLines,
      })
    );

    location.href = `${root}/pages/chavruta.html`;
  });
})();
