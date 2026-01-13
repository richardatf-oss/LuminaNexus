async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;

  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    el.innerHTML = await res.text();
  } catch (err) {
    // Fail gracefully: do nothing, page still loads content
    console.warn("Partial load failed:", url, err);
  }
}

(async function boot() {
  await inject("#site-header", "/partials/header.html");
  await inject("#site-footer", "/partials/footer.html");

  // year stamp
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });
})();
