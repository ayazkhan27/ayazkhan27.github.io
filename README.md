# ayazkhan27.github.io

Personal homepage of Ayaz Khan. Static HTML, no build step at serve time.

```
index.html            the homepage (generated from tools/page.html; do not edit by hand)
sma-1/index.html      the previous SMA-1 landing page, kept as a subpage (uses ../assets/img, ../assets/video)
Ayaz_Khan_Resume.pdf  résumé
assets/fonts/         LT Afficher Neue (LyonsType) and Alphazet (Type Forward), Latin subsets as woff2;
                      dela-sfx.woff2 is Dela Gothic One (SIL OFL 1.1, license in dela-sfx-OFL.txt), cut to the kana and kanji in use;
                      alphazet-EULA.pdf is Type Forward's free license for Alphazet (none ships with LT Afficher Neue)
assets/plate/         frames cut from Muybridge's "The Horse in Motion" (1878, public domain); alb-*.jpg are albumen-toned with LightCraft
assets/site.js        zoopraxiscope disc, route rail, entrances, and the v3 race layer: time stop, sound toggle,
                      lazy loading of the JoJo modules, the To Be Continued ending (no dependencies)
assets/grain.js       WebGL albumen grain on the projection screen, loaded when idle; assets/grain.png is the CSS fallback
assets/jojo/          the Steel Ball Run modules, one ES module and one stylesheet each (see below)
assets/audio/         original sound cues for assets/jojo/audio.js; nothing loads until the visitor turns sound on
assets/photo-finish.png  slit-scan of the traced gallop (tools/build_v2_assets.py)
assets/gallop-*.gif   two-color gallop GIFs for email signatures (150 px wide, under 10 KB)
assets/og.png         1200x630 social preview (rendered from tools/og.html)
tools/                build_page.py, build_sfx_font.py, golden.py (measures the traced frames, writes assets/jojo/golden.json),
                      build_assets.py (fonts, plate frames, GIFs, horse symbols), build_v2_assets.py
```

## Rebuild

Edit `tools/page.html`, then:

```
python3 tools/build_sfx_font.py      # only when Japanese text changed in page.html, site.js or a module
python3 tools/golden.py              # only if tools/horse_symbols.svg changes
python3 tools/build_page.py          # writes index.html
python3 -m http.server 8000          # preview at http://localhost:8000
```

`build_page.py` inlines the horse symbols, the disc, the contact sheet, the Stand hexagon and the Tusk spin marks.
A `data-module="name"` slot in page.html becomes a lazy slot only when `assets/jojo/name.js` exists, so a missing
module costs no request and its section keeps its static text. It also lists any `TODO-FACT` strings left in the copy.

`build_sfx_font.py` collects every kana, kanji and CJK bracket in page.html, site.js and assets/jojo, and subsets
Dela Gothic One to exactly those characters (it downloads the TTF from github.com/google/fonts unless you pass a path).
Needs fontTools and brotli.

## The v3 race layer

The page runs as the 1890 Steel Ball Run, San Diego to New York. Each section opens with a stage line, the rail at the
bottom is the route, and the contact section is the last stage. Each JoJo moment teaches a statistical idea, with real numbers or a labeled simulation.

Modules live in `assets/jojo/<name>.js` with styles in `<name>.css`, scoped under `.jj-<name>`.
`export async function mount(root, opts)` returns `{ pause, resume, destroy }`. site.js loads each one when its slot
comes within about 600 px of the viewport, so Three.js (import map in the page head, pinned to three@0.170.0 on
jsDelivr) only loads near Gyro's lesson.

- `stand.js` the Stand card 「NO SURPRISES」 (a recap after the record); `ora.js` a simulated bootstrap rush (a teaching sketch) under the interval chart;
  `rohan.js` the refusal beside the leakage result; `golden.js` with `golden.json` the golden rectangle on the
  traced frames; `steelball.js` the Three.js steel ball and its spin-down fit; `joseph.js` the next-question FAQ;
  `audio.js` exports `initAudio({ toggle })`.
- Modules ask for sound with `document.dispatchEvent(new CustomEvent('sfx', { detail: { name } }))`.
  The page dispatches `timestop` and `timeresume` on `document` and sets `html.time-stopped` while time is stopped.
- "Stop time" (in the nav and on the rail) pauses the disc, the rail horse, the grain, CSS animations and every
  module (WCAG 2.2.2). Reaching the To Be Continued arrow holds the page in sepia until you scroll back up.

Steel Ball Run and JoJo's Bizarre Adventure are by Hirohiko Araki, published by Shueisha. This page is an unaffiliated fan
homage: it uses no art, music or sound from the series, and its sound effects are original.

## Albumen toning

Needs lightcraft-cli, per frame:
`lightcraft-cli render in.png -o alb-NN.jpg --set grading.shadows.hue=22 --set grading.shadows.sat=40 --set grading.midtones.hue=30 --set grading.midtones.sat=22 --set grading.highlights.hue=48 --set grading.highlights.sat=26 --set vignette.amount=-30 --set light.contrast=8`,
then `python3 tools/build_v2_assets.py <dir of alb-NN.jpg>`.
