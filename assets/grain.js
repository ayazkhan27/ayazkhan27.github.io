/* Albumen-print grain over the projection screen. WebGL1, ~1 KB of shader.
   Controls follow LightCraft's develop model: grain amount / size / roughness, vignette amount / midpoint / feather.
   New grain every 1/25 s (Muybridge's interval); one still frame under reduced motion or a time stop; stops off screen. */
(function () {
  var stage = document.getElementById('stage');
  if (!stage) return;
  var c = document.createElement('canvas'), gl = c.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return;                                   // the CSS grain tile stays as the fallback
  c.setAttribute('aria-hidden', 'true');
  var P = { amount: 0.16, size: 1.6, roughness: 0.55, vignette: 0.42, midpoint: 0.62, feather: 0.55, dust: 0.9993 };
  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;',
    'uniform vec2 res;uniform float frame;uniform vec3 k;uniform vec4 v;',
    'float h(vec2 q){q=fract(q*vec2(123.34,456.21));q+=dot(q,q+45.32);return fract(q.x*q.y);}',
    'float n(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}',
    'void main(){',
    ' vec2 uv=gl_FragCoord.xy/res; vec2 g=gl_FragCoord.xy/k.y+frame*17.13;',
    ' float grain=mix(n(g),h(g),k.z)-.5;',                                   // roughness: smooth value noise vs white noise
    ' float r=length((uv-.5)*vec2(res.x/res.y,1.)*1.15);',
    ' float vig=v.x*smoothstep(v.y-v.z*.5,v.y+v.z*.5,r);',
    ' float flick=.035*(h(vec2(frame,3.1))-.5);',                            // exposure varies a little from plate to plate
    ' float dust=step(v.w,h(floor(gl_FragCoord.xy/2.)+frame));',
    ' float dark=clamp(vig+flick+abs(grain)*k.x*(grain<0.?1.:.35)+dust*.55,0.,.9);',
    ' gl_FragColor=vec4(vec3(1.-dark),1.);',                                // shown with mix-blend-mode: multiply
    '}'].join('\n');
  function sh(t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(pr, 'res'), uFrame = gl.getUniformLocation(pr, 'frame');
  gl.uniform3f(gl.getUniformLocation(pr, 'k'), P.amount, P.size, P.roughness);
  gl.uniform4f(gl.getUniformLocation(pr, 'v'), P.vignette, P.midpoint, P.feather, P.dust);

  stage.appendChild(c); stage.classList.add('gl');
  var dpr = Math.min(devicePixelRatio || 1, 1.5), frame = 0, last = 0, on = true, raf = 0;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)'), still = document.documentElement.classList.contains('time-stopped');
  function size() {
    c.width = Math.round(stage.clientWidth * dpr); c.height = Math.round(stage.clientHeight * dpr);
    gl.viewport(0, 0, c.width, c.height); gl.uniform2f(uRes, c.width, c.height); draw();
  }
  function draw() { gl.uniform1f(uFrame, frame % 997); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function tick(t) {
    raf = 0;
    if (!on || reduce.matches || still) return;
    if (t - last >= 40) { last = t; frame++; draw(); }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && on && !reduce.matches && !still) raf = requestAnimationFrame(tick); }
  document.addEventListener('timestop', function () { still = true; });
  document.addEventListener('timeresume', function () { still = false; start(); });
  new IntersectionObserver(function (es) { on = es[0].isIntersecting; start(); }).observe(stage);
  addEventListener('resize', size);
  reduce.addEventListener && reduce.addEventListener('change', start);
  size(); start();
})();
