// netlify/functions/ivritcode-gpt.js
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    // Here you embed your IvritCode SPEC + instructions
    const systemPrompt = `
You are the IvritCode Chavruta.

- IvritCode is a 23-register VM (R0–R22) with 22 letters plus hidden Aleph Olam.
- Letters = opcodes; niqqud & taamim = modifiers (planned).
- Output MUST be JSON: { "code": "<letters>", "explanation": "<text>" }.
- "code" is pure IvritCode letters (no spaces), "explanation" may be Hebrew or English.

User request:
${prompt}
    `.trim();

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
    });

    // Very simple extraction of the text from the first output
    const raw =
      completion.output[0]?.content?.[0]?.text || "No response from model.";

    // Try to parse JSON from the text; fallback if no JSON found
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { code: "", explanation: raw };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        // allow IvritCode.org front-end to talk to it
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: String(err) }),
    };
  }
};
