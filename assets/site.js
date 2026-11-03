/* Ayaz Khan homepage: the zoopraxiscope, the furlong rail, entrances. No dependencies. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var N = 11, STEP = 360 / N, AIR = { 2: 1, 3: 1 };

  /* ---- section entrances, once each ---- */
  var rise = d.querySelectorAll('.rise');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target, sib = [].slice.call(t.parentNode.children).filter(function (c) { return c.classList.contains('rise'); });
        t.style.transitionDelay = Math.max(sib.indexOf(t), 0) * 80 + 'ms';
        t.classList.add('in'); io.unobserve(t);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    rise.forEach(function (el) { io.observe(el); });
  } else rise.forEach(function (el) { el.classList.add('in'); });

  /* ---- the zoopraxiscope: one angle drives the disc, the screen, the sheet and the readings ---- */
  var disc = d.getElementById('disc'), spin = d.getElementById('spin'), horse = d.getElementById('horse'),
      sheet = d.getElementById('sheet'), btns = sheet.querySelectorAll('button'), play = d.getElementById('play'),
      out = d.getElementById('readout'), stage = d.getElementById('stage'),
      rF = d.getElementById('r-frame'), rT = d.getElementById('r-time'), rK = d.getElementById('r-track'), rH = d.getElementById('r-hoof');
  var rot = -2 * STEP, vel = 0, boost = 0, auto = false, held = false, inView = true, dragging = false, cur = 0, raf = 0, last = 0;
  var BASE = -STEP / 0.11;                       // one frame every 110 ms, turning anticlockwise

  function frameOf(a) { return ((Math.round(-a / STEP) % N) + N) % N + 1; }
  function render() {
    spin.setAttribute('transform', 'rotate(' + rot.toFixed(2) + ')');
    var f = frameOf(rot);
    if (f === cur) return;
    cur = f;
    horse.setAttribute('href', '#h' + f);
    btns.forEach(function (b, i) { b.setAttribute('aria-current', i + 1 === f ? 'true' : 'false'); });
    var air = !!AIR[f];
    rF.textContent = f + ' of 11';
    rT.textContent = ((f - 1) * 0.04).toFixed(2) + ' s';
    rK.textContent = (f - 1) * 27 + ' in';
    rH.textContent = air ? 'None' : 'At least one';
    rH.classList.toggle('air', air);
    var text = 'Frame ' + f + ' of 11, ' + (air ? 'all four hooves off the track' : 'at least one hoof on the track');
    disc.setAttribute('aria-valuenow', f); disc.setAttribute('aria-valuetext', text);
    if (!auto) out.textContent = text + '.';
  }
  function loop(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
    if (auto && !held && !dragging) {
      boost *= Math.pow(0.04, dt);              // scroll impulses fade within about a second
      vel = BASE * (1 + boost);
    } else if (!dragging) {
      vel *= Math.pow(0.02, dt);                 // a flicked disc coasts, then settles on a frame
      if (Math.abs(vel) < 20) { vel = 0; rot += (Math.round(rot / STEP) * STEP - rot) * Math.min(1, dt * 12); }
    }
    rot += vel * dt;
    render();
    if (inView && (auto || dragging || vel !== 0 || Math.abs(Math.round(rot / STEP) * STEP - rot) > 0.05)) raf = requestAnimationFrame(loop);
    else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function setAuto(on) {
    auto = on && !reduce.matches;
    play.textContent = auto ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', auto ? 'true' : 'false');
    kick();
  }
  function go(f) { setAuto(false); vel = 0; rot = nearestTurn(f); render(); out.textContent = disc.getAttribute('aria-valuetext') + '.'; kick(); }
  function nearestTurn(f) {                      // the angle for frame f closest to where the disc already is
    var target = -(f - 1) * STEP, k = Math.round((rot - target) / 360);
    return target + k * 360;
  }

  play.addEventListener('click', function () { setAuto(!auto); });
  d.getElementById('prev').addEventListener('click', function () { go(cur === 1 ? N : cur - 1); });
  d.getElementById('next').addEventListener('click', function () { go(cur === N ? 1 : cur + 1); });
  btns.forEach(function (b, i) { b.addEventListener('click', function () { go(i + 1); }); });
  sheet.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault(); go(e.key === 'ArrowRight' ? (cur % N) + 1 : (cur === 1 ? N : cur - 1)); btns[cur - 1].focus();
  });
  disc.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') go((cur % N) + 1);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') go(cur === 1 ? N : cur - 1);
    else if (k === 'Home') go(1); else if (k === 'End') go(N);
    else if (k === ' ' || k === 'Enter') setAuto(!auto);
    else return;
    e.preventDefault();
  });

  /* drag to turn: the disc follows the pointer's angle around its centre */
  var lastAng = 0, lastT = 0;
  function angleOf(e) {
    var r = disc.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * (548 / 1068);
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
  }
  disc.addEventListener('pointerdown', function (e) {
    dragging = true; setAuto(false); disc.classList.add('drag');
    disc.setPointerCapture(e.pointerId); lastAng = angleOf(e); lastT = e.timeStamp; vel = 0; kick();
  });
  disc.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var a = angleOf(e), da = a - lastAng;
    if (da > 180) da -= 360; else if (da < -180) da += 360;
    rot += da; var dt = Math.max((e.timeStamp - lastT) / 1000, 0.008);
    vel = reduce.matches ? 0 : da / dt; lastAng = a; lastT = e.timeStamp; render();
  });
  function release() { if (!dragging) return; dragging = false; disc.classList.remove('drag'); kick(); }
  disc.addEventListener('pointerup', release); disc.addEventListener('pointercancel', release);

  /* hover over the screen or the sheet holds the gallop (WCAG 2.2.2) */
  [stage, sheet].forEach(function (z) {
    z.addEventListener('pointerenter', function () { held = true; });
    z.addEventListener('pointerleave', function () { held = false; kick(); });
  });
  sheet.addEventListener('focusin', function () { held = true; });
  sheet.addEventListener('focusout', function () { held = false; kick(); });

  var hero = d.querySelector('.hero');
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    inView = es[0].isIntersecting; d.getElementById('rail').classList.toggle('on', !inView);
    if (inView) kick();
  }).observe(hero);
  reduce.addEventListener && reduce.addEventListener('change', function () { setAuto(!reduce.matches); });

  render();
  setTimeout(function () { setAuto(true); }, 900);   // hold on frame 3, the airborne one, then start the disc

  /* ---- the furlong rail: scrolling is a flip-book; the horse runs the page and passes a post per section ---- */
  var field = d.getElementById('rail-field'), rh = d.getElementById('rail-horse'), ruse = rh.querySelector('use'),
      prints = d.getElementById('prints'), posts = [].slice.call(d.querySelectorAll('.post')), postX = [],
      lastY = scrollY, lastFrame = 0, lastPrint = -99, ticking = false, W = 0;
  var NS = 'http://www.w3.org/2000/svg';
  function layout() {
    W = field.clientWidth;
    var max = Math.max(root.scrollHeight - innerHeight, 1);
    postX = posts.map(function (a) {
      var el = d.querySelector(a.getAttribute('href'));
      var p = Math.min(Math.max((el.getBoundingClientRect().top + scrollY - innerHeight * 0.35) / max, 0), 1);
      a.style.left = (p * 100).toFixed(2) + '%';
      return p;
    });
    while (prints.firstChild) prints.removeChild(prints.firstChild);
    lastPrint = -99; onScroll();
  }
  function onScroll() {
    ticking = false;
    var y = scrollY, max = Math.max(root.scrollHeight - innerHeight, 1), p = Math.min(Math.max(y / max, 0), 1), x = p * W;
    rh.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
    var f = reduce.matches ? 3 : (Math.floor(y / 36) % N) + 1;    // 36 px of scroll per frame
    if (f !== lastFrame) {
      ruse.setAttribute('href', '#h' + f);
      if (!reduce.matches && !AIR[f] && y > lastY && Math.abs(x - lastPrint) > 9) {    // a hoof is down: leave a print
        var c = d.createElementNS(NS, 'circle');
        c.setAttribute('cx', (x + 4).toFixed(1));
        c.setAttribute('cy', String((field.clientHeight - (f % 2 ? 9 : 13))));
        c.setAttribute('r', '1.8'); prints.appendChild(c); lastPrint = x;
        if (prints.childNodes.length > 180) prints.removeChild(prints.firstChild);
      }
      lastFrame = f;
    }
    var active = -1;
    postX.forEach(function (px, i) { if (p >= px - 0.004) active = i; });
    posts.forEach(function (a, i) { a.setAttribute('aria-current', i === active ? 'true' : 'false'); });
    if (auto && y !== lastY) { boost = Math.min(boost + Math.abs(y - lastY) / 60, 4); kick(); }   // scrolling spins the disc faster
    lastY = y;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  layout();

  /* ---- albumen grain on the screen: WebGL, loaded when the page is idle; the CSS grain tile is the fallback ---- */
  function loadGrain() {
    var s = d.createElement('script'); s.src = 'assets/grain.js'; s.async = true; d.head.appendChild(s);
  }
  addEventListener('load', function () {
    if (window.requestIdleCallback) requestIdleCallback(loadGrain, { timeout: 1500 }); else setTimeout(loadGrain, 300);
  });
})();
