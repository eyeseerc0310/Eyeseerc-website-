# EYESEERC — Website

A simple photography portfolio with a **Home** page (your bio + photo),
three galleries — **Color**, **Black & White**, **Art** — and a **Shop**.

Everything can be edited right here on GitHub, from a computer or phone browser.
After any change, the site updates itself in about 1–2 minutes.

---

## ✏️ Edit your info (Home page)

1. Open **`index.md`** → click the ✏️ pencil icon.
2. Replace the sample text with your own words. Click **Commit changes**.

Your name, tagline, email and Instagram are in **`_config.yml`** (same steps).

## 📷 Add your photo of yourself

1. Open the **`images`** folder → **Add file → Upload files**.
2. Upload your picture named exactly **`me.jpg`**. Commit.
   It shows as a landscape photo in the 3:2 shape of a full-frame camera, so
   straight-off-camera shots fit perfectly (other shapes are cropped to fit).

## ✨ Add your logo

Upload your logo into the **`images`** folder named **`logo.png`**
(or `logo.svg` / `logo.jpg` / `logo.webp`). It appears automatically beside
EYESEERC in the top-left corner and on the home page.
A PNG with a transparent background looks best. To remove it, delete the file.

## 🖼️ Upload portfolio photos

Open the folder for the gallery you want, then **Add file → Upload files**:

| Gallery          | Folder                     |
|------------------|----------------------------|
| Color            | `photos/color`             |
| Black & White    | `photos/black-and-white`   |
| Art              | `photos/art`               |

- Photos appear automatically — no code needed. (JPG, PNG, WEBP, GIF.)
- They're shown in alphabetical order by file name. To control the order,
  start names with numbers: `01-sunset.jpg`, `02-city.jpg` …
- The file name becomes the caption (`golden-hour.jpg` → "golden hour").
- To remove a photo, open it on GitHub → ⋯ menu → **Delete file**.
- Tip: resize photos to about **2500px wide** before uploading so pages load fast.

## 🛒 Shop

Open **`_data/shop.yml`** and follow the example inside. For each item you
give a title, price, picture and a **buy link**. Easy ways to get a buy link:

- **Stripe Payment Links** (stripe.com) – card payments, no website code
- **PayPal** "Pay with a link", **Square** online checkout, or an **Etsy** listing

If you leave out the buy link, the button emails you instead (set your email in `_config.yml`).

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
