/* Gyro's steel ball (v3 "Steel Ball Run" layer). Original design, Three.js.
   A polished steel ball engraved with 377 dots on a spherical Fibonacci lattice: dot i sits at height
   1 - (2i + 1)/377 and 137.508 degrees (the golden angle) around from dot i - 1, the packing of a sunflower head.
   Drag or flick it sideways; Left/Right add spin, Space or Enter adds a lot. Friction is exponential (tau = 3 s).
   The readout fits ln(omega) against time by least squares, live, on simulated speed readings with 2% noise.
   The engraving is computed per pixel in the shader, with exact motion blur along the spin: at speed the dots
   smear into streaks, and above 161.8 rpm the steel dims and the dots light in var(--color-gold).
   mount(root, { tau = 3, noise = 0.02, fallbackSrc }) -> Promise<{ pause, resume, destroy }> */
let THREE = null, RoomEnvironment = null;   // loaded inside mount(), so a blocked CDN falls back to the still instead of killing the module

const N = 377, DOT = 0.062;            // dots (a Fibonacci number) and their radius, in radians of arc
const GOLDEN = 161.8, QUIET = 5;       // rpm: Golden Spin; below QUIET the readings and the spin sound stop
const TO_RPM = 60 / (2 * Math.PI), MAX_RPM = 999;
const FILL = 0.94;                     // ball diameter / canvas side
const TILT = 1.1;                      // the spin axis leans toward the viewer so the sunflower pole shows
const FOV = 24;
const SHUTTER = 0.5;                   // motion blur over half of each frame's turn (a film camera's 180 degrees)

const GLSL = /* glsl */ `
varying vec3 vObj;
uniform float uSmear, uGold, uGlow;
uniform vec3 uGoldColor, uAxis;
#define SB_N ${N.toFixed(1)}
#define SB_A ${DOT}
// (coverage, mean dimple offset east, south) at unit direction p. Coverage is the share of this frame's arc
// (the spin during the frame, at least one pixel wide) that this pixel spent over a dot: exact motion blur.
vec3 sbEngrave(vec3 p) {
  float y = clamp(p.y, -1.0, 1.0), s = sqrt(max(1.0 - y * y, 1e-10)), th = acos(y), ph = atan(p.z, p.x);
  float px = clamp(length(fwidth(p)), 1e-5, 0.04);
  float hw = min(0.5 * max(abs(uSmear), px / s), PI);
  float mid = -0.5 * uSmear;
  float kM = smoothstep(1.0, 3.0, abs(uSmear) * s / px);
  float cA = cos(SB_A), cS = cos(SB_A + px), cM = cos(min(SB_A + px + hw * s, PI));
  // dots that can touch this latitude form one run of indices, because height falls linearly with i
  float i0 = max(ceil(((1.0 - cos(max(th - SB_A - px, 0.0))) * SB_N - 1.0) * 0.5), 0.0);
  float i1 = min(floor(((1.0 - cos(min(th + SB_A + px, PI))) * SB_N - 1.0) * 0.5), SB_N - 1.0);
  vec3 st = vec3(0.0), mv = vec3(0.0);
  for (int k = 0; k < 48; k++) {
    float i = i0 + float(k);
    if (i > i1) break;
    float yi = 1.0 - (2.0 * i + 1.0) / SB_N, si = sqrt(max(1.0 - yi * yi, 0.0));
    float d = ph - PI2 * fract(i * 0.3819660112501051);   // golden angle = 2 pi (2 - phi)
    d -= PI2 * floor(d / PI2 + 0.5);
    if (kM < 1.0) {                                        // still: distance to the dot, 1 px antialiased
      float cd = cos(d), cD = y * yi + s * si * cd;
      if (cD > cS) {
        float c = 1.0 - smoothstep(SB_A - 0.5 * px, SB_A + 0.5 * px, sqrt(max(2.0 - 2.0 * cD, 0.0)));
        st += c * vec3(1.0, si * sin(d), yi * s - si * y * cd);
      }
    }
    if (kM > 0.0) {                                        // moving: overlap of the arc with the dot's chord
      float c0 = d + mid;
      c0 -= PI2 * floor(c0 / PI2 + 0.5);
      if (y * yi + s * si * cos(c0) > cM) {
        float cw = (cA - y * yi) / max(s * si, 1e-8);
        if (cw < 1.0) {
          float w = acos(max(cw, -1.0));
          for (int j = -1; j <= 1; j++) {
            if (j != 0 && hw + w <= PI) continue;
            float cj = c0 + float(j) * PI2, lo = max(cj - hw, -w), hi = min(cj + hw, w);
            if (hi > lo) mv += vec3(hi - lo, si * (cos(lo) - cos(hi)), yi * s * (hi - lo) - si * y * (sin(hi) - sin(lo)));
          }
        }
      }
    }
  }
  vec3 r = mix(st, mv / (2.0 * hw), kM);
  return vec3(min(r.x, 1.0), r.yz * (1.0 - 0.75 * kM) / SB_A);   // smeared dimples lose their shading
}
`;

