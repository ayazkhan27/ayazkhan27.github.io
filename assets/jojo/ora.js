/* ORA ORA: a barrage of simulated resamples that builds a 95% interval, punch by punch.
   One punch = 4,338 Bernoulli(0.5669) rows, drawn as one exact Binomial(4338, 0.5669) count.
   Contract: mount(root) -> { pause, resume, destroy }. No dependencies. */

const N = 4338, P = 0.5669, TARGET = 1000, SEED = 4338;
const REAL = [55.13, 58.08], EST = 56.69;
const BIN = 9, NB = 35, K0 = 2302;            // 35 bins of 9 counts; bin 17 is centred on the mode, 2459
const X0 = (K0 - 0.5) / N * 100, X1 = (K0 + BIN * NB - 0.5) / N * 100;
const MAX_RATE = 60, TAP_MS = 200, SFX_GAP = 1000 / 15, MIN_TAIL = 40;
/* where kana may land, as fractions of the plot: the empty corners above the tails, one burst per slot.
   Edge slots (third value 1) may take the long オラオラ, which the panel then crops like a manga frame. */
const SLOTS = [[0.03, 0.16, 1], [0.17, 0.42], [0.02, 0.7, 1], [0.24, 0.1], [0.97, 0.2, 1], [0.83, 0.44], [0.98, 0.72, 1], [0.76, 0.1]];

/* mulberry32: small seeded PRNG, uniform on [0, 1) */
function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Binomial(N, P) by inverse CDF. The pmf is walked outward from the mode with the ratio
   P(k+1)/P(k) = (N-k)/(k+1) * p/q, so no factorials; then normalised and cumulated over +-12 sd.
   Each draw is one uniform and a binary search: exact, and fast enough for 60 punches a second. */
const MODE = Math.floor((N + 1) * P), SD = Math.sqrt(N * P * (1 - P));
const LO = Math.max(0, Math.floor(MODE - 12 * SD)), HI = Math.min(N, Math.ceil(MODE + 12 * SD));
const CDF = (() => {
  const w = new Float64Array(HI - LO + 1), r = P / (1 - P);
  w[MODE - LO] = 1;
  for (let k = MODE; k < HI; k++) w[k + 1 - LO] = w[k - LO] * (N - k) / (k + 1) * r;
  for (let k = MODE; k > LO; k--) w[k - 1 - LO] = w[k - LO] * k / (N - k + 1) / r;
  let s = 0;
  for (let i = 0; i < w.length; i++) w[i] = s += w[i];
  for (let i = 0; i < w.length; i++) w[i] /= s;
  return w;
})();

/* sampler(seed)() returns the number of hits in one resample of N rows */
export function sampler(seed = SEED) {
  const u = mulberry32(seed);
  return function () {
    const x = u();
    let a = 0, b = CDF.length - 1;
    while (a < b) { const m = (a + b) >> 1; if (CDF[m] < x) a = m + 1; else b = m; }
    return LO + a;
  };
}

/* R's default quantile (type 7), read off a table of counts: counts[i] = draws equal to LO + i */
export function quantile7(counts, n, p) {
  const h = (n - 1) * p, j = Math.floor(h), g = h - j;
  const at = (rank) => { let s = 0; for (let i = 0; i < counts.length; i++) { s += counts[i]; if (s > rank) return LO + i; } return HI; };
  const a = at(j);
  return g ? a + g * (at(j + 1) - a) : a;
}

const pct = (k) => k / N * 100;
const f2 = (v) => v.toFixed(2);
const NS = 'http://www.w3.org/2000/svg';

