export async function handler(event) {
  try {
    const body = JSON.parse(event.body || "{}");

    // Accept simple input and wrap it properly
    const userText = body.input || body.message || "";

    if (!userText) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No input provided" })
      };
    }

    // Temporary echo (no OpenAI yet)
    return {
      statusCode: 200,
      body: JSON.stringify({
        role: "chavruta",
        content: `Shalom. You said: "${userText}". Bring one text or one question.`
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
