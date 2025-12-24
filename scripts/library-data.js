// scripts/library-data.js
// Curated library catalog for LuminaNexus (Sefaria tie-in via safe outbound links)

window.LN_LIBRARY = {
  sefariaBase: "https://www.sefaria.org/",
  categories: [
    { key: "torah", label: "Torah / תורה" },
    { key: "psalms", label: "Psalms / תהילים" },
    { key: "wisdom", label: "Wisdom / חכמה" },
    { key: "ethics", label: "Ethics / מוסר" },
    { key: "noahide", label: "Noahide / בני נח" },
    { key: "study", label: "Study / לימוד" },
  ],

  // Each item: id, title, hebrew, category, ref (Sefaria ref), note
  items: [
    // Torah – entry points
    {
      id: "torah_gen_1",
      title: "Genesis 1 (Creation)",
      hebrew: "בראשית א",
      category: "torah",
      ref: "Genesis.1",
      note: "Start at the beginning. Read slowly. Ask: what is peshat here?"
    },
    {
      id: "torah_ex_20",
      title: "Exodus 20 (Ten Commandments)",
      hebrew: "שמות כ",
      category: "torah",
      ref: "Exodus.20",
      note: "Covenant language: boundaries, honor, restraint."
    },
    {
      id: "torah_lev_19",
      title: "Leviticus 19 (Kedoshim)",
      hebrew: "ויקרא יט",
      category: "torah",
      ref: "Leviticus.19",
      note: "Practical holiness: speech, honesty, compassion, justice."
    },
    {
      id: "torah_deut_6",
      title: "Deuteronomy 6 (Shema context)",
      hebrew: "דברים ו",
      category: "torah",
      ref: "Deuteronomy.6",
      note: "Love, teach, bind: what does devotion look like in daily life?"
    },

    // Psalms – gentle daily reading
    {
      id: "ps_1",
      title: "Psalm 1",
      hebrew: "תהילים א",
      category: "psalms",
      ref: "Psalms.1",
      note: "Two paths: counsel vs. rootedness. Read once in English, once in Hebrew."
    },
    {
      id: "ps_23",
      title: "Psalm 23",
      hebrew: "תהילים כג",
      category: "psalms",
      ref: "Psalms.23",
      note: "Comfort without fantasy: steadiness, guidance, calm."
    },
    {
      id: "ps_121",
      title: "Psalm 121",
      hebrew: "תהילים קכא",
      category: "psalms",
      ref: "Psalms.121",
      note: "Guardianship and trust — steady, not superstitious."
    },

    // Wisdom – Mishlei
    {
      id: "mishlei_1",
      title: "Proverbs 1",
      hebrew: "משלי א",
      category: "wisdom",
      ref: "Proverbs.1",
      note: "The beginning of wisdom: discipline, humility, listening."
    },
    {
      id: "mishlei_3",
      title: "Proverbs 3",
      hebrew: "משלי ג",
      category: "wisdom",
      ref: "Proverbs.3",
      note: "Trust, straight paths, healing speech."
    },

    // Ethics – Pirkei Avot
    {
      id: "avot_1",
      title: "Pirkei Avot 1",
      hebrew: "פרקי אבות א",
      category: "ethics",
      ref: "Pirkei_Avot.1",
      note: "Receive → transmit → build. A map for clean character."
    },
    {
      id: "avot_2",
      title: "Pirkei Avot 2",
      hebrew: "פרקי אבות ב",
      category: "ethics",
      ref: "Pirkei_Avot.2",
      note: "Balance, work, humility, and the weight of speech."
    },

    // Noahide – start with your local Seven Laws page + then Sefaria-anchored reading suggestions
    {
      id: "noahide_local",
      title: "Seven Laws (LuminaNexus overview)",
      hebrew: "שבע מצוות בני נח (תקציר האתר)",
      category: "noahide",
      ref: "", // local
      note: "Start here, then bring one question at a time to Chavruta."
    },
    {
      id: "study_pshat",
      title: "How to Study (Peshat-first)",
      hebrew: "איך לומדים (פשט תחילה)",
      category: "study",
      ref: "", // local
      note: "Our method: text → source → clarity → boundaries."
    }
  ]
};
