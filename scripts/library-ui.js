// scripts/library-ui.js
// Embedded Sefaria Reader + catalog + search + filters + local Shelf.

(function () {
  const data = window.LUMINA_LIBRARY || [];

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  // ---- Sefaria URL helper ----
  const sefariaUrl = (path) => (path ? `https://www.sefaria.org/${encodeURIComponent(path)}` : "");

  // ---- Shelf (localStorage) ----
  const SHELF_KEY = "luminanexus_shelf_v1";
  const loadShelf = () => {
    try {
      const raw = localStorage.getItem(SHELF_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };
  const saveShelf = (arr) => localStorage.setItem(SHELF_KEY, JSON.stringify(arr));

  const addToShelf = (item) => {
    const shelf = loadShelf();
    if (shelf.some((x) => x.id === item.id)) return;
    shelf.unshift({
      id: item.id,
      title: item.title,
      hebrewTitle: item.hebrewTitle,
      sefariaPath: item.sefariaPath,
      category: item.category
    });
    saveShelf(shelf.slice(0, 24));
  };

  const removeFromShelf = (id) => {
    const shelf = loadShelf().filter((x) => x.id !== id);
    saveShelf(shelf);
  };

  // ---- Embedded Reader wiring ----
  const reader = {
    frame: null,
    heading: null,
    sub: null,
    open: null,
    copy: null,
    clear: null,
    currentItem: null
  };

  const setReader = (item) => {
    reader.currentItem = item;

    const title = item?.title || "Select a text to read";
    const heb = item?.hebrewTitle ? ` · ${item.hebrewTitle}` : "";
    const note = item?.ref ? `Ref: ${item.ref}` : "Click “Read in Reader” on any card to load it here.";

    if (reader.heading) reader.heading.textContent = title + (heb ? "" : "");
    if (reader.sub) reader.sub.textContent = item ? note : "Click “Read in Reader” on any card to load it here.";

    const url = item?.sefariaPath ? sefariaUrl(item.sefariaPath) : "";
    if (reader.open) {
      reader.open.href = url || "https://www.sefaria.org";
      reader.open.textContent = "Open on Sefaria →";
    }

    if (reader.frame) {
      reader.frame.src = url || "about:blank";
    }

    // Copy prompt uses item.chavrutaPrompt if present
    if (reader.copy) {
      reader.copy.disabled = !item;
      reader.copy.textContent = "Copy prompt";
    }
  };

  const clearReader = () => setReader(null);

  const copyPrompt = async () => {
    if (!reader.currentItem) return;
    const item = reader.currentItem;

    const text =
      item.chavrutaPrompt ||
      `Let’s study ${item.title}. Please keep it Torah-first and source-first, give a peshat-first explanation, then ask me 3 clarifying questions.`;

    try {
      await navigator.clipboard.writeText(text);
      reader.copy.textContent = "Copied ✓";
      setTimeout(() => (reader.copy.textContent = "Copy prompt"), 900);
    } catch {
      const ta = el("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      reader.copy.textContent = "Copied ✓";
      setTimeout(() => (reader.copy.textContent = "Copy prompt"), 900);
    }
  };

  // ---- Filters + Search ----
  let activeCategory = "All";

  const categories = () => {
    const set = new Set(data.map((d) => d.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  };

  const matchesSearch = (item, q) => {
    if (!q) return true;
    q = q.toLowerCase();
    const hay = [
      item.title,
      item.hebrewTitle,
      item.description,
      item.hebrewDescription,
      item.category,
      item.ref
    ]
      .filter(Boolean)
      .join(" · ")
      .toLowerCase();
    return hay.includes(q);
  };

  const withinCategory = (item) => activeCategory === "All" || item.category === activeCategory;

  const renderFilters = () => {
    const wrap = $("#library-filters");
    if (!wrap) return;
    wrap.innerHTML = "";

    categories().forEach((cat) => {
      const chip = el("button", "filter-chip", cat);
      chip.type = "button";
      if (cat === activeCategory) chip.classList.add("active");
      chip.addEventListener("click", () => {
        activeCategory = cat;
        renderFilters();
        renderList();
      });
      wrap.appendChild(chip);
    });
  };

  // ---- Cards ----
  const buildCard = (item, { isShelf = false } = {}) => {
    const card = el("article", "card");

    card.appendChild(el("div", "card-tag", item.category || "TEXT"));

    const h2 = el("h2", null, item.title || "");
    card.appendChild(h2);

    if (item.description) card.appendChild(el("p", null, item.description));
    if (item.hebrewDescription) card.appendChild(el("p", "hebrew", item.hebrewDescription));

    const actions = el("div", "hero-actions");
    actions.style.marginTop = "12px";

    // Embedded reader button
    const readBtn = el("button", "btn primary", "Read in Reader →");
    readBtn.type = "button";
    readBtn.addEventListener("click", () => {
      setReader(item);
      // On narrow screens, scroll reader into view
      const frameWrap = $(".library-right") || $("#sefaria-frame");
      frameWrap?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Open in new tab still available (safety/fallback)
    const openTab = el("a", "btn ghost", "Open on Sefaria");
    const url = item.sefariaPath ? sefariaUrl(item.sefariaPath) : "";
    openTab.href = url || "https://www.sefaria.org";
    openTab.target = "_blank";
    openTab.rel = "noreferrer";

    // Shelf
    const shelfBtn = el("button", "btn ghost", isShelf ? "Remove" : "Add to shelf");
    shelfBtn.type = "button";
    shelfBtn.addEventListener("click", () => {
      if (isShelf) removeFromShelf(item.id);
      else addToShelf(item);
      renderShelf();
      renderList();
    });

    actions.appendChild(readBtn);
    actions.appendChild(openTab);
    actions.appendChild(shelfBtn);
    card.appendChild(actions);

    if (item.ref) {
      const ref = el("p", "muted", `Ref: ${item.ref}`);
      ref.style.marginTop = "10px";
      card.appendChild(ref);
    }

    return card;
  };

  const renderShelf = () => {
    const shelfWrap = $("#my-shelf");
    const empty = $("#my-shelf-empty");
    if (!shelfWrap) return;

    const shelf = loadShelf();
    shelfWrap.innerHTML = "";

    if (empty) empty.style.display = shelf.length ? "none" : "block";

    shelf.forEach((s) => {
      const full = data.find((d) => d.id === s.id) || s;
      shelfWrap.appendChild(buildCard(full, { isShelf: true }));
    });
  };

  const renderList = () => {
    const list = $("#library-list");
    const count = $("#library-count");
    const search = $("#library-search");
    if (!list) return;

    const q = search ? search.value.trim() : "";
    const items = data.filter(withinCategory).filter((d) => matchesSearch(d, q));

    list.innerHTML = "";
    items.forEach((item) => list.appendChild(buildCard(item, { isShelf: false })));
    if (count) count.textContent = String(items.length);
  };

  const wireReadToday = () => {
    const btn = $("#read-today");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const pickables = data.filter((d) => d.sefariaPath);
      const pick = pickables[Math.floor(Math.random() * pickables.length)];
      if (pick) setReader(pick);
      $(".library-right")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const wireReaderControls = () => {
    reader.frame = $("#sefaria-frame");
    reader.heading = $("#reader-heading");
    reader.sub = $("#reader-sub");
    reader.open = $("#reader-open");
    reader.copy = $("#reader-copy");
    reader.clear = $("#reader-clear");

    if (reader.copy) reader.copy.addEventListener("click", copyPrompt);
    if (reader.clear) reader.clear.addEventListener("click", clearReader);

    // Start empty
    setReader(null);
  };

  // ---- Boot ----
  document.addEventListener("DOMContentLoaded", () => {
    wireReaderControls();
    renderFilters();
    renderShelf();
    renderList();
    wireReadToday();

    const search = $("#library-search");
    if (search) search.addEventListener("input", renderList);
  });
})();
