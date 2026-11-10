/* The long version: its toys load as they come near. Nothing here runs until someone scrolls down. */
const d = document, $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
const here = p => new URL(p, import.meta.url).href, V = new URL(import.meta.url).search;   // V: the page's build stamp, so modules are never stale
const ease = t => 1 - (1 - t) ** 3;

export function init(sfx) {
  d.documentElement.classList.add('deep-on'); fold(); rerun(sfx); router(sfx); pfd(sfx); results(); copyButtons(); shift(); route(); tallyAndFly(sfx); video(); modules(sfx); where();
}

/* phones: the long version starts folded, and one tap opens each part */
function fold() {
  if (!matchMedia('(max-width: 699px)').matches) return;
  $$('#how details[open]').forEach(x => { x.open = false; });
  $$('.file.two .prose, .file.narrow .prose').forEach(p => {
    const rest = $$(':scope > p', p).slice(1); if (!rest.length) return;
    const det = d.createElement('details'); det.className = 'basics';
    det.innerHTML = '<summary>The full story</summary>';
    rest[0].before(det); det.append(...rest);
  });
}

/* the section bar marks the part of the long version on screen */
function where() {
  const links = $$('.deep > nav a:not(.top)'), top = $('.deep > nav .top');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => { if (a.getAttribute('href') !== '#' + e.target.id) return a.removeAttribute('aria-current'); a.setAttribute('aria-current', 'true'); a.parentElement.scrollLeft = a.offsetLeft - top.offsetWidth - 28; });
    if (e.isIntersecting && !e.target.id) links[0].parentElement.scrollLeft = 0;
  }), { rootMargin: '-70px 0px -75% 0px' });
  links.forEach(a => io.observe($(a.getAttribute('href'))));
  $$('.deep > .long, .deep > .play-row, .deep > .final').forEach(x => io.observe(x));   // no id, so nothing matches and the mark clears
}

