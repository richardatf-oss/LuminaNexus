// /scripts/sefaria-client.js
// Live Sefaria text fetch with localStorage cache + TTL, plus safe parsing.

(function () {
  const CACHE_PREFIX = "LN_SEFARIA_TEXT__";
  const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

  function now() {
    return Date.now();
  }

  function cacheKey(ref) {
    return CACHE_PREFIX + ref.toLowerCase();
  }

  function readCache(ref) {
    try {
      const raw = localStorage.getItem(cacheKey(ref));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || !obj.data) return null;
      if (now() - obj.ts > TTL_MS) return null;
      return obj.data;
    } catch {
      return null;
    }
  }

  function writeCache(ref, data) {
    try {
      localStorage.setItem(cacheKey(ref), JSON.stringify({ ts: now(), data }));
    } catch {
      // ignore quota / privacy mode errors
    }
  }

  function asArray(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v.trim()) return [v];
    return [];
  }

  function flattenDeep(arr) {
    // Sefaria sometimes returns nested arrays for larger refs.
    const out = [];
    (function rec(a) {
      for (const item of a) {
        if (Array.isArray(item)) rec(item);
        else if (typeof item === "string" && item.trim()) out.push(item);
      }
    })(arr);
    return out;
  }

  // Fetch using /api/texts/{tref} (simple to parse: "text" and "he")
  async function fetchTextsV1(ref) {
    const url =
      "https://www.sefaria.org/api/texts/" +
      encodeURIComponent(ref) +
      "?context=0&commentary=0&pad=0";

    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const msg = `Sefaria HTTP ${res.status}`;
      throw new Error(msg);
    }

    const json = await res.json();

    // v1 typical fields: json.text (English), json.he (Hebrew)
    // Either may be string or array; may be nested arrays.
    let english = asArray(json.text);
    let hebrew = asArray(json.he);

    if (english.some(Array.isArray)) english = flattenDeep(english);
    if (hebrew.some(Array.isArray)) hebrew = flattenDeep(hebrew);

    return {
      ref: json.ref || ref,
      english,
      hebrew,
      source: "sefaria-v1",
    };
  }

  async function getText(ref, { force = false } = {}) {
    if (!ref) throw new Error("Missing ref");

    if (!force) {
      const cached = readCache(ref);
      if (cached) return { ...cached, cached: true };
    }

    const data = await fetchTextsV1(ref);
    writeCache(ref, data);
    return { ...data, cached: false };
  }

  function clearCache(ref) {
    try {
      localStorage.removeItem(cacheKey(ref));
    } catch {}
  }

  // Expose a tiny global
  window.LN_Sefaria = {
    getText,
    clearCache,
  };
})();
