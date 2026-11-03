"""Is the galloping horse a golden rectangle? Measure Muybridge's 1878 traces against phi.

    python3 tools/golden.py        # prints the numbers and writes assets/jojo/golden.json

Gyro's lesson in Steel Ball Run: the golden rectangle, 1 : 1.618, is in nature and in the horse.
tools/horse_symbols.svg holds one traced silhouette (horse and rider) per frame of the 1878 plate, in a
1280 x 816 box at the plate's own pixel scale, so a width/height ratio here is the photograph's ratio.

Two measures per frame, both width / height:
  rider  the bounding box of the traced silhouette, horse and rider together.
  horse  the same box with its top moved down to the horse's ear tip, because the claim is about the horse
         and the rider's head is the top of the traced box in every frame.
Also checked, reported in the JSON and left out of the verdict:
  moment    side ratio of the rectangle with the same second moments as the filled silhouette.
  min_rect  minimum-area enclosing rectangle at any angle (its tilt swings from frame to frame; see its note).
Frames 1 to 11 are the gallop; frame 12, the horse at rest, is reported on its own.
"""
import json
import pathlib
import re

import numpy as np
from PIL import Image, ImageChops, ImageDraw
from scipy import stats
from scipy.spatial import ConvexHull

ROOT = pathlib.Path(__file__).resolve().parent.parent
PHI = (1 + 5 ** 0.5) / 2
SEED, B = 1878, 10_000   # bootstrap seed (the plate's year) and number of resamples
FRONT = 0.25             # ear tip = highest outline point in the front quarter of the box
SHADOW = (1, 5, 9, 11)   # frames whose trace includes a ground shadow under the planted hoof
TRIM = 20                # a generous depth for that shadow, in plate pixels, for the sensitivity check


def subpaths(d):
    assert set(re.findall(r"[A-Za-z]", d)) <= set("MLZ"), "expected M/L/Z paths only"
    return [np.array(re.findall(r"-?\d+\.?\d*", p), float).reshape(-1, 2) for p in re.findall(r"M[^MZ]+", d)]


def ear_tip(P, front=FRONT):
    F = P[P[:, 0] >= P[:, 0].max() - front * np.ptp(P[:, 0])]
    return F[np.argmin(F[:, 1])]


def moment_ratio(sps):
    """Side ratio of the rectangle with the silhouette's second moments (even-odd fill, as the page draws it)."""
    acc = Image.new("1", (1280, 816), 0)
    for p in sps:
        m = Image.new("1", acc.size, 0)
        ImageDraw.Draw(m).polygon([tuple(q) for q in p], fill=1)
        acc = ImageChops.logical_xor(acc, m)
    ys, xs = np.nonzero(np.asarray(acc))
    lo, hi = np.linalg.eigvalsh(np.cov(xs, ys))
    return float(np.sqrt(hi / lo))


def min_rect(P):
    """Minimum-area enclosing rectangle: (long/short side ratio, tilt of its long side in degrees)."""
    H, best = P[ConvexHull(P).vertices], None
    for a, b in zip(H, np.roll(H, -1, axis=0)):
        t = np.arctan2(b[1] - a[1], b[0] - a[0])
        w, h = np.ptp(H @ np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]]), axis=0)
        if best is None or w * h < best[0]:
            tilt = np.degrees(t if w >= h else t + np.pi / 2)
            best = (w * h, max(w, h) / min(w, h), abs((tilt + 90) % 180 - 90))
    return best[1], best[2]


def measure(sps):
    P = np.vstack(sps)
    (x0, y0), (x1, y1) = P.min(0), P.max(0)
    ear = ear_tip(P)
    for f in (0.22, 0.27):  # the rider never enters the cut: any cut in this range finds the same ear tip
        assert (ear_tip(P, f) == ear).all(), "ear tip moved with the cut"
    mr, tilt = min_rect(P)
    return dict(box=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)], ear=[int(ear[0]), int(ear[1])],
                rider=(x1 - x0) / (y1 - y0), horse=(x1 - x0) / (y1 - ear[1]),
                moment=moment_ratio(sps), min_rect=mr, tilt=tilt)


