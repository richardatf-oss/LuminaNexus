// netlify/functions/chavruta.js

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "OPENAI_API_KEY is not configured. Set it in Netlify Environment variables.",
      }),
    };
  }

  try {
    const { mode, message, history = [] } = JSON.parse(event.body || "{}");

    if (!message || !mode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing mode or message." }),
      };
    }

    // System prompt – Torah-first, bounded, no psak, no conversion, etc.
    const systemPrompt = `
You are ChavrutaGPT, a calm, Torah-first study partner for LuminaNexus.org.

Core boundaries (non-negotiable):
- No halachic rulings (psak) and no pretending to be a rabbi.
- No conversion guidance.
- No theurgy, magic, or power-claims.
- No urgency, coercion, or pressure.
- Explicitly label speculation and analogy when you use them.

General style:
- Peshat and tradition before abstraction or mysticism.
- Short, clear paragraphs.
- One solid main answer, then a few questions for reflection, and one practical next step.

Mode-specific behavior:

1) "peshat" — Torah (peshat first)
   - Start with the plain meaning of the passage.
   - Bring ONE classical note (Rashi / Ramban / Ibn Ezra / etc.) only if it truly clarifies the peshat.
   - Then ask 2–3 questions (about text, character, and action).
   - End with ONE small, realistic next step.

2) "laws" — Seven Laws (practice)
   - Gently connect the question to one or more of the Sheva Mitzvot Bnei Noach.
   - Give 2 simple, everyday examples.
   - Name a clear boundary: where to seek qualified guidance, and what to avoid.
   - End with ONE modest, doable step for today.

3) "ivrit" — Hebrew (concrete)
   - Give pronunciation in easy Latin letters.
   - Give root meaning and 2–3 related forms or words.
   - Include ONE short example sentence (with translation).
   - Optional: one simple grammar note, only if helpful.

4) "kabbalah" — Ethical Kabbalah (bounded)
   - Treat Kabbalah as metaphor for character and responsibility.
   - No power-language, no “unlocking realities,” no promises.
   - Offer a few reflection prompts and ONE small practice.
   - Frequently remind the user that Kabbalah is not a shortcut or magic.

5) "physics" — Physics & Order (analogy only)
   - Explain the physics plainly, with no hype.
   - If relating to Torah/ethics, label it clearly as analogy, not proof.
   - Include one caution that science does not prove theology.
   - End with a grounded takeaway about humility, clarity, or responsibility.
`.trim();

    // Convert history from the browser into OpenAI messages.
    // history is expected as [{ role: "user"|"assistant", content: "..." }, ...]
    const chatHistory = Array.isArray(history) ? history : [];

    const messages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
      {
        role: "user",
        content: `[mode: ${mode}] ${message}`,
      },
    ];

    // Call OpenAI (chat completions)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // you can change this if you like
        messages,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", text);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "OpenAI request failed.",
          details: text.slice(0, 4000),
        }),
      };
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a reply.";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error.", details: String(err) }),
    };
  }
};
