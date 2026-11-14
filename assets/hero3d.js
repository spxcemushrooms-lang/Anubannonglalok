/* 3D: เหรียญตราโรงเรียน + ฟองแก้ว + ประกาย (three.js) และแกลเลอรีวงแหวน 3 มิติ */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero 3D scene ---------- */
  const canvas = document.getElementById('hero3d');
  if (canvas && window.THREE && !reduce) {
    try {
      const T = THREE;
      const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
      renderer.outputEncoding = T.sRGBEncoding;
      const scene = new T.Scene();
      const cam = new T.PerspectiveCamera(35, 1, .1, 100);
      cam.position.set(0, 0, 12);

      scene.add(new T.AmbientLight(0xffffff, .55));
      const key = new T.DirectionalLight(0xfff1d0, 1.3); key.position.set(4, 6, 8); scene.add(key);
      const rim = new T.PointLight(0x6a8cff, 1.6, 30); rim.position.set(-6, -2, 4); scene.add(rim);
      const warm = new T.PointLight(0xff4d6a, 1.1, 30); warm.position.set(6, -3, 3); scene.add(warm);

      // simple gradient env map for glossy reflections
      const envCanvas = document.createElement('canvas'); envCanvas.width = 256; envCanvas.height = 128;
      const g = envCanvas.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.45, '#9fb6ff'); gr.addColorStop(.55, '#2a2468'); gr.addColorStop(1, '#ff8aa8');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
      const env = new T.CanvasTexture(envCanvas); env.mapping = T.EquirectangularReflectionMapping;

      // logo coin
      const coin = new T.Group();
      const tex = new T.TextureLoader().load('img/logo_badge.png'); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
      const R = 1.55, H = .22;
      const gold = new T.MeshStandardMaterial({ color: 0xe8b64c, metalness: 1, roughness: .28, envMap: env, envMapIntensity: 1.2 });
      const face = new T.MeshStandardMaterial({ map: tex, metalness: .2, roughness: .45, envMap: env, envMapIntensity: .5 });
      const body = new T.Mesh(new T.CylinderGeometry(R, R, H, 64, 1, true), gold); body.rotation.x = Math.PI / 2; coin.add(body);
      const rimRing = new T.Mesh(new T.TorusGeometry(R, .07, 16, 80), gold); rimRing.position.z = H / 2; coin.add(rimRing);
      const rimRing2 = rimRing.clone(); rimRing2.position.z = -H / 2; coin.add(rimRing2);
      const f1 = new T.Mesh(new T.CircleGeometry(R * .97, 64), face); f1.position.z = H / 2 + .001; coin.add(f1);
      const f2 = new T.Mesh(new T.CircleGeometry(R * .97, 64), face); f2.position.z = -H / 2 - .001; f2.rotation.y = Math.PI; coin.add(f2);
      scene.add(coin);

      // glass bubbles
      const glass = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .05, transparent: true, opacity: .28, envMap: env, envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: .05 });
      const bubbles = [];
      const spots = [[-5.2, 2.2, -1, .9], [5.4, 2.6, -2, .55], [4.6, -2.4, 0, 1.25], [-4.4, -2.8, -1.5, .7], [-1.8, 3.6, -3, .45], [2.2, -3.8, -2, .5], [6.8, .2, -4, .8], [-6.9, -.3, -4, .65]];
      spots.forEach(([x, y, z, r], i) => {
        const m = new T.Mesh(new T.SphereGeometry(r, 48, 32), glass);
        m.position.set(x, y, z); m.userData = { x, y, z, ph: i * 1.3, sp: .4 + (i % 3) * .15 };
        scene.add(m); bubbles.push(m);
        // inner highlight
        const hl = new T.Mesh(new T.SphereGeometry(r * .18, 16, 12), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 }));
        hl.position.set(-r * .45, r * .45, r * .7); m.add(hl);
      });

      // sparkle particles
      const N = 260, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = (Math.random() - .5) * 12; pos[i * 3 + 2] = (Math.random() - .5) * 8 - 2; }
      const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3));
      const pts = new T.Points(pg, new T.PointsMaterial({ color: 0xf7d98b, size: .06, transparent: true, opacity: .85 }));
      scene.add(pts);

      let mx = 0, my = 0, tx = 0, ty = 0, visible = true;
      addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
      if (window.DeviceOrientationEvent) addEventListener('deviceorientation', e => { if (e.gamma != null) { tx = e.gamma / 60; ty = (e.beta - 45) / 60; } });
      const hero = canvas.closest('.hero');
      new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(hero);

      function size() {
        const w = hero.clientWidth, h = hero.clientHeight;
        renderer.setSize(w, h, false); cam.aspect = w / h;
        // keep coin visible on narrow screens
        cam.position.z = w < 640 ? 17 : 12;
        cam.updateProjectionMatrix();
        // put the coin exactly where the (hidden) flat logo sits
        const logo = document.querySelector('.hero-logo');
        const hr = hero.getBoundingClientRect(), lr = logo.getBoundingClientRect();
        const cy = (lr.top - hr.top + lr.height / 2) / h, halfH = cam.position.z * Math.tan(T.MathUtils.degToRad(cam.fov / 2));
        coin.position.set(0, (0.5 - cy) * 2 * halfH, 0);
        coin.scale.setScalar((lr.height / h) * halfH * 2 / (R * 2) * 1.05);
      }
      size(); addEventListener('resize', size); setTimeout(size, 400); setTimeout(size, 3000);
      // hide the flat CSS orbs + flat logo now that 3D runs
      document.body.classList.add('has3d');

      const clock = new T.Clock();
      (function loop() {
        requestAnimationFrame(loop);
        if (!visible) return;
        const t = clock.getElapsedTime();
        mx += (tx - mx) * .05; my += (ty - my) * .05;
        coin.rotation.y = t * .7 + mx * 1.2;
        coin.rotation.x = Math.sin(t * .8) * .12 + my * .5;
        
        bubbles.forEach(b => {
          const u = b.userData;
          b.position.x = u.x + Math.sin(t * u.sp + u.ph) * .35 + mx * (1.5 + u.z * -.2);
          b.position.y = u.y + Math.cos(t * u.sp * .8 + u.ph) * .45 - my * 1.2;
        });
        pts.rotation.y = t * .02 + mx * .2; pts.rotation.x = my * .1;
        const sy = Math.min(1, scrollY / innerHeight);
        cam.position.y = -sy * 2; canvas.style.opacity = 1 - sy * .9;
        renderer.render(scene, cam);
      })();
    } catch (e) { /* WebGL not available: CSS orbs stay */ }
  }

  /* ---------- 3D ring gallery ---------- */
  const ring = document.getElementById('ring'), sec = document.getElementById('gallery');
  const src = document.getElementById('masonry');
  if (ring && src) {
    const build = () => {
      const items = [...src.querySelectorAll('a')];
      if (!items.length) return setTimeout(build, 100);
      const n = items.length;
      items.forEach((a, i) => {
        const card = document.createElement('button');
        card.className = 'ring-card';
        card.style.setProperty('--a', (360 / n * i) + 'deg');
        card.innerHTML = `<img src="${a.querySelector('img').getAttribute('src')}" alt="${a.dataset.cap || ''}" loading="lazy"><span>${a.dataset.cap || ''}</span>`;
        card.addEventListener('click', () => { if (!dragged) a.click(); });
        ring.appendChild(card);
      });
      const setR = () => {
        const w = Math.min(innerWidth * .26, 260), mob = innerWidth < 640;
        const cw = mob ? innerWidth * .42 : w;
        ring.style.setProperty('--cw', cw + 'px');
        ring.style.setProperty('--r', Math.round((cw * 1.08 * n) / (2 * Math.PI)) + 'px');
      };
      setR(); addEventListener('resize', setR);
    };
    build();
    let drag = 0, dragV = 0, down = false, lx = 0, dragged = false;
    const stage = document.getElementById('ringStage');
    stage.addEventListener('pointerdown', e => { down = true; dragged = false; lx = e.clientX; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - lx; lx = e.clientX; if (Math.abs(dx) > 2) dragged = true; dragV = dx * .25; drag += dragV; });
    addEventListener('pointerup', () => { down = false; setTimeout(() => dragged = false, 50); });
    (function tick() {
      const r = sec.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      if (!down) { dragV *= .94; drag += dragV; }
      const rot = -p * 300 + drag + (reduce ? 0 : performance.now() * .004);
      ring.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(-8deg) rotateY(${rot}deg)`;
      requestAnimationFrame(tick);
    })();
  }
})();
