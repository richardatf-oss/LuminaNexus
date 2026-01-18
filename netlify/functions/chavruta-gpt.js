// netlify/functions/chavruta-gpt.js

export async function handler(event, context) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try:
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: "Missing OPENAI_API_KEY",
      };
    }

    const body = JSON.parse(event.body || "{}");
    const messages = body.messages || [];

    // Add a system message to shape the chavruta style
    const systemMessage = {
      role: "system",
      content:
        "You are ChavrutaGPT, a gentle study partner for Torah and Jewish sources. " +
        "Answer slowly, with clear structure. When you mention sources from Tanakh, Mishnah, Talmud, or classic commentaries, " +
        "state them clearly so they can be looked up on Sefaria (for example: 'Berakhot 2a', 'Tehillim 27:1'). " +
        "Favor traditional Jewish perspectives and avoid making up new halakhah. If you don't know, say so.",
    };

    const payload = {
      model: "gpt-4o-mini",
      messages: [systemMessage, ...messages],
      temperature: 0.4,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", text);
      return {
        statusCode: 500,
        body: "Error from OpenAI",
      };
    }

    const data = await response.json();
    const choice = data.choices && data.choices[0] && data.choices[0].message;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ reply: choice }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: "Server error",
    };
  }
}
