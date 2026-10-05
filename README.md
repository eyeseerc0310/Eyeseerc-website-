# EYESEERC — Website

A simple photography portfolio with a **Home** page (your bio + photo),
two galleries — **Photography** and **Projects** — and a **Shop**.

Everything can be edited right here on GitHub, from a computer or phone browser.
After any change, the site updates itself in about 1–2 minutes.

---

## ✏️ Edit your info (Home page)

1. Open **`index.md`** → click the ✏️ pencil icon.
2. Replace the sample text with your own words. Click **Commit changes**.

Your name, tagline, email and Instagram are in **`_config.yml`** (same steps).

## 📷 Add your photo of yourself

1. Open the **`images`** folder, then the **`me`** folder → **Add file → Upload files**.
2. Choose your photo (any file name is fine). Click **Commit changes**.

It shows as a landscape photo in the 3:2 shape of a full-frame camera, so
straight-off-camera shots fit perfectly (other shapes are cropped to fit).
To change it later, delete the old photo from `images/me` and upload the new one.

## ✨ Add your logo

1. Open the **`images`** folder, then the **`logo`** folder → **Add file → Upload files**.
2. Choose your logo (any file name is fine). Click **Commit changes**.

It appears automatically just to the right of EYESEERC in the top-left corner
of every page. A PNG with a transparent background looks best.
To change it, delete the old file from `images/logo` and upload the new one.

## 🖼️ Upload portfolio photos

Open the folder for the gallery you want, then **Add file → Upload files**:

| Gallery          | Folder                     |
|------------------|----------------------------|
| Photography      | `photos/photography/color` or `photos/photography/black-and-white` |
| Projects         | `photos/projects`          |

- Photos appear automatically — no code needed. (JPG, PNG, WEBP, GIF.)
- On the Photography page, put colour photos in `photos/photography/color` and
  black & white ones in `photos/photography/black-and-white`. The page shows the
  colour photos first; the B&W button switches to the black & white ones.
- They're shown in alphabetical order by file name. To control the order,
  start names with numbers: `01-sunset.jpg`, `02-city.jpg` …
- The file name becomes the caption (`golden-hour.jpg` → "golden hour").
- To remove a photo, open it on GitHub → ⋯ menu → **Delete file**.
- Tip: resize photos to about **2500px wide** before uploading so pages load fast.

## 🛒 Shop

The Shop page has two buttons, **PRINTS** and **SHIRTS**, and shows one at a
time (prints first), three to a row with the price underneath. Clicking a
photo opens that item's page on your print-on-demand site (for example Fine
Art America, Darkroom or a shirt printer), which handles payment, printing
and shipping.

Open **`_data/shop.yml`** and add one block per item: its category (`prints`
or `shirts`), the photo, its shape (landscape / portrait / square), the price,
and the link to the product page. Shirt photos can go in `photos/shop`.
The items in there now are temporary samples — replace them with yours.

---

## 🚀 Turn the website on (one time)

1. Merge this work into the **`main`** branch.
2. On GitHub go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Wait ~2 minutes. Your site is live at
   `https://eyeseerc0310.github.io/Eyeseerc-website-/`

> Free GitHub Pages sites require the repository to be **public**
> (or a paid GitHub plan for private repos).

## 🌐 Use your own domain (e.g. `www.yourname.com`)

1. Buy a domain (Namecheap, Cloudflare, Porkbun, Squarespace Domains, GoDaddy…).
2. In your domain company's **DNS settings**, add:

   | Type    | Name / Host | Value                     |
   |---------|-------------|---------------------------|
   | `CNAME` | `www`       | `eyeseerc0310.github.io`  |
   | `A`     | `@`         | `185.199.108.153`         |
   | `A`     | `@`         | `185.199.109.153`         |
   | `A`     | `@`         | `185.199.110.153`         |
   | `A`     | `@`         | `185.199.111.153`         |

3. On GitHub: **Settings → Pages → Custom domain**, type `www.yourname.com`, click **Save**.
4. Once the check passes (can take up to a few hours), tick **Enforce HTTPS**.

That's it — the links on the site adjust automatically for your domain.

---

<sub>Built with [Jekyll](https://jekyllrb.com). To preview on your own computer:
`bundle install && bundle exec jekyll serve`, then open http://localhost:4000.</sub>
