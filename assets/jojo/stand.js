/* 「NO SURPRISES」: Ayaz Khan's Stand parameter card. Six parameters in JoJo's official order,
   graded A to E, each grade tied to a line of evidence that links up to its section of the page.
   Contract: mount(root) -> { pause, resume, destroy }. */

// [label, grade, evidence]; one label set for the chart and the list
const AXES = [
  ['Power', 'A', '<a href="#calx">594,000 concepts across 11 ontologies in SMA-1</a>'],
  ['Speed', 'B', '<a href="#work">Caught the accuracy ceiling before a degrading release shipped</a>'],
  ['Range', 'A', '<a href="#work">Insurance pricing</a>, <a href="#psc">utility rate cases</a>, <a href="#calx">medical and genomic retrieval</a>, <a href="#early">sensor networks</a>'],
  ['Stamina', 'A', '<a href="#psc">12,073 segments from 317 rate-case filings</a>'],   // 持続力; JoJo Wiki's English label
  ['Precision', 'A', '<a href="#work">95% CI [55.13, 58.08] on 4,338 rows</a>'],
  ['Potential', 'A', '<a href="#record">NSF Graduate Research Fellow, 1 of 1,000 awardees from 17,000 applicants</a>'],
];
const GRADES = 'EDCBA', R = 84, LR = 96;      // hexagon radius and label anchor radius, in a viewBox 300 units wide
const SIDE = ['n', 'e', 'e', 's', 'w', 'w'];  // each label hangs off the vertex on this side, so it never covers it
const pt = (i, r) => { const a = (i * 60 - 90) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
const xy = ([x, y]) => x.toFixed(1) + ',' + y.toFixed(1);
const hex = (r) => AXES.map((_, i) => xy(pt(i, r))).join(' ');
const rOf = (g) => (GRADES.indexOf(g) + 1) / 5 * R;
const G = 1;                                  // index of the grade in an AXES row

export async function mount(root, opts = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const id = 'jjs' + Math.random().toString(36).slice(2, 8);
  const rings = [1, 2, 3, 4, 5].map((k) => `<polygon points="${hex(k / 5 * R)}"/>`).join('');
  const spokes = AXES.map((_, i) => { const [x, y] = pt(i, R); return `<line x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  // ring letters sit just under each ring's top corner, left of the spoke, clear of the polygon edge
  const letters = [...GRADES].map((g, k) => `<text x="-5" y="${(15 - (k + 1) / 5 * R).toFixed(1)}" text-anchor="end">${g}</text>`).join('');
  const dots = AXES.map((a, i) => { const [x, y] = pt(i, rOf(a[G])); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; }).join('');
  // the chart's labels repeat the list for the eye only; the list below carries the grades and the links
  const axes = AXES.map((a, i) => {
    const [x, y] = pt(i, LR);
    return `<span class="jj-stand__axis is-${SIDE[i]}" style="left:${(50 + x / 3).toFixed(2)}%;top:${(50 + y / 3).toFixed(2)}%"><span class="jj-stand__an">${a[0]}</span><span class="jj-stand__ag">${a[G]}</span></span>`;
  }).join('');
  const list = AXES.map((a) => `<div><dt>${a[0]}</dt><dd class="jj-stand__lg"><span class="jj-stand__vh">Grade </span>${a[G]}</dd><dd>${a[2]}</dd></div>`).join('');

  root.innerHTML = `
<div class="jj-stand">
  <article class="jj-stand__card" aria-labelledby="${id}-n">
    <header class="jj-stand__head">
      <h3 class="jj-stand__name" id="${id}-n"><span class="jj-stand__br" aria-hidden="true">「</span>No Surprises<span class="jj-stand__br" aria-hidden="true">」</span></h3>
      <p class="jj-stand__kana" lang="ja" aria-hidden="true">ノー・サプライゼズ</p>
      <p class="jj-stand__user">Stand user: <b>Ayaz Khan</b></p>
      <p class="jj-stand__ability"><b>Ability.</b> Measures how surprised a model should be, in bits. A calibrator that claims more than the data allows gets caught.</p>
    </header>
    <div class="jj-stand__chart">
      <svg viewBox="-150 -150 300 300" aria-hidden="true" focusable="false">
        <g class="jj-stand__grid">${rings}${spokes}</g>
        <g class="jj-stand__letters">${letters}</g>
        <polygon class="jj-stand__poly" points="${AXES.map((a, i) => xy(pt(i, rOf(a[G])))).join(' ')}"/>
        <g class="jj-stand__dots">${dots}</g>
      </svg>
      <div aria-hidden="true">${axes}</div>
    </div>
    <dl class="jj-stand__list">${list}</dl>
    <p class="jj-stand__note">In JoJo's Bizarre Adventure, Stands are rated from A (highest) to E on these six parameters.</p>
    <div class="jj-stand__gogo" aria-hidden="true"><span>ゴ</span><span>ゴ</span><span>ゴ</span><span>ゴ</span></div>
  </article>
</div>`;

  const $$ = (s) => [...root.querySelectorAll(s)];
  const box = root.querySelector('.jj-stand'), card = root.querySelector('.jj-stand__card');
  const chart = root.querySelector('.jj-stand__chart');
  const labels = $$('.jj-stand__axis'), spokeEls = $$('.jj-stand__grid line'), dotEls = $$('.jj-stand__dots circle'), rows = $$('.jj-stand__list > div');
  let cur = -1, drawn = false, inView = false, playing = false, ext = false;
  let stopped = doc.documentElement.classList.contains('time-stopped');

  const sfx = (detail) => doc.dispatchEvent(new CustomEvent('sfx', { detail }));
  box.classList.toggle('is-armed', !reduce.matches);

  // pointing at a label or a row, or focusing a row's link, lights the matching spoke, dot, label and row
  function select(i) {
    if (i === cur) return;
    cur = i;
    [labels, spokeEls, dotEls, rows].forEach((els) => els.forEach((el, j) => el.classList.toggle('is-on', j === i)));
  }

  function draw() {
    if (drawn) return;
    drawn = true;
    if (stopped || ext) box.classList.remove('is-armed');   // no draw-in while time is stopped
    box.classList.add('is-drawn');
  }

  function sync() {
    const frozen = ext || stopped || !inView;
    box.classList.toggle('is-frozen', frozen);
    if (playing === !frozen) return;
    playing = !frozen;
    sfx(playing ? { name: 'menace', gain: 0.35 } : { name: 'menace', stop: true });
  }

  const offs = [];
  const on = (el, type, fn) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
  labels.forEach((b, i) => { on(b, 'pointerenter', () => select(i)); on(b, 'pointerleave', () => select(-1)); });
  rows.forEach((r, i) => {
    on(r, 'pointerenter', () => select(i)); on(r, 'pointerleave', () => select(-1));
    on(r, 'focusin', () => select(i)); on(r, 'focusout', () => select(-1));
  });
  on(doc, 'timestop', () => { stopped = true; sync(); });
  on(doc, 'timeresume', () => { stopped = false; sync(); });

  const io = new win.IntersectionObserver((es) => {
    for (const e of es) {
      if (e.target === card) inView = e.isIntersecting;
      else if (e.intersectionRatio >= 0.4) draw();
    }
    sync();
  }, { threshold: [0, 0.4] });
  io.observe(card); io.observe(chart);

  return {
    pause() { ext = true; sync(); },
    resume() { ext = false; sync(); },
    destroy() {
      if (playing) sfx({ name: 'menace', stop: true });
      playing = false;
      offs.forEach((off) => off());
      io.disconnect();
      root.replaceChildren();
    },
  };
}
