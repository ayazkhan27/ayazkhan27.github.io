"""v2 assets: albumen-toned plate frames, the photo-finish slit-scan, and a grain tile.

Albumen toning is done beforehand with LightCraft (see README); this script only resizes its output.
Usage: python3 tools/build_v2_assets.py <dir with alb-NN.jpg from lightcraft-cli>
"""
import json, pathlib, random, sys
from PIL import Image, ImageDraw, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART = ROOT.parent / "art"
alb_dir = pathlib.Path(sys.argv[1])

# ---- albumen frames, back to page sizes --------------------------------------
for n in range(1, 13):
    im = Image.open(alb_dir / f"alb-{n:02d}.jpg").convert("RGB")
    im.thumbnail((360 if n == 12 else 240, 400), Image.LANCZOS)
    im.save(ROOT / f"assets/plate/alb-{n:02d}.jpg", quality=60, optimize=True, progressive=True)

# ---- photo finish: a slit-scan of the traced gallop ---------------------------
# A photo-finish camera looks through one fixed vertical slit and paints time left to right.
# The horse runs past the slit at constant speed while the gallop cycles through frames 1-11
# at 1/25 s each, so legs that move faster or slower than the body smear or compress.
frames = [e for e in json.load(open(ART / "horses.json")) if e["n"] <= 11]
S = 0.5                        # panel units -> pixels
H = int(816 * S)
def mask(e):
    m = Image.new("1", (int(1280 * S), H), 0)
    import re
    for part in re.findall(r"M[^MZ]+Z?", e["d"]):
        v = list(map(float, re.findall(r"-?\d+\.?\d*", part)))
        pts = [((v[i] + e["x"]) * S, (v[i + 1] + e["y"]) * S) for i in range(0, len(v), 2)]
        layer = Image.new("1", m.size, 0); ImageDraw.Draw(layer).polygon(pts, fill=1)
        m = ImageChops.logical_xor(m, layer)
    return m
masks = [mask(e) for e in frames]
COLS_PER_FRAME = 48            # columns of film exposed per 1/25 s
SPEED = 0.42                   # horse travel past the slit, pixels per column
SLIT = int(1200 * S)           # slit sits just past the nose at t = 0
width = int((SLIT - 100 * S) / SPEED)
out = Image.new("L", (width, H), 255)
px = out.load()
for c in range(width):
    m = masks[(c // COLS_PER_FRAME) % 11]
    x = int(SLIT - c * SPEED)  # which column of the (moving) horse is under the slit
    if 0 <= x < m.width:
        col = m.crop((x, 0, x + 1, H)).load()
        for y in range(H):
            if col[0, y]: px[width - 1 - c, y] = 0   # mirror: the nose arrives first, at the right
out = out.resize((width, H), Image.LANCZOS)
from PIL import ImageFilter
ink = out.point(lambda v: 255 - v).filter(ImageFilter.GaussianBlur(0.6))   # ink #1b1d1f with soft alpha edges; dark mode inverts it in CSS
Image.merge("RGBA", (*[Image.new("L", out.size, v) for v in (0x1b, 0x1d, 0x1f)], ink)).save(ROOT / "assets/photo-finish.png", optimize=True)

# ---- grain tile for the no-WebGL fallback ------------------------------------
rnd = random.Random(1878)
g = Image.new("L", (64, 64))
g.putdata([max(0, min(255, int(rnd.gauss(214, 26)))) for _ in range(64 * 64)])
g.save(ROOT / "assets/grain.png", optimize=True)
print("photo finish", width, H)
