// scripts/library-data.js
// A small, curated seed catalog (expand anytime)

window.LUMINA_LIBRARY = [
  {
    id: "parashah",
    category: "Torah",
    title: "Weekly Parashah (Entry)",
    hebrewTitle: "פרשת השבוע (שער)",
    description:
      "Start with the weekly portion: peshat framing, themes, and one clear question.",
    hebrewDescription:
      "להתחיל בפרשה השבועית: מסגרת פשט, נושאים, ושאלה אחת ברורה.",
    ref: "Genesis 1",
    sefariaPath: "Genesis.1",
    chavrutaPrompt:
      "I’d like to study the weekly parashah. Please give a peshat-first overview, then ask me 3 clarifying questions."
  },
  {
    id: "tehillim",
    category: "Psalms",
    title: "Tehillim (Psalms)",
    hebrewTitle: "תהילים",
    description:
      "Short, repeatable prayers. Learn a psalm slowly—line by line.",
    hebrewDescription:
      "תפילות קצרות וחוזרות. ללמוד מזמור לאט — שורה שורה.",
    ref: "Psalms 23",
    sefariaPath: "Psalms.23",
    chavrutaPrompt:
      "Let’s study Psalm 23. Please give a peshat-first reading, define key words, and then ask me what line I’m stuck on."
  },
  {
    id: "mishlei",
    category: "Wisdom",
    title: "Proverbs (Mishlei)",
    hebrewTitle: "משלי",
    description:
      "Character, speech, honesty, humility — daily craft of righteous living.",
    hebrewDescription:
      "מידות, דיבור, יושר, ענווה — מלאכת היום־יום של חיים ישרים.",
    ref: "Proverbs 1",
    sefariaPath: "Proverbs.1",
    chavrutaPrompt:
      "Let’s study Proverbs 1. Please summarize the chapter’s peshat and extract 5 practical principles for daily life."
  },
  {
    id: "avot",
    category: "Ethics",
    title: "Pirkei Avot (Bounded)",
    hebrewTitle: "פרקי אבות (בגבולות)",
    description:
      "A classic ethics text. Keep it practical; avoid mystical inflation.",
    hebrewDescription:
      "טקסט מוסרי יסודי. לשמור על מעשי; בלי “ניפוח מיסטי”.",
    ref: "Pirkei Avot 1",
    sefariaPath: "Pirkei_Avot.1",
    chavrutaPrompt:
      "Let’s study Pirkei Avot 1. Please explain each mishnah in peshat and give one concrete practice for the week."
  },
  {
    id: "noahide-7",
    category: "Noahide",
    title: "Seven Laws Reading",
    hebrewTitle: "קריאה בשבע מצוות",
    description:
      "Start with the Seven Laws page, then bring questions one at a time.",
    hebrewDescription:
      "להתחיל בדף שבע מצוות, ואז להביא שאלות אחת אחת.",
    ref: "Sanhedrin 56a (topic)",
    sefariaPath: "Sanhedrin.56a",
    chavrutaPrompt:
      "I want to learn the Seven Laws in a Torah-first way. Please keep it source-first, cautious, and practical."
  },
  {
    id: "how-to-study",
    category: "Process",
    title: "How to Study Here",
    hebrewTitle: "איך ללמוד כאן",
    description:
      "Pick one text. Ask one question. Proceed slowly with dignity.",
    hebrewDescription:
      "בחר טקסט אחד. שאל שאלה אחת. התקדם לאט בכבוד.",
    ref: "Guide",
    sefariaPath: "",
    chavrutaPrompt:
      "I’m new here. Help me choose one text and one question for today, with a slow, Torah-first approach."
  }
];
