"""Encodes the mood stills for the site, from the 2x PNG masters npm run brand:stills renders.

Called by scripts/brand/stills.mjs, with no npm dependency: it needs Python 3 and Pillow 11 or
later built with AVIF and WebP (RELEASING.md). For each master it writes, to the output folder:
  <stem>@2x.avif  AVIF, starting at quality 80, speed 6
  <stem>@1x.avif  AVIF, starting at quality 90, from the master resized by half with LANCZOS
  <stem>@2x.webp  WebP, starting at quality 90, method 6
  <stem>@1x.webp  the same, at 1x
Every file must be at most 250 kB (BUDGET); one that is over is encoded again, 5 quality points
lower each time, until it fits. One JSON line per file goes to stdout.

  python3 encode-stills.py <out-dir> [--crops <dir>] <master.png>...

With --crops, it also writes crops-<stem>.png: 400 x 400 from the bottom-right corner, where the
rings are, of the PNG master, the 2x AVIF and the 2x WebP, side by side.
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, features

BUDGET = 250_000  # bytes; src/styles/brand.test.ts holds the shipped files to the same number
START = {('avif', 2): 80, ('avif', 1): 90, ('webp', 2): 90, ('webp', 1): 90}
FLOOR = 40


def encode(img, fmt, quality):
    buf = io.BytesIO()
    if fmt == 'avif':
        img.save(buf, 'AVIF', quality=quality, speed=6)
    else:
        img.save(buf, 'WEBP', quality=quality, method=6)
    return buf.getvalue()


def fit(img, fmt, scale):
    q = START[(fmt, scale)]
    while True:
        data = encode(img, fmt, q)
        if len(data) <= BUDGET or q <= FLOOR:
            return data, q
        q -= 5


def crops(master, avif, webp, out):
    s, gap, top = 400, 16, 28
    tiles = [('PNG master', master), ('AVIF 2x', avif), ('WebP 2x', webp)]
    sheet = Image.new('RGB', (len(tiles) * s + (len(tiles) - 1) * gap, s + top), 'white')
    draw = ImageDraw.Draw(sheet)
    for k, (label, im) in enumerate(tiles):
        w, h = im.size
        sheet.paste(im.convert('RGB').crop((w - s, h - s, w, h)), (k * (s + gap), top))
        draw.text((k * (s + gap) + 4, 8), label, fill=(27, 34, 37))
    sheet.save(out)


def main(argv):
    if not (features.check('avif') and features.check('webp')):
        sys.exit('encode-stills: this Pillow has no AVIF or no WebP support; brand:stills needs Pillow 11 or later with both')
    out = Path(argv[0])
    rest = argv[1:]
    crop_dir = None
    if rest[:1] == ['--crops']:
        crop_dir, rest = Path(rest[1]), rest[2:]
    for path in map(Path, rest):
        stem = path.name.removesuffix('@2x.png')
        master = Image.open(path).convert('RGB')
        half = master.resize((master.width // 2, master.height // 2), Image.LANCZOS)
        written = {}
        for fmt in ('avif', 'webp'):
            for scale, img in ((2, master), (1, half)):
                data, q = fit(img, fmt, scale)
                name = f'{stem}@{scale}x.{fmt}'
                (out / name).write_bytes(data)
                written[(fmt, scale)] = data
                print(json.dumps({'file': name, 'bytes': len(data), 'quality': q, 'start': START[(fmt, scale)],
                                  'size': f'{img.width} x {img.height}', 'fits': len(data) <= BUDGET}), flush=True)
        if crop_dir:
            crops(master, Image.open(io.BytesIO(written[('avif', 2)])), Image.open(io.BytesIO(written[('webp', 2)])),
                  crop_dir / f'crops-{stem}.png')


if __name__ == '__main__':
    main(sys.argv[1:])
