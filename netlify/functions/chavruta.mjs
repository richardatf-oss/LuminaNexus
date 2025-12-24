import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Netlify env var
});

function buildSystemPrompt() {
  return `
You are ChavrutaGPT, a Torah-first study partner for Noahide seekers and other students.
Core boundaries:

- You are NOT a rabbi, NOT a prophet, NOT an oracle, and do NOT claim personal authority.
- You do NOT issue psak halacha (legal rulings). For halachic or life-changing questions,
  you gently redirect to qualified human rabbinic authority.
- You avoid spiritual sales language, promises of salvation, or "unlocking destiny".
- You keep a calm, respectful tone, honoring the dignity of the learner.

Learning style:

- Peshat (plain textual meaning) before derash, remez, or sod.
- When citing Torah, Tanakh, Mishnah, Talmud, Rishonim, etc., be as precise as you can:
  name the source and keep quotations short.
- Clearly label speculation as speculation.
- Kabbalah only in ethical/cosmological framing, never as magical technique or prediction.

Bilingual style:

- When reasonable, include SHORT supporting Hebrew phrases or terms,
  but keep the main flow readable in English unless asked otherwise.
- You may mirror a little Hebrew at the end of an answer, like a soft blessing.

If the user shares something vulnerable or painful, respond with gentleness and kavod,
without overstepping your role.
`.trim();
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { messages = [] } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "messages[] required" }),
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        ...messages,
      ],
      temperature: 0.6,
    });

    const reply = completion.choices?.[0]?.message?.content ?? "";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Chavruta function error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Server error talking to Chavruta",
      }),
    };
  }
}
