// Hardening: grab by id, but also support name fallback if the markup drifted.
const mode = document.getElementById("mode") || document.querySelector('[name="mode"]');
const source = document.getElementById("source") || document.querySelector('[name="source"]');
const input = document.getElementById("input") || document.querySelector('[name="input"]');
const promptOut = document.getElementById("promptOut");

const buildBtn = document.getElementById("build");
const copyBtn = document.getElementById("copy");

const templates = {
  peshat: ({ source, input }) => `
ChavrutaGPT — Torah (peshat first)

Text/Reference:
${source || "(none provided)"}

Passage:
${input || "(paste passage here)"}

Instructions:
1) Give the peshat (plain meaning) in a short paragraph.
2) Give ONE classical note (Rashi / Ramban / Ibn Ezra / etc.) only if it clarifies the peshat.
3) Ask 3 questions:
   - one about the text,
   - one about character,
   - one about action.
4) Give ONE next step I can practice today (small, real, not performative).
Boundaries: no psak, no conversion guidance, no inflated claims.
`.trim(),

  laws: ({ source, input }) => `
ChavrutaGPT — Seven Laws (practice)

Law/Topic:
${source || "(choose one law or theme)"}

Situation:
${input || "(describe your situation in 3–6 sentences)"}

Instructions:
1) State the principle in plain meaning (simple and clear).
2) Give 2 practical examples (everyday, non-technical).
3) Name 1 boundary (where I should seek qualified guidance or avoid overreach).
4) Give 1 next step I can do today (small and honest).
Tone: calm, dignified, Torah-first.
`.trim(),

  ivrit: ({ source, input }) => `
ChavrutaGPT — Hebrew (concrete)

Word/Root:
${source || "(enter a Hebrew word/root)"}

Context (optional):
${input || "(optional: paste the verse/sentence, or describe what you want to express)"}

Instructions:
1) Give pronunciation guidance (simple, readable).
2) Give root meaning and 3 related words (or forms).
3) Give one usage example in a short sentence.
4) Optional: one gentle grammar note (only if helpful).
Keep it concrete and respectful.
`.trim(),

  kabbalah: ({ source, input }) => `
ChavrutaGPT — Ethical Kabbalah (bounded)

Theme:
${source || "(example: gevurah as restraint; truth; humility; repair)"}

Context:
${input || "(describe what you’re working on inwardly—no grand claims, just honest detail)"}

Instructions:
1) Treat Kabbalah as metaphor for character and responsibility.
2) Give 3 reflection prompts that lead to practical repair.
3) Give 1 boundary reminder (no theurgy, no power-claims, no urgency).
4) Give 1 next step that is concrete and modest.
`.trim(),

  physics: ({ source, input }) => `
ChavrutaGPT — Physics & Order (analogy only)

Topic:
${source || "(example: fields, resonance, order, measurement)"}

Question/Context:
${input || "(state your question clearly)"}

Instructions:
1) Explain the idea plainly (no hype).
2) Give an “analogy-only” bridge to Torah ethics (label it as analogy).
3) Include one caution: science is not proof of theology.
4) Give one grounded takeaway (humility, clarity, discipline, responsibility).
Tone: sober, honest, non-coercive.
`.trim(),
};

function saveState() {
  if (mode) localStorage.setItem("lnx_chavruta_mode", mode.value);
  if (source) localStorage.setItem("lnx_chavruta_source", source.value);
  if (input) localStorage.setItem("lnx_chavruta_input", input.value);
}

function loadState() {
  const m = localStorage.getItem("lnx_chavruta_mode");
  const s = localStorage.getItem("lnx_chavruta_source");
  const i = localStorage.getItem("lnx_chavruta_input");
  if (mode && m) mode.value = m;
  if (source && s) source.value = s;
  if (input && i) input.value = i;
}

function buildPrompt() {
  const key = mode?.value || "peshat";
  const tmpl = templates[key] || templates.peshat;

  const src = (source?.value || "").trim();
  const inp = (input?.value || "").trim();

  const out = tmpl({ source: src, input: inp });
  if (promptOut) promptOut.textContent = out;

  saveState();
}

async function copyPrompt() {
  const text = promptOut?.textContent || "";
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    if (copyBtn) {
      copyBtn.textContent = "Copied ✓";
      setTimeout(() => (copyBtn.textContent = "Copy Prompt"), 1200);
    }
  } catch {
    if (copyBtn) {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => (copyBtn.textContent = "Copy Prompt"), 1200);
    }
  }
}

loadState();

buildBtn?.addEventListener("click", buildPrompt);
copyBtn?.addEventListener("click", copyPrompt);

mode?.addEventListener("change", saveState);
source?.addEventListener("input", saveState);
input?.addEventListener("input", saveState);

// Optional: build once on load so it "feels alive"
setTimeout(buildPrompt, 50);
