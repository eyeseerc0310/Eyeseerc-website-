"""Makes the tiny blurred previews shown while photos load (_data/blur.yml).

Run it after adding or replacing photos:   python3 tools/make_blur.py
For every photo in photos/photography, photos/projects and photos/shop it
stores a very small, soft copy (a few hundred bytes) plus the photo's size,
so the page can show the soft version straight away and keep the right shape.
"""
import base64, io, os
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FOLDERS = ['photos/photography', 'photos/projects', 'photos/shop']
EXTS = ('.jpg', '.jpeg', '.png', '.webp')

def preview(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = im.size
    im.thumbnail((24, 24))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=55, optimize=True)
    return w, h, 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

lines = ['# Tiny blurred previews shown while each photo loads (made by',
         '# tools/make_blur.py - run it again after adding photos).']
for folder in FOLDERS:
    for dirpath, _, files in sorted(os.walk(os.path.join(ROOT, folder))):
        for f in sorted(files):
            if not f.lower().endswith(EXTS):
                continue
            full = os.path.join(dirpath, f)
            rel = '/' + os.path.relpath(full, ROOT).replace(os.sep, '/')
            w, h, uri = preview(full)
            lines.append('"%s":' % rel)
            lines.append('  w: %d' % w)
            lines.append('  h: %d' % h)
            lines.append('  src: "%s"' % uri)
open(os.path.join(ROOT, '_data', 'blur.yml'), 'w').write('\n'.join(lines) + '\n')
print('previews:', (len(lines) - 2) // 4)
