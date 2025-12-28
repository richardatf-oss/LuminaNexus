// /scripts/library-ui.js
// Library = independent reader + optional "Send to Chavruta" with full EN/HE text.
// Sanitizes Sefaria inline HTML to clean plain text (no HTML injection).

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

  // ✅ Curated list (edit freely)
  const TEXTS = [
    { ref: "Genesis 1:1", title: "Genesis 1:1", desc: "The opening—creation, scope, and first questions.", cat: "Torah" },
    { ref: "Exodus 20:1-17", title: "Exodus 20:1–17", desc: "Aseret HaDibrot (Ten Commandments).", cat: "Torah" },
    { ref: "Deuteronomy 6:4-9", title: "Deuteronomy 6:4–9", desc: "Shema and covenantal love.", cat: "Torah" },
    { ref: "Psalms 12", title: "Psalms 12", desc: "Speech, integrity, and God’s pure words.", cat: "Writings" },
    { ref: "Isaiah 6:1-8", title: "Isaiah 6:1–8", desc: "Vision, holiness, and calling.", cat: "Prophets" },
    { ref: "Mishnah Berakhot 1:1", title: "Mishnah Berakhot 1:1", desc: "When to recite Shema.", cat: "Mishnah" },
    { ref: "Berakhot 4a", title: "Berakhot 4a", desc: "Talmud study entry point (daf).", cat: "Talmud" },
  ];

  // Holds last loaded text so we can send it to Chavruta
  let selectedRef = null;
  let selectedText = { en: "", he: "", ref: "" };

  function setStatus(text, kind = "ready") {
    if (!elStatus) return;
    elStatus.textContent = text;
    elStatus.dataset.kind = kind;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  // ---- Sanitization helpers ----
  // Goal: turn Sefaria inline HTML-ish strings into clean, dignified plain text.

  const _decoder = document.createElement("textarea");
  function decodeHtmlEntities(str) {
    _decoder.innerHTML = String(str || "");
    return _decoder.value;
  }

  function normalizeNewlines(s) {
    s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    s = s.replace(/[ \t]+\n/g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    return s.trim();
  }

  function stripTagsKeepingStructure(html) {
    let s = String(html || "");
    if (!s) return "";

    // Defensive: drop script/style blocks completely
    s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
    s = s.replace(/<style[\s\S]*?<\/style>/gi, "");

    // Insert spacing at tag boundaries to prevent word glue: ...</i><i>...
    // We do this early, before removing tags.
    s = s.replace(/>\s*</g, ">\n<");

    // Poetry / indentation hints (best-effort)
    s = s.replace(/<span[^>]*class="[^"]*\bpoetry\b[^"]*"[^>]*>/gi, "\n");
    s = s.replace(/<span[^>]*class="[^"]*\bindentAllDouble\b[^"]*"[^>]*>/gi, "\n    ");
    s = s.replace(/<span[^>]*class="[^"]*\bindentAll\b[^"]*"[^>]*>/gi, "\n  ");

    // Line breaks
    s = s.replace(/<br\s*\/?>/gi, "\n");

    // List items: keep as bullet-ish lines
    s = s.replace(/<li[^>]*>/gi, "• ");
    s = s.replace(/<\/li\s*>/gi, "\n");

    // Block-ish tags -> newlines
    s = s.replace(/<\/p\s*>/gi, "\n");
    s = s.replace(/<p[^>]*>/gi, "");
    s = s.replace(/<\/div\s*>/gi, "\n");
    s = s.replace(/<div[^>]*>/gi, "");
    s = s.replace(/<\/tr\s*>/gi, "\n");
    s = s.replace(/<tr[^>]*>/gi, "");
    s = s.replace(/<\/td\s*>/gi, "\t");
    s = s.replace(/<td[^>]*>/gi, "");
    s = s.replace(/<\/table\s*>/gi, "\n");
    s = s.replace(/<table[^>]*>/gi, "");

    // Small/italic/bold should not remove spacing; keep content, remove tags later
    // (No action needed here; just ensuring we don't accidentally delete content.)

    // Remove remaining tags
    s = s.replace(/<\/?[^>]+>/g, "");

    // Decode entities (&nbsp; etc)
    s = decodeHtmlEntities(s);

    // Normalize NBSP to regular space
    s = s.replace(/\u00A0/g, " ");

    // Clean up stray whitespace
    s = s.replace(/[ \t]{3,}/g, "  ");
    s = normalizeNewlines(s);

    return s;
  }

  function sanitizeSefariaText(raw) {
    // raw might already be plain; safe to run regardless
    return stripTagsKeepingStructure(raw);
  }

  function flattenToText(x) {
    if (!x) return "";
    if (typeof x === "string") return x.trim();
    if (Array.isArray(x)) {
      return x.flat(Infinity).filter(v => typeof v === "string" && v.trim()).join("\n").trim();
    }
    return "";
  }

  async function fetchSefaria(ref) {
    const url =
      `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}` +
      `?context=0&commentary=0&pad=0&wrapLinks=0&lang=bi`;

    const resp = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!resp.ok) throw new Error(`Sefaria HTTP ${resp.status}`);

    const data = await resp.json().catch(() => null);
    if (!data) throw new Error("Bad Sefaria response");

    const enRaw = flattenToText(data.text);
    const heRaw = flattenToText(data.he);

    const en = sanitizeSefariaText(enRaw);
    const he = sanitizeSefariaText(heRaw);

    return { en, he, ref: data.ref || ref };
  }

  function renderList(items) {
    if (!elList) return;
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
    selectedRef = ref;
    selectedText = { en: "", he: "", ref };

    if (elRef) elRef.textContent = ref;
    if (elHint) elHint.textContent = "Loading from Sefaria…";
    setStatus("Loading…", "busy");

    if (btnSend) btnSend.disabled = true;
    if (btnOpen) btnOpen.disabled = true;
    if (btnCopy) btnCopy.disabled = true;

    if (elEn) elEn.textContent = "(loading…)";
    if (elHe) elHe.textContent = "(loading…)";

    try {
      const t = await fetchSefaria(ref);
      selectedText = t;

      if (elEn) elEn.textContent = t.en || "(No English returned.)";
      if (elHe) elHe.textContent = t.he || "(No Hebrew returned.)";

      if (elHint) elHint.textContent = "Read here. When ready, send to Chavruta for questions.";
      setStatus("Ready", "ready");

      if (btnSend) btnSend.disabled = false;
      if (btnOpen) btnOpen.disabled = false;
      if (btnCopy) btnCopy.disabled = false;
    } catch (e) {
      selectedText = { en: "", he: "", ref };
      if (elEn) elEn.textContent = "";
      if (elHe) elHe.textContent = "";
      if (elHint) elHint.textContent = "Could not load this text. Try another ref.";
      setStatus(`Error: ${String(e.message || e)}`, "error");
    }
  }

  function applyFilters() {
    const q = (elSearch?.value || "").trim().toLowerCase();
    const cat = (elCategory?.value || "").trim();

    const filtered = TEXTS.filter(t => {
      const matchQ = !q || (t.title + " " + t.ref + " " + (t.desc || "")).toLowerCase().includes(q);
      const matchC = !cat || t.cat === cat;
      return matchQ && matchC;
    });

    renderList(filtered);
  }

  // ✅ Send full sanitized text to Chavruta via sessionStorage (bundle)
  btnSend?.addEventListener("click", () => {
    if (!selectedRef) return;

    const payload = {
      ref: selectedRef,
      en: selectedText.en || "",
      he: selectedText.he || "",
      at: Date.now()
    };

    try {
      sessionStorage.setItem("LN_CHAVRUTA_BUNDLE", JSON.stringify(payload));
    } catch {
      // If storage fails, fall back to ref-only navigation
    }

    const url = `/chavruta.html?q=${encodeURIComponent(selectedRef)}&autosend=1`;
    window.location.href = url;
  });

  btnOpen?.addEventListener("click", () => {
    if (!selectedRef) return;
    // Sefaria accepts encoded refs in the path
    const url = `https://www.sefaria.org/${encodeURIComponent(selectedRef)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  btnCopy?.addEventListener("click", async () => {
    if (!selectedRef) return;
    try {
      await navigator.clipboard.writeText(selectedRef);
      setStatus("Copied ref", "ready");
      setTimeout(() => setStatus("Ready", "ready"), 900);
    } catch {
      prompt("Copy ref:", selectedRef);
    }
  });

  elSearch?.addEventListener("input", applyFilters);
  elCategory?.addEventListener("change", applyFilters);

  // initial render
  applyFilters();
})();
