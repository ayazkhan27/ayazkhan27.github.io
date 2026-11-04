"""Repaint the Columbia and NSF marks in the title-card paint: stepped violet extrude, ink outline, gold-to-red or ivory fill.
Sources sit outside the repo in site_brief/logos_src. Writes assets/logos/columbia-jojo.svg and assets/logos/nsf-jojo.svg."""
import pathlib, re
import xml.etree.ElementTree as ET
R = pathlib.Path(__file__).resolve().parent.parent
SRC = R.parent / "site_brief" / "logos_src"
NS = "{http://www.w3.org/2000/svg}"
INK, EXT, IVORY = "#0c0710", "#5a2390", "#f4ead2"
GOLD = '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3a8"/><stop offset=".45" stop-color="#ffc83d"/><stop offset=".78" stop-color="#ef8a1d"/><stop offset="1" stop-color="#b3151d"/></linearGradient>'

def steps(ref, n, dx, dy, sw):
    return "".join(f'<use href="#{ref}" fill="{EXT}" stroke="{EXT}" stroke-width="{sw}" stroke-linejoin="round" transform="translate({k*dx:.2f} {k*dy:.2f})"/>' for k in range(n, 0, -1))
def inked(ref, fill, sw):
    return f'<use href="#{ref}" fill="{INK}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round"/><use href="#{ref}" fill="{fill}"/>'

# Columbia: crown, then the two lines of the wordmark, told apart by where each glyph starts
root = ET.parse(SRC / "Columbia_University_1754.svg").getroot()
crown, top, low = [], [], []
for e in root.iter():
    tag = e.tag.replace(NS, "")
    if tag == "polygon": crown.append(f'<polygon points="{e.get("points")}"/>'); continue
    if tag != "path": continue
    m = re.match(r"[mM]\s*(-?\d*\.?\d+)[\s,]*(-?\d*\.?\d+)", e.get("d"))
    x, y = float(m[1]), float(m[2])
    (crown if x < 46 else low if y > 38 else top).append(f'<path d="{e.get("d")}"/>')
print("columbia", len(crown), len(top), len(low))
M = 6
col = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-{M} -{M} {356.6+2*M+4:.1f} {54.5+2*M+5:.1f}" role="img" aria-label="Columbia University in the City of New York"><defs>{GOLD}'
       f'<g id="c" transform="translate(-2.6886 -2.8515)">{"".join(crown)}</g><g id="t" transform="translate(-2.6886 -2.8515)">{"".join(top)}</g><g id="l" transform="translate(-2.6886 -2.8515)">{"".join(low)}</g></defs>'
       f'{steps("c", 4, .7, .9, 1.6)}{inked("c", "url(#g)", 2.2)}{steps("t", 3, .55, .7, 1.1)}{inked("t", IVORY, 1.5)}{inked("l", "#ffe9b0", 1.1)}</svg>')
(R / "assets/logos/columbia-jojo.svg").write_text(col)

# NSF: the ring of people, the globe in the site's sky, the land in gold, the letters in ivory
root = ET.parse(SRC / "NSF_logo.svg").getroot()
layer = next(g for g in root.iter(NS + "g") if g.get("id") == "Layer_1")
body = list(list(layer)[0])
def shapes(e):
    out = []
    for c in e.iter():
        t = c.tag.replace(NS, "")
        if t == "path": out.append(f'<path d="{c.get("d")}"/>')
        elif t == "polygon": out.append(f'<polygon points="{c.get("points")}"/>')
    return out
ring = f'<path d="{list(body[0])[0].get("d")}"/><path d="{list(body[0])[2].get("d")}"/>' + "".join(shapes(body[1]))
globe = list(list(body[2])[0])
land = shapes(globe[3]) + shapes(globe[5])
letters = [f'<path d="{p.get("d")}"/>' for p in body[3].iter(NS + "path")]   # every facet of the chiselled letters, painted as one silhouette
print("nsf land", len(land), "letters", len(letters))
sky = ('<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1049"/><stop offset=".38" stop-color="#6d1f78"/>'
       '<stop offset=".68" stop-color="#c2346e"/><stop offset=".9" stop-color="#f4743b"/><stop offset="1" stop-color="#ffb340"/></linearGradient>')
C = 'cx="261.38" cy="261.97" r="179.7"'
nsf = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 546 546" role="img" aria-label="National Science Foundation"><defs>{GOLD}{sky}'
       f'<g id="r">{ring}</g><g id="n">{"".join(letters)}</g><clipPath id="k"><circle {C}/></clipPath></defs>'
       f'{steps("r", 5, 2.2, 2.8, 2)}{inked("r", "url(#g)", 6)}'
       f'<circle {C} fill="url(#s)" stroke="{INK}" stroke-width="8"/>'
       f'<g clip-path="url(#k)" fill="#ffc83d" opacity=".92">{"".join(land)}</g>'
       f'{steps("n", 4, 2, 2.6, 2)}{inked("n", IVORY, 7)}</svg>')
(R / "assets/logos/nsf-jojo.svg").write_text(nsf)
print(len(col), len(nsf))

# NSF as the sun: no ink and no extrude, so it takes the sky's light. The ring of people is the rays, the globe is the disc, and the land and letters are burnt into it.
rays = ('<radialGradient id="ra" gradientUnits="userSpaceOnUse" cx="261.38" cy="261.97" r="262"><stop offset=".66" stop-color="#fff6c9"/><stop offset=".84" stop-color="#ffd24f"/><stop offset="1" stop-color="#ff9a2c"/></radialGradient>')
disc = ('<radialGradient id="di" gradientUnits="userSpaceOnUse" cx="261.38" cy="261.97" r="180"><stop offset="0" stop-color="#fffdf0"/><stop offset=".6" stop-color="#fff2b0"/><stop offset=".88" stop-color="#ffdc66"/><stop offset="1" stop-color="#ffc23f"/></radialGradient>')
sun = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 522.76 523.94" role="img" aria-label="National Science Foundation"><defs>{rays}{disc}<clipPath id="k"><circle {C}/></clipPath></defs>'
       f'<g fill="url(#ra)">{ring}</g><circle {C} fill="url(#di)"/><g clip-path="url(#k)" fill="#f29a26" opacity=".5">{"".join(land)}</g>'
       f'<g fill="#a2341f">{"".join(letters)}</g></svg>')
(R / "assets/logos/nsf-sun.svg").write_text(sun)
print(len(sun))
