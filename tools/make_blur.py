"""Makes the light versions of the photos that the pages show (_data/blur.yml
and the thumbs/ folder).

Runs by itself on every publish (see .github/workflows/pages.yml), so just
upload photos as usual. To try it on a computer:   python3 tools/make_blur.py

For every photo in photos/photography, photos/projects and photos/shop it makes
  - a very small, soft copy (a few hundred bytes), shown straight away while
    the photo loads, plus the photo's size so the page keeps the right shape;
  - two smaller copies for the photo grids and the shop (640 and 1280 pixels
    wide), about a tenth of the original's weight. The original, full-quality
    photo is still what opens when a photo is clicked.
"""
import base64, io, os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ['photos/photography', 'photos/projects', 'photos/shop']
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


def thumb(im, rel, width):
    """A copy at most `width` wide, saved under thumbs/<width>/ (as .jpg)."""
    # (thumbs/640/photography/... - no 'photos/' in the path, so the photo
    # grids, which list everything under /photos/..., never count them)
    out_rel = '/thumbs/%d%s.jpg' % (width, os.path.splitext(rel)[0][len('/photos'):])
    out = os.path.join(ROOT, out_rel.lstrip('/'))
    w, h = im.size
    if w > width:
        im = im.resize((width, round(h * width / w)), Image.LANCZOS)
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(os.path.join(ROOT, rel.lstrip('/'))):
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    return out_rel, im.size[0]


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
            lines.append('  srcset: "%s"' % ', '.join('%s %dw' % s for s in sizes))
            lines.append('  thumb: "%s"' % sizes[-1][0])
            count += 1
open(os.path.join(ROOT, '_data', 'blur.yml'), 'w').write('\n'.join(lines) + '\n')
print('photos:', count)
