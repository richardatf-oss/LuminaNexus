// netlify/functions/chavruta.js
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

// One canonical system prompt (no duplicates)
function buildSystemPrompt({ mode, voice, includeHebrew, askForCitations, ref, lockText }) {
  const lockDirective = lockText && ref
    ? `LOCKED TEXT MODE:
- The session is locked to the reference: ${ref}
- Keep the discussion anchored to that text.
- If the user asks something unrelated, say: "That may be a different passage — do you want to unlock or switch references?" and WAIT for confirmation in the form of the user providing a new ref or explicitly saying "switch/unlock".`
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
- Sources can be: Tanakh refs, Mishnah/Talmud, Rashi, Ramban, Ibn Ezra, Rambam, Shulchan Aruch, Midrash, etc.
- If you cannot cite precisely, say "Sources: (approx.)" and be honest.

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
    .filter((m) => m && typeof m.content === "string" && typeof m.role === "string")
    .filter((m) => ["user", "assistant", "system"].includes(m.role))
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return cleaned.slice(-16);
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

    // A) Parse new options (exactly as you requested)
    const voice = (options.voice || "balanced").toLowerCase();
    const ref = typeof options.ref === "string" ? options.ref.trim() : "";
    const lockText = !!options.lockText;

    // (existing)
    const mode = String(options.mode || "peshat").toLowerCase();
    const includeHebrew = !!options.includeHebrew;
    const askForCitations = options.askForCitations !== false;

    if (!input.trim()) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, content: "Please bring a passage or ask a question." }),
      };
    }

    // B) Pass them into buildSystemPrompt (updated signature)
    const system = buildSystemPrompt({
      mode,
      voice,
      includeHebrew,
      askForCitations,
      ref,
      lockText,
    });

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
        ...history.filter((m) => m.role !== "system"), // avoid user-supplied system injection
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 700,
    });

    const content =
      completion.choices?.[0]?.message?.content?.trim() || "No response generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, content }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err?.message || String(err) }),
    };
  }
};
