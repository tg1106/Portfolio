/* Sand grain, pixel-art beach props (castles, ball, umbrella...), crab, and the tech-logo marquees. */
(function () {
  const B = window.Beach;
  const SCALE = 5;

  /* ---------- sand grain tiles (day: warm specks; night: cool moonlit specks) ---------- */
  function grainTile(night) {
    const n = 72, c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    let s = 7; const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const lite = night ? 'rgba(190,210,255,.13)' : 'rgba(255,255,255,.16)';
    const dark = night ? 'rgba(5,8,25,.2)' : 'rgba(70,45,10,.07)';
    const rock = night ? 'rgba(5,8,25,.3)' : 'rgba(70,45,10,.16)';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const r = rand();
      if (r < 0.1) { g.fillStyle = lite; g.fillRect(x, y, 1, 1); }
      else if (r < 0.19) { g.fillStyle = dark; g.fillRect(x, y, 1, 1); }
      else if (r > 0.995) { g.fillStyle = rock; g.fillRect(x, y, 2, 1); }
    }
    return `url(${c.toDataURL()})`;
  }
  const GRAIN = [grainTile(false), grainTile(true)];
  document.documentElement.style.setProperty('--grain', GRAIN[0]);

  /* ---------- sprite helpers ---------- */
  function mk(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const r = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    fn(r, g);
    return c;
  }
  function fromMap(map, pal) {
    return mk(map[0].length, map.length, (r) => map.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) r(x, y, 1, 1, pal[ch]); })));
  }
  const shade = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');

  // Grove frame: both palms sway about their bases (nearest-neighbour rotation) and the hammock is tied to the trunks,
  // so it moves with them. Its length is fixed, so it sags a little more when the trunks lean together.
  const GROVE_PALM = {};
  function groveFrame(night, t) {
    if (!GROVE_PALM[night]) { const c = mk(62, 66, (r) => drawPalm(r, 0, false)); GROVE_PALM[night] = night ? moonlit(c) : c; }
    const out = mk(146, 66, () => {}), g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    const A = 0.05, wind = (p) => A * (Math.sin(t * 0.8 + p) + 0.35 * Math.sin(t * 2.1 + p * 1.6));
    const thL = wind(0), thR = wind(0.7), PX = 14.5, PY = 65, RX = 84 + 62 - PX;       // pivots: trunk bases
    const palm = (px, flip, th) => { g.save(); g.translate(px, PY); g.rotate(th); if (flip) g.scale(-1, 1); g.drawImage(GROVE_PALM[night], -PX, -PY); g.restore(); };
    palm(PX, false, thL); palm(RX, true, thR);
    const tie = (px, sgn, th) => [px + sgn * 8.8 * Math.cos(th) + 23 * Math.sin(th), PY + sgn * 8.8 * Math.sin(th) - 23 * Math.cos(th)];   // where the hammock meets each trunk
    const [xl, yl] = tie(PX, 1, thL), [xr, yr] = tie(RX, -1, thR);
    const d = Math.hypot(xr - xl, yr - yl), len = 103.5, sag = Math.max(8, Math.min(17, Math.sqrt(Math.max(0, (len - d) * 3 * d / 8))));
    const hm = mk(146, 66, (r) => {
      for (let x = Math.round(xl); x <= Math.round(xr); x++) {
        const u = (x - xl) / (xr - xl), y = Math.round(yl + (yr - yl) * u + sag * 4 * u * (1 - u));
        r(x, y, 1, 4, Math.floor((x - xl) / 6) % 2 ? '#fff1da' : '#ec714c'); r(x, y + 4, 1, 1, '#b8523a');
        if (x % 3 === 0) r(x, y + 5, 1, 2, '#f6ca78');
      }
      r(Math.round(xl) - 1, Math.round(yl) - 2, 3, 4, '#5b4a36'); r(Math.round(xr) - 1, Math.round(yr) - 2, 3, 4, '#5b4a36');
    });
    g.drawImage(night ? moonlit(hm) : hm, 0, 0);
    return out;
  }

  // Night recolour: pull every colour toward moonlit blue, keep lit windows and gold glinting.
  function moonlit(cv) {
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const r = a[i], gg = a[i + 1], b = a[i + 2];
      if (r > 235 && gg > 185 && b < 140) continue;
      a[i] = (r * 0.45 + 64 * 0.55) * 0.9; a[i + 1] = (gg * 0.45 + 84 * 0.55) * 0.9; a[i + 2] = (b * 0.45 + 150 * 0.55) * 0.9;
    }
    g.putImageData(d, 0, 0);
    return cv;
  }

  // Coconut palm drawn through rect fn r, optionally mirrored, at x offset ox (sprite is 62 wide).
  function drawPalm(r0, ox, flip) {
    const PW = 62, TX = 34, TY = 20;
    const r = (x, y, w, h, c) => r0(flip ? ox + PW - x - w : ox + x, y, w, h, c);
    const cx = (y) => 14 + 20 * Math.pow((65 - y) / 45, 1.5);
    for (let y = TY; y < 66; y++) {
      const x = Math.round(cx(y)), w = y > 56 ? 5 : 4, ring = Math.floor(y / 3) % 2;
      r(x - 2, y, w, 1, ring ? '#8a5a2b' : '#a7743c');
      r(x - 2, y, 1, 1, '#c18a4d'); r(x + w - 3, y, 1, 1, '#6b4423');
    }
    const frond = (dir, len, lift, droop, dark) => {
      for (let i = 0; i <= len; i++) {
        const t = i / len, x = Math.round(TX + dir * len * t), y = Math.round(TY - lift * t + droop * t * t);
        const col = dark ? '#1f7a46' : (i % 5 === 4 ? '#58d38a' : '#34b265');
        r(x, y, 2, 2, col);
        if (i % 2 === 0 && i > 3) { r(x - dir, y + 2, 1, 2, dark ? '#176238' : '#27965a'); r(x, y - 1, 1, 1, dark ? '#176238' : '#27965a'); }
      }
    };
    frond(-1, 26, 3, 20, true); frond(1, 26, 3, 20, true);
    frond(-1, 20, 11, 12, false); frond(1, 20, 11, 12, false);
    frond(-1, 12, 14, 4, false); frond(1, 12, 14, 4, false);
    frond(0.15, 8, 15, 0, false);
    [[TX - 3, TY + 3], [TX + 1, TY + 4], [TX - 1, TY + 6]].forEach(([x, y]) => { r(x, y, 3, 3, '#6b4423'); r(x, y, 1, 1, '#a0693a'); });
  }

  const KINDS = {
    castle(night) {
      const L = '#ead19a', M = '#d6b676', D = '#b8935a', K = '#7a5b30', win = night ? '#ffd36b' : '#8a6a3c';
      return mk(34, 22, (r) => {
        r(10, 14, 14, 8, M); [11, 15, 19].forEach((x) => r(x, 12, 2, 2, M)); r(22, 14, 2, 8, D);
        [[1, 9], [24, 9]].forEach(([x, y]) => {
          r(x, y, 9, 22 - y, M); r(x + 7, y, 2, 22 - y, D); r(x, y, 9, 1, L);
          [0, 3, 6].forEach((o) => r(x + o, y - 2, 2, 2, o === 6 ? D : M));
          r(x + 3, y + 4, 2, 3, win);
        });
        r(12, 5, 10, 17, L); r(20, 5, 2, 17, D);
        [12, 15, 18, 20].forEach((x) => r(x, 3, 2, 2, x > 19 ? D : L));
        r(17, 0, 1, 3, '#5b4a36'); r(18, 0, 4, 2, '#ec714c'); r(18, 2, 2, 1, '#c9562f');
        r(14, 9, 2, 2, win); r(18, 9, 2, 2, win);
        r(15, 16, 4, 6, K); r(16, 15, 2, 1, K);
      });
    },
    castleSmall(night) {
      const L = '#ead19a', M = '#d6b676', D = '#b8935a', win = night ? '#ffd36b' : '#8a6a3c';
      return mk(18, 14, (r) => {
        r(3, 6, 12, 8, M); r(13, 6, 2, 8, D); r(3, 6, 12, 1, L);
        [3, 7, 11].forEach((x) => r(x, 4, 2, 2, M));
        r(0, 9, 5, 5, M); r(3, 9, 2, 5, D); [0, 3].forEach((x) => r(x, 7, 2, 2, M));
        r(13, 9, 5, 5, L); r(16, 9, 2, 5, D); [13, 16].forEach((x) => r(x, 7, 2, 2, L));
        r(8, 9, 3, 5, '#7a5b30'); r(5, 8, 1, 2, win);
        r(9, 0, 1, 4, '#5b4a36'); r(10, 0, 3, 2, '#3b9ec9');
      });
    },
    ball() {
      const cols = ['#ec714c', '#fff6e2', '#3b9ec9', '#fff6e2', '#f6ca78', '#fff6e2'];
      return mk(12, 12, (r) => {
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
          const dx = x - 5.5, dy = y - 5.5, d = Math.hypot(dx, dy);
          if (d > 6) continue;
          const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 6) % 6;
          let col = cols[seg];
          if (d < 1.4) col = '#173d3c';
          else if (dx + dy > 3.2) col = shade(col, 0.82);
          r(x, y, 1, 1, col);
        }
        r(3, 2, 2, 1, '#ffffff'); r(2, 3, 1, 1, '#ffffff');
      });
    },
    umbrella() {
      return mk(42, 38, (r) => {
        const cx = 21, rx = 20, cy = 15, ry = 15;
        for (let y = 0; y <= cy; y++) {
          const hw = Math.round(rx * Math.sqrt(1 - Math.pow((cy - y) / ry, 2)));
          for (let x = cx - hw; x <= cx + hw; x++) {
            const stripe = Math.floor((x * 6) / 42) % 2;
            let col = stripe ? '#fff1da' : '#ec714c';
            if (x > cx + 9) col = shade(col, 0.84);
            r(x, y, 1, 1, col);
          }
        }
        for (let x = 1; x < 41; x++) if (x % 7 < 4) r(x, cy + 1, 1, 1, Math.floor((x * 6) / 42) % 2 ? '#fff1da' : '#ec714c');
        r(20, 15, 2, 23, '#8a7a55'); r(21, 15, 1, 23, '#6e5f3f'); r(20, 0, 2, 1, '#5b4a36');
      });
    },
    bucket() {
      return mk(22, 14, (r) => {
        r(1, 4, 10, 1, '#f6ca78'); r(0, 5, 12, 6, '#f6ca78'); r(1, 11, 10, 1, '#f6ca78');
        r(0, 7, 12, 2, '#ec714c'); r(9, 5, 3, 7, shade('#f6ca78', 0.85));
        r(2, 1, 1, 3, '#173d3c'); r(3, 0, 6, 1, '#173d3c'); r(9, 1, 1, 3, '#173d3c');
        r(15, 2, 1, 10, '#3b9ec9'); r(14, 0, 3, 3, '#3b9ec9'); r(14, 11, 3, 2, '#5b4a36'); r(18, 10, 4, 3, '#d6b676');
      });
    },
    starfish() {
      return fromMap([
        '....A....', '....A....', '...AAA...', 'AAAAAAAAA', '.AAAABAA.', '..AAAAA..', '..AA.AA..', '.AA...AA.', '.A.....A.',
      ], { A: '#ec714c', B: '#f6ca78' });
    },
    shell() {
      return fromMap(['..CCCCC..', '.CABABAC.', 'CABABABAC', 'CAAAAAAAC', '.CCCCCCC.'], { A: '#f3bd9f', B: '#fbe0d0', C: '#d98d72' });
    },
    towel() {
      return mk(40, 14, (r) => {
        for (let y = 0; y < 14; y++) {
          const off = Math.floor((13 - y) / 2.4);
          for (let x = 0; x < 30; x++) r(off + x, y, 1, 1, Math.floor(x / 4) % 2 ? '#fff1da' : '#3b9ec9');
          r(off + 30, y, 2, 1, y % 2 ? '#fff1da' : '#3b9ec9');
        }
      });
    },
    palm() { return mk(62, 66, (r) => drawPalm(r, 0, false)); },
    // two palms leaning toward each other with a hammock tied between the trunks (animated by groveFrame)
    grove(night) { return groveFrame(!!night, 0); },
    rocks() {
      return mk(40, 25, (r) => {
        const blob = (cx, cy, rx, ry) => {
          for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
            const d = (x / rx) ** 2 + (y / ry) ** 2;
            if (d > 1) continue;
            let c = '#8c8f98';
            if (d > 0.7 && (x + y > 1)) c = '#6d7079'; else if (x + y < -rx * 0.35 && d < 0.8) c = '#b4b7c0';
            r(cx + x, cy + y, 1, 1, c);
          }
        };
        blob(14, 16, 13, 8); blob(29, 19, 9, 5); blob(6, 21, 5, 3);
        r(10, 17, 4, 1, '#6d7079'); r(26, 19, 3, 1, '#6d7079');
        const star = (x, y, col, dot) => [['...A...', '...A...', 'AAAAAAA', '.AAAAA.', '..AAA..', '.AA.AA.', 'AA...AA']].forEach((m) => m.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'A') r(x + i, y + j, 1, 1, col); })));
        star(10, 4, '#ec714c'); r(13, 7, 1, 1, '#f6ca78');
        r(31, 14, 1, 1, '#f3bd9f');
        [[30, 14], [29, 15], [31, 15], [30, 16], [29, 13]].forEach(([x, y]) => r(x, y, 1, 1, '#f08a7a'));   // small pink starfish on the second rock
      });
    },
    chest() {
      return mk(32, 24, (r) => {
        const W = '#8a5a2b', D = '#5b3a1b', G = '#f2c14e', GL = '#ffe08a';
        // open lid leaning back, gold heaped inside
        r(5, 2, 22, 3, D); r(4, 5, 24, 3, W); r(4, 5, 24, 1, '#a7743c');
        r(4, 9, 24, 3, '#f2c14e');
        [[6, 8], [9, 7], [13, 8], [17, 7], [21, 8], [24, 7]].forEach(([x, y]) => r(x, y, 3, 2, GL));
        r(3, 12, 26, 12, W); r(3, 12, 26, 2, '#a7743c'); r(3, 22, 26, 2, D);
        r(3, 12, 2, 12, D); r(27, 12, 2, 12, D); r(13, 12, 6, 12, G); r(14, 15, 4, 4, '#b8892a'); r(15, 16, 2, 2, '#5b3a1b');
        r(0, 20, 2, 2, G); r(29, 21, 2, 2, G); r(31, 22, 1, 1, GL);
      });
    },
    map() {
      return mk(30, 18, (r) => {
        const P = '#ecd9a6', E = '#c9a96a', R = '#c0392b', B = '#4b8fb8';
        r(3, 2, 24, 14, P); r(3, 2, 24, 1, E); r(3, 15, 24, 1, E); r(3, 2, 1, 14, E); r(26, 2, 1, 14, E);
        r(0, 1, 4, 16, E); r(1, 1, 2, 16, '#a98649'); r(26, 1, 4, 16, E); r(27, 1, 2, 16, '#a98649');
        r(6, 5, 7, 2, B); r(5, 7, 5, 2, B); r(7, 12, 5, 2, B);   // coast
        [[8, 13], [11, 11], [14, 10], [17, 9], [19, 7]].forEach(([x, y]) => r(x, y, 2, 1, R));
        [[21, 4], [23, 4], [22, 5], [21, 6], [23, 6]].forEach(([x, y]) => r(x, y, 1, 1, R));
      });
    },
    board() {
      return mk(10, 40, (r) => {
        for (let y = 0; y < 40; y++) {
          const hw = y < 6 ? 1 + (y >> 1) : y > 33 ? 2 : 3;
          r(5 - hw, y, hw * 2, 1, y % 14 < 3 ? '#ec714c' : '#fff1da');
        }
        r(4, 0, 2, 40, '#f6ca78'); r(5, 8, 1, 26, shade('#f6ca78', 0.8));
      });
    },
  };
  const CRAB = [
    mkCrab(false), mkCrab(true),
  ];
  function mkCrab(b) {
    const rows = b
      ? ['X.......X', 'XX.....XX', '.X.X.X.X.', '..XXXXX..', '.XXXXXXX.', '..XXXXX..', 'X.XX.XX.X', '.XX...XX.']
      : ['X.......X', 'XX.....XX', '.X.X.X.X.', '..XXXXX..', '.XXXXXXX.', '..XXXXX..', '.XX...XX.', 'XX.....XX'];
    return fromMap(rows, { X: '#ec714c' });
  }

  /* ---------- scatter: props land at random spots on free sand ----------
     A spot is free when it is below the sea, above the contact panel, and clear of every piece of
     content (text, buttons, cards, photo...) plus a margin, so nothing ever sits behind or under a component. */
  const placed = [];
  const BURIED = { chest: 1, map: 1 };
  const SPEC = [['grove', 4], ['castle', 5], ['umbrella', 5], ['palm', 4], ['chest', 4], ['castleSmall', 5], ['map', 4], ['towel', 5], ['bucket', 5],
    ['rocks', 5], ['rocks', 4], ['board', 4], ['ball', 5], ['ball', 4], ['starfish', 4], ['starfish', 3], ['shell', 4], ['shell', 3], ['map', 3], ['umbrella', 4], ['castleSmall', 4]];
  const layer = Object.assign(document.createElement('div'), { id: 'beach-props' });
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  SPEC.forEach(([kind, scale]) => {
    const src = KINDS[kind](false);
    const el = document.createElement('span');
    el.className = 'prop prop-' + kind;
    const cv = document.createElement('canvas');
    el.append(Object.assign(document.createElement('i'), { className: 'shadow' }), cv);
    if (BURIED[kind]) el.append(Object.assign(document.createElement('i'), { className: 'mound' }));
    layer.append(el);
    placed.push({ kind, cv, el, scale, w: src.width * scale, h: src.height * scale, x: null, y: null });
  });

  const TEXT = 'h1, h2, .lede, .byline, .sec-head p, .pass p, .foot p';            // measured by their text, not their full-width box
  const BOXES = '.nav, .pill, .btn, .stickers li, .letter, .deck-wrap, .cards > *, .stats li, .rows li, .qa details, .about-photo, .about-lane, .socials, .heat-panel, .edu, .tabs, .walkman, .wm-listen, .book, .diary-nav, .cta, .foot .links, .logo';
  function layoutProps() {
    const sy = window.scrollY, body = document.body;
    layer.style.height = body.offsetHeight + 'px';
    const sea = document.getElementById('sea'), cta = document.querySelector('.cta');
    const y0 = (sea ? sea.getBoundingClientRect().bottom + sy : 0) - 36, y1 = (cta ? cta.getBoundingClientRect().top + sy : body.offsetHeight) - 14;
    const x0 = 8, x1 = body.clientWidth - 8, PAD = 16;
    const blocks = [];
    const add = (r) => { if (r.width > 0 && r.height > 0) blocks.push({ l: r.left - PAD, r: r.right + PAD, t: r.top + sy - PAD, b: r.bottom + sy + PAD }); };
    document.querySelectorAll(BOXES).forEach((e) => add(e.getBoundingClientRect()));
    document.querySelectorAll(TEXT).forEach((e) => { const g = document.createRange(); g.selectNodeContents(e); add(g.getBoundingClientRect()); });
    const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    const taken = [];
    placed.slice().sort((a, b) => b.w * b.h - a.w * a.h).forEach((p) => {
      const fits = (x, y) => { const k = { l: x - 8, r: x + p.w + 8, t: y - 8, b: y + p.h + 8 }; return !blocks.some((b) => hit(k, b)) && !taken.some((b) => hit(k, b)); };
      let ok = p.x !== null && p.x + p.w <= x1 && p.y >= y0 && p.y + p.h <= y1 && fits(p.x, p.y);   // keep a still-valid spot
      for (let i = 0; !ok && i < 160 && y1 - y0 > p.h && x1 - x0 > p.w; i++) {
        const x = Math.floor(x0 + Math.random() * (x1 - x0 - p.w)), y = Math.floor(y0 + Math.random() * (y1 - y0 - p.h));
        if (fits(x, y)) { p.x = x; p.y = y; ok = true; }
      }
      p.el.style.display = ok ? '' : 'none';
      if (!ok) { p.x = null; return; }
      p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px';
      taken.push({ l: p.x - 8, r: p.x + p.w + 8, t: p.y - 8, b: p.y + p.h + 8 });
    });
  }
  window.layoutProps = layoutProps;
  let lastNight = null;
  function paint() {
    const night = document.documentElement.dataset.night === '1';
    if (night === lastNight) return;
    lastNight = night;
    document.documentElement.style.setProperty('--grain', GRAIN[night ? 1 : 0]);
    placed.forEach((p) => {
      const src = p.kind === 'grove' ? groveFrame(night, 0) : KINDS[p.kind](night);
      if (night && p.kind !== 'grove') moonlit(src);
      p.cv.width = src.width; p.cv.height = src.height;
      p.cv.getContext('2d').drawImage(src, 0, 0);
      p.cv.style.width = src.width * p.scale + 'px';
      p.cv.style.height = src.height * p.scale + 'px';
      p.el.style.setProperty('--w', src.width * p.scale + 'px');
    });
  }
  setInterval(paint, 500); paint();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      if (document.hidden) return;
      const night = document.documentElement.dataset.night === '1';
      placed.forEach((p) => { if (p.kind === 'grove' && p.x !== null) { const g = p.cv.getContext('2d'); g.clearRect(0, 0, p.cv.width, p.cv.height); g.drawImage(groveFrame(night, performance.now() / 1000), 0, 0); } });
    }, 100);
  }
  let relayout = 0;
  const schedule = () => { clearTimeout(relayout); relayout = setTimeout(layoutProps, 200); };
  new ResizeObserver(schedule).observe(document.body);
  addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  layoutProps();

  /* crab: two-frame scuttle */
  document.querySelectorAll('.crab').forEach((cv) => {
    cv.width = 9; cv.height = 8;
    const g = cv.getContext('2d'); let f = 0;
    const draw = () => { g.clearRect(0, 0, 9, 8); g.drawImage(CRAB[f ^= 1], 0, 0); };
    draw(); setInterval(draw, 220);
  });

  /* ---------- marquee: logo + name, blue plus between them, scrolling forever ---------- */
  document.querySelectorAll('.marquee[data-logos]').forEach((m) => {
    const names = m.dataset.logos.split(',');
    const item = (n) => {
      const L = window.LOGOS[n];
      return `<span class="tk"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${L.color}" d="${L.d}"/></svg>${L.title}</span><span class="plus">+</span>`;
    };
    const reps = Math.max(2, Math.ceil(900 / (names.length * 230)));
    const half = Array.from({ length: reps }, () => names.map(item).join('')).join('');
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', 'Tech stack used: ' + names.map((n) => window.LOGOS[n].title).join(', '));
    m.innerHTML = `<div class="track" aria-hidden="true"><div class="half">${half}</div><div class="half">${half}</div></div>`;
  });
})();
