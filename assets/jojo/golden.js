// Gyro's golden rectangle, checked against Muybridge's 1878 plate.
// mount(root) needs the page's inline horse symbols (#h1..#h11) and reads golden.json from beside this file
// (written by tools/golden.py). Styles: golden.css, scoped under .jj-golden.
const PHI = (1 + Math.sqrt(5)) / 2;
const MINUS = '−';
const f3 = v => (v < 0 ? MINUS : '') + Math.abs(v).toFixed(3);
const sgn = v => (v < 0 ? MINUS : '+') + Math.abs(v).toFixed(3);
// the sign in the text face: Afficher's minus is a hairline and would read as no sign at all
const sgnHTML = v => `<span class="jjg-sign">${v < 0 ? MINUS : '+'}</span>${Math.abs(v).toFixed(3)}`;
const r1 = v => Math.round(v * 10) / 10;
const fp = p => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const set = (el, a) => { for (const k in a) el.setAttribute(k, a[k]); };
const sfx = (name, gain) => document.dispatchEvent(new CustomEvent('sfx', { detail: { name, gain } }));
let uid = 0;

// Golden rectangle of height h with its top left at (x, y): cut a square off the left, top, right, bottom, left...
// The spiral is one quarter circle per square, each centred on the square's inner corner.
function golden(x, y, h) {
  let w = PHI * h, cuts = '', arc = `M${r1(x)} ${r1(y + h)}`;
  for (let k = 0; k < 10; k++) {
    const s = k % 2 ? w : h;
    let ex, ey;
    if (k % 4 === 0) { cuts += `M${r1(x + s)} ${r1(y)}V${r1(y + h)}`; ex = x + s; ey = y; x += s; w -= s; }
    else if (k % 4 === 1) { cuts += `M${r1(x)} ${r1(y + s)}H${r1(x + w)}`; ex = x + w; ey = y + s; y += s; h -= s; }
    else if (k % 4 === 2) { cuts += `M${r1(x + w - s)} ${r1(y)}V${r1(y + h)}`; ex = x + w - s; ey = y + h; w -= s; }
    else { cuts += `M${r1(x)} ${r1(y + h - s)}H${r1(x + w)}`; ex = x; ey = y + h - s; h -= s; }
    arc += `A${r1(s)} ${r1(s)} 0 0 1 ${r1(ex)} ${r1(ey)}`;
  }
  return { cuts, arc };
}

