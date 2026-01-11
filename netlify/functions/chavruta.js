// /netlify/functions/chavruta.js
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function voiceDirective(voice) {
  switch (voice) {
    case "rashi":
      return `Classical note MUST prioritize Rashi (or Rashi-style close reading).`;
    case "ibn_ezra":
      return `Classical note MUST prioritize Ibn Ezra (peshat + grammar/linguistic precision).`;
    case "ramban":
      return `Classical note MUST prioritize Ramban (peshat + deeper covenantal/theological framing; avoid mystical claims unless asked).`;
    case "sforno":
      return `Classical note MUST prioritize Sforno (ethical/teleological emphasis; what the text teaches for life).`;
    case "rambam":
      return `Classical note MUST prioritize Rambam (philosophical clarity; Mishneh Torah / Guide framing where relevant).`;
    default:
      return `Classical note should be a balanced choice (Rashi / Ibn Ezra / Ramban / Sforno / Rambam / etc.) based on best fit.`;
  }
}

function buildSystemPrompt({ mode, voice, includeHebrew, askForCitations, ref, lockText }) {
  const lockDirective = lockText && ref
    ? `LOCKED TEXT MODE:
- The session is locked to the reference: ${ref}
- Keep the discussion anchored to that text.
- If the user asks something unrelated, say: "That may be a different passage — do you want to unlock or switch references?" and wait for the user to explicitly unlock or provide a new ref.`
    : `UNLOCKED TEXT MODE:
- If a reference is provided, use it as the default anchor, but you may follow the user's question if it clearly shifts to another text.`;

  return `
You are ChavrutaGPT — a Torah-first study partner.

CRITICAL FORMATTING RULES:
- NEVER use tables or side-by-side columns.
- Keep everything as stacked blocks.
- If includeHebrew is true: output ENGLISH first, then a heading "Hebrew:" and Hebrew lines under it.

STYLE + METHOD:
- Calm, precise, respectful.
- Peshat (plain meaning) first.
- Then ONE classical note (Rashi / Ibn Ezra / Ramban / Sforno / Rambam / etc.) if appropriate.
- Then 2–6 honest questions back to the user (chavruta-style).
- Do NOT claim prophecy.
- Do NOT add mysticism unless user asks OR mode explicitly calls for it.
- If you are unsure, say so.
- If the user provides only a reference but not the quoted text, you may proceed generally but ASK for the exact Hebrew/line for precision.
- Do not quote modern copyrighted translations. Paraphrase in your own words.

TEXT CONTEXT:
- Reference (if any): ${ref ? ref : "(none)"}
${lockDirective}

MODE:
- peshat: plain meaning first, minimal speculation
- chavruta: peshat + classical note + more questions and careful step-by-step
- sources: prioritize primary sources and references; keep commentary minimal

CLASSICAL VOICE:
${voiceDirective(voice)}

CITATIONS:
- If askForCitations is true, include a short "Sources:" section at the end when possible.
- If you cannot cite precisely, say "Sources: (approx.)" and be honest.

STRUCTURED SOURCES (IMPORTANT):
- ALSO output a final line that begins EXACTLY with: "SOURCES_JSON:"
- After that tag, output a valid JSON array of sources: [{"title":"...","url":"..."}]
- Keep it on a single line.
- If you have no sources, output: SOURCES_JSON: []

Current mode: ${mode}
voice: ${voice}
includeHebrew: ${includeHebrew ? "true" : "false"}
askForCitations: ${askForCitations ? "true" : "false"}
ref: ${ref ? ref : "(none)"}
lockText: ${lockText ? "true" : "false"}
`.trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  const cleaned = history
    .filter(m => m && typeof m.content === "string" && typeof m.role === "string")
    .filter(m => ["user", "assistant"].includes(m.role))
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return cleaned.slice(-16);
}

// Extract sources array from the SOURCES_JSON line, and remove it from the visible content.
function extractStructuredSources(fullText) {
  if (!fullText || typeof fullText !== "string") {
    return { content: "No response generated.", sources: [] };
  }

  const lines = fullText.split(/\r?\n/);
  const idx = lines.findIndex(l => l.trim().startsWith("SOURCES_JSON:"));
  if (idx === -1) {
    // No structured line — return text as-is
    return { content: fullText.trim(), sources: [] };
  }

  const tagLine = lines[idx].trim();
  const jsonPart = tagLine.replace(/^SOURCES_JSON:\s*/, "").trim();

  let sources = [];
  try {
    const parsed = JSON.parse(jsonPart);
    if (Array.isArray(parsed)) {
      sources = parsed
        .filter(x => x && typeof x === "object")
        .map(x => ({
          title: typeof x.title === "string" ? x.title : "Source",
          url: typeof x.url === "string" ? x.url : null
        }));
    }
  } catch (_) {
    sources = [];
  }

  // Remove the SOURCES_JSON line from the displayed content
  const visible = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { content: visible || fullText.trim(), sources };
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json", Allow: "POST" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const input =
      (typeof body.input === "string" && body.input) ||
      (typeof body.message === "string" && body.message) ||
      "";

    const options = body?.options || {};

    const mode = String(options.mode || "peshat").toLowerCase();
    const voice = String(options.voice || "balanced").toLowerCase();
    const includeHebrew = !!options.includeHebrew;
    const askForCitations = options.askForCitations !== false;

    const ref = typeof options.ref === "string" ? options.ref.trim() : "";
    const lockText = !!options.lockText;

    if (!input.trim()) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, content: "Please bring a passage or ask a question.", sources: [] }),
      };
    }

    const system = buildSystemPrompt({ mode, voice, includeHebrew, askForCitations, ref, lockText });
    const history = normalizeHistory(body.history);

    const userPrompt = `
Text reference (if any): ${ref || "(none)"}
Lock text: ${lockText ? "true" : "false"}

User question or text:
${input.trim()}

Respond according to the mode and rules.
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...history,
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 850,
    });

    const raw =
      completion.choices?.[0]?.message?.content?.trim() || "No response generated.";

    const { content, sources } = extractStructuredSources(raw);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, content, sources }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err?.message || String(err), sources: [] }),
    };
  }
};
