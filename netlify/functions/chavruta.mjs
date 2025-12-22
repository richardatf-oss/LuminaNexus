export default async (req) => {
  try {
    if (req.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY is not set in Netlify env vars." }) };
    }

    const { mode = "peshat", messages = [] } = JSON.parse(req.body || "{}");

    const system = buildSystem(mode);

    // Convert chat messages into a single input string for the Responses API.
    // (This is robust + simple for a chavruta chat UX.)
    const transcript = messages
      .slice(-30)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const input = `${system}\n\nConversation:\n${transcript}\n\nASSISTANT:`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        temperature: 0.4,
        max_output_tokens: 650,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data?.error?.message || "OpenAI request failed";
      return { statusCode: r.status, body: JSON.stringify({ error: msg }) };
    }

    const reply = extractText(data) || "I couldn’t produce a reply text.";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Server error" }) };
  }
};

function extractText(data) {
  // Responses API commonly returns: output[].content[].text
  // We’ll gather any text chunks we find.
  const out = data?.output || [];
  let text = "";
  for (const item of out) {
    const content = item?.content || [];
    for (const c of content) {
      if (typeof c?.text === "string") text += c.text;
    }
  }
  return text.trim();
}

function buildSystem(mode) {
  const common =
    `You are ChavrutaGPT for a Torah-first learning site.\n` +
    `Tone: calm, clear, non-coercive, non-performative.\n` +
    `Boundaries: no psak halacha, no conversion guidance, no urgency, no power-claims.\n` +
    `If something requires a qualified authority, say so plainly.\n`;

  switch (mode) {
    case "laws":
      return common +
        `Mode: Seven Laws (practice).\n` +
        `1) State the principle simply.\n` +
        `2) Give 2 everyday examples.\n` +
        `3) Name 1 boundary (when to seek qualified guidance / avoid overreach).\n` +
        `4) Give 1 small next step for today.\n`;
    case "ivrit":
      return common +
        `Mode: Hebrew (concrete).\n` +
        `1) Give readable pronunciation guidance.\n` +
        `2) Give root meaning and 3 related forms/words.\n` +
        `3) Give one short usage example.\n` +
        `4) Optional: one gentle grammar note (only if helpful).\n`;
    case "kabbalah":
      return common +
        `Mode: Ethical Kabbalah (bounded metaphor).\n` +
        `Treat Kabbalah as metaphor for character and responsibility.\n` +
        `Give 3 reflection prompts + 1 modest practical step.\n` +
        `Include a boundary reminder: no theurgy, no incantations, no manipulation.\n`;
    case "physics":
      return common +
        `Mode: Physics & Order (analogy-only).\n` +
        `1) Explain plainly.\n` +
        `2) Give an analogy-only bridge to Torah ethics and label it as analogy.\n` +
        `3) Include caution: science is not proof of theology.\n` +
        `4) Give one grounded takeaway.\n`;
    case "peshat":
    default:
      return common +
        `Mode: Torah (peshat first).\n` +
        `1) Give peshat (plain meaning) in a short paragraph.\n` +
        `2) Give ONE classical note (Rashi/Ramban/Ibn Ezra/etc.) only if it clarifies the peshat.\n` +
        `3) Ask 3 questions (text, character, action).\n` +
        `4) Give ONE small next step for today.\n`;
  }
}
