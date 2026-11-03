// Ayaz's Bizarre Adventure, the 26-second episode (EPISODE.md, Part B). The page loads this on intent and calls
// initEpisode({ button, audio }); audio is the Sound controller from audio.js, or null.
// The soundtrack is the clock: one rAF loop reads audio.currentTime (performance.now() if the audio cannot start within
// 1.5 s), fires each cue it passes and drives the scroll. Visuals are Web Animations on transform and opacity, started at
// their cue and re-synced to the clock; cancelling them gives every page element its own styles back.
const DUR = 26, HERE = import.meta.url, RM = matchMedia('(prefers-reduced-motion: reduce)');
const OUT = 'cubic-bezier(.16,1,.3,1)', IN = 'cubic-bezier(.7,0,.84,0)', SNAP = 'cubic-bezier(.2,.7,.2,1)';
const NONE = { transform: 'none' }, FADE = [{ opacity: 0 }, { opacity: 1 }], GONE = [{ opacity: 1 }, { opacity: 0 }];
const DRAW = [{ transform: 'scaleX(0)' }, NONE];
const pop = (from, mid = 'scale(.95)') => [{ opacity: 0, transform: from }, { opacity: 1, transform: mid, offset: .55 }, { opacity: 1, transform: 'none' }];
// cue times from the table; episode.json refines them by milliseconds, and the table wins any real disagreement
const BEATS = { slam: 0, gallop: 2, chips: [6, 6.5, 7, 7.5], ceiling: 9, ora: Array.from({ length: 13 }, (_, i) => 10 + i / 8),
  refuse: 13, leak: 14, waste: 15, calx: 16, nsf: 18, yes: [20.5, 20.75, 21], no: [21.5, 21.75], tbc: 22, end: 25 };
// captions are final copy; " | " marks where one may split in two (one line on desktop, two on phones)
const CAPS = [[0, ''], [2, ''], [4, 'Ayaz Khan. Statistician and data scientist.'], [6, ''],
  [8, 'Telenav, 2026: | estimated the best accuracy any calibrator could reach on this data.'],
  [10, '95% CI [55.13, 58.08]. | Production ran 9 points below it; the release was cancelled.'],
  [12, 'A model scores 0.806 AUC. Ship it?'], [13, 'But I refuse.'],
  [14, 'Target leakage and random splits. | The honest AUC was 0.7401.'], [15, 'The audit surfaced $127K of campaign waste.'],
  [16, 'Calx: 31.55% mean reduction in operations, | exact on 45 of 45 cases. Provisional patent.'],
  [18, 'NSF Graduate Research Fellow: | 1 of 1,000 from 17,000 applicants.'],
  [19.5, 'Columbia M.A. Statistics, December 2026.'], [20, 'U.S. citizen?'], [21.25, 'Need sponsorship?'], [22, ''],
  [23.5, 'Next stage: January 2027.'], [24, 'Download the résumé, or email aak2259@columbia.edu.']];
// the live region also says what only the picture shows, so the episode reads as a text summary
const SAY = { 2: "Ayaz's Bizarre Adventure. Steel Ball Run to January 2027.", 20: 'U.S. citizen? Yes.', 21.25: 'Need sponsorship? No.' };
const ICON = { pause: 'M7 4v12M13 4v12', play: 'M6 4l10 6-10 6z', skip: 'M4 4l8 6-8 6zM15 4v12', stop: 'M5 5h10v10H5z',
  close: 'M5 5l10 10M15 5L5 15', replay: 'M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4 3v4h4' };
const FIG = /56\.69\s*%?/;

let inst = null;
export function initEpisode(o) { return inst || (inst = create(o || {})); }

