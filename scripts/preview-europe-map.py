"""Render the generated europe-map.json as ASCII art for a quick visual check."""
import json
import re

from PIL import Image, ImageDraw

m = json.load(open("src/data/europe-map.json"))
W, H = int(m["width"]), int(m["height"])
img = Image.new("RGB", (W, H), (141, 165, 175))
d = ImageDraw.Draw(img)


def rings(dstr):
    toks = re.findall(r"[MLZ]|[-\d.]+", dstr)
    out, pts, i = [], [], 0
    while i < len(toks):
        t = toks[i]
        if t == "Z":
            if len(pts) >= 3:
                out.append(pts)
            pts = []
            i += 1
            continue
        if t in "ML":
            i += 1
            continue
        pts.append((float(t), float(toks[i + 1])))
        i += 2
    if len(pts) >= 3:
        out.append(pts)
    return out


for c in m["countries"]:
    for part in c["d"]:
        for r in rings(part):
            d.polygon(r, fill=(233, 230, 213))

small = img.resize((110, int(110 * H / W)))
px = small.load()
lines = [
    "".join("#" if px[x, y] == (233, 230, 213) else " " for x in range(small.size[0]))
    for y in range(small.size[1])
]
open("../temp/europe-preview.txt", "w").write("\n".join(lines))
print("wrote ../temp/europe-preview.txt, rows:", len(lines))
