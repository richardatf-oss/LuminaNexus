// scripts/nav-active.js
// Auto-highlight current page in the pill nav

(() => {
  const norm = (p) => {
    if (!p) return "/";
    // strip query/hash, force leading slash, strip trailing slash
    p = p.split("#")[0].split("?")[0];
    if (!p.startsWith("/")) p = "/" + p;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  };

  const here = norm(window.location.pathname);

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".pill-nav a.pill").forEach(a => {
      const href = a.getAttribute("href") || "";
      const target = norm(href);

      // Exact match OR index->root match
      const isActive =
        target === here ||
        (here === "/" && (target === "/index.html" || target === "/"));

      if (isActive) a.classList.add("active");
      else a.classList.remove("active");
    });
  });
})();
