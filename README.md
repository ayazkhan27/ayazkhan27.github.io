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
assets/site.js        zoopraxiscope disc, route rail, entrances, and the race layer: time stop, sound toggle,
                      lazy loading of the JoJo modules and of the episode, the To Be Continued ending (no dependencies)
assets/grain.js       WebGL albumen grain on the projection screen, loaded when idle; assets/grain.png is the CSS fallback
assets/jojo/          the Steel Ball Run modules, one ES module and one stylesheet each (see below)
assets/audio/         sound for assets/jojo/audio.js; nothing loads until the visitor turns sound on. The cues are original;
                      bgm.mp3 (the quiet loop) and episode.mp3 are an instrumental of "Smooth" by Santana
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
module costs no request and its section keeps its static text. The hero's episode button shows only when
`assets/jojo/episode.js` exists (the build adds `data-ep-ready` to `<html>`). It also lists any `TODO-FACT` strings
left in the copy and any em or en dash in visible text.

`build_sfx_font.py` collects every kana, kanji and CJK bracket in page.html, site.js and assets/jojo, and subsets
Dela Gothic One to exactly those characters (it downloads the TTF from github.com/google/fonts unless you pass a path).
Needs fontTools and brotli.

## The title card

The closing "Ayaz's Bizarre Adventure" title card (above To Be Continued) is inline SVG built by `build_page.py` from `tools/lockup_outlines.svg`. That file
holds outlines only, no font data: AYAZ'S in SF Fedora by ShyFonts (freeware for noncommercial use; the font itself is
not shipped) and BIZARRE ADVENTURE in Archivo Narrow Bold Italic (SIL OFL 1.1), set and outlined in VectorCraft 0.13.1:
`text.findFontFiles` and `text.addFontFiles` (in a scratch `VECTORCRAFT_CONFIG_DIR`), `text.create` at 200 pt and 124 pt,
`type.createOutlines`, then export as SVG. `build_page.py` adds the paint: a stepped purple extrude, an ink outline, a
gold-to-orange-to-red fill (the top stop is `--color-gold-lit`), a top-edge highlight and one sheen on entrance.

## Page structure (v4)

The default page is a glance: about 450 words with nothing opened (`document.body.innerText`, counted after a scroll
to the bottom; the budget is 500). Depth sits one click away in `<details>`, and nothing behind a click loads first.

1. Hero (`data-ep="hero"`): name, one-line lede, four status chips (`data-ep="status"`, each `data-ep-chip`), the episode
   button, the résumé and the email, beside the plate.
2. Stage 1, results: four cards, each a figure, a small honest chart of it and one line, linking to its detail
   (`data-ep="ceiling"`, `"leak"`, `"calx"`, `"nsf"`).
3. Stage 2, Telenav: the interval chart, four result lines, Rohan's call; "More from Telenav" holds the rest.
4. Stage 3, research: Tusk's four acts (REU, fraud, rate cases, Calx), one line each; "More on each act" holds the
   long versions, the Calx ledger and links, the rate-case chart and Dr. Ammari's letter.
5. Stage 4, record: four rows and six tools; "Full record and skills" holds the full table.
6. Stages 5 to 7, the Lab: five tiles (Stand card, ORA bootstrap, golden rectangle, steel ball, zoopraxiscope). Tiles
   share `name="lab"`, so one is open at a time; a tile's module (and Three.js, and the contact-sheet images) loads
   only when it opens, and pauses when it closes.
7. Stage 8, quick answers with YES/NO stamps; "Ask your own" opens Joseph's predictor.
8. Stage 9, contact (résumé button `data-ep="resume"`), then the title card and To Be Continued (`data-ep="end"`),
   and the footer with the credits closed.

## The race layer

The page runs as the 1890 Steel Ball Run, San Diego to New York. Each section opens with a stage line named for the
real stage, the rail at the bottom is the route (one post per section), and the contact section is Stage 9, Manhattan
Rhapsody. Each JoJo moment teaches a statistical idea, with real numbers or a labeled simulation.

Modules live in `assets/jojo/<name>.js` with styles in `<name>.css`, scoped under `.jj-<name>`.
`export async function mount(root, opts)` returns `{ pause, resume, destroy }`. site.js loads a slot in the main path
when it comes within about 600 px of the viewport (only Rohan, today), and a slot inside `<details>` when that opens.
Three.js (import map in the page head, pinned to three@0.170.0 on jsDelivr) is imported inside the steel ball's
`mount()`, so a blocked CDN shows the still image instead of an empty slot.

- `stand.js` the Stand card 「NO SURPRISES」, with the Stand figure from `stand-figure.svg` inlined beside its parameters; `ora.js` a simulated bootstrap rush (a teaching sketch);
  `rohan.js` the refusal beside the Telenav tally; `golden.js` with `golden.json` the golden rectangle on the
  traced frames; `steelball.js` the Three.js steel ball and its spin-down fit; `joseph.js` the next-question predictor;
  `audio.js` exports `initAudio({ toggle })`, which returns the sound controller.
- `episode.js` and `episode.css` are the 26-second episode. site.js imports them on the first hover, focus or touch of
  the hero's `<button data-episode>` and calls `initEpisode({ button, audio })` with the controller from `initAudio`
  (or `null`); a click that arrives first waits for the engine, then is replayed.
- Modules ask for sound with `document.dispatchEvent(new CustomEvent('sfx', { detail: { name } }))`.
  The page dispatches `timestop` and `timeresume` on `document` and sets `html.time-stopped` while time is stopped.
- "Stop time" (in the nav and on the rail) pauses the disc, the rail horse, the grain, CSS animations and transitions,
  and every module (WCAG 2.2.2). Reaching the To Be Continued arrow holds the page in sepia until you scroll back up.

Steel Ball Run and JoJo's Bizarre Adventure are by Hirohiko Araki, published by Shueisha. This page is an unaffiliated fan
homage: it uses no art, music or sound from the series, and its sound effects are original.

## Albumen toning

Needs lightcraft-cli, per frame:
`lightcraft-cli render in.png -o alb-NN.jpg --set grading.shadows.hue=22 --set grading.shadows.sat=40 --set grading.midtones.hue=30 --set grading.midtones.sat=22 --set grading.highlights.hue=48 --set grading.highlights.sat=26 --set vignette.amount=-30 --set light.contrast=8`,
then `python3 tools/build_v2_assets.py <dir of alb-NN.jpg>`.
