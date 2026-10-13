# EYESEERC site — notes for Claude

Jekyll photography portfolio, deployed to GitHub Pages from `main`:
https://eyeseerc.com/ (custom domain; DNS at Cloudflare, records "DNS only").
The old https://eyeseerc0310.github.io/Eyeseerc-website-/ forwards there.
Links use `relative_url` (base path is "": the workflow builds for the domain root).

## Ship every change
1. Build + check with Playwright (phone 390, iPad 820, desktop 1440).
2. `tools/ship.sh "message"` — commits (with trailers) and pushes the work branch.
3. Open a PR to `main` and merge it (merge commit).
4. `tools/ship.sh --deploy` — syncs the branch and waits for the Pages deploy.
5. Reply in plain language with the live link plus a new `?v=N` (cache-buster).

## Local build / test
- Build: `bundle exec jekyll build -q -d <scratch>/_site`, serve with `python3 -m http.server`.
- The body is the scroll container (`document.body.scrollTop`), not the window.
- Click buttons in tests via `evaluate(el => el.click())`; locator clicks scroll.
- The splash screen covers the first ~3 s of a visit.
- Test browser can't reach Google Fonts: route them to local copies of Jost.

## Where things live
- `_layouts/default.html` — header, menu, footer (one layout for every page).
- `index.html` — home slideshow + the about section (`_includes/about.html`;
  bio text in `_includes/about-bio.md`).
- `photography.html`, `projects.html`, `shop.html` (+ `_data/shop.yml`), `cart.html`.
- `_includes/gallery.html` — every photo grid; photos come from `photos/<folder>/`.
- `assets/css/style.css` — sections marked `/* ---------- Name ---------- */`;
  theme tokens and motion (`--ease`, `--ease-soft`) at the top.
- `assets/js/site.js` — one IIFE per feature, each with a header comment.
  Page swaps fire `pageswap:start` / `pageswap:done`.
  Paint (`/draw/`, 5 clicks on the footer mark) and Darkroom (`/darkroom/`,
  from Projects) are the big modules at the end.

## Taste
- Motion is slow-fast-slow (bell curve). Quiet, editorial, photos first.
- Glitches are real bugs: find the cause, no hacks.
