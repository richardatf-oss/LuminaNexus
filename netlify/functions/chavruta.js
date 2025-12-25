// netlify/functions/chavruta.js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing OPENAI_API_KEY in Netlify env vars" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const input = (body.input || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!input) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing input" }),
      };
    }

    const clipped = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-10);

    const instructions = `
You are Chavruta: a clean, modest, respectful Torah-first study partner.
- Text first, then questions.
- Speculation must be clearly labeled.
- Do not invent quotes or citations.
- If asked for Baal Shem Tov teachings without a precise source, label as "attributed/tradition."
Keep answers concise unless asked to expand.
Respond in English only.
`;

    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${input}`,
      "ASSISTANT:"
    ].join("\n");

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
        input: convo,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return {
        statusCode: upstream.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: data?.error?.message || "Upstream error",
        }),
      };
    }

    const text =
      data.output_text ||
      (Array.isArray(data.output)
        ? data.output.flatMap(o => o.content || []).map(c => c.text).filter(Boolean).join("\n")
        : "") ||
      "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, content: text || "(No response text returned.)" }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
}
