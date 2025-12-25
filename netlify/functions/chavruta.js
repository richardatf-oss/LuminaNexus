// netlify/functions/chavruta.js
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json(500, { ok: false, error: "Missing OPENAI_API_KEY in Netlify env vars" });

    const body = safeJson(event.body);
    const input = String(body.input || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    if (!input) return json(400, { ok: false, error: "Missing input" });

    // Keep requests small and fast (reduces timeouts)
    const clipped = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-6);

    const instructions = [
      "You are Chavruta: a clean, modest, respectful Torah-first study partner.",
      "Text first, then questions.",
      "Speculation must be clearly labeled.",
      "Do not invent quotes or citations.",
      "If asked for Baal Shem Tov teachings without a precise source, label as 'attributed/tradition'.",
      "Keep answers concise unless asked to expand.",
      "Respond in English only."
    ].join("\n");

    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${input}`,
      "ASSISTANT:"
    ].join("\n");

    const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-5"];

    const controller = new AbortController();
    const timeoutMs = 45_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);

    let lastErr = "Upstream failed";

    try {
      for (const model of models) {
        const resp = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            reasoning: { effort: "low" },
            // keep output bounded so it returns faster
            max_output_tokens: 650,
            instructions,
            input: convo,
          }),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          console.error("[chavruta] upstream not ok", { model, status: resp.status, data });
          lastErr = data?.error?.message || `HTTP ${resp.status}`;
          continue;
        }

        const text =
          data.output_text ||
          (Array.isArray(data.output)
            ? data.output.flatMap(o => o.content || []).map(c => c.text).filter(Boolean).join("\n")
            : "") ||
          "";

        return json(200, { ok: true, content: text || "(No response text returned.)", modelUsed: model });
      }
    } finally {
      clearTimeout(t);
    }

    return json(502, { ok: false, error: lastErr });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return json(isAbort ? 504 : 500, { ok: false, error: isAbort ? "Upstream timeout" : err.message });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function safeJson(body) {
  try { return JSON.parse(body || "{}"); } catch { return {}; }
}
