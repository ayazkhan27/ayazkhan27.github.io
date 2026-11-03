"""Assemble index.html from tools/page.html.

Inlines the horse symbols, the zoopraxiscope disc, the contact sheet, the Stand hexagon and the Tusk spin marks,
and turns each `data-module="x"` slot into a lazy-load slot (`data-jj="x"`) only when assets/jojo/x.js exists,
so a module that is not there yet costs no request and the slot keeps its static content.
"""
import math
import pathlib
import re

T = pathlib.Path(__file__).resolve().parent
R = T.parent
s = (T / "page.html").read_text()

sheet = "\n          ".join(
    f'<li><button type="button" aria-label="Frame {n}{" (all four hooves off the track)" if n in (2, 3) else ""}">'
    f'<img src="assets/plate/alb-{n:02d}.jpg" width="240" height="150" alt="" decoding="async"></button></li>'
    for n in range(1, 12))
disc = "\n            ".join(
    f'<g transform="rotate({(n - 1) * 360 / 11:.3f})"><use class="d-horse" href="#h{n}" x="-120" y="-428" width="240" height="153"/>'
    f'<text class="d-num" y="-448">{n}</text></g>' for n in range(1, 12))

# Stand parameters, in the official order; A is the outer ring, E the inner one.
PARAMS = [("Power", "A"), ("Speed", "B"), ("Range", "A"), ("Stamina", "A"), ("Precision", "A"), ("Potential", "A")]
RANK = {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1}


def pt(i, r):
    a = math.radians(-90 + 60 * i)
    return r * math.cos(a), r * math.sin(a)


def poly(rs):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, r) for i, r in enumerate(rs)))


hexsvg = ['<svg class="hex" viewBox="-150 -128 300 256" role="img" aria-label="Stand parameters: '
          + ", ".join(f"{n} {g}" for n, g in PARAMS) + '">']
hexsvg += [f'<polygon class="ring" points="{poly([k * 20] * 6)}"/>' for k in range(1, 6)]
hexsvg += [f'<line class="spoke" x1="0" y1="0" x2="{x:.1f}" y2="{y:.1f}"/>' for x, y in (pt(i, 100) for i in range(6))]
hexsvg.append(f'<polygon class="shape" points="{poly([RANK[g] * 20 for _, g in PARAMS])}"/>')
for i, (n, g) in enumerate(PARAMS):
    x, y = pt(i, 122)
    anchor = "middle" if abs(x) < 1 else ("start" if x > 0 else "end")
    dy = -4 if y < -50 else (14 if y > 50 else 4)
    hexsvg.append(f'<text x="{x:.1f}" y="{y + dy:.1f}" text-anchor="{anchor}" aria-hidden="true">{n} <tspan class="g">{g}</tspan></text>')
hexsvg.append("</svg>")

# Tusk spin marks: the arc grows a quarter turn per ACT; the nail spins faster each ACT.
def nail(k):
    r, c = 20, 24
    if k == 4:
        arc = f'<circle class="arc" cx="{c}" cy="{c}" r="{r}"/>'
    else:
        a = math.radians(-90 + 90 * k)
        arc = f'<path class="arc" d="M{c} {c - r}A{r} {r} 0 {1 if k > 2 else 0} 1 {c + r * math.cos(a):.1f} {c + r * math.sin(a):.1f}"/>'
    return (f'<svg class="nail" viewBox="0 0 48 48" aria-hidden="true"><circle class="orbit" cx="{c}" cy="{c}" r="{r}"/>{arc}'
            f'<path class="tip" d="M24 9c3.2 0 4.6 3 4.6 7.5V22h-9.2v-5.5C19.4 12 20.8 9 24 9z"/></svg>')


s = s.replace("<!--DISC-->", disc).replace("<!--SHEET-->", sheet).replace("<!--HEX-->", "".join(hexsvg))
for k in range(1, 5):
    s = s.replace(f"<!--NAIL{k}-->", nail(k))
s = s.replace("<!--SYMBOLS-->", (T / "horse_symbols.svg").read_text())

J = R / "assets" / "jojo"


def slot(m):
    name = m.group(1)
    if not (J / f"{name}.js").exists():
        return f'data-module="{name}"'
    return f'data-jj="{name}"' + (' data-jj-css' if (J / f"{name}.css").exists() else "")


s = re.sub(r'data-module="([a-z]+)"', slot, s)
if (J / "audio.js").exists():
    s = s.replace('<html lang="en">', '<html lang="en" data-audio>', 1)

(R / "index.html").write_text(s)
left = sorted(set(re.findall(r"TODO-FACT[^<]*", s)))
print(len(s.encode()), "bytes;", len(left), "TODO-FACT strings left")
for t in left:
    print("  ", t)
# house rule: no em or en dashes in visible copy
body = re.sub(r"<(script|style|symbol)\b.*?</\1>", "", s[s.index("<body>"):], flags=re.S)
for m in re.finditer(r"[^<>]{0,40}[\u2013\u2014][^<>]{0,40}", re.sub(r"<[^>]+>", " ", body)):
    print("   dash in visible text:", m.group(0).strip())
