export async function handler(event) {
  try {
    const { message } = JSON.parse(event.body || "{}");

    // TEMP safe response (so front-end never hangs)
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply: message ? `You said: ${message}` : "I’m listening."
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Function error" })
    };
  }
}
