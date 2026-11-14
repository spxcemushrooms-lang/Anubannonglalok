(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;

  /* ---------- twinkling stars (intro + dark sections) ---------- */
  function starfield(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    let w, h, stars = [], raf, visible = true;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const density = opts.density || 9000;
    function resize() {
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / density);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .3,
        p: Math.random() * Math.PI * 2, s: Math.random() * .02 + .005,
        vy: -(Math.random() * .15 + .03), gold: Math.random() < .35
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        st.p += st.s; st.y += st.vy;
        if (st.y < -4) { st.y = h + 4; st.x = Math.random() * w; }
        const a = .35 + Math.sin(st.p) * .35 + .3;
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 7);
        ctx.fillStyle = st.gold ? `rgba(247,217,139,${a})` : `rgba(220,230,255,${a * .8})`;
        ctx.fill();
      }
      if (visible) raf = requestAnimationFrame(draw);
    }
    resize(); addEventListener('resize', resize);
    if (reduce) { draw(); cancelAnimationFrame(raf); return; }
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting; cancelAnimationFrame(raf); if (visible) draw();
    }).observe(canvas);
    draw();
  }
  starfield($('#stars'), { density: 5000 });
  $$('.sparkle').forEach(c => starfield(c, { density: 14000 }));

  /* ---------- confetti in school colours ---------- */
  function confetti() {
    if (reduce) return;
    const c = $('#confetti'), ctx = c.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cols = ['#d61f2f', '#e8b64c', '#f7d98b', '#1c3fae', '#ffffff'];
    const parts = Array.from({ length: Math.min(160, Math.round(W / 4)) }, () => ({
      x: W / 2, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 4,
      r: Math.random() * 6 + 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
      c: cols[Math.random() * cols.length | 0], shape: Math.random() < .3 ? 'star' : 'rect'
    }));
    let t = 0;
    (function loop() {
      ctx.clearRect(0, 0, W, H); t++;
      parts.forEach(p => {
        p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - t / 170);
        if (p.shape === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const rr = i % 2 ? p.r * .45 : p.r; const a = i * Math.PI / 5; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.fill();
        } else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (t < 170) requestAnimationFrame(loop); else ctx.clearRect(0, 0, W, H);
    })();
  }

  /* ---------- open the envelope ---------- */
  const intro = $('#intro'), env = $('#envelope');
  let opened = false;
  function openEnvelope() {
    if (opened) return; opened = true;
    intro.classList.add('opened'); env.classList.add('open');
    const heroVid = $('.hero-bg'); heroVid && heroVid.play().catch(() => {});
    setTimeout(confetti, 450);
    setTimeout(() => { intro.classList.add('gone'); body.classList.remove('locked'); body.classList.add('ready'); }, reduce ? 200 : 2300);
    setTimeout(() => intro.remove(), reduce ? 1200 : 3600);
  }
  $('#openBtn').addEventListener('click', openEnvelope);
  $('#seal').addEventListener('click', openEnvelope);
  env.addEventListener('click', openEnvelope);
  addEventListener('keydown', e => { if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEnvelope(); } });
  // links with a hash (e.g. shared #video link) skip the envelope
  if (location.hash && location.hash.length > 1) { opened = true; intro.remove(); body.classList.remove('locked'); body.classList.add('ready'); }

  /* ---------- nav, progress, back-to-top, active section ---------- */
  const nav = $('#nav'), prog = $('#progress'), toTop = $('#toTop');
  const links = $$('#menu a');
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const heroBg = $('.hero-bg');
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('solid', y > 60);
    prog.style.width = (max > 0 ? y / max * 100 : 0) + '%';
    toTop.classList.toggle('show', y > innerHeight);
    if (heroBg && y < innerHeight && !reduce) heroBg.style.transform = `scale(1.08) translateY(${y * .25}px)`;
    let cur = null;
    sections.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id; });
    links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#burger').addEventListener('click', () => body.classList.toggle('menu-open'));
  links.forEach(a => a.addEventListener('click', () => body.classList.remove('menu-open')));

  /* ---------- reveal on scroll (staggered) ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, sibs = [...el.parentElement.children].filter(c => c.classList.contains('reveal'));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 90 + 'ms';
      el.classList.add('in'); io.unobserve(el);
      $$('[data-count]', el).forEach(countUp);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  function countUp(el) {
    const end = +el.dataset.count, dur = 1600, t0 = performance.now();
    if (end === 0) { // ค่าเทอม 0 บาท: ไล่ลงจาก 9 เป็น 0
      (function tick(t) { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(9 * (1 - k)); if (k < 1) requestAnimationFrame(tick); })(t0);
      return;
    }
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(end * e); if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- 3D tilt on language cards ---------- */
  if (!reduce && matchMedia('(hover:hover)').matches) {
    $$('.tilt').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => card.style.transform = '');
    });
  }

  /* ---------- video player ---------- */
  const film = $('#film'), player = $('#player');
  $('#playBig').addEventListener('click', () => { film.play(); });
  film.addEventListener('play', () => player.classList.add('playing'));
  film.addEventListener('pause', () => { if (film.currentTime < .5) player.classList.remove('playing'); });
  film.addEventListener('ended', () => player.classList.remove('playing'));
  // pause when scrolled away
  new IntersectionObserver(([e]) => { if (!e.isIntersecting && !film.paused) film.pause(); }, { threshold: .2 }).observe(player);

  if (document.getElementById('slider')) {
  /* ---------- campus slider ---------- */
  const slider = $('#slider'), dots = $('#dots'), slides = $$('figure', slider);
  slides.forEach((_, i) => { const d = document.createElement('i'); d.onclick = () => go(i); dots.appendChild(d); });
  function idx() {
    const mid = slider.scrollLeft + slider.clientWidth / 2;
    let best = 0, bd = 1e9;
    slides.forEach((s, i) => { const c = s.offsetLeft + s.offsetWidth / 2, d = Math.abs(c - mid); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function go(i) {
    i = (i + slides.length) % slides.length; const s = slides[i];
    slider.scrollTo({ left: s.offsetLeft - (slider.clientWidth - s.offsetWidth) / 2, behavior: 'smooth' });
  }
  function mark() { const i = idx(); $$('i', dots).forEach((d, k) => d.classList.toggle('on', k === i)); }
  slider.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true }); mark();
  $$('.slider-nav button').forEach(b => b.onclick = () => { go(idx() + +b.dataset.dir); restart(); });
  let auto; const restart = () => { clearInterval(auto); if (!reduce) auto = setInterval(() => go(idx() + 1), 4500); };
  new IntersectionObserver(([e]) => e.isIntersecting ? restart() : clearInterval(auto)).observe(slider);
  slider.addEventListener('pointerenter', () => clearInterval(auto));
  slider.addEventListener('pointerleave', restart);
  // mouse drag (touch already scrolls natively)
  let down = false, sx = 0, sl = 0, moved = false;
  slider.addEventListener('mousedown', e => { down = true; moved = false; sx = e.pageX; sl = slider.scrollLeft; slider.classList.add('drag'); });
  addEventListener('mouseup', () => { if (!down) return; down = false; slider.classList.remove('drag'); go(idx()); });
  addEventListener('mousemove', e => { if (!down) return; const dx = e.pageX - sx; if (Math.abs(dx) > 4) moved = true; slider.scrollLeft = sl - dx; });

  }
  /* ---------- lightbox ---------- */
  const lb = $('#lightbox'), lbImg = $('img', lb), lbCap = $('figcaption', lb);
  const items = []; let cur = 0;
  function show(i) {
    cur = (i + items.length) % items.length;
    lbImg.src = items[cur].getAttribute('href'); lbCap.textContent = items[cur].dataset.cap || '';
  }
  items.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); show(i); lb.classList.add('on'); lb.setAttribute('aria-hidden', 'false'); }));
  const close = () => { lb.classList.remove('on'); lb.setAttribute('aria-hidden', 'true'); };
  $('.lb-close').onclick = close;
  $('.lb-prev').onclick = e => { e.stopPropagation(); show(cur - 1); };
  $('.lb-next').onclick = e => { e.stopPropagation(); show(cur + 1); };
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1);
  });
  let tx = 0;
  lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
})();

