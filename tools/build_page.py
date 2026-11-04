"""Assemble index.html from tools/page.html: inlines the horse symbols, the title card and the Stand figure."""
import pathlib
import re

T = pathlib.Path(__file__).resolve().parent
R = T.parent
s = (T / "page.html").read_text()


# "Ayaz's Bizarre Adventure": type set and outlined in VectorCraft (SF Fedora for AYAZ'S, Archivo Narrow Bold
# Italic for the rest; see README), exported as tools/lockup_outlines.svg. Here the outlines get the title-card paint:
# a stepped extrude, an ink outline, a gold-to-red fill, a top-edge highlight and a one-time sheen.
def lockup():
    import xml.etree.ElementTree as ET
    NS = "{http://www.w3.org/2000/svg}"
    layer = ET.parse(T / "lockup_outlines.svg").getroot().find(NS + "g")
    groups = [[p.get("d") for p in g.iter(NS + "path")] for g in layer]       # AYAZ'S, BIZARRE, ADVENTURE

    def box(ds):
        n = [float(v) for d in ds for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
        return min(n[0::2]), min(n[1::2]), max(n[0::2]), max(n[1::2])

    def moved(ds, dx, dy):                                                    # absolute M/L/C/Z only, as exported
        assert all(re.fullmatch(r"[MLCZ\d\s.,-]+", d) for d in ds), "unexpected path commands"
        def shift(d):
            n = iter(re.findall(r"[MLCZ]|-?\d+(?:\.\d+)?", d))
            out = []
            for t in n:
                if t in "MLCZ":
                    out.append(t)
                else:
                    out.append(f"{float(t) + dx:.1f} {float(next(n)) + dy:.1f}")
            return " ".join(out).replace(" Z", "Z")
        return "".join(shift(d) for d in ds)

    P, GAP, SLANT = 12, 30, 14            # margin, gap between AYAZ'S and the stack, Archivo's 8 degree italic over one line
    a, b, c = (box(g) for g in groups)
    ax, ay = P, P
    bx = ax + (a[2] - a[0]) + GAP
    cy = ay + (a[3] - a[1]) - (c[3] - c[1])                                  # ADVENTURE sits on AYAZ'S's baseline
    da = moved(groups[0], ax - a[0], ay - a[1])
    db = moved(groups[1], bx - b[0], ay - b[1]) + moved(groups[2], bx - SLANT - c[0], cy - c[1])
    W = round(max(bx + b[2] - b[0], bx - SLANT + c[2] - c[0]) + 18)
    H = round(ay + a[3] - a[1] + 18)
    steps = "".join(f'<use href="#lk-a" class="lk-ext" transform="translate({k * 1.2:.1f} {k * 1.5:.1f})"/>' for k in range(6, 0, -1))
    return (f'<svg class="lockup" viewBox="0 0 {W} {H}" role="img" aria-label="Ayaz\'s Bizarre Adventure">'
            f'<defs><path id="lk-a" d="{da}"/><path id="lk-b" d="{db}"/>'
            '<linearGradient id="lk-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="lk-s1"/><stop offset=".5" class="lk-s2"/><stop offset="1" class="lk-s3"/></linearGradient>'
            '<linearGradient id="lk-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" class="lk-g0"/><stop offset=".5" class="lk-g1"/><stop offset="1" class="lk-g0"/></linearGradient>'
            '<mask id="lk-top"><use href="#lk-a" fill="#fff"/><use href="#lk-a" fill="#000" transform="translate(0 3.5)"/></mask>'
            '<clipPath id="lk-clip"><use href="#lk-a"/></clipPath></defs>'
            '<g class="lk-stack"><use href="#lk-b" class="lk-b-shadow" transform="translate(4.5 5.5)"/><use href="#lk-b" class="lk-b-ink"/><use href="#lk-b" class="lk-b-fill"/></g>'
            f'<g class="lk-name">{steps}<use href="#lk-a" class="lk-ink"/><use href="#lk-a" fill="url(#lk-fill)"/>'
            '<use href="#lk-a" class="lk-hi" mask="url(#lk-top)"/>'
            f'<g clip-path="url(#lk-clip)"><rect class="lk-sheen" x="-260" y="0" width="200" height="{H}" fill="url(#lk-shine)"/></g></g></svg>')


s = s.replace("<!--SYMBOLS-->", (T / "horse_symbols.svg").read_text())
s = s.replace("<!--LOCKUP-->", lockup())
s = s.replace("<!--FIGURE-->", (R / "assets" / "jojo" / "stand-figure.svg").read_text())

(R / "index.html").write_text(s)
print(len(s.encode()), "bytes")
