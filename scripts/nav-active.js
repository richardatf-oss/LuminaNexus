// scripts/nav-active.js
(() => {
  function normalizePath(path) {
    let p = (path || "/").split("?")[0].split("#")[0].replace(/\/{2,}/g, "/");
    if (p.length > 1) p = p.replace(/\/$/, "");
    return p.toLowerCase();
  }

  const routeMap = new Map([
    ["/", "/index.html"],
    ["/index", "/index.html"],
    ["/index.html", "/index.html"],

    ["/torah-first", "/pages/torah-first.html"],
    ["/torah-first.html", "/pages/torah-first.html"],
    ["/pages/torah-first.html", "/pages/torah-first.html"],

    ["/seven-laws", "/pages/seven-laws.html"],
    ["/seven-laws.html", "/pages/seven-laws.html"],
    ["/pages/seven-laws.html", "/pages/seven-laws.html"],

    ["/study-paths", "/pages/study-paths.html"],
    ["/study-paths.html", "/pages/study-paths.html"],
    ["/pages/study-paths.html", "/pages/study-paths.html"],

    ["/chavruta", "/pages/chavruta.html"],
    ["/chavruta.html", "/pages/chavruta.html"],
    ["/pages/chavruta.html", "/pages/chavruta.html"],

    ["/trees", "/pages/trees.html"],
    ["/trees.html", "/pages/trees.html"],
    ["/pages/trees.html", "/pages/trees.html"],

    ["/library", "/pages/library.html"],
    ["/library.html", "/pages/library.html"],
    ["/pages/library.html", "/pages/library.html"],

    ["/ivrit-haor", "/pages/ivrit-haor.html"],
    ["/ivrit-haor.html", "/pages/ivrit-haor.html"],
    ["/pages/ivrit-haor.html", "/pages/ivrit-haor.html"],

    ["/about", "/pages/about.html"],
    ["/about.html", "/pages/about.html"],
    ["/pages/about.html", "/pages/about.html"],

    ["/blessing", "/pages/blessing.html"],
    ["/blessing.html", "/pages/blessing.html"],
    ["/pages/blessing.html", "/pages/blessing.html"],
  ]);

  const current = normalizePath(window.location.pathname);
  const targetHref = routeMap.get(current);

  const links = Array.from(document.querySelectorAll("nav a.pill[href]"));
  if (!links.length) return;

  links.forEach((a) => a.classList.remove("active"));

  const normalizedTarget = targetHref ? normalizePath(targetHref) : null;

  const winner =
    links.find((a) => normalizePath(a.getAttribute("href")) === normalizedTarget) ||
    links.find((a) => normalizePath(a.getAttribute("href")) === current) ||
    links.find((a) => current.endsWith(normalizePath(a.getAttribute("href")).split("/").pop()));

  if (winner) winner.classList.add("active");
})();