function patch(shader, U) {
  Object.assign(shader.uniforms, U);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + GLSL)
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 sbE = sbEngrave(normalize(vObj));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.075, 0.085), sbE.x);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.4, sbE.x);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {                                                    // concave dimple: tilt toward the dot's centre
        vec3 sbX = cross(normal, uAxis);
        float sbL = length(sbX);
        if (sbL > 1e-4) { sbX /= sbL; normal = normalize(normal - 0.3 * (sbE.y * sbX + sbE.z * cross(normal, sbX))); }
      }`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uGoldColor * (uGold * uGlow * sbE.x);`);
}

const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

export async function mount(root, opts = {}) {
  const tau = opts.tau ?? 3, noise = opts.noise ?? 0.02;
  const src = opts.fallbackSrc ?? new URL('steelball.png', import.meta.url).href;
  const doc = root.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const id = 'jj-sb-' + Math.random().toString(36).slice(2, 8);
  const saved = [...root.childNodes];
  if (!THREE) try {
    [THREE, { RoomEnvironment }] = await Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js')]);
  } catch { THREE = null; }

  root.classList.add('jj-steelball');
  root.innerHTML = `
    <div class="jj-steelball__stage" role="button" tabindex="0" aria-label="Spin the steel ball" aria-describedby="${id}"></div>
    <div class="jj-steelball__readout">
      <p class="jj-steelball__golden">This page's Golden Spin: 161.8 rpm and up</p>
      <p class="jj-steelball__rpm"><span class="jj-steelball__num"></span><span class="jj-steelball__unit">rpm</span></p>
      <p class="jj-steelball__fit"></p>
      <figure class="jj-steelball__fig">
        <svg class="jj-steelball__plot" viewBox="0 0 280 110" aria-hidden="true"><path class="ax" d="M30 92H272M30 10V92"/><path class="pts"/><path class="ls"/>
          <text x="30" y="106">0 s</text><text class="tmax" x="272" y="106" text-anchor="end"></text><text x="24" y="16" text-anchor="end">ln</text></svg>
        <figcaption>Each dot is a reading: log speed against time. The line is the least-squares fit; its slope is −1/τ.</figcaption>
      </figure>
      <p class="jj-steelball__note" id="${id}">${N} dots, each 137.508° around from the last: the golden angle in a sunflower head.
        Friction is simulated (τ&nbsp;=&nbsp;${tau.toFixed(2)}&nbsp;s) and each speed reading has ${Math.round(noise * 100)}% noise.
        Flick it sideways, or use the arrow keys and Space.</p>
    </div>
    <p class="jj-steelball__live" aria-live="polite"></p>`;
  const $ = (c) => root.querySelector('.jj-steelball__' + c);
  const stage = $('stage'), numEl = $('num'), fitEl = $('fit'), noteEl = $('note'), goldEl = $('golden'), live = $('live');
  const plotEl = $('plot'), ptsEl = plotEl.querySelector('.pts'), lsEl = plotEl.querySelector('.ls'), tmaxEl = plotEl.querySelector('.tmax');

  let ang = 0.5, w = 0, tSim = 0, last = 0, raf = 0, drawn = ang, radius = 200;
  let user = false, dead = false, failed = false, golden = false, gold = 0, flare = 0;
  let spinOn = false, lastSfx = 0, lastUi = 0, shown = '', fit = null, drag = null, gl3 = null, sayT = 0;
  const hold = new Set(['view']);
  if (doc.documentElement.classList.contains('time-stopped')) hold.add('time');
  if (doc.hidden) hold.add('hidden');

  const sfx = (detail) => doc.dispatchEvent(new CustomEvent('sfx', { detail }));
  const say = (t) => { live.textContent = t; };

  /* ---- readout ---- */
  function setRpm(rpm) {
    const s = rpm.toFixed(1);
    if (s === shown) return;
    shown = s;                       // Afficher has no tabular figures, so each digit gets a fixed slot
    numEl.innerHTML = [...s].map((ch) => `<span class="jj-steelball__${ch === '.' ? 'pt' : 'd'}">${ch}</span>`).join('');
  }
  function fitNow() {
    if (!fit || fit.n < 10) return null;
    const { n, St, Sy, Stt, Sty, Syy } = fit;
    const sxx = Stt - St * St / n, sxy = Sty - St * Sy / n, syy = Syy - Sy * Sy / n;
    return sxx > 0 && syy > 0 && sxy < 0 ? { tau: -sxx / sxy, r2: sxy * sxy / (sxx * syy) } : null;
  }
  const r2Text = (r2) => (Math.floor(r2 * 1000) / 1000).toFixed(3);   // rounded down: never claims a perfect fit
  const fitText = (f) => `τ\u00a0=\u00a0${f.tau.toFixed(2)}\u00a0s, R²\u00a0=\u00a0${r2Text(f.r2)}`;   // values never break across lines
  // the readings on log scale, and the fitted line through them: a straight line is the whole claim of the fit
  function drawPlot(f) {
    const P = fit ? fit.pts : [];
    if (!P.length) { ptsEl.setAttribute('d', ''); lsEl.setAttribute('d', ''); tmaxEl.textContent = ''; return; }
    const T = Math.max(1, P[P.length - 1][0]);
    let lo = Infinity, hi = -Infinity;
    for (const [, y] of P) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    if (hi - lo < 0.5) { const m = (hi + lo) / 2; lo = m - 0.25; hi = m + 0.25; }
    const X = (t) => (30 + t / T * 242).toFixed(1), Y = (y) => (88 - (y - lo) / (hi - lo) * 74).toFixed(1);
    ptsEl.setAttribute('d', P.map(([t, y]) => `M${X(t)} ${Y(y)}h0`).join(''));
    if (f) {
      const { n, St, Sy } = fit, b = -1 / f.tau, a = (Sy - b * St) / n;
      lsEl.setAttribute('d', `M${X(0)} ${Y(a)}L${X(T)} ${Y(a + b * T)}`);
    } else lsEl.setAttribute('d', '');
    tmaxEl.textContent = T.toFixed(1) + ' s';
  }
  function showReadout() {
    setRpm(Math.abs(w) * TO_RPM);
    const f = fitNow();
    drawPlot(f);
    fitEl.textContent = f ? `Spin-down fit: ${fitText(f)} (fit\u00a0to\u00a0this\u00a0spin)`
      : !fit ? 'Spin-down fit: waiting for a spin' : fit.done ? 'Spin-down fit: spin too short to fit' : 'Spin-down fit: measuring';
  }

  /* ---- physics and the fit ---- */
  function resetFit() { fit = { n: 0, St: 0, Sy: 0, Stt: 0, Sty: 0, Syy: 0, t0: tSim, next: tSim, done: false, pts: [] }; }
  function sample() {                // one tachometer reading: ln omega plus noise
    const t = tSim - fit.t0, y = Math.log(Math.abs(w)) + noise * gauss();
    fit.n++; fit.St += t; fit.Sy += y; fit.Stt += t * t; fit.Sty += t * y; fit.Syy += y * y; fit.span = t;
    fit.pts.push([t, y]);
    fit.next = tSim + 0.05;
  }
  function spin(addRpm) {
    user = true;
    w = Math.max(-MAX_RPM, Math.min(MAX_RPM, w * TO_RPM + addRpm)) / TO_RPM;
    resetFit();
    showReadout();
    kick();
  }
  function setGolden(on) {
    golden = on;
    root.classList.toggle('is-golden', on);
    if (!on) return;
    const m = getComputedStyle(goldEl).color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
    if (m && gl3) gl3.U.uGoldColor.value.setRGB(m[1] / 255, m[2] / 255, m[3] / 255, THREE.SRGBColorSpace);
    if (!reduce.matches) flare = 1;
    if (user) sfx({ name: 'golden' });
    say('This page\'s Golden Spin: 161.8 rpm and up.');
  }
  function quiet() { if (spinOn) { spinOn = false; sfx({ name: 'spin', stop: true }); } }

  function loop(now) {
    raf = 0;
    if (dead || hold.size || !gl3) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    tSim += dt;
    if (w) {                         // exact exponential decay over the step
      const k = Math.exp(-dt / tau);
      ang += w * tau * (1 - k);
      w *= k;
      if (Math.abs(w) * TO_RPM < 1) w = 0;
    }
    const rpm = Math.abs(w) * TO_RPM;
    if (fit && !fit.done) {
      if (rpm < QUIET) {
        fit.done = true;
        const f = fitNow();
        if (f) say(`Spin-down fit: ${fitText(f)}, from ${fit.span.toFixed(1)} s of readings.`);
      } else if (!drag && tSim >= fit.next) sample();
    }
    if ((rpm > GOLDEN) !== golden) setGolden(!golden);
    const target = golden ? 1 : 0;
    if (reduce.matches) { gold = target; flare = 0; }
    else {
      gold += (target - gold) * (1 - Math.exp(-dt / 0.09));
      if (Math.abs(target - gold) < 0.004) gold = target;
      flare = flare > 0.01 ? flare * Math.exp(-dt / 0.3) : 0;
    }
    if (user) {
      const t = win.performance.now();
      if (rpm < QUIET) quiet();
      else if (t - lastSfx >= 100) {     // 10 Hz
        lastSfx = t; spinOn = true;
        sfx({ name: 'spin', gain: +Math.min(1, (rpm / 300) ** 0.8).toFixed(2), rate: +(0.6 + 0.8 * Math.min(1, rpm / 400)).toFixed(2) });
      }
    }
    if (now - lastUi > 80) { lastUi = now; showReadout(); }
    const moved = ang - drawn;       // blur over part of this frame's turn; slow frames blur as if they took 1/30 s
    draw(Math.max(-1, Math.min(1, moved * SHUTTER * (dt > 1 / 30 ? 1 / 30 / dt : 1))));
    if (w || drag || gold !== target || flare || moved) raf = win.requestAnimationFrame(loop);
    else { last = 0; showReadout(); }
  }
  function kick() { if (!raf && !dead && !hold.size && gl3) raf = win.requestAnimationFrame(loop); }
  function setHold(k, on) {
    if (on) {
      hold.add(k);
      if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
      last = 0;
      quiet();
    } else { hold.delete(k); kick(); }
  }

  /* ---- three.js ---- */
  function draw(smear = 0) {
    const { renderer, scene, camera, ball, U } = gl3;
    ball.rotation.y = ang;
    U.uSmear.value = smear;
    U.uGold.value = gold;
    U.uGlow.value = 1.5 + 2 * flare;
    scene.environmentIntensity = 1 - 0.6 * gold;   // Golden Spin dims the steel so the lattice reads as light
    renderer.render(scene, camera);
    drawn = ang;
  }
  function resize() {
    if (!gl3) return;
    const s = Math.round(stage.clientWidth);
    if (!s) return;
    gl3.renderer.setPixelRatio(Math.min(win.devicePixelRatio || 1, 2));
    gl3.renderer.setSize(s, s, false);
    radius = s * FILL / 2;
    draw();                          // setSize clears the canvas; repaint even while paused
  }
  function init3D() {
    if (!THREE) return fallback();
    const canvas = doc.createElement('canvas');
    const ctx = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!ctx) return fallback();
    canvas.setAttribute('aria-hidden', 'true');
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    room.traverse((o) => { if (o.isMesh && o.material.side === THREE.BackSide) o.material.color.setScalar(0.75); });   // greyer walls, brighter panels
    const env = pmrem.fromScene(room, 0.04);
    room.dispose(); pmrem.dispose();
    scene.environment = env.texture;
    scene.environmentRotation.y = 5;   // key light upper left
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
    camera.position.z = 1 / Math.sin(Math.atan(FILL * Math.tan(THREE.MathUtils.degToRad(FOV / 2))));
    const U = {
      uSmear: { value: 0 }, uGold: { value: 0 }, uGlow: { value: 0 },
      uGoldColor: { value: new THREE.Color(0xa8780a) },
      uAxis: { value: new THREE.Vector3(0, Math.cos(TILT), Math.sin(TILT)) },   // camera has no rotation: view = world
    };
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.62, 0.62, 0.63), metalness: 1, roughness: 0.2 });
    mat.onBeforeCompile = (shader) => patch(shader, U);
    const geo = new THREE.SphereGeometry(1, 128, 96), ball = new THREE.Mesh(geo, mat), tilt = new THREE.Group();
    tilt.rotation.x = TILT;
    tilt.add(ball);
    scene.add(tilt);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (!dead) { teardown3D(); fallback(); } });
    stage.replaceChildren(canvas);
    gl3 = { renderer, scene, camera, ball, U, geo, mat, env };
    resize();
  }
  function teardown3D() {
    if (!gl3) return null;
    const { renderer, geo, mat, env } = gl3;
    gl3 = null;
    if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
    geo.dispose(); mat.dispose(); env.dispose(); renderer.dispose();
    return renderer;
  }
  function fallback() {
    failed = true;
    quiet();
    const img = doc.createElement('img');
    img.src = src; img.width = img.height = 420; img.decoding = 'async';
    img.alt = `A polished steel ball engraved with ${N} dots in a golden-angle spiral`;
    stage.replaceChildren(img);
    for (const a of ['role', 'tabindex', 'aria-label', 'aria-describedby']) stage.removeAttribute(a);
    root.classList.add('is-still');
    root.classList.remove('is-golden');
    w = 0; fit = null; shown = '';
    setRpm(0);
    fitEl.textContent = THREE ? 'The live ball needs WebGL.' : 'The live ball could not load.';
    noteEl.hidden = true;
    $('rpm').hidden = true; $('fig').hidden = true;
  }

  /* ---- input ---- */
  stage.addEventListener('pointerdown', (e) => {
    if (!gl3 || hold.size || drag || e.button !== 0) return;
    user = true;
    drag = { id: e.pointerId, x: e.clientX, pts: [[e.timeStamp, e.clientX]] };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
    kick();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || hold.size) return;
    ang += (e.clientX - drag.x) / radius;   // the ball follows the finger
    drag.x = e.clientX;
    const cs = e.getCoalescedEvents?.();    // true sample times, even when frames are slow
    for (const c of cs && cs.length ? cs : [e]) drag.pts.push([c.timeStamp, c.clientX]);
    while (drag.pts.length > 2 && e.timeStamp - drag.pts[0][0] > 100) drag.pts.shift();
    kick();
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.pts, a = p[0], b = p[p.length - 1], dt = (b[0] - a[0]) / 1000;
    drag = null;
    stage.classList.remove('is-dragging');
    if (e.type === 'pointercancel' || hold.size || e.timeStamp - b[0] > 80 || dt < 0.008) return;   // held still, or a scroll took over
    const add = (b[1] - a[1]) / dt / radius * TO_RPM;    // a flick adds its surface speed as spin
    if (Math.abs(add) >= 1) spin(add);
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('keydown', (e) => {
    if (!gl3 || hold.size) return;
    const k = e.key, add = k === 'ArrowRight' ? 25 : k === 'ArrowLeft' ? -25 : k === ' ' || k === 'Enter' ? (w < 0 ? -180 : 180) : 0;
    if (!add) return;
    e.preventDefault();
    spin(add);
    clearTimeout(sayT);
    sayT = setTimeout(() => say(`${Math.round(Math.abs(w) * TO_RPM)} rpm${golden ? ', Golden Spin' : ''}.`), 350);
  });

  /* ---- lifecycle ---- */
  const onStop = () => setHold('time', true), onGo = () => setHold('time', false), onVis = () => setHold('hidden', doc.hidden);
  doc.addEventListener('timestop', onStop);
  doc.addEventListener('timeresume', onGo);
  doc.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  const io = new IntersectionObserver((es) => {
    const e = es[es.length - 1];
    if (e.isIntersecting && !gl3 && !failed && !dead) {   // build the scene only once it is on screen
      init3D();
      if (gl3 && !reduce.matches && !hold.has('time')) { w = 80 / TO_RPM; resetFit(); }   // one gentle toss
    }
    setHold('view', !e.isIntersecting);
  });
  io.observe(root);
  showReadout();

  return {
    pause: () => setHold('api', true),
    resume: () => setHold('api', false),
    destroy() {
      if (dead) return;
      dead = true;
      quiet();
      clearTimeout(sayT);
      io.disconnect(); ro.disconnect();
      doc.removeEventListener('timestop', onStop);
      doc.removeEventListener('timeresume', onGo);
      doc.removeEventListener('visibilitychange', onVis);
      teardown3D()?.forceContextLoss();
      root.classList.remove('jj-steelball', 'is-golden', 'is-still');
      root.replaceChildren(...saved);
    },
  };
}
