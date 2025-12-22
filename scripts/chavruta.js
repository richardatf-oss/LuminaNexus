// LuminaNexus — ChavrutaGPT (prompt builder)
// Friendly UX: autosave, live prompt, clear status, no "Open ChatGPT" button.

const $ = (sel) => document.querySelector(sel);

const mode = $("#mode");
const source = $("#source");
const input = $("#input");
const promptOut = $("#promptOut");

const buildBtn = $("#build");
const copyBtn = $("#copy");
const resetBtn = $("#reset");
const status = $("#status");

const KEY = "lnx_chavruta_v2";

const templates = {
  peshat: ({ source, input }) => `
ChavrutaGPT — Torah (peshat first)

Reference (optional):
${source || "(none provided)"}

Text (paste 1–5 verses if possible):
${input || "(paste passage here)"}

Instructions:
1) Give the peshat (plain meaning) in a short paragraph.
2) Give ONE classical note (Rashi / Ramban / Ibn Ezra / etc.) only if it clarifies the peshat.
3) Ask 3 questions:
   - one about the text,
   - one about character,
   - one about action.
4) Give ONE next step I can practice today (small, real, not performative).

Boundaries: no psak, no conversion guidance, no inflated claims, no urgency.
`.trim(),

  laws: ({ source, input }) => `
ChavrutaGPT — Seven Laws (practice)

Law/Topic:
${source || "(choose one law or theme)"}

Situation / Question:
${input || "(describe your situation in 3–8 sentences)"}

Instructions:
1) State the principle plainly (simple and clear).
2) Give 2 practical examples (everyday, non-technical).
3) Name 1 boundary: where I should seek qualified guidance or avoid overreach.
4) Give 1 next step I can do today (small and honest).

Tone: calm, dignified, Torah-first.
`.trim(),

  ivrit: ({ source, input }) => `
ChavrutaGPT — Hebrew (concrete)

Word/Root:
${source || "(enter a Hebrew word/root)"}

Context (optional):
${input || "(optional: paste a verse/sentence or describe what you want to express)"}

Instructions:
1) Give pronunciation guidance (simple and readable).
2) Give the root meaning + 3 related words/forms.
3) Give one short example sentence.
4) Optional: one gentle grammar note (only if helpful).

Keep it concrete and respectful.
`.trim(),

  kabbalah: ({ source, input }) => `
ChavrutaGPT — Ethical Kabbalah (bounded)

Theme:
${source || "(example: gevurah as restraint; truth; humility; repair)"}

Context:
${input || "(describe what you’re working on inwardly—plain and honest)"}

Instructions:
1) Treat Kabbalah as metaphor for character and responsibility (not power).
2) Give 3 reflection prompts that lead to practical repair.
3) Give 1 boundary reminder (no theurgy, no incantations, no urgency).
4) Give 1 next step that is concrete and modest.

Tone: sober, gentle, accountable.
`.trim(),

  physics: ({ source, input }) => `
ChavrutaGPT — Physics & Order (analogy only)

Topic:
${source || "(example: fields, resonance, measurement, symmetry, entropy)"}

Question/Context:
${input || "(state your question clearly)"}

Instructions:
1) Explain the idea plainly (no hype).
2) Give an “analogy-only” bridge to Torah ethics (label it as analogy).
3) Include one caution: science is not proof of theology.
4) Give one grounded takeaway (humility, clarity, discipline, responsibility).

Tone: honest, non-coercive.
`.trim(),
};

function setStatus(msg) {
  if (!status) return;
  status.textContent = msg || "";
  if (msg) setTimeout(() => (status.textContent = ""), 1400);
}

function readState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeState() {
  const data = {
    mode: mode?.value || "peshat",
    source: source?.value || "",
    input: input?.value || "",
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore storage failures
  }
}

function loadState() {
  const s = readState();
  if (!s) return;
  if (mode && s.mode) mode.value = s.mode;
  if (source && typeof s.source === "string") source.value = s.source;
  if (input && typeof s.input === "string") input.value = s.input;
}

function buildPrompt() {
  const key = mode?.value || "peshat";
  const tmpl = templates[key] || templates.peshat;

  const src = (source?.value || "").trim();
  const inp = (input?.value || "").trim();

  const out = tmpl({ source: src, input: inp });
  if (promptOut) promptOut.textContent = out;

  writeState();
  setStatus("Prompt built.");
}

async function copyPrompt() {
  const text = promptOut?.textContent || "";
  if (!text.trim()) {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied ✓");
  } catch {
    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setStatus("Copied ✓");
    } catch {
      setStatus("Copy failed.");
    }
  }
}

function resetAll() {
  if (mode) mode.value = "peshat";
  if (source) source.value = "";
  if (input) input.value = "";
  try {
    localStorage.removeItem(KEY);
  } catch {}
  buildPrompt();
  setStatus("Reset.");
}

loadState();
buildPrompt();

// Live feel: rebuild on input (debounced)
let t = null;
function scheduleBuild() {
  writeState();
  clearTimeout(t);
  t = setTimeout(buildPrompt, 180);
}

mode?.addEventListener("change", scheduleBuild);
source?.addEventListener("input", scheduleBuild);
input?.addEventListener("input", scheduleBuild);

buildBtn?.addEventListener("click", buildPrompt);
copyBtn?.addEventListener("click", copyPrompt);
resetBtn?.addEventListener("click", resetAll);
