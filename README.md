# ayazkhan27.github.io

Personal homepage of Ayaz Khan. Static HTML, no build step at serve time.

```
index.html            generated from tools/page.html; do not edit by hand
sma-1/index.html      earlier SMA-1 page, kept but not linked (uses ../assets/img)
Ayaz_Khan_Resume.pdf  résumé
assets/site.js        hero, shutters, foil cards, the 47 s episode and its controls (Pause, Exit, Sound, Volume)
assets/deep.js        the long version: toys, section bar, lazy video poster; loads on scroll
assets/jojo/          globe, ORA bootstrap and "Ask me" modules, stand-figure.svg
assets/audio/         episode.mp3 and its beat map episode.json: an instrumental of "Smooth" by Santana
assets/fonts/         LT Afficher Neue, Alphazet, Dela Gothic One subset (OFL)
assets/gallop-*.gif, assets/mail/, assets/logos/   hosted images used by sent emails; do not delete
tools/                build_page.py, check_page.py, build_sfx_font.py, horse_symbols.svg, lockup_outlines.svg, og.html
```

## Rebuild

```
python3 tools/build_page.py          # writes index.html
SITE_BRIEF=/path/to/site_brief python3 tools/check_page.py   # word cap (500) and banned terms; SITE_BRIEF defaults to ../site_brief
python3 -m http.server 8000          # preview at http://localhost:8000
```

The episode's cue times in `assets/site.js` (`CUES`) are cut to the song's accents. Do not retime them or re-encode the mp3.
Cues fire `LEAD` (50 ms) early because an entrance takes about 60 ms to look landed; the synth sounds are scheduled back onto the note (`sfxLag`).
Volume starts at 33% and is kept in localStorage. iOS Safari ignores `audio.volume`, so only there the music is routed through a Web Audio gain node; that also means an iPhone on silent plays no music.

## The title card

The closing "Ayaz's Bizarre Adventure" title card (above To Be Continued) is inline SVG built by `build_page.py` from `tools/lockup_outlines.svg`. That file
holds outlines only, no font data: AYAZ'S in SF Fedora by ShyFonts (freeware for noncommercial use; the font itself is
not shipped) and BIZARRE ADVENTURE in Archivo Narrow Bold Italic (SIL OFL 1.1), set and outlined in VectorCraft 0.13.1:
`text.findFontFiles` and `text.addFontFiles` (in a scratch `VECTORCRAFT_CONFIG_DIR`), `text.create` at 200 pt and 124 pt,
`type.createOutlines`, then export as SVG. `build_page.py` adds the paint: a stepped purple extrude, an ink outline, a
gold-to-orange-to-red fill (the top stop is `--color-gold-lit`), a top-edge highlight and one sheen on entrance.

