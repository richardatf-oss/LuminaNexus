from pathlib import Path
from itertools import combinations

ROOT = Path("gates")

LETTERS = [
    ("alef", "א", "Aleph"),
    ("bet", "ב", "Bet"),
    ("gimel", "ג", "Gimel"),
    ("dalet", "ד", "Dalet"),
    ("he", "ה", "He"),
    ("vav", "ו", "Vav"),
    ("zayin", "ז", "Zayin"),
    ("chet", "ח", "Chet"),
    ("tet", "ט", "Tet"),
    ("yod", "י", "Yod"),
    ("kaf", "כ", "Kaf"),
    ("lamed", "ל", "Lamed"),
    ("mem", "מ", "Mem"),
    ("nun", "נ", "Nun"),
    ("samekh", "ס", "Samekh"),
    ("ayin", "ע", "Ayin"),
    ("pe", "פ", "Pe"),
    ("tsadi", "צ", "Tsadi"),
    ("qof", "ק", "Qof"),
    ("resh", "ר", "Resh"),
    ("shin", "ש", "Shin"),
    ("tav", "ת", "Tav"),
]

GLOBAL_CSS = "/assets/css/global.css"


def page_shell(title: str, description: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="{description}" />
  <link rel="stylesheet" href="{GLOBAL_CSS}" />
  <style>
    .gates-page {{
      padding-bottom: 3rem;
    }}

    .gates-wrap {{
      max-width: 1040px;
      margin: 0 auto;
    }}

    .gates-card {{
      margin-top: 2rem;
      padding: 2rem 2.2rem;
      border-radius: 28px;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.07), transparent 55%),
        rgba(4, 10, 26, 0.96);
      box-shadow:
        0 22px 52px rgba(0, 0, 0, 0.78),
        0 0 0 1px rgba(255,255,255,0.03);
      box-sizing: border-box;
    }}

    .gates-kicker {{
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.8rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.9;
      margin-bottom: 0.8rem;
    }}

    .gates-title {{
      margin: 0 0 0.6rem 0;
      font-size: clamp(1.7rem, 3vw, 2.3rem);
      line-height: 1.15;
    }}

    .gates-sub {{
      margin: 0 0 1.1rem 0;
      opacity: 0.88;
      line-height: 1.6;
      max-width: 48rem;
    }}

    .gates-grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      margin-top: 1.2rem;
    }}

    .gate-card {{
      padding: 1rem 1.1rem 1.15rem;
      border-radius: 18px;
      background: rgba(3, 7, 20, 0.95);
      border: 1px solid rgba(255,255,255,0.06);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
      box-sizing: border-box;
    }}

    .gate-card h3 {{
      margin: 0 0 0.35rem 0;
      font-size: 1rem;
    }}

    .gate-card p {{
      margin: 0 0 0.5rem 0;
      opacity: 0.86;
      line-height: 1.55;
      font-size: 0.93rem;
    }}

    .gate-block {{
      margin-top: 1.1rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      background: rgba(3, 7, 20, 0.95);
      border: 1px solid rgba(255,255,255,0.06);
    }}

    .gate-block h2 {{
      margin: 0 0 0.45rem 0;
      font-size: 1.02rem;
    }}

    .gate-block p, .gate-block li {{
      opacity: 0.9;
      line-height: 1.65;
      font-size: 0.95rem;
    }}

    .gate-actions {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin-top: 1rem;
    }}

    @media (max-width: 780px) {{
      .gates-card {{
        padding: 1.5rem 1.3rem;
        border-radius: 22px;
      }}

      .gates-grid {{
        grid-template-columns: 1fr;
      }}

      .gate-card,
      .gate-block {{
        border-radius: 16px;
      }}
    }}
  </style>
</head>
<body class="ln-dark">
  <header class="topbar">
    <div class="topbar-inner">
      <a href="/" class="brand" aria-label="LuminaNexus home">
        <span class="brand-title">LuminaNexus</span>
        <span class="brand-subtitle">Sanctuary · Study · Build</span>
      </a>

      <nav class="nav-links" aria-label="Main navigation">
        <a href="/about.html">About</a>
        <a href="/chavruta.html">Chavruta</a>
        <a href="/library/">Library</a>
        <a href="/map.html">Map</a>
        <a href="/seal.html">Seal</a>
        <a href="/donate/index.html">Support</a>
      </nav>
    </div>
  </header>

  <main class="container gates-page">
    <div class="gates-wrap">
      {body}
    </div>
  </main>

  <footer class="footer">
    <p class="footer-meta">&copy; 2026 LuminaNexus · The Gates.</p>
  </footer>
