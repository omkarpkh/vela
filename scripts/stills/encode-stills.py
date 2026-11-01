"""Encodes the component stills for the site, from the 2x PNG masters npm run stills renders.

Called by scripts/stills/stills.mjs, with no npm dependency: it needs Python 3 and Pillow 11 or later
built with AVIF (RELEASING.md). For each master and its key it writes, to the output folder:
  <stem>@2x.avif  AVIF at 2x, quality 60, speed 6: a flat picture of a control needs no more
  <stem>.png      PNG at 1x, the master resized by half with LANCZOS, optimised, with the key in a
                  tEXt chunk, vela-source-sha256 (src/styles/site-stills.test.ts reads it back)
One JSON line per file goes to stdout.

  python3 encode-stills.py <out-dir> <master.png> <key> [<master.png> <key>]...
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image, PngImagePlugin, features

AVIF_QUALITY = 60
KEY = 'vela-source-sha256'


def main(argv):
    if not features.check('avif'):
        sys.exit('encode-stills: this Pillow has no AVIF support; npm run stills needs Pillow 11 or later with it')
    out = Path(argv[0])
    rest = argv[1:]
    for path, key in zip(rest[0::2], rest[1::2]):
        path = Path(path)
        stem = path.name.removesuffix('@2x.png')
        master = Image.open(path).convert('RGB')
        buf = io.BytesIO()
        master.save(buf, 'AVIF', quality=AVIF_QUALITY, speed=6)
        (out / f'{stem}@2x.avif').write_bytes(buf.getvalue())
        print(json.dumps({'file': f'{stem}@2x.avif', 'bytes': len(buf.getvalue()), 'quality': AVIF_QUALITY,
                          'size': f'{master.width} x {master.height}'}), flush=True)
        half = master.resize((master.width // 2, master.height // 2), Image.LANCZOS)
        info = PngImagePlugin.PngInfo()
        info.add_text(KEY, key)
        buf = io.BytesIO()
        half.save(buf, 'PNG', optimize=True, pnginfo=info)
        (out / f'{stem}.png').write_bytes(buf.getvalue())
        print(json.dumps({'file': f'{stem}.png', 'bytes': len(buf.getvalue()), 'size': f'{half.width} x {half.height}'}), flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])
