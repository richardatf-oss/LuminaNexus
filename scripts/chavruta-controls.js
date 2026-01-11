(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    status: $("#statusPill"),
    sourcesCount: $("#sourcesCount"),
    chatlog: $("#chatlog"),
    composer: $("#composer"),
    passage: $("#passageInput"),
    question: $("#questionInput"),
    ref: $("#refInput"),
    presetGen11: $("#presetGen11"),
    textPreset: $("#textPreset"),
    includeHebrew: $("#includeHebrew"),
    includeCitations: $("#includeCitations"),
    lockText: $("#lockText"),
    openSefaria: $("#openSefaria"),
    toggleAdvanced: $("#toggleAdvanced"),
    advancedPanel: $("#advancedPanel"),
    btnStop: $("#btnStop"),
    btnNew: $("#btnNew"),
    btnClear: $("#btnClear"),
    btnExport: $("#btnExport"),
  };

  // --- Basic UI state ---
  let sources = []; // app can populate via window.__CHAVRUTA_SOURCES if desired
  let aborted = false;

  function setStatus(text) {
    if (!els.status) return;
    els.status.textContent = text;
  }

  function setSourcesCount(n) {
    if (!els.sourcesCount) return;
    els.sourcesCount.textContent = n > 0 ? `(${n})` : "";
    els.sourcesCount.title = n > 0 ? "Sources are available for the last answer" : "Sources appear after a response";
  }

  function appendMsg(kind, text) {
    const div = document.createElement("div");
    div.className = `msg ${kind}`;
    div.textContent = text;
    els.chatlog.appendChild(div);
    els.chatlog.scrollTop = els.chatlog.scrollHeight;
  }

  // --- Tabs (visual only; your app can hook in as needed) ---
  $$(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      // Optional: if user clicks Sources tab but none exist, gently message
      if (btn.dataset.tab === "sources" && (!sources || sources.length === 0)) {
        appendMsg("system", "No sources yet. Ask a question first — sources will appear after an answer.");
      }
    });
  });

  // --- Advanced panel toggle ---
  if (els.toggleAdvanced && els.advancedPanel) {
    els.toggleAdvanced.addEventListener("click", () => {
      const hidden = els.advancedPanel.classList.toggle("hidden");
      els.advancedPanel.setAttribute("aria-hidden", hidden ? "true" : "false");
      els.toggleAdvanced.textContent = hidden ? "Advanced" : "Hide Advanced";
    });
  }

  // --- Voice pills (store selection for your app to read) ---
  window.__CHAVRUTA_PREFS = window.__CHAVRUTA_PREFS || {
    voice: "balanced",
    includeHebrew: true,
    citations: true
  };

  $$(".pill").forEach(p => {
    p.addEventListener("click", () => {
      $$(".pill").forEach(x => x.classList.remove("is-active"));
      p.classList.add("is-active");
      window.__CHAVRUTA_PREFS.voice = p.dataset.voice || "balanced";
    });
  });

  // --- Toggles ---
  if (els.includeHebrew) {
    els.includeHebrew.addEventListener("change", () => {
      window.__CHAVRUTA_PREFS.includeHebrew = !!els.includeHebrew.checked;
    });
  }
  if (els.includeCitations) {
    els.includeCitations.addEventListener("change", () => {
      window.__CHAVRUTA_PREFS.citations = !!els.includeCitations.checked;
    });
  }

  // --- Presets ---
  if (els.presetGen11) {
    els.presetGen11.addEventListener("click", () => {
      els.ref.value = "Genesis 1:1";
      if (!els.lockText.checked) {
        els.passage.value = "In the beginning God created the heavens and the earth.\nבְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃";
      }
      appendMsg("system", "Loaded Genesis 1:1. Now ask one clear question.");
    });
  }

  if (els.textPreset) {
    els.textPreset.addEventListener("change", () => {
      const v = els.textPreset.value;
      if (els.lockText.checked) {
        appendMsg("system", "Text is locked. Uncheck Lock text if you want presets to fill the passage box.");
        return;
      }
      if (v === "gen1_1") {
        els.ref.value = "Genesis 1:1";
        els.passage.value = "In the beginning God created the heavens and the earth.\nבְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃";
      } else if (v === "shema") {
        els.ref.value = "Deuteronomy 6:4-5";
        els.passage.value = "Hear, O Israel: the LORD is our God, the LORD is one...\nשְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד׃";
      } else if (v === "ex20_2") {
        els.ref.value = "Exodus 20:2";
        els.passage.value = "I am the LORD your God, who brought you out...\nאָנֹכִי יְהוָה אֱלֹהֶיךָ אֲשֶׁר הוֹצֵאתִיךָ...";
      }
      appendMsg("system", "Preset loaded. Now ask one clear question.");
    });
  }

  // --- Open Sefaria ---
  if (els.openSefaria) {
    els.openSefaria.addEventListener("click", () => {
      const ref = (els.ref.value || "").trim();
      if (!ref) {
        appendMsg("system", "Type a reference first (e.g., Genesis 1:1).");
        return;
      }
      const q = encodeURIComponent(ref.replace(/\s+/g, " "));
      window.open(`https://www.sefaria.org/${q}`, "_blank", "noopener,noreferrer");
    });
  }

  // --- Quick question helpers ---
  $$("[data-quick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.quick;
      const ref = (els.ref.value || "this passage").trim();
      const templates = {
        word: `What does the key word or phrase mean here in ${ref}?`,
        structure: `What is the plain sequence/structure of the verse(s) in ${ref}?`,
        why: `What is the simplest peshat reason for this detail in ${ref}?`
      };
      els.question.value = templates[type] || "";
      els.question.focus();
    });
  });

  // --- Stop / New / Clear / Export ---
  if (els.btnStop) {
    els.btnStop.addEventListener("click", () => {
      aborted = true;
      setStatus("Stopped");
      appendMsg("system", "Stopped. You can edit the question and press Ask again.");
      // If your app supports AbortController, it can read window.__CHAVRUTA_ABORT = true
      window.__CHAVRUTA_ABORT = true;
    });
  }

  if (els.btnNew) {
    els.btnNew.addEventListener("click", () => {
      aborted = false;
      window.__CHAVRUTA_ABORT = false;
      setStatus("Ready");
      els.question.value = "";
      appendMsg("system", "New question. Keep the same passage or choose another.");
      els.question.focus();
    });
  }

  if (els.btnClear) {
    els.btnClear.addEventListener("click", () => {
      els.ref.value = "";
      els.passage.value = "";
      els.question.value = "";
      setStatus("Ready");
      appendMsg("system", "Cleared. Add a reference or passage, then ask one question.");
    });
  }

  function exportChat() {
    const text = Array.from(els.chatlog.querySelectorAll(".msg"))
      .map(m => {
        if (m.classList.contains("user")) return `You: ${m.textContent}`;
        if (m.classList.contains("ai")) return `Chavruta: ${m.textContent}`;
        return `Note: ${m.textContent}`;
      })
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chavruta-export.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (els.btnExport) {
    els.btnExport.addEventListener("click", exportChat);
  }

  // --- Composer submit: we *also* emit a custom event for your app to catch ---
  if (els.composer) {
    els.composer.addEventListener("submit", (e) => {
      e.preventDefault();
      aborted = false;
      window.__CHAVRUTA_ABORT = false;

      const payload = {
        reference: (els.ref.value || "").trim(),
        passage: (els.passage.value || "").trim(),
        question: (els.question.value || "").trim(),
        prefs: { ...window.__CHAVRUTA_PREFS }
      };

      if (!payload.question) {
        appendMsg("system", "Please type one clear question before pressing Ask.");
        return;
      }

      appendMsg("user", payload.question);
      setStatus("Working…");

      // Dispatch event: your existing app can listen for this.
      window.dispatchEvent(new CustomEvent("chavruta:ask", { detail: payload }));
    });
  }

  // --- Allow your app to push sources/results into the UI ---
  window.__CHAVRUTA_UI = {
    setAnswer(text) {
      if (aborted || window.__CHAVRUTA_ABORT) return;
      appendMsg("ai", text);
      setStatus("Ready");
    },
    setSources(list) {
      sources = Array.isArray(list) ? list : [];
      setSourcesCount(sources.length);
    },
    setStatus
  };

  // initial
  setSourcesCount(0);
  setStatus("Ready");
})();
