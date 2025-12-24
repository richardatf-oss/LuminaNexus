// scripts/library-ui.js
// Renders catalog, search, filter chips, and a local "My Shelf" using localStorage.

(function () {
  const data = window.LUMINA_LIBRARY || [];

  const $ = (sel) => document.querySelector(sel);

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const safe = (s) => (s || "").toString();

  // ---- Sefaria URL helper ----
  // Uses canonical path style: https://www.sefaria.org/<Path>
  // Example: Genesis.1, Psalms.23, Pirkei_Avot.1
  const sefariaUrl = (path) => {
    if (!path) return "";
    return `https://www.sefaria.org/${encodeURIComponent(path)}`;
  };

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

  const saveShelf = (arr) => {
    localStorage.setItem(SHELF_KEY, JSON.stringify(arr));
  };

  const shelfHas = (id) => loadShelf().some((x) => x.id === id);

  const addToShelf = (item) => {
    const shelf = loadShelf();
    if (shelf.some((x) => x.id === item.id)) return;
    shelf.unshift({ id: item.id, title: item.title, hebrewTitle: item.hebrewTitle, sefariaPath: item.sefariaPath, category: item.category });
    saveShelf(shelf.slice(0, 24));
  };

  const removeFromShelf = (id) => {
    const shelf = loadShelf().filter((x) => x.id !== id);
    saveShelf(shelf);
  };

  // ---- UI state ----
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
      .map(safe)
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

  const buildCard = (item, { isShelf = false } = {}) => {
    const card = el("article", "card");
    const tag = el("div", "card-tag", item.category || "TEXT");
    const h2 = el("h2", null, item.title || "");
    const p = el("p", null, item.description || "");
    const he = el("p", "hebrew", item.hebrewDescription || "");

    card.appendChild(tag);
    card.appendChild(h2);
    card.appendChild(p);
    if (item.hebrewDescription) card.appendChild(he);

    // actions
    const actions = el("div", "hero-actions");
    actions.style.marginTop = "12px";

    const openBtn = el("a", "btn primary", "Open on Sefaria →");
    const url = sefariaUrl(item.sefariaPath);
    if (url) {
      openBtn.href = url;
      openBtn.target = "_blank";
      openBtn.rel = "noreferrer";
    } else {
      openBtn.href = "/pages/chavruta.html";
      openBtn.textContent = "Open in Chavruta →";
    }

    const promptBtn = el("button", "btn ghost", "Copy prompt");
    promptBtn.type = "button";
    promptBtn.addEventListener("click", async () => {
      const text = item.chavrutaPrompt || `Let’s study ${item.title}. Please keep it Torah-first and source-first.`;
      try {
        await navigator.clipboard.writeText(text);
        promptBtn.textContent = "Copied ✓";
        setTimeout(() => (promptBtn.textContent = "Copy prompt"), 900);
      } catch {
        // fallback
        const ta = el("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        promptBtn.textContent = "Copied ✓";
        setTimeout(() => (promptBtn.textContent = "Copy prompt"), 900);
      }
    });

    const shelfBtn = el("button", "btn ghost", isShelf ? "Remove" : "Add to shelf");
    shelfBtn.type = "button";
    shelfBtn.addEventListener("click", () => {
      if (isShelf) {
        removeFromShelf(item.id);
      } else {
        addToShelf(item);
      }
      renderShelf();
      renderList();
    });

    actions.appendChild(openBtn);
    actions.appendChild(promptBtn);
    actions.appendChild(shelfBtn);
    card.appendChild(actions);

    // tiny reference line
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

    // Map shelf items back to full data objects when possible
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

    const items = data
      .filter((d) => withinCategory(d))
      .filter((d) => matchesSearch(d, q));

    list.innerHTML = "";
    items.forEach((item) => list.appendChild(buildCard(item, { isShelf: false })));

    if (count) count.textContent = String(items.length);
  };

  const wireReadToday = () => {
    const btn = $("#read-today");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const pick = data[Math.floor(Math.random() * data.length)];
      const url = pick?.sefariaPath ? sefariaUrl(pick.sefariaPath) : "";
      if (url) window.open(url, "_blank", "noreferrer");
      else window.location.href = "/pages/chavruta.html";
    });
  };

  // ---- boot ----
  document.addEventListener("DOMContentLoaded", () => {
    renderFilters();
    renderShelf();
    renderList();
    wireReadToday();

    const search = $("#library-search");
    if (search) {
      search.addEventListener("input", () => renderList());
    }
  });
})();
