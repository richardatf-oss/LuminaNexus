// netlify/functions/chavruta.js
export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json(500, { ok: false, error: "Missing OPENAI_API_KEY in Netlify env vars" });

    const body = safeJson(event.body);
    const inputRaw = String(body.input || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    if (!inputRaw) return json(400, { ok: false, error: "Missing input" });

    // Keep request small
    const clipped = history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-6);

    // Try to interpret user input as a Sefaria ref
    const ref = toSefariaRef(inputRaw);

    let sefariaBlock = "";
    if (ref) {
      const t = await fetchSefariaText(ref);
      if (t && (t.en || t.he)) {
        sefariaBlock = formatSefariaBlock(ref, t);
      }
    }

    const instructions = [
      "You are Chavruta: a clean, modest, respectful Torah-first study partner.",
      "Rules:",
      "- Start with the text (or a clean excerpt) before analysis.",
      "- Then give questions for study (3–7).",
      "- Speculation must be clearly labeled as Speculation.",
      "- Do not invent quotes or citations.",
      "- If asked for Baal Shem Tov teachings without a precise source, label as 'attributed/tradition'.",
      "- Keep answers concise unless asked to expand.",
      "Respond in English only.",
      "",
      "If a Sefaria text block is provided, treat it as the primary text."
    ].join("\n");

    // Build prompt: prefer Sefaria text if available
    const convo = [
      ...clipped.map(m => `${m.role.toUpperCase()}: ${m.content}`),
      `USER: ${inputRaw}`,
      sefariaBlock ? `\nSEFARIA_TEXT:\n${sefariaBlock}\n` : "",
      "ASSISTANT:"
    ].join("\n");

    // Model fallback (fastest first)
    const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-5"];

    const controller = new AbortController();
    const timeoutMs = 45_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

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
            instructions,
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
          extractFromAnyTextFields(data) ||
          "";

        return json(200, {
          ok: true,
          content: text || "(No response text returned.)",
          modelUsed: model,
          sefariaRef: ref || null
        });
      }
    } finally {
      clearTimeout(timer);
    }

    return json(502, { ok: false, error: lastErr });
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return json(isAbort ? 504 : 500, { ok: false, error: isAbort ? "Upstream timeout" : err.message });
  }
}

/* ---------------- helpers ---------------- */

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function safeJson(body) {
  try { return JSON.parse(body || "{}"); } catch { return {}; }
}

// Convert common human inputs into a Sefaria ref string.
// Examples it handles:
// - "Berakhot 4" -> "Berakhot 4a"
// - "Berakhot 4a" -> "Berakhot 4a"
// - "Genesis 1:1" / "Gen 1:1" -> "Genesis 1:1"
// - "Psalm 12" / "Psalms 12" -> "Psalms 12"
function toSefariaRef(s) {
  const raw = s.trim();

  // Normalize spaces
  const x = raw.replace(/\s+/g, " ").trim();

  // Talmud tractate pattern: "<Name> <num><a|b>?"
  // If just "<Name> <num>" assume "a"
  const talmud = x.match(/^([A-Za-z][A-Za-z'’\-]+)\s+(\d{1,3})([ab])?$/i);
  if (talmud) {
    const name = normalizeTractateName(talmud[1]);
    const daf = talmud[2];
    const side = (talmud[3] || "a").toLowerCase();
    return `${name} ${daf}${side}`;
  }

  // Genesis shortcut
  const gen = x.match(/^(gen|genesis)\s+(\d{1,3})\s*:\s*(\d{1,3})$/i);
  if (gen) return `Genesis ${gen[2]}:${gen[3]}`;

  // Psalms shortcut
  const ps = x.match(/^(psalm|psalms)\s+(\d{1,3})$/i);
  if (ps) return `Psalms ${ps[2]}`;

  // Generic "Book Chapter:Verse" (best effort)
  const bookCv = x.match(/^([A-Za-z][A-Za-z\s'’\-]+)\s+(\d{1,3})\s*:\s*(\d{1,3})$/);
  if (bookCv) return `${titleCase(bookCv[1].trim())} ${bookCv[2]}:${bookCv[3]}`;

  // Generic "Book Chapter" (best effort)
  const bookC = x.match(/^([A-Za-z][A-Za-z\s'’\-]+)\s+(\d{1,3})$/);
  if (bookC) return `${titleCase(bookC[1].trim())} ${bookC[2]}`;

  return null;
}

function normalizeTractateName(name) {
  // minimal normalization for common spellings
  const n = name.toLowerCase();
  const map = {
    berachot: "Berakhot",
    berakhot: "Berakhot",
    shabbat: "Shabbat",
    eruvin: "Eruvin",
    pesachim: "Pesachim",
    yomah: "Yoma",
    yoma: "Yoma",
    sukkah: "Sukkah",
    beitzah: "Beitzah",
    rosh: "Rosh", // leave partial alone
    megillah: "Megillah",
    moed: "Moed", // leave partial alone
  };
  if (map[n]) return map[n];
  return titleCase(name);
}

function titleCase(s) {
  return s
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function fetchSefariaText(ref) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0&commentary=0&pad=0&wrapLinks=0&lang=bi`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!resp.ok) {
    console.error("[sefaria] fetch failed", { ref, status: resp.status });
    return null;
  }

  const data = await resp.json().catch(() => null);
  if (!data) return null;

  // Sefaria can return strings or arrays depending on range
  const en = flattenToText(data.text);
  const he = flattenToText(data.he);

  return { en, he, title: data?.ref || ref };
}

function flattenToText(x) {
  if (!x) return "";
  if (typeof x === "string") return x.trim();
  if (Array.isArray(x)) {
    // nested arrays sometimes
    return x.flat(Infinity).filter(v => typeof v === "string" && v.trim()).join("\n").trim();
  }
  return "";
}

function formatSefariaBlock(ref, t) {
  const lines = [];
  lines.push(`Reference: ${ref}`);
  if (t.en) {
    lines.push("\nENGLISH:");
    lines.push(t.en);
  }
  if (t.he) {
    lines.push("\nHEBREW:");
    lines.push(t.he);
  }
  return lines.join("\n");
}

function extractFromOutputArray(data) {
  if (!data || !Array.isArray(data.output)) return "";
  const chunks = [];
  for (const item of data.output) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      const t = c?.text;
      if (typeof t === "string" && t.trim()) chunks.push(t.trim());
    }
  }
  return chunks.join("\n").trim();
}

function extractFromAnyTextFields(data) {
  const candidates = [
    data?.response?.output_text,
    data?.result?.output_text,
    data?.choices?.[0]?.message?.content,
    data?.choices?.[0]?.text
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "";
}
