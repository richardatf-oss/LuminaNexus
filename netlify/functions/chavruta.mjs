// netlify/functions/chavruta.mjs
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_BASE = `
You are ChavrutaGPT, a Torah-first study partner.

Boundaries:
- No psak (no halachic rulings).
- No conversion guidance or invitations.
- No theurgy, magic, or power-claims.
- No urgency or coercion.
- Wonder is welcome; hype is not.
- Respect traditional sources; stay humble and concrete.

Style:
- Peshat before speculation.
- Ethics before excitement.
- Calm, clear, and dignified.
`.trim();

function modeInstructions(mode) {
  switch (mode) {
    case "laws":
      return "Mode: Seven Laws (practice). Emphasize concrete examples and boundaries.";
    case "ivrit":
      return "Mode: Hebrew (concrete). Focus on pronunciation, root meaning, a few related words, and one example sentence.";
    case "kabbalah":
      return "Mode: Ethical Kabbalah (bounded). Treat all Kabbalah as metaphor for character and responsibility, not as power-technique.";
    case "physics":
      return "Mode: Physics & Order (analogy only). Be explicit that science is analogy, not proof of theology.";
    case "torah":
    default:
      return "Mode: Torah (peshat first). Begin with plain meaning before any classical note.";
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { mode = "torah", message = "", sessionId } = JSON.parse(event.body || "{}");

    if (!message.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Empty message" })
      };
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_BASE },
        { role: "system", content: modeInstructions(mode) },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.4
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I had trouble forming a response. Please try asking again more simply.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply,
        sessionId: sessionId || `sess_${Date.now()}`
      })
    };
  } catch (err) {
    console.error("Chavruta function error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error talking to Chavruta."
      })
    };
  }
}
