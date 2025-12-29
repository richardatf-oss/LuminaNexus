// netlify/functions/chavruta.js

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    // Accept BOTH formats:
    // - new UI: { input, history, options }
    // - older UI: { message }
    const input =
      (typeof body.input === "string" && body.input) ||
      (typeof body.message === "string" && body.message) ||
      "";

    const mode = body?.options?.mode || "peshat";
    const includeHebrew = !!body?.options?.includeHebrew;
    const askForCitations = body?.options?.askForCitations !== false;

    // TEMP: deterministic reply so we can verify end-to-end works
    // (Swap this later for your real OpenAI logic.)
    const contentLines = [
      `Mode: ${mode}`,
      `Include Hebrew: ${includeHebrew ? "yes" : "no"}`,
      `Ask for citations: ${askForCitations ? "yes" : "no"}`,
      "",
      `You sent: ${input || "(empty)"}`,
    ];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        content: contentLines.join("\n"),
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: err?.message || String(err),
      }),
    };
  }
}