IDX = np.random.default_rng(SEED).integers(0, 11, (B, 11))  # one set of resamples, shared by every measure


def summary(v):
    v = np.asarray(v)
    t = stats.ttest_1samp(v, PHI)
    k = int(np.argmin(abs(v - PHI)))
    return dict(mean=v.mean(), sd=v.std(ddof=1), ci95=list(np.percentile(v[IDX].mean(1), [2.5, 97.5])),
                t=t.statistic, df=int(t.df), p=t.pvalue, t_ci95=list(t.confidence_interval()),
                closest=dict(n=k + 1, ratio=v[k]), values=list(v))


def inside(ci):
    return ci[0] <= PHI <= ci[1]


def verdict(r, h):
    ci = lambda s: f"{s['mean']:.2f} (95% CI [{s['ci95'][0]:.2f}, {s['ci95'][1]:.2f}])"
    nums = f"with the rider its box averages {ci(r)}, without the rider {ci(h)}"
    has = [inside(r["ci95"]), inside(h["ci95"])]
    if not any(has):
        if (r["mean"] - PHI) * (h["mean"] - PHI) < 0:
            return f"This horse, in this run, is not golden: {nums}, and 1.618 falls between the two, inside neither interval."
        return f"This horse, in this run, is not golden: {nums}; both intervals sit {'below' if r['mean'] < PHI else 'above'} 1.618."
    if all(has):
        return f"The horse could be golden: {nums}, and both intervals include 1.618."
    return f"Golden only {'with' if has[0] else 'without'} the rider: {nums}; only that interval includes 1.618."


def fp(p):
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


def rnd(o):
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, dict):
        return {k: rnd(v) for k, v in o.items()}
    if isinstance(o, list):
        return [rnd(v) for v in o]
    return o


def check():
    """A solid golden rectangle must read 1.618 on every measure."""
    m = measure([np.array([[100, 100], [100 + 400 * PHI, 100], [100 + 400 * PHI, 500], [100, 500]])])
    assert abs(m["rider"] - PHI) < 1e-9 and abs(m["horse"] - PHI) < 1e-9, m
    assert abs(m["min_rect"] - PHI) < 1e-9 and m["tilt"] < 1e-6, m
    assert abs(m["moment"] - PHI) < 0.01, m  # pixel grid


