// scripts/library-ui.js
(() => {
  const data = window.LN_LIBRARY;
  if (!data) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    query: "",
    filter: "all", // category key or "all"
    shelf: loadShelf()
  };

  function safeRefToUrl(ref) {
    // Sefaria uses ref formats like Genesis.1 or Psalms.23
    // We'll link to https://www.sefaria.org/<ref>
    return data.sefariaBase + encodeURIComponent(ref);
  }

  function loadShelf() {
    try {
      const raw = localStorage.getItem("ln_shelf");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveShelf() {
    localStorage.setItem("ln_shelf", JSON.stringify(state.shelf));
  }

  function isOnShelf(id) {
    return state.shelf.includes(id);
  }

  function addToShelf(id) {
    if (!isOnShelf(id)) {
      state.shelf.push(id);
      saveShelf();
      render();
    }
  }

  function removeFromShelf(id) {
    state.shelf = state.shelf.filter(x => x !== id);
    saveShelf();
    render();
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function buildFilters() {
    const wrap = $("#library-filters");
    if (!wrap) return;

    wrap.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "pill filter-pill";
    allBtn.dataset.filter = "all";
    allBtn.textContent = "All / הכול";
    wrap.appendChild(allBtn);

    data.categories.forEach(c => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill filter-pill";
      btn.dataset.filter = c.key;
      btn.textContent = c.label;
      wrap.appendChild(btn);
    });

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      state.filter = btn.dataset.filter;
      render();
    });
  }

  function matches(item) {
    const q = state.query.trim().toLowerCase();
    const inFilter = (state.filter === "all") || (item.category === state.filter);

    if (!inFilter) return false;
    if (!q) return true;

    const hay = [
      item.title,
      item.hebrew,
      item.category,
      item.ref,
      item.note
    ].join(" ").toLowerCase();

    return hay.includes(q);
  }

  function cardForItem(item) {
    const card = document.createElement("article");
    card.className = "card library-card";

    const tag = document.createElement("div");
    tag.className = "card-tag";
    const catLabel = (data.categories.find(c => c.key === item.category)?.label) || item.category;
    tag.textContent = catLabel;
    card.appendChild(tag);

    const h = document.createElement("h2");
    h.textContent = item.title;
    card.appendChild(h);

    const heb = document.createElement("p");
    heb.className = "hebrew";
    heb.textContent = item.hebrew || "";
    card.appendChild(heb);

    const note = document.createElement("p");
    note.textContent = item.note || "";
    card.appendChild(note);

    const actions = document.createElement("div");
    actions.className = "library-actions";

    // Local links
    if (item.id === "noahide_local") {
      const a = document.createElement("a");
      a.className = "btn ghost";
      a.href = "/pages/seven-laws.html";
      a.textContent = "Open on LuminaNexus →";
      actions.appendChild(a);
    }

    if (item.id === "study_pshat") {
      const a = document.createElement("a");
      a.className = "btn ghost";
      a.href = "/pages/torah-first.html";
      a.textContent = "Review covenant →";
      actions.appendChild(a);
    }

    // Sefaria link if ref present
    if (item.ref) {
      const a = document.createElement("a");
      a.className = "btn primary";
      a.href = safeRefToUrl(item.ref);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Open on Sefaria →";
      actions.appendChild(a);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn ghost";
      copyBtn.textContent = "Copy ref";
      copyBtn.addEventListener("click", () => copyText(item.ref));
      actions.appendChild(copyBtn);
    }

    // Shelf toggle
    const shelfBtn = document.createElement("button");
    shelfBtn.type = "button";
    shelfBtn.className = "btn ghost";
    shelfBtn.textContent = isOnShelf(item.id) ? "Remove from Shelf" : "Add to Shelf";
    shelfBtn.addEventListener("click", () => {
      isOnShelf(item.id) ? removeFromShelf(item.id) : addToShelf(item.id);
    });
    actions.appendChild(shelfBtn);

    card.appendChild(actions);
    return card;
  }

  function renderShelf() {
    const shelfWrap = $("#my-shelf");
    const shelfEmpty = $("#my-shelf-empty");
    if (!shelfWrap) return;

    const shelfItems = data.items.filter(i => state.shelf.includes(i.id));
    shelfWrap.innerHTML = "";

    if (!shelfItems.length) {
      if (shelfEmpty) shelfEmpty.style.display = "block";
      return;
    }
    if (shelfEmpty) shelfEmpty.style.display = "none";

    shelfItems.forEach(item => shelfWrap.appendChild(cardForItem(item)));
  }

  function renderCatalog() {
    const list = $("#library-list");
    if (!list) return;

    list.innerHTML = "";
    const results = data.items.filter(matches);

    $("#library-count")?.replaceChildren(document.createTextNode(String(results.length)));

    results.forEach(item => list.appendChild(cardForItem(item)));
  }

  function renderFilterActive() {
    $$("#library-filters .filter-pill").forEach(btn => {
      const f = btn.dataset.filter;
      btn.classList.toggle("active", f === state.filter);
    });
  }

  function render() {
    renderFilterActive();
    renderShelf();
    renderCatalog();
  }

  function wireSearch() {
    const input = $("#library-search");
    if (!input) return;

    input.addEventListener("input", () => {
      state.query = input.value || "";
      renderCatalog();
    });
  }

  function wireReadToday() {
    const btn = $("#read-today");
    if (!btn) return;

    btn.addEventListener("click", () => {
      // Simple “read today”: pick a stable rotating item by day-of-year
      const today = new Date();
      const start = new Date(today.getFullYear(), 0, 0);
      const diff = today - start;
      const day = Math.floor(diff / (1000 * 60 * 60 * 24));
      const pickables = data.items.filter(i => i.ref); // only Sefaria-openable
      if (!pickables.length) return;

      const item = pickables[day % pickables.length];
      const url = safeRefToUrl(item.ref);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildFilters();
    wireSearch();
    wireReadToday();
    render();
  });
})();
