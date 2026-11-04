# ayazkhan27.github.io

Personal homepage of Ayaz Khan. Static HTML, no build step at serve time.

```
index.html            generated from tools/page.html; do not edit by hand
sma-1/index.html      earlier SMA-1 page, kept but not linked (uses ../assets/img)
Ayaz_Khan_Resume.pdf  résumé
assets/site.js        digit windows (canvas scenes), the Rerun, Stop time, rail, episode loader
assets/jojo/          episode.js + episode.css (26 s episode), audio.js (Sound toggle, Rerun synth), stand-figure.svg
assets/audio/         episode.mp3 and its beat map episode.json: an instrumental of "Smooth" by Santana
assets/fonts/         LT Afficher Neue, Alphazet, Dela Gothic One subset (OFL)
assets/gallop-*.gif, assets/mail/, assets/logos/   hosted images used by sent emails; do not delete
tools/                build_page.py, check_page.py, build_sfx_font.py, horse_symbols.svg, lockup_outlines.svg, og.html
```

## Rebuild

```
python3 tools/build_page.py          # writes index.html
python3 tools/check_page.py          # word cap (500, everything open, episode strings included) and banned terms
python3 -m http.server 8000          # preview at http://localhost:8000
```

Episode anchors: episode.js looks for data-ep="hero|ceiling|leak|calx|nsf|resume|end", data-ep-chip, .lockup and the #h1..#h12 symbols.

## The title card

The closing "Ayaz's Bizarre Adventure" title card (above To Be Continued) is inline SVG built by `build_page.py` from `tools/lockup_outlines.svg`. That file
holds outlines only, no font data: AYAZ'S in SF Fedora by ShyFonts (freeware for noncommercial use; the font itself is
not shipped) and BIZARRE ADVENTURE in Archivo Narrow Bold Italic (SIL OFL 1.1), set and outlined in VectorCraft 0.13.1:
`text.findFontFiles` and `text.addFontFiles` (in a scratch `VECTORCRAFT_CONFIG_DIR`), `text.create` at 200 pt and 124 pt,
`type.createOutlines`, then export as SVG. `build_page.py` adds the paint: a stepped purple extrude, an ink outline, a
gold-to-orange-to-red fill (the top stop is `--color-gold-lit`), a top-edge highlight and one sheen on entrance.

