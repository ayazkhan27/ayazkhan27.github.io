/* 「NO SURPRISES」: Ayaz Khan's Stand parameter card. Six parameters in JoJo's official order,
   graded A to E, each grade tied to a line of evidence. Contract: mount(root) -> { pause, resume, destroy }. */

const AXES = [
  ['Power', 'Destructive Power', 'A', '594,000 concepts across 11 ontologies in SMA-1'],
  ['Speed', 'Speed', 'B', 'Caught the accuracy ceiling before a degrading release shipped'],
  ['Range', 'Range', 'A', 'Insurance pricing, utility rate cases, medicine, genomics, sensor networks'],
  ['Stamina', 'Stamina', 'A', '12,073 segments from 317 rate-case filings'],   // 持続力; JoJo Wiki's English label
  ['Precision', 'Precision', 'A', '95% CI [55.13, 58.08] on 4,338 rows'],
  ['Potential', 'Developmental Potential', 'A', 'NSF Graduate Research Fellow, 1 of 1,000 awardees from 17,000 applicants'],
];
const GRADES = 'EDCBA', R = 84, LR = 96;      // hexagon radius and label anchor radius, in a viewBox 300 units wide
const SIDE = ['n', 'e', 'e', 's', 'w', 'w'];  // each label hangs off the vertex on this side, so it never covers it
const pt = (i, r) => { const a = (i * 60 - 90) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
const xy = ([x, y]) => x.toFixed(1) + ',' + y.toFixed(1);
const hex = (r) => AXES.map((_, i) => xy(pt(i, r))).join(' ');
const rOf = (g) => (GRADES.indexOf(g) + 1) / 5 * R;

export async function mount(root, opts = {}) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const id = 'jjs' + Math.random().toString(36).slice(2, 8);
  const rings = [1, 2, 3, 4, 5].map((k) => `<polygon points="${hex(k / 5 * R)}"/>`).join('');
  const spokes = AXES.map((_, i) => { const [x, y] = pt(i, R); return `<line x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  // ring letters sit just under each ring's top corner, left of the spoke, clear of the polygon edge
  const letters = [...GRADES].map((g, k) => `<text x="-5" y="${(15 - (k + 1) / 5 * R).toFixed(1)}" text-anchor="end">${g}</text>`).join('');
  const dots = AXES.map((a, i) => { const [x, y] = pt(i, rOf(a[2])); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4"/>`; }).join('');
  const axes = AXES.map((a, i) => {
    const [x, y] = pt(i, LR);
    return `<button type="button" class="jj-stand__axis is-${SIDE[i]}" aria-controls="${id}-d" style="left:${(50 + x / 3).toFixed(2)}%;top:${(50 + y / 3).toFixed(2)}%"><span class="jj-stand__an">${a[0]}</span><span class="jj-stand__vh">, grade </span><span class="jj-stand__ag">${a[2]}</span></button>`;
  }).join('');
  const list = AXES.map((a) => `<div><dt>${a[1]}</dt><dd class="jj-stand__lg"><span class="jj-stand__vh">Grade </span>${a[2]}</dd><dd>${a[3]}</dd></div>`).join('');

  root.innerHTML = `
<div class="jj-stand">
  <article class="jj-stand__card" aria-labelledby="${id}-n">
    <header class="jj-stand__head">
      <h3 class="jj-stand__name" id="${id}-n"><span class="jj-stand__br" aria-hidden="true">「</span>No Surprises<span class="jj-stand__br" aria-hidden="true">」</span></h3>
      <p class="jj-stand__kana" lang="ja" aria-hidden="true">ノーサプライゼス</p>
      <p class="jj-stand__user">Stand user: <b>Ayaz Khan</b></p>
      <p class="jj-stand__ability"><b>Ability.</b> Measures how surprised a model should be, in bits. A calibrator that claims more than the data allows gets caught.</p>
    </header>
    <div class="jj-stand__chart">
      <svg viewBox="-150 -150 300 300" aria-hidden="true" focusable="false">
        <g class="jj-stand__grid">${rings}${spokes}</g>
        <g class="jj-stand__letters">${letters}</g>
        <polygon class="jj-stand__poly" points="${AXES.map((a, i) => xy(pt(i, rOf(a[2])))).join(' ')}"/>
        <g class="jj-stand__dots">${dots}</g>
      </svg>
      ${axes}
    </div>
    <div class="jj-stand__detail" id="${id}-d" aria-live="polite"><p class="jj-stand__prompt">Pick a parameter on the chart to see the evidence for its grade.</p></div>
    <dl class="jj-stand__list">${list}</dl>
    <p class="jj-stand__note">In JoJo's Bizarre Adventure, Stands are rated from A (highest) to E on these six parameters. Here, each grade points to real work.</p>
  </article>
  <div class="jj-stand__gogo" aria-hidden="true"><span>ゴ</span><span>ゴ</span><span>ゴ</span><span>ゴ</span></div>
</div>`;

  const $$ = (s) => [...root.querySelectorAll(s)];
  const box = root.querySelector('.jj-stand'), card = root.querySelector('.jj-stand__card');
  const chart = root.querySelector('.jj-stand__chart'), detail = root.querySelector('.jj-stand__detail');
  const buttons = $$('.jj-stand__axis'), spokeEls = $$('.jj-stand__grid line'), dotEls = $$('.jj-stand__dots circle'), rows = $$('.jj-stand__list > div');
  let cur = -1, drawn = false, inView = false, playing = false, ext = false;
  let stopped = doc.documentElement.classList.contains('time-stopped');

  const sfx = (detail) => doc.dispatchEvent(new CustomEvent('sfx', { detail }));
  box.classList.toggle('is-armed', !reduce.matches);

  function select(i) {
    if (i === cur) return;
    cur = i;
    const a = AXES[i];
    detail.innerHTML = `<p class="jj-stand__dg" aria-hidden="true">${a[2]}</p><p class="jj-stand__dn">${a[1]}<span class="jj-stand__vh">, grade ${a[2]}.</span></p><p class="jj-stand__de">${a[3]}</p>`;
    buttons.forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
    [spokeEls, dotEls, rows].forEach((els) => els.forEach((el, j) => el.classList.toggle('is-on', j === i)));
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
  buttons.forEach((b, i) => {
    const pick = () => select(i);
    on(b, 'pointerenter', pick); on(b, 'focus', pick); on(b, 'click', pick);
  });
  on(chart, 'keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key], j = buttons.indexOf(doc.activeElement);
    if (!step || j < 0) return;
    e.preventDefault();
    buttons[(j + step + AXES.length) % AXES.length].focus();
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
