"""Word cap and banned-term check. Counts every string in index.html a person or screen reader can get; <title> and meta are reported apart.
Banned terms live in site_brief/banned_terms.txt, outside the repo, because Pages serves every tracked file."""
import html.parser, os, pathlib, re, subprocess, sys
R = pathlib.Path(__file__).resolve().parent.parent
class T(html.parser.HTMLParser):
    SKIP = {"script", "style", "symbol", "head"}
    def __init__(s): super().__init__(); s.out = []; s.depth = 0
    def handle_starttag(s, tag, a):
        if tag in s.SKIP: s.depth += 1
        s.out += [v for k, v in a if k in ("aria-label", "alt", "title") and v]
    def handle_endtag(s, tag):
        if tag in s.SKIP: s.depth -= 1
    def handle_data(s, data):
        if not s.depth: s.out.append(data)
page = (R / "index.html").read_text()
i, k = page.index('<section class="deep"'), page.index('<footer class="foot"')
t = T(); t.feed(page[:i] + page[k:])
words = " ".join(t.out).split()
t2 = T(); t2.feed("<body>" + page[i:k])
print("long version", len(" ".join(t2.out).split()), "words")
js = (R / "assets/site.js").read_text()
extra = re.findall(r"textContent = (?:[^;'\n]*\? )?(?:[\w.]+ \+ )?'([^'\n]+)'", js)
scene = js[js.index("const sLeak"):js.index("const standSlam")]
labels = [x for x in re.findall(r">([^<>`'\n]+)<", scene) if "${" not in x]
print("scene labels drawn on the figures, reported apart:", len(" ".join(labels).split()), "words")
n = len(words) + sum(len(x.split()) for x in extra)
print(f"intro, episode and status {n} words (cap 500); meta and title reported apart")
brief = pathlib.Path(os.environ.get("SITE_BRIEF", R.parent / "site_brief"))   # set SITE_BRIEF when the repo sits somewhere else, such as a worktree
scope, terms = "everywhere", []          # the list is one regex per line under [everywhere] or [page]; [page] terms apply to index.html only
for x in (brief / "banned_terms.txt").read_text().splitlines():
    x = x.strip()
    if not x or x.startswith("#"): continue
    if x in ("[everywhere]", "[page]"): scope = x[1:-1]
    else: terms.append((scope, x))
files = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=R, capture_output=True, text=True).stdout.split("\n")
hits = []
for f in files:
    p = R / f
    if not f or not p.is_file() or p.suffix not in {".html", ".js", ".css", ".py", ".json", ".svg", ".md", ".txt"}: continue
    s = p.read_text(errors="ignore")
    s = re.sub(r'<table class="moat">.*?</table>', '', s, flags=re.S)  # the How ledger cites these vendors as news, on Ayaz's request; "no AI credit" still holds everywhere else
    hits += [f"{f}: {x}" for sc, x in terms if (sc == "everywhere" or f == "index.html") and re.search(x, s, re.I)]
print("banned:", hits or "none")
sys.exit(n > 500 or bool(hits))
