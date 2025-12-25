// /scripts/library-ui.js
(() => {
  const data = Array.isArray(window.LuminaLibrary) ? window.LuminaLibrary : [];

  const listEl = () => document.getElementById("libList");
  const searchEl = () => document.getElementById("libSearch");
  const categoryEl = () => document.getElementById("libCategory");

  function uniq(arr) {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  }

  function buildCategoryOptions() {
    const cats = uniq(data.map(x => x.category).filter(Boolean));
    const sel = categoryEl();
    if (!sel) return;

    // Keep existing "all"
    for (const c of cats) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    }
  }

  function matches(item, q, cat) {
    if (cat && cat !== "all" && item.category !== cat) return false;
    if (!q) return true;

    const hay = `${item.ref} ${item.category} ${item.note || ""}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }

  function chavrutaHref(ref) {
    // This is Step 4: pass ref into Chavruta
    return `/pages/chavruta?ref=${encodeURIComponent(ref)}`;
  }

  function render() {
    const el = listEl();
    if (!el) return;

    const q = (searchEl()?.value || "").trim();
    const cat = categoryEl()?.value || "all";

    const filtered = data.filter(item => matches(item, q, cat));

    el.innerHTML = "";

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.textContent = "No matches. Try a different search.";
      el.appendChild(empty);
      return;
    }

    for (const item of filtered) {
      const row = document.createElement("div");
      row.className = "item";

      const left = document.createElement("div");

      const a = document.createElement("a");
      a.href = chavrutaHref(item.ref);
      a.textContent = item.ref;
      a.rel = "noopener";
      // Optional: open in new tab (comment out if you prefer same tab)
      a.target = "_blank";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = item.note || "";

      left.appendChild(a);
      if (item.note) left.appendChild(meta);

      const tag = document.createElement("div");
      tag.className = "tag";
      tag.textContent = item.category || "Text";

      row.appendChild(left);
      row.appendChild(tag);

      el.appendChild(row);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildCategoryOptions();
    render();

    searchEl()?.addEventListener("input", render);
    categoryEl()?.addEventListener("change", render);
  });
})();
