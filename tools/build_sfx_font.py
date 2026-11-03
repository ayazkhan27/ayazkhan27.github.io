"""Subset Dela Gothic One (SIL OFL 1.1) to the Japanese characters the page and the JoJo modules actually use.

    python3 tools/build_sfx_font.py [path/to/DelaGothicOne-Regular.ttf]

Without a path it downloads the TTF from github.com/google/fonts (ofl/delagothicone) into a temp folder.
Writes assets/fonts/dela-sfx.woff2 and assets/fonts/dela-sfx-OFL.txt. Re-run it whenever copy or a module adds kana.
"""
import pathlib
import re
import sys
import tempfile
import urllib.request

from fontTools import subset

R = pathlib.Path(__file__).resolve().parent.parent
SRC = "https://raw.githubusercontent.com/google/fonts/main/ofl/delagothicone/"
# kana, CJK punctuation and brackets, kanji, full-width forms: the same ranges as the @font-face unicode-range
JP = re.compile(r"[　-ヿ㐀-鿿＀-￯]")

files = [R / "tools" / "page.html", R / "assets" / "site.js"]
files += sorted((R / "assets" / "jojo").glob("*.js")) + sorted((R / "assets" / "jojo").glob("*.css"))
chars = sorted({c for f in files if f.exists() for c in JP.findall(f.read_text(encoding="utf-8"))})
if not chars:
    sys.exit("no Japanese characters found")

if len(sys.argv) > 1:
    ttf = pathlib.Path(sys.argv[1])
    lic = ttf.with_name("OFL.txt")
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="dela-"))
    ttf, lic = tmp / "DelaGothicOne-Regular.ttf", tmp / "OFL.txt"
    for name, dest in (("DelaGothicOne-Regular.ttf", ttf), ("OFL.txt", lic)):
        urllib.request.urlretrieve(SRC + name, dest)

opts = subset.Options()
opts.flavor = "woff2"
opts.layout_features = ["*"]       # keep vertical alternates (vert/vrt2) for writing-mode: vertical-rl
opts.name_IDs = ["*"]              # keep the copyright and licence records inside the font
opts.name_languages = ["*"]
opts.notdef_outline = True
font = subset.load_font(str(ttf), opts)
sub = subset.Subsetter(opts)
sub.populate(text="".join(chars))
sub.subset(font)
out = R / "assets" / "fonts" / "dela-sfx.woff2"
subset.save_font(font, str(out), opts)
if lic.exists():
    (R / "assets" / "fonts" / "dela-sfx-OFL.txt").write_text(lic.read_text(encoding="utf-8"), encoding="utf-8")
print(f"{out.relative_to(R)}: {out.stat().st_size} bytes, {len(chars)} characters: {''.join(chars)}")