def main():
    check()
    svg = (ROOT / "tools/horse_symbols.svg").read_text()
    sym = dict(re.findall(r'<symbol id="h(\d+)" viewBox="0 0 1280 816"><path[^>]*\sd="([^"]+)"', svg))
    assert sorted(map(int, sym)) == list(range(1, 13)), "expected h1..h12, each in a 1280 x 816 box"
    m = {int(n): measure(subpaths(d)) for n, d in sym.items()}
    S = {k: summary([m[n][k] for n in range(1, 12)]) for k in ("rider", "horse", "moment", "min_rect")}
    r, h, rest = S["rider"], S["horse"], m[12]

    def trimmed(k):  # take TRIM pixels of ground shadow off the frames that have it
        out = []
        for n in range(1, 12):
            x, y, w, hh = m[n]["box"]
            top = y if k == "rider" else m[n]["ear"][1]
            out.append(w / (y + hh - top - TRIM * (n in SHADOW)))
        return summary(out)["ci95"]

    tr, th = trimmed("rider"), trimmed("horse")
    stands = (inside(tr), inside(th)) == (inside(r["ci95"]), inside(h["ci95"]))
    tilts = [m[n]["tilt"] for n in range(1, 12)]
    doc = dict(
        phi=PHI, seed=SEED, resamples=B,
        source="tools/horse_symbols.svg: silhouettes traced from Muybridge, The Horse in Motion (1878), "
               "in a 1280 x 816 box at the plate's pixel scale",
        measures=dict(
            rider=dict(label="With rider", what="Width / height of the bounding box of the traced silhouette, "
                       "horse and rider together.", **r),
            horse=dict(label="Horse alone", what="The same box with its top moved down to the horse's ear tip, "
                       "the highest point of the outline in the front quarter of the box.", **h)),
        frames=[dict(n=n, **m[n]) for n in range(1, 12)],
        rest=dict(n=12, **rest),
        also_checked=dict(
            moment=dict(what="Side ratio of the rectangle with the same second moments as the filled silhouette, "
                        "rider included. It uses all of the area, so no single hoof or tail tip can move it.",
                        **S["moment"]),
            min_rect=dict(what="Minimum-area enclosing rectangle at any angle.",
                          why_not=f"Left out: its tilt swings from {min(tilts):.0f} to {max(tilts):.0f} degrees "
                          f"between frames, so it tracks the tilt more than the horse, and its SD is "
                          f"{S['min_rect']['sd'] / r['sd']:.1f} times the plain box's.", **S["min_rect"])),
        sensitivity=dict(what=f"Frames {', '.join(map(str, SHADOW))} include a thin ground shadow under the "
                         f"planted hoof. Taking {TRIM} pixels of height off each of them.",
                         rider_ci95=tr, horse_ci95=th, verdict_stands=stands),
        verdict=verdict(r, h),
        caption=f"Bars are bootstrap 95% intervals for the mean ({B:,} resamples). One-sample t-test against "
                f"1.618: {fp(r['p'])} with the rider, {fp(h['p'])} without. The 11 frames are one horse in one run, "
                f"about 1/25 s apart, so they are not independent draws; read the intervals and p-values as rough. "
                f"Frame 12, the horse at rest, is not in the means: {rest['rider']:.2f} with the rider, "
                f"{rest['horse']:.2f} without. Of two other measures I checked, a second-moment rectangle "
                f"{'also excludes' if not inside(S['moment']['ci95']) else 'includes'} 1.618; a tilted minimum box, "
                f"whose angle swings with the horse's lean, {'does not' if inside(S['min_rect']['ci95']) else 'excludes it too'}.",
        notes=["The traces include the rider, whose head is the top of the box in every frame.",
               "The ear tip is the same point for any front cut from 22% to 27% of the box width, in all 12 frames.",
               f"Ground shadows in frames {', '.join(map(str, SHADOW))}: with {TRIM} pixels trimmed the 95% CIs are "
               f"[{tr[0]:.2f}, {tr[1]:.2f}] with the rider and [{th[0]:.2f}, {th[1]:.2f}] without; "
               f"the verdict {'stands' if stands else 'changes'}."])
    out = ROOT / "assets/jojo/golden.json"
    out.write_text(json.dumps(rnd(doc), separators=(",", ":")) + "\n")

    print(f"phi = {PHI:.4f}; frames 1-11 gallop, 12 at rest\n")
    print(" n   box w x h   rider   horse  moment  min_rect (tilt)")
    for n in range(1, 13):
        f = m[n]
        print(f"{n:2}  {f['box'][2]:4} x {f['box'][3]:3}  {f['rider']:.3f}   {f['horse']:.3f}   {f['moment']:.3f}"
              f"   {f['min_rect']:.3f} ({f['tilt']:.0f} deg){'   at rest' if n == 12 else ''}")
    print()
    for k, s in S.items():
        print(f"{k:8} mean {s['mean']:.3f}  SD {s['sd']:.3f}  bootstrap 95% CI [{s['ci95'][0]:.3f}, {s['ci95'][1]:.3f}]"
              f"  t({s['df']}) = {s['t']:+.2f}, p = {s['p']:.4f}  t-CI [{s['t_ci95'][0]:.3f}, {s['t_ci95'][1]:.3f}]"
              f"  closest: frame {s['closest']['n']} ({s['closest']['ratio']:.3f})")
    print(f"\nshadow trim: rider CI [{tr[0]:.3f}, {tr[1]:.3f}], horse CI [{th[0]:.3f}, {th[1]:.3f}], verdict stands: {stands}")
    print(f"\n{doc['verdict']}\n\nwrote {out.relative_to(ROOT)} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
