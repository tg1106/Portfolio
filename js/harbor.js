/* "Let's ship it" harbor at the bottom of the contact panel: a small strip of pixel sea (sand shore on top)
   with a sailboat. The boat is drawn in two canvases (back, front) with a pixel-art character between them,
   so the hull hides his lower body and he looks seated inside. The character waves and blinks.
   Colours follow the time-of-day palette. */
(function () {
  const B = window.Beach, cv = document.getElementById('harbor');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PX = 4, ROWS = 38, SHORE = 7;
  let W = 0, img, buf, clock = 0;

  const pack = (c, a = 255) => (a << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const hash = (x, y, z) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const BAYER = [0, 0.5, 0.75, 0.25];
  const mix = B.theme.mix;

  function resize() {
    W = Math.max(40, Math.ceil(cv.parentElement.clientWidth / PX));
    cv.width = W; cv.height = ROWS; cv.style.height = ROWS * PX + 'px';
    img = ctx.createImageData(W, ROWS); buf = new Uint32Array(img.data.buffer);
  }
  const shoreAt = (x, t) => SHORE + 1.3 * Math.sin(x * 0.07 + t * 0.8) + 0.8 * Math.sin(x * 0.19 - t * 1.3);

  function draw() {
    const p = B.theme.palette(B.theme.now());
    const time = Math.floor(clock * 6) / 6;
    const sea = [p.sea0, p.sea1, p.sea2, p.sea3].map((c) => c.map(Math.round));
    const foam = p.foam.map(Math.round), wet = p.wet.map(Math.round), glint = p.glint.map(Math.round);
    buf.fill(0);
    for (let x = 0; x < W; x++) {
      const sy = shoreAt(x, time), yi = Math.floor(sy);
      // wet sand above the waterline, fading upward
      for (let y = Math.max(0, yi - 6); y < yi; y++) {
        const lv = Math.ceil((1 - (yi - y) / 7) * 3) / 3;
        if (lv > 0) buf[y * W + x] = pack(wet, Math.round(255 * p.wetA * lv));
      }
      for (let y = yi; y < ROWS; y++) {
        const d = (y - sy) / (ROWS - sy);
        const lv = Math.max(0, Math.min(1, d + 0.04 * Math.sin(x * 0.06 + time * 0.4 + y * 0.5))) * 2.3;
        const i0 = Math.floor(lv), fr = lv - i0;
        let col = sea[3 - Math.min(2, i0 + (fr > BAYER[((y & 1) << 1) | (x & 1)] ? 1 : 0))];
        // swell lines drifting away from the shore
        for (let k = 0; k < 3; k++) {
          const row = yi + 8 + ((time * 2.2 + k * 9) % (ROWS - yi - 9));
          if (Math.round(row + Math.sin(x * 0.1 + k * 2 + time) * 1.2) === y && Math.sin(x * 0.2 + k * 4 + time * 0.3) > -0.3) col = mix(col, foam, 0.3);
        }
        const hv = hash(x >> 1, y, Math.floor(clock * 3));
        if (hv > 0.985) col = mix(col, foam, 0.4); else if (hv < 0.01) col = mix(col, sea[0], 0.35);
        if (y - yi < 3) col = foam;
        else if (y - yi === 3 && hash(x, y, Math.floor(time * 2)) > 0.35) col = foam;
        else if (y - yi === 4 && ((x + y) & 1)) col = mix(col, foam, 0.8);
        buf[y * W + x] = pack(col);
      }
    }
    ctx.putImageData(img, 0, 0);
    drawBoatWater(p, time);
  }

  /* ---------- the boat ---------- */
  const mk = (w, h, fn) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); fn((x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); });
    return c;
  };
  const BW = 96, BH = 58, GUN = 40;   // sprite size and gunwale row
  const paintBoat = (id, fn) => {
    const el = document.querySelector('.boat-' + id);
    if (!el) return;
    el.width = BW; el.height = BH;
    el.getContext('2d').drawImage(mk(BW, BH, fn), 0, 0);
  };
  paintBoat('back', (r) => {
    r(70, 4, 2, 37, '#5b3a1b');                                             // mast
    r(72, 2, 7, 4, '#d9402e'); r(79, 3, 2, 2, '#d9402e');                   // pennant
    for (let y = 0; y < 31; y++) {                                           // sail
      const w = Math.round(24 * (y / 30));
      r(72, 8 + y, w, 1, y % 9 === 8 ? '#d9d0b6' : '#f6f1e2');
      if (w > 3) r(72 + w - 3, 8 + y, 3, 1, '#e3dcc5');
    }
    r(6, GUN - 3, 84, 4, '#5b3a1b');                                         // far rim of the hull, behind him
  });
  paintBoat('front', (r) => {
    for (let y = 0; y < 17; y++) {
      const x0 = 4 + Math.floor(y * 0.6), x1 = 92 - Math.floor(y * y / 9);
      if (x1 <= x0) continue;
      r(x0, GUN + y, x1 - x0, 1, y < 2 ? '#d99a55' : y % 4 === 3 ? '#6b4423' : '#8a5a2b');
      if (y >= 5 && y < 7) r(x0, GUN + y, x1 - x0, 1, '#d9402e');            // red stripe
    }
    r(86, GUN - 4, 5, 6, '#8a5a2b'); r(90, GUN - 6, 4, 4, '#8a5a2b');         // raised bow
    r(86, GUN - 4, 5, 1, '#d99a55');
  });

  /* ---------- water in front of the hull ----------
     The sea is repainted over the lower hull so the boat sits IN the water. Each pixel copies the harbor pixel right behind it
     (same x, same y, read from the harbor canvas), so the layer is invisible except for what it adds: a wavy surface with foam crests,
     a dithered see-through band at the waterline, short wash off the bow and stern, and crisp pixel ripples that travel along the hull
     and spread under the keel. No blur, no tint. The boat bobs behind the layer (the layer does not move), so the waterline slides on the hull. */
  const WW = 116, WH = 24, SURF = 5, KEEL = SURF + 13, HULL_X0 = 20, HULL_X1 = 91, SPAN = 12;
  const BAYER16 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const wc = document.querySelector('.boat-water'), boatEl = document.querySelector('.boat');
  let wimg, wbuf;
  if (wc) { wc.width = WW; wc.height = WH; wimg = wc.getContext('2d').createImageData(WW, WH); wbuf = new Uint32Array(wimg.data.buffer); }
  function drawBoatWater(p, time) {
    if (!wc || !boatEl) return;
    wbuf.fill(0);
    const foam = p.foam.map(Math.round);
    const hb = cv.parentElement.getBoundingClientRect(), bb = boatEl.getBoundingClientRect();
    const left = bb.left - hb.left - 30, top = boatEl.offsetTop + 135;      // overlay origin in harbor css px (3px per overlay pixel)
    const behind = (x, y) => {                                              // the harbor pixel behind overlay pixel (x, y)
      const hx = Math.max(0, Math.min(W - 1, Math.floor((left + x * 3 + 1) / PX))), hy = Math.max(0, Math.min(ROWS - 1, Math.floor((top + y * 3 + 1) / PX)));
      const c = buf[hy * W + hx];
      return [c & 255, (c >> 8) & 255, (c >> 16) & 255];
    };
    const ripple = (x, y, base, step, dash) => {                            // a travelling dash pattern: crisp, one pixel tall
      if (((x + step) % dash) < dash * 0.45) wbuf[y * WW + x] = pack(mix(behind(x, y), foam, base));
    };
    for (let x = 0; x < WW; x++) {
      const inHull = x >= HULL_X0 && x <= HULL_X1, near = x >= HULL_X0 - SPAN && x <= HULL_X1 + SPAN;
      if (!near) continue;
      const surf = SURF + Math.sin(x * 0.33 + time * 2.4) * 0.8 + Math.sin(x * 0.13 - time * 1.5) * 0.7, yi = Math.round(surf);
      const crest = Math.sin(x * 0.5 + time * 3) > -0.3;
      if (inHull) {
        for (let y = yi; y <= KEEL; y++) {
          const d = y - yi;
          if (d < 2 && 0.72 <= BAYER16[((y & 3) << 2) | (x & 3)]) continue;   // see-through band right at the waterline
          let col = behind(x, y);
          if (d === 0 && crest) col = foam;
          else if (d === 1 && ((x + yi) & 1)) col = mix(col, foam, 0.55);
          wbuf[y * WW + x] = pack(col);
        }
        // ripples sliding along the hull, and wider ones spreading under the keel (they drift the other way)
        const k = Math.floor(time * 5);
        if (yi + 5 <= KEEL) ripple(x, yi + 5 + (Math.sin(x * 0.4 + time * 2) > 0.3 ? 1 : 0), 0.5, k, 10);
        ripple(x, KEEL + 2 + (Math.sin(x * 0.3 - time * 1.6) > 0 ? 1 : 0), 0.45, -k + 3, 12);
        if (x > HULL_X0 + 8 && x < HULL_X1 - 8) ripple(x, KEEL + 6, 0.35, k + 5, 14);
      }
      // wash off the bow and stern: short foam dashes that thin out with distance
      const lap = hash(x, Math.floor(time * 3), 5), out = inHull ? 0 : (x < HULL_X0 ? HULL_X0 - x : x - HULL_X1) / SPAN;
      if (!inHull && lap > 0.3 + out * 0.6) wbuf[Math.max(0, yi - 1) * WW + x] = pack(foam, 235);
      if (!inHull && lap > 0.5 + out * 0.4) ripple(x, yi + 2, 0.5, Math.floor(time * 4), 6);
      if (inHull && (x < HULL_X0 + 5 || x > HULL_X1 - 5) && lap > 0.3) wbuf[Math.max(0, yi - 1) * WW + x] = pack(foam, 235);
    }
    wc.getContext('2d').putImageData(wimg, 0, 0);
  }

  /* ---------- the pixel character (36x42): dark tousled hair, moustache, patterned pale-blue shirt ---------- */
  const HAIR = '#1c1512', SK = '#b27a52', SKD = '#8f5d3b', SH = '#d4e0ec', SHD = '#a9bfd8', PAT = '#e9dcc0', PL = '#6f9fcf', MOUTH = '#7a3b2c';
  function meFrame(f, blink) {
    const c = mk(36, 42, (r) => {
      const o = [0, 2, 0, -2][f];
      // waving arm (viewer's right): forearm, cuff, hand
      r(30, 17, 4, 9, SH); r(33, 17, 1, 9, SHD);
      r(30 + (o >> 1), 11, 4, 7, SH); r(30 + (o >> 1), 17, 4, 1, SHD);
      r(29 + o, 6, 6, 5, SK); r(28 + o, 8, 1, 2, SK); r(34 + o, 7, 1, 3, SKD); r(30 + o, 5, 1, 1, SK); r(32 + o, 5, 1, 1, SK);
      // resting arm and torso
      r(3, 26, 5, 16, SH); r(3, 26, 1, 16, SHD);
      r(6, 24, 24, 18, SH); r(27, 24, 3, 18, SHD); r(6, 24, 1, 18, SHD);
      for (let y = 25; y < 42; y++) for (let x = 7; x < 29; x++) {
        if ((x * 7 + y * 13) % 11 === 0) r(x, y, 2, 1, PAT);
        else if ((x * 5 + y * 3) % 13 === 0) r(x, y, 1, 1, '#7fa6d0');
      }
      r(17, 26, 2, 16, PL); r(17, 31, 2, 1, '#ffffff'); r(17, 36, 2, 1, '#ffffff');
      // neck and collar
      r(15, 22, 7, 2, SKD); r(13, 23, 5, 3, '#f3f7fb'); r(19, 23, 5, 3, '#f3f7fb');
      // head
      r(12, 8, 12, 14, SK); r(23, 9, 1, 12, SKD); r(14, 21, 9, 1, '#8a5a3b');
      r(10, 12, 2, 3, SKD); r(24, 12, 2, 3, SKD);
      r(11, 2, 14, 3, HAIR); r(10, 4, 16, 4, HAIR); r(13, 1, 3, 1, HAIR); r(19, 1, 4, 1, HAIR);
      r(10, 7, 2, 6, HAIR); r(24, 7, 2, 6, HAIR); r(12, 7, 12, 1, HAIR); r(14, 8, 2, 1, HAIR); r(19, 8, 3, 1, HAIR);
      r(13, 10, 4, 1, HAIR); r(19, 10, 4, 1, HAIR);
      if (blink) { r(13, 13, 4, 1, HAIR); r(19, 13, 4, 1, HAIR); }
      else { r(13, 12, 4, 2, '#ffffff'); r(15, 12, 2, 2, HAIR); r(19, 12, 4, 2, '#ffffff'); r(21, 12, 2, 2, HAIR); }
      r(18, 13, 1, 3, SKD); r(17, 16, 3, 1, SKD);
      r(14, 17, 9, 2, HAIR); r(16, 20, 5, 1, MOUTH); r(15, 19, 1, 1, MOUTH); r(21, 19, 1, 1, MOUTH);
    });
    outline(c);
    return c;
  }
  // dark outline around the silhouette, like the other sprites
  function outline(c) {
    const w = c.width, h = c.height, g = c.getContext('2d'), d = g.getImageData(0, 0, w, h), a = d.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!solid(x, y) && (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1))) edge.push((y * w + x) * 4);
    edge.forEach((i) => { a[i] = 38; a[i + 1] = 26; a[i + 2] = 24; a[i + 3] = 255; });
    g.putImageData(d, 0, 0);
  }

  /* ---------- Zoro strolling along the shore (24x34, faces right): green hair, three gold earrings, scar over the eye,
     open white shirt, green haramaki, black trousers, three swords at the hip ---------- */
  function zoroFrame(f, asleep) {
    const c = mk(24, 34, (r) => {
      const bob = asleep ? f : f & 1 ? -1 : 0, leg = asleep ? 0 : [4, 0, -4, 0][f];
      const GRN = '#3f9d4b', GRD = '#2a7437', SKN = '#d9a066', SKS = '#b9824c', WHT = '#f0ece0', WHS = '#c9c4b2', BLK = '#22282a';
      // swords: three scabbards slanting down and back from the left hip, gold guards, green hilts
      [['#f2f2f2', 0], ['#15191a', 1], ['#3a3f45', 2]].forEach(([col, k]) => {
        for (let i = 0; i < 11; i++) r(14 - i, 25 + bob + k + (i >> 1), 1, 1, col);
        r(14, 24 + bob + k, 1, 2, '#e6b43c'); r(15, 24 + bob + k, 1, 1, GRN);
      });
      // legs and boots go over the swords (the swing is in x only; the body bobs above them)
      r(10 - leg, 27, 4, 5, '#2e3638'); r(9 - leg, 31, 6, 2, '#15191a');
      r(10 + leg, 27, 4, 5, BLK); r(9 + leg, 31, 6, 2, '#15191a');
      // torso: white shirt, open chest with the scar, green haramaki
      r(7, 14 + bob, 11, 10, WHT); r(7, 14 + bob, 2, 10, WHS);
      r(11, 14 + bob, 4, 6, SKN); r(12, 15 + bob, 1, 5, '#8c4a3a');
      r(7, 23 + bob, 11, 4, GRN); r(7, 25 + bob, 11, 1, GRD);
      // arm swinging opposite to the front leg
      const sw = leg ? (leg > 0 ? 1 : -1) : 0;
      r(10 + sw * 2, 15 + bob, 4, 7, WHT); r(10 + sw * 2, 22 + bob, 4, 4, SKN); r(10 + sw * 2, 21 + bob, 4, 1, BLK);
      // head, hair, ear with three gold rings, scarred eye
      r(11, 12 + bob, 4, 2, SKS);
      r(8, 4 + bob, 10, 9, SKN); r(8, 8 + bob, 2, 3, SKS);
      r(7, 8 + bob, 1, 1, '#f2c14e'); r(7, 10 + bob, 1, 1, '#f2c14e'); r(8, 11 + bob, 1, 1, '#f2c14e');
      r(7, 2 + bob, 12, 3, GRN); r(8, 1 + bob, 9, 1, GRN); r(7, 4 + bob, 3, 5, GRN);
      r(9, 0 + bob, 2, 1, GRN); r(13, 0 + bob, 3, 1, GRN); r(17, 2 + bob, 2, 1, GRD); r(10, 5 + bob, 8, 1, GRD);
      r(14, asleep ? 8 + bob : 7 + bob, 3, 1, '#14181a'); r(15, 6 + bob, 1, 3, '#a8402f');   // asleep: the eye is a closed line
      r(18, 8 + bob, 1, 2, SKS); r(14, 11 + bob, 3, 1, '#7a3b2c');
    });
    outline(c);
    return c;
  }
  /* Zoro only strolls now and then: every ROLL_MS the harbor rolls a WALK_CHANCE (10 in 100) while it is on screen.
     Every NAP_EVERY-th walk (counted across visits) he stops mid-stride, falls asleep standing up for 3 seconds with a snot bubble
     growing from his nose, the bubble pops and he walks on. */
  const NAP_EVERY = 10, WALK_CHANCE = 0.1, ROLL_MS = 2000, SPEED = 60, ZW = 38, ZH = 34, SNORE = 3;
  const zoroCv = document.querySelector('.zoro');
  if (zoroCv) {
    zoroCv.width = ZW; zoroCv.height = ZH;
    const zg = zoroCv.getContext('2d');
    const walk = [0, 1, 2, 3].map((f) => zoroFrame(f)), nap = [0, 1].map((f) => zoroFrame(f, true));
    const dot = (x, y, col) => { zg.fillStyle = col; zg.fillRect(x, y, 1, 1); };
    function bubble(rad, bob) {                     // pixel bubble on the nose, pinned to the face
      const cx = 19 + rad, cy = 10 + bob;
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) {
        const d = Math.hypot(x, y);
        if (d <= rad) dot(Math.round(cx + x), Math.round(cy + y), d > rad - 1.1 ? '#7fb8e6' : '#e6f4ff');
      }
      if (rad > 3) dot(Math.round(cx - rad * 0.45), Math.round(cy - rad * 0.45), '#ffffff');
    }
    function pop(t) {                               // a ring of specks flying out
      const r = 6 + t * 24;
      for (let k = 0; k < 8; k++) dot(Math.round(25 + Math.cos(k * 0.785) * r * 0.6), Math.round(10 + Math.sin(k * 0.785) * r * 0.6), '#bfe4ff');
    }
    const still = () => { zg.clearRect(0, 0, ZW, ZH); zg.drawImage(walk[1], 0, 0); };
    still();
    if (!reduce) {
      let z = null, near = false;
      new IntersectionObserver((es) => { near = es[0].isIntersecting; }).observe(zoroCv.parentElement);
      let walks = 0;
      try { walks = +localStorage.getItem('zoroWalks') || 0; } catch (e) { /* storage blocked: count restarts each visit */ }
      const start = () => {
        walks++;
        try { localStorage.setItem('zoroWalks', walks); } catch (e) { /* ignore */ }
        z = { x: -ZW * 3, step: 0, nap: walks % NAP_EVERY === 0 ? null : false, napAt: 0.3 + Math.random() * 0.35, sleep: -1 }; zoroCv.style.display = 'block';
      };
      setInterval(() => { if (!z && near && !document.hidden && Math.random() < WALK_CHANCE) start(); }, ROLL_MS);
      setInterval(() => {
        if (!z) return;
        const dt = 0.05, width = zoroCv.parentElement.clientWidth;
        zg.clearRect(0, 0, ZW, ZH);
        if (z.sleep >= 0) {                         // standing asleep, then the bubble pops
          z.sleep += dt;
          const nod = Math.floor(z.sleep / 0.75) & 1;
          zg.drawImage(nap[nod], 0, 0);
          if (z.sleep < SNORE) bubble(1 + 5 * (z.sleep / SNORE) + 0.6 * Math.sin(z.sleep * 5), nod);
          else if (z.sleep < SNORE + 0.3) pop((z.sleep - SNORE) / 0.3);
          else { z.sleep = -1; z.nap = false; }
        } else {
          z.x += SPEED * dt; z.step += dt;
          zg.drawImage(walk[Math.floor(z.step / 0.19) % 4], 0, 0);
          if (z.nap === null && z.x > width * z.napAt) z.sleep = 0;
          if (z.x > width) { z = null; zoroCv.style.display = 'none'; return; }
        }
        zoroCv.style.left = z.x + 'px';
      }, 50);
    }
  }
  const meCv = document.querySelector('.boat-me');
  if (meCv) {
    meCv.width = 36; meCv.height = 42;
    const frames = [0, 1, 2, 3].map((f) => [meFrame(f, false), meFrame(f, true)]);
    const mg = meCv.getContext('2d');
    let step = 0;
    const show = () => { mg.clearRect(0, 0, 36, 42); mg.drawImage(frames[step % 4][step % 14 === 13 ? 1 : 0], 0, 0); };   // blink about every 3s
    show();
    if (!reduce) setInterval(() => { step++; show(); }, 230);
  }

  /* ---------- run ---------- */
  resize(); draw();
  if (reduce) { new ResizeObserver(() => { resize(); draw(); }).observe(cv.parentElement); return; }
  new ResizeObserver(() => { resize(); draw(); }).observe(cv.parentElement);
  let visible = false, last = performance.now();
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(cv);
  (function loop(now) {
    if (visible && now - last > 1000 / 12) { clock += (now - last) / 1000; last = now; draw(); }
    requestAnimationFrame(loop);
  })(last);
})();
