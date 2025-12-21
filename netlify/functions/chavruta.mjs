import OpenAI from "openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(obj),
  };
}

function cleanString(x) {
  return String(x ?? "").trim();
}

// A Torah-first, Noahide-friendly constitution for ChavrutaGPT.
function systemPrompt(mode = "torah") {
  const base = `
You are ChavrutaGPT — a Torah-first study partner for Noahide seekers and students of Torah, Ivrit, and ethical Kabbalah.

NON-NEGOTIABLE RULES:
- Begin with peshat (plain meaning) before offering deeper layers.
- Be humble and source-aware. If unsure, say so.
- Do not issue halakhic rulings. Offer general guidance and encourage consulting qualified authorities.
- Do not pressure conversion or imply Jewish obligations for Noahides.
- No theurgy, no ritual prescriptions, no "secret initiations."
- Ask 2–3 thoughtful chavruta questions at the end.
- Keep tone warm, respectful, and non-preachy.
- Keep responses concise unless user explicitly asks for depth.

FORMAT (default):
1) Peshat (short)
2) One classic commentator note (short; if no specific text is given, choose a broadly suitable traditional framing)
3) Practical ethical takeaway (1–2 lines)
4) 2–3 Chavruta questions
  `.trim();

  const modeAdditions = {
    torah: `
MODE: TORAH STUDY
- If a verse or passage is provided, quote at most a short phrase (avoid long quotations).
- If no passage is provided, offer a brief, general Torah teaching and invite the user to choose a text.
    `.trim(),
    ivrit: `
MODE: IVRIT
- Teach gently: letters, roots, pronunciation cues, basic grammar.
- Prefer examples from Tanakh when relevant, but stay accessible.
    `.trim(),
    kabbalah: `
MODE: KABBALAH (ETHICAL/COSMOLOGICAL)
- Focus on ethical refinement, symbolism, and contemplative structure.
- Avoid claims that Kabbalah "proves" physics or vice versa.
    `.trim(),
    physics: `
MODE: PHYSICS & ORDER
- Use mainstream physics language carefully (fields, excitations, symmetry, measurement).
- Clearly separate established physics from philosophical interpretation.
- Avoid sensational claims. No numerology-as-physics.
    `.trim(),
  };

  return `${base}\n\n${modeAdditions[mode] ?? modeAdditions.torah}`;
}

function extractOutputText(response) {
  // Responses API returns an array of output items; we’ll gather any text segments.
  // This is intentionally defensive because the shape can vary by SDK versions.
  const out = response?.output ?? [];
  let text = "";

  for (const item of out) {
    // Many responses have item.type === "message" with item.content parts
    const parts = item?.content ?? [];
    for (const part of parts) {
      if (part?.type === "output_text" && typeof part?.text === "string") {
        text += part.text;
      }
      if (part?.type === "text" && typeof part?.text === "string") {
        text += part.text;
      }
    }
  }

  // Fallbacks
  if (!text && typeof response?.output_text === "string") text = response.output_text;
  if (!text && typeof response?.text === "string") text = response.text;

  return (text || "").trim();
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json(500, { error: "Missing OPENAI_API_KEY in Netlify environment variables." });
    }

    const body = JSON.parse(event.body || "{}");
    const message = cleanString(body.message);
    const mode = cleanString(body.mode || "torah") || "torah";

    if (!message) {
      return json(400, { error: "Missing message" });
    }

    const client = new OpenAI({ apiKey });

    // Responses API (recommended for new projects) :contentReference[oaicite:1]{index=1}
    const resp = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt(mode) },
        { role: "user", content: message },
      ],
      // Keep things readable by default. User can ask for depth.
      text: { verbosity: "medium" }
    });

    const reply = extractOutputText(resp) || "I didn’t get a text response back. Try again with a slightly different prompt.";

    return json(200, { reply });
  } catch (err) {
    return json(500, { error: "Server error", details: String(err?.message || err) });
  }
}
