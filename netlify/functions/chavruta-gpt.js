// netlify/functions/chavruta-gpt.js

exports.handler = async (event, context) => {
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

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("Missing OPENAI_API_KEY");
      return {
        statusCode: 500,
        body: "Missing OPENAI_API_KEY",
      };
    }

    const body = JSON.parse(event.body || "{}");
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const systemMessage = {
      role: "system",
      content:
        "You are ChavrutaGPT, a gentle Torah study partner. " +
        "Answer slowly, with clear paragraphs and traditional Jewish sources. " +
        "Whenever you mention a source (Tanakh, Mishnah, Talmud, Rishonim, Acharonim), " +
        "name it clearly so it can be looked up on Sefaria, like 'Berakhot 2a', 'Tehillim 27:1'. " +
        "If you are unsure, say so honestly.",
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
    const choice =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message
        : { role: "assistant", content: "No reply generated." };

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
};