export async function mount(root, opts = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const id = 'jjo' + Math.random().toString(36).slice(2, 8);
  root.innerHTML = `
<div class="jj-ora">
  <div class="jj-ora__controls">
    <button type="button" class="jj-ora__btn"><span class="jj-ora__word">ORA</span><span class="jj-ora__hint">Hold to rush. Tap for one.</span></button>
    <span class="jj-ora__side">
      <button type="button" class="jj-ora__sec" data-act="auto">Run to 1,000</button>
      <button type="button" class="jj-ora__sec" data-act="reset">Reset</button>
    </span>
  </div>
  <figure class="jj-ora__panel">
    <svg class="jj-ora__lines" aria-hidden="true"><defs><clipPath id="${id}-p"><rect x="0" y="0" width="100%"/></clipPath></defs><path clip-path="url(#${id}-p)"/></svg>
    <figcaption class="jj-ora__head">
      <span class="jj-ora__note"><span>Simulated. Each punch redraws 4,338 rows at a 56.69% hit rate.</span></span>
      <span class="jj-ora__count"><span><b>0</b> of 1,000 resamples</span></span>
    </figcaption>
    <div class="jj-ora__plot">
      <svg class="jj-ora__chart" role="img" aria-labelledby="${id}-t">
        <title id="${id}-t">Histogram of simulated resample accuracies. Beneath it, the middle 95% of the simulated resamples and, for scale, the reported 95% CI from the real analysis, 55.13% to 58.08%, which this simulation does not reproduce.</title>
        <defs><clipPath id="${id}-m"><rect y="0"/></clipPath></defs>
        <g class="jj-ora__ctx"></g>
        <g class="jj-ora__mid" clip-path="url(#${id}-m)"></g>
        <rect class="jj-ora__hit" width="0" height="0"/>
        <text class="jj-ora__tag" text-anchor="middle"/>
        <text class="jj-ora__empty" text-anchor="middle">Each punch lands here</text>
        <line class="jj-ora__axis" x1="0"/>
        <g class="jj-ora__ticks"></g>
        <g class="jj-ora__sim"><text class="is-name"/><text class="is-val" text-anchor="end"/><line class="is-span"/><line class="is-end"/><line class="is-end"/></g>
        <g class="jj-ora__real"><text class="is-name"/><text class="is-val" text-anchor="end"/><rect height="8"/><circle r="4.5"/></g>
      </svg>
    </div>
    <div class="jj-ora__fx" aria-hidden="true"></div>
  </figure>
  <p class="jj-ora__summary" hidden></p>
  <p class="jj-ora__vh" role="status" aria-live="polite"></p>
</div>`;

  const $ = (s) => root.querySelector(s);
  const box = $('.jj-ora'), panel = $('.jj-ora__panel'), wrap = $('.jj-ora__plot'), svg = $('.jj-ora__chart');
  const fx = $('.jj-ora__fx'), btn = $('.jj-ora__btn'), hint = $('.jj-ora__hint');
  const autoBtn = $('[data-act="auto"]'), resetBtn = $('[data-act="reset"]');
  const countB = $('.jj-ora__count b'), summary = $('.jj-ora__summary'), live = $('.jj-ora__vh');
  const speed = $('.jj-ora__lines path'), hit = $('.jj-ora__hit'), tag = $('.jj-ora__tag'), empty = $('.jj-ora__empty'), axis = $('.jj-ora__axis'), ticks = $('.jj-ora__ticks');
  const clipP = $(`#${id}-p rect`), clipM = $(`#${id}-m rect`);
  const [simName, simVal, simSpan, simEnd1, simEnd2] = $('.jj-ora__sim').children;
  const [realName, realVal, realBar, realDot] = $('.jj-ora__real').children;
  const mk = (tag, parent) => parent.appendChild(doc.createElementNS(NS, tag));
  const ctxBars = [], midBars = [];
  for (let b = 0; b < NB; b++) { ctxBars.push(mk('rect', $('.jj-ora__ctx'))); midBars.push(mk('rect', $('.jj-ora__mid'))); }

  /* state */
  const counts = new Uint16Array(CDF.length), bins = new Uint16Array(NB), busy = SLOTS.map(() => false);
  let run = 0, draw = sampler(SEED), n = 0, lastK = -1, lastBin = -1, maxBin = 0;
  let ymax = 12, ytarget = 12, holding = false, holdAt = 0, auto = false, rushT = 0, owed = 0, power = 0;
  let raf = 0, prev = 0, dirty = true, lastSfx = -1e9, lastLines = 0, rushNow = false;
  let ext = false, stopped = doc.documentElement.classList.contains('time-stopped'), inView = true, frozen = false;
  let W = 0, plotH = 0, axisY = 0, binW = 0;
  const plotTop = 6;

  const x = (p) => (p - X0) / (X1 - X0) * W;
  const sfx = (name, gain) => doc.dispatchEvent(new CustomEvent('sfx', { detail: { name, gain } }));
  const done = () => n >= TARGET;
  const motion = () => !reduce.matches && !frozen;
  const rushing = () => auto || (holding && performance.now() - holdAt > TAP_MS);
  const set = (el, attrs) => { for (const k in attrs) el.setAttribute(k, attrs[k]); };

  function layout() {
    W = Math.max(200, Math.round(wrap.clientWidth));
    plotH = Math.round(Math.min(250, Math.max(150, W * 0.36)));
    axisY = plotTop + plotH;
    binW = W / NB;
    const H = axisY + 116, wide = W >= 520, gap = binW > 8 ? 2 : 1;
    set(svg, { viewBox: `0 0 ${W} ${H}`, width: W, height: H });
    set(clipM, { height: axisY });
    set(axis, { x2: W, y1: axisY + 0.5, y2: axisY + 0.5 });
    set(empty, { x: x(EST), y: plotTop + plotH * 0.55 });
    for (let b = 0; b < NB; b++) {
      const bx = x(pct(K0 + BIN * b - 0.5)) + gap / 2;
      set(ctxBars[b], { x: bx, width: binW - gap });
      set(midBars[b], { x: bx, width: binW - gap });
    }
    ticks.replaceChildren();
    const step = W >= 380 ? 1 : 2;
    for (let t = 54; t <= 60; t += step) {
      const tx = mk('text', ticks);
      set(tx, { x: x(t), y: axisY + 22, 'text-anchor': 'middle' });
      tx.textContent = t + '%';
    }
    simName.textContent = wide ? 'Simulated: middle 95% of resamples' : 'Simulated 95%';
    realName.textContent = wide ? 'Reported 95% CI, from the real analysis' : 'Reported 95% CI';
    set(simName, { x: 0, y: axisY + 52 }); set(simVal, { x: W, y: axisY + 52 });
    set(realName, { x: 0, y: axisY + 94 }); set(realVal, { x: W, y: axisY + 94 });
    realVal.textContent = '55.13% to 58.08%';
    set(realBar, { x: x(REAL[0]), y: axisY + 100, width: x(REAL[1]) - x(REAL[0]) });
    set(realDot, { cx: x(EST), cy: axisY + 104 });
    dirty = true; render();
  }

  function interval() {
    return n >= MIN_TAIL ? [pct(quantile7(counts, n, 0.025)), pct(quantile7(counts, n, 0.975))] : null;
  }

  function render() {
    dirty = false;
    const unit = plotH / ymax;
    for (let b = 0; b < NB; b++) {
      const h = bins[b] * unit, y = axisY - h;
      set(ctxBars[b], { y, height: h }); set(midBars[b], { y, height: h });
    }
    const iv = interval(), sy = axisY + 64;
    if (iv) {
      const a = x(iv[0]), z = x(iv[1]);
      set(clipM, { x: a, width: Math.max(0, z - a) });
      set(simSpan, { x1: a, x2: z, y1: sy, y2: sy });
      set(simEnd1, { x1: a, x2: a, y1: sy - 6, y2: sy + 6 });
      set(simEnd2, { x1: z, x2: z, y1: sy - 6, y2: sy + 6 });
      simVal.textContent = f2(iv[0]) + '% to ' + f2(iv[1]) + '%';
      simVal.classList.remove('is-wait');
    } else {
      set(clipM, { x: 0, width: W });
      for (const l of [simSpan, simEnd1, simEnd2]) set(l, { x1: 0, x2: 0, y1: 0, y2: 0 });
      simVal.textContent = n ? 'shows after 40 punches' : 'no punches yet';
      simVal.classList.add('is-wait');
    }
    tag.textContent = '';
    if (lastBin >= 0 && !done()) {
      const h = bins[lastBin] * unit, bx = +ctxBars[lastBin].getAttribute('x'), bw = binW - (binW > 8 ? 2 : 1);
      set(hit, { x: bx, width: bw, y: axisY - h, height: Math.min(h, Math.max(3, unit)) });
      if (!rushNow) {                           // label where the last tap landed; hidden mid-rush, where it would flicker
        set(tag, { x: Math.min(W - 26, Math.max(26, bx + bw / 2)), y: axisY - h - 8 });
        tag.textContent = f2(pct(lastK)) + '%';
      }
    } else set(hit, { width: 0, height: 0 });
    empty.style.display = n ? 'none' : '';
    countB.textContent = n.toLocaleString('en-US');
  }

  function punch() {
    if (done()) return;
    const k = draw();
    counts[k - LO]++; n++; lastK = k;
    lastBin = Math.min(NB - 1, Math.max(0, Math.floor((k - K0) / BIN)));
    maxBin = Math.max(maxBin, ++bins[lastBin]);
    ytarget = Math.max(12, Math.ceil(maxBin * 1.15));
    dirty = true;
    const now = performance.now();
    if (!stopped && now - lastSfx >= SFX_GAP) { lastSfx = now; sfx('ora', 0.55); }
    if (n === TARGET) finish();
    else if (n % 100 === 0) {
      const iv = interval();
      live.textContent = `${n.toLocaleString('en-US')} resamples. Middle 95%: ${f2(iv[0])}% to ${f2(iv[1])}%.`;
    }
  }

  function finish() {
    stopRush();
    const [a, z] = interval();
    summary.innerHTML = `1,000 simulated resamples: 95% of them landed between <b>${f2(a)}%</b> and <b>${f2(z)}%</b>. The reported interval, from the real analysis, is <b>55.13%</b> to <b>58.08%</b>. This sketch treats 56.69% as a plain hit rate and does not reproduce that analysis.`;
    summary.hidden = false;
    live.textContent = summary.textContent;
    for (const b of [btn, autoBtn]) b.setAttribute('aria-disabled', 'true');
    hint.textContent = 'Done. Reset to run again.';
    if (stopped) return;
    if (!ext) sfx('ora-final', 0.9);
    fx.replaceChildren(); busy.fill(false);   // the last beat stands alone
    const s = doc.createElement('span');
    s.className = 'jj-ora__final';
    s.textContent = 'ORA!';
    s.style.left = wrap.offsetLeft + W / 2 + 'px';
    s.style.top = wrap.offsetTop + plotTop + plotH * 0.45 + 'px';
    s.addEventListener('animationend', () => s.remove(), { once: true });
    fx.appendChild(s);
  }

  /* flourish: kana bursts in the empty corners over the tails, focus lines behind the bars */
  function burst() {
    const free = [];
    busy.forEach((b, i) => { if (!b) free.push(i); });
    if (!motion() || !free.length) return;
    const i = free[Math.floor(Math.random() * free.length)], [sx, sy, edge] = SLOTS[i];
    const s = doc.createElement('span'), two = edge && power > 0.5 && Math.random() < 0.5;
    busy[i] = true;
    s.className = 'jj-ora__kana';
    s.textContent = two ? 'オラオラ' : 'オラ';
    s.style.left = wrap.offsetLeft + W * (sx + (Math.random() - 0.5) * 0.04) + 'px';
    s.style.top = wrap.offsetTop + plotTop + plotH * (sy + (Math.random() - 0.5) * 0.08) + 'px';
    s.style.setProperty('--r', (Math.random() * 44 - 22).toFixed(1) + 'deg');
    s.style.setProperty('--s', ((0.85 + Math.random() * (0.4 + power)) * Math.min(1, Math.max(0.6, W / 640))).toFixed(2));
    s.addEventListener('animationend', () => { s.remove(); busy[i] = false; }, { once: true });
    fx.appendChild(s);
  }

  function focusLines() {
    const cx = wrap.offsetLeft + x(EST), cy = wrap.offsetTop + plotTop + plotH * 0.8, far = W + 2 * plotH;
    const inner = Math.min(W * 0.34, plotH * 0.85);
    let d = '';
    for (let i = 0; i < 96; i++) {
      const a = (i + Math.random() * 0.9) / 96 * Math.PI * 2, w = 0.0015 + Math.random() * 0.0055;
      const r0 = inner * (0.8 + Math.random() * 0.55);
      d += `M${(cx + Math.cos(a - w) * far).toFixed(1)} ${(cy + Math.sin(a - w) * far).toFixed(1)}L${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a + w) * far).toFixed(1)} ${(cy + Math.sin(a + w) * far).toFixed(1)}Z`;
    }
    speed.setAttribute('d', d);
    clipP.setAttribute('height', wrap.offsetTop + axisY);   // lines stop at the axis, the "ground"
    speed.style.opacity = (0.1 + power * 0.22).toFixed(3);
  }

  function loop(t) {
    raf = 0;
    const dt = prev ? Math.min((t - prev) / 1000, 0.05) : 0;
    prev = t;
    const rush = rushing() && !frozen && !done();
    if (rush !== rushNow) { rushNow = rush; dirty = true; }
    if (rush) {
      rushT += dt;
      const rate = 8 + (MAX_RATE - 8) * (1 - Math.exp(-rushT / 0.7));
      power = rate / MAX_RATE;
      owed += rate * dt;
      while (owed >= 1 && !done()) { owed -= 1; punch(); }
      if (motion() && !done()) {
        if (Math.random() < (4 + 9 * power) * dt) burst();
        if (t - lastLines > 70) { lastLines = t; focusLines(); }
      }
    } else if (!frozen) speed.style.opacity = 0;   // in stopped time the lines hold, like everything else
    btn.classList.toggle('is-rushing', rush && motion());
    if (ymax !== ytarget) {
      ymax = reduce.matches ? ytarget : ymax + (ytarget - ymax) * Math.min(1, dt * 7);
      if (Math.abs(ytarget - ymax) < 0.05) ymax = ytarget;
      dirty = true;
    }
    if (dirty) render();
    if (rush || holding || ymax !== ytarget) kick();
    else if (!raf) prev = 0;
  }
  const kick = () => { if (!raf) raf = win.requestAnimationFrame(loop); };

  function press() {
    if (done()) return;
    punch();
    if (motion()) burst();
    if (frozen) { ymax = ytarget; render(); return; }      // stopped time or offscreen: one punch, no rush
    holding = true; holdAt = performance.now();
    if (!auto) { rushT = 0; owed = 0; }
    btn.classList.add('is-held');
    kick();
  }
  function release() {
    holding = false; btn.classList.remove('is-held');
    if (!auto) { rushT = 0; owed = 0; }
    kick();
  }
  function setAuto(on) {
    auto = on && !done() && !frozen;
    autoBtn.textContent = auto ? 'Stop' : 'Run to 1,000';
    if (auto) { rushT = 0; owed = 0; }
    kick();
  }
  function stopRush() { holding = false; rushNow = false; dirty = true; btn.classList.remove('is-held', 'is-rushing'); setAuto(false); }

  function reset() {
    stopRush();
    draw = sampler(SEED + ++run);
    counts.fill(0); bins.fill(0);
    n = 0; lastK = -1; lastBin = -1; maxBin = 0; ytarget = ymax = 12;
    for (const b of [btn, autoBtn]) b.removeAttribute('aria-disabled');
    hint.textContent = 'Hold to rush. Tap for one.';
    summary.hidden = true; summary.textContent = '';
    fx.replaceChildren(); busy.fill(false);
    live.textContent = 'Reset. No resamples yet.';
    render();
  }

  function sync() {
    frozen = ext || stopped || !inView;
    box.classList.toggle('is-frozen', frozen);
    if (frozen) stopRush();
    kick();
  }

  /* input: pointer and Space/Enter hold; a click with detail 0 comes from assistive tech, one punch */
  const on = (el, type, fn, o) => { el.addEventListener(type, fn, o); return () => el.removeEventListener(type, fn, o); };
  const offs = [
    on(btn, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      press();
    }),
    on(btn, 'pointerup', release), on(btn, 'pointercancel', release), on(btn, 'lostpointercapture', release),
    on(btn, 'keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      if (!e.repeat) press();
    }),
    on(btn, 'keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); release(); } }),
    on(btn, 'blur', release),
    on(btn, 'click', (e) => { if (e.detail === 0) { press(); release(); } }),
    on(btn, 'contextmenu', (e) => e.preventDefault()),
    on(autoBtn, 'click', () => setAuto(!auto)),
    on(resetBtn, 'click', reset),
    on(doc, 'timestop', () => { stopped = true; sync(); }),
    on(doc, 'timeresume', () => { stopped = false; sync(); }),
    on(doc, 'visibilitychange', () => { if (doc.hidden) stopRush(); }),
  ];
  const io = new win.IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; sync(); });
  io.observe(panel);
  const ro = new win.ResizeObserver(() => { if (Math.round(wrap.clientWidth) !== W) layout(); });
  ro.observe(wrap);
  layout();
  sync();

  return {
    pause() { ext = true; sync(); },
    resume() { ext = false; sync(); },
    destroy() {
      stopRush();
      if (raf) win.cancelAnimationFrame(raf);
      offs.forEach((off) => off());
      io.disconnect(); ro.disconnect();
      root.replaceChildren();
    },
  };
}