</body>
</html>
"""


def make_root_index():
    cards = []
    for slug, heb, eng in LETTERS[:-1]:
        cards.append(f"""
        <article class="gate-card">
          <h3>{eng} · {heb}</h3>
          <p>
            Begin with the gates that open from {eng}. Each pairing explores one
            small threshold of meaning, reflection, and practice.
          </p>
          <a href="/gates/{slug}/" class="card-link">Open {eng} gates →</a>
        </article>
        """)

    body = f"""
    <section class="gates-card">
      <div class="gates-kicker">The Gates · שְׁעָרִים</div>
      <h1 class="gates-title">The 231 Gates</h1>
      <p class="gates-sub">
        The Hebrew letters combine into 231 living gates. Each pairing opens a
        different path of meaning, meditation, and study. This is the formal
        entrance to the combinatorial heart of LuminaNexus.
      </p>
      <div class="gate-actions">
        <a href="/library/" class="btn btn-secondary">← Back to the Library</a>
        <a href="/chavruta.html" class="btn btn-primary">Bring a question to Chavruta →</a>
      </div>
    </section>

    <section class="gates-card">
      <h2 class="gates-title" style="font-size:1.35rem;">Choose a letter-stream</h2>
      <p class="gates-sub">
        Start with one letter and walk its combinations outward. Over time, these
        gates can become meditations, source sheets, and living pathways through
        the Celestial Library.
      </p>
      <div class="gates-grid">
        {''.join(cards)}
      </div>
    </section>
    """
    return page_shell("The 231 Gates — LuminaNexus", "The 231 Gates of letter-combination.", body)


def make_letter_index(first):
    first_slug, first_heb, first_eng = first
    later_letters = LETTERS[LETTERS.index(first) + 1:]

    cards = []
    for second_slug, second_heb, second_eng in later_letters:
        cards.append(f"""
        <article class="gate-card">
          <h3>{first_heb}–{second_heb} · {first_eng}–{second_eng}</h3>
          <p>
            A gate joining {first_eng} and {second_eng}. Enter the page to develop
            theme, sources, meditation, and practice.
          </p>
          <a href="/gates/{first_slug}/{first_slug}-{second_slug}.html" class="card-link">Open gate →</a>
        </article>
        """)

    body = f"""
    <section class="gates-card">
      <div class="gates-kicker">{first_eng} Gates · {first_heb}</div>
      <h1 class="gates-title">Gates beginning with {first_eng}</h1>
      <p class="gates-sub">
        These are the pairings that open from {first_eng}. Together they form one
        stream through the wider 231-gate structure.
      </p>
      <div class="gate-actions">
        <a href="/gates/" class="btn btn-secondary">← All gates</a>
      </div>
    </section>

    <section class="gates-card">
      <div class="gates-grid">
        {''.join(cards)}
      </div>
    </section>
    """
    return page_shell(
        f"{first_eng} Gates — LuminaNexus",
        f"Gates beginning with {first_eng}.",
        body
    )


def make_gate_page(first, second):
    first_slug, first_heb, first_eng = first
    second_slug, second_heb, second_eng = second

    title = f"Gate {first_heb}–{second_heb} · {first_eng}–{second_eng}"

    body = f"""
    <section class="gates-card">
      <div class="gates-kicker">Gate {first_heb}–{second_heb}</div>
      <h1 class="gates-title">{title}</h1>
      <p class="gates-sub">
        This is a skeleton page for the gate {first_heb}–{second_heb}. Over time,
        this page can be filled with source texts, symbolic meaning, meditation,
        and one small practice.
      </p>
      <div class="gate-actions">
        <a href="/gates/{first_slug}/" class="btn btn-secondary">← Back to {first_eng} gates</a>
        <a href="/chavruta.html" class="btn btn-primary">Ask Chavruta about this gate →</a>
      </div>
    </section>

    <section class="gates-card">
      <div class="gate-block">
        <h2>Theme</h2>
        <p>
          Write a short reflection on what {first_eng} and {second_eng} suggest
          together. Keep it concise: 2–4 sentences is enough for a first pass.
        </p>
      </div>

      <div class="gate-block">
        <h2>Sources</h2>
        <ul>
          <li>Sefer Yetzirah — add relevant chapter / mishnah</li>
          <li>Tanakh — add one or two verses</li>
          <li>Classical commentary — add one interpretive source</li>
        </ul>
      </div>

      <div class="gate-block">
        <h2>Meditation</h2>
        <p>
          Add a brief contemplation: how this gate feels, what it opens, what it
          invites the reader to notice.
        </p>
      </div>

      <div class="gate-block">
        <h2>Practice</h2>
        <p>
          Add one small embodied action for the week. Keep it simple and doable.
        </p>
      </div>
    </section>
    """
    return page_shell(
        f"{title} — LuminaNexus",
        f"Gate {first_heb}-{second_heb} in the 231 Gates.",
        body
    )


def main():
    ROOT.mkdir(exist_ok=True)

    # Root gates index
    (ROOT / "index.html").write_text(make_root_index(), encoding="utf-8")

    # Letter indices + gate files
    for i, first in enumerate(LETTERS[:-1]):
        first_slug, _, _ = first
        first_dir = ROOT / first_slug
        first_dir.mkdir(exist_ok=True)

        (first_dir / "index.html").write_text(make_letter_index(first), encoding="utf-8")

        for second in LETTERS[i + 1:]:
            second_slug, _, _ = second
            filename = f"{first_slug}-{second_slug}.html"
            (first_dir / filename).write_text(make_gate_page(first, second), encoding="utf-8")

    print("Generated 231 Gate skeleton under ./gates")


if __name__ == "__main__":
    main()
