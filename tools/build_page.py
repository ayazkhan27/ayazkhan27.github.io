"""Assemble index.html from tools/page.html: inline horse symbols and the contact-sheet items."""
import pathlib
T = pathlib.Path(__file__).resolve().parent
s = (T / "page.html").read_text()
sheet = "\n      ".join(
    f'<li><button type="button" aria-label="Frame {n}{" (all four hooves off the track)" if n in (2, 3) else ""}">'
    f'<img src="assets/plate/alb-{n:02d}.jpg" width="240" height="150" alt="" decoding="async"></button></li>'
    for n in range(1, 12))
disc = "\n            ".join(
    f'<g transform="rotate({(n - 1) * 360 / 11:.3f})"><use class="d-horse" href="#h{n}" x="-120" y="-428" width="240" height="153"/>'
    f'<text class="d-num" y="-448">{n}</text></g>' for n in range(1, 12))
s = s.replace("<!--DISC-->", disc)
s = s.replace("<!--SYMBOLS-->", (T / "horse_symbols.svg").read_text()).replace("<!--SHEET-->", sheet)
(T.parent / "index.html").write_text(s)
print(len(s.encode()))
