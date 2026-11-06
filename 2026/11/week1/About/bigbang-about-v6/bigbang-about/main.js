/* =========================================================
   LUMO — About
   Scene setup mirrors the reference implementation:
   - camera fov 45, z = 60, mouse wobble ±4 looking at z = 20
   - camera.y = -scrollY * (world height at z=0 / viewport height)
   - 90 rocks (54 floating cluster + 36 "bottom" rocks) and
     11 neons simulated with cannon-es: no gravity, cylinder
     bodies (r = scale*3, h = scale*1.7), walls x±60 / z±6,
     min linear speed 0.5 and min angular speed 0.2 per step,
     5 pinned hero bodies, attraction mode on the Big Bang dot
   - stars on a plane at z = -200 (twinkle + parallax)
   - 3-octave drifting noise fog
   - headline words drawn as planes (difference blend +
     grain dissolve around the cursor)
   ========================================================= */
(async () => {

const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
const CANNON = await import('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js');

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const map = (v, a, b, c, d) => (v - a) / (b - a) * (d - c) + c;

/* ---------------------------------------------------------
   Noise helpers (rock geometry + textures)
   --------------------------------------------------------- */
let seed = 7;
const srand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const perm = new Uint8Array(512);
{ const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(srand() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
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
   Constants taken from the reference
   --------------------------------------------------------- */
const C = { ROCK_RADIUS: 3, NEON_RADIUS: 8, ROCK_HEIGHT: 1.7, NEON_HEIGHT: 12, CENTER_RADIUS: 6, FLOATING_VELOCITY: 2, FLOATING_ANGULAR_VELOCITY: .12 };   // reference .2 → slower spin for liquid blobs
const TIER = 3;
const BOTTOM_ROCKS = Math.max(TIER, 2) * 12;            // 36
const TOP_ROCKS = 16;                                   // hero objects (reference: 54) — fewer, airier
const ROCKS = TOP_ROCKS + BOTTOM_ROCKS;
const BOTTOM_NEONS = 0;                                 // rods removed (reference: 6)
const NEONS = 0;                                        // rods removed (reference: 11)
const STARS = Math.max(TIER * 700, 700);                // 2100
const VISUAL = 3.5;
const BLOB_R = 3 * 1.05 * VISUAL / 1.15 * .72;               // visual blob radius per unit scale (smaller than the rocks)                                     // instanced scale factor in the reference vertex shader

// varied sizes: a few large hero drops, some medium, many small droplets — each with its own jitter
const rockScale = () => { const r = Math.random(); return r < .14 ? map(Math.random(), 0, 1, 1.05, 1.45) : r < .42 ? map(Math.random(), 0, 1, .5, .82) : r < .72 ? map(Math.random(), 0, 1, .26, .45) : map(Math.random(), 0, 1, .1, .22); };
const neonScale = () => { const r = Math.random(); return r < .4 ? 1.9 : r < .7 ? 2.1 : 2.5; };
// pinned bodies spread across the hero instead of stacking in the centre (reference ×4 on x/y)
const PINNED = [[-20, 14, -2], [-14, -16, 3], [10, 10, -4], [28, -6, 0], [22, 18, 4]];
const pinnedIndex = (i, rocks) => i < 3 ? i : i === rocks ? 3 : i === rocks + 1 ? 4 : null;
function clusterPos(v, wide = false, pin = null) {
  const s = wide ? 40 : 10; let o = s; const n = Math.random();
  if (n < .15) o = s * .2; if (n < .6) o = s * .5; if (n < .8) o = s * .8;   // same fall-through as the reference
  v.set(map(Math.random(), 0, 1, -o, o), map(Math.random(), 0, 1, -o, o), map(Math.random(), 0, 1, -o, o));
  if (pin !== null) v.set(...PINNED[pin]);
  return v;
}
function bottomPos(v) {
  const e = 40; let t = e; const s = Math.random();
  if (s < .15) t = e * .2; if (s < .6) t = e * .5; if (s < .8) t = e * .8;
  v.set(map(Math.random(), 0, 1, -t, t), map(Math.random(), 0, 1, -300, -70), map(Math.random(), 0, 1, -t, t));
  return v;
}

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
  screen: new THREE.Vector2(), screenL: new THREE.Vector2(),
  orbHover: 0, orbHoverT: 0, mode: 'floating', t0: performance.now(), wobble: 0
};

/* ---------------------------------------------------------
   Renderer, scene, camera
   --------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(S.dpr);
renderer.setClearColor(0xffffff, 1);           // white ground (reference: 0x0f0f0f)
renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, S.W / S.H, 1, 1000);
camera.position.set(0, 0, 60);
const lookAt = new THREE.Vector3(0, 0, 20);
const viewH = z => 2 * (camera.position.z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

// lighting lives in the glass shader + cube environment

const uiScene = new THREE.Scene();
const uiCam = new THREE.OrthographicCamera(0, S.W, 0, -S.H, -10, 10);

/* ---------------------------------------------------------
   Textures: rock diffuse/bump (speckled grey with scratches),
   tiled perlin for fog
   --------------------------------------------------------- */
function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const perlinTex = canvasTex(256, (g, N) => {          // tileable 3-channel noise (r, g, b octaves)
  const img = g.createImageData(N, N);
  const tile = (x, y, f, z) => { // seamless: blend four offset samples (classic tileable-noise trick)
    const s = f * 4 / N, u = x / N, v = y / N;
    const n = (px, py) => fbm(px * s, py * s, z, 4);
    const a = n(x, y), b = n(x - N, y), c = n(x, y - N), d = n(x - N, y - N);
    return lerp(lerp(a, b, u), lerp(c, d, u), v) * .5 + .5;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    img.data[i] = tile(x, y, 1.2, 0) * 255; img.data[i + 1] = tile(x, y, 1.6, 7) * 255; img.data[i + 2] = tile(x, y, 2.1, 13) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, false);

/* ---------------------------------------------------------
   Liquid Prism Bloom objects
   - soft liquid blobs (smooth, low-frequency deformation)
   - a pastel "studio" environment rendered once into a cube map
   - custom glass shader: per-channel refraction (dispersion),
     fresnel reflection, thin-film iridescence, specular glints,
     soft see-through centre; vertices wobble slowly like liquid
   --------------------------------------------------------- */
function blob(k) {
  const g = new THREE.SphereGeometry(1, 128, 96);   // indexed → smooth normals
  const p = g.attributes.position, v = new THREE.Vector3(), o = k * 13.7;
  const kind = k % 4;   // 0 round drop, 1 lens, 2 long drop, 3 pebble
  const S = [[1, .92, 1], [1.1, .62, .95], [1.35, .72, .78], [1.12, .7, .88]][kind];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let d = 1 + fbm(v.x * .7 + o, v.y * .7, v.z * .7, 2) * .2;
    if (kind === 2) d *= 1 + v.x * .16;               // tear-drop taper
    v.multiplyScalar(d);
    p.setXYZ(i, v.x * S[0], v.y * S[1], v.z * S[2]);
  }
  g.computeVertexNormals();
  return g;
}
const PEBBLES = Array.from({ length: 8 }, (_, k) => blob(k));
const neonGeo = new THREE.CapsuleGeometry(.12, 1, 8, 24);

// pastel studio environment → cube map
const envRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
(function buildEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec3 vDir;
      vec3 pal(float t){ return .62 + .38 * cos(6.28318 * (t + vec3(.0, .33, .67))); }   // pastel rainbow
      void main(){
        vec3 d = normalize(vDir);
        vec3 base = mix(vec3(.93, .93, .96), vec3(1.), smoothstep(-.6, .9, d.y));
        float a = atan(d.z, d.x) / 6.28318;
        float band = exp(-pow(d.y * 3.2, 2.));                     // rainbow ring around the horizon
        vec3 col = mix(base, pal(a * 2. + d.y * .4), band * .6);
        col = mix(col, pal(a + .5) * 1.05, smoothstep(.55, .95, sin(a * 18.85 + d.y * 4.) * .5 + .5) * .35);
        gl_FragColor = vec4(col, 1.);
      }`
  })));
  const box = (w, h, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); };
  box(30, 12, -18, 30, 18, 0xffffff);    // key softbox (top-left, like the reference light)
  box(10, 30, 34, 4, 10, 0xffffff);      // strip light right
  box(16, 8, 0, -30, 20, 0xfff0f7);      // warm bounce below
  box(8, 20, -36, -2, -14, 0xe8f8ff);    // cool rim back-left
  const cc = new THREE.CubeCamera(.1, 100, envRT);
  cc.update(renderer, env);
})();

const glassUniforms = { envMap: { value: envRT.texture }, uTime: { value: 0 }, uLight: { value: new THREE.Vector3(-.5, .7, .5).normalize() } };
const glassVert = `
  uniform float uTime; uniform float uWobble;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main(){
    vec3 seed = (modelMatrix * vec4(0., 0., 0., 1.)).xyz * .13;
    vec3 p = position;
    float w = sin(p.x * 2.1 + uTime * 1.1 + seed.x * 6.) + sin(p.y * 2.6 + uTime * .9 + seed.y * 5.) + sin(p.z * 1.9 + uTime * 1.3 + seed.z * 4.);
    p += normal * w * uWobble;                              // slow liquid wobble
    vec4 wp = modelMatrix * vec4(p, 1.);
    vP = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const glassFrag = `
  uniform samplerCube envMap; uniform float uTime; uniform vec3 uLight;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  vec3 pal(float t){ return .55 + .45 * cos(6.28318 * (t + vec3(.0, .33, .67))); }
  vec3 env(vec3 d, float lod){ return textureLod(envMap, vec3(-d.x, d.y, d.z), lod).rgb; }
  void main(){
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    if (!gl_FrontFacing) n = -n;
    float ndv = clamp(dot(n, v), 0., 1.);
    float fres = pow(1. - ndv, 3.);
    // dispersion: one refraction per channel
    vec3 rr = refract(-v, n, 1. / 1.42), rg = refract(-v, n, 1. / 1.47), rb = refract(-v, n, 1. / 1.53);
    vec3 refr = vec3(env(rr, 1.5).r, env(rg, 1.5).g, env(rb, 1.5).b);
    vec3 refl = env(reflect(-v, n), .5);
    // thin-film iridescence (hue shifts with viewing angle and a little with time)
    vec3 irid = pal(ndv * 1.6 + dot(n, vec3(.3, .2, .1)) + uTime * .02 + vP.y * .01);
    vec3 col = mix(refr, refl, .25 + fres * .6);
    col = mix(col, col * irid * 1.3, .32 * (1. - ndv * .5));
    col += pal(fres * 2. + .2) * fres * .22;               // coloured rim glow
    // glints from the key light
    vec3 h = normalize(uLight + v);
    col += pow(max(dot(n, h), 0.), 140.) * 1.6 + pow(max(dot(n, h), 0.), 18.) * .12;
    col = mix(vec3(1.), col, .82);                          // keep it airy on white
    float alpha = mix(.22, .92, smoothstep(.05, .8, 1. - ndv));
    gl_FragColor = vec4(col, alpha);
  }`;
function glassMaterial(wobble) {
  return new THREE.ShaderMaterial({
    uniforms: { ...glassUniforms, uWobble: { value: wobble } },
    vertexShader: glassVert, fragmentShader: glassFrag,
    transparent: true, depthWrite: true, side: THREE.FrontSide
  });
}
const rockMat = glassMaterial(.035);
const neonMat = glassMaterial(.0);

/* ---------------------------------------------------------
   Physics world (cannon-es) — same rules as the reference worker
   --------------------------------------------------------- */
const world = new CANNON.World();
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;
world.gravity.set(0, 0, 0);

const bodies = [], meshes = [], minLin = [];
const tmpV = new CANNON.Vec3();
const walls = {};
(function buildWalls() {
  const p = 100, t = 60, e = 1.2;
  const add = (half, pos) => { const b = new CANNON.Body({ type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(...half)) }); b.position.set(...pos); world.addBody(b); return b; };
  walls.top = add([p * e * .5, 2, t * e], [0, t * .5 * e, t * .5 * e - 10]);
  walls.left = add([2, t * e, t * e], [-p * e * .5, 0, t * .5 * e - 10]);
  walls.right = add([2, t * e, t * e], [p * e * .5, 0, t * .5 * e - 10]);
  walls.back = add([p * e * .5, t * e, 2], [0, 0, -16]);   // deeper slab (reference ±6) → stronger perspective / depth
  walls.front = add([p * e * .5, t * e, 2], [0, 0, 14]);
})();
// rotating kinematic core used in attraction mode
const core = new CANNON.Body({ type: CANNON.Body.KINEMATIC, shape: new CANNON.Cylinder(C.CENTER_RADIUS * .12, C.CENTER_RADIUS, 2.4 * C.CENTER_RADIUS, 12), angularDamping: 0 });
core.angularVelocity.set((Math.random() > .5 ? -1 : 1), (Math.random() > .5 ? -1 : 1), (Math.random() > .5 ? -1 : 1)); core.angularVelocity.normalize(); core.angularVelocity.scale(.1, core.angularVelocity);

const qAxis = new THREE.Vector3();
function populate() {
  const total = ROCKS + NEONS;
  const v = new THREE.Vector3();
  for (let i = 0; i < total; i++) {
    const isNeon = i >= ROCKS;
    const isBottom = (i >= ROCKS - BOTTOM_ROCKS && i < ROCKS) || i >= ROCKS + NEONS - BOTTOM_NEONS;
    const sc = isNeon ? neonScale() : rockScale();
    const pin = pinnedIndex(i, ROCKS);
    if (isBottom) bottomPos(v);
    else if (pin !== null) clusterPos(v, false, pin);
    else v.set(map(Math.random(), 0, 1, -38, 38), map(Math.random(), 0, 1, -24, 24), map(Math.random(), 0, 1, -13, 11));   // spread over the hero viewport, with depth
    qAxis.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const q = new THREE.Quaternion().setFromAxisAngle(qAxis, Math.random() * Math.PI * 2);

    const r = isNeon ? .45 * sc : sc * BLOB_R * .85;             // body ≈ visual size so blobs bump instead of overlapping
    const h = isNeon ? sc * VISUAL * 1.1 : sc * BLOB_R * .6;
    const mass = isNeon ? C.NEON_RADIUS : r * 5;
    const b = new CANNON.Body({ mass, angularDamping: .8, linearDamping: .7, shape: new CANNON.Cylinder(r, r, h, 10) });
    b.position.set(v.x, v.y, v.z); b.quaternion.set(q.x, q.y, q.z, q.w);
    b.isBottom = isBottom; b.isNeon = isNeon;
    // initial outward push (20) + damping rules from the reference
    tmpV.set(v.x, v.y, v.z); tmpV.normalize(); tmpV.scale(isBottom ? 0 : 20, tmpV); b.applyForce(tmpV);
    minLin[i] = .38;                                   // reference .5 → softer drift
    b.linearDamping = Math.min(.99, .84 + 1 / b.mass);
    if (5 / r < .12 && !isNeon) b.linearDamping = .9;
    if (isBottom) { b.linearDamping = .8; b.angularDamping = .1; b.angularVelocity.set(1, 1, 1); }
    if (pin !== null) { b.linearDamping = .99999; b.angularDamping = .9; b.mass = 100; b.updateMassProperties(); minLin[i] = .01; }
    world.addBody(b); bodies.push(b);

    let m;
    if (isNeon) {
      m = new THREE.Mesh(neonGeo, neonMat);
      m.scale.set(sc * .9, sc * VISUAL * 1.1, sc * .9);
    } else {
      m = new THREE.Mesh(PEBBLES[i % PEBBLES.length], rockMat);
      m.scale.setScalar(sc * BLOB_R);
    }
    m.position.copy(v); m.quaternion.copy(q);
    scene.add(m); meshes.push(m);
  }
}
const floating = bodies => bodies.filter(b => !b.isBottom);
function keepMin(vec, t) { if (vec.length() < t) { if (vec.length() < 1e-6) vec.set(Math.random() - .5, Math.random() - .5, Math.random() - .5); vec.normalize(); vec.scale(t, vec); } }
const attract = { x: 0, y: 0, sceneW: 0, windowW: 1, mouseX: 0 };
function setMode(mode, { repulse = false, explode = false, explodeCoef = 1.2 } = {}) {
  if (mode === 'floating') { if (world.bodies.includes(core)) world.removeBody(core); if (repulse) push(10); if (explode) push(6e4 * explodeCoef, 1e4 * explodeCoef); }
  else if (!world.bodies.includes(core)) world.addBody(core);
  S.mode = mode;
}
function push(strength, pinnedStrength = strength) {
  const wt = (attract.mouseX / attract.windowW * 2 - 1) * (attract.sceneW / 2) || 0;
  bodies.forEach((b, i) => { if (b.isBottom) return; tmpV.set(b.position.x - wt, b.position.y + attract.y, b.position.z); tmpV.normalize(); tmpV.scale(pinnedIndex(i, ROCKS) !== null ? pinnedStrength : strength, tmpV); b.applyForce(tmpV); });
}
function stepPhysics() {
  if (S.mode === 'floating') {
    bodies.forEach((b, i) => { keepMin(b.velocity, minLin[i]); keepMin(b.angularVelocity, C.FLOATING_ANGULAR_VELOCITY); });
  } else {
    const wt = (attract.mouseX / attract.windowW * 2 - 1) * (attract.sceneW / 2) / 2;
    core.position.set(wt, -attract.y, 0);
    floating(bodies).forEach(b => {
      const d = b.position.length() * 2;
      tmpV.set(b.position.x - wt, b.position.y + attract.y, b.position.z); tmpV.normalize(); tmpV.scale(-Math.min(12 * d, 2000), tmpV);
      b.applyForce(tmpV);
    });
    bodies.forEach((b, i) => { if (b.isBottom) { keepMin(b.velocity, minLin[i]); keepMin(b.angularVelocity, C.FLOATING_ANGULAR_VELOCITY); } });
  }
  world.fixedStep(1 / 60);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i], m = meshes[i];
    m.position.set(b.position.x, b.position.y, b.position.z);
    m.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
  }
}

/* ---------------------------------------------------------
   Stars (plane at z = -200) — reference shader logic
   --------------------------------------------------------- */
const starGeo = new THREE.BufferGeometry();
{
  const pos = new Float32Array(STARS * 3), factor = new Float32Array(STARS), fq = new Float32Array(STARS);
  for (let l = 0; l < STARS; l++) { pos.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 4 - 2], l * 3); factor[l] = map(Math.random(), 0, 1, .9, 1.1); fq[l] = map(Math.random(), 0, 1, 1, 5) / 2; }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('factor', new THREE.BufferAttribute(factor, 1));
  starGeo.setAttribute('fq', new THREE.BufferAttribute(fq, 1));
}
const starMat = new THREE.ShaderMaterial({
  uniforms: { uRadius: { value: new THREE.Vector2() }, uOffset: { value: 0 }, pixelRatio: { value: S.dpr }, time: { value: 0 } },
  vertexShader: `
    attribute float factor; attribute float fq;
    uniform float pixelRatio, uOffset, time; uniform vec2 uRadius; varying float vAlpha;
    float map(float v,float a,float b,float c,float d){ return (v-a)/(b-a)*(d-c)+c; }
    void main(){
      vec3 pos = position;
      gl_PointSize = map(pos.z * .5 + .1, 0., 1., 1., 3.) * pixelRatio;
      gl_PointSize += 2.;
      vAlpha = (sin(time * fq) + 1.) / 2.;
      gl_PointSize *= vAlpha;
      pos *= vec3(uRadius.x, uRadius.y, 1.);
      pos.y += uOffset * -pos.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
    }`,
  fragmentShader: `
    varying float vAlpha;
    void main(){ vec2 uv = gl_PointCoord.xy; float c = 1. - length(uv - .5); c = smoothstep(.5, .8, c); c *= vAlpha;
      if (c < .001) discard; gl_FragColor = vec4(vec3(.55, .55, .65), c * .35); }`,
  transparent: true, depthWrite: false
});
const stars = new THREE.Points(starGeo, starMat); stars.position.z = -200; stars.frustumCulled = false;
const starGroup = new THREE.Group(); starGroup.add(stars); scene.add(starGroup);

/* ---------------------------------------------------------
   Fog — reference shader (3 octaves of tiled noise, white alpha)
   --------------------------------------------------------- */
const fogMat = new THREE.ShaderMaterial({
  uniforms: { tNoise: { value: perlinTex }, time: { value: 0 }, resolution: { value: new THREE.Vector3() }, uTranslate: { value: 0 }, uOffset: { value: Math.random() * 5 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `
    varying vec2 vUv; uniform sampler2D tNoise; uniform float time, uTranslate, uOffset; uniform vec3 resolution;
    vec2 scaleUv(float scale){ vec2 uv = vUv; uv.x *= resolution.z; return ((uv + vec2(0., uTranslate)) - .5) * scale / resolution.z + .5; }
    void main(){
      vec2 uv1 = scaleUv(.25), uv2 = scaleUv(.5), uv3 = scaleUv(1.);
      vec2 speed = vec2(uOffset + time * .035 * .2, 0.);
      vec4 n1 = texture2D(tNoise, fract(uv1 + speed));
      vec4 n2 = texture2D(tNoise, fract(uv2 + speed * 2.));
      vec4 n3 = texture2D(tNoise, fract(uv3 + speed * 1.5));
      float fog = (n1.r * n2.g * 2.) * n3.b * 2.;
      vec3 tint = .82 + .18 * cos(6.28318 * (n2.r * 1.5 + vUv.x * .6 + vec3(0., .33, .67)));
      gl_FragColor = vec4(tint, pow(fog, 1.5) * .22);
    }`,
  transparent: true, depthWrite: false
});
const fog = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), fogMat);
fog.position.z = -40; fog.renderOrder = -1;
scene.add(fog);

/* ---------------------------------------------------------
   Headline words → canvas textures → planes
   (difference blend so rocks in front invert the letters,
    grain dissolve inside a radius around the cursor)
   --------------------------------------------------------- */
const FONTS = {
  'serif':       { css: '300 {s}px Fraunces' },
  'sans':        { css: '400 {s}px Outfit', upper: true },
  'sans-italic': { css: 'italic 400 {s}px Outfit', upper: true, skew: -0.2 },
  'sans-light':  { css: '400 {s}px Outfit' }
};
const words = [];
const grainTex = canvasTex(128, (g, N) => { const d = g.createImageData(N, N); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }, false);
grainTex.magFilter = THREE.NearestFilter;

function makeWord(el, idx) {
  const f = FONTS[el.dataset.font];
  const text = f.upper ? el.dataset.word.toUpperCase() : el.dataset.word;
  const boxH = el.offsetHeight, R = 2;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const fs = el.dataset.font === 'serif' ? boxH * 1.02 : boxH * 1.18;
  g.font = f.css.replace('{s}', fs * R);
  const m = g.measureText(text);
  const pad = 8 * R;
  c.width = Math.ceil(m.actualBoundingBoxRight + m.actualBoundingBoxLeft + pad * 2 + (f.skew ? boxH * R * .25 : 0));
  c.height = Math.ceil(boxH * R);
  g.font = f.css.replace('{s}', fs * R);
  g.fillStyle = '#fff';
  const base = c.height * (el.dataset.font === 'serif' ? .74 : .86);
  if (f.skew) g.setTransform(1, 0, f.skew, 1, -f.skew * base, 0);
  g.fillText(text, pad + m.actualBoundingBoxLeft, base);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter;
  const w = c.width / R, h = boxH;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tMap: { value: tex }, tGrain: { value: grainTex }, uMouse: { value: S.mouseL }, uRadius: { value: 78 },
                uSize: { value: new THREE.Vector2(w, h) }, uPos: { value: new THREE.Vector2() }, uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tMap, tGrain; uniform vec2 uMouse, uSize, uPos; uniform float uRadius, uAlpha;
      void main(){
        float a = texture2D(tMap, vUv).a;
        vec2 px = uPos + vec2(vUv.x, 1. - vUv.y) * uSize;
        float d = distance(px, uMouse);
        float grain = texture2D(tGrain, px / 128.).r;
        a *= mix(step(.62, grain), 1., smoothstep(uRadius * .35, uRadius, d));
        a *= uAlpha;
        gl_FragColor = vec4(vec3(15. / 255.), a);          // ink on the white ground
      }`,
    transparent: true, depthTest: false, depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  uiScene.add(mesh);
  words.push({ el, mesh, mat, w, h, delay: .55 + idx * .08 });   // enter: 550ms + 80ms stagger
}

/* ---------------------------------------------------------
   Layout
   --------------------------------------------------------- */
function contentOffset(el) { let x = 0, y = 0, n = el; while (n && n !== fixed) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y }; }
function layout() {
  S.W = innerWidth; S.H = innerHeight;
  renderer.setSize(S.W, S.H, false);
  camera.aspect = S.W / S.H; camera.updateProjectionMatrix();
  uiCam.right = S.W; uiCam.bottom = -S.H; uiCam.updateProjectionMatrix();
  S.worldH = viewH(0); S.pxToWorld = S.worldH / S.H;
  const sw = viewH(-200) * camera.aspect, sh = viewH(-200);
  starMat.uniforms.uRadius.value.set(sw * .5 * 1.2, sh * .5 * 1.2 * 2.5);
  const fh = viewH(fog.position.z) * 1.6; fog.scale.set(fh * camera.aspect, fh, 1);
  fogMat.uniforms.resolution.value.set(S.W, S.H, S.W / S.H);
  attract.sceneW = 5 * camera.aspect; attract.windowW = S.W;   // reference: |default camera z (5)| * aspect
  S.docH = fixed.offsetHeight;
  wrap.style.height = S.docH + 'px';
  document.body.style.height = S.docH + 'px';
  for (const w of words) { const o = contentOffset(w.el); w.x = o.x; w.y = o.y; }
}

/* ---------------------------------------------------------
   Interaction
   --------------------------------------------------------- */
addEventListener('scroll', () => { S.target = scrollY; }, { passive: true });
addEventListener('pointermove', e => {
  S.mouse.set(e.clientX, e.clientY);
  S.screen.set(e.clientX / S.W * 2 - 1, -(e.clientY / S.H * 2 - 1));
  attract.mouseX = e.clientX;
});
document.addEventListener('pointerleave', () => S.mouse.set(-9999, -9999));
zone.addEventListener('pointerenter', () => { S.orbHoverT = 1; setMode('attraction'); });
zone.addEventListener('pointerleave', () => { S.orbHoverT = 0; setMode('floating', { repulse: true }); });

// Skills: custom 80px cursor, 30px shift (400ms easeOutQuart), grain mask
const skills = $('#skills'), cursor = $('#skillsCursor');
for (const li of skills.querySelectorAll('li')) li.innerHTML = `<span>${li.innerHTML}</span>`;
{
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d');
  for (let y = 0; y < 160; y += 2) for (let x = 0; x < 160; x += 2) if (Math.random() > .45) { g.fillStyle = '#000'; g.fillRect(x, y, 2, 2); }
  document.documentElement.style.setProperty('--grain', `url(${c.toDataURL()})`);
}
skills.addEventListener('pointermove', e => {
  const r = skills.getBoundingClientRect();
  cursor.style.left = (e.clientX - r.left - 40) + 'px';
  cursor.style.top = (e.clientY - r.top - 40) + 'px';
  skills.classList.add('is-hover');
  for (const li of skills.querySelectorAll('li')) {
    const b = li.getBoundingClientRect(), sb = li.firstChild.getBoundingClientRect();
    li.classList.toggle('is-hover', e.clientY >= b.top && e.clientY < b.bottom);
    li.firstChild.style.setProperty('--mx', (e.clientX - sb.left) + 'px');
    li.firstChild.style.setProperty('--my', (e.clientY - sb.top) + 'px');
  }
});
skills.addEventListener('pointerleave', () => {
  skills.classList.remove('is-hover');
  for (const li of skills.querySelectorAll('li')) { li.classList.remove('is-hover'); li.firstChild.style.removeProperty('--mx'); li.firstChild.style.removeProperty('--my'); }
});

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
const easeOutCubic = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const euler = new THREE.Euler(), qWob = new THREE.Quaternion(), mVel = new THREE.Vector2(), prevScreen = new THREE.Vector2();

function tick(now) {
  const t = (now - S.t0) / 1000;

  // smooth scroll
  S.cur = lerp(S.cur, S.target, .1);
  if (Math.abs(S.cur - S.target) < .1) S.cur = S.target;
  fixed.style.transform = `translate3d(0,${-S.cur.toFixed(2)}px,0)`;
  S.mouseL.lerp(S.mouse, .25);

  // camera: y follows scroll 1:1 at z = 0; mouse wobble (amplitude 4, enabled over 1200ms after 800ms)
  const camY = -S.cur * S.pxToWorld;
  S.wobble = easeOutCubic((t - .8) / 1.2);
  S.screenL.lerp(S.screen, .1);
  mVel.subVectors(S.screenL, prevScreen); prevScreen.copy(S.screenL);
  camera.position.set(S.wobble * S.screenL.x * 4, camY + S.wobble * S.screenL.y * 4, 60);
  lookAt.set(0, camY, 20);
  camera.lookAt(lookAt);
  euler.set(0, 0, S.wobble * mVel.x * 60 * .0025 * 10); qWob.setFromEuler(euler); camera.quaternion.multiply(qWob);

  // attraction target follows the Big Bang dot
  const ob = orb.getBoundingClientRect();
  attract.y = ((ob.top + ob.height / 2) / S.H - .5) * 5;       // reference: (e - .5) * 5

  stepPhysics();
  glassUniforms.uTime.value = t;

  // stars + fog parallax
  starGroup.position.y = camY; starMat.uniforms.uOffset.value = -S.cur * .02; starMat.uniforms.time.value = t;
  fog.position.y = camY; fogMat.uniforms.uTranslate.value = -S.cur * S.pxToWorld / S.worldH * .25; fogMat.uniforms.time.value = t;

  // Big Bang dot
  S.orbHover = lerp(S.orbHover, S.orbHoverT, .08);
  const oh = S.orbHover;
  orb.style.transform = `scale(${.2 + .8 * easeOutExpo(oh)})`;
  orb.querySelector('.orb-glow').style.opacity = oh;
  orb.querySelector('.sparkle').style.opacity = oh;
  orb.querySelector('.sparkle').style.transform = `scale(${.4 + .6 * oh})`;
  orb.querySelector('.dot-bigbang').style.opacity = 1 - oh;

  // headline words
  for (const w of words) {
    const a = easeOutExpo(clamp((t - w.delay) / 1.2, 0, 1));
    w.mat.uniforms.uAlpha.value = a;
    const x = w.x, y = w.y - S.cur + (1 - a) * 40;
    w.mesh.position.set(x + w.w / 2, -(y + w.h / 2), 0);
    w.mat.uniforms.uPos.value.set(x, y);
  }

  renderer.clear();
  renderer.render(scene, camera);
  renderer.render(uiScene, uiCam);

  const trig = S.H * .9;
  for (const el of reveals) if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < trig) el.classList.add('is-in');
  scrollLabel.classList.toggle('is-hidden', S.cur > 30);

  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
try { await document.fonts.ready; await Promise.all([document.fonts.load('300 100px Fraunces'), document.fonts.load('400 100px Outfit'), document.fonts.load('italic 400 100px Outfit')]); } catch (_) {}
$$('#title .w').forEach(makeWord);
layout();
populate();
S.target = S.cur = scrollY;
document.documentElement.classList.add('is-loaded');
document.body.classList.add('is-ready');
requestAnimationFrame(tick);
// intro complete → explode outward (coef .3), as the reference does after its loader
setTimeout(() => setMode('floating', { explode: true, explodeCoef: .3 }), 100);
addEventListener('resize', layout);

})();
