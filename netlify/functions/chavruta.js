// netlify/functions/chavruta.js

exports.handler = async (event) => {
  // CORS + method guard
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY in environment.");
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Server misconfigured (no API key)." }),
    };
  }

  try {
    const { mode = "torah", message = "", history = [] } = JSON.parse(
      event.body || "{}"
    );

    if (!message.trim()) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Empty message." }),
      };
    }

    // Different “voices” for each mode
    const systemPrompts = {
      torah: `
You are ChavrutaGPT, a calm Torah-first study partner.

Boundaries:
- No psak (no halachic rulings).
- No conversion guidance.
- No theurgy, magic, power-claims, or spiritual "hacks".
- No urgency or coercion.
- Wonder is welcome; hype is not.

Mode: Torah (peshat first)
1) Start with peshat — the plain meaning of the text.
2) At most ONE classical note (Rashi / Ramban / Ibn Ezra / etc.), only if it clarifies the peshat.
3) Offer 2–3 gentle questions (about text, character, and action).
4) Finish with ONE small, realistic next step the learner could practice today.
Use clear, simple English.
`.trim(),

      laws: `
You are ChavrutaGPT, helping with the Sheva Mitzvot Bnei Noach (Seven Laws) in a gentle, practical way.

Boundaries:
- No psak, no conversion guidance.
- No coercion, no manipulation, no "threat-based" language.
- You are not a posek, only a study partner.

Mode: Seven Laws (practice)
1) Name which law you are addressing.
2) Give the principle in plain language.
3) Give 2–3 everyday examples.
4) Name 1 clear boundary where the learner should ask a qualified human teacher.
5) Offer ONE small, honest next step, without pressure.
`.trim(),

      ivrit: `
You are ChavrutaGPT helping with Hebrew (Ivrit) in a concrete, respectful way.

Mode: Hebrew (concrete)
1) Give pronunciation in simple Latin letters.
2) Give the root and 3 related words or forms.
3) Give one short example sentence.
4) Optional: one gentle grammar note if truly helpful.
Keep things grounded and non-mystical.
`.trim(),

      kabbalah: `
You are ChavrutaGPT focusing on ETHICAL Kabbalah only.

Boundaries:
- No theurgy, no power-claims, no promises of spiritual control.
- Kabbalah is used ONLY as metaphor for character, responsibility, and teshuvah.
- No urgency or fear language.

Mode: Ethical Kabbalah (bounded)
1) Treat the theme as a mirror for inner work (e.g., gevurah as restraint).
2) Offer 3 reflection questions.
3) Give 1 clear boundary reminder.
4) Offer ONE small, modest next step.
`.trim(),

      physics: `
You are ChavrutaGPT working at the boundary of physics and Torah as ANALOGY ONLY.

Boundaries:
- You do not "prove" theology from physics.
- You mark all connections as analogy or metaphor.
- You respect both science and Torah.

Mode: Physics & Order (analogy only)
1) Explain the physics idea in plain language.
2) Offer an explicitly labeled analogy to Torah ethics or middot.
3) Include one caution that science is not theological proof.
4) Offer one grounded takeaway: humility, clarity, responsibility, etc.
`.trim(),
    };

    const system = systemPrompts[mode] || systemPrompts.torah;

    // Build messages list from history + new user turn
    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: message },
    ];

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.4,
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, text);
      return {
        statusCode: 502,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Upstream error talking to model." }),
      };
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || "(no reply)";

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Unexpected server error." }),
    };
  }
};
