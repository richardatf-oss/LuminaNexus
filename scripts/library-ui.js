// scripts/library-ui.js
// Library now works as its own reader experience.
// Click item -> loads Sefaria text in-place.
// Button keeps "Send to Chavruta" option.

(function () {
  const $ = (s) => document.querySelector(s);

  const elList = $("#libList");
  const elSearch = $("#libSearch");
  const elCategory = $("#libCategory");

  const elRef = $("#readerRef");
  const elHint = $("#readerHint");
  const elStatus = $("#readerStatus");
  const elEn = $("#readerEn");
  const elHe = $("#readerHe");

  const btnSend = $("#btnSendChavruta");
  const btnOpen = $("#btnOpenSefaria");
  const btnCopy = $("#btnCopyRef");

  // ✅ Your curated list (edit freely)
  const TEXTS = [
    { ref: "Genesis 1:1", title: "Genesis 1:1", desc: "The opening—creation, scope, and first questions.", cat: "Torah" },
    { ref: "Exodus 20:1-17", title: "Exodus 20:1–17", desc: "Aseret HaDibrot (Ten Commandments).", cat: "Torah" },
    { ref: "Deuteronomy 6:4-9", title: "Deuteronomy 6:4–9", desc: "Shema and covenantal love.", cat: "Torah" },
    { ref: "Psalms 12", title: "Psalms 12", desc: "Speech, integrity, and God’s pure words.", cat: "Writings" },
    { ref: "Isaiah 6:1-8", title: "Isaiah 6:1–8", desc: "Vision, holiness, and calling.", cat: "Prophets" },
    { ref: "Mishnah Berakhot 1:1", title: "Mishnah Berakhot 1:1", desc: "When to recite Shema.", cat: "Mishnah" },
    { ref: "Berakhot 4a", title: "Berakhot 4a", desc: "Talmud study entry point (daf).", cat: "Talmud" },
  ];

  let selected = null;

  function setStatus(text, kind = "ready") {
    elStatus.textContent = text;
    elStatus.dataset.kind = kind;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function flattenToText(x) {
    if (!x) return "";
    if (typeof x === "string") return x.trim();
    if (Array.isArray(x)) return x.flat(Infinity).filter(v => typeof v === "string" && v.trim()).join("\n").trim();
    return "";
  }

  async function fetchSefaria(ref) {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=0&lang=bi`;
    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!resp.ok) throw new Error(`Sefaria HTTP ${resp.status}`);
    const data = await resp.json().catch(() => null);
    if (!data) throw new Error("Bad Sefaria response");
    return {
      en: flattenToText(data.text),
      he: flattenToText(data.he),
      ref: data.ref || ref
    };
  }

  function renderList(items) {
    elList.innerHTML = "";

    for (const item of items) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "lib-item";
      card.dataset.ref = item.ref;

      card.innerHTML = `
        <div class="lib-item-main">
          <div class="lib-item-title">${escapeHtml(item.title)}</div>
          <div class="lib-item-desc">${escapeHtml(item.desc || "")}</div>
        </div>
        <div class="lib-item-meta">
          <span class="pill">${escapeHtml(item.cat || "Text")}</span>
          <span class="pill ghost">Read</span>
        </div>
      `;

      card.addEventListener("click", () => selectRef(item.ref));

      elList.appendChild(card);
    }
  }

  async function selectRef(ref) {
    selected = ref;
    elRef.textContent = ref;
    elHint.textContent = "Loading from Sefaria…";
    setStatus("Loading…", "busy");

    btnSend.disabled = true;
    btnOpen.disabled = true;
    btnCopy.disabled = true;

    elEn.textContent = "(loading…)";
    elHe.textContent = "(loading…)";

    try {
      const t = await fetchSefaria(ref);
      elEn.textContent = t.en || "(No English returned.)";
      elHe.textContent = t.he || "(No Hebrew returned.)";
      elHint.textContent = "Read here. When ready, send to Chavruta for questions.";
      setStatus("Ready", "ready");

      btnSend.disabled = false;
      btnOpen.disabled = false;
      btnCopy.disabled = false;
    } catch (e) {
      elEn.textContent = "";
      elHe.textContent = "";
      elHint.textContent = "Could not load this text. Try another ref.";
      setStatus(`Error: ${String(e.message || e)}`, "error");
    }
  }

  function applyFilters() {
    const q = (elSearch.value || "").trim().toLowerCase();
    const cat = (elCategory.value || "").trim();

    const filtered = TEXTS.filter(t => {
      const matchQ = !q || (t.title + " " + t.ref + " " + (t.desc || "")).toLowerCase().includes(q);
      const matchC = !cat || t.cat === cat;
      return matchQ && matchC;
    });

    renderList(filtered);
  }

  // ✅ Keep “Send to Chavruta” as an option
  btnSend.addEventListener("click", () => {
    if (!selected) return;
    // send the ref to Chavruta page as a query param
    // (Your Chavruta page can read ?q=... and auto-fill if you want)
    const url = `/chavruta.html?q=${encodeURIComponent(selected)}`;
    window.location.href = url;
  });

  btnOpen.addEventListener("click", () => {
    if (!selected) return;
    const url = `https://www.sefaria.org/${encodeURIComponent(selected)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  btnCopy.addEventListener("click", async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected);
      setStatus("Copied ref", "ready");
      setTimeout(() => setStatus("Ready", "ready"), 900);
    } catch {
      // fallback
      prompt("Copy ref:", selected);
    }
  });

  elSearch.addEventListener("input", applyFilters);
  elCategory.addEventListener("change", applyFilters);

  // initial render
  applyFilters();
})();
