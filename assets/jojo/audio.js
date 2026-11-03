// v3 sound, off until turned on; files load on first use. sfx detail: { name, gain, rate, stop, offset }.
// Loops run until stop: true; offset = start phase (s); gallop phase 0 = plate frame 1, so (frame - 1) * 0.11.
const DIR = new URL('../audio/', import.meta.url);
const LOOPS = { gallop: 1.21, spin: 1, menace: 2 }; // period, s; files carry 0.1 s of wrap-around each end
const PAD = 0.1;
const NAMES = new Set(['hoof', 'golden', 'ora', 'ora-final', 'refuse', 'nextline', 'timestop', 'timeresume', 'tbc', 'tick',
  ...Object.keys(LOOPS)]);
const JITTER = { ora: 0.08, hoof: 0.05 }; // +- playback-rate spread so repeats differ
const DIRECT = new Set(['timestop', 'timeresume']); // never ducked
const DUCK = 0.15;

export function initAudio({ toggle }) {
  const doc = document, AC = window.AudioContext || window.webkitAudioContext;
  let on = false, ctx, out, bus, ducked = doc.documentElement.classList.contains('time-stopped');
  const bufs = new Map(), want = new Map(), live = new Map();

  function load(name) {
    if (!bufs.has(name)) {
      const p = fetch(new URL(name + '.mp3', DIR))
        .then(r => { if (!r.ok) throw r.status; return r.arrayBuffer(); })
        .then(b => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
        .then(b => name in LOOPS ? period(b, LOOPS[name]) : b);
      p.catch(() => bufs.delete(name)); // retry next time
      bufs.set(name, p);
    }
    return bufs.get(name);
  }

  // one period, its last 20 ms faded into the samples just before it: no MP3-noise step at the wrap
  function period(b, len) {
    const sr = b.sampleRate, n = Math.round(len * sr), m = Math.round(PAD * sr), k = Math.round(0.02 * sr);
    const d = b.getChannelData(0), one = ctx.createBuffer(1, n, sr), o = one.getChannelData(0);
    o.set(d.subarray(m, m + n));
    for (let j = 0; j < k; j++) o[n - k + j] += (j / k) * (d[m - k + j] - o[n - k + j]);
    return one;
  }

  function boot() {
    ctx = new AC();
    const guard = ctx.createDynamicsCompressor(); // stacked hits stay under full scale
    guard.threshold.value = -6; guard.knee.value = 6; guard.ratio.value = 12;
    guard.attack.value = 0.003; guard.release.value = 0.15;
    out = ctx.createGain(); // master
    bus = ctx.createGain(); // all that ducks
    bus.gain.value = ducked ? DUCK : 1;
    bus.connect(out); out.connect(guard).connect(ctx.destination);
  }

  function wake() { // first call must come from a user gesture
    if (!on || doc.hidden) return;
    if (!ctx) boot();
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    want.forEach((_, n) => sync(n));
  }

  function duck(v) {
    ducked = v;
    if (ctx) bus.gain.setTargetAtTime(v ? DUCK : 1, ctx.currentTime, v ? 0.04 : 0.25);
  }

  async function shot(name, gain, rate) {
    const t0 = performance.now();
    let buf;
    try { buf = await load(name); } catch (e) { return; }
    if (!on || performance.now() - t0 > 1000) return; // too late to be feedback
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * (JITTER[name] || 0));
    g.gain.value = gain;
    src.connect(g).connect(DIRECT.has(name) ? out : bus);
    src.start();
  }

  async function sync(name) { // make the playing loop match `want`
    const w = want.get(name), l = live.get(name);
    if (!on || !w) { if (l) { live.delete(name); l.stop && l.stop(); } return; }
    if (!ctx) return;
    if (l) { l.set && l.set(w); return; }
    const node = {};
    live.set(name, node); // placeholder: one source each
    let buf;
    try { buf = await load(name); } catch (e) { live.delete(name); return; }
    if (live.get(name) !== node) return; // stopped while loading
    const src = ctx.createBufferSource(), g = ctx.createGain(), len = LOOPS[name];
    src.buffer = buf; src.loop = true;
    g.gain.value = 0;
    src.connect(g).connect(bus);
    src.start(0, ((want.get(name).offset % len) + len) % len);
    node.set = v => {
      const t = ctx.currentTime;
      g.gain.setTargetAtTime(v.gain, t, 0.05);
      src.playbackRate.setTargetAtTime(v.rate, t, 0.05);
    };
    node.stop = () => { const t = ctx.currentTime; g.gain.setTargetAtTime(0, t, 0.08); src.stop(t + 0.6); };
    node.set(want.get(name));
  }

  function show() {
    toggle.setAttribute('aria-pressed', String(on));
    toggle.textContent = on ? 'Sound on' : 'Sound off';
  }

  function setEnabled(v) {
    on = !!v;
    try { localStorage.setItem('sfx', on ? 'on' : 'off'); } catch (e) { /* storage blocked */ }
    show();
    if (on) return wake();
    live.forEach((_, n) => sync(n)); // fade loops; `want` keeps them
    setTimeout(() => { if (!on && ctx) ctx.suspend(); }, 700);
  }

  doc.addEventListener('sfx', e => {
    const d = e.detail || {}, name = d.name;
    if (!NAMES.has(name)) return;
    if (DIRECT.has(name)) duck(name === 'timestop');
    const gain = d.gain == null ? 1 : Math.max(0, +d.gain || 0);
    const rate = Math.min(4, Math.max(0.25, +d.rate || 1));
    if (name in LOOPS) {
      if (d.stop) want.delete(name); else want.set(name, { gain, rate, offset: +d.offset || 0 });
      sync(name);
    } else if (on && ctx && !d.stop) shot(name, gain, rate);
  });
  doc.addEventListener('timestop', () => duck(true));
  doc.addEventListener('timeresume', () => duck(false));
  doc.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (doc.hidden) ctx.suspend(); else if (on) ctx.resume().catch(() => {});
  });
  // a remembered "on" starts sounding at the visitor's first gesture
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'keydown'])
    doc.addEventListener(t, () => { if (on && (!ctx || ctx.state !== 'running')) wake(); }, true);
  toggle.addEventListener('click', () => setEnabled(!on));

  try { on = localStorage.getItem('sfx') === 'on'; } catch (e) { /* storage blocked */ }
  show();
  return { enabled: () => on, setEnabled };
}
