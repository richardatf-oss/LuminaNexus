// /scripts/library-ui.js
(() => {
  const data = Array.isArray(window.LuminaLibrary) ? window.LuminaLibrary : [];

  const listEl = () => document.getElementById("libList");
  const searchEl = () => document.getElementById("libSearch");
  const categoryEl = () => document.getElementById("libCategory");

  const LS_RECENT = "lumina.library.recent";
  const LS_PINNED = "lumina.library.pinned";

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function uniq(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  }

  function buildCategoryOptions() {
    const cats = uniq(data.map(x => x.category).filter(Boolean));
    const sel = categoryEl();
    if (!sel) return;
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    }
  }

  function chavrutaHref(ref) {
    return `/pages/chavruta?ref=${encodeURIComponent(ref)}`;
  }

  function getRecent() {
    const r = load(LS_RECENT, []);
    return Array.isArray(r) ? r : [];
  }

  function getPinned() {
    const p = load(LS_PINNED, []);
    return Array.isArray(p) ? p : [];
  }

  function addRecent(ref) {
    const r = getRecent().filter(x => x !== ref);
    r.unshift(ref);
    save(LS_RECENT, r.slice(0, 12));
  }

  function togglePinned(ref) {
    const p = getPinned();
    const idx = p.indexOf(ref);
    if (idx >= 0) p.splice(idx, 1);
    else p.unshift(ref);
    save(LS_PINNED, p.slice(0, 24));
  }

  function matches(item, q, cat) {
    if (cat && cat !== "all" && item.category !== cat) return false;
    if (!q) return true;
    const hay = `${item.ref} ${item.category} ${item.note || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function byRef(ref) {
    return data.find(x => x.ref === ref) || { ref, category: "Text", note: "" };
  }

  function sectionTitle(text) {
    const h = document.createElement("div");
    h.className = "lib-section";
    h.textContent = text;
    return h;
  }

  function makeRow(item) {
    const row = document.createElement("div");
    row.className = "item";

    const left = document.createElement("div");

    const a = document.createElement("a");
    a.href = chavrutaHref(item.ref);
    a.textContent = item.ref;
    a.rel = "noopener";
    a.target = "_blank";

    a.addEventListener("click", () => addRecent(item.ref));

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = item.note || "";

    left.appendChild(a);
    if (item.note) left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "lib-actions";

    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "lib-btn";
    pin.textContent = getPinned().includes(item.ref) ? "Pinned" : "Pin";
    pin.addEventListener("click", (e) => {
      e.preventDefault();
      togglePinned(item.ref);
      render();
    });

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "lib-btn";
    copy.textContent = "Copy link";
    copy.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = `${location.origin}${chavrutaHref(item.ref)}`;
      try {
        await navigator.clipboard.writeText(url);
        copy.textContent = "Copied";
        setTimeout(() => (copy.textContent = "Copy link"), 900);
      } catch {
        // fallback: open a prompt
        window.prompt("Copy this link:", url);
      }
    });

    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = item.category || "Text";

    right.appendChild(pin);
    right.appendChild(copy);
    right.appendChild(tag);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function render() {
    const el = listEl();
    if (!el) return;

    const q = (searchEl()?.value || "").trim();
    const cat = categoryEl()?.value || "all";

    const pinnedRefs = getPinned();
    const recentRefs = getRecent();

    const filtered = data.filter(item => matches(item, q, cat));

    el.innerHTML = "";

    // Pinned (only if not searching, to keep results clean)
    if (!q && pinnedRefs.length) {
      el.appendChild(sectionTitle("Pinned"));
      pinnedRefs
        .map(byRef)
        .filter(item => matches(item, q, cat))
        .forEach(item => el.appendChild(makeRow(item)));
    }

    // Recent (only if not searching)
    if (!q && recentRefs.length) {
      el.appendChild(sectionTitle("Recent"));
      recentRefs
        .map(byRef)
        .filter(item => matches(item, q, cat))
        .forEach(item => el.appendChild(makeRow(item)));
    }

    // All results
    el.appendChild(sectionTitle(q ? "Results" : "All texts"));

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No matches. Try a different search.";
      el.appendChild(empty);
      return;
    }

    for (const item of filtered) el.appendChild(makeRow(item));
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildCategoryOptions();
    render();
    searchEl()?.addEventListener("input", render);
    categoryEl()?.addEventListener("change", render);
  });
})();
