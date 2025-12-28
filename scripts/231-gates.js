// scripts/231-gates.js
// Access control: only if sessionStorage.enteredGate === "1"

(function () {
  const $ = (s) => document.querySelector(s);

  const elNotice = $("#gateNotice");
  const elList = $("#gatesList");
  const elSearch = $("#gateSearch");

  const elLabel = $("#selectedLabel");
  const elMeta = $("#selectedMeta");
  const elHe = $("#selectedHe");
  const elTr = $("#selectedTr");
  const elGem = $("#selectedGem");

  const btnRandom = $("#btnRandom");
  const btnSend = $("#btnSend");

  // ✅ Gate-only access
  const allowed = sessionStorage.getItem("enteredGate") === "1";
  if (!allowed) {
    elNotice.hidden = false;
    // keep page readable, but disable functionality and gently bounce after a moment
    btnSend.disabled = true;
    btnRandom.disabled = true;
    elSearch.disabled = true;
    setTimeout(() => {
      window.location.href = "/pages/orientation.html";
    }, 1400);
    return;
  }

  // Hebrew letters (22)
  const lettersHe = ["א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל","מ","נ","ס","ע","פ","צ","ק","ר","ש","ת"];

  // Basic transliteration map (lightweight, practical)
  const trMap = {
    "א":"Aleph","ב":"Bet","ג":"Gimel","ד":"Dalet","ה":"He","ו":"Vav","ז":"Zayin","ח":"Chet","ט":"Tet",
    "י":"Yod","כ":"Kaf","ל":"Lamed","מ":"Mem","נ":"Nun","ס":"Samekh","ע":"Ayin","פ":"Pe","צ":"Tsadi",
    "ק":"Qof","ר":"Resh","ש":"Shin","ת":"Tav"
  };

  // Standard gematria values (simple form)
  const gemMap = {
    "א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,"כ":20,"ל":30,"מ":40,"נ":50,"ס":60,
    "ע":70,"פ":80,"צ":90,"ק":100,"ר":200,"ש":300,"ת":400
  };

  // Generate 231 unordered pairs (i < j)
  const gates = [];
  for (let i = 0; i < lettersHe.length; i++) {
    for (let j = i + 1; j < lettersHe.length; j++) {
      const a = lettersHe[i];
      const b = lettersHe[j];
      gates.push({
        he: `${a}${b}`,
        a, b,
        tr: `${trMap[a]}-${trMap[b]}`,
        gem: (gemMap[a] || 0) + (gemMap[b] || 0)
      });
    }
  }

  let selected = null;

  function renderList(list) {
    elList.innerHTML = "";
    list.forEach((g) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gate-pill";
      btn.textContent = g.he;
      btn.dataset.key = g.he;
      btn.addEventListener("click", () => selectGate(g.he));
      elList.appendChild(btn);
    });
  }

  function markActive(key) {
    elList.querySelectorAll(".gate-pill").forEach(b => {
      b.dataset.active = (b.dataset.key === key) ? "1" : "0";
    });
  }

  function selectGate(key) {
    const g = gates.find(x => x.he === key);
    if (!g) return;

    selected = g;
    markActive(key);

    elLabel.textContent = `Gate ${g.he}`;
    elMeta.textContent = `${g.tr}`;
    elHe.textContent = g.he;
    elTr.textContent = g.tr;
    elGem.textContent = String(g.gem);

    btnSend.disabled = false;
  }

  function filter() {
    const q = (elSearch.value || "").trim().toLowerCase();
    if (!q) return gates;

    // match Hebrew pair or transliteration pieces
    return gates.filter(g => {
      return g.he.includes(q) || g.tr.toLowerCase().includes(q.replace(/\s+/g, ""));
    });
  }

  elSearch.addEventListener("input", () => renderList(filter()));

  btnRandom.addEventListener("click", () => {
    const list = filter();
    if (!list.length) return;
    const g = list[Math.floor(Math.random() * list.length)];
    selectGate(g.he);
  });

  btnSend.addEventListener("click", () => {
    if (!selected) return;
    // Send the gate pairing into Chavruta (prefill)
    const q = `Gate ${selected.he} (${selected.tr}). Torah-first: please bring primary sources for any claims.`;
    window.location.href = `/chavruta.html?q=${encodeURIComponent(q)}`;
  });

  // Initial render
  renderList(gates);
})();
