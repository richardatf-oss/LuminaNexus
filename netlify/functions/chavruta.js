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
`.trim();

    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${input}`,
      "ASSISTANT:"
    ].join("\n");

    // Timeout protection
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);

    let upstream, data;
    try {
      upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        signal: controller.signal,
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

      data = await upstream.json();
    } finally {
      clearTimeout(t);
    }

    if (!upstream.ok) {
      // Log full details to Netlify function logs (not sent to client)
      console.error("[chavruta] Upstream error", upstream.status, data);

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
        ? data.output
            .flatMap(o => o.content || [])
            .map(c => c.text)
            .filter(Boolean)
            .join("\n")
        : "") ||
      "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, content: text || "(No response text returned.)" }),
    };
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return {
      statusCode: isAbort ? 504 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: isAbort ? "Upstream timeout" : err.message }),
    };
  }
}
