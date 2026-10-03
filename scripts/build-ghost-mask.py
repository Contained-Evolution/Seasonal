"""Rebuild the bundled stencil mask from the original generated artwork."""

import base64
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "public" / "ghost-moon-source.png"
target = ROOT / "src" / "data" / "ghost-mask.json"
image = Image.open(source).convert("L").resize((256, 256), Image.Resampling.LANCZOS)
mask = [1 if value < 128 else 0 for value in image.getdata()]
# Two 5 mm bridges connect the retained ghost face to the surrounding skin.
# They cross the upper and right-hand outline, without crossing the moon.
for x0, y0, x1, y1 in ((158, 43, 169, 68), (199, 119, 224, 129)):
    for y in range(y0, y1):
        for x in range(x0, x1):
            mask[y * 256 + x] = 0
packed = bytearray(8192)
for index, value in enumerate(mask):
    if value:
        packed[index // 8] |= 1 << (7 - index % 8)
target.write_text(json.dumps({"size": 256, "bits": base64.b64encode(packed).decode("ascii")}) + "\n")
