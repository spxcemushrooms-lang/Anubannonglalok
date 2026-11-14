/* อนุภาค 3 มิติที่เปลี่ยนรูปตามการเลื่อน: ตราโรงเรียน → ลูกโลก → หนังสือ → หมวกบัณฑิต */
(() => {
  const canvas = document.getElementById('morph3d'), sec = document.getElementById('journey');
  if (!canvas || !sec || !window.THREE) return;
  const T = THREE, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 760;
  const N = mobile ? 5500 : 10000;

  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(38, 1, .1, 100); cam.position.set(0, 0, 9);

  const NAVY = new T.Color('#1c3fae'), RED = new T.Color('#d61f2f'), GOLD = new T.Color('#e8b64c'), INK = new T.Color('#0a1a44');
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- shape generators: each returns {p: Float32Array(N*3), c: Float32Array(N*3)} ---------- */
  function fill(fn) { const p = new Float32Array(N * 3), c = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const r = fn(i); p.set(r[0], i * 3); c.set(r[1].toArray(), i * 3); } return { p, c }; }

  // globe: sphere surface + latitude/longitude lines
  const globe = fill(i => {
    const R = 2.3; let x, y, z, col;
    if (i % 3 === 0) { // meridians / parallels
      const lat = (Math.floor(Math.random() * 7) - 3) * Math.PI / 8, lon = Math.random() * Math.PI * 2;
      const onMer = Math.random() < .5;
      const la = onMer ? rnd(-Math.PI / 2, Math.PI / 2) : lat, lo = onMer ? Math.floor(Math.random() * 8) * Math.PI / 4 : lon;
      x = R * Math.cos(la) * Math.cos(lo); y = R * Math.sin(la); z = R * Math.cos(la) * Math.sin(lo); col = GOLD;
    } else {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = R * rnd(.96, 1.01);
      x = r * Math.sqrt(1 - u * u) * Math.cos(th); y = r * u; z = r * Math.sqrt(1 - u * u) * Math.sin(th);
      col = (Math.sin(x * 2.1) * Math.cos(y * 1.7 + z) > .25) ? RED : NAVY; // pseudo continents
    }
    return [[x, y, z], col];
  });

  // open book: two curved pages with text lines
  const book = fill(i => {
    const side = i % 2 ? 1 : -1, u = Math.random(), v = rnd(-1.5, 1.5);
    const x = side * (.08 + u * 2.4), y = v * .95;
    const z = -Math.sin(u * Math.PI * .9) * .55 + (u < .04 ? -.1 : 0);
    let col = Math.random() < .55 ? NAVY : INK;
    const line = Math.abs(((v + 1.5) * 6) % 1 - .5) < .08 && u > .12 && u < .9;
    if (line) col = RED;
    if (u > .97 || Math.abs(v) > 1.46) col = GOLD; // page edges
    return [[x, y - .2, z], col];
  });

  // graduation cap: diamond board + skull cap + tassel
  const cap = fill(i => {
    const k = i / N; let x, y, z, col;
    if (k < .55) { // board (square rotated 45°) slightly tilted
      const a = rnd(-1.9, 1.9), b = rnd(-1.9, 1.9), th = Math.PI / 4;
      x = a * Math.cos(th) - b * Math.sin(th); z = a * Math.sin(th) + b * Math.cos(th); y = .9 + rnd(-.04, .04);
      col = (Math.abs(a) > 1.8 || Math.abs(b) > 1.8) ? GOLD : NAVY;
    } else if (k < .9) { // cap body
      const th = Math.random() * Math.PI * 2, h = Math.random();
      const r = 1.15 + h * .15; x = r * Math.cos(th); z = r * Math.sin(th); y = .85 - h * 1.25;
      col = h > .85 ? RED : INK;
    } else { // tassel
      const t = Math.random();
      if (t < .5) { x = t * 2 * 1.35; z = 0; y = .95; } else { x = 1.35 + rnd(-.06, .06); z = rnd(-.06, .06); y = .95 - (t - .5) * 2.6; }
      col = GOLD;
    }
    return [[x * .72, y * .72 - .25, z * .72], col];
  });

  // school logo from image pixels
  function logoShape(img) {
    const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data, cand = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = (y * S + x) * 4, r = d[k], gg = d[k + 1], b = d[k + 2];
      const dx = x / S - .5, dy = y / S - .5; if (dx * dx + dy * dy > .245) continue;
      const bright = (r + gg + b) / 3, sat = Math.max(r, gg, b) - Math.min(r, gg, b);
      if (bright > 225 && sat < 25) continue; // skip white paper
      if (bright < 30) continue;
      cand.push([dx, dy, new T.Color(r / 255, gg / 255, b / 255)]);
    }
    return fill(i => { const q = cand[i % cand.length]; const s = 4.4; return [[q[0] * s + rnd(-.01, .01), -q[1] * s + rnd(-.01, .01), rnd(-.12, .12)], q[2]]; });
  }

  const geo = new T.BufferGeometry();
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), rand = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) rand[i] = rnd(-1, 1);
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));

  // round soft sprite
  const sp = document.createElement('canvas'); sp.width = sp.height = 64;
  const sg = sp.getContext('2d'), grd = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.45, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = grd; sg.fillRect(0, 0, 64, 64);
  const mat = new T.PointsMaterial({ size: mobile ? .075 : .062, vertexColors: true, map: new T.CanvasTexture(sp), transparent: true, depthWrite: false, alphaTest: .02 });
  const points = new T.Points(geo, mat); scene.add(points);

  // glowing core (like the reference's ember)
  const glow = document.createElement('canvas'); glow.width = glow.height = 128;
  const gg2 = glow.getContext('2d'), g3 = gg2.createRadialGradient(64, 64, 0, 64, 64, 64);
  g3.addColorStop(0, 'rgba(255,214,120,.95)'); g3.addColorStop(.35, 'rgba(255,120,60,.45)'); g3.addColorStop(1, 'rgba(255,80,60,0)');
  gg2.fillStyle = g3; gg2.fillRect(0, 0, 128, 128);
  const core = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(glow), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  core.scale.set(3.4, 3.4, 1); scene.add(core);

  let shapes = null;
  const img = new Image(); img.src = 'img/logo_badge.png';
  img.onload = () => { shapes = [logoShape(img), globe, book, cap]; start(); };
  img.onerror = () => { shapes = [globe, globe, book, cap]; start(); };

  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    points.position.x = core.position.x = w > 900 ? 1.9 : 0;
    points.position.y = core.position.y = w > 900 ? 0 : 1.1;
    const s = w > 900 ? 1 : .82; points.scale.setScalar(s);
  }

  const steps = [...sec.querySelectorAll('.jr-step')], bar = document.getElementById('jrBar');
  let mx = 0, my = 0, tx = 0, ty = 0, visible = false, cur = -1;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(sec);

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function start() {
    size(); addEventListener('resize', size);
    const clock = new T.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      const t = clock.getElapsedTime();
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      const seg = p * (shapes.length - 1), i0 = Math.min(shapes.length - 2, Math.floor(seg));
      const raw = seg - i0;
      // hold each shape a little, then morph
      const k = reduce ? Math.round(raw) : ease(Math.min(1, Math.max(0, (raw - .2) / .6)));
      const A = shapes[i0], Bs = shapes[i0 + 1];
      const burst = Math.sin(k * Math.PI) * 1.6; // particles fly apart mid-morph (dissolve effect)
      for (let i = 0; i < N * 3; i++) {
        pos[i] = A.p[i] + (Bs.p[i] - A.p[i]) * k + rand[i] * burst + (reduce ? 0 : Math.sin(t * .8 + rand[i] * 6) * .015);
        col[i] = A.c[i] + (Bs.c[i] - A.c[i]) * k;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      mx += (tx - mx) * .05; my += (ty - my) * .05;
      points.rotation.y = (reduce ? 0 : Math.sin(t * .3) * .35) + mx * .8 + (i0 === 0 && k < .1 ? 0 : 0);
      points.rotation.x = my * .4;
      core.material.opacity = .25 + burst * .35 + (i0 === 0 ? 0 : .15);
      const step = Math.min(steps.length - 1, Math.round(seg));
      if (step !== cur) { cur = step; steps.forEach((s, j) => s.classList.toggle('on', j === step)); }
      bar.style.width = (p * 100) + '%';
      renderer.render(scene, cam);
    })();
  }
})();
