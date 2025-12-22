// netlify/functions/chavruta.js

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      "Missing OPENAI_API_KEY env var in Netlify site settings.",
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];

  // Keep the assistant tone aligned with LuminaNexus
  const system = {
    role: "system",
    content:
      "You are ChavrutaGPT for a Torah-first learning sanctuary. Always: (1) Peshat first, (2) one steady classical note (cite by name if you mention one), (3) then thoughtful questions. Be calm, non-coercive, non-guru. No halachic rulings. If user asks for rulings, redirect to qualified authority. Keep responses structured and readable.",
  };

  const messages = [system, ...incoming].slice(-24);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.4,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(text || "OpenAI request failed.", { status: 500 });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";

    return Response.json({ reply });
  } catch (e) {
    return new Response("Function error.", { status: 500 });
  }
};
