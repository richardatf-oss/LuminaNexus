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

    // Keep history small and cheap
    const clipped = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-6);

    const instructions = [
      "You are Chavruta: a clean, modest, respectful Torah-first study partner.",
      "- Text first, then questions.",
      "- Speculation must be clearly labeled.",
      "- Do not invent quotes or citations.",
      '- If asked for Baal Shem Tov teachings without a precise source, label as "attributed/tradition."',
      "Keep answers concise unless asked to expand.",
      "Respond in English only."
    ].join("\n");

    // IMPORTANT: Keep payload simple and short
    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${input}`,
      "ASSISTANT:"
    ].join("\n");

    // Try models in order (first that works wins)
    const modelCandidates = [
      "gpt-4.1-mini",
      "gpt-4.1",
      "gpt-5"
    ];

    const controller = new AbortController();
    const timeoutMs = 45_000; // longer than before; still safe
    const t = setTimeout(() => controller.abort(), timeoutMs);

    let lastErr = null;

    try {
      for (const model of modelCandidates) {
        try {
          const resp = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              // Keep reasoning light to reduce latency
              reasoning: { effort: "low" },
              instructions,
              input: convo,
            }),
          });

          const data = await resp.json().catch(() => ({}));

          if (!resp.ok) {
            // Log the real reason in Netlify logs
            console.error("[chavruta] upstream not ok", { model, status: resp.status, data });
            lastErr = data?.error?.message || `Upstream HTTP ${resp.status}`;
            continue; // try next model
          }

          const text =
            data.output_text ||
            (Array.isArray(data.output)
              ? data.output.flatMap(o => o.content || []).map(c => c.text).filter(Boolean).join("\n")
              : "") ||
            "";

          return json(200, { ok: true, content: text || "(No response text returned.)", modelUsed: model });
        } catch (e) {
          // Network/abort/etc
          console.error("[chavruta] model attempt failed", { model, error: e?.message });
          lastErr = e?.message || "Unknown error";
        }
      }
    } finally {
      clearTimeout(t);
    }

    // If we got here, all attempts failed
    return json(502, {
      ok: false,
      error: lastErr || "Upstream failed (no model succeeded)",
      hint: "Check Netlify function logs for details."
    });

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
  try { return JSON.parse(body || "{}"); }
  catch { return {}; }
}
