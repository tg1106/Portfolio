/* Pixel sea across the top of the page: low-res canvas scaled up with nearest-neighbour.
   Layers: sky (stars, clouds, sun/moon) > sea (bands, rolling swells, glitter path) > ships and jumping
   fish, mermaids and Poseidon with splashes and ripples > shore foam and wet sand that fades into the page sand.
   The canvas is full-bleed and sits behind the nav and hero; the sand below it is just the page background.
   Preview helpers: ?ship forces the pirate ship soon, ?kraken forces the kraken, ?myth makes every jump a mermaid or Poseidon. */
(function () {
  const B = window.Beach;
  const PX = 4;            // css px per art pixel
  const H = 134;           // art rows of the sea band (the hero text is laid out against this: 536px, see --sea-h in styles.css)
  const HOR = 24;          // horizon row
  const S0 = 112;          // mean shoreline row
  const TIDE = 4.5;        // tide swing in rows
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = new URLSearchParams(location.search);
  const FORCE_SHIP = qs.has('ship'), FORCE_MYTH = qs.has('myth'), FORCE_KRAKEN = qs.has('kraken');

  const canvas = document.getElementById('sea');
  const ctx = canvas.getContext('2d');
  let W = 0, rows = 0, OFF = 0, bottomPx = 0, img, buf;

  const pack = (c, a = 255) => (a << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
  const hash = (x, y, z) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const BAYER = [0, 0.5, 0.75, 0.25];
  const mix = B.theme.mix;
  const rnd = (a, b) => a + Math.random() * (b - a);

  const shoreY = (x, t) => S0 + TIDE * Math.sin(t * 0.42) + 2.2 * Math.sin(x * 0.045 + t * 0.7) + 1.2 * Math.sin(x * 0.12 - t * 1.1);
  const wetMax = (x) => S0 + TIDE + 3 + 1.6 * Math.sin(x * 0.09) + 1.2 * Math.sin(x * 0.31);

  function resize() {
    const hero = document.querySelector('.hero');
    W = Math.max(60, Math.ceil(document.body.clientWidth / PX));
    // art row 0 (top of the sky band) sits at the top of the hero; the rows above it are extra sky behind the nav
    OFF = hero ? Math.max(0, Math.round((hero.getBoundingClientRect().top + window.scrollY) / PX)) : 0;
    rows = OFF + H;
    canvas.width = W; canvas.height = rows;
    canvas.style.height = rows * PX + 'px';
    bottomPx = rows * PX;
    img = ctx.createImageData(W, rows);
    buf = new Uint32Array(img.data.buffer);
  }

  // x, y are art coordinates; y is relative to the hero (row 0), so rows above the hero are negative.
  function put(x, y, c, a = 255) {
    x |= 0; y = (y | 0) + OFF;
    if (x < 0 || y < 0 || x >= W || y >= rows) return;
    buf[y * W + x] = pack(c, a);
  }
  // Blend over whatever is already opaque in the buffer.
  function blend(x, y, c, a) {
    x |= 0; y = (y | 0) + OFF;
    if (x < 0 || y < 0 || x >= W || y >= rows) return;
    const d = buf[y * W + x];
    const r = d & 255, g = (d >> 8) & 255, b = (d >> 16) & 255;
    buf[y * W + x] = pack([r + (c[0] - r) * a, g + (c[1] - g) * a, b + (c[2] - b) * a]);
  }

  /* ---------- sprites ---------- */
  const FISH_BIG = [
    '.....FF.....',
    '...OOOWOO...',
    'T.OOOOWOOOO.',
    'TTOOOOWOODOO',
    'T.OOOOWOOOO.',
    '...WWWWWW...',
  ];
  const FISH_SMALL = ['..OOO..', 'TOOWOD.', 'TOOWOO.', '..WWW..'];
  const SPECIES = [
    { O: '#f08a3c', W: '#fff5e0', F: '#c4561f', T: '#c4561f', D: '#173d3c' },  // clownfish
    { O: '#7fb2c8', W: '#e6f1f5', F: '#4f7c92', T: '#4f7c92', D: '#10303a' },  // silver
    { O: '#f2c14e', W: '#fff2c4', F: '#c98f1f', T: '#c98f1f', D: '#173d3c' },  // yellow tang
  ];
  function buildSprite(map, sp) {
    return map.map((row) => [...row].map((ch) => (ch === '.' ? null : B.theme.hex(sp[ch]))));
  }
  const SPRITES = SPECIES.map((sp) => ({ big: buildSprite(FISH_BIG, sp), small: buildSprite(FISH_SMALL, sp) }));

  // Mythic jumpers, drawn head-right like the fish so the same arc and rotation code works.
  const MERMAID = [
    '..........HHHHHHH.......',
    '.........HHHHHHHHHH.....',
    '.F.......HHHHHHHSSSS....',
    '.FF....TTHHHHHBBSSDS....',
    'FFFTTTTTTTTSSSBSSS......',
    '.FF..TTTTTTTUUSSSS......',
    '..F...TTTTTTTTT.........',
    '.FF....UUUU.............',
  ];
  const POSEIDON = [
    '...............C.C.......',
    '...............CCCC......',
    '...........HHHHSSSS.....GG',
    'FF..TTTTTTUSHHHSSDS.....G.',
    'FFFTTTTTTTUSSSSSSSSSGGGGGG',
    '.FF.TTTTTTTUSSSWWWW.....G.',
    '..F..TTTTTUUS..WWW.....GG',
    '.FF....UUUU...............',
  ].map((r) => r.padEnd(26, '.').slice(0, 26));
  const MYTHS = [
    buildSprite(MERMAID.map((r) => r.padEnd(24, '.')), { H: '#e8553c', S: '#f4c7a3', D: '#173d3c', B: '#8fe0d8', T: '#2bb3a0', U: '#7fe3c6', F: '#1f8f86' }),
    buildSprite(POSEIDON, { H: '#d6e2ea', S: '#e6a47c', D: '#173d3c', W: '#f1f6f8', C: '#f2c14e', G: '#f2c14e', T: '#3b7be0', U: '#82b4ff', F: '#2a56a8' }),
  ].map((s) => ({ big: s, small: s }));

  // One Piece style pirate ship: the Straw Hat jolly roger (skull, straw hat, crossbones) on the main sail, sheep figurehead. Bow faces right.
  const EMBLEM = [   // K black, Y yellow, R red, W white, . sail shows through
    '.....KKKKKKKK.....',
    '....KYYYYYYYYK....',
    '...KYYYYYYYYYYK...',
    '...KRRRRRRRRRRK...',
    '...KRRRRRRRRRRK...',
    '.KYYYYYYYYYYYYYYK.',
    '.KKKKKKKKKKKKKKKK.',
    '...KWKKKWWKKKWK...',
    '...KWKKKWWKKKWK...',
    '...KWKKKWWKKKWK...',
    '...KWWWWKKWWWWK...',
    '....KWWWWWWWWK....',
    '....KWWKWKWKWK....',
    '....KKKKKKKKKK....',
  ];
  function buildShip() {
    const w = 36, h = 27, g = Array.from({ length: h }, () => Array(w).fill(null));
    const R = (x, y, ww, hh, c) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (g[j] && i < w) g[j][i] = B.theme.hex(c); };
    R(1, 16, 5, 4, '#8a5a2b'); R(1, 16, 5, 1, '#b8793f'); R(2, 18, 2, 1, '#f2c14e');   // stern cabin (behind the sail)
    R(14, 2, 2, 19, '#5b3a1b'); R(28, 5, 1, 15, '#5b3a1b');                              // masts
    R(15, 0, 8, 4, '#1d1b1b'); R(17, 1, 4, 1, '#f2c14e'); R(18, 0, 2, 1, '#f2c14e'); R(18, 2, 2, 2, '#f6f1e2');   // mast-top flag: tiny straw-hat skull
    R(4, 3, 22, 16, '#f6f1e2'); R(4, 3, 22, 1, '#d9d0b6'); R(4, 18, 22, 1, '#d9d0b6'); R(24, 4, 2, 14, '#d9d0b6'); // main sail
    // jolly roger: black crossbones with knobs at the corners, then skull and hat on top
    const E = Array.from({ length: 14 }, () => Array(18).fill(null));
    const set = (x, y, c) => { if (E[y] && x >= 0 && x < 18) E[y][x] = c; };
    const bone = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); set(x, y, 'K'); set(x + 1, y, 'K'); } };
    bone(2, 2, 8, 8); bone(15, 2, 9, 8); bone(2, 11, 8, 6); bone(15, 11, 9, 6);
    [[0, 0], [15, 0], [0, 11], [15, 11]].forEach(([x, y]) => { for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) set(x + dx, y + dy, 'K'); set(x + 1, y + 1, 'W'); });
    EMBLEM.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') set(x, y, ch); }));
    const CM = { K: '#1d1b1b', Y: '#f2c14e', R: '#d9402e', W: '#f6f1e2' };
    E.forEach((row, y) => row.forEach((ch, x) => { if (ch) R(6 + x, 4 + y, 1, 1, CM[ch]); }));
    [[29, 9, 1], [29, 10, 2], [29, 11, 3], [29, 12, 3], [29, 13, 4], [29, 14, 4], [29, 15, 5], [29, 16, 5]].forEach(([x, y, ww]) => R(x, y, ww, 1, '#e8e0c8'));   // jib
    R(3, 19, 30, 1, '#b8793f'); R(2, 20, 32, 2, '#8a5a2b'); R(3, 22, 31, 2, '#8a5a2b');
    R(5, 24, 27, 1, '#4a2b12'); R(8, 25, 21, 1, '#4a2b12'); R(11, 26, 15, 1, '#4a2b12');
    [8, 12, 16, 20, 24, 28].forEach((x) => R(x, 21, 2, 1, '#4a2b12'));
    R(32, 16, 4, 3, '#fff6e2'); R(32, 19, 2, 2, '#8a5a2b'); R(34, 19, 2, 2, '#ffcf9e'); R(35, 19, 1, 1, '#173d3c'); R(31, 16, 1, 2, '#8a5a2b');   // sheep figurehead
    return g;
  }
  const SHIP = buildShip();
  const KC = { body: '#7a3b8f', dark: '#4f2360', light: '#a76bbd', spot: '#c28ad6', eye: '#fff6d8', iris: '#f2c14e', pupil: '#1d1226', sucker: '#e6c9ef' };
  for (const k in KC) KC[k] = B.theme.hex(KC[k]);

  /* ---------- state ---------- */
  const fish = [], parts = [], ripples = [];
  let stars = [], clouds = [], fin = null, ship = null, kraken = null, nextFish = 1.2, nextFin = 14;
  let nextShip = FORCE_SHIP ? 1.5 : rnd(25, 60), nextKraken = FORCE_KRAKEN ? 2 : rnd(40, 90);
  for (let i = 0; i < 46; i++) stars.push({ x: Math.random(), y: Math.random() * 0.8, ph: Math.random() * 6.28 });
  for (let i = 0; i < 4; i++) clouds.push({ x: Math.random(), y: 3 + Math.random() * 11, s: 0.8 + Math.random() * 0.8, k: i % 2 });
  const CLOUD_SHAPES = [
    [[2, 2, 12, 2], [0, 3, 16, 1], [5, 1, 6, 1], [8, 0, 3, 1]],
    [[1, 1, 8, 2], [0, 2, 11, 1], [3, 0, 4, 1]],
  ];

  function spawnFish(t, near) {
    const myth = !near && (FORCE_MYTH || Math.random() < 0.2);
    const y0 = myth ? rnd(HOR + 16, S0 - 10) : rnd(HOR + 10, S0 - 8);
    const depth = (y0 - HOR) / (S0 - HOR);
    const small = !myth && depth < 0.38;
    const g = 62;
    const h = myth ? rnd(13, 19) : small ? rnd(7, 11) : rnd(10, 17);
    const vy0 = -Math.sqrt(2 * g * h);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const f = {
      x0: near ? near.x0 + rnd(-14, 14) : rnd(W * 0.08, W * 0.92),
      y0: near ? Math.min(S0 - 8, Math.max(HOR + 10, near.y0 + rnd(-4, 4))) : y0,
      vx: dir * rnd(7, 14), vy0, g, t: 0, dur: (-2 * vy0) / g,
      sp: myth ? MYTHS[(Math.random() * MYTHS.length) | 0] : SPRITES[(Math.random() * SPRITES.length) | 0], small: near ? near.small : small, entered: false,
    };
    fish.push(f);
    splash(f.x0, f.y0, myth ? 14 : 9, 1);
    ripples.push({ x: f.x0, y: f.y0, age: 0 });
    if (!near && !myth && Math.random() < 0.28) setTimeout(() => spawnFish(t, f), 220 + Math.random() * 200);
  }
  function splash(x, y, n, up) {
    for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-2, 2), y, vx: rnd(-9, 9), vy: -rnd(10, 26) * up, life: rnd(0.45, 0.9), age: 0 });
  }

  /* ---------- fish drawing ---------- */
  function drawFish(f, surfaceY) {
    const spr = f.small ? f.sp.small : f.sp.big;
    const sh = spr.length, sw = spr[0].length;
    const px = f.x0 + f.vx * f.t;
    const py = f.y0 + f.vy0 * f.t + 0.5 * f.g * f.t * f.t;
    const vy = f.vy0 + f.g * f.t;
    const fx = f.vx < 0 ? -1 : 1;
    const th = Math.atan2(vy, Math.abs(f.vx)) * 0.9;
    const cs = Math.cos(th), sn = Math.sin(th);
    const R = Math.ceil(Math.max(sw, sh) * 0.75) + 1;
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        const u = dx * fx, v = dy;
        const lx = Math.round(u * cs + v * sn + sw / 2 - 0.5);
        const ly = Math.round(-u * sn + v * cs + sh / 2 - 0.5);
        if (lx < 0 || ly < 0 || lx >= sw || ly >= sh) continue;
        const c = spr[ly][lx];
        if (!c) continue;
        const X = Math.round(px + dx), Y = Math.round(py + dy);
        if (Y > surfaceY) continue; // still under water
        put(X, Y, c);
      }
    }
  }

  /* ---------- kraken: only its arms break the surface, rising out of deep water (rows near the horizon),
     wiggling, then sinking again. No body is ever shown. ---------- */
  function drawKraken(k, foam) {
    const a = k.age, L = k.life, ease = (t) => t * t * (3 - 2 * t), cl = (t) => Math.max(0, Math.min(1, t));
    const base = k.base, px = (x, y, col) => { if (y <= base) put(x, y, col); };
    const HS = [26, 36, 22, 40, 25, 33, 21];
    for (let i = 0; i < 7; i++) {
      const r = ease(cl((a - i * 0.2) / 1.7)) * ease(cl((L - a - (6 - i) * 0.15) / 1.7));
      if (r < 0.03) continue;
      const bx = Math.round(k.x + (i - 3) * 8 + Math.sin(i * 2.1) * 2), dir = i % 2 ? 1 : -1, H = HS[i] * r;
      if (!k['in' + i] && r > 0.3) { k['in' + i] = true; splash(bx, base, 5, 1); }
      for (let n = 0; n <= 44; n++) {
        const s = n / 44, sway = Math.sin(a * 2.5 + i * 1.7 + s * 5) * (1.5 + s * 5);
        const x = Math.round(bx + sway + dir * s * s * s * 9 * r), y = Math.round(base - s * H);
        const t = s < 0.25 ? 6 : s < 0.5 ? 5 : s < 0.75 ? 4 : s < 0.92 ? 3 : 2, col = i % 2 ? KC.body : KC.dark;
        for (let dy = 0; dy < 2; dy++) for (let dx = -(t >> 1); dx < (t + 1 >> 1); dx++) px(x + dx, y + dy, dx === -(t >> 1) ? KC.dark : col);
        if (n % 5 === 3 && t > 3) px(x + dir, y + 1, KC.sucker);
        if (n % 9 === 1 && t > 3) px(x, y, KC.light);
      }
      for (let dx = -5; dx <= 5; dx++) if ((dx + Math.floor(a * 6) + i) % 3 !== 0) blend(bx + dx, base, foam, 0.55 * r);   // churned water at the base
    }
  }

  /* ---------- frame ---------- */
  let last = performance.now(), acc = 0, clock = 0, lastApply = -1;

  function render(dtSec, hour) {
    const p = B.theme.palette(hour);
    if (clock - lastApply > (B.theme.isDemo ? 0.1 : 0.5)) { B.theme.apply(p); lastApply = clock; }
    if (window.scrollY > bottomPx + 40) return;       // scrolled past the sea: skip the drawing

    const time = Math.floor(clock * 8) / 8;           // chunky wave stepping
    const c = {}; for (const k in p) c[k] = Array.isArray(p[k]) ? p[k].map(Math.round) : p[k];
    const sea = [c.sea0, c.sea1, c.sea2, c.sea3];
    const sp = B.theme.sunPos(hour), mp = B.theme.moonPos(hour);
    const body = sp || mp;
    buf.fill(0);

    /* sky (with extra rows behind the nav) */
    const skyC = Array.from({ length: 7 }, (_, i) => mix(c.skyTop, c.skyBot, i / 6));
    for (let y = -OFF; y < HOR; y++) {
      const lv = (Math.max(0, y) / (HOR - 1)) * 6, i0 = Math.floor(lv), fr = lv - i0;
      for (let x = 0; x < W; x++) put(x, y, skyC[Math.min(6, i0 + (fr > BAYER[((y & 1) << 1) | (x & 1)] ? 1 : 0))]);
    }
    if (p.stars > 0.05) {
      for (const s of stars) {
        const b = p.stars * (0.55 + 0.45 * Math.sin(clock * 2 + s.ph));
        if (b > 0.4) { const y = -OFF + s.y * (HOR + OFF) * 0.85, x = s.x * W; blend(x, y, [255, 252, 235], Math.min(1, b)); if (b > 0.9 && s.ph > 4.2) { blend(x + 1, y, [255, 252, 235], 0.5); blend(x - 1, y, [255, 252, 235], 0.5); } }
      }
    }
    if (p.cloudA > 0.05) {
      for (const cl of clouds) {
        const cx = ((cl.x * (W + 40) + clock * 1.1 * cl.s) % (W + 40)) - 20;
        for (const [rx, ry, rw, rh] of CLOUD_SHAPES[cl.k]) {
          for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) blend(cx + rx + xx, cl.y + ry + yy, c.cloud, p.cloudA * 0.85);
        }
      }
    }
    // sun / moon with stepped glow rings
    if (body) {
      const cx = body.x * W, cy = HOR + 4 - body.e * 19;
      const isSun = !!sp;
      const R = isSun ? 4 + (1 - body.e) * 1.8 : 4;
      const GR = R + 9;
      for (let dy = -GR; dy <= GR; dy++) for (let dx = -GR; dx <= GR; dx++) {
        const d = Math.hypot(dx, dy);
        const X = Math.round(cx + dx), Y = Math.round(cy + dy);
        if (Y < -OFF || Y >= HOR) continue;
        if (d <= R) {
          let col = c.sun;
          if (!isSun && ((dx === -1 && dy === -1) || (dx === 1 && dy === 1) || (dx === 2 && dy === -1) || (dx === -2 && dy === 1))) col = mix(c.sun, c.skyBot, 0.35).map(Math.round);
          put(X, Y, col);
        } else if (d <= GR) {
          const g = Math.pow(1 - (d - R) / (GR - R), 2);
          const lv = Math.ceil(g * 3) / 3;
          blend(X, Y, c.sun, lv * (isSun ? 0.42 : 0.3));
        }
      }
    }

    /* sea: per column so the shore can wash in and out */
    const swell = [];
    for (let k = 0; k < 5; k++) {
      const pk = (time * 0.05 + k / 5) % 1;
      swell.push({ k, pk, depth: Math.pow(pk, 1.5) });
    }
    const span = S0 - HOR;
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x, time);
      const rowsAt = swell.map((s) => Math.round(HOR + 2 + s.depth * (span - 6) + Math.sin(x * 0.09 + s.k * 2.3 + time * 0.7) * (0.8 + s.depth * 1.6)));
      for (let y = HOR; y <= sy; y++) {
        let t = (y - HOR) / span;
        t = Math.max(0, Math.min(1, t + 0.035 * Math.sin(x * 0.05 + time * 0.3 + y * 0.4)));
        const lv = t * 3.2, i0 = Math.min(3, Math.floor(lv)), fr = lv - i0;
        const i = Math.min(3, i0 + (fr > BAYER[((y & 1) << 1) | (x & 1)] ? 1 : 0));
        let col = sea[i];
        // rolling swell crests, broken into dashes
        for (let s = 0; s < 5; s++) {
          const sw = swell[s];
          if (y !== rowsAt[s] && !(sw.depth > 0.5 && y === rowsAt[s] + 1)) continue;
          if (Math.sin(x * 0.17 + sw.k * 5.3 + time * 0.3) + 0.6 * Math.sin(x * 0.41 + sw.k) < -0.2) continue;
          const fade = 1 - Math.pow(sw.pk, 4);
          col = mix(col, c.foam, (0.18 + 0.34 * sw.depth) * fade);
        }
        // fine sparkle
        const hv = hash(x >> 1, y, Math.floor(clock * 3));
        if (hv > 0.986) col = mix(col, c.foam, 0.4);
        else if (hv < 0.01) col = mix(col, c.sea0, 0.35);
        // glitter path under the sun / moon
        if (body) {
          const cx = body.x * W, w = 2 + (y - HOR) * 0.1;
          const dxp = Math.abs(x - cx + Math.sin(y * 0.8 + time) * 1.5);
          if (dxp < w) {
            const gh = hash(x, y, Math.floor(clock * 4));
            if (gh > 0.5 + dxp / w * 0.45) col = mix(col, c.glint, (0.55 + 0.4 * (1 - body.e * 0.4)) * (sp ? 1 : 0.8));
          }
        }
        put(x, y, col);
      }
    }

    /* ripples */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]; r.age += dtSec;
      if (r.age > 1.2) { ripples.splice(i, 1); continue; }
      const rad = r.age * 11, a = 1 - r.age / 1.2;
      const step = 0.8 / Math.max(2, rad);
      for (let th = 0; th < 6.283; th += step) {
        const X = Math.round(r.x + Math.cos(th) * rad), Y = Math.round(r.y + Math.sin(th) * rad * 0.32);
        if (a < 0.5 && (X + Y) & 1) continue;
        if (Y > HOR && Y < shoreY(X, time) - 2) blend(X, Y, c.foam, 0.8 * a + 0.1);
      }
    }

    /* pirate ship: very rare, crosses the horizon slowly */
    if (!ship && !reduce) {
      nextShip -= dtSec;
      if (nextShip <= 0 && !kraken) { const d = Math.random() < 0.5 ? 1 : -1; ship = { x: d > 0 ? -22 : W + 22, d, age: 0 }; }
    }
    if (ship) {
      ship.age += dtSec; ship.x += ship.d * 7 * dtSec;
      const sw = SHIP[0].length, base = HOR + 13 + Math.round(Math.sin(ship.age * 1.1) * 0.8), left = Math.round(ship.x) - sw / 2 | 0;
      for (let q = 0; q < 14; q++) {                           // wake behind the stern
        const wx = Math.round(ship.x) - ship.d * (sw / 2 + q);
        blend(wx, base - 1 + (q >> 2), c.foam, 0.5 - q * 0.033);
      }
      for (let y = 0; y < SHIP.length; y++) for (let x = 0; x < sw; x++) {
        const col = SHIP[y][ship.d > 0 ? x : sw - 1 - x];
        if (col) put(left + x, base - SHIP.length + 1 + y, col);
      }
      for (let x = 0; x < sw; x += 2) blend(left + x, base + 1, c.foam, 0.45);   // waterline foam
      if (ship.x < -30 || ship.x > W + 30) { ship = null; nextShip = rnd(45, 100); }
    }

    /* kraken: deep water only, and never while the pirate ship is out */
    if (!kraken && !ship && !reduce) { nextKraken -= dtSec; if (nextKraken <= 0 && nextShip > 4) kraken = { x: rnd(W * 0.2, W * 0.8), base: HOR + rnd(26, 40), age: 0, life: 10 }; }
    if (kraken) { kraken.age += dtSec; drawKraken(kraken, c.foam); if (!kraken.out && kraken.age > kraken.life - 2) { kraken.out = true; splash(kraken.x, kraken.base, 14, 1); ripples.push({ x: kraken.x, y: kraken.base, age: 0 }); } if (kraken.age > kraken.life) { kraken = null; nextKraken = rnd(60, 130); } }

    /* shark fin patrol */
    if (!fin && !reduce) { nextFin -= dtSec; if (nextFin <= 0) { const d = Math.random() < 0.5 ? 1 : -1; fin = { x: d > 0 ? -8 : W + 8, y: HOR + 16 + Math.random() * 44, d, age: 0 }; nextFin = rnd(35, 60); } }
    if (fin) {
      fin.age += dtSec; fin.x += fin.d * 9 * dtSec;
      const fy = Math.round(fin.y + Math.sin(fin.age * 1.6) * 0.6), fxp = Math.round(fin.x);
      const col = mix(c.sea0, [10, 40, 50], 0.7).map(Math.round);
      // triangular dorsal fin, leading edge toward travel direction
      for (let r = 0; r < 5; r++) {
        const lead = fxp + fin.d * (2 - (r >> 1)), w = 1 + Math.floor(r * 0.9);
        for (let q = 0; q < w; q++) put(lead - fin.d * q, fy - 4 + r, col);
      }
      // V-shaped wake
      for (let q = 0; q < 8; q++) {
        const wx = fxp - fin.d * (3 + q), a = 0.7 - q * 0.075;
        blend(wx, fy + 1 - (q >> 1), c.foam, a);
        blend(wx, fy + 1 + (q >> 1), c.foam, a * 0.8);
      }
      if (fin.x < -12 || fin.x > W + 12) fin = null;
    }

    /* fish, mermaids, Poseidon */
    if (!reduce) {
      nextFish -= dtSec;
      if (nextFish <= 0) { spawnFish(clock); nextFish = rnd(2.4, 5.5); }
      for (let i = fish.length - 1; i >= 0; i--) {
        const f = fish[i]; f.t += dtSec;
        if (f.t >= f.dur) {
          const lx = f.x0 + f.vx * f.dur;
          splash(lx, f.y0, 8, 1); ripples.push({ x: lx, y: f.y0, age: 0 });
          fish.splice(i, 1); continue;
        }
        drawFish(f, f.y0);
        if (Math.random() < dtSec * 14) parts.push({ x: f.x0 + f.vx * f.t, y: f.y0 + f.vy0 * f.t + 0.5 * f.g * f.t * f.t + 2, vx: rnd(-3, 3), vy: rnd(2, 8), life: 0.45, age: 0 });
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i]; q.age += dtSec; q.vy += 95 * dtSec; q.x += q.vx * dtSec; q.y += q.vy * dtSec;
        if (q.age > q.life) { parts.splice(i, 1); continue; }
        blend(q.x, q.y, [255, 255, 255], 1 - q.age / q.life * 0.5);
        if (q.life > 0.8 && q.age < 0.2) blend(q.x + 1, q.y, [255, 255, 255], 0.6);
      }
    }

    /* shore: foam lace then translucent wet sand that fades into the page sand */
    for (let x = 0; x < W; x++) {
      const sy = shoreY(x, time), yi = Math.floor(sy);
      for (let k = 0; k < 3; k++) put(x, yi - k, c.foam);
      if (hash(x, yi, Math.floor(time * 2)) > 0.35) put(x, yi - 3, c.foam);
      if ((x + yi) & 1) { blend(x, yi - 4, c.foam, 0.8); }
      if (hash(x >> 1, yi, Math.floor(time * 4)) > 0.8) blend(x, yi - 5, c.foam, 0.7);
      const wm = wetMax(x);
      for (let y = yi + 1; y <= wm; y++) {
        const f = 1 - (y - sy) / (wm - sy + 1);
        const lv = Math.ceil(Math.max(0, f) * 3) / 3;
        if (lv <= 0) continue;
        put(x, y, c.wet, Math.round(255 * p.wetA * lv));
        if (hash(x, y, Math.floor(clock * 2)) > 0.992) put(x, y, c.glint, 200);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    acc += dt;
    if (acc >= 1 / 30) { clock += acc; render(acc, B.theme.now()); acc = 0; }
    requestAnimationFrame(loop);
  }

  B.sea = {
    start() {
      resize();
      new ResizeObserver(() => { resize(); if (reduce) render(0, B.theme.now()); }).observe(document.body);
      render(0, B.theme.now());
      if (reduce) { setInterval(() => render(0, B.theme.now()), 60000); return; }
      requestAnimationFrame((n) => { last = n; loop(n); });
    },
  };
})();
