/* =========================================================
   LUMO — About
   Three.js scene (asteroids, neon sticks, starfield, haze)
   + headline words rendered as WebGL planes with a
     difference blend and a grain dissolve around the cursor
   + lerped virtual scroll over native scroll height
   ========================================================= */
(() => {

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------------------------------------------------------
   Seeded random + 3D value noise (for rock displacement)
   --------------------------------------------------------- */
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + (b - a) * rand();

const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(lerp(lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
                   lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
              lerp(lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
                   lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
const fbm = (x, y, z, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= .5; } return s; };

/* ---------------------------------------------------------
   DOM refs / state
   --------------------------------------------------------- */
const canvas = $('#gl');
const fixed = $('#fixed');
const wrap = $('#scrollWrap');
const scrollLabel = $('#scrollLabel');
const zone = $('#bigbangZone');
const orb = $('#orb');
const reveals = $$('.reveal');

const S = {
  W: innerWidth, H: innerHeight, dpr: Math.min(devicePixelRatio || 1, 2),
  target: 0, cur: 0, docH: 0,
  mouse: new THREE.Vector2(-9999, -9999), mouseL: new THREE.Vector2(-9999, -9999),
  orbHover: 0, orbHoverT: 0, intro: 0, t0: performance.now()
};

/* ---------------------------------------------------------
   Renderer / scenes
   --------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(S.dpr);
renderer.setClearColor(0x0f0f0f, 1);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// 1) background haze (full-screen quad)
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const bgMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uRes: { value: new THREE.Vector2() } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    precision highp float; varying vec2 vUv;
    uniform float uTime, uScroll; uniform vec2 uRes;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.02; a*=.5; } return v; }
    void main(){
      vec2 p = vUv; p.x *= uRes.x/uRes.y;
      vec2 c = vec2(.5*uRes.x/uRes.y, .62);
      float d = length(p - c);
      float cloud = fbm(p*2.2 + vec2(uTime*.01, uScroll*.00012));
      float haze = smoothstep(1.05, .0, d) * (.55 + .6*cloud);
      vec3 col = mix(vec3(15./255.), vec3(.24), haze*.62);
      col += (h(gl_FragCoord.xy + fract(uTime)) - .5) * .025;   // film grain
      gl_FragColor = vec4(col, 1.);
    }`,
  depthWrite: false, depthTest: false
});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

// 2) 3D world
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, S.W / S.H, 0.1, 200);
camera.position.set(0, 0, 14);
const PX = () => (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / S.H; // world units per px at z=0

scene.add(new THREE.AmbientLight(0xffffff, 0.05));
const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(-6, 9, 6); scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 0.35); rim.position.set(8, -4, -3); scene.add(rim);

// 3) screen-space overlay (headline words) — pixel ortho camera
const uiScene = new THREE.Scene();
const uiCam = new THREE.OrthographicCamera(0, S.W, 0, -S.H, -10, 10);

/* ---------------------------------------------------------
   Rock surface texture (procedural grain / pits)
   --------------------------------------------------------- */
function rockTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d'); const img = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const v = fbm(x / 60, y / 60, 3.1, 5) * .5 + .5;
    const speck = rand() > .985 ? rand() * .5 : 0;
    const l = clamp(v * 0.75 + speck - (rand() > .992 ? .35 : 0), 0, 1) * 255;
    const i = (y * 512 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = l; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // fine scratches
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
  for (let i = 0; i < 60; i++) { g.beginPath(); const x = rand() * 512, y = rand() * 512; g.moveTo(x, y); g.lineTo(x + rr(-30, 30), y + rr(-30, 30)); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
const rockTex = rockTexture();
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8c8c8c, map: rockTex, bumpMap: rockTex, bumpScale: 0.6, roughness: 0.92, metalness: 0.0 });

function rockGeometry(s) {
  const g = new THREE.IcosahedronGeometry(1, 6);
  const p = g.attributes.position, v = new THREE.Vector3();
  const o = rr(0, 100);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = 1 + fbm(v.x * 1.1 + o, v.y * 1.1, v.z * 1.1, 4) * 0.55 + noise3(v.x * 4 + o, v.y * 4, v.z * 4) * 0.06;
    v.multiplyScalar(d); p.setXYZ(i, v.x * s.x, v.y * s.y, v.z * s.z);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------
   World population — spread along the page height
   --------------------------------------------------------- */
const rocks = [], neons = [];
function populate(docHpx) {
  const px = PX();
  const yTop = 2, yBot = -docHpx * px - 4;
  seed = 11;
  for (let i = 0; i < 46; i++) {
    const z = rr(-16, 6);
    const size = rr(.3, 1.9) * (z > 2 ? .75 : 1);
    const geo = rockGeometry(new THREE.Vector3(rr(.8, 1.3), rr(.55, 1), rr(.7, 1.1)));
    const m = new THREE.Mesh(geo, rockMat);
    const spread = (camera.position.z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (S.W / S.H);
    m.position.set(rr(-spread, spread) * 1.05, rr(yBot, yTop) * (1 + (z < 0 ? -z * .02 : 0)), z);
    m.scale.setScalar(size);
    m.rotation.set(rr(0, 6.28), rr(0, 6.28), rr(0, 6.28));
    m.userData = { base: m.position.clone(), size, rs: new THREE.Vector3(rr(-.12, .12), rr(-.15, .15), rr(-.08, .08)), f: rr(0, 6.28), amp: rr(.05, .18) };
    scene.add(m); rocks.push(m);
  }
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 22; i++) {
    const len = rr(.35, 2.4), r = rr(.018, .045);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), neonMat);
    const z = rr(-10, 4);
    const spread = (camera.position.z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (S.W / S.H);
    m.position.set(rr(-spread, spread), rr(yBot, yTop), z);
    m.rotation.set(rr(-.4, .4), rr(-.4, .4), rr(-1.4, 1.4));
    m.userData = { base: m.position.clone(), rz: m.rotation.z, rs: rr(-.05, .05), drift: rr(.04, .14), dir: rand() > .5 ? 1 : -1, f: rr(0, 6.28) };
    scene.add(m); neons.push(m);
  }
  // starfield
  const N = 1400, pos = new Float32Array(N * 3), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = rr(-40, 40); pos[i * 3 + 1] = rr(yBot - 10, yTop + 20); pos[i * 3 + 2] = rr(-60, -18); sz[i] = rr(.6, 2.4); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const sm = new THREE.ShaderMaterial({
    uniforms: { uDpr: { value: S.dpr }, uTime: { value: 0 } },
    vertexShader: `attribute float size; uniform float uDpr, uTime; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * mv;
        vA = .45 + .55*sin(uTime*1.3 + position.x*3.1 + position.y*1.7); gl_PointSize = size * uDpr; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor = vec4(vec3(1.), (1.-d*2.)*vA*.85); }`,
    transparent: true, depthWrite: false
  });
  scene.add(new THREE.Points(sg, sm)); S.starMat = sm;
}

/* ---------------------------------------------------------
   Headline words → canvas textures → planes (difference blend)
   --------------------------------------------------------- */
const FONTS = {
  'serif':       { css: '300 {s}px Fraunces',        k: 1.0 },
  'sans':        { css: '400 {s}px Outfit',          k: 1.0, upper: true },
  'sans-italic': { css: 'italic 400 {s}px Outfit',   k: 1.0, upper: true, skew: -0.2 },
  'sans-light':  { css: '400 {s}px Outfit',          k: 1.0 }
};
const words = [];
const grainTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const d = g.createImageData(128, 128);
  for (let i = 0; i < d.data.length; i += 4) { const v = rand() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t; })();

function makeWord(el) {
  const f = FONTS[el.dataset.font];
  const text = f.upper ? el.dataset.word.toUpperCase() : el.dataset.word;
  const boxW = el.offsetWidth, boxH = el.offsetHeight;
  const R = 2; // texture supersampling
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  // font size: cap/x-height fill the box like the reference word images
  const fs = el.dataset.font === 'serif' ? boxH * 1.02 : boxH * 1.18;
  g.font = f.css.replace('{s}', fs * R);
  const m = g.measureText(text);
  const pad = 8 * R;
  const tw = Math.ceil(m.actualBoundingBoxRight + m.actualBoundingBoxLeft + pad * 2 + (f.skew ? boxH * R * .25 : 0));
  c.width = tw; c.height = Math.ceil(boxH * R);
  g.font = f.css.replace('{s}', fs * R);
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  const base = c.height * (el.dataset.font === 'serif' ? .74 : .86);
  if (f.skew) g.setTransform(1, 0, f.skew, 1, -f.skew * base, 0);
  g.fillText(text, pad + m.actualBoundingBoxLeft, base);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const w = c.width / R, h = boxH;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex }, tGrain: { value: grainTex }, uMouse: { value: S.mouseL }, uRadius: { value: 78 },
                uSize: { value: new THREE.Vector2(w, h) }, uPos: { value: new THREE.Vector2() }, uAlpha: { value: 0 }, uHover: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      precision highp float; varying vec2 vUv;
      uniform sampler2D tMap, tGrain; uniform vec2 uMouse, uSize, uPos; uniform float uRadius, uAlpha, uHover;
      void main(){
        float a = texture2D(tMap, vUv).a;
        vec2 px = uPos + vec2(vUv.x, 1.-vUv.y) * uSize;               // pixel position of fragment
        float d = distance(px, uMouse);
        float grain = texture2D(tGrain, px / 128.).r;
        float m = smoothstep(uRadius*.35, uRadius, d);                // 0 inside, 1 outside
        a *= mix(step(.62, grain), 1., m);                            // grain dissolve around cursor
        a *= uAlpha;
        gl_FragColor = vec4(vec3(a), a);                              // premultiplied white
      }`,
    transparent: true, depthTest: false, depthWrite: false,
    // difference: out = src*(1-dst) + dst*(1-src)
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneMinusDstColorFactor, blendDst: THREE.OneMinusSrcColorFactor
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  uiScene.add(mesh);
  words.push({ el, mesh, mat, w, h, delay: words.length * 0.09 });
}

/* ---------------------------------------------------------
   Layout
   --------------------------------------------------------- */
function contentOffset(el) { // position of el inside the (untransformed) scroll layer
  let x = 0, y = 0, n = el;
  while (n && n !== fixed) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}
function layout() {
  S.W = innerWidth; S.H = innerHeight;
  renderer.setSize(S.W, S.H, false);
  camera.aspect = S.W / S.H; camera.updateProjectionMatrix();
  uiCam.right = S.W; uiCam.bottom = -S.H; uiCam.updateProjectionMatrix();
  bgMat.uniforms.uRes.value.set(S.W, S.H);
  S.docH = fixed.offsetHeight;
  wrap.style.height = S.docH + 'px';
  document.body.style.height = S.docH + 'px';
  for (const w of words) { const o = contentOffset(w.el); w.x = o.x; w.y = o.y; }
}

/* ---------------------------------------------------------
   Interaction
   --------------------------------------------------------- */
addEventListener('scroll', () => { S.target = scrollY; }, { passive: true });
addEventListener('pointermove', e => { S.mouse.set(e.clientX, e.clientY); });
document.addEventListener('pointerleave', () => S.mouse.set(-9999, -9999));
zone.addEventListener('pointerenter', () => S.orbHoverT = 1);
zone.addEventListener('pointerleave', () => S.orbHoverT = 0);

// Skills: custom cursor, hover shift and grain mask
const skills = $('#skills'), cursor = $('#skillsCursor');
for (const li of skills.querySelectorAll('li')) li.innerHTML = `<span>${li.innerHTML}</span>`;
{ // grain mask image for DOM text dissolve
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  for (let y = 0; y < 160; y += 2) for (let x = 0; x < 160; x += 2) if (Math.random() > .45) { g.fillStyle = '#000'; g.fillRect(x, y, 2, 2); }
  document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
}
skills.addEventListener('pointermove', e => {
  const r = skills.getBoundingClientRect();
  cursor.style.transform = '';
  cursor.style.left = (e.clientX - r.left - 40) + 'px';
  cursor.style.top = (e.clientY - r.top - 40) + 'px';
  skills.classList.add('is-hover');
  for (const li of skills.querySelectorAll('li')) {
    const b = li.getBoundingClientRect(), sb = li.firstChild.getBoundingClientRect();
    const inside = e.clientY >= b.top && e.clientY < b.bottom;
    li.classList.toggle('is-hover', inside);
    li.firstChild.style.setProperty('--mx', (e.clientX - sb.left) + 'px');
    li.firstChild.style.setProperty('--my', (e.clientY - sb.top) + 'px');
  }
});
skills.addEventListener('pointerleave', () => {
  skills.classList.remove('is-hover');
  for (const li of skills.querySelectorAll('li')) { li.classList.remove('is-hover'); li.firstChild.style.removeProperty('--mx'); li.firstChild.style.removeProperty('--my'); }
});

// Mail copy
const mailBtn = $('#mailBtn');
mailBtn.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(mailBtn.dataset.email); } catch (_) {}
  mailBtn.classList.add('is-copied');
  clearTimeout(mailBtn._t); mailBtn._t = setTimeout(() => mailBtn.classList.remove('is-copied'), 2000);
});
mailBtn.addEventListener('pointerleave', () => { clearTimeout(mailBtn._t); mailBtn.classList.remove('is-copied'); });

/* ---------------------------------------------------------
   Loop
   --------------------------------------------------------- */
const easeOutExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
const tmp = new THREE.Vector3();

function tick(now) {
  const t = (now - S.t0) / 1000;
  const dt = Math.min(.05, S.lastT ? t - S.lastT : .016); S.lastT = t;

  // virtual scroll
  S.cur = lerp(S.cur, S.target, 1 - Math.pow(1 - .1, dt * 60));
  if (Math.abs(S.cur - S.target) < .1) S.cur = S.target;
  fixed.style.transform = `translate3d(0,${-S.cur.toFixed(2)}px,0)`;
  S.mouseL.lerp(S.mouse, .25);

  // camera follows scroll
  const px = PX();
  camera.position.y = -S.cur * px;
  camera.position.x = lerp(camera.position.x, (S.mouse.x / S.W - .5) * .25, .04);

  // orb hover
  S.orbHover = lerp(S.orbHover, S.orbHoverT, .08);
  const oh = S.orbHover;
  orb.style.transform = `scale(${.2 + .8 * easeOutExpo(oh)})`;
  orb.querySelector('.orb-glow').style.opacity = oh;
  orb.querySelector('.sparkle').style.opacity = oh;
  orb.querySelector('.sparkle').style.transform = `scale(${.4 + .6 * oh})`;
  orb.querySelector('.dot-bigbang').style.opacity = 1 - oh;

  // orb world position (for the asteroid "pull")
  const ob = orb.getBoundingClientRect();
  const ndc = new THREE.Vector3((ob.left + ob.width / 2) / S.W * 2 - 1, -((ob.top + ob.height / 2) / S.H) * 2 + 1, .5).unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const pull = camera.position.clone().add(dir.multiplyScalar(9));

  for (const m of rocks) {
    const u = m.userData;
    m.rotation.x += u.rs.x * dt; m.rotation.y += u.rs.y * dt; m.rotation.z += u.rs.z * dt;
    tmp.copy(u.base); tmp.y += Math.sin(t * .4 + u.f) * u.amp; tmp.x += Math.cos(t * .3 + u.f) * u.amp * .6;
    // when the big bang is hovered, nearby asteroids are drawn toward the dot and grow
    const near = clamp(1 - u.base.distanceTo(pull) / 9, 0, 1);
    tmp.lerp(pull, oh * near * .35);
    m.position.copy(tmp);
    m.scale.setScalar(u.size * (1 + oh * near * .55));
  }
  for (const m of neons) {
    const u = m.userData;
    m.position.x = u.base.x + Math.sin(t * u.drift + u.f) * .6 * u.dir;
    m.position.y = u.base.y + Math.cos(t * u.drift * .8 + u.f) * .4;
    m.rotation.z = u.rz + Math.sin(t * .2 + u.f) * .25 + u.rs * t;
  }

  // words: follow scroll, fade in with stagger
  for (const w of words) {
    const a = easeOutExpo(clamp((t - .4 - w.delay) / 1.4, 0, 1));
    w.mat.uniforms.uAlpha.value = a;
    const x = w.x, y = w.y - S.cur + (1 - a) * 40;
    w.mesh.position.set(x + w.w / 2, -(y + w.h / 2), 0);
    w.mat.uniforms.uPos.value.set(x, y);
  }

  bgMat.uniforms.uTime.value = t; bgMat.uniforms.uScroll.value = S.cur;
  if (S.starMat) S.starMat.uniforms.uTime.value = t;

  renderer.clear();
  renderer.render(bgScene, bgCam);
  renderer.render(scene, camera);
  renderer.render(uiScene, uiCam);

  // reveals + scroll label
  const trig = S.H * .9;
  for (const el of reveals) if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < trig) el.classList.add('is-in');
  scrollLabel.classList.toggle('is-hidden', S.cur > 30);

  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
(document.fonts ? document.fonts.ready : Promise.resolve()).then(async () => {
  try { await Promise.all([document.fonts.load('300 100px Fraunces'), document.fonts.load('400 100px Outfit'), document.fonts.load('italic 400 100px Outfit')]); } catch (_) {}
  $$('#title .w').forEach(makeWord);
  layout();
  populate(S.docH);
  S.target = S.cur = scrollY;
  document.documentElement.classList.add('is-loaded');
  document.body.classList.add('is-ready');
  requestAnimationFrame(tick);
});
addEventListener('resize', () => { layout(); });
})();
