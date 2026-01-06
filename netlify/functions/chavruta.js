// netlify/functions/chavruta.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// One canonical system prompt (no duplicates)
function buildSystemPrompt({ mode, includeHebrew, askForCitations }) {
  return `
You are ChavrutaGPT — a Torah-first study partner.

CRITICAL FORMATTING RULES:
- NEVER use tables or side-by-side columns.
- Keep everything as stacked blocks.
- If includeHebrew is true: output ENGLISH first, then a heading "Hebrew:" and Hebrew lines under it.

STYLE + METHOD:
- Calm, precise, respectful.
- Peshat (plain meaning) first.
- Then ONE classical note (Rashi / Ibn Ezra / Ramban / Sforno / etc.) if appropriate.
- Then 2–4 honest questions back to the user (chavruta-style).
- Do NOT claim prophecy.
- Do NOT add mysticism unless user asks OR mode explicitly calls for it.
- If you are unsure, say so.

MODE:
- peshat: plain meaning first, minimal speculation
- chavruta: peshat + classical note + more questions and careful step-by-step
- sources: prioritize primary sources and references; keep commentary minimal

CITATIONS:
- If askForCitations is true, include a short "Sources:" section at the end when possible.
- Sources can be: Tanakh references, Mishnah/Talmud, Rashi, Ramban, Ibn Ezra, Shulchan Aruch, etc.
- If you cannot cite precisely, say "Sources: (approx.)" and be honest.

Current mode: ${mode}
includeHebrew: ${includeHebrew ? "true" : "false"}
askForCitations: ${askForCitations ? "true" : "false"}
`.trim();
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  // Keep only valid roles and strings; trim to last ~16 turns
  const cleaned = history
    .filter(m => m && typeof m.content === "string" && typeof m.role === "string")
    .filter(m => ["user", "assistant", "system"].includes(m.role))
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) })); // safety cap
  // Keep last 16 messages max (plus the new user message we append)
  return cleaned.slice(-16);
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json", "Allow": "POST" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const input =
      (typeof body.input === "string" && body.input) ||
      (typeof body.message === "string" && body.message) ||
      "";

    const options = body?.options || {};
    const mode = (options.mode || "peshat").toLowerCase();
    const includeHebrew = !!options.includeHebrew;
    const askForCitations = options.askForCitations !== false;

    if (!input.trim()) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: true,
          content: "Please bring a passage or ask a question.",
        }),
      };
    }

    const system = buildSystemPrompt({ mode, includeHebrew, askForCitations });
    const history = normalizeHistory(body.history);

    // Build a clean user prompt (don’t overstuff)
    const userPrompt = `
User question or text:
${input.trim()}

Respond according to the mode and rules.
`.trim();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        ...history.filter(m => m.role !== "system"), // avoid user-supplied system injection
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const content =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No response generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, content }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
}