/* three fixes: the number only moves when all three are in, because only the ends were measured */
function rerun(sfx) {
  const root = $('#rerun'); if (!root) return;
  const svg = $('#rrS'), N = $('#rrN'), note = $('#rrNote'), n = 32, test = 8;
  const scatter = [...'00100100100010010001000000010010'].map(Number);       // which positions the test rows sit in before sorting
  const order = []; let tr = 0, te = n - test;
  scatter.forEach(g => order.push(g ? te++ : tr++));                          // each drawn position holds this time rank
  const X = i => 10 + i * (340 / (n - 1));
  let shown = order.map((rank, i) => X(i));
  const on = { sort: false, user: false, prior: false };
  svg.innerHTML = '<path class="pipe" d=""/><text x="4" y="14">priors leak backward</text><g class="threads"></g><g class="dots"></g><line class="cut" x1="0" x2="0" y1="62" y2="128"/>';
  const dots = $('.dots', svg), threads = $('.threads', svg), pipe = $('.pipe', svg), label = $('text', svg), cut = $('.cut', svg);
  order.forEach(rank => { const c = d.createElementNS('http://www.w3.org/2000/svg', 'circle'); c.setAttribute('r', 5); c.setAttribute('fill', rank >= n - test ? '#ff5cb8' : '#f8f0e2'); c.setAttribute('opacity', rank >= n - test ? 1 : .55); dots.append(c); });
  const pairs = [[3, 29], [9, 26], [14, 31], [20, 25]];                       // the same user's rows, by time rank
  const target = () => order.map((rank, i) => X(on.sort ? rank : i));
  function draw() {
    [...dots.children].forEach((c, i) => { c.setAttribute('cx', shown[i]); c.setAttribute('cy', 95); });
    const at = rank => shown[order.indexOf(rank)];
    threads.innerHTML = on.user ? '' : pairs.map(([a, b]) => { const xa = at(a), xb = at(b), top = 95 - Math.min(38, Math.abs(xb - xa) * .28 + 10); return `<path class="thread" d="M${xa} 95Q${(xa + xb) / 2} ${top} ${xb} 95"/>`; }).join('');
    const xs = at(n - test), xe = X(2);
    pipe.setAttribute('d', `M${shown[order.indexOf(n - 1)]} 86C${(xs + xe) / 2 + 60} 18 ${(xs + xe) / 2 - 60} 18 ${xe} 86`);
    pipe.style.opacity = label.style.opacity = on.prior ? 0 : 1;
    const cx = X(n - test) - 340 / (n - 1) / 2;
    cut.setAttribute('x1', cx); cut.setAttribute('x2', cx); cut.style.opacity = on.sort ? 1 : 0;
  }
  let anim = 0;
  function move() {
    const from = shown.slice(), to = target(), t0 = performance.now(), mine = ++anim;
    const step = t => {
      if (mine !== anim) return;
      const p = Math.min(1, (t - t0) / 620), e = ease(p);
      shown = from.map((v, i) => v + (to[i] - v) * e); draw();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $$('[data-fix]', root).forEach(b => b.addEventListener('click', () => {
    sfx.wake();
    const k = b.dataset.fix; on[k] = !on[k]; b.setAttribute('aria-pressed', on[k]);
    root.querySelector(`[data-l="${k}"]`).classList.toggle('on', on[k]);
    sfx.hiss(.5, on[k] ? 2600 : 400, on[k] ? 500 : 2200, .08); sfx.buzz(10);
    move();
    const all = on.sort && on.user && on.prior, was = N.textContent;
    N.textContent = all ? '0.7401' : '0.806';
    N.parentElement.classList.toggle('done', all);
    if (all && was !== '0.7401') { sfx.thud(.35); N.animate([{ scale: 1.7, rotate: '-5deg' }, { scale: 1, rotate: '0deg' }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' }); }
    note.textContent = all ? 'Three white lights. Measured: 0.7401, with all three fixes on.' : (on.sort || on.user || on.prior) ? `Still leaking, with ${3 - on.sort - on.user - on.prior} to go. I only measured the two ends.` : 'Switch on all three. The dots are a sketch, and only the two ends were measured.';
  }));
  draw();
}

/* the router picks one of eight tools or refuses; nothing it says is arithmetic */
function router(sfx) {
  const root = $('#router'); if (!root) return;
  const slots = $('#slots'), out = $('#rtOut');
  slots.innerHTML = '<i></i>'.repeat(8);
  const Q = [
    [1, 'get_decision_trace', '{ "request_id": "r-1042" }', 'Every recorded step for that request, from the tables.'],
    [3, 'compare_cohorts', '{ "a": "this_week", "b": "last_week" }', 'The same roll-ups side by side, computed by SQL.'],
    [4, 'find_anomalies', '{ "kind": "band_change", "window": "7d" }', 'The rows that moved band, each with its evidence.'],
    [-1]
  ];
  $$('[data-q]', root).forEach(b => b.addEventListener('click', () => {
    sfx.wake(); sfx.hiss(.25, 1400, 3000, .05); sfx.buzz(8);
    $$('[data-q]', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    const [i, tool, args, says] = Q[+b.dataset.q];
    slots.classList.toggle('no', i < 0);
    [...slots.children].forEach((s, k) => s.classList.toggle('on', k === i));
    out.textContent = i < 0
      ? 'router  → refuse\n\nNo tool can answer that, so it says so.\nThe model does not guess a number.'
      : `router  → ${tool}\nargs    ${args}\nsql     read-only, deterministic\nanswer  ${says}\n\nnumbers from the model's weights: 0`;
  }));
}

function pfd(sfx) {
  const root = $('#pfd'); if (!root) return;
  $$('[data-p]', root).forEach(b => b.addEventListener('click', () => {
    sfx.wake(); sfx.hiss(.3, 900, 2400, .05);
    $$('[data-p]', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    root.classList.toggle('serve', b.dataset.p === 'serve');
  }));
}

function results() {
  const root = $('#res'); if (!root) return;
  root.classList.add('live');
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { root.classList.add('seen'); o.disconnect(); } }), { threshold: .3 }).observe(root);
}

function copyButtons() {
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    let s = b.nextElementSibling;
    if (!s || s.getAttribute('role') !== 'status') { s = d.createElement('span'); s.setAttribute('role', 'status'); b.after(s); }
    try { await navigator.clipboard.writeText(b.dataset.copy); s.textContent = 'Copied'; }
    catch { s.textContent = 'Copy failed: select the line'; }
  }));
}

function shift() { const max = 4.9; $$('.shift i').forEach(i => { i.style.setProperty('--a', Math.abs(parseFloat(i.style.getPropertyValue('--v'))) / max * 100); }); }

/* the route: a gold line that follows the reader down the years */
function route() {
  const r = $('#route'); if (!r) return;
  let queued = false;
  const update = () => { queued = false; const b = r.getBoundingClientRect(); r.style.setProperty('--p', Math.min(1, Math.max(0, (innerHeight * .7 - b.top) / b.height)).toFixed(3)); };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* the same fly-in as the gold cards, and the 33 channels struck one group at a time */
function tallyAndFly(sfx) {
  const still = d.documentElement.classList.contains('still');
  const fly = el => {
    const kf = []; const from = el.classList.contains('flip') ? -.5 : .5;
    for (let i = 0; i <= 12; i++) { const t = i / 12, e = Math.exp(-5.2 * t); kf.push({ transform: `perspective(1400px) translate(${from * 40 * e}vw,${-6 * e}vh) rotate(${8 * from * e * Math.cos(t * 9)}deg) rotateY(${-14 * from * e}deg)` }); }
    el.animate(kf, { duration: 1000, easing: 'linear' });
  };
  const seen = new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return;
    o.unobserve(e.target);
    if (!still) fly(e.target);
    if (e.target.id === 'f-channels' && !still) $$('path[stroke="var(--mag)"]', e.target).forEach((p, i) => { p.style.strokeDasharray = 60; p.animate([{ strokeDashoffset: 60 }, { strokeDashoffset: 0 }], { duration: 260, delay: 500 + i * 150, easing: 'ease-out', fill: 'backwards' }); });
  }), { threshold: .12 });
  $$('.file').forEach(f => seen.observe(f));
}

