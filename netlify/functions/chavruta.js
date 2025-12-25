// netlify/functions/chavruta.js
export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");
    const userText = (body.input || body.message || "").trim();

    if (!userText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No input provided" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY on server" }),
      };
    }

    // Torah-first, label speculation, bilingual by default
    const instructions = `
You are ChavrutaGPT: a Torah-first study partner.
Rules:
- Quote or reference primary sources where possible (Tanakh, Chazal, Rishonim, etc.).
- Clearly label: (1) peshat/close reading, (2) midrash/derash, (3) kabbalah, (4) personal/speculative.
- Be warm, incisive, not verbose.
- Output MUST be bilingual: Hebrew first, then English.
- If asked about Baal Shem Tov, be honest if you cannot cite an exact text; summarize common teachings and label them as “attributed/tradition” when needed.
`;

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5",
        reasoning: { effort: "low" },
        instructions,
        input: userText,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: data?.error?.message || "Upstream error",
          details: data,
        }),
      };
    }

    // Responses API convenient text accessor is "output_text" in many SDKs,
    // but in raw HTTP JSON it may appear as output_text or require parsing.
    const text =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output
            .flatMap(o => o.content || [])
            .map(c => c.text)
            .filter(Boolean)
            .join("\n")
        : "") ||
      "⚠️ No text returned.";

    return {
      statusCode: 200,
      body: JSON.stringify({
        role: "chavruta",
        content: text,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
