"""Makes the light versions of the photos that the pages show (_data/blur.yml
and the thumbs/ folder).

Runs by itself on every publish (see .github/workflows/pages.yml), so just
upload photos as usual. To try it on a computer:   python3 tools/make_blur.py

For every photo in photos/photography, photos/projects and photos/shop it makes
  - a very small, soft copy (a few hundred bytes), shown straight away while
    the photo loads, plus the photo's size so the page keeps the right shape;
  - two smaller copies for the photo grids and the shop (640 and 1280 pixels
    wide), about a tenth of the original's weight, as JPEG and as WebP (which
    browsers that can show it take: about 30% lighter). Each WebP gets the
    lowest quality that keeps it at least as close to the photo as its JPEG
    twin, so it never looks worse. The original, full-quality photo is still
    what opens when a photo is clicked.
The photo of you (images/me) gets the same smaller copies, for the home page.
"""
import base64, io, math, os
from PIL import Image, ImageChops, ImageOps, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ['photos/photography', 'photos/projects', 'photos/shop', 'images/me']
EXTS = ('.jpg', '.jpeg', '.png', '.webp')
WIDTHS = (640, 1280)


def flat(im):
    """The photo as plain RGB (see-through parts on white)."""
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert('RGB')


def preview(im):
    small = im.copy()
    small.thumbnail((24, 24))
    buf = io.BytesIO()
    small.save(buf, 'JPEG', quality=55, optimize=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def psnr(a, b):
    """How close two pictures are (higher is closer), over all three colours."""
    rms = ImageStat.Stat(ImageChops.difference(a, b)).rms
    mse = sum(r * r for r in rms) / len(rms)
    return 99.0 if mse == 0 else 10 * math.log10(255 * 255 / mse)


def thumb(im, rel, width):
    """A copy at most `width` wide, saved under thumbs/<width>/ as .jpg and .webp."""
    # (thumbs/640/photography/... - no 'photos/' (or 'images/') in the path,
    # so the photo grids, which list everything under /photos/..., never count them)
    out_rel = '/thumbs/%d%s.jpg' % (width, os.path.splitext(rel)[0][len('/photos'):])
    out = os.path.join(ROOT, out_rel.lstrip('/'))
    web_rel = out_rel[:-4] + '.webp'
    web = out[:-4] + '.webp'
    w, h = im.size
    if w > width:
        im = im.resize((width, round(h * width / w)), Image.LANCZOS)
    src_time = os.path.getmtime(os.path.join(ROOT, rel.lstrip('/')))
    if not os.path.exists(out) or os.path.getmtime(out) < src_time or not os.path.exists(web) or os.path.getmtime(web) < src_time:
        os.makedirs(os.path.dirname(out), exist_ok=True)
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=82, optimize=True, progressive=True)
        open(out, 'wb').write(buf.getvalue())
        # the WebP twin: the lowest quality at least as faithful as the JPEG
        want = psnr(im, Image.open(io.BytesIO(buf.getvalue())).convert('RGB'))
        best = None
        for q in (70, 74, 78, 82, 86, 90, 94):
            wb = io.BytesIO()
            im.save(wb, 'WEBP', quality=q, method=5)
            best = wb.getvalue()
            if psnr(im, Image.open(io.BytesIO(best)).convert('RGB')) >= want:
                break
        open(web, 'wb').write(best)
    return out_rel, im.size[0], web_rel


lines = ['# Light versions of each photo (made by tools/make_blur.py, which runs',
         '# by itself on every publish): a tiny soft preview shown while it loads,',
         '# its size, and the smaller copies used in the grids (thumbs/).']
count = 0
for folder in FOLDERS:
    for dirpath, _, files in sorted(os.walk(os.path.join(ROOT, folder))):
        for f in sorted(files):
            if not f.lower().endswith(EXTS):
                continue
            full = os.path.join(dirpath, f)
            rel = '/' + os.path.relpath(full, ROOT).replace(os.sep, '/')
            im = flat(ImageOps.exif_transpose(Image.open(full)))
            w, h = im.size
            lines.append('"%s":' % rel)
            lines.append('  w: %d' % w)
            lines.append('  h: %d' % h)
            lines.append('  src: "%s"' % preview(im))
            sizes = [thumb(im, rel, width) for width in WIDTHS]
            lines.append('  srcset: "%s"' % ', '.join('%s %dw' % s[:2] for s in sizes))
            lines.append('  webp: "%s"' % ', '.join('%s %dw' % (s[2], s[1]) for s in sizes))
            lines.append('  thumb: "%s"' % sizes[-1][0])
            count += 1
open(os.path.join(ROOT, '_data', 'blur.yml'), 'w').write('\n'.join(lines) + '\n')
print('photos:', count)
