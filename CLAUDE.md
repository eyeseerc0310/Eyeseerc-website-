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
- `tools/make_blur.py` — soft previews + grid-size copies (`thumbs/640|1280/…`,
  gitignored; a JPEG and a WebP each, the WebP at the lowest quality that's
  as faithful as the JPEG) listed in `_data/blur.yml` (`srcset`, `webp`); the
  Pages workflow runs it on every publish. Run it locally before building.
  Thumbs live outside `/photos/` on purpose (the grids list everything under
  `/photos/<folder>/`). Originals are never re-encoded: the viewer and the
  home slideshow show them as they are.
- Photos in grids are `<picture>` (WebP first); `picture { display: contents }`
  so it adds no box. Their `sizes` follow the columns (`tile_sizes` in
  `gallery.html`, and the photos-per-row switch sets it). Logo:
  `home-mark.webp` (lossless, pixel-identical) with the PNG behind it.
- Shop body is `_includes/shop-page.html`; `_plugins/shop_pages.rb` makes
  `/shop/<title-slug>/` for each item, which opens that item.
- `assets/css/style.css` — sections marked `/* ---------- Name ---------- */`;
  theme tokens, fonts (`--sans` Jost, `--serif` Cormorant Garamond) and
  motion (`--ease`, `--ease-soft`) at the top.
- `assets/js/site.js` — one IIFE per feature, each with a header comment.
  Page swaps fire `pageswap:start` / `pageswap:done`.
  Paint (`/draw/`, 5 clicks on the footer mark) and Darkroom (`/darkroom/`,
  from Projects) are in `assets/js/studio.js`, loaded only by those pages
  (`studio: true` in their front matter) or fetched by a page swap into one
  (`pageswap:incoming`, which the swap waits for).
- Keep scroll handlers cheap: read layout once a frame at most (rAF) and
  write only what changed.

## Taste
- Motion is slow-fast-slow (bell curve). Quiet, editorial, photos first.
- Glitches are real bugs: find the cause, no hacks.