/* ---------- WHY: spotlight cards + paper plane that flies with scroll ---------- */
(() => {
  const grid = document.getElementById('whyGrid'); if (!grid) return;
  const cards = [...grid.querySelectorAll('.w-card')];
  grid.addEventListener('pointermove', e => {
    cards.forEach(c => { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px'); });
  });
  const plane = document.getElementById('plane');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { plane.style.display = 'none'; return; }
  // dashed trail
  const NS = 'http://www.w3.org/2000/svg';
  const trail = document.createElementNS(NS, 'svg'); trail.classList.add('plane-trail');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'rgba(232,182,76,.55)'); path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-dasharray', '6 8'); path.setAttribute('stroke-linecap', 'round');
  trail.appendChild(path); grid.appendChild(trail);
  let mouse = null, pts = [], last = { x: 0, y: 0, a: 0 };
  grid.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const r = grid.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; } });
  grid.addEventListener('pointerleave', () => mouse = null);
  function tick() {
    const r = grid.getBoundingClientRect(), W = r.width, H = r.height;
    if (r.bottom > 0 && r.top < innerHeight) {
      // progress of the grid through the viewport, 0..1
      const k = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + H)));
      // looping S-curve across the cards
      let tx = W * (.08 + .84 * k) + Math.sin(k * Math.PI * 3) * W * .06;
      let ty = H * (.1 + .8 * (.5 - .5 * Math.cos(k * Math.PI * 2.4))) ;
      if (mouse) { tx = mouse.x + 40; ty = mouse.y - 40; }
      const x = last.x + (tx - last.x) * .08, y = last.y + (ty - last.y) * .08;
      const ang = Math.atan2(y - last.y, x - last.x) * 180 / Math.PI;
      const a = Math.abs(x - last.x) + Math.abs(y - last.y) > .3 ? ang + 45 : last.a;
      plane.style.transform = `translate(${x - 28}px,${y - 28}px) rotate(${a}deg)`;
      last = { x, y, a };
      pts.push([x, y]); if (pts.length > 60) pts.shift();
      path.setAttribute('d', pts.length > 1 ? 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') : '');
    }
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ================= v2 ================= */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* hero slideshow */
  const slides = [...document.querySelectorAll('#heroSlides img')]; let si = 0;
  if (slides.length > 1 && !reduce) setInterval(() => { slides[si].classList.remove('on'); si = (si + 1) % slides.length; slides[si].classList.add('on'); }, 5000);
  /* orbs follow mouse a little */
  const orbs = [...document.querySelectorAll('#orbs i')];
  if (!reduce) addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    orbs.forEach((o, i) => { const k = (i % 3 + 1) * 14; o.style.setProperty('--mx', x * k + 'px'); o.style.setProperty('--my', y * k + 'px'); });
  }, { passive: true });

  /* music: start after the envelope is opened (a tap), pause while the film plays */
  const song = document.getElementById('song'), btn = document.getElementById('musicBtn'), film = document.getElementById('film');
  let wanted = true;
  const play = () => { song.volume = .55; song.play().then(() => btn.classList.add('playing')).catch(() => {}); };
  const pause = () => { song.pause(); btn.classList.remove('playing'); };
  ['openBtn', 'seal', 'envelope'].forEach(id => { const el = document.getElementById(id); el && el.addEventListener('click', () => { if (wanted) play(); }); });
  btn.addEventListener('click', () => { if (song.paused) { wanted = true; play(); } else { wanted = false; pause(); } });
  if (film) { film.addEventListener('play', pause); film.addEventListener('pause', () => { if (wanted) play(); }); film.addEventListener('ended', () => { if (wanted) play(); }); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) song.pause(); else if (wanted && film.paused && btn.classList.contains('playing')) song.play().catch(() => {}); });

  /* gallery from new photos */
  const caps = {0:'เดินแถวอย่างเป็นระเบียบ',1:'ตั้งใจร่วมกิจกรรม',2:'ขบวนแห่เทียนพรรษา',3:'คุณครูกับนักเรียน',4:'ร่วมงานประเพณี',5:'พิธีทางศาสนา',6:'กิจกรรมรวมในหอประชุม',9:'ขบวนนักเรียน',10:'ผู้ใหญ่ร่วมขบวน',11:'ไหว้อย่างงดงาม',12:'นั่งฟังอย่างตั้งใจ',13:'ร่วมกิจกรรมที่วัด',14:'กิจกรรมกับคุณครู',16:'สำรวมในพิธี',18:'ร่วมพิธีพร้อมกัน',19:'พนมมือไหว้',20:'ฟังเทศน์',21:'หอประชุมเต็มไปด้วยนักเรียน',23:'ภาพหมู่ที่วัด',26:'ร่วมขบวนอย่างสนุก',27:'ซ้อมการแสดง',31:'การแสดงของนักเรียน',30:'ภาพหมู่ครอบครัวอนุบาล',2.5:''};
  const order = [1,3,5,6,11,12,14,16,17,18,19,20,21,23,24,31];
  const capMore = {24:'คุณครูกับนักเรียน',17:'คุณครูดูแลอย่างใกล้ชิด',3:'คุณครูกับนักเรียน',22:'นาฏศิลป์',32:'ดนตรี',7:'โรลเลอร์สกี',8:'นักกีฬาตัวน้อย',15:'การแสดงบนเวที',29:'วงดุริยางค์',24:'คุณครูกับนักเรียน',17:'คุณครูกับนักเรียน',25:'สืบสานประเพณี'};
  const m = document.getElementById('masonry');
  if (m) {
    m.innerHTML = order.map(i => { const n = String(i).padStart(2, '0'); const c = caps[i] || capMore[i] || ''; return `<a href="img/new/n${n}.jpg" data-cap="${c}"><img src="img/new/thumb/n${n}.jpg" alt="${c}" loading="lazy"></a>`; }).join('');
    // lightbox for generated items
    const lb = document.getElementById('lightbox'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption');
    const items = [...m.querySelectorAll('a')]; let cur = 0;
    const show = i => { cur = (i + items.length) % items.length; lbImg.src = items[cur].getAttribute('href'); lbCap.textContent = items[cur].dataset.cap || ''; };
    items.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); show(i); lb.classList.add('on'); }));
    lb.querySelector('.lb-close').onclick = () => lb.classList.remove('on');
    lb.querySelector('.lb-prev').onclick = e => { e.stopPropagation(); show(cur - 1); };
    lb.querySelector('.lb-next').onclick = e => { e.stopPropagation(); show(cur + 1); };
    lb.addEventListener('click', e => { if (e.target === lb) lb.classList.remove('on'); });
    addEventListener('keydown', e => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') lb.classList.remove('on'); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    let tx = 0; lb.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
    lb.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); });
    // reveal gallery items as they enter
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .1 });
    items.forEach(a => { a.classList.add('reveal'); io.observe(a); });
  }

  /* scroll-driven: 3D fan + expanding image */
  const fanSec = document.getElementById('moments'), fan = [...document.querySelectorAll('#fan figure')];
  const exSec = document.getElementById('expand'), exF = document.getElementById('expandFrame'), exT = document.getElementById('expandText');
  const prog = sec => { const r = sec.getBoundingClientRect(); return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight))); };
  const ease = t => 1 - Math.pow(1 - t, 3);
  function frame() {
    if (!reduce) {
      if (fanSec) {
        const p = ease(prog(fanSec)), n = fan.length, mobile = innerWidth < 640;
        const spread = mobile ? 0.62 : 1;
        fan.forEach((f, i) => {
          const k = i - (n - 1) / 2;                 // -3..3
          const a = k * 14 * p;                      // fan angle
          const x = k * (mobile ? 70 : 150) * p * spread;
          const z = -Math.abs(k) * 90 * p;
          const y = Math.abs(k) * 18 * p;
          const ry = -k * 18 * p;
          f.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateZ(${a}deg) rotateY(${ry}deg)`;
          f.style.zIndex = 10 - Math.abs(Math.round(k));
        });
      }
      if (exSec) {
        const p = prog(exSec), e = ease(Math.min(1, p / .7));
        const mob = innerWidth < 640;
        const w0 = mob ? 70 : 34, h0 = mob ? 46 : 24;
        exF.style.setProperty('--w', `calc(${w0}vw + ${e * (100 - w0)}vw)`);
        exF.style.setProperty('--h', `calc(${h0}vw + ${e} * (100vh - ${h0}vw))`);
        exF.style.setProperty('--r', `${28 * (1 - e)}px`);
        exF.style.setProperty('--z', 1.25 - .25 * e);
        exF.style.setProperty('--o', e);
        exT.style.setProperty('--t', Math.max(0, (p - .55) / .3));
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

/* ================= v3 ================= */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* smooth scroll (Lenis) */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2) return; const el = document.querySelector(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: -60 });
    }));
    if (document.body.classList.contains('locked')) lenis.stop();
    const ob = new MutationObserver(() => { if (!document.body.classList.contains('locked')) { lenis.start(); ob.disconnect(); } });
    ob.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  /* split headings into words (Thai-aware) */
  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
  document.querySelectorAll('.split').forEach(h => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const parts = seg ? [...seg.segment(n.textContent)].map(x => x.segment) : n.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = p; w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h);
    h.querySelectorAll('.w>span').forEach((s, k) => s.style.transitionDelay = (k * 45) + 'ms');
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
  document.querySelectorAll('.split, .wipe').forEach(el => io.observe(el));

  /* custom cursor + magnetic buttons */
  if (fine && !reduce) {
    const c = document.getElementById('cursor'), label = c.querySelector('span');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; }, { passive: true });
    (function loop() { cx += (x - cx) * .2; cy += (y - cy) * .2; c.style.transform = `translate(${cx}px,${cy}px)`; requestAnimationFrame(loop); })();
    const big = (sel, txt) => document.addEventListener('pointerover', e => {
      const t = e.target.closest(sel); if (!t) return;
      c.classList.add('big'); label.textContent = txt;
      t.addEventListener('pointerleave', () => c.classList.remove('big'), { once: true });
    });
    big('#masonry a, .td-img, .hz-card', 'ดู');
    big('.lcard', 'ฟัง');
    big('.word', 'พลิก');
    document.querySelectorAll('.btn, .say, .open-btn, #musicBtn, .c-card').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      b.addEventListener('pointerleave', () => b.style.transform = '');
    });
  }

  /* speech */
  const song = document.getElementById('song');
  const voices = () => (window.speechSynthesis ? speechSynthesis.getVoices() : []);
  if (window.speechSynthesis) speechSynthesis.onvoiceschanged = voices;
  function say(text, lang, el) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\s[a-zāáǎàēéěèīíǐìōóǒòūúǔùü]+$/i, ''));
    u.lang = lang; const v = voices().find(v => v.lang.replace('_', '-').startsWith(lang.slice(0, 2))); if (v) u.voice = v;
    u.rate = lang.startsWith('th') ? .95 : .9;
    const vol = song && !song.paused; if (vol) song.volume = .15;
    if (el) el.classList.add('speaking');
    u.onend = u.onerror = () => { if (el) el.classList.remove('speaking'); if (vol) song.volume = .55; };
    speechSynthesis.speak(u);
  }
  document.querySelectorAll('.lcard').forEach(card => {
    card.addEventListener('click', () => say(card.dataset.say, card.dataset.lang, card));
    card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); card.style.setProperty('--mx', e.clientX - r.left + 'px'); card.style.setProperty('--my', e.clientY - r.top + 'px'); });
  });
  const LBL = ['TH', 'EN', '中'];
  document.querySelectorAll('.word').forEach(w => {
    const list = JSON.parse(w.dataset.w); let k = 0;
    w.addEventListener('click', () => {
      k = (k + 1) % list.length;
      w.classList.remove('flip'); void w.offsetWidth; w.classList.add('flip');
      setTimeout(() => { w.querySelector('b').textContent = list[k][0]; w.querySelector('i').textContent = LBL[k]; w.classList.remove('l1', 'l2'); if (k) w.classList.add('l' + k); }, 300);
      say(list[k][0], list[k][1]);
    });
  });

  /* horizontal pinned scroll */
  const hz = document.getElementById('explore'), track = document.getElementById('hzTrack');
  if (hz && track && !reduce) {
    const cards = [...track.children];
    (function tick() {
      const r = hz.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
      const max = track.scrollWidth - innerWidth + Math.max(16, (innerWidth - 1180) / 2) * 2;
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
      cards.forEach((c, i) => c.querySelector('img').style.setProperty('--px', `${-8 - p * 8 + i}%`));
      requestAnimationFrame(tick);
    })();
  }
})();