function video() {
  const v = $('.vid video'); if (!v) return;
  if (d.documentElement.classList.contains('still')) return;
  let inView = false, stopped = false;                       // a pause the visitor made is kept
  v.addEventListener('pause', () => { if (inView) stopped = true; });
  v.addEventListener('play', () => { stopped = false; });
  new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; if (!inView) v.pause(); else if (!stopped) v.play().catch(() => {}); }), { threshold: .4 }).observe(v);
}

/* ORA, the Spin and Ask me are the live site's own modules */
function modules(sfx) {
  d.addEventListener('sfx', e => {
    sfx.wake();
    const name = String(e.detail?.name || ''), g = e.detail?.gain ?? 1;
    if (name.startsWith('ora')) sfx.thud(.09 * g + (name.includes('final') ? .3 : 0));
    else sfx.hiss(.12, 1800, 3200, .03 * g);
  });
  const mount = slot => {
    const name = slot.dataset.jj, link = d.createElement('link');
    link.rel = 'stylesheet'; link.href = here(`jojo/${name}.css`) + V; d.head.append(link);
    const host = d.createElement('div'); host.className = 'jj-host';
    const wait = d.createElement('p'); wait.className = 'note'; wait.textContent = 'Loading…'; slot.append(wait);
    import(here(`jojo/${name}.js`) + V).then(m => { slot.replaceChildren(host); return m.mount(host, {}); }).catch(() => { wait.textContent = 'This part didn’t load. Reload the page to try again.'; });
  };
  const near = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.unobserve(e.target); mount(e.target); } }), { rootMargin: '500px 0px' });
  $$('[data-jj]').forEach(s => near.observe(s));
}
