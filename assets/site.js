/* The golden wind: one clock drives the shutters, the curtains, the gold threads, the foil and the episode. */
(() => {
  const d = document, root = d.documentElement, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const STILL = root.classList.contains('still'), CAPTURE = window.__t != null;
  const now = () => window.__t ?? performance.now();
  const R = (a = 1, b = 0) => b + (a - b) * Math.random(), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const SPRING = 'cubic-bezier(.16,1,.3,1)';

  /* tweens run on the shared clock so the episode can be rendered frame by frame */
  const fx = [];
  const tween = (ms, fn, done) => fx.push({ t0: now(), ms, fn, done });
  const later = (ms, done) => tween(ms, () => {}, done);

  /* figures: drawn to scale from the numbers beside them */
  const svg = (h, body) => `<svg viewBox="0 0 320 ${h}" aria-hidden="true">${body}</svg>`;
  const FIG = {
    leak() {
      const top = [...'0010010001000100100010001001'], k = top.filter(g => g === '1').length, n = top.length;
      const dot = (i, y, hot) => `<circle cx="${8 + i * 11.2}" cy="${y}" r="3.7" fill="${hot ? 'var(--mag)' : 'currentColor'}" opacity="${hot ? 1 : .32}"/>`;
      const x = 8 + (n - k) * 11.2 - 5.6;
      return svg(58, top.map((g, i) => dot(i, 8, g === '1')).join('') + top.map((_, i) => dot(i, 44, i >= n - k)).join('') + `<path d="M${x} 30V58" stroke="currentColor" stroke-width="2"/>`);
    },
    ceil() {
      const X = v => 4 + v * 3.12;
      return svg(44, `<path d="M4 22H316M4 14V30M316 14V30" stroke="currentColor" stroke-width="1.5"/><rect x="${X(55.13)}" y="4" width="${X(58.08) - X(55.13)}" height="36" fill="var(--mag)"/><path d="M${X(47.69)} 10V34" stroke="currentColor" stroke-width="3" stroke-dasharray="4 3"/>`);
    },
    route() {
      let s = '<circle cx="14" cy="34" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M26 34H96" stroke="currentColor" stroke-width="1.5"/>';
      for (let i = 0; i < 8; i++) s += `<rect x="${100 + i * 15}" y="20" width="11" height="28" fill="${i === 5 ? 'var(--mag)' : 'currentColor'}" opacity="${i === 5 ? 1 : .28}"/>`;
      return svg(68, s + '<path d="M225 34H262" stroke="currentColor" stroke-width="1.5"/><path d="M266 16v36c0 11 44 11 44 0V16c0-11-44-11-44 0c0 11 44 11 44 0" fill="none" stroke="currentColor" stroke-width="2"/>');
    },
    tally() {
      let s = '', x = 3;
      for (let g = 0; g < 7; g++) {
        const c = g < 6 ? 4 : 3;
        for (let i = 0; i < c; i++) s += `<path d="M${x + i * 8} 8l-1 34" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`;
        if (g < 6) s += `<path d="M${x - 5} 36L${x + 29} 12" stroke="var(--mag)" stroke-width="2.8" stroke-linecap="round"/>`;
        x += 46;
      }
      return svg(48, s);
    },
    slope() {
      const Y = v => 46 - (v - .6206) / (.6457 - .6206) * 34;
      return svg(54, `<path d="M16 ${Y(.6206)}L304 ${Y(.6457)}" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="${Y(.6206)}" r="5.5" fill="currentColor"/><circle cx="304" cy="${Y(.6457)}" r="7" fill="var(--mag)"/>`);
    },
    bars() {
      return svg(38, `<rect y="2" width="${.949 * 320}" height="15" fill="var(--mag)"/><rect y="21" width="${.606 * 320}" height="15" fill="currentColor" opacity=".4"/>`);
    }
  };
  $$('[data-fig]').forEach(f => f.insertAdjacentHTML('afterbegin', FIG[f.dataset.fig]()));

  /* copy */
  const copy = $('#copy'), copied = $('#copied');
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('pip install structuremappingmemory'); copied.textContent = 'Copied'; }
    catch { copied.textContent = 'Copy failed: select the line above'; }
  });

  if (STILL) { $$('.sheet').forEach(s => s.classList.add('open')); return; }

  /* sound: the gesture that opens the window also wakes the audio */
  let ac, noiseBuf, soundOn = true;
  const wake = () => {
    if (ac || CAPTURE || !window.AudioContext) return;
    ac = new AudioContext();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const c = noiseBuf.getChannelData(0);
    for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1;
  };
  const hiss = (dur, f0, f1, g) => {
    if (!ac || !soundOn) return;
    if (ac.state === 'suspended') ac.resume();
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(), t = ac.currentTime;
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = .8;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    v.gain.setValueAtTime(.0001, t); v.gain.exponentialRampToValueAtTime(g, t + dur * .22); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(v).connect(ac.destination); s.start(t); s.stop(t + dur);
  };
  const thud = g => {
    if (!ac || !soundOn) return;
    const o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(36, t + .2);
    v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(.0001, t + .26);
    o.connect(v).connect(ac.destination); o.start(t); o.stop(t + .28);
  };
  const buzz = p => { if (ac && navigator.vibrate) navigator.vibrate(p); };

  /* the wind: gold threads plus the foil flakes they carry */
  const stage = $('#stage'), wc = $('#wind'), w = wc.getContext('2d');
  let W = 0, H = 0, level = .03, goal = .03, ambient = .03, dir = 1, frozen = false;
  const ptr = { x: -999, y: -999, vx: 0, vy: 0 };
  const threads = [], flakes = [];
  const seed = (th, anywhere) => {
    th.x = anywhere ? R(W) : (dir > 0 ? -R(60) : W + R(60));
    th.y = R(H); th.vx = th.vy = 0; th.h = [];
  };
  const resize = () => {
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    wc.width = W * dpr; wc.height = H * dpr; w.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = W < 700 ? 130 : 280;
    while (threads.length < n) { const th = { w: R(1, 2.4), hot: Math.random() < .25 }; seed(th, true); threads.push(th); }
    threads.length = n;
  };
  const burst = (x, y, vx, vy, n = 1) => {
    if (flakes.length > 520) flakes.splice(0, n);
    for (let i = 0; i < n; i++) flakes.push({ x: x + R(-6, 6), y: y + R(-6, 6), vx: vx * R(.6, 1.3), vy: vy * R(.6, 1.3) + R(-2, 2), a: R(6.3), va: R(-.3, .3), s: R(2.5, 7), life: R(900, 1900), c: ['#ffd766', '#c98a1e', '#fff1b8', '#f2b63c'][Math.random() * 4 | 0] });
  };
  const flow = (x, y, t) => {   // a turning field, so the threads curl like wind and don't fall like rain
    const a = .22 + 1.55 * Math.sin(x * .0052 + t * .55) * Math.cos(y * .0066 - t * .43) + .5 * Math.sin((x + y) * .0021 - t * .2);
    return [dir * Math.cos(a), dir * Math.sin(a)];
  };
  function drawWind(t, dt) {
    const k = dt / 16.7, sec = t / 1000;
    if (!frozen) { level += (goal - level) * .05 * k; goal += (ambient - goal) * .011 * k; }
    w.clearRect(0, 0, W, H);
    w.lineCap = 'round';
    const speed = 1.6 + level * 19, alpha = (.09 + level * .66) * (stage.hidden ? 1 : .55);   // quieter over text on the stage
    for (const th of threads) {
      if (!frozen) {
        const [fx_, fy_] = flow(th.x, th.y, sec);
        th.vx += (fx_ * speed - th.vx) * .07 * k; th.vy += (fy_ * speed - th.vy) * .07 * k;
        const dx = th.x - ptr.x, dy = th.y - ptr.y, q = dx * dx + dy * dy;
        if (q < 26000) { const f = (1 - q / 26000) * .3; th.vx += ptr.vx * f; th.vy += ptr.vy * f; }
        th.x += th.vx * k; th.y += th.vy * k;
        th.h.push(th.x, th.y); if (th.h.length > 26) th.h.splice(0, 2);
        if (th.x > W + 80 || th.x < -80 || th.y > H + 80 || th.y < -80) seed(th);
      }
      if (th.h.length < 4) continue;
      w.beginPath(); w.moveTo(th.h[0], th.h[1]);
      for (let i = 2; i < th.h.length; i += 2) w.lineTo(th.h[i], th.h[i + 1]);
      w.lineWidth = th.w * (.55 + level * .6);
      w.strokeStyle = th.hot ? `rgba(255,244,205,${alpha * .55})` : `rgba(255,203,84,${alpha * .5})`;
      w.stroke();
      const n = th.h.length, m = Math.max(0, n - 10);   // the head of each thread burns brighter than its tail
      w.beginPath(); w.moveTo(th.h[m], th.h[m + 1]);
      for (let i = m + 2; i < n; i += 2) w.lineTo(th.h[i], th.h[i + 1]);
      w.strokeStyle = th.hot ? `rgba(255,250,225,${alpha})` : `rgba(255,214,110,${alpha})`;
      w.stroke();
    }
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i];
      if (!frozen) {
        const [fx_, fy_] = flow(f.x, f.y, sec);
        f.vx += (fx_ * (speed + 6) - f.vx) * .045 * k; f.vy += (fy_ * (speed + 6) + 1.1 - f.vy) * .045 * k;
        f.x += f.vx * k; f.y += f.vy * k; f.a += f.va * k; f.life -= dt;
        if (f.life < 0) { flakes.splice(i, 1); continue; }
      }
      const sq = Math.abs(Math.cos(f.a));
      w.save(); w.translate(f.x, f.y); w.rotate(f.a * .6);
      w.globalAlpha = clamp(f.life / 300);
      w.fillStyle = sq > .55 ? f.c : '#8a5c10';
      w.fillRect(-f.s / 2, -f.s * sq / 2, f.s, Math.max(.8, f.s * sq));
      w.restore();
    }
  }

  /* curtains: sheer strips hung from the rail, the hem takes the wind */
  const win = $('#win'), cc = $('#curtains'), c2 = cc.getContext('2d');
  let cw = 0, ch = 0, b = 0, bv = 0, exposure = .25;
  const sizeC = () => {
    cw = win.offsetWidth; ch = win.offsetHeight;
    const s = Math.min(devicePixelRatio || 1, 1.5);
    cc.width = cw * s; cc.height = ch * s; c2.setTransform(s, 0, 0, s, 0, 0);
  };
  function curtain(side, t) {
    const n = 11, wide = cw * (cw < 700 ? .12 : .15), step = ch / 15, px = [];
    for (let i = 0; i <= n; i++) {
      const line = [];
      for (let j = 0; j <= 15; j++) {
        const y = j * step, q = y / ch, base = i / n * wide;
        const sway = Math.sin(y * .011 + t * (1.1 + b) + i * .85) * (5 + 40 * b) * q ** 1.2;
        const push = b * cw * (cw < 700 ? .2 : .3) * (1 + .3 * Math.sin(i * 1.7 + t * .9)) * q ** 1.7;
        const x = base + sway + push;
        line.push(side < 0 ? x : cw - x, y - b * 26 * q ** 2 * Math.sin(t * 1.4 + i));
      }
      px.push(line);
    }
    for (let i = 0; i < n; i++) {
      c2.beginPath();
      const A = px[i], B = px[i + 1];
      c2.moveTo(A[0], A[1]);
      for (let j = 2; j < A.length; j += 2) c2.lineTo(A[j], A[j + 1]);
      for (let j = B.length - 2; j >= 0; j -= 2) c2.lineTo(B[j], B[j + 1]);
      c2.closePath();
      c2.fillStyle = `rgba(255,243,222,${(.075 + .1 * (.5 + .5 * Math.sin(i * 2.3 + t * .6))) * exposure})`;
      c2.fill();
    }
  }
  function drawCurtains(t, k) {
    if (scrollY > ch) return;
    if (!frozen) {
      bv += ((clamp(level * 1.1) - b) * .03 - bv * .09) * k; b += bv * k;
    }
    c2.clearRect(0, 0, cw, ch);
    curtain(-1, t); curtain(1, t);
    c2.fillStyle = '#0a0512'; c2.fillRect(0, 12, cw, 6);
  }

  /* shutters */
  const shut = $('#shut'), ctl = $('#ctl'), flash = $('#flash');
  let o = 0, ov = 0, oGoal = 0, opened = false, dragging = false, touched = false, nextRattle = 900;
  const nameEl = $('#name'), nameText = nameEl.textContent;
  nameEl.setAttribute('aria-label', nameText);
  nameEl.innerHTML = [...nameText].map(c => `<span aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const letters = (base = 120) => $$('#name span').forEach((s, i) => s.animate([
    { transform: `translate(${-70 - R(32)}vw,${R(-34, 34)}vh) rotate(${R(-130, -40)}deg) scale(1.7)`, opacity: 0, filter: 'blur(10px)' },
    { opacity: 1, offset: .22 },
    { transform: `translate(${R(8, 22)}px,${R(-9, 9)}px) rotate(${R(3, 10)}deg)`, filter: 'blur(0)', offset: .7 },
    { transform: 'none', opacity: 1 }
  ], { duration: 1250, delay: base + i * 52, easing: SPRING, fill: 'backwards' }));
  const windIn = (el, delay = 0) => el.animate([{ transform: 'translateX(-16vw)', opacity: 0, filter: 'blur(6px)' }, { transform: 'none', opacity: 1, filter: 'blur(0)' }], { duration: 1000, delay, easing: SPRING, fill: 'backwards' });
  function open(byHand, quietText) {
    if (opened) return;
    opened = true; oGoal = 1; ov = Math.max(ov, .06); shut.classList.add('open');
    goal = 1; level = Math.max(level, .5); ambient = .15; exposure = 1;
    flash.animate([{ opacity: .96 }, { opacity: 0 }], { duration: 1500, easing: SPRING });
    $('.sky').animate([{ transform: 'scale(1.14)' }, { transform: 'none' }], { duration: 3600, easing: SPRING });
    $('.sun').animate([{ translate: '0 16vh', scale: 1.25 }, { translate: '0 0', scale: 1 }], { duration: 4200, easing: SPRING });
    for (let i = 0; i < 6; i++) later(i * 70, () => burst(W / 2 + R(-40, 40), H * .45 + R(-H * .32, H * .32), R(8, 20), R(-5, 5), 26));
    if (byHand) { hiss(1.5, 350, 1900, .16); thud(.22); buzz([12, 40, 18]); }
    ctl.hidden = false;
    letters();
    if (!quietText) { windIn($('.say'), 620); windIn($('.facts'), 740); windIn($('.play'), 860); }
  }
  let dragX = 0, moved = 0;
  shut.addEventListener('pointerdown', e => { wake(); touched = true; dragging = true; dragX = e.clientX; moved = 0; shut.setPointerCapture(e.pointerId); });
  shut.addEventListener('pointermove', e => {
    if (!dragging || opened) return;
    moved = Math.abs(e.clientX - dragX); o = clamp(moved / (W * .44)); ov = 0;
    goal = Math.max(goal, .03 + o * .4);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    if (moved < 8 || o > .16) open(true); else { oGoal = 0; thud(.12); }
  };
  shut.addEventListener('pointerup', release);
  shut.addEventListener('pointercancel', () => { dragging = false; });
  $('#latch').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wake(); open(true); } });
  addEventListener('scroll', () => { if (!opened && !ep && scrollY > 6 && !biting) open(false); }, { passive: true });
  let idle;
  const armIdle = () => { const mine = idle = {}; later(3400, () => { if (idle === mine && !opened && !touched && !ep) open(false); }); };

  /* foil: gold you can rub off; what's under it is the page's real text */
  function paint(f) {
    const WW = f.el.offsetWidth, HH = f.el.offsetHeight, s = Math.min(devicePixelRatio || 1, 2), g = f.x;
    f.c.width = WW * s; f.c.height = HH * s; g.setTransform(s, 0, 0, s, 0, 0); f.W = WW; f.H = HH;
    const cell = Math.max(15, WW / 26), cols = Math.ceil(WW / cell) + 1, rows = Math.ceil(HH / cell) + 1, pt = [];
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) pt.push([x * cell + R(-cell, cell) * .42, y * cell + R(-cell, cell) * .42]);
    const tri = (a, b_, c_) => {
      const mx = (a[0] + b_[0] + c_[0]) / 3, my = (a[1] + b_[1] + c_[1]) / 3, u = (mx + my) / (WW + HH);
      const L = 45 + R(15) + 17 * Math.exp(-((u - .34) ** 2) / .011) + 11 * Math.exp(-((u - .77) ** 2) / .005);
      g.fillStyle = g.strokeStyle = `hsl(${R(38, 45)} ${R(82, 96)}% ${L}%)`;
      g.beginPath(); g.moveTo(...a); g.lineTo(...b_); g.lineTo(...c_); g.closePath(); g.fill(); g.lineWidth = .6; g.stroke();
    };
    const at = (x, y) => pt[y * (cols + 1) + x];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if ((x + y) % 2) { tri(at(x, y), at(x + 1, y), at(x, y + 1)); tri(at(x + 1, y), at(x + 1, y + 1), at(x, y + 1)); }
      else { tri(at(x, y), at(x + 1, y), at(x + 1, y + 1)); tri(at(x, y), at(x + 1, y + 1), at(x, y + 1)); }
    }
    const text = f.el.querySelector('.claim').textContent, fs = clamp(WW * .115, 25, 78);
    g.font = `700 ${fs}px Afficher,Didot,Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = []; let cur = '';
    for (const word of text.split(' ')) { const nx = cur ? cur + ' ' + word : word; if (g.measureText(nx).width > WW * .82 && cur) { lines.push(cur); cur = word; } else cur = nx; }
    lines.push(cur);
    lines.forEach((l, i) => {
      const y = HH / 2 + (i - (lines.length - 1) / 2) * fs * 1.08;
      g.fillStyle = 'rgba(255,246,208,.75)'; g.fillText(l, WW / 2, y + 1.6);
      g.fillStyle = '#3f2504'; g.fillText(l, WW / 2, y);
    });
  }
  function rub(f, x0, y0, x1, y1, r = 30) {
    if (f.done) return;
    const g = f.x;
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = r * 2;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x1 + R(-r * 1.3, r * 1.3), y1 + R(-r * 1.3, r * 1.3), R(3, 11), 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) f.cells.add(((x1 + dx * r) / f.W * 8 | 0) + ',' + ((y1 + dy * r) / f.H * 8 | 0));
    const q = f.c.getBoundingClientRect();
    burst(q.left + x1, q.top + y1, (x1 - x0) * .3 + R(2, 8), (y1 - y0) * .3 + R(-4, 2), 3);
    if (f.cells.size >= 25) blow(f);
  }
  function blow(f, dur = 620) {
    if (f.done) return;
    f.done = true;
    const g = f.x, q = f.c.getBoundingClientRect(), n = 24, bands = [];
    for (let i = 0; i < n; i++) bands.push({ y: i / n * f.H, h: f.H / n + 1.5, x: -R(f.W * .4), v: f.W * 1.55 / dur * R(.8, 1.35) });
    hiss(.75, 800, 3200, .1); buzz(14); goal = Math.max(goal, .72);
    let last = now();
    g.globalCompositeOperation = 'destination-out';
    tween(dur * 1.3, () => {
      const t = now(), dt = t - last; last = t;
      for (const s of bands) {
        const x2 = s.x + s.v * dt;
        g.fillRect(s.x - 2, s.y, x2 - s.x + 4, s.h);
        if (s.x > 0 && s.x < f.W && Math.random() < .6) burst(q.left + s.x, q.top + s.y + s.h / 2, R(10, 26), R(-7, 7), 1);
        s.x = x2;
      }
    }, () => { f.c.remove(); f.el.classList.add('open'); f.el._f = null; });
  }
  function foil(el) {
    if (el._f) return el._f;
    el.classList.remove('open');
    el.querySelector('.foil')?.remove();
    const c = d.createElement('canvas'); c.className = 'foil'; c.setAttribute('aria-hidden', 'true'); el.append(c);
    const f = { el, c, x: c.getContext('2d'), cells: new Set(), done: false }; el._f = f;
    paint(f);
    let last = null, drag = false, travel = 0, tick_ = 0;
    const at = e => [e.offsetX, e.offsetY];
    c.addEventListener('pointerdown', e => { wake(); drag = true; travel = 0; last = at(e); });
    c.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && !drag) return;
      const p = at(e);
      if (last) {
        travel += Math.hypot(p[0] - last[0], p[1] - last[1]);
        rub(f, last[0], last[1], p[0], p[1], e.pointerType === 'mouse' ? 26 : 34);
        if (travel - tick_ > 42) { tick_ = travel; hiss(.055, 4200, 6400, .035); buzz(4); }
      }
      last = p;
    });
    c.addEventListener('pointerleave', () => { if (!drag) last = null; });
    c.addEventListener('pointerup', () => { if (drag && travel < 8 && !f.done) blow(f); drag = false; });
    c.addEventListener('pointercancel', () => { drag = false; last = null; });
    return f;
  }
  const flutter = (el, from = 1, dur = 1300) => {
    const kf = [];
    for (let i = 0; i <= 15; i++) {
      const t = i / 15, e = Math.exp(-5.2 * t);
      kf.push({ transform: `perspective(1000px) translate(${from * 62 * e}vw,${-18 * e + Math.sin(t * 11) * e * 6}vh) rotate(calc(var(--r,0deg) + ${26 * from * e * Math.cos(t * 9)}deg)) rotateX(${26 * e * Math.sin(t * 8)}deg) rotateY(${-22 * from * e}deg)` });
    }
    return el.animate(kf, { duration: dur, easing: 'linear' });
  };
  const papers = $$('.papers .sheet'), showing = new Set();
  let flown = new WeakSet();
  const flyIn = el => { if (!flown.has(el)) { flown.add(el); flutter(el, el.dataset.n % 2 ? 1 : -.8); } };
  const io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    if (!e.isIntersecting) { showing.delete(el); return; }
    showing.add(el);
    if (el.dataset.n === '1') later(1300, () => {   // the first sheet shows what the gold does
      const f = el._f;
      if (!f || f.teased || !showing.has(el) || f.cells.size) return;
      f.teased = true;
      let px = f.W * .08, py = f.H * .28;
      tween(620, p => { if (f.done) return; const x = f.W * (.08 + p * .55), y = f.H * (.28 + p * .22); rub(f, px, py, x, y, 24); px = x; py = y; f.cells.clear(); });
    });
    later(4300, () => { if (showing.has(el) && el._f && !el._f.cells.size) blow(el._f); });   // nothing stays locked
  }), { threshold: .55 });
  const ioFly = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) flyIn(e.target); }), { threshold: .08 });
  papers.forEach(el => { foil(el); io.observe(el); ioFly.observe(el); });
  d.fonts && d.fonts.ready.then(() => papers.forEach(el => { const f = el._f; if (f && !f.done && !f.cells.size) paint(f); }));

  /* Bites the dust: the wind runs backward, the gold comes back, the window shuts */
  let biting = false;
  const ease = p => p < .5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
  function bite() {
    if (biting) return;
    wake(); biting = true; dir = -1; goal = 1; hiss(1.2, 2600, 300, .16); buzz([20, 30, 20]);
    flash.animate([{ opacity: .85, background: '#ff5cb8' }, { opacity: 0 }], { duration: 700, easing: SPRING });
    const y = scrollY;
    tween(1000, p => scrollTo(0, y * (1 - ease(p))), () => {
      flown = new WeakSet();
      papers.forEach(el => { const f = el._f; if (f) { f.c.remove(); el._f = null; } foil(el); });
      oGoal = 0; ov = -.05; shut.classList.remove('open'); ctl.hidden = true;
      later(520, () => {
        thud(.32); buzz(24); opened = false; touched = false; biting = false; dir = 1; ambient = .03; goal = .03; exposure = .25; armIdle();
      });
    });
  }
  $('#reset').addEventListener('click', bite);

  /* time stop: the wind hangs where it is */
  const timeB = $('#time'), timeL = $('#timeL');
  const setFrozen = v => { frozen = v; root.classList.toggle('stopped', v && !ep); timeB.setAttribute('aria-pressed', v); timeL.textContent = v ? 'Resume time' : 'Stop time'; };
  timeB.addEventListener('click', () => { if (!frozen) { wake(); thud(.25); } setFrozen(!frozen); });
  const soundB = $('#sound'), au = $('#epAudio');
  soundB.addEventListener('click', () => { soundOn = !soundOn; soundB.setAttribute('aria-pressed', soundOn); au.muted = !soundOn; wake(); });

  /* the episode: "Smooth", cut to the bar */
  const slot = $('#slot'), lines = $('#lines'), bigsfx = $('#bigsfx'), said = $('#said'), tpl = $('#ep').content;
  let ep = null;
  const piece = k => tpl.querySelector(`[data-k="${k}"]`).cloneNode(true);
  const hit = () => lines.animate([{ opacity: .85, transform: 'scale(1.28) rotate(0deg)' }, { opacity: 0, transform: 'scale(1) rotate(4deg)' }], { duration: 560, easing: 'ease-out' });
  const shake = () => stage.animate([0, 1, 2, 3, 4, 5, 6].map(i => ({ transform: `translate(${(6 - i) * (i % 2 ? 2 : -2)}px,${(6 - i) * (i % 2 ? -1.4 : 1.4)}px)` })), { duration: 300, easing: 'linear' });
  const clearOut = () => [...slot.children].forEach(el => { el.animate([{ transform: getComputedStyle(el).transform }, { transform: 'translate(-135vw,-14vh) rotate(-32deg)' }], { duration: 400, easing: 'cubic-bezier(.55,0,.9,.35)', fill: 'forwards' }); later(400, () => el.remove()); });
  const land = (n, bg) => {
    clearOut(); stage.hidden = false; stage.style.setProperty('--bg', bg); bigsfx.textContent = '';
    const s = $(`.papers .sheet[data-n="${n}"]`).cloneNode(true);
    s._f = null; s.querySelector('.foil')?.remove(); s.querySelector('.pip button')?.remove(); s.querySelector('#copied')?.remove();
    s.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    s.style.setProperty('--r', (n % 2 ? -1.4 : 1.2) + 'deg');
    slot.append(s); ep.cur = foil(s); flutter(s, 1, 780); hit();
    said.textContent = s.querySelector('h3').textContent + ' ' + s.querySelector('p').textContent;
  };
  const gust = () => { blow(ep.cur, 500); ep.cur.el.animate([{ scale: 1, translate: '0 0', rotate: '0deg' }, { scale: 1.04, translate: '20px -10px', rotate: '2deg', offset: .3 }, { scale: 1, translate: '0 0', rotate: '0deg' }], { duration: 760, easing: SPRING }); };
  const slam = (el, bg, sfx = '') => {
    slot.replaceChildren(el); stage.style.setProperty('--bg', bg); bigsfx.textContent = sfx;
    shake(); hit(); thud(.3);
    el.animate([{ transform: 'scale(2.6) rotate(-6deg)', opacity: 0, filter: 'blur(8px)' }, { transform: 'scale(.96) rotate(.6deg)', opacity: 1, filter: 'blur(0)', offset: .55 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
    said.textContent = el.textContent.trim().replace(/\s+/g, ' ');
  };
  const standSlam = () => {
    const box = d.createElement('div'); box.className = 'slam';
    const st = $('.stand'); box.append(st.querySelector('.fg').cloneNode(true), st.querySelector('h2').cloneNode(true));
    box.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    slam(box, '#a81b5f', 'ドドド');
  };
  const CUES = [
    [.53, () => { ov += .026; thud(.12); }], [1.04, () => { ov += .036; goal = .14; thud(.16); }], [1.55, () => { ov += .05; goal = .24; thud(.2); }],
    [2.065, () => { root.classList.replace('ep0', 'ep1'); open(false, true); hiss(1.4, 350, 2000, .14); thud(.3); }],
    [4.161, () => { root.classList.replace('ep1', 'ep2'); windIn($('.say')); windIn($('.facts'), 160); goal = .75; }],
    [6.22, () => land(1, '#2a0e63')], [6.74, gust],
    [8.303, () => land(2, '#06504c')], [8.82, gust],
    [10.366, () => land(3, '#6d0f4a')], [10.89, gust],
    [12.451, () => land(4, '#0e2a6b')], [12.97, gust],
    [14.508, () => land(6, '#7a2a06')], [15.04, gust],
    [16.581, standSlam],
    [18.639, () => slam(piece('nsf'), '#0b1f5c')], [19.68, () => slam(piece('cu'), '#1d6f6a')],
    [20.717, () => slam(piece('us'), '#0b1f5c')], [21.75, () => slam(piece('sp'), '#3a0d63')],
    [22.78, () => { stage.classList.add('tbc'); frozen = true; const a = piece('tbc'); stage.append(a); a.animate([{ transform: 'translateX(115%)' }, { transform: 'translateX(-4%)', offset: .7 }, { transform: 'none' }], { duration: 460, easing: 'ease-out' }); thud(.3); said.textContent = 'To be continued.'; }],
    [24.853, () => { stage.classList.remove('tbc'); frozen = false; goal = 1; $('#tbcArrow')?.remove(); slam(piece('jan'), '#ffc83d'); }],
    [28.2, () => stopEp(true)]
  ];
  function startEp() {
    wake();
    if (frozen) setFrozen(false);
    ep = { t0: now(), i: 0, cur: null };
    scrollTo(0, 0);
    root.classList.add('ep0'); root.classList.remove('ep1', 'ep2'); sizeC();
    opened = false; oGoal = 0; o = 0; ov = 0; shut.classList.remove('open'); exposure = .25; level = goal = .03; ambient = .03; dir = 1;
    ctl.hidden = false; $('#stop').hidden = false; timeB.hidden = true;
    if (!CAPTURE) { au.currentTime = 0; au.muted = !soundOn; au.play().catch(() => {}); }
  }
  function stopEp(toContact) {
    if (!ep) return;
    ep = null; au.pause(); stage.hidden = true; stage.classList.remove('tbc'); slot.replaceChildren(); $('#tbcArrow')?.remove(); bigsfx.textContent = ''; said.textContent = '';
    root.classList.remove('ep0', 'ep1', 'ep2'); sizeC(); frozen = false; $('#stop').hidden = true; timeB.hidden = false; ambient = .15;
    if (!opened) open(false);
    if (toContact) $('#contact').scrollIntoView();
  }
  const epT = () => (!CAPTURE && !au.paused && au.currentTime > 0) ? au.currentTime : (now() - ep.t0) / 1000;
  $('#play').addEventListener('click', startEp);
  $('#stop').addEventListener('click', () => stopEp(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') stopEp(false); });

  /* the pointer stirs the air */
  addEventListener('pointermove', e => { ptr.vx = clamp((e.clientX - ptr.x) * .35, -40, 40); ptr.vy = clamp((e.clientY - ptr.y) * .35, -40, 40); ptr.x = e.clientX; ptr.y = e.clientY; }, { passive: true });
  let scrollWas = scrollY;
  addEventListener('scroll', () => { const dy = scrollY - scrollWas; scrollWas = scrollY; for (const th of threads) th.y -= dy * .5; for (const f of flakes) f.y -= dy * .8; }, { passive: true });
  addEventListener('resize', () => { resize(); sizeC(); papers.forEach(el => { const f = el._f; if (f && !f.done && !f.cells.size) paint(f); }); });

  /* one loop */
  let lastT = now();
  function tick() {
    const t = now(), dt = Math.min(50, t - lastT) || 16.7, k = dt / 16.7; lastT = t;
    for (let i = fx.length - 1; i >= 0; i--) {
      const a = fx[i], p = clamp((t - a.t0) / a.ms);
      a.fn(p);
      if (p >= 1) { fx.splice(fx.indexOf(a), 1); a.done && a.done(); }
    }
    if (ep) { const T = epT(); while (ep && ep.i < CUES.length && T >= CUES[ep.i][0]) CUES[ep.i++][1](); }
    if (!dragging) { ov += ((oGoal - o) * .05 - ov * .17) * k; o += ov * k; if (o < 0) { o = 0; ov = 0; } if (o > 1.05) { o = 1.05; ov *= -.3; } }
    if (!opened && !dragging && !biting && t > nextRattle) { nextRattle = t + R(1100, 2400); ov += .009; }
    shut.style.setProperty('--o', o.toFixed(4));
    shut.style.setProperty('--f', clamp(1 - o * 3.4).toFixed(3));
    drawCurtains(t / 1000, k);
    drawWind(t, dt);
    ptr.vx *= .9; ptr.vy *= .9;
  }
  resize(); sizeC(); armIdle();
  if (CAPTURE) {
    window.__step = ms => { window.__t += ms; tick(); d.getAnimations().forEach(a => { a.pause(); a.currentTime = (a.currentTime || 0) + ms; }); };
    window.__ctl = { open, startEp, bite, papers, blow };
  } else {
    const loop = () => { if (!d.hidden) tick(); else lastT = now(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();
