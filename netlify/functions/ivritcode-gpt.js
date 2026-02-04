// netlify/functions/ivritcode-gpt.js

export const handler = async (event, _context) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      // CORS preflight
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: ""
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Use POST" })
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "OPENAI_API_KEY not configured" })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { program, initialState, finalState, trace } = body;

    // Very light validation
    if (typeof program !== "string" || !Array.isArray(initialState) || !Array.isArray(finalState)) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "Missing or invalid program/initialState/finalState" })
      };
    }

    // Build a compact description of the run to send to GPT
    const payloadForModel = {
      program,
      initialState,
      finalState,
      trace
    };

    const systemPrompt = `
You are IvritCodeGPT, a Kabbalistic commentator for a symbolic machine language called IvritCode.
The user sends you:
- a Hebrew "program" string,
- an initial state vector of 23 registers (א–ת and A),
- a final state vector,
- and a step-by-step execution trace.

Your job:
1. Explain in clear English (optionally with a bit of Hebrew) what the program did.
2. Mention which opcodes (letters) were most important and why.
3. Use classical gematria where helpful to interpret the program text and key numbers.
4. Describe movement of Aleph-Olam (A) in symbolic terms (e.g., aggregation, revelation, contraction).
5. Keep it grounded and non-theurgic: interpret, do not promise any metaphysical effects.
6. Return markdown text, no HTML.
`;

    const userPrompt = `
Here is an IvritCode run. Please comment on it Kabbalistically and technically.

PROGRAM:
${program}

INITIAL STATE (23 registers):
${JSON.stringify(initialState)}

FINAL STATE (23 registers):
${JSON.stringify(finalState)}

EXECUTION TRACE (may be truncated):
${JSON.stringify(trace)}
`;

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini", // or whatever you're using elsewhere
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPrompt.trim() }
        ],
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: "OpenAI error", details: errorText })
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ commentary: content })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "Server error", details: String(err) })
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "https://ivritcode.org, https://lumianexus.org".includes("*")
      ? "*"
      : "https://ivritcode.org",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

