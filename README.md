# LuminaNexus.org

A Torah-first sanctuary for Noahide seekers and students of Torah, Ivrit, ethical/cosmological Kabbalah, and Physics & Order.

## Frozen Header (Canonical)
1. The Gate
2. Torah First
3. The Seven Laws
4. Study Paths
5. Chavruta
6. The Trees
7. The Library
8. Ivrit HaOr
9. About
10. Blessing

## Tech
- Static HTML/CSS/JS
- Netlify Functions for ChavrutaGPT
- No build step

## ChavrutaGPT Endpoint
POST `/.netlify/functions/chavruta`
Body: `{ "message": "...", "mode": "torah|ivrit|kabbalah|physics" }`

## Environment
Set in Netlify:
- `OPENAI_API_KEY`

## Covenant
- Torah first.
- Non-commercial.
- Respect Noahide dignity and boundaries.
- No halakhic rulings.
- No theurgy.