export async function mount(root, opts = {}) {
  const noop = () => {};
  let data;
  try {
    const res = await fetch(new URL('golden.json', import.meta.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch {
    root.textContent = 'The golden-ratio measurements did not load.';
    return { pause: noop, resume: noop, destroy() { root.textContent = ''; } };
  }
  const F = data.frames, M = data.measures, R = data.rest, id = `jjg${++uid}`;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = Math.min(F.length, Math.max(1, opts.frame | 0 || 1));
  let measure = opts.measure === 'horse' ? 'horse' : 'rider';
  let paused = document.documentElement.classList.contains('time-stopped');

  // One view box for every frame, wide enough for the widest golden rectangle.
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, x2 = -1e9, y1 = -1e9;
  for (const { box: [x, y, w, h] } of F) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y + h);
    x1 = Math.max(x1, x + w); x2 = Math.max(x2, x + Math.max(w, PHI * h));
  }
  const ci = m => `${m.ci95[0].toFixed(2)} to ${m.ci95[1].toFixed(2)}`;
  const tr = (a, b, c) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${c}</td></tr>`;
  const use = `width="1280" height="816"`;

  root.classList.add('jj-golden');
  root.innerHTML = `
<div class="jjg-view">
  <svg class="jjg-stage" viewBox="${x0 - 24} ${y0 - 24} ${x2 - x0 + 48} ${y1 - y0 + 48}" role="img" aria-labelledby="${id}-t">
    <title id="${id}-t"></title>
    <defs><clipPath id="${id}-c"><rect x="0" width="1280"/></clipPath></defs>
    <use class="jjg-ghost" ${use}/><use class="jjg-horse" ${use} clip-path="url(#${id}-c)"/>
    <g class="jjg-gold"><rect class="jjg-phi"/><path class="jjg-cuts"/><path class="jjg-spiral" pathLength="1"/></g>
    <rect class="jjg-box"/>
  </svg>
  <p class="jjg-key" aria-hidden="true"><span class="b"></span><span class="g">Golden rectangle, same height</span></p>
  <div class="jjg-bar">
    <div class="jjg-steps">
      <button type="button" class="jjg-prev" aria-label="Previous frame">Back</button>
      <button type="button" class="jjg-next" aria-label="Next frame">Next</button>
      <span class="jjg-where" aria-hidden="true"></span>
    </div>
    <div class="jjg-seg" role="group" aria-labelledby="${id}-m">
      <span class="jjg-lab" id="${id}-m">Measure</span>
      <span class="jjg-pair"><button type="button" data-m="rider">${M.rider.label}</button><button type="button" data-m="horse">${M.horse.label}</button></span>
    </div>
  </div>
  <ol class="jjg-strip" aria-label="The ${F.length} gallop frames">${F.map(f => `
    <li><button type="button" data-n="${f.n}" aria-label="Frame ${f.n}"><svg viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" aria-hidden="true"><use href="#h${f.n}" ${use}/></svg></button></li>`).join('')}
  </ol>
  <p class="jjg-verdict"></p>
</div>
<div class="jjg-facts">
  <dl class="jjg-read">
    <div><dt>This frame</dt><dd class="jjg-r"></dd></div>
    <div><dt>Golden</dt><dd>1.618</dd></div>
    <div><dt>Gap</dt><dd class="jjg-gap"></dd></div>
  </dl>
  <p class="jjg-note"></p>
  <p class="jjg-key2" aria-hidden="true"><span class="r">${M.rider.label}</span><span class="h">${M.horse.label}</span><span class="g">Golden, 1.618</span></p>
  <div class="jjg-plot"></div>
  <p class="jjg-cap"></p>
  <details class="jjg-table"><summary>Show the numbers (table)</summary><table>
    <thead><tr><th scope="col">Frame</th><th scope="col">${M.rider.label}</th><th scope="col">${M.horse.label}</th></tr></thead>
    <tbody>${F.map(f => tr(f.n, f3(f.rider), f3(f.horse))).join('')}</tbody>
    <tfoot>${tr('Mean', M.rider.mean.toFixed(3), M.horse.mean.toFixed(3))}${tr('Bootstrap 95% CI', ci(M.rider), ci(M.horse))}${tr('t-test p', fp(M.rider.p), fp(M.horse.p))}${tr('12, at rest', f3(R.rider), f3(R.horse))}</tfoot>
  </table></details>
</div>
<p class="jjg-vh" aria-live="polite"></p>`;

  const q = s => root.querySelector(s);
  const stage = q('.jjg-stage'), spiral = q('.jjg-spiral'), plot = q('.jjg-plot'), live = q('.jjg-vh');
  // "The horse is not golden: with the rider ..." shows as a headline sentence and the numbers under it.
  const vi = data.verdict.indexOf(': '), rest = data.verdict.slice(vi + 2);
  q('.jjg-verdict').replaceChildren(...(vi > 0
    ? [Object.assign(document.createElement('b'), { textContent: data.verdict.slice(0, vi) + '.' }), rest[0].toUpperCase() + rest.slice(1)]
    : [data.verdict]));
  q('.jjg-cap').textContent = data.caption;

  function drawPlot() {
    const W = Math.max(240, Math.round(plot.clientWidth) || 320), L = 30, Rt = 14, T = 30, row = 20;
    const S0 = T + F.length * row + 26, yA = S0 + 2 * 44 - 8, H = yA + 24;
    const vals = F.flatMap(f => [f.rider, f.horse]).concat(PHI, M.rider.ci95, M.horse.ci95);
    const lo = Math.floor(Math.min(...vals) * 5) / 5, hi = Math.ceil(Math.max(...vals) * 5) / 5;
    const X = v => r1(L + (v - lo) / (hi - lo) * (W - L - Rt));
    const dot = (c, x, y, r, tip) => `<circle class="${c}" cx="${x}" cy="${y}" r="${r}">${tip ? `<title>${tip}</title>` : ''}</circle>`;
    const yRow = i => T + i * row + row / 2;
    const group = (k, c) => {
      const m = M[k], y = S0 + (k === 'rider' ? 0 : 44), [a, b] = m.ci95.map(X);
      return `<g>${F.map((f, i) => dot(c, X(f[k]), yRow(i), 5, `Frame ${f.n}, ${m.label.toLowerCase()}: ${f3(f[k])}`)).join('')}
        <text class="t lab" x="0" y="${y}">${m.label}: mean ${m.mean.toFixed(2)}, CI ${ci(m)}</text>
        <path class="ci" d="M${a} ${y + 15}H${b}M${a} ${y + 9}v12M${b} ${y + 9}v12"/>${dot(c, X(m.mean), y + 15, 6)}</g>`;
    };
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ratios of the ${F.length} gallop frames. ${M.rider.label}: mean ${M.rider.mean.toFixed(2)}, 95% CI ${ci(M.rider)}. ${M.horse.label}: mean ${M.horse.mean.toFixed(2)}, 95% CI ${ci(M.horse)}. Golden is 1.618.">
      <rect class="sel" x="0" y="${T + (frame - 1) * row}" width="${W}" height="${row}"/>
      <line class="phi" x1="${X(PHI)}" x2="${X(PHI)}" y1="${T - 6}" y2="${yA}"/>
      <text class="t" x="${X(PHI)}" y="${T - 12}" text-anchor="middle">1.618</text>`;
    F.forEach((f, i) => {
      s += `<text x="${L - 10}" y="${yRow(i) + 4}" text-anchor="end"${f.n === frame ? ' class="t"' : ''}>${f.n}</text>
        <line class="ln" x1="${X(f.rider)}" x2="${X(f.horse)}" y1="${yRow(i)}" y2="${yRow(i)}"/>`;
    });
    s += group('rider', 'r') + group('horse', 'h') + `<line class="ax" x1="${L}" x2="${W - Rt}" y1="${yA}" y2="${yA}"/>`;
    for (let k = Math.round(lo * 5); k <= Math.round(hi * 5); k++) s += `<text x="${X(k / 5)}" y="${yA + 18}" text-anchor="middle">${(k / 5).toFixed(1)}</text>`;
    plot.innerHTML = s + '</svg>';
  }

  function spin() {
    if (paused || reduce.matches) return;
    spiral.classList.remove('jjg-draw');
    void spiral.getBoundingClientRect(); // restart the animation
    spiral.classList.add('jjg-draw');
  }

  function update(user) {
    const f = F[frame - 1], m = M[measure], ratio = f[measure], gap = ratio - PHI, alone = measure === 'horse';
    const [x, by, w, bh] = f.box, top = alone ? f.ear[1] : by, h = by + bh - top, g = golden(x, top, h);
    const pct = `${(Math.abs(gap) / PHI * 100).toFixed(1)}% ${gap < 0 ? 'narrower' : 'wider'}`;
    const near = Math.abs(gap) / PHI < 0.02, lo = Math.min(...m.values), hi = Math.max(...m.values);
    const label = alone ? 'horse alone' : 'with the rider';
    stage.querySelectorAll('use').forEach(u => u.setAttribute('href', `#h${f.n}`));
    set(stage.querySelector('clipPath rect'), { y: top, height: 816 - top });
    set(q('.jjg-box'), { x, y: top, width: w, height: h });
    set(q('.jjg-phi'), { x, y: top, width: r1(PHI * h), height: h });
    q('.jjg-cuts').setAttribute('d', g.cuts);
    spiral.setAttribute('d', g.arc);
    q(`#${id}-t`).textContent = `Frame ${f.n}, ${label}: the box is ${f3(ratio)} to 1. A golden rectangle of the same height is drawn over it.`;
    q('.jjg-key .b').textContent = alone ? 'Box, ear tip to hoof' : 'Box, horse and rider';
    q('.jjg-where').textContent = `Frame ${f.n} of ${F.length}`;
    q('.jjg-r').textContent = f3(ratio);
    q('.jjg-gap').innerHTML = `${sgnHTML(gap)}<small>${pct}</small>`;
    q('.jjg-note').textContent = near
      ? `Within 2% of golden.${lo < PHI && PHI < hi ? ` This ratio runs from ${f3(lo)} to ${f3(hi)} across the run, so it was bound to pass 1.618 somewhere. One close frame is not evidence.` : ''}`
      : `Closest to 1.618, ${label}: frame ${m.closest.n}, at ${f3(m.closest.ratio)}.`;
    root.querySelectorAll('[data-m]').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === measure));
    root.querySelectorAll('[data-n]').forEach(b => b.setAttribute('aria-current', +b.dataset.n === f.n));
    drawPlot();
    if (user) {
      live.textContent = `Frame ${f.n}, ${label}: ${f3(ratio)} to 1. Golden is 1.618. Gap ${sgn(gap)}, ${pct}.${near ? ' Within 2% of golden.' : ''}`;
      sfx(near ? 'golden' : 'tick', near ? 0.8 : 0.3);
      spin();
    }
  }

  const step = d => { frame = (frame - 1 + d + F.length) % F.length + 1; update(true); };
  const onClick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.m) { measure = b.dataset.m; update(true); }
    else if (b.dataset.n) { frame = +b.dataset.n; update(true); }
    else if (b.classList.contains('jjg-prev')) step(-1);
    else if (b.classList.contains('jjg-next')) step(1);
  };
  const onKey = e => {
    if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Home' || e.key === 'End') { frame = e.key === 'Home' ? 1 : F.length; update(true); }
    else step(e.key === 'ArrowLeft' ? -1 : 1);
    if (e.target.closest('.jjg-strip')) q(`.jjg-strip [data-n="${frame}"]`).focus();
  };
  const pause = () => { paused = true; spiral.classList.remove('jjg-draw'); };
  const resume = () => { paused = false; };
  spiral.addEventListener('animationend', () => spiral.classList.remove('jjg-draw'));
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  document.addEventListener('timestop', pause);
  document.addEventListener('timeresume', resume);
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = Math.round(plot.clientWidth);
    if (w && w !== lastW) { lastW = w; drawPlot(); }
  });
  ro.observe(plot);
  // The spiral draws itself once, the first time the stage is on screen. Nothing else moves.
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); spin(); } }, { threshold: 0.4 });
  io.observe(stage);
  update(false);

  return {
    pause,
    resume,
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKey);
      document.removeEventListener('timestop', pause);
      document.removeEventListener('timeresume', resume);
      ro.disconnect();
      io.disconnect();
      root.innerHTML = '';
      root.classList.remove('jj-golden');
    },
  };
}