function create({ button, audio = null }) {
  if (!button) return { play() {}, stop() {}, destroy() {} };
  const d = document, root = d.documentElement, holds = new Set(), reg = [], undo = [];
  let state = 'idle', rm, au, mapP, B = BEATS, cues, ci, t = 0, t0, mode, lastA, aT, aMs, raf = 0, seg, gen = 0, capI, parts, shown,
    marks, horse, soundWas, layer, bar, cap, live, ctl, prog;
  const anchor = n => d.querySelector(`[data-ep="${n}"]`), freeH = () => innerHeight - bar.offsetHeight;
  const clamp = (v, a, b) => Math.max(a, Math.min(v, b)), emit = (n, detail) => d.dispatchEvent(new CustomEvent(n, { detail }));
  const L = [[window, 'keydown', onKey, true], [window, 'wheel', interrupt, { passive: true }],
    [window, 'touchmove', interrupt, { passive: true }], [window, 'pointerdown', onDown, true], [d, 'focusin', onFocus],
    [d, 'timestop', () => hold('time')], [d, 'timeresume', () => release('time')],
    [d, 'visibilitychange', () => (d.hidden ? hold('hidden') : release('hidden'))], [window, 'pagehide', () => stop('interrupt')]];
  const WARM = ['pointerenter', 'focus', 'touchstart'];
  WARM.forEach(e => button.addEventListener(e, warm, { passive: true }));
  button.addEventListener('click', play);
  if (button.matches(':hover, :focus')) warm();

  function warm() {
    if (!au) {
      au = new Audio(); au.preload = 'auto'; au.src = new URL('../audio/episode.mp3', HERE).href;
      au.addEventListener('error', () => state === 'play' && mode === 'audio' && toClock());
    }
    mapP = mapP || fetch(new URL('../audio/episode.json', HERE)).then(r => r.json()).then(m => { B = pick(BEATS, m.cues); }, () => {});
  }

  function play() {
    if (state === 'wait' || state === 'play') return;
    if (state === 'ended') stop();
    warm(); build();
    const g = ++gen;
    au.volume = 1;
    try { au.currentTime = 0; } catch (e) { /* not seekable yet; it starts at 0 */ }
    const p = au.play();  // inside the click: the click is the gesture
    state = 'wait'; rm = RM.matches; t = 0; mode = null; capI = -1; shown = null; holds.clear();
    root.classList.add('jj-ep-on');
    bar.hidden = false; controls(false);
    if (!rm) bar.animate([{ transform: 'translateY(100%)' }, NONE], { duration: 260, easing: OUT });
    bind();
    bar.focus({ preventScroll: true });
    soundWas = !!(audio && audio.enabled && audio.enabled());
    if (soundWas) audio.setEnabled(false);
    emit('episodestart');
    const begin = m => {
      if (mode || g !== gen) return;
      mode = m; clearTimeout(timer);
      if (m === 'clock') au.pause();
      mapP.then(() => {
        if (g !== gen) return;
        cues = timeline(); ci = 0; state = 'play';
        if (m === 'audio') { lastA = aT = au.currentTime; aMs = performance.now(); } else t0 = performance.now();
        if (holds.size) halt(); else raf = requestAnimationFrame(tick);
      });
    };
    const timer = setTimeout(() => begin('clock'), 1500);  // no sound within 1.5 s: the same timeline, silently
    Promise.resolve(p).then(() => begin('audio'), () => begin('clock'));
  }

  function tick(ms) {
    raf = 0;
    if (state !== 'play' || holds.size) return;
    raf = requestAnimationFrame(tick);
    if (mode === 'audio') {  // between currentTime updates, extrapolate up to 100 ms
      const a = au.currentTime;
      if (a !== lastA) { lastA = aT = a; aMs = ms; } else if (ms - aMs > 1500 && !au.ended) toClock();
    }
    step(Math.max(t, mode !== 'audio' ? (ms - t0) / 1000 : au.ended ? DUR : aT + clamp(ms - aMs, 0, 100) / 1000));
  }
  function toClock() { mode = 'clock'; t0 = performance.now() - t * 1000; au.pause(); }

  function step(n) {
    t = Math.min(n, DUR);
    while (ci < cues.length && cues[ci][0] <= t) { const c = cues[ci++]; c[1](c[0]); }
    if (seg) {
      const p = Math.min(1, (t - seg.at) / seg.dur);
      scrollTo(0, seg.from + (aim(seg.els) - seg.from) * (p < .5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2));
      if (p >= 1) seg = null;
    }
    if (horse && t >= horse.at && horse.use.isConnected) {  // the plate's gallop: one stride per beat
      const f = Math.floor((t - horse.at) * 22) % 11 + 1;
      if (f !== horse.f) horse.use.setAttribute('href', '#h' + (horse.f = f));
    }
    for (const x of reg) {
      if (x.n && t >= x.end) { x.n.remove(); x.n = null; }
      const a = x.a;
      if (!a) continue;
      if (!a.effect.target.isConnected) { a.cancel(); x.a = null; } else if (a.playState === 'running') {
        const w = (t - x.at) * 1000;
        if (Math.abs(a.currentTime - w) > 50) a.currentTime = w;
      }
    }
    caption();
    prog.style.transform = `scaleX(${(t / DUR).toFixed(4)})`;
    if (t >= DUR) { state = 'ended'; emit('episodeend', { reason: 'done' }); restoreSound(); }
  }

  function hold(r) {  // pause reasons: user, time (timestop), hidden
    if (state !== 'wait' && state !== 'play') return;
    if (!holds.size && state === 'play') halt();
    holds.add(r); paint();
  }
  function release(...rs) {
    const was = holds.size;
    rs.forEach(r => holds.delete(r));
    if (was && !holds.size && state === 'play') go();
    paint();
  }
  function halt() {
    if (mode === 'audio') au.pause();
    for (const x of reg) if (x.a && x.a.playState === 'running') { x.a.pause(); x.p = 1; }
  }
  function go() {
    if (mode === 'audio') { lastA = aT = au.currentTime; aMs = performance.now(); au.play().catch(e => e.name !== 'AbortError' && toClock()); }
    else t0 = performance.now() - t * 1000;
    for (const x of reg) if (x.p) { x.p = 0; if (x.a) x.a.play(); }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  const toggle = () => (holds.size ? release('user', 'time') : hold('user'));

  function seek(to) {
    if (state !== 'play' || t >= to) return;
    if (to === B.tbc) clear();
    ci = cues.findIndex(c => c[0] >= to); t = to;
    if (mode === 'audio') { au.currentTime = to; lastA = aT = to; aMs = performance.now(); } else t0 = performance.now() - to * 1000;
  }

  // the end: done (played out), stop (Stop, Esc, the API) or interrupt (the visitor took the page back)
  function stop(reason) {
    if (state === 'idle') return;
    if (state !== 'ended') { emit('episodeend', { reason }); restoreSound(); fade(); }
    const f = d.activeElement, back = !f || f === d.body || bar.contains(f);
    unbind(); teardown();
    if (back) button.focus({ preventScroll: true });
  }
  function clear() {
    for (const x of reg) { if (x.a) x.a.cancel(); if (x.n) x.n.remove(); }
    reg.length = 0; seg = marks = horse = shown = null; cap.textContent = '';
  }
  function teardown() {
    gen++; state = 'idle'; cancelAnimationFrame(raf); raf = 0; holds.clear(); clear();
    while (undo.length) undo.pop()();
    root.classList.remove('jj-ep-on');
    bar.hidden = true; live.textContent = '';
  }
  function fade() {  // the sound fades out (iOS ignores volume: it stops)
    const a = au, g = gen + 1, v = a.volume, s = performance.now();
    (function f(n) {
      if (gen !== g || a.paused) return;
      const p = (n - s) / 350;
      if (p >= 1) { a.pause(); a.volume = v; } else { a.volume = v * (1 - p); requestAnimationFrame(f); }
    })(s);
  }
  function restoreSound() { if (soundWas) audio.setEnabled(true); soundWas = false; }

  // input: the controls work; anything else hands the page back
  function bind() { L.forEach(([o, e, f, c]) => o.addEventListener(e, f, c)); }
  function unbind() { L.forEach(([o, e, f, c]) => o.removeEventListener(e, f, c)); }
  function interrupt() { stop('interrupt'); }
  function onKey(e) {
    const k = e.key, x = e.target, mine = bar.contains(x);
    if (k === 'Escape') { e.preventDefault(); return stop('stop'); }
    if (/^(Shift|Control|Alt|Meta|CapsLock|Tab)$/.test(k) || ((k === ' ' || k === 'Enter') && mine && x.closest('button, a'))) return;
    if (k === ' ' && state !== 'ended' && !(x.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(x.tagName))) { e.preventDefault(); return toggle(); }
    if (k !== 'Enter' || !mine) interrupt();
  }
  function onDown(e) { if (!bar.contains(e.target) && !button.contains(e.target)) interrupt(); }
  function onFocus(e) { const x = e.target; if (x instanceof Element && !bar.contains(x) && !button.contains(x)) interrupt(); }

  // the bar: caption, live region, controls, progress
  function build() {
    if (bar) return;
    layer = d.createElement('div'); layer.className = 'jj-ep'; layer.setAttribute('aria-hidden', 'true');
    bar = d.createElement('div'); bar.className = 'jj-ep-bar'; bar.tabIndex = -1; bar.hidden = true;
    bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Episode');
    bar.innerHTML = '<i class="jj-ep-prog"></i><div class="jj-ep-in"><p class="jj-ep-cap" aria-hidden="true"></p><p class="jj-ep-live" aria-live="polite"></p><div class="jj-ep-ctl"></div></div>';
    [prog, cap, live, ctl] = ['prog', 'cap', 'live', 'ctl'].map(s => bar.querySelector('.jj-ep-' + s));
    ctl.addEventListener('click', e => {
      const k = (e.target.closest('[data-k]') || {}).dataset?.k;
      if (k === 'pause') toggle();
      else if (k === 'skip') { release('user', 'time'); seek(t < B.tbc ? B.tbc : B.end); }
      else if (k === 'stop' || k === 'close') stop('stop');
      else if (k === 'replay') { stop('stop'); play(); }
    });
    d.body.append(layer, bar);
  }
  const svg = k => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
  const ib = (k, name, key) => `<button type="button" class="jj-ep-b" data-k="${k}" aria-label="${name}"${key ? ` aria-keyshortcuts="${key}"` : ''} title="${name}${key ? ` (${key === 'Escape' ? 'Esc' : key})` : ''}">${svg(k)}</button>`;
  function controls(end) {
    const had = ctl.contains(d.activeElement), r = anchor('resume');
    ctl.innerHTML = end
      ? `<button type="button" class="jj-ep-b jj-ep-t" data-k="replay">${svg('replay')}Replay</button><a class="jj-ep-b jj-ep-t jj-ep-dl" href="${(r && r.getAttribute('href')) || 'Ayaz_Khan_Resume.pdf'}" download>Download résumé (PDF)</a>${ib('close', 'Close the episode', 'Escape')}`
      : ib('pause', 'Pause', 'Space') + ib('skip', 'Skip to end') + ib('stop', 'Stop', 'Escape');
    if (had) ctl.firstElementChild.focus();
  }
  function paint() {
    const b = ctl.querySelector('[data-k="pause"]'), name = holds.size ? 'Resume' : 'Pause';
    if (b) { b.setAttribute('aria-label', name); b.title = name + ' (Space)'; b.innerHTML = svg(holds.size ? 'play' : 'pause'); }
  }
  function caption() {
    let i = CAPS.length - 1;
    while (CAPS[i][0] > t) i--;
    const [at, text] = CAPS[i], next = (CAPS[i + 1] || [DUR])[0];
    if (i !== capI) {
      capI = i;
      const full = text.replace(' | ', ' '), say = SAY[at] || (at === 6 ? [...d.querySelectorAll('[data-ep-chip]')].map(c => c.textContent.trim()).join('. ') : full);
      if (say) live.textContent = say;
      parts = text.includes(' | ') && lines(full) > (innerWidth >= 900 ? 1 : 2) ? text.split(' | ') : [full];
    }
    const [a, b] = parts;
    show(b && t >= at + (next - at) * a.length / (a.length + b.length) ? b : a);
  }
  function lines(s) {
    const p = cap.appendChild(d.createElement('span')), cs = getComputedStyle(cap);
    p.textContent = s; p.style.visibility = 'hidden';
    const n = Math.round(p.offsetHeight / (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3));
    p.remove(); return n;
  }
  function show(s) {
    if (s === shown) return;
    shown = s;
    const old = cap.lastElementChild;
    if (old) { an(old, GONE, { duration: 120, easing: 'linear' }, t); reg.push({ n: old, end: t + .13 }); }
    if (!s) return;
    const n = cap.appendChild(d.createElement('span'));
    n.textContent = s;
    an(n, [{ opacity: 0, transform: rm ? 'none' : 'translateY(.4em)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: old ? 60 : 0 }, t);
  }

  // overlay nodes and animations share one registry that the clock sweeps
  function add(cls, at, end, html = '') {
    const n = layer.appendChild(d.createElement('div'));
    n.className = cls; n.innerHTML = html; reg.push({ n, at, end });
    return n;
  }
  function an(e, kf, o, at) {
    if (!e) return;
    const a = e.animate(kf, Object.assign({ duration: 300, easing: OUT, fill: 'both' }, o)), x = { a, at };
    a.currentTime = Math.max(0, (t - at) * 1000);  // a late cue starts part-way, in step with the clock
    if (holds.size && state === 'play') { a.pause(); x.p = 1; }
    reg.push(x);
  }
  const mo = (e, kf, o, at) => an(e, rm ? FADE : kf, o, at);
  const pos = (n, r, p = 0) => { n.style.cssText = `left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px`; };
  const inView = e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= freeH(); };
  function aim(els) {
    const H = freeH(), rs = els.map(e => e.getBoundingClientRect());
    let top = Math.min(...rs.map(r => r.top)), bot = Math.max(...rs.map(r => r.bottom));
    if (bot - top > H * .9) { top = rs[0].top; bot = rs[0].bottom; }  // too tall together: the first one leads
    return clamp(scrollY + (bot - top < H * .9 ? (top + bot) / 2 - H * .46 : top - H * .08), 0, root.scrollHeight - innerHeight);
  }
  function glide(els, at, dur) {
    els = els.filter(Boolean);
    if (!els.length) return;  // no anchor: no scroll; the caption still shows
    if (!rm) return (seg = { from: scrollY, els, at, dur });
    an(add('jj-ep-veil', at, at + .4), [{ opacity: 0 }, { opacity: 1, offset: .4 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 380, easing: 'linear' }, at);
    let i = ci;  // reduced motion: a short fade over a cut, same timing
    while (i < cues.length && cues[i][0] <= at + .17) i++;
    cues.splice(i, 0, [at + .17, () => scrollTo(0, aim(els))]);
  }
  function spot(name, re) {
    const a = anchor(name), ns = [];
    if (!a) return null;
    const w = d.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    let s = '';
    for (let n; (n = w.nextNode());) { ns.push([n, s.length]); s += n.data; }
    const m = re.exec(s);  // across text nodes, as in "1<small> of </small>1,000"
    if (!m) return { r: a.getBoundingClientRect(), el: a, none: 1 };
    const at = i => { let k = ns.length - 1; while (k && ns[k][1] > i) k--; return [ns[k][0], i - ns[k][1]]; };
    const g = d.createRange();
    g.setStart(...at(m.index)); g.setEnd(...at(m.index + m[0].length));
    let e = g.startContainer.parentElement;
    while (e !== a && getComputedStyle(e).display === 'inline') e = e.parentElement;
    return { r: g.getBoundingClientRect(), el: e, text: m[0] };
  }
  function bgOf(e) {
    for (; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (!/^(transparent|rgba\(.*,\s*0\))$/.test(c)) return c; }
    return 'var(--color-bg)';
  }
  function mail() {
    const box = (anchor('resume') || d.body).closest('section, aside, footer');
    return (box && box.querySelector('a[href^="mailto:"]')) || [...d.querySelectorAll('a[href^="mailto:"]')].pop();
  }

  function timeline() {
    return [[B.slam, coldOpen], [.2, () => scrollTo(0, aim([anchor('hero') || d.body]))], [.5, sheen], [3.5, wipeOut],
      [8, at => glide([anchor('ceiling')], at, .5)], [8.5, at => mark(spot('ceiling', FIG), at)],
      [B.ceiling, at => pulse(spot('ceiling', FIG), at, 1.14)], [B.ora[0], ci95], ...B.ora.map((h, i) => [h, at => ora(i, at)]),
      [12, at => glide([anchor('leak')], at, .4)], [12.4, cover], [B.refuse, refuse],
      [B.leak, at => an(layer.querySelector('.jj-ep-fig i'), DRAW, { duration: rm ? 1 : 240 }, at)], [B.leak + .2, land],
      [B.waste, at => mark(spot('leak', /\$\s?127\s?K/), at)],
      [B.calx, at => glide([anchor('calx')], at, .4)], [B.calx + .4, at => hl(spot('calx', /31\.55\s*%?/), at)],
      [B.nsf, at => glide([anchor('nsf')], at, .4)], [B.nsf + .4, at => hl(spot('nsf', /1\s+of\s+1,000/), at)],
      [20, at => (marks || []).forEach(c => an(c, GONE, { duration: 200 }, at))],
      ...B.yes.map((h, i) => [h, at => yn('yes', i, at)]), ...B.no.map((h, i) => [h, at => yn('no', i, at)]),
      [B.tbc, finale], [B.tbc + .2, freeze],
      [23.75, at => { const e = [anchor('resume'), mail()].filter(Boolean); if (!e.every(inView)) glide(e, at, .25); }],
      [24, reach], [B.end, () => controls(true)]].sort((a, b) => a[0] - b[0]);
  }

  // 0.0 cold open: the page dims, focus lines burst, the title card slams in; at 2.0 the plate's horse and the subtitle
  function coldOpen(at) {
    an(add('jj-ep-dim', at, 4.2), [{ opacity: 0 }, { opacity: .96 }], { duration: 180, easing: 'linear' }, at);
    if (!rm) an(add('jj-ep-rays', at, 3.9, rays()), [{ opacity: 0, transform: 'scale(1.35)' }, { opacity: .5, transform: 'none', offset: .35 }, { opacity: .2, transform: 'none' }], { duration: 600 }, at);
    const card = add('jj-ep-card', at, 4.2, `<div class="jj-ep-track">${d.getElementById('h1') ? '<svg class="jj-ep-horse" viewBox="100 40 1100 780"><use href="#h3"/></svg>' : ''}<i class="jj-ep-rule"></i></div><p class="jj-ep-sub">Steel Ball Run to January 2027</p>`);
    const [row, sub] = card.children, h = row.querySelector('svg'), src = d.querySelector('.lockup'), g = (B.gallop - at) * 1000;
    const lk = src ? src.cloneNode(true) : Object.assign(d.createElement('p'), { className: 'jj-ep-title', textContent: "Ayaz's Bizarre Adventure" });
    lk.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));  // the clone draws with the page card's own defs
    lk.removeAttribute('role'); card.prepend(lk);
    mo(card, pop('scale(1.6) rotate(-4deg)', 'scale(.96)'), { duration: 460, easing: SNAP }, at);
    an(row.lastChild, DRAW, { duration: 500, delay: g }, at);
    mo(sub, [{ opacity: 0, transform: 'translateY(.5em)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: g + 120 }, at);
    if (h) {
      an(h, FADE, { duration: 200, delay: g }, at);
      if (!rm) { horse = { use: h.firstChild, at: B.gallop }; an(h, [NONE, { transform: `translateX(${row.clientWidth - h.clientWidth}px)` }], { duration: 1800, delay: g, easing: 'linear' }, at); }
    }
    const c0 = anchor('ceiling');
    mo(c0 && c0.querySelector('.sfx'), pop('scale(1.9) rotate(-10deg)', 'scale(.97)'), { duration: 280, delay: (B.ceiling - at) * 1000, fill: 'backwards', easing: SNAP }, at);
    d.querySelectorAll('[data-ep-chip]').forEach((c, i) => mo(c, pop('scale(.6)', 'scale(1.06) rotate(-2deg)'),
      { duration: 300, delay: ((B.chips[i] ?? B.chips[3] + (i - 3) / 4) - at) * 1000, fill: 'backwards' }, at));
  }
  function sheen(at) { if (!rm) an(layer.querySelector('.jj-ep-card .lk-sheen'), [{ transform: 'skewX(-18deg)' }, { transform: 'translateX(1000px) skewX(-18deg)' }], { duration: 900 }, at); }
  function wipeOut(at) {
    const [dim, r, card] = ['dim', 'rays', 'card'].map(k => layer.querySelector('.jj-ep-' + k));
    an(card, rm ? GONE : [NONE, { transform: 'translateX(55vw) skewX(-10deg)', opacity: 0 }], { duration: 380, easing: IN }, at);
    if (rm) return an(dim, [{ opacity: .96 }, { opacity: 0 }], { duration: 420, easing: 'linear' }, at);
    an(r, [{ opacity: .2 }, { opacity: 0 }], { duration: 160, easing: 'linear' }, at);
    an(dim, [{ transform: 'skewX(-12deg)' }, { transform: 'translateX(105%) skewX(-12deg)' }], { duration: 480, delay: 40, easing: IN }, at);
  }
  function mark(s, at) {
    if (!s) return;
    const { left: l, top: tp, right: rt, bottom: bt } = s.r, pts = [[l - 9, tp - 9], [rt - 9, tp - 9], [l - 9, bt - 9], [rt - 9, bt - 9]];
    const fresh = !marks || !marks[0].isConnected;
    if (fresh) marks = pts.map((q, i) => add('jj-ep-c jj-ep-c' + i, at, B.tbc));
    marks.forEach((c, i) => {
      const [x, y] = pts[i], ox = parseFloat(c.style.left) || x, oy = parseFloat(c.style.top) || y;
      c.style.left = x + 'px'; c.style.top = y + 'px';
      if (fresh) mo(c, [{ opacity: 0, transform: `translate(${i % 2 ? 22 : -22}px,${i > 1 ? 22 : -22}px)` }, { opacity: 1, transform: 'none' }], { duration: 280 }, at);
      else if (!rm) an(c, [{ transform: `translate(${ox - x}px,${oy - y}px)` }, NONE], { duration: 280 }, at);
    });
  }
  function pulse(s, at, k = 1.12) {
    if (!s || rm) return;
    const er = s.el.getBoundingClientRect(), transformOrigin = `${s.r.left + s.r.width / 2 - er.left}px ${s.r.top + s.r.height / 2 - er.top}px`;
    an(s.el, [{ transform: 'none', transformOrigin }, { transform: `scale(${k})`, transformOrigin, offset: .3 }, { transform: 'scale(.985)', transformOrigin, offset: .65 }, { transform: 'none', transformOrigin }], { duration: 480, fill: 'none' }, at);
  }
  function hl(s, at) { mark(s, at); pulse(s, at); }
  function ora(i, at) {
    const a = anchor('ceiling'), n = B.ora.length, last = i === n - 1, q = i * 2.4 + .6;
    if (!a || (rm && i % 4 && !last)) return;
    const r = a.getBoundingClientRect(), fs = 1.2 + i / n + (last ? .9 : 0);
    const k = add('jj-ep-k jj-ep-ora', at, rm ? 11.95 : at + .5, last ? 'オラ！' : 'オラ');
    k.style.cssText = `left:${clamp(r.left + (last ? .9 : .5 + Math.cos(q) * .62) * r.width, 6, innerWidth - fs * 40)}px;top:${clamp(r.top + (last ? .45 : .5 + Math.sin(q) * .66) * r.height, 6, freeH() - fs * 22)}px;font-size:${fs}rem;rotate:${(i % 2 ? 1 : -1) * (5 + i % 3 * 4)}deg`;
    mo(k, [{ opacity: 0, transform: 'scale(1.9)', easing: OUT }, { opacity: 1, transform: 'none', offset: .22 }, { opacity: 1, offset: .62 }, { opacity: 0, transform: 'scale(.92)' }], { duration: rm ? 300 : 500, easing: 'linear' }, at);
  }
  function ci95(at) {
    const s = spot('ceiling', FIG);
    if (!s || s.none) return;
    const r = s.r, w = Math.max(r.width, 200), ms = (B.ora[B.ora.length - 1] - at) * 1000, sp = anchor('ceiling').querySelector('.spark'), q = sp && sp.getBoundingClientRect();
    const box = add('jj-ep-ci', at, 12, '<i></i><i class="jj-ep-dot"></i><b>55.13</b><b>58.08</b>');
    box.style.cssText = `left:${clamp(q ? q.left : r.left + r.width / 2 - w * .529, 4, innerWidth - w - 4)}px;top:${q ? q.top + q.height / 2 - 9 : r.bottom + 4}px;width:${w}px;background:${bgOf(s.el)}`;
    an(box, FADE, { duration: 140 }, at);
    an(box.firstChild, DRAW, { duration: ms, easing: rm ? 'linear' : IN }, at);
    box.querySelectorAll('b').forEach(b => an(b, FADE, { duration: 200, delay: ms }, at));
  }
  function cover(at) {
    const s = spot('leak', /0\.7401/), o = spot('leak', /0\.806/);
    if (!s || s.none || o.none) return mark(o, at);
    const cs = getComputedStyle(s.el), n = add('jj-ep-fig', at, B.leak + .5, `<span>${o.text}<i></i></span>`), f = n.firstChild;
    pos(n, s.el.getBoundingClientRect());
    n.style.background = bgOf(s.el); n.style.color = cs.color;
    f.style.font = `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`; f.style.letterSpacing = cs.letterSpacing;
    an(n, FADE, { duration: 160 }, at);
    mark({ r: f.getBoundingClientRect() }, at);
  }
  function refuse(at) {
    const r = (anchor('leak') || layer).getBoundingClientRect(), s = add('jj-ep-stamp', at, at + .95, '<b class="jj-ep-k">だが断る</b><span>But I refuse.</span>');
    s.style.cssText = `left:${r.left + r.width / 2}px;top:${clamp(r.top + r.height / 2, 80, freeH() - 80)}px`;
    mo(s, pop('scale(2.2)', 'scale(.94)'), { duration: 300, easing: SNAP }, at);
    an(s, GONE, { duration: 180, delay: 760, fill: 'forwards' }, at);
  }
  function land(at) {
    an(layer.querySelector('.jj-ep-fig'), rm ? GONE : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-40%)' }], { duration: 260, easing: IN }, at);
    const s = spot('leak', /0\.7401/);
    if (s && !s.none) hl(s, at);
  }
  function yn(kind, i, at) {  // 20.5 YES! YES! YES!  21.5 NO! NO!  one panel each; words pile up, nothing strobes
    let p = layer.querySelector('.jj-ep-yn--' + kind);
    if (!p) {
      p = add('jj-ep-yn jj-ep-yn--' + kind, at, B.tbc + .25);
      p.style.top = freeH() / 2 + 'px';
      an(p, FADE, { duration: rm ? 220 : 90, easing: 'linear' }, at);
    }
    const w = p.appendChild(d.createElement('span'));
    w.textContent = kind === 'yes' ? 'YES!' : 'NO!'; w.style.setProperty('--i', i);
    mo(w, pop('scale(1.7)'), { duration: 340 }, at);
  }
  function finale(at) {
    an(add(rm ? 'jj-ep-veil' : 'jj-ep-wipe', at, at + .5), rm ? [{ opacity: 0 }, { opacity: 1, offset: .35 }, { opacity: 1, offset: .55 }, { opacity: 0 }]
      : [{ transform: 'translateX(-102%) skewX(-12deg)', easing: OUT }, { transform: 'skewX(-12deg)', offset: .42 }, { transform: 'skewX(-12deg)', offset: .5, easing: IN }, { transform: 'translateX(102%) skewX(-12deg)' }],
    { duration: 480, easing: 'linear' }, at);
  }
  function freeze(at) {  // 22.2 under cover: cut to the end, freeze in sepia; the arrow lands at 22.6
    const end = anchor('end'), els = [end, anchor('resume'), mail()].filter(Boolean);
    scrollTo(0, aim(els.length ? els : [d.body]));  // a cut, so nothing on the way mounts
    if (!root.classList.contains('tbc-freeze')) {
      root.classList.add('tbc-freeze');
      undo.push(() => {  // keep the freeze only where the page itself would hold it
        const f = d.querySelector('.foot, body > footer'), r = f && f.getBoundingClientRect();
        if (!r || (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height < .5) root.classList.remove('tbc-freeze');
      });
    }
    if (!end) return;
    if (!end.classList.contains('on')) { end.classList.add('on'); undo.push(() => { const r = end.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) end.classList.remove('on'); }); }
    if (!rm) [['.arrow', [{ transform: 'translateX(115%)' }, NONE], 70, 330], ['.lockup', pop('translateY(-.4rem) scale(1.12) rotate(-2deg)', 'scale(.99)'), 100, 380]].forEach(([sel, kf, delay, duration]) => {
      const e = end.querySelector(sel);
      if (!e) return;
      const v = e.style.transition;
      e.style.transition = 'none';  // the page's own transition would win over the animation
      undo.push(() => { e.style.transition = v; });
      an(e, kf, { duration, delay }, at);
    });
  }
  function reach(at) {
    [anchor('resume'), mail()].filter(Boolean).forEach((e, i) => {
      const g = add('jj-ep-ring', at, at + 1.2);
      pos(g, e.getBoundingClientRect(), 6);
      an(g, rm ? [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.2)' }], { duration: rm ? 1000 : 700, delay: i * 140 }, at);
    });
  }

  return {
    play,
    stop() { stop('stop'); },
    destroy() {
      stop('stop');
      WARM.forEach(e => button.removeEventListener(e, warm));
      button.removeEventListener('click', play);
      if (bar) { bar.remove(); layer.remove(); }
      if (au) { au.removeAttribute('src'); au.load(); }
      inst = null;
    },
  };
}

function pick(w, g) {
  if (Array.isArray(w)) return w.map((v, i) => pick(v, g && g[i]));
  if (w && typeof w === 'object') return Object.fromEntries(Object.keys(w).map(k => [k, pick(w[k], g && g[k])]));
  return typeof g === 'number' && Math.abs(g - w) < .12 ? g : w;
}
function rays() {
  let p = '', s = 9;
  const r = () => (s = s * 16807 % 2147483647) / 2147483647, f = v => v.toFixed(1);
  for (let i = 0; i < 64; i++) {
    const a = (i + r() * .7) / 64 * 2 * Math.PI, w = .005 + r() * .012, r0 = 31 + r() * 13;
    p += `M${f(Math.cos(a) * r0)} ${f(Math.sin(a) * r0)}L${f(Math.cos(a - w) * 75)} ${f(Math.sin(a - w) * 75)}L${f(Math.cos(a + w) * 75)} ${f(Math.sin(a + w) * 75)}Z`;
  }
  return `<svg viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid slice"><path d="${p}"/></svg>`;
}
