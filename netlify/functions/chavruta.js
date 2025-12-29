// netlify/functions/chavruta.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const input =
      (typeof body.input === "string" && body.input) ||
      (typeof body.message === "string" && body.message) ||
      "";

    if (!input) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          content: "Please bring a passage or ask a question.",
        }),
      };
    }

    const mode = body?.options?.mode || "peshat";
    const askForCitations = body?.options?.askForCitations !== false;

    const systemPrompt = `
You are ChavrutaGPT — a Torah-first study partner.

Rules:
- Peshat (plain meaning) first
- One classical note if appropriate
- Then 2–4 honest questions
- No prophecy claims
- No mysticism unless asked
- Cite sources when possible
- Be calm, precise, and respectful
`;

    const userPrompt = `
Text or question:
${input}

Mode: ${mode}
Ask for citations: ${askForCitations ? "yes" : "no"}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 300,

    });

    const content =
      completion.choices?.[0]?.message?.content ||
      "No response generated.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        content,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err.message || String(err),
      }),
    };
  }
}
