// netlify/functions/chavruta.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const key = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) {
      return json(500, { ok: false, error: "Missing OPENAI_API_KEY in Netlify environment variables." });
    }

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return json(400, { ok: false, error: "Invalid JSON body." }); }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) return json(400, { ok: false, error: "Missing 'prompt'." });

    const mode = String(body.mode || "peshat").toLowerCase();
    const includeHebrew = !!body.includeHebrew;
    const askCitations = body.askCitations !== false;

    const context = body.context && typeof body.context === "object" ? body.context : null;
    const history = Array.isArray(body.history) ? body.history.slice(-18) : [];

    const modeGuide =
      mode === "sources"
        ? "Prioritize primary sources. Quote briefly. If you cannot cite, say what citation is needed."
        : mode === "chavruta"
          ? "Act like a real chavruta: clarify terms, ask 1-2 probing questions, then summarize."
          : "Prioritize peshat/plain meaning. Minimal speculation.";

    const citationGuide = askCitations
      ? "When you make a claim that should be sourced, add: [Citation needed: ...]."
      : "Do not add citation notes unless user requests.";

    const hebrewGuide = includeHebrew
      ? "Where relevant, include key Hebrew words/phrases (short, accurate) alongside English."
      : "English-only is fine; only include Hebrew if the user explicitly provides it.";

    const contextBlock = context
      ? `Context:\n- Gate: ${context.gate || "(none)"}\n- Notes: ${context.text || ""}\n`
      : "";

    const system = [
      "You are ChavrutaGPT for a Torah-first study space.",
      "Rules:",
      "1) Text first. Then questions.",
      "2) Keep speculation clearly labeled as SPECULATION.",
      "3) Prefer peshat before abstraction.",
      `Mode: ${mode}. ${modeGuide}`,
      citationGuide,
      hebrewGuide,
      contextBlock
    ].join("\n");

    const messages = [
      { role: "system", content: system },
      ...history
        .filter(m => m && typeof m.content === "string")
        .map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      { role: "user", content: prompt }
    ];

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.35,
        messages
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data?.error?.message || `OpenAI error (${r.status})`;
      return json(500, { ok: false, error: msg });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "(No response returned.)";

    // Provide meta stub so the UI can show future metadata cleanly
    return json(200, {
      ok: true,
      reply,
      meta: {
        labels: mode === "sources" ? ["sources-first"] : mode === "chavruta" ? ["chavruta"] : ["peshat"]
      }
    });
  } catch (err) {
    return json(500, { ok: false, error: err?.message || String(err) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(obj)
  };
}
