// netlify/functions/chavruta.js
// Node 18+ (Netlify). Uses fetch to call OpenAI.

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method not allowed" });
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return json(500, {
        ok: false,
        error: "Missing OPENAI_API_KEY in Netlify environment variables."
      });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "Invalid JSON body." });
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      return json(400, { ok: false, error: "Missing 'prompt'." });
    }

    // OpenAI Chat Completions (stable, straightforward)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are ChavrutaGPT: Torah-first, source-first. Text before speculation. Be clear, kind, and grounded."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = data?.error?.message || `OpenAI error (${r.status})`;
      return json(500, { ok: false, error: msg });
    }

    const reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      "(No response returned.)";

    return json(200, { ok: true, reply });
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
