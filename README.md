# SMA-1 landing page

A single-file, dependency-free landing page for **SMA-1 (Structure-Mapping Agentic Memory)**.
Dark, scholarly, research-grade. Every claim, number, and figure is sourced from the SMA-1
repository (`README.md`, the manuscript, `configs/ontologies.json`, and the `sma/` source) — no
invented results.

## Contents
```
index.html              # the whole site (inline CSS + JS; no build step)
assets/img/             # graphical abstract, system/architecture figures, results figures, process GIF
assets/video/           # demo clips (cyber case study)
.nojekyll               # tell GitHub Pages to serve files as-is
```

## Run locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Use a server rather than opening the file directly so the `<video>` and fonts load cleanly.)

## Publish on GitHub Pages
Option A — project site from a `/docs` folder:
```bash
# copy these files into your repo's docs/ folder, commit, then in
# Settings → Pages, set Source = main branch / docs.
```
Option B — dedicated `gh-pages` branch or a `username.github.io` repo: drop `index.html`,
`assets/`, and `.nojekyll` at the repo root and enable Pages.

The page is fully static (Google Fonts via CDN; everything else is local), so it works on any
static host.

## Provenance
Content sourced from the open-source engine at https://github.com/ayazkhan27/SMA-1 (Apache-2.0).
Author: Ayaz Khan. Results shown are the committed memory-swap benchmark numbers; the honest
"where it does not help" boundary is included as on the project itself.
