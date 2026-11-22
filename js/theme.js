/* Time-of-day palette. Hours are local decimal hours (23.5 = 11:30pm).
   Sunrise 4-6am, daylight, sunset 5-6pm, moonlit night.
   Preview: ?h=17.6 freezes the clock, ?cycle=60 runs a full day in 60s. */
(function () {
  const B = (window.Beach = window.Beach || {});

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const lum = (c) => {
    const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  const COLOR_KEYS = ['skyTop', 'skyBot', 'sea0', 'sea1', 'sea2', 'sea3', 'foam', 'sand', 'wet', 'ink', 'tint', 'band', 'teal', 'glow', 'cloud', 'sun', 'glint'];
  const NUM_KEYS = ['wetA', 'tintAmt', 'glowA', 'propB', 'sepia', 'shadowA', 'stars', 'cloudA'];

  const NIGHT = {
    skyTop: '#060d1d', skyBot: '#17304a', sea0: '#0c2430', sea1: '#123341', sea2: '#1b4753', sea3: '#2a6270',
    foam: '#bcd8dc', sand: '#3a4260', wet: '#1b2136', wetA: 0.5, ink: '#e9eef4', tint: '#1f2944', tintAmt: 60,
    band: '#0a161c', teal: '#6fd0c6', glow: '#9fc0f0', glowA: 0.2, propB: 1, sepia: 0, shadowA: 0.28,
    stars: 1, cloudA: 0.15, cloud: '#30455c', sun: '#e9f2f6', glint: '#cfe6ee',
  };
  const DAWN = {
    skyTop: '#3a3b78', skyBot: '#ff9e7a', sea0: '#2f6a86', sea1: '#4e93a1', sea2: '#8bbdb0', sea3: '#e8b69a',
    foam: '#ffe3cc', sand: '#efd2b8', wet: '#b58c75', wetA: 0.35, ink: '#2b3a45', tint: '#ffa574', tintAmt: 10,
    band: '#2a3550', teal: '#1f7f86', glow: '#ffb08a', glowA: 0.22, propB: 0.96, sepia: 0.12, shadowA: 0.22,
    stars: 0.25, cloudA: 0.8, cloud: '#ffc7ad', sun: '#ffd2a1', glint: '#ffd6a8',
  };
  const MORNING = {
    skyTop: '#8fd2ec', skyBot: '#e6f3e4', sea0: '#1a8f98', sea1: '#5ec4be', sea2: '#94ded1', sea3: '#d8f3d9',
    foam: '#f4fff2', sand: '#f6e6c4', wet: '#cdb88a', wetA: 0.5, ink: '#173d3c', tint: '#ffe9b0', tintAmt: 0,
    band: '#173d3c', teal: '#167b76', glow: '#ffe9b0', glowA: 0.08, propB: 1, sepia: 0.04, shadowA: 0.3,
    stars: 0, cloudA: 0.9, cloud: '#ffffff', sun: '#fff1a6', glint: '#ffffff',
  };
  const DAY = Object.assign({}, MORNING, {
    skyTop: '#6ec6e8', skyBot: '#d3f2f0', sand: '#f5e9c9', glow: '#fff6d0', glowA: 0, sepia: 0,
  });
  const SUNSET = {
    skyTop: '#4a2f6b', skyBot: '#ff8a4a', sea0: '#2a5b73', sea1: '#4d8689', sea2: '#c9906f', sea3: '#f2b27d',
    foam: '#ffdcb0', sand: '#f2d0a6', wet: '#b98c5f', wetA: 0.4, ink: '#2e2a3a', tint: '#ff7a3d', tintAmt: 12,
    band: '#2e2244', teal: '#b5502f', glow: '#ff8a4a', glowA: 0.28, propB: 0.9, sepia: 0.22, shadowA: 0.34,
    stars: 0.1, cloudA: 1, cloud: '#ff9f7a', sun: '#ffb15e', glint: '#ffc78a',
  };
  const DUSK = {
    skyTop: '#1a1a3e', skyBot: '#8a4560', sea0: '#14304a', sea1: '#26496a', sea2: '#4c5f78', sea3: '#8b7088',
    foam: '#e0c0c8', sand: '#58516c', wet: '#2f2a42', wetA: 0.45, ink: '#f1e6e6', tint: '#2d2650', tintAmt: 58,
    band: '#1a1830', teal: '#e08a7a', glow: '#c46a8a', glowA: 0.2, propB: 0.92, sepia: 0.08, shadowA: 0.22,
    stars: 0.7, cloudA: 0.6, cloud: '#7a4a68', sun: '#ff9a6a', glint: '#e8a6a0',
  };

  const KEYS = [
    [0, NIGHT], [4, NIGHT], [5, DAWN], [6.5, MORNING], [8.5, DAY],
    [16.5, DAY], [17.6, SUNSET], [18.6, DUSK], [19.75, NIGHT], [24, NIGHT],
  ].map(([h, p]) => {
    const o = { h };
    COLOR_KEYS.forEach((k) => (o[k] = hex(p[k])));
    NUM_KEYS.forEach((k) => (o[k] = p[k]));
    return o;
  });

  const DARK_INK = hex('#1d2c33'), LIGHT_INK = hex('#eef2ea');
  const CARD_BASE = hex('#d1dfc1');

  function palette(h) {
    h = ((h % 24) + 24) % 24;
    let i = 0;
    while (i < KEYS.length - 2 && h >= KEYS[i + 1].h) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    let t = (h - a.h) / (b.h - a.h);
    t = t * t * (3 - 2 * t);
    const p = {};
    COLOR_KEYS.forEach((k) => (p[k] = mix(a[k], b[k], t)));
    NUM_KEYS.forEach((k) => (p[k] = a[k] + (b[k] - a[k]) * t));

    // Keep text readable mid-transition: swap ink if contrast with sand drops.
    if (contrast(p.ink, p.sand) < 6) p.ink = lum(p.sand) > 0.3 ? DARK_INK : LIGHT_INK;
    if (contrast(p.teal, p.sand) < 4) p.teal = p.ink;
    p.muted = mix(p.ink, p.sand, 0.38);
    p.line = mix(p.ink, p.sand, 0.82);

    // Card text: contrast against a tinted card, not the sand.
    const card = mix(CARD_BASE, p.tint, p.tintAmt / 100);
    p.cink = contrast(DARK_INK, card) >= contrast(LIGHT_INK, card) ? DARK_INK : LIGHT_INK;
    p.cmuted = mix(p.cink, card, 0.3);
    p.h = h;
    return p;
  }

  /* Sun/moon position along an arc. Returns {x: 0..1, e: 0..1 elevation}. */
  function sunPos(h) {
    h = ((h % 24) + 24) % 24;
    if (h < 5.4 || h > 18.2) return null;
    const f = (h - 5.4) / 12.8;
    return { x: 0.1 + 0.8 * f, e: Math.sin(Math.PI * f), f };
  }
  function moonPos(h) {
    h = ((h % 24) + 24) % 24;
    const hn = h < 12 ? h + 24 : h;
    if (hn < 18.2 || hn > 29.6) return null;
    const f = (hn - 18.2) / 11.4;
    return { x: 0.1 + 0.8 * f, e: Math.sin(Math.PI * f), f };
  }

  function apply(p) {
    const s = document.documentElement.style;
    const set = (k, v) => s.setProperty(k, Array.isArray(v) ? toHex(v) : v);
    set('--sand', p.sand);
    set('--ink', p.ink);
    set('--muted', p.muted);
    set('--line', p.line);
    set('--teal', p.teal);
    set('--band', p.band);
    set('--tint', p.tint);
    set('--tint-amt', p.tintAmt.toFixed(1));
    set('--cink', p.cink);
    set('--cmuted', p.cmuted);
    set('--glow', p.glow);
    set('--glow-a', p.glowA.toFixed(3));
    set('--prop-b', p.propB.toFixed(3));
    set('--prop-sepia', p.sepia.toFixed(3));
    set('--shadow-a', p.shadowA.toFixed(3));
    const sp = sunPos(p.h), mp = moonPos(p.h);
    const body = sp || mp;
    set('--glow-x', body ? (body.x * 100).toFixed(1) + '%' : '50%');
    // Cast shadows lean away from the light; long when low, short at noon.
    if (sp) {
      set('--shadow-dx', ((0.5 - sp.x) * 2 * (1.1 - sp.e * 0.7) * 38).toFixed(1) + 'px');
      set('--shadow-len', (1 - sp.e * 0.6).toFixed(2));
    } else {
      set('--shadow-dx', '-10px');
      set('--shadow-len', '0.5');
    }
    document.documentElement.dataset.night = p.stars > 0.5 ? '1' : '0';
  }

  /* Clock: real local time, or ?h= / ?cycle= preview overrides. */
  const q = new URLSearchParams(location.search);
  const fixedH = q.has('h') ? parseFloat(q.get('h')) : null;
  const cycle = q.has('cycle') ? parseFloat(q.get('cycle')) : 0;
  const t0 = performance.now();
  function now() {
    if (fixedH !== null && !isNaN(fixedH)) return fixedH;
    if (cycle > 0) return (((performance.now() - t0) / 1000 / cycle) * 24 + 5) % 24;
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }

  B.theme = { palette, apply, now, sunPos, moonPos, toHex, hex, mix, isDemo: fixedH === null && cycle > 0 };
})();
