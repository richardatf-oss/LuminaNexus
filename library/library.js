(() => {
  const $ = (sel) => document.querySelector(sel);
  const q = $("#q");
  const results = $("#results");
  const meta = $("#resultsMeta");
  const filterBtns = Array.from(document.querySelectorAll("[data-filter]"));
  const btnSefariaSearch = $("#btnSefariaSearch");

  // ---- Real catalog (edit this list as your Library grows) ----
  // "sefra" can be:
  //   - a Sefaria text URL (preferred)
  //   - OR a search string fallback (will go to Sefaria search)
  const CATALOG = [
    {
      title: "Start Here: How to Study Calmly",
      kind: "foundations",
      tags: ["clarity", "steps", "minimal"],
      note: "A short method: question → definitions → sources → one action.",
      href: "/chavruta/",
      sefaria: "study"
    },
    {
      title: "Tanakh (Sefaria Library)",
      kind: "tanakh",
      tags: ["tanakh", "hebrew bible", "primary"],
      note: "Go straight into Tanakh on Sefaria.",
      href: "https://www.sefaria.org/texts/Tanakh",
      sefaria: "https://www.sefaria.org/texts/Tanakh"
    },
    {
      title: "Psalms / Tehillim (Sefaria)",
      kind: "tanakh",
      tags: ["psalms", "tehillim"],
      note: "A direct entry for prayerful reading and moral reflection.",
      href: "https://www.sefaria.org/Psalms",
      sefaria: "https://www.sefaria.org/Psalms"
    },
    {
      title: "Mishnah (Sefaria)",
      kind: "tanakh",
      tags: ["mishnah", "oral law"],
      note: "For structured ethics and legal discussion (advanced).",
      href: "https://www.sefaria.org/texts/Mishnah",
      sefaria: "https://www.sefaria.org/texts/Mishnah"
    },
    {
      title: "The 231 Celestial Gates (Map)",
      kind: "gates",
      tags: ["231", "letters", "alignments"],
      note: "Letters as stars; pairings as gates; alignments as moral patterns.",
      href: "/map/",
      sefaria: "letters"
    },
    {
      title: "Noahide Orientation",
      kind: "noahide",
      tags: ["noahide", "ethics", "clarity"],
      note: "No mythic framing. No astrology. Calm moral language.",
      href: "/about/",
      sefaria: "Noahide"
    },
    {
      title: "Sefaria Topics Index",
      kind: "tools",
      tags: ["topics", "source sheets", "index"],
      note: "A wide entry point: topics and curated source sheets.",
      href: "https://www.sefaria.org/topics",
      sefaria: "https://www.sefaria.org/topics"
    }
  ];

  let activeFilter = "all";

  function normalize(s) {
    return (s || "").toLowerCase().trim();
  }

  function matches(entry, query) {
    if (!query) return true;
    const hay = normalize(`${entry.title} ${entry.kind} ${(entry.tags||[]).join(" ")} ${entry.note}`);
    return hay.includes(query);
  }

  function passesFilter(entry) {
    if (activeFilter === "all") return true;
    return entry.kind === activeFilter;
  }

  function sefariaSearchUrl(query) {
    const q = encodeURIComponent(query || "");
    // Sefaria uses q= in search; this is a stable pattern for their search entrypoint
    return `https://www.sefaria.org/search?q=${q}`;
  }

  function render(list) {
    results.innerHTML = "";

    const frag = document.createDocumentFragment();

    for (const item of list) {
      const card = document.createElement("div");
      card.style.marginTop = "10px";

      const a = document.createElement("a");
      a.className = "door";
      a.href = item.href;
      if (item.href.startsWith("http")) {
        a.target = "_blank";
        a.rel = "noopener";
      }

      const t = document.createElement("div");
      t.className = "door-title";
      t.textContent = item.title;

      const s = document.createElement("div");
      s.className = "door-sub";
      s.textContent = item.note;

      const m = document.createElement("div");
      m.className = "micro";
      m.style.marginTop = "8px";
      m.textContent = `${item.kind} · ${(item.tags || []).join(" · ")}`;

      a.appendChild(t);
      a.appendChild(s);
      a.appendChild(m);

      // Secondary row: “Open in Sefaria”
      const row = document.createElement("div");
      row.className = "lib-row";

      const sef = document.createElement("a");
      sef.className = "mini-link";
      sef.textContent = "Open in Sefaria ↗";
      sef.target = "_blank";
      sef.rel = "noopener";

      if (item.sefaria && item.sefaria.startsWith("http")) {
        sef.href = item.sefaria;
      } else {
        // fallback to search
        sef.href = sefariaSearchUrl(item.sefaria || item.title);
      }

      row.appendChild(sef);

      const local = document.createElement("span");
      local.className = "micro";
      local.style.marginLeft = "10px";
      local.textContent = "— curated entry";
      row.appendChild(local);

      card.appendChild(a);
      card.appendChild(row);

      frag.appendChild(card);
    }

    results.appendChild(frag);
    meta.textContent = `${list.length} result${list.length === 1 ? "" : "s"} · filter: ${activeFilter}`;
  }

  function update() {
    const query = normalize(q.value);
    const list = CATALOG.filter(passesFilter).filter(e => matches(e, query));
    render(list);
  }

  // Filter buttons
  for (const b of filterBtns) {
    b.addEventListener("click", () => {
      activeFilter = b.dataset.filter || "all";
      for (const x of filterBtns) x.style.opacity = (x === b) ? "1" : ".75";
      update();
    });
  }

  // Jump to Sefaria search
  btnSefariaSearch.addEventListener("click", () => {
    const query = (q.value || "").trim();
    const url = sefariaSearchUrl(query || "Tanakh");
    window.open(url, "_blank", "noopener");
  });

  q.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      // Enter = Sefaria search (fast path)
      btnSefariaSearch.click();
    }
  });

  q.addEventListener("input", update);

  // Init
  if (filterBtns[0]) filterBtns[0].style.opacity = "1";
  for (let i = 1; i < filterBtns.length; i++) filterBtns[i].style.opacity = ".75";
  update();
})();
