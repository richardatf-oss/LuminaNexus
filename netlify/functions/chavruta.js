// netlify/functions/chavruta.js
export async function handler(event) {
  // Allow POST only
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY (Netlify env var)" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const input = (body.input || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!input) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "messages[] required: provide { input: string }" }),
      };
    }

    // Keep a small, safe history window
    const clippedHistory = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12);

    const instructions = `
You are "Chavruta": a clean, modest, respectful Torah-first study partner.

Behavior:
- Be warm and humble. Never snarky.
- Text first, then questions. Speculation clearly labeled.
- Never invent quotes or sources. If unsure, say so.
- If asked about attributed teachings (e.g., Baal Shem Tov), label as "attributed/tradition" if you cannot cite a precise text.
- Keep responses concise unless the user explicitly asks to expand.

Output format:
1) Hebrew section (brief, clear)
2) English section (brief, clear)
3) If you cite sources, include a short "Sources:" list (no fabricated citations).
`;

    // Convert history into a plain text “conversation” to avoid schema mismatch.
    // (This is robust across API changes and avoids the earlier messages[] required bug.)
    const convo = [
      "Conversation so far:",
      ...clippedHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`),
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
          error: data?.error?.message || "Upstream error",
          details: data,
        }),
      };
    }

    // Extract text safely
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
      body: JSON.stringify({
        ok: true,
        role: "assistant",
        content: text || "Hebrew:\n(לא התקבלה תשובה)\n\nEnglish:\n(No response text returned.)",
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
}
