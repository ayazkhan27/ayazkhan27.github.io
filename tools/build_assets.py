"""Build the portfolio's static assets from the outreach kit.

Run from anywhere:  python3 tools/build_assets.py
Writes: assets/fonts/*.woff2, assets/plate/frame-NN.jpg, assets/gallop-*.gif,
        tools/horse_symbols.svg (pasted into index.html), assets/og.png is made by tools/og.py.
"""
import json, re, pathlib
from PIL import Image, ImageDraw, ImageChops
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT.parent  # 06_outreach_kit
ART, FONTS = KIT / "art", KIT / "fonts_poster"
frames = json.load(open(ART / "horses.json"))

# ---- fonts: Latin subset to woff2 -------------------------------------------
(ROOT / "assets/fonts").mkdir(parents=True, exist_ok=True)
UNI = "U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2032-2033,U+2190-2192,U+2212,U+00D7,U+2264-2265"
for src, out in [("LTAfficherNeue-BoldDisplay.otf", "afficher-bold"),
                 ("Alphazet-Light.otf", "alphazet-light"),
                 ("Alphazet-SemiBold.otf", "alphazet-semibold")]:
    f = TTFont(FONTS / src)
    opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["kern", "liga", "tnum", "lnum", "pnum"]
    opts.name_IDs = ["*"]; opts.notdef_outline = True
    s = subset.Subsetter(opts); s.populate(unicodes=subset.parse_unicodes(UNI)); s.subset(f)
    f.flavor = "woff2"; f.save(ROOT / f"assets/fonts/{out}.woff2")

# ---- horse traces -> integer-coordinate SVG symbols in a shared panel box ----
def subpaths(d):
    for part in re.findall(r"M[^MZ]+Z?", d):
        nums = list(map(float, re.findall(r"-?\d+\.?\d*", part)))
        yield [(nums[i], nums[i + 1]) for i in range(0, len(nums), 2)]

VB_W, VB_H = 1280, 816
syms = []
for e in frames:
    d = " ".join("M" + " L".join(f"{round(x + e['x'])} {round(y + e['y'])}" for x, y in sp) + "Z"
                 for sp in subpaths(e["d"]))
    d = d.replace(" L", "L")
    syms.append(f'<symbol id="h{e["n"]}" viewBox="0 0 {VB_W} {VB_H}"><path fill-rule="evenodd" d="{d}"/></symbol>')
(ROOT / "tools/horse_symbols.svg").write_text("\n".join(syms))

# ---- the real 1878 plate, cut into its twelve panels ------------------------
plate = Image.open(ART / "The_Horse_in_Motion_high_res.jpg").convert("L")
k = plate.width / 1400  # panel boxes measured on a 1400px-wide copy
cols = [(36, 352), (372, 688), (706, 1022), (1042, 1358)]
rows = [(40, 238), (258, 458), (478, 678)]
(ROOT / "assets/plate").mkdir(parents=True, exist_ok=True)
n = 0
for (y0, y1) in rows:
    for (x0, x1) in cols:
        n += 1
        p = plate.crop((int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k)))
        p.thumbnail((360 if n == 12 else 240, 400), Image.LANCZOS)
        p.save(ROOT / f"assets/plate/frame-{n:02d}.jpg", quality=62, optimize=True, progressive=True)

# ---- email-safe two-colour GIFs (frames 1-11, the gallop) -------------------
def silhouette(e, w, h, scale, ox, oy):
    """Even-odd fill at 4x, by XOR-ing each subpath, then downsample to 1-bit."""
    S = 4
    acc = Image.new("1", (w * S, h * S), 0)
    for sp in subpaths(e["d"]):
        m = Image.new("1", acc.size, 0)
        ImageDraw.Draw(m).polygon([((x + e["x"]) * scale * S + ox * S, (y + e["y"]) * scale * S + oy * S) for x, y in sp], fill=1)
        acc = ImageChops.logical_xor(acc, m)
    return acc.convert("L").resize((w, h), Image.BOX).point(lambda v: 255 if v >= 110 else 0)

GW, GH = 150, 92
scale = (GW - 4) / VB_W
gallop = [e for e in frames if e["n"] <= 11]
masks = [silhouette(e, GW, GH, scale, 2, -4) for e in gallop]
ACCENTS = ["035397", "005ca0", "006e6f", "bb0916", "00673f", "a12433", "137738", "1b1d1f"]
for hx in ACCENTS:
    ink = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
    pal = [255, 255, 255, *ink] + [0] * (254 * 3)
    imgs = []
    for m in masks:
        im = Image.new("P", (GW, GH), 0); im.putpalette(pal)
        im.paste(1, mask=m); imgs.append(im)
    out = ROOT / f"assets/gallop-{hx}.gif"
    imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=80, loop=0, optimize=True, disposal=1)
    assert out.stat().st_size <= 10_240, (out, out.stat().st_size)
print("ok")
