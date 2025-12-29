// /netlify/functions/chavruta.js

export async function handler(event) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors, body: "" };
  }

  // Simple health check
  if (event.httpMethod === "GET") {
    return json(200, { ok: true, name: "chavruta", status: "up" }, cors);
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" }, cors);
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json(500, { ok: false, error: "Missing OPENAI_API_KEY in Netlify env vars" }, cors);
    }

    const body = safeJson(event.body);
    const inputRaw = String(body.input || body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const options = body.options && typeof body.options === "object" ? body.options : {};

    const mode = String(options.mode || "peshat");
    const includeHebrew = !!options.includeHebrew;
    const askForCitations = options.askForCitations !== false;

    if (!inputRaw) {
      return json(400, { ok: false, error: "Missing input" }, cors);
    }

    const clipped = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-10);

    const ref = toSefariaRef(inputRaw);
    let sefariaBlock = "";
    if (ref) {
      const t = await fetchSefariaText(ref);
      if (t && (t.en || t.he)) sefariaBlock = formatSefariaBlock(ref, t, includeHebrew);
    }

    const rules = [
      "You are Chavruta: a clean, modest, respectful Torah-first study partner.",
      "Non-negotiables:",
      "- Text first (quote the provided text; do not invent text).",
      "- Then analysis according to the requested mode.",
      "- Speculation must be explicitly labeled 'Speculation'.",
      "- Do not invent sources or citations.",
      "- If you cannot cite precisely, say so.",
      "",
      `Mode: ${mode}`,
      `Include Hebrew: ${includeHebrew ? "yes" : "no"}`,
      `Ask for citations: ${askForCitations ? "yes" : "no"}`,
    ].join("\n");

    const modeDirective =
      mode === "sources"
        ? [
            "Give 3–7 primary sources (Tanakh / Chazal / Rishonim where relevant).",
            "Each source must include a reference (book + chapter/verse; tractate + daf; etc.).",
            "Keep commentary minimal; let sources lead."
          ].join("\n")
      : mode === "chavruta"
        ? [
            "Structure:",
            "1) TEXT (quote).",
            "2) PESHAT (plain meaning, short).",
            "3) QUESTIONS (3–7).",
            askForCitations ? "4) CITATIONS (only if you have them; otherwise say you’re not sure)." : ""
          ].filter(Boolean).join("\n")
        : [
            "Structure:",
            "1) TEXT (quote).",
            "2) PESHAT (plain meaning).",
            "3) NOTES (brief; label any speculation).",
            askForCitations ? "4) CITATIONS (only if you have them; otherwise say you’re not sure)." : ""
          ].filter(Boolean).join("\n");

    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${inputRaw}`,
      sefariaBlock ? `\nPRIMARY_TEXT:\n${sefariaBlock}\n` : "",
      `\nINSTRUCTIONS:\n${modeDirective}\n`,
      "ASSISTANT:"
    ].join("\n");

    const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-5"];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);

    let lastErr = "Upstream failed";

    try {
      for (const model of models) {
        const resp = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            reasoning: { effort: "low" },
            max_output_tokens: 900,
            instructions: `${rules}\n\nIf PRIMARY_TEXT is provided, treat it as authoritative.`,
            input: convo,
          }),
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          console.error("[chavruta] upstream not ok", { model, status: resp.status, data });
          lastErr = data?.error?.message || `HTTP ${resp.status}`;
          continue;
        }

        const text =
          (typeof data.output_text === "string" && data.output_text.trim()) ||
          extractFromOutputArray(data) ||
          "";

        const finalText = text || "(No response text returned.)";

        return json(200, {
          ok: true,
          content: finalText,
          reply: finalText,
          modelUsed: model,
          sefariaRef: ref || null
        }, cors);
      }
    } finally {
      clearTimeout(timer);
    }

    return json(502, { ok: false, error: lastErr }, cors);

  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return json(
      isAbort ? 504 : 500,
      { ok: false, error: isAbort ? "Upstream timeout" : (err?.message || String(err)) },
      cors
    );
  }
}

/* ---------------- helpers ---------------- */

function json(statusCode, obj, headers) {
  return { statusCode, headers, body: JSON.stringify(obj) };
}

function safeJson(body) {
  try { return JSON.parse(body || "{}"); } catch { return {}; }
}

function extractFromOutputArray(data) {
  try {
    const out = data.output;
    if (!Array.isArray(out)) return "";
    const parts = [];
    for (const item of out) {
      if (item && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c && typeof c.text === "string") parts.push(c.text);
        }
      }
    }
    return parts.join("\n").trim();
  } catch {
    return "";
  }
}

// Convert common human inputs into a Sefaria ref string.
function toSefariaRef(s) {
  const x = String(s || "").trim().replace(/\s+/g, " ");

  const gen = x.match(/^(gen|genesis)\s+(\d{1,3})\s*:\s*(\d{1,3})$/i);
  if (gen) return `Genesis ${gen[2]}:${gen[3]}`;

  const bookCv = x.match(/^([A-Za-z][A-Za-z\s'’\-]+)\s+(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (bookCv) return `${titleCase(bookCv[1].trim())} ${bookCv[2]}:${bookCv[3]}`;

  return null;
}

function titleCase(str) {
  return str.split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : "").join(" ");
}

async function fetchSefariaText(ref) {
  try {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`;
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) return null;
    return await r.json().catch(() => null);
  } catch {
    return null;
  }
}

function formatSefariaBlock(ref, t, includeHebrew) {
  const en = Array.isArray(t.text) ? t.text.filter(Boolean).join("\n") : (t.text || "");
  const he = Array.isArray(t.he) ? t.he.filter(Boolean).join("\n") : (t.he || "");
  const lines = [];
  lines.push(`REF: ${ref}`);
  if (en) lines.push(`\nEN:\n${String(en).trim()}`);
  if (includeHebrew && he) lines.push(`\nHE:\n${String(he).trim()}`);
  return lines.join("\n").trim();
}
