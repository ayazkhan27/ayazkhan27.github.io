# ayazkhan27.github.io

Personal homepage of Ayaz Khan. Static HTML, no build step at serve time.

```
index.html            the homepage (generated from tools/page.html)
sma-1/index.html      the previous SMA-1 landing page, kept as a subpage (uses ../assets/img, ../assets/video)
Ayaz_Khan_Resume.pdf  résumé
assets/fonts/         LT Afficher Neue (LyonsType) and Alphazet (Type Forward), Latin subsets as woff2
assets/plate/         frames cut from Muybridge's "The Horse in Motion" (1878, public domain); alb-*.jpg are albumen-toned with LightCraft
assets/site.js        zoopraxiscope disc, furlong rail, entrances (no dependencies)
assets/grain.js       WebGL albumen grain on the projection screen, loaded when idle; assets/grain.png is the CSS fallback
assets/photo-finish.png  slit-scan of the traced gallop (tools/build_v2_assets.py)
assets/gallop-*.gif   two-colour gallop GIFs for email signatures (150 px wide, under 10 KB)
assets/og.png         1200x630 social preview (rendered from tools/og.html)
tools/                build_assets.py (fonts, plate frames, GIFs, horse symbols), build_v2_assets.py, build_page.py
```

Edit `tools/page.html`, then `python3 tools/build_page.py`. Preview with `python3 -m http.server 8000`.

Albumen toning (needs lightcraft-cli), per frame:
`lightcraft-cli render in.png -o alb-NN.jpg --set grading.shadows.hue=22 --set grading.shadows.sat=40 --set grading.midtones.hue=30 --set grading.midtones.sat=22 --set grading.highlights.hue=48 --set grading.highlights.sat=26 --set vignette.amount=-30 --set light.contrast=8`,
then `python3 tools/build_v2_assets.py <dir of alb-NN.jpg>`.
