"""Bakes the globe's map texture: R = land coverage, G = land borders, B = country number, read with a nearest-texel lookup.
Also writes the fact table and copies the flags it needs. Map data: Natural Earth (public domain) through world-atlas; flags: flag-icons (MIT).
Both are kept in site_brief/globe_src. The facts live in tools/globe_facts.json. Usage: python3 tools/build_globe.py"""
import json, pathlib, shutil
from PIL import Image, ImageDraw

R = pathlib.Path(__file__).resolve().parent.parent
topo = json.loads((R.parent / "site_brief/globe_src/countries-50m.json").read_text())
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
W, H, S = 2048, 1024, 4


def decode(arc):
    x = y = 0
    out = []
    for dx, dy in arc:
        x += dx
        y += dy
        out.append((x * sx + tx, y * sy + ty))
    return out


arcs = [decode(a) for a in topo["arcs"]]


def ring(ids):
    pts = []
    for i in ids:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts += a[1:] if pts else a
    return pts


def unwrap(pts):
    """The data is stitched across the antimeridian, so make longitude continuous; a ring that winds around a pole closes over it."""
    out = [pts[0]]
    for lon, lat in pts[1:]:
        while lon - out[-1][0] > 180:
            lon -= 360
        while lon - out[-1][0] < -180:
            lon += 360
        out.append((lon, lat))
    if abs(out[-1][0] - out[0][0]) > 180:
        pole = 90 if sum(q[1] for q in out) > 0 else -90
        out += [(out[-1][0], pole), (out[0][0], pole)]
    return out


def px(pts, k, shift=0):
    return [((lon + shift + 180) / 360 * W * k, (90 - lat) / 180 * H * k) for lon, lat in pts]


def area(p):
    return abs(sum(p[i][0] * p[i - 1][1] - p[i - 1][0] * p[i][1] for i in range(len(p)))) / 2


geos = topo["objects"]["countries"]["geometries"]
land, lines, ids = Image.new("L", (W * S, H * S)), Image.new("L", (W * S, H * S)), Image.new("L", (W, H))
dl, dn, di = ImageDraw.Draw(land), ImageDraw.Draw(lines), ImageDraw.Draw(ids)
use = {}
parts = []
for n, g in enumerate(geos, 1):
    polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"]
    for poly in polys:
        for r in poly:
            for i in r:
                k = i if i >= 0 else ~i
                use[k] = use.get(k, 0) + 1
        main = poly[0]                             # holes are enclaves, and the enclave paints itself on top
        if len(poly) > 1 and all(abs(q[1]) > 89 for q in ring(main)):
            main = poly[1]                         # Antarctica: on a sphere its outer ring circles the pole and its coast is the "hole"
        parts.append((n, unwrap(ring(main))))
for n, pts in sorted(parts, key=lambda t: -area(t[1])):
    for shift in (-360, 0, 360):
        dl.polygon(px(pts, S, shift), fill=255)
        di.polygon(px(pts, 1, shift), fill=n)
for k, c in use.items():
    if c > 1:                                      # an arc two countries share is a border; a coast comes from the land edge
        for shift in (-360, 0, 360):
            dn.line(px(unwrap(arcs[k]), S, shift), fill=255, width=4)
box = Image.Resampling.BOX
out = Image.merge("RGB", (land.resize((W, H), box), lines.resize((W, H), box), ids))
out.save(R / "assets/jojo/globe.png", optimize=True)
print(len(geos), "countries", (R / "assets/jojo/globe.png").stat().st_size, "bytes")

ids = {g["properties"]["name"]: n for n, g in enumerate(geos, 1)}
facts = json.loads((R / "tools/globe_facts.json").read_text())
flags = R / "assets/flags"
flags.mkdir(exist_ok=True)
for old in flags.glob("*.svg"):
    old.unlink()
shutil.copy(R.parent / "site_brief/globe_src/flags/LICENSE", flags / "LICENSE")
table = []
for f in facts:
    assert len(f["fact"].split()) <= 26, f["fact"]
    table.append(dict(iso=f["iso"], name=f["name"], id=ids[f.get("atlas", f["name"])], lat=f["lat"], lon=f["lon"], fact=f["fact"], src=f["src"]))
    shutil.copy(R.parent / f"site_brief/globe_src/flags/{f['iso']}.svg", flags / f"{f['iso']}.svg")
(R / "assets/jojo/globe-facts.js").write_text("/* Written by tools/build_globe.py from tools/globe_facts.json. */\nexport const FACTS = " + json.dumps(table, ensure_ascii=False, indent=0) + ";\n")
print(len(table), "facts", sum(p.stat().st_size for p in flags.glob("*.svg")), "bytes of flags")
