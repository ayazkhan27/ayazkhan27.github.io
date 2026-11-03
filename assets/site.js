/* Ayaz Khan homepage: the zoopraxiscope, the route rail, entrances, and the race layer
   (time stop, sound, lazy JoJo modules, To Be Continued). No dependencies. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var N = 11, STEP = 360 / N, AIR = { 2: 1, 3: 1 };
  var LAND = { 4: 1, 6: 1, 7: 1, 9: 1 };           // frames where a hoof meets the track (strikes at 3.85, 5.65, 6.75, 9.3)
  function sfx(name) { d.dispatchEvent(new CustomEvent('sfx', { detail: { name: name } })); }
  function frozen() { return root.classList.contains('time-stopped'); }

  /* ---- section entrances, once each ---- */
  var rise = d.querySelectorAll('.rise, [data-enter]');
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
  var rot = -2 * STEP, vel = 0, boost = 0, auto = false, wasAuto = false, held = false, inView = true, dragging = false,
      cur = 0, raf = 0, last = 0, lastHoof = 0;
  var BASE = -STEP / 0.11;                       // one frame every 110 ms, turning anticlockwise

  function frameOf(a) { return ((Math.round(-a / STEP) % N) + N) % N + 1; }
  function render() {
    spin.setAttribute('transform', 'rotate(' + rot.toFixed(2) + ')');
    var f = frameOf(rot);
    if (f === cur) return;
    var first = !cur;
    cur = f;
    horse.setAttribute('href', '#h' + f);
    btns.forEach(function (b, i) { b.setAttribute('aria-current', i + 1 === f ? 'true' : 'false'); });
    var air = !!AIR[f];
    rF.textContent = f + ' of 11';
    rT.textContent = ((f - 1) * 0.04).toFixed(2) + ' s';
    rK.textContent = (f - 1) * 27 + ' in';
    rH.textContent = air ? 'None' : 'At least one';
    rH.classList.toggle('air', air);
    var text = 'Frame ' + f + ', ' + (air ? 'all four hooves off the track' : 'at least one hoof on the track');
    disc.setAttribute('aria-valuenow', f); disc.setAttribute('aria-valuetext', text.replace(',', ' of 11,'));
    if (!auto) out.textContent = text.replace(',', ' of 11,') + '.';
    var now = performance.now();                 // a hoof lands: ask for the sound (the audio module decides if sound is on)
    if (!first && LAND[f] && (auto || dragging) && now - lastHoof > 60) { lastHoof = now; sfx('hoof'); }
  }
  function loop(t) {
    raf = 0;
    var dt = last ? Math.min((t - last) / 1000, 0.05) : 0; last = t;
    if (auto && !held && !dragging) {
      boost *= Math.pow(0.04, dt);              // scroll impulses fade within about a second
      vel = BASE * (1 + boost);
    } else if (!dragging) {
      vel = frozen() ? 0 : vel * Math.pow(0.02, dt);   // a flicked disc coasts, then settles on a frame
      if (Math.abs(vel) < 20) { vel = 0; rot += (Math.round(rot / STEP) * STEP - rot) * Math.min(1, dt * 12); }
    }
    rot += vel * dt;
    render();
    if (inView && (auto || dragging || vel !== 0 || Math.abs(Math.round(rot / STEP) * STEP - rot) > 0.05)) raf = requestAnimationFrame(loop);
    else last = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }
  function setAuto(on) {
    auto = on && !reduce.matches && !frozen();
    play.textContent = auto ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', auto ? 'true' : 'false');
    kick();
  }
  function go(f) { setAuto(false); vel = 0; rot = nearestTurn(f); render(); out.textContent = disc.getAttribute('aria-valuetext') + '.'; kick(); }
  function nearestTurn(f) {                      // the angle for frame f closest to where the disc already is
    var target = -(f - 1) * STEP, k = Math.round((rot - target) / 360);
    return target + k * 360;
  }

  play.addEventListener('click', function () { if (frozen()) setTime(false); setAuto(!auto); });
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
    else if (k === ' ' || k === 'Enter') { if (frozen()) setTime(false); setAuto(!auto); }
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
  setTimeout(function () { if (!frozen()) setAuto(true); }, 900);   // hold on frame 3, the airborne one, then start the disc

  /* ---- the rail is the route, San Diego to New York: scrolling is a flip-book, the horse passes a post per stage ---- */
  var field = d.getElementById('rail-field'), rh = d.getElementById('rail-horse'), ruse = rh.querySelector('use'),
      prints = d.getElementById('prints'), posts = [].slice.call(d.querySelectorAll('.post')), postT = [], postX = [],
      lastY = scrollY, lastFrame = 0, lastPrint = -99, ticking = false, W = 0;
  var NS = 'http://www.w3.org/2000/svg', narrow = matchMedia('(max-width: 640px)');
  function layout() {
    W = field.clientWidth;
    var max = Math.max(root.scrollHeight - innerHeight, 1);
    postT = posts.map(function (a) {           // where on the scroll each stage begins
      var el = d.querySelector(a.getAttribute('href'));
      return Math.min(Math.max((el.getBoundingClientRect().top + scrollY - innerHeight * 0.35) / max, 0), 1);
    });
    postX = posts.map(function (a, i) {        // where on the route its post stands: evenly spaced, so labels never collide
      var x = (i + 1) / (posts.length + 1);
      a.style.left = (x * 100).toFixed(2) + '%';
      return x;
    });
    while (prints.firstChild) prints.removeChild(prints.firstChild);
    lastPrint = -99; onScroll();
  }
  function routeX(p) {                          // scroll fraction to route fraction: the horse reaches post i as stage i begins, and stops at the last
    var T = [0].concat(postT, [1]), X = [0].concat(postX, [postX[postX.length - 1]]);
    for (var i = 1; i < T.length; i++) if (p <= T[i]) return X[i - 1] + (T[i] > T[i - 1] ? (p - T[i - 1]) / (T[i] - T[i - 1]) : 1) * (X[i] - X[i - 1]);
    return 1;
  }
  function onScroll() {
    ticking = false;
    var y = scrollY, max = Math.max(root.scrollHeight - innerHeight, 1), p = Math.min(Math.max(y / max, 0), 1), x = routeX(p) * W;
    var active = -1;
    postT.forEach(function (pt, i) { if (p >= pt - 0.004) active = i; });
    posts.forEach(function (a, i) { a.setAttribute('aria-current', i === active ? 'true' : 'false'); });
    if (frozen()) { lastY = y; return; }          // time is stopped: the horse holds where it is
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
    if (auto && y !== lastY) { boost = Math.min(boost + Math.abs(y - lastY) / 60, 4); kick(); }   // scrolling spins the disc faster
    lastY = y;
  }
  /* on a phone the posts are too close to tap, so they become marks only; the top navigation and the stage lines remain */
  function postMode() {
    posts.forEach(function (a) {
      if (narrow.matches) { a.setAttribute('tabindex', '-1'); a.setAttribute('aria-hidden', 'true'); }
      else { a.removeAttribute('tabindex'); a.removeAttribute('aria-hidden'); }
    });
  }
  narrow.addEventListener && narrow.addEventListener('change', postMode); postMode();
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', layout);
  addEventListener('load', layout);
  if (window.ResizeObserver) new ResizeObserver(function () { if (field.clientWidth !== W) layout(); }).observe(field);   // the end labels settle after the fonts
  layout();

  /* ---- time stop (WCAG 2.2.2): one control pauses every moving thing on the page ---- */
  var timeBtns = [].slice.call(d.querySelectorAll('[data-time]')), status = d.getElementById('status'),
      tsay = d.getElementById('tsay'), sayT = 0;
  function paintTime() {
    var s = frozen();
    timeBtns.forEach(function (b) {
      var lbl = b.querySelector('.lbl'), jp = b.querySelector('.jp');
      if (lbl) lbl.textContent = s ? 'Resume time' : 'Stop time';
      if (jp) jp.textContent = s ? '時は動き出す' : '時よ止まれ';
      if (b.hasAttribute('aria-label')) b.setAttribute('aria-label', s ? 'Resume time' : 'Stop time');
    });
  }
  function setTime(stop, quiet) {
    if (stop === frozen()) return;
    if (stop) {
      wasAuto = auto;
      if (!quiet && !reduce.matches) {
        root.classList.add('ts-flash');
        setTimeout(function () { root.classList.remove('ts-flash'); }, 170);
      }
      root.classList.add('time-stopped');
      setAuto(false); vel = 0;
      d.dispatchEvent(new CustomEvent('timestop'));
      if (!quiet) { sfx('timestop'); status.textContent = 'Time stopped. Everything on the page holds still until you resume it.'; }
    } else {
      root.classList.remove('time-stopped');
      d.dispatchEvent(new CustomEvent('timeresume'));
      sfx('timeresume');
      status.textContent = 'Time resumed.';
      tsay.classList.add('on'); clearTimeout(sayT);
      sayT = setTimeout(function () { tsay.classList.remove('on'); }, 1600);
      if (wasAuto) setAuto(true);
      onScroll();
    }
    try { sessionStorage.setItem('ak-time', stop ? 'stopped' : ''); } catch (e) {}
    paintTime();
  }
  timeBtns.forEach(function (b) { b.addEventListener('click', function () { setTime(!frozen()); }); });
  try { if (sessionStorage.getItem('ak-time') === 'stopped') setTime(true, true); } catch (e) {}

  /* ---- sound: off by default; the audio module owns the toggle, the rail copy mirrors it ---- */
  var soundBtns = [].slice.call(d.querySelectorAll('[data-sound]'));
  function url(p) { return new URL(p, d.baseURI).href; }
  if (root.hasAttribute('data-audio') && soundBtns.length) {
    import(url('assets/jojo/audio.js')).then(function (m) {
      m.initAudio({ toggle: soundBtns[0] });
      soundBtns.slice(1).forEach(function (b) { b.addEventListener('click', function () { soundBtns[0].click(); }); });
      var mirror = function () { soundBtns.slice(1).forEach(function (b) { b.setAttribute('aria-pressed', soundBtns[0].getAttribute('aria-pressed') || 'false'); }); };
      new MutationObserver(mirror).observe(soundBtns[0], { attributes: true, attributeFilter: ['aria-pressed'] });
      mirror();
      soundBtns.forEach(function (b) { b.hidden = false; });
    }).catch(function () {});                       // no audio module: the toggles stay hidden
  }

  /* ---- JoJo modules: each loads as its section comes within ~600 px, so Three.js waits for Gyro's lesson ---- */
  function css(href) {
    return new Promise(function (ok) {
      var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = href;
      l.onload = l.onerror = function () { ok(); }; d.head.appendChild(l);
    });
  }
  function mount(slot) {
    var name = slot.getAttribute('data-jj'), opts = {};
    try { opts = JSON.parse(slot.getAttribute('data-jj-opts') || '{}'); } catch (e) {}
    var host = d.createElement('div'); host.className = 'jj-host';
    Promise.all([import(url('assets/jojo/' + name + '.js')), slot.hasAttribute('data-jj-css') ? css(url('assets/jojo/' + name + '.css')) : 0])
      .then(function (r) { slot.insertBefore(host, slot.hasAttribute('data-jj-keep') ? slot.firstChild : null); return r[0].mount(host, opts); })
      .then(function (api) { slot.jj = api; slot.classList.add('jj-on'); })
      .catch(function () { if (host.parentNode) host.parentNode.removeChild(host); slot.classList.add('jj-off'); });   // the static content stays
  }
  var slots = [].slice.call(d.querySelectorAll('[data-jj]'));
  if ('IntersectionObserver' in window) {
    var lazy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { lazy.unobserve(e.target); mount(e.target); } });
    }, { rootMargin: '600px 0px' });
    slots.forEach(function (s) { lazy.observe(s); });
  } else slots.forEach(mount);

  /* ---- in-page jumps land where they aim, even when modules above the target mount on the way ---- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var el = d.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    var tries = 0, seen = -1, took = false;
    function mine() { took = true; }
    ['wheel', 'touchstart', 'keydown'].forEach(function (t) { addEventListener(t, mine, { once: true, passive: true }); });
    (function settle() {
      setTimeout(function () {
        if (took) return;                              // the visitor is scrolling: leave them be
        if (scrollY !== seen) { seen = scrollY; return settle(); }
        var off = el.getBoundingClientRect().top, max = root.scrollHeight - innerHeight;
        if (Math.abs(off) > 2 && scrollY < max - 1 && tries++ < 3) {
          el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' }); seen = -1; settle();
        }
      }, 160);
    })();
  });

  /* ---- To Be Continued: the arrow slides in when it shows; the page freezes in sepia once the footer arrives
     (the contact block sits above the tint and stays in colour), and scrolling back up releases it ---- */
  var tbc = d.getElementById('tbc'), foot = d.querySelector('.foot');
  if (tbc && foot && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) tbc.classList.add('on'); }, { threshold: 0.4 }).observe(tbc);
    new IntersectionObserver(function (es) {
      var e = es[0];
      if (e.isIntersecting) {
        if (!root.classList.contains('tbc-freeze')) { root.classList.add('tbc-freeze'); sfx('tbc'); }
      } else if (e.boundingClientRect.top > 0) root.classList.remove('tbc-freeze');
    }, { threshold: 0.5 }).observe(foot);
  } else if (tbc) tbc.classList.add('on');

  /* ---- albumen grain on the screen: WebGL, loaded when the page is idle; the CSS grain tile is the fallback ---- */
  function loadGrain() {
    var s = d.createElement('script'); s.src = 'assets/grain.js'; s.async = true; d.head.appendChild(s);
  }
  addEventListener('load', function () {
    if (window.requestIdleCallback) requestIdleCallback(loadGrain, { timeout: 1500 }); else setTimeout(loadGrain, 300);
  });
})();
