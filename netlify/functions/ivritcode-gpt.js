// netlify/functions/ivritcode-gpt.js
// IvritCode Chavruta backend for ivritcode.org
// Uses OpenAI Responses API via native fetch (Node 18+ on Netlify).

const corsHeaders = {
  // You can restrict this to "https://ivritcode.org" if you like.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "OK",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { prompt } = JSON.parse(event.body || "{}");

    if (!prompt || typeof prompt !== "string") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing prompt" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "OPENAI_API_KEY not set" }),
      };
    }

    // System prompt: tell the model how to respond
    const systemPrompt = `
You are the IvritCode Chavruta for ivritcode.org.

- IvritCode is a 23-register base-22 machine.
- Each Hebrew letter is an opcode acting on registers R0–R22.
- The user will describe intent in Hebrew or English.
- You MUST respond with a single JSON object:

  {
    "code": "<Hebrew letters, no spaces>",
    "explanation": "<multi-line explanation in Hebrew and/or English>"
  }

- "code" should be a plausible IvritCode program, using only Hebrew letters.
- "explanation" should explain what the program does in conceptual terms.
    `.trim();

    // Call OpenAI Responses API
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", text);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: "OpenAI API error", details: text }),
      };
    }

    const data = await response.json();

    // Very simple extraction of final text
    const content =
      data.output &&
      data.output[0] &&
      data.output[0].content &&
      data.output[0].content[0] &&
      data.output[0].content[0].text;

    let payload;
    try {
      // Try to parse a JSON object from the model's text
      payload = JSON.parse(content);
    } catch {
      // Fallback: wrap raw text as explanation
      payload = {
        code: "",
        explanation: content || "No content returned from model.",
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    };
  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Server error", details: String(err) }),
    };
  }
};
