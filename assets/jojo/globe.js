/* The spin (Steel Ball Run layer): a polished steel globe. Flick it. Where it stops, that country lights up, its flag lands,
   and one true story from the history of statistics appears with its source. The first toss lands on the visitor's own
   country when the browser's language names one; nothing is sent anywhere.
   The map is Natural Earth, baked by tools/build_globe.py into globe.png: R land, G borders, B country number.
   The landing is exact because the whole spin is one cubic ease-out: the flick sets the starting speed, and the distance
   is snapped to the country nearest where that flick would have coasted anyway.
   mount(root) -> Promise<void> */
import { FACTS } from './globe-facts.js';

let THREE = null, RoomEnvironment = null;   // loaded inside mount(), so a blocked CDN falls back to the still instead of killing the module

const TAU = 2 * Math.PI, RAD = Math.PI / 180, TO_RPM = 60 / TAU;
const GOLDEN = 161.8, QUIET = 5;       // rpm: above GOLDEN the land lights gold; below QUIET the spin sound stops
const FILL = 0.94, FOV = 24;           // ball diameter / canvas side
const SHUTTER = 0.5;                   // motion blur over half of each frame's turn (a film camera's 180 degrees)

const GLSL = /* glsl */ `
varying vec3 vObj;
uniform sampler2D uMap;
uniform float uSmear, uGold, uHi, uId;
uniform vec3 uGoldColor;
#define G_W 2048.0
vec2 gUv(vec3 p) { return vec2(atan(p.x, p.z) / PI2 + 0.5, 0.5 - asin(clamp(p.y, -1.0, 1.0)) / PI); }
// land and borders at direction p, averaged over the arc this pixel swept during the frame
vec2 gMap(vec3 p) {
  vec2 uv = gUv(p);
  float lod = max(log2(clamp(length(fwidth(p)), 1e-5, 0.2) * G_W / PI2), 0.0);
  if (abs(uSmear) * G_W / PI2 < 1.0) return textureLod(uMap, uv, lod).rg;
  vec2 s = vec2(0.0);
  for (int i = 0; i < 9; i++) s += textureLod(uMap, uv + vec2(float(i) / 8.0 * uSmear / PI2, 0.0), lod).rg;
  return s / 9.0;
}
float gHere(vec3 p) {                 // 1 on the country it landed on; nearest texel, because numbers don't blend
  vec2 uv = gUv(p);
  return step(abs(texelFetch(uMap, ivec2(fract(uv.x) * G_W, min(uv.y, 0.9995) * G_W * 0.5), 0).b * 255.0 - uId), 0.25);
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
      vec3 gP = normalize(vObj);
      vec2 gM = gMap(gP);
      float gH = uHi * gHere(gP);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.075, 0.08, 0.09), gM.x);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62), 0.75 * gM.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, uGoldColor, gH);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.5, gM.x);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = normalize(normal + 0.5 * vec3(dFdx(gM.x), dFdy(gM.x), 0.0));   // the coast catches the light like an engraved edge`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += uGoldColor * (uGold * 1.6 * gM.x + 0.5 * gH);`);
}

export async function mount(root) {
  const doc = root.ownerDocument, win = doc.defaultView;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const here = (p) => new URL(p, import.meta.url).href;
  if (!THREE) try {
    [THREE, { RoomEnvironment }] = await Promise.all([import('three'), import('three/addons/environments/RoomEnvironment.js')]);
  } catch { THREE = null; }

  root.classList.add('jj-globe');
  root.innerHTML = `
    <div class="jj-globe__stage" role="button" tabindex="0" aria-label="Spin the globe">
      <div class="jj-globe__pin" hidden><i class="jj-globe__dust"></i><i class="jj-globe__pole"></i><img class="jj-globe__flag" alt=""></div>
    </div>
    <div class="jj-globe__panel">
      <p class="jj-globe__name"></p>
      <p class="jj-globe__fact">Flick the globe. Where it stops, you get a true story from the history of statistics.</p>
      <p class="jj-globe__row"><button type="button" class="jj-globe__again">Spin it</button><a class="jj-globe__src" hidden>Source</a></p>
    </div>
    <p class="jj-globe__live" aria-live="polite"></p>`;
  const $ = (c) => root.querySelector('.jj-globe__' + c);
  const stage = $('stage'), pin = $('pin'), flag = $('flag'), nameEl = $('name'), factEl = $('fact'), srcEl = $('src'), again = $('again'), live = $('live');

  let ang = 0.6, lat = 0.42, drawn = ang, radius = 200, last = 0, raf = 0;
  let run = null, drag = null, cur = null, gl3 = null, failed = false, user = false, tossed = false, dir = 1;
  let gold = 0, hi = 0, hiT = 0, spinOn = false, lastSfx = 0;
  const seen = new Set();
  const hold = new Set(['view']);
  if (doc.documentElement.classList.contains('time-stopped')) hold.add('time');
  if (doc.hidden) hold.add('hidden');

  const sfx = (detail) => doc.dispatchEvent(new CustomEvent('sfx', { detail }));
  const quiet = () => { if (spinOn) { spinOn = false; sfx({ name: 'spin', stop: true }); } };
  const pool = () => {
    const fresh = FACTS.filter((f) => !seen.has(f));
    if (fresh.length) return fresh;
    seen.clear();
    return FACTS.filter((f) => f !== cur);
  };

  /* ---- the landing ---- */
  function show(f) {
    seen.add(f); cur = f; tossed = true;
    nameEl.textContent = f.name;
    factEl.textContent = f.fact;
    srcEl.href = f.src; srcEl.hidden = false;
    again.textContent = failed ? 'Another country' : 'Spin again';
    live.textContent = `${f.name}. ${f.fact}`;
    flag.src = here(`../flags/${f.iso}.svg`);
    root.classList.add('has-fact');
  }
  function land(f) {
    show(f);
    if (gl3) { gl3.U.uId.value = f.id; hiT = 1; }
    if (failed) return;
    pin.hidden = false;
    if (reduce.matches) return;
    pin.animate([{ transform: 'translateY(-260%)', opacity: 0 }, { transform: 'translateY(-260%)', opacity: 1, offset: 0.01 }, { transform: 'none', easing: 'ease-out' }, { transform: 'translateY(-9%)', easing: 'ease-in' }, { transform: 'none' }],
      { duration: 620, easing: 'cubic-bezier(.5,0,1,.6)' });
    $('dust').animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0.9, offset: 0.5 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], { duration: 760, easing: 'ease-out' });
    if (user) win.setTimeout(() => sfx({ name: 'ora land', gain: 2 }), 300);
  }
  function launch(w0, v0 = 0) {      // w0 sideways and v0 vertical, in rad/s
    if (Math.abs(w0) > 0.01) dir = Math.sign(w0);
    pin.hidden = true; hiT = 0; run = null;
    const speed = Math.max(Math.abs(w0), 1.4), T0 = Math.min(4.6, 2 + Math.max(speed, Math.abs(v0)) / 14), free = speed * T0 / 3;
    const P = pool(), best = P[Math.floor(Math.random() * P.length)];   // every country not yet seen is equally likely
    let D = (((-best.lon * RAD - ang) * dir) % TAU + TAU) % TAU;         // the way round to it in the spin's direction,
    D += TAU * Math.max(0, Math.round((free - D) / TAU));                // plus the whole turns this much speed would coast
    if (reduce.matches || !gl3) {
      if (gl3) { ang += dir * D; lat = best.lat * RAD; draw(); }
      land(best);
      return;
    }
    const T = Math.abs(v0) > speed ? T0 : Math.max(1.3, Math.min(5.5, 3 * D / speed)), roll = Math.abs(v0) > 1;
    let dl = (((best.lat * RAD - lat) % TAU) + TAU) % TAU;     // shortest way to the country's latitude, plus whole turns if it was flicked vertically
    if (dl > Math.PI) dl -= TAU;
    if (roll) dl += TAU * Math.round((v0 * T / 3 - dl) / TAU);
    run = { a0: ang, D: dir * D, T, t: 0, lat0: lat, dl, roll, f: best };
    kick();
  }

  /* ---- animation ---- */
  function loop(now) {
    raf = 0;
    if (hold.size || !gl3) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    let w = 0;
    if (run) {
      run.t += dt;
      const u = Math.min(1, run.t / run.T), k = 1 - u;
      ang = run.a0 + run.D * (1 - k * k * k);
      w = 3 * run.D / run.T * k * k;
      lat = run.lat0 + run.dl * (run.roll ? 1 - k * k * k : u * u * (3 - 2 * u));
      if (run.roll) w = Math.hypot(w, 3 * run.dl / run.T * k * k);
      if (u >= 1) { const f = run.f; lat = f.lat * RAD; run = null; w = 0; land(f); }
    }
    const rpm = Math.abs(w) * TO_RPM, target = rpm > GOLDEN ? 1 : 0;
    gold += (target - gold) * (1 - Math.exp(-dt / 0.09));
    if (Math.abs(target - gold) < 0.004) gold = target;
    hi += (hiT - hi) * (1 - Math.exp(-dt / 0.14));
    if (Math.abs(hiT - hi) < 0.004) hi = hiT;
    if (user) {
      const t = win.performance.now();
      if (rpm < QUIET) quiet();
      else if (t - lastSfx >= 100) {
        lastSfx = t; spinOn = true;
        sfx({ name: 'spin', gain: +Math.min(1, (rpm / 300) ** 0.8).toFixed(2) });
      }
    }
    const moved = ang - drawn;       // blur over part of this frame's turn; slow frames blur as if they took 1/30 s
    draw(Math.max(-1, Math.min(1, moved * SHUTTER * (dt > 1 / 30 ? 1 / 30 / dt : 1))));
    if (run || drag || gold !== target || hi !== hiT || moved) raf = win.requestAnimationFrame(loop);
    else last = 0;
  }
  function kick() { if (!raf && !hold.size && gl3) raf = win.requestAnimationFrame(loop); }
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
    const { renderer, scene, camera, ball, tilt, U } = gl3;
    ball.rotation.y = ang;
    tilt.rotation.x = lat;
    U.uSmear.value = smear;
    U.uGold.value = gold;
    U.uHi.value = hi;
    scene.environmentIntensity = 1 - 0.6 * gold;   // at Golden speed the steel dims so the land reads as light
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
  async function init3D() {
    const canvas = doc.createElement('canvas');
    const ctx = THREE && canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: 'low-power' });
    if (!ctx) return fallback();
    const map = await new THREE.TextureLoader().loadAsync(here('globe.png')).catch(() => null);
    if (!map) return fallback();
    map.flipY = false; map.wrapS = THREE.RepeatWrapping; map.minFilter = THREE.LinearMipmapLinearFilter;
    canvas.setAttribute('aria-hidden', 'true');
    const renderer = new THREE.WebGLRenderer({ canvas, context: ctx, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
    room.traverse((o) => { if (o.isMesh && o.material.side === THREE.BackSide) o.material.color.setScalar(0.75); });   // greyer walls, brighter panels
    const env = pmrem.fromScene(room, 0.04);
    room.dispose(); pmrem.dispose();
    scene.environment = env.texture;
    scene.environmentRotation.y = 5;   // key light upper left
    const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10);
    camera.position.z = 1 / Math.sin(Math.atan(FILL * Math.tan(THREE.MathUtils.degToRad(FOV / 2))));
    const U = { uMap: { value: map }, uSmear: { value: 0 }, uGold: { value: 0 }, uHi: { value: 0 }, uId: { value: -1 }, uGoldColor: { value: new THREE.Color(0xffb81f) } };
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.62, 0.62, 0.63), metalness: 1, roughness: 0.3 });
    mat.onBeforeCompile = (shader) => patch(shader, U);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mat), tilt = new THREE.Group();
    tilt.add(ball);
    scene.add(tilt);
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); gl3 = null; if (raf) win.cancelAnimationFrame(raf); raf = 0; run = null; fallback(); });
    stage.prepend(canvas);
    gl3 = { renderer, scene, camera, ball, tilt, U };
    resize();
  }
  function fallback() {              // no WebGL: the still globe, and the stories work the same
    failed = true;
    again.textContent = cur ? 'Another country' : 'Show a country';   // nothing spins without WebGL, so the button says what it does
    quiet();
    stage.querySelector('canvas')?.remove();
    pin.hidden = true;
    const img = doc.createElement('img');
    img.src = here('globe-still.jpg'); img.width = img.height = 480; img.decoding = 'async'; img.alt = 'A steel globe';
    stage.prepend(img);
    for (const a of ['role', 'tabindex', 'aria-label']) stage.removeAttribute(a);
    root.classList.add('is-still');
  }

  /* ---- input ---- */
  const toss = (speed = 15 + Math.random() * 14) => { const a = Math.random() * TAU; launch(Math.cos(a) * speed, Math.sin(a) * speed); };
  again.addEventListener('click', () => { user = true; toss(); });
  stage.addEventListener('pointerdown', (e) => {
    if (!gl3 || hold.size || drag || e.button !== 0) return;
    user = true; run = null; pin.hidden = true; hiT = 0;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pts: [[e.timeStamp, e.clientX, e.clientY]] };
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
    kick();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id || hold.size) return;
    ang += (e.clientX - drag.x) / radius;   // the globe follows the finger, both ways
    lat += (e.clientY - drag.y) / radius;
    drag.x = e.clientX; drag.y = e.clientY;
    const cs = e.getCoalescedEvents?.();    // true sample times, even when frames are slow
    for (const c of cs && cs.length ? cs : [e]) drag.pts.push([c.timeStamp, c.clientX, c.clientY]);
    while (drag.pts.length > 2 && e.timeStamp - drag.pts[0][0] > 100) drag.pts.shift();
    kick();
  });
  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = drag.pts, a = p[0], b = p[p.length - 1], dt = (b[0] - a[0]) / 1000;
    drag = null;
    stage.classList.remove('is-dragging');
    const held = e.type === 'pointercancel' || e.timeStamp - b[0] > 80 || dt < 0.008;
    const fl = (i) => Math.max(-40, Math.min(40, (b[i] - a[i]) / dt / radius));   // a flick hands over its surface speed; a plain release drifts to the nearest
    if (held) launch(0); else launch(fl(1), fl(2));
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('keydown', (e) => {
    if (!gl3 || hold.size) return;
    const k = e.key, w0 = k === 'ArrowRight' ? 7 : k === 'ArrowLeft' ? -7 : 0, v0 = k === 'ArrowDown' ? 7 : k === 'ArrowUp' ? -7 : 0, any = k === ' ' || k === 'Enter';
    if (!w0 && !v0 && !any) return;
    e.preventDefault();
    user = true;
    if (any) toss(22); else launch(w0, v0);
  });

  /* ---- lifecycle ---- */
  doc.addEventListener('timestop', () => setHold('time', true));
  doc.addEventListener('timeresume', () => setHold('time', false));
  doc.addEventListener('visibilitychange', () => setHold('hidden', doc.hidden));
  new ResizeObserver(resize).observe(root);
  await init3D();
  new IntersectionObserver((es) => { setHold('view', !es[es.length - 1].isIntersecting); }).observe(root);
  const first = new IntersectionObserver((es, o) => {   // one toss when it comes into view, so the first thing it does is land
    if (!es[es.length - 1].isIntersecting || hold.has('time')) return;
    o.disconnect();
    if (!tossed) toss(8.4);
  }, { threshold: 0.6 });
  first.observe(stage);
}
