// Three Strand Labs break wing: one small private room per bot plus a shared
// entertainment & relaxation area ("chill zone"). Adds to the 2D Office in
// office.js (whatsmyagentdoing, MIT) through small hooks:
//   wingWidth() / buildWing(api)  extend the floor plan (also used by 3D),
//   drawWingFloor()               floors + rugs (2D),
//   poiAllowed / poiBoost / deskNapAllowed  who may go where on a break.
// Idle (off-duty) bots head to their own room, now and then to the chill
// zone. Nobody else enters a private room. Wall art is drawn by WingArt
// functions shared with the 3D view (office3d.js) so both look the same.
(() => {
  'use strict';
  const O = window.Office;
  if (!O) return;

  const COCONUT = '#FBF5EA', SOY = '#1E2A26', PANDAN = '#1F6B4F', PANDAN_L = '#3DA881';
  const SAMBAL = '#E8553D', SAMBAL_D = '#C93F28', KAYA = '#F2B33D';
  const ROOM = 3.0, CORR = 1.4, ROWS = 3, WING = ROOM * 2 + CORR; // 7.4 tiles
  const WY = ROOM * ROWS;                                         // rooms end, chill zone starts
  const DOOR0 = 0.9, DOOR1 = 2.1;                                 // door gap along the corridor wall

  const ROOMS = [
    { name: 'Profiterole', color: SAMBAL, ink: '#fff', col: 0, row: 0 },
    { name: 'Madeleine', color: KAYA, ink: SOY, col: 0, row: 1 },
    { name: 'Crackers', color: PANDAN, ink: '#fff', col: 0, row: 2 },
    { name: 'Popelini', color: SAMBAL_D, ink: '#fff', col: 1, row: 0 },
    { name: 'Cookies', color: PANDAN_L, ink: '#fff', col: 1, row: 1 },
    { name: 'Financier', color: SOY, ink: KAYA, col: 1, row: 2 },
  ];

  const mix = (a, b, t) => {
    const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('');
  };

  // Each room's furniture, in local tiles for a room whose door is on its
  // right (east) wall. Rooms on the far side are mirrored. Every item has a
  // footprint x, y, w, d. Seats: face 'front' = towards the viewer.
  const LAYOUT = {
    Profiterole: (c) => ({
      items: [
        { k: 'rug', x: 0.3, y: 1.0, w: 1.9, d: 1.8, color: mix(c, COCONUT, 0.45) },
        { k: 'sofa', x: 0.15, y: 0.12, w: 1.55, d: 0.75, back: 'n', color: SAMBAL },
        { k: 'board', x: 1.8, y: 0.08, w: 1.1, d: 0.08, art: 'plans' },
        { k: 'plant', x: 0.3, y: 2.6, w: 0.4, d: 0.4 },
        { k: 'lamp', x: 1.2, y: 2.65, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 0.6, y: 0.62, act: 'relax', face: 'front', sit: 0.36, emoji: '🗺️' },
        { x: 1.25, y: 0.62, act: 'relax', face: 'front', sit: 0.36, emoji: '☕' },
        { x: 2.35, y: 0.75, act: 'whiteboard', face: 'back', emoji: '✏️' },
      ],
    }),
    Madeleine: (c) => ({
      items: [
        { k: 'rug', x: 0.3, y: 1.1, w: 2.0, d: 1.6, color: mix(c, COCONUT, 0.4) },
        { k: 'desk', x: 0.2, y: 0.15, w: 1.4, d: 0.7, top: 'drawing' },
        { k: 'stool', x: 0.7, y: 1.0, w: 0.4, d: 0.4, color: KAYA },
        { k: 'board', x: 1.75, y: 0.08, w: 1.05, d: 0.08, art: 'mood' },
        { k: 'beanbag', x: 1.35, y: 1.4, w: 0.8, d: 0.8, color: KAYA },
        { k: 'plant', x: 2.6, y: 2.65, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 0.9, y: 1.2, act: 'relax', face: 'back', sit: 0.47, emoji: '✏️' },
        { x: 2.25, y: 0.8, act: 'whiteboard', face: 'back', emoji: '🎨' },
        { x: 1.75, y: 1.8, act: 'beanbag', face: 'front', sit: 0.18, emoji: '💭' },
      ],
    }),
    Crackers: (c) => ({
      items: [
        { k: 'rug', x: 0.3, y: 1.1, w: 2.0, d: 1.6, color: mix(c, COCONUT, 0.55) },
        { k: 'desk', x: 0.2, y: 0.15, w: 1.5, d: 0.7, top: 'monitor' },
        { k: 'stool', x: 0.75, y: 1.0, w: 0.4, d: 0.4, color: SOY },
        { k: 'beanbag', x: 1.4, y: 1.4, w: 0.8, d: 0.8, color: PANDAN_L },
        { k: 'lamp', x: 2.55, y: 0.25, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 0.95, y: 1.2, act: 'relax', face: 'back', sit: 0.47, emoji: '💻' },
        { x: 1.8, y: 1.8, act: 'beanbag', face: 'front', sit: 0.18, emoji: '🎧' },
      ],
    }),
    Popelini: (c) => ({
      items: [
        { k: 'rug', x: 0.3, y: 0.9, w: 1.9, d: 1.8, color: mix(c, COCONUT, 0.6) },
        { k: 'board', x: 0.2, y: 0.08, w: 1.5, d: 0.08, art: 'swatches' },
        { k: 'board', x: 1.8, y: 0.08, w: 1.0, d: 0.08, art: 'posters' },
        { k: 'armchair', x: 0.25, y: 1.15, w: 0.95, d: 0.8, back: 'n', color: SAMBAL_D },
        { k: 'plant', x: 2.6, y: 2.65, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 0.72, y: 1.6, act: 'relax', face: 'front', sit: 0.36, emoji: '🎨' },
        { x: 1.0, y: 0.75, act: 'whiteboard', face: 'back', emoji: '✨' },
      ],
    }),
    Cookies: (c) => ({
      items: [
        { k: 'rug', x: 0.3, y: 0.3, w: 1.9, d: 1.4, color: mix(c, COCONUT, 0.5) },
        { k: 'board', x: 0.25, y: 0.08, w: 1.5, d: 0.08, art: 'backdrop' },
        { k: 'tripod', x: 0.85, y: 1.45, w: 0.3, d: 0.3 },
        { k: 'ringlight', x: 0.85, y: 1.75, w: 0.3, d: 0.2 },
        { k: 'beanbag', x: 1.45, y: 0.45, w: 0.75, d: 0.75, color: SAMBAL },
        { k: 'plant', x: 2.6, y: 0.25, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 1.0, y: 0.7, act: 'phone', face: 'front', emoji: '🤳' },
        { x: 1.82, y: 0.85, act: 'beanbag', face: 'front', sit: 0.18, emoji: '📱' },
      ],
    }),
    Financier: (c) => ({
      items: [
        { k: 'rug', x: 0.2, y: 0.2, w: 1.9, d: 1.5, color: mix(KAYA, COCONUT, 0.55) },
        { k: 'armchair', x: 0.2, y: 0.15, w: 0.95, d: 0.8, back: 'n', color: PANDAN },
        { k: 'sidetable', x: 1.25, y: 0.3, w: 0.5, d: 0.5 },
        { k: 'plant', x: 1.95, y: 0.25, w: 0.4, d: 0.4 },
        { k: 'plant', x: 0.25, y: 2.6, w: 0.4, d: 0.4 },
        { k: 'plant', x: 0.85, y: 2.65, w: 0.4, d: 0.4 },
        { k: 'lamp', x: 2.6, y: 2.6, w: 0.4, d: 0.4 },
      ],
      pois: [
        { x: 0.67, y: 0.75, act: 'relax', face: 'front', sit: 0.36, emoji: '📒' },
        { x: 1.6, y: 1.1, act: 'plant', face: 'back', emoji: '🌱' },
      ],
    }),
  };

  // The shared chill zone, local to (W0, WY); 7.4 wide.
  function chillZone(depth) {
    const items = [
      { k: 'rug', x: 0.3, y: 0.5, w: 2.9, d: 3.0, color: mix(SAMBAL, COCONUT, 0.62) },
      { k: 'rug', x: 4.3, y: 2.6, w: 2.8, d: Math.min(2.6, depth - 2.8), color: mix(PANDAN_L, COCONUT, 0.6) },
      { k: 'tv', x: 0.55, y: 0.12, w: 1.9, d: 0.5 },
      { k: 'sofa', x: 0.45, y: 2.35, w: 2.1, d: 0.8, back: 's', color: PANDAN },
      { k: 'beanbag', x: 2.55, y: 1.3, w: 0.8, d: 0.8, color: KAYA },
      { k: 'snackbar', x: 4.7, y: 0.12, w: 2.4, d: 0.65 },
      { k: 'gametable', x: 5.25, y: 3.3, w: 1.0, d: 1.0 },
      { k: 'record', x: 0.35, y: depth - 1.05, w: 0.9, d: 0.55 },
      { k: 'speaker', x: 1.35, y: depth - 1.0, w: 0.45, d: 0.4 },
      { k: 'sign', x: 2.6, y: depth - 0.55, w: 1.5, d: 0.08, art: 'sign' },
      { k: 'plant', x: 7.0, y: depth - 0.45, w: 0.4, d: 0.4 },
      { k: 'plant', x: 4.15, y: 0.3, w: 0.4, d: 0.4 },
    ];
    const pois = [
      { x: 0.95, y: 2.5, act: 'relax', face: 'back', sit: 0.36, emoji: '📺' },
      { x: 1.55, y: 2.5, act: 'relax', face: 'back', sit: 0.36, emoji: '🍿' },
      { x: 2.15, y: 2.5, act: 'relax', face: 'back', sit: 0.36, emoji: '📺' },
      { x: 2.95, y: 1.7, act: 'beanbag', face: 'front', sit: 0.18, emoji: '🎮' },
      { x: 5.3, y: 1.15, act: 'coffee', face: 'back', emoji: '🧋' },
      { x: 6.4, y: 1.15, act: 'coffee', face: 'back', emoji: '🍪' },
      { x: 4.75, y: 3.8, act: 'relax', face: 'side', sit: 0.45, emoji: '♟️', pair: 'game' },
      { x: 6.75, y: 3.8, act: 'relax', face: 'side', sit: 0.45, emoji: '♟️', pair: 'game' },
      { x: 0.8, y: depth - 1.5, act: 'music', face: 'front', emoji: '🎵' },
    ];
    return { items, pois, stools: [[4.75, 3.8], [6.75, 3.8]] };
  }

  // ------------------------------------------------------------ shared wall art
  // fn(c, w, h, t): draw in a frame where 32 px = 1 tile; (0,0) is the top-left.
  const ART = {
    plans(c, w, h) {
      c.fillStyle = '#fdfdfb'; c.fillRect(0, 0, w, h);
      c.fillStyle = SOY; c.font = '800 6px ui-sans-serif, system-ui, sans-serif'; c.fillText('Q4 PLAN', 4, 8);
      c.strokeStyle = PANDAN; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(4, 14 + i * 6); c.lineTo(4 + 14 + i * 4, 14 + i * 6); c.stroke(); }
      c.strokeStyle = SAMBAL; c.strokeRect(w * 0.45, 5, 10, 7); c.strokeRect(w * 0.7, 13, 10, 7);
      c.beginPath(); c.moveTo(w * 0.45 + 10, 9); c.lineTo(w * 0.7, 16); c.stroke();
      for (const [x, y, col] of [[w * 0.5, 22, KAYA], [w * 0.62, 24, PANDAN_L], [w * 0.8, 25, KAYA]]) { c.fillStyle = col; c.fillRect(x, y, 6, 6); }
    },
    mood(c, w, h) {
      c.fillStyle = '#e6cfa6'; c.fillRect(0, 0, w, h);
      const cols = [SAMBAL, PANDAN_L, KAYA, PANDAN, '#f7d9c4', SAMBAL_D];
      for (let i = 0; i < 6; i++) {
        const x = 3 + (i % 3) * (w - 6) / 3, y = 3 + Math.floor(i / 3) * (h - 6) / 2;
        c.fillStyle = '#fff'; c.fillRect(x, y, (w - 6) / 3 - 2, (h - 6) / 2 - 2);
        c.fillStyle = cols[i]; c.fillRect(x + 1.5, y + 1.5, (w - 6) / 3 - 5, (h - 6) / 2 - 7);
      }
      c.fillStyle = SAMBAL_D; for (const x of [6, w / 2, w - 6]) { c.beginPath(); c.arc(x, 3, 1.3, 0, 7); c.fill(); }
    },
    swatches(c, w, h) {
      c.fillStyle = COCONUT; c.fillRect(0, 0, w, h);
      const sw = [PANDAN, PANDAN_L, SAMBAL, SAMBAL_D, SOY, KAYA];
      const bw = (w - 8) / 3, bh = (h - 12) / 2;
      sw.forEach((col, i) => { c.fillStyle = col; c.fillRect(4 + (i % 3) * bw, 4 + Math.floor(i / 3) * (bh + 2), bw - 2, bh - 2); });
      c.fillStyle = SOY; c.font = '700 4.5px ui-sans-serif, system-ui, sans-serif'; c.fillText('BRAND', 4, h - 2);
    },
    posters(c, w, h) {
      c.fillStyle = '#f3ead8'; c.fillRect(0, 0, w, h);
      c.fillStyle = PANDAN; c.fillRect(2, 2, w / 2 - 3, h - 4);
      c.fillStyle = SAMBAL; c.fillRect(w / 2 + 1, 2, w / 2 - 3, h - 4);
      ART.cord(c, w / 4, h / 2, 6);
      c.fillStyle = '#fff'; c.font = '800 6px ui-sans-serif, system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText('3SL', w * 0.75, h / 2 + 2); c.textAlign = 'left';
    },
    backdrop(c, w, h) {
      c.fillStyle = mix(KAYA, COCONUT, 0.3); c.fillRect(0, 0, w, h);
      ART.cord(c, w / 2, h / 2, 9);
    },
    sign(c, w, h) {
      c.fillStyle = '#23382f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#a98a5a'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
      c.fillStyle = COCONUT; c.font = '800 8px ui-sans-serif, system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText('CHILL ZONE', w / 2, h / 2 - 1);
      c.fillStyle = KAYA; c.font = '600 5px ui-sans-serif, system-ui, sans-serif';
      c.fillText('snacks · games · tunes', w / 2, h / 2 + 7); c.textAlign = 'left';
    },
    // the three-strand cord, simplified: three wavy strands
    cord(c, cx, cy, r) {
      const cols = [PANDAN, SAMBAL, KAYA];
      c.lineWidth = Math.max(1.5, r / 3); c.lineCap = 'round';
      cols.forEach((col, i) => {
        c.strokeStyle = col; c.beginPath();
        for (let k = 0; k <= 10; k++) {
          const y = cy - r + (2 * r * k) / 10, x = cx + Math.sin(k * 0.9 + i * 2.1) * r * 0.45;
          k ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      });
    },
    plate(c, w, h, room) {
      c.fillStyle = room.color; c.fillRect(0, 0, w, h);
      c.fillStyle = room.ink; c.font = `800 ${Math.min(7.5, h * 0.72)}px ui-sans-serif, system-ui, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(room.name, w / 2, h / 2 + 0.5);
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    },
    tv(c, w, h, t) {
      const hue = (t / 60) % 360;
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, `hsl(${hue}, 55%, 55%)`); g.addColorStop(1, `hsl(${(hue + 70) % 360}, 60%, 40%)`);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(w * 0.3 + Math.sin(t / 900) * 6, h * 0.55, 3, 0, 7); c.fill();
      c.fillStyle = KAYA; c.fillRect(w * 0.62, h * 0.4 + Math.cos(t / 700) * 3, 5, 5);
    },
  };
  window.WingArt = ART;

  // ------------------------------------------------------------ floor plan
  O.prototype.wingWidth = function () { return WING; };

  O.prototype.buildWing = function ({ W0, W, D, add, prop, solid, poi, grid }) {
    const walls = [], plates = [], floors = [], rugs = [];
    const items = [];
    const wall = (x, y, w, d, color) => {
      walls.push({ x, y, w, d, color });
      if (w === 0) solid(x - 0.06, y, 0.12, d, 0.04); else solid(x, y - 0.06, w, 0.12, 0.04);
    };
    const place = (it) => {
      if (it.k === 'rug') { rugs.push(it); return; }
      items.push(it);
      if (!['sign'].includes(it.k)) solid(it.x, it.y, it.w, it.d, 0.04);
    };
    const rooms = [];
    for (const r of ROOMS) {
      const rx = W0 + (r.col ? ROOM + CORR : 0), ry = r.row * ROOM;
      const mirror = r.col === 1;
      const X = (x, w = 0) => (mirror ? rx + ROOM - x - w : rx + x);
      floors.push({ x: rx, y: ry, w: ROOM, d: ROOM, color: mix(r.color, COCONUT, 0.82) });
      const { items: its, pois } = LAYOUT[r.name](r.color);
      for (const it of its) place({ ...it, x: X(it.x, it.w), y: ry + it.y, room: r.name });
      for (const q of pois) poi(X(q.x), ry + q.y, q.act, q.face, { sit: q.sit || 0, emoji: q.emoji, room: r.name });
      // walls: low wainscot in the room colour with glass above; door on the corridor side
      const doorX = mirror ? rx : rx + ROOM, farX = mirror ? rx + ROOM : rx;
      const tint = mix(r.color, COCONUT, 0.35);
      wall(farX, ry, 0, ROOM, tint);
      wall(doorX, ry, 0, DOOR0, tint);
      wall(doorX, ry + DOOR1, 0, ROOM - DOOR1, tint);
      wall(rx, ry + ROOM, ROOM, 0, tint);
      plates.push({ x: doorX, y0: ry + DOOR0 - 0.35, y1: ry + DOOR1 + 0.35, z0: 1.78, z1: 2.08, room: r });
      rooms.push({ ...r, x: rx, y: ry, w: ROOM, d: ROOM });
    }
    // corridor floor
    floors.push({ x: W0 + ROOM, y: 0, w: CORR, d: WY, color: null, kind: 'wood' });
    // chill zone
    const depth = D - WY;
    floors.push({ x: W0, y: WY, w: WING, d: depth, color: '#f6e7cc', kind: 'carpet' });
    const cz = chillZone(depth);
    for (const it of cz.items) place({ ...it, x: W0 + it.x, y: WY + it.y });
    for (const q of cz.pois) poi(W0 + q.x, WY + q.y, q.act, q.face, { sit: q.sit || 0, emoji: q.emoji, ent: true, pair: q.pair });
    for (const [sx, sy] of cz.stools) items.push({ k: 'stool', x: W0 + sx - 0.2, y: WY + sy - 0.2, w: 0.4, d: 0.4, color: SAMBAL });

    // 2D draw closures, depth-sorted with everything else
    for (const it of items) add(it.x + it.w / 2 + it.y + it.d / 2 + (it.k === 'board' || it.k === 'sign' ? -0.3 : 0), () => this.wingItem(it));
    for (const w of walls) {
      const len = w.w || w.d, n = Math.max(1, Math.ceil(len / 0.9));
      for (let k = 0; k < n; k++) {
        const seg = w.w ? { x: w.x + (w.w / n) * k, y: w.y, w: w.w / n, d: 0 } : { x: w.x, y: w.y + (w.d / n) * k, w: 0, d: w.d / n };
        add(seg.x + seg.w / 2 + seg.y + seg.d / 2 + 0.02, () => this.wingWall(seg, w.color));
      }
    }
    for (const pl of plates) add(pl.x + (pl.y0 + pl.y1) / 2 + 0.05, () => this.wingPlate(pl));
    prop('wing', {});
    return { W0, W, WY, CORR, ROOM, rooms, walls, plates, floors, rugs, items };
  };

  // ------------------------------------------------------------ 2D drawing
  const P = (o, x, y, z = 0) => o.iso(x, y, z);

  // Draw an art function on a vertical plane. dir 'y': plane y = const, art
  // runs along +x. dir 'x': plane x = const, art runs along -y (as seen).
  O.prototype.wingPlane = function (dir, x, y, zTop, fn, w, h, extra) {
    const c = this.ctx;
    const o = this.iso(x, y, zTop);
    c.save();
    c.translate(o.x, o.y);
    c.transform(1, dir === 'y' ? 0.5 : -0.5, 0, 1, 0, 0);
    c.beginPath(); c.rect(0, 0, w * 32, h * 32); c.clip();
    fn(c, w * 32, h * 32, extra);
    c.restore();
  };

  O.prototype.drawWingFloor = function () {
    const wing = this.plan.wing;
    if (!wing) return;
    const pal = this.pal;
    for (const f of wing.floors) {
      if (f.kind === 'wood') {
        for (let y = f.y; y < f.y + f.d - 0.01; y += 1) {
          const y1 = Math.min(f.y + f.d, y + 1);
          this.poly([P(this, f.x, y), P(this, f.x + f.w, y), P(this, f.x + f.w, y1), P(this, f.x, y1)], Math.floor(y) % 2 ? pal.wood1 : pal.wood2);
        }
        continue;
      }
      this.poly([P(this, f.x, f.y), P(this, f.x + f.w, f.y), P(this, f.x + f.w, f.y + f.d), P(this, f.x, f.y + f.d)], pal.dark ? this.shade(f.color, -120) : f.color);
      if (f.kind === 'carpet') {
        for (let x = f.x + 0.5; x < f.x + f.w; x += 0.5) this.poly([P(this, x, f.y), P(this, x + 0.012, f.y), P(this, x + 0.012, f.y + f.d), P(this, x, f.y + f.d)], 'rgba(120,80,30,.05)');
      }
    }
    for (const r of wing.rugs) {
      const col = pal.dark ? this.shade(r.color, -90) : r.color;
      this.poly([P(this, r.x, r.y), P(this, r.x + r.w, r.y), P(this, r.x + r.w, r.y + r.d), P(this, r.x, r.y + r.d)], col);
      this.poly([P(this, r.x + 0.12, r.y + 0.12), P(this, r.x + r.w - 0.12, r.y + 0.12), P(this, r.x + r.w - 0.12, r.y + r.d - 0.12), P(this, r.x + 0.12, r.y + r.d - 0.12)], null, this.shade(col, -30));
    }
  };

  O.prototype.wingWall = function (s, color) {
    const pal = this.pal;
    const H = 0.45, TOP = 2.1;
    const col = pal.dark ? this.shade(color, -70) : color;
    if (s.d === 0) {
      this.box(s.x, s.y - 0.04, 0, s.w, 0.08, H, this.shade(col, 18), col, this.shade(col, -18));
      this.poly([P(this, s.x, s.y, H), P(this, s.x + s.w, s.y, H), P(this, s.x + s.w, s.y, TOP), P(this, s.x, s.y, TOP)], pal.glass, pal.glassEdge);
      this.poly([P(this, s.x, s.y, TOP), P(this, s.x + s.w, s.y, TOP), P(this, s.x + s.w, s.y, TOP + 0.05), P(this, s.x, s.y, TOP + 0.05)], pal.trim);
    } else {
      this.box(s.x - 0.04, s.y, 0, 0.08, s.d, H, this.shade(col, 18), col, this.shade(col, -18));
      this.poly([P(this, s.x, s.y, H), P(this, s.x, s.y + s.d, H), P(this, s.x, s.y + s.d, TOP), P(this, s.x, s.y, TOP)], pal.glass, pal.glassEdge);
      this.poly([P(this, s.x, s.y, TOP), P(this, s.x, s.y + s.d, TOP), P(this, s.x, s.y + s.d, TOP + 0.05), P(this, s.x, s.y, TOP + 0.05)], pal.trim);
    }
  };

  O.prototype.wingPlate = function (pl) {
    const len = pl.y1 - pl.y0, h = pl.z1 - pl.z0;
    this.box(pl.x - 0.03, pl.y0, pl.z0, 0.06, len, h, this.shade(pl.room.color, 25), this.shade(pl.room.color, -10), pl.room.color);
    this.wingPlane('x', pl.x + 0.031, pl.y1, pl.z1, (c, w, hh) => ART.plate(c, w, hh, pl.room), len, h);
  };

  O.prototype.wingItem = function (it) {
    const pal = this.pal;
    const { x, y, w, d } = it;
    const cx = x + w / 2, cy = y + d / 2;
    const B = (bx, by, bz, bw, bd, bh, col) => this.box(bx, by, bz, bw, bd, bh, this.shade(col, 16), col, this.shade(col, -16));
    const c = this.ctx;
    switch (it.k) {
      case 'board': case 'sign': {
        const z0 = it.k === 'sign' ? 0.35 : 0.55, z1 = it.k === 'sign' ? 1.1 : 1.75;
        const frame = it.k === 'sign' ? '#8a6a44' : this.shade(pal.deskL, -10);
        B(x + 0.06, y, 0, 0.05, 0.05, z0, frame);
        B(x + w - 0.11, y, 0, 0.05, 0.05, z0, frame);
        B(x, y, z0, w, 0.06, z1 - z0, frame);
        this.wingPlane('y', x + 0.04, y + 0.061, z1 - 0.04, ART[it.art], w - 0.08, z1 - z0 - 0.08, this.t);
        break;
      }
      case 'sofa': case 'armchair': {
        const col = pal.dark ? this.shade(it.color, -40) : it.color;
        const backY = it.back === 'n' ? y : y + d - 0.22;
        const seat = () => B(x + 0.12, y + (it.back === 'n' ? 0.2 : 0.02), 0, w - 0.24, d - 0.22, 0.34, col);
        const back = () => B(x, backY, 0, w, 0.22, 0.78, this.shade(col, -8));
        const arms = () => { B(x, y, 0, 0.14, d, 0.52, this.shade(col, -4)); B(x + w - 0.14, y, 0, 0.14, d, 0.52, this.shade(col, -4)); };
        if (it.back === 'n') { back(); seat(); arms(); }
        else { seat(); arms(); back(); }
        if (it.k === 'sofa') B(x + 0.25, y + (it.back === 'n' ? 0.25 : 0.1), 0.34, 0.32, 0.14, 0.26, KAYA);
        break;
      }
      case 'desk': {
        const top = this.shade(pal.deskTop, 6);
        for (const [lx, ly] of [[0.05, 0.05], [w - 0.1, 0.05], [0.05, d - 0.1], [w - 0.1, d - 0.1]]) B(x + lx, y + ly, 0, 0.05, 0.05, 0.72, pal.deskL);
        this.box(x, y, 0.72, w, d, 0.05, top, pal.deskL, pal.deskR);
        if (it.top === 'monitor') {
          B(x + w / 2 - 0.05, y + 0.15, 0.77, 0.1, 0.08, 0.15, '#333');
          B(x + w / 2 - 0.35, y + 0.12, 0.92, 0.7, 0.05, 0.42, '#1f2226');
          const g = (t) => 0.5 + 0.5 * Math.sin(this.t / 500 + t);
          this.wingPlane('y', x + w / 2 - 0.32, y + 0.171, 1.31, (cc, ww, hh) => {
            cc.fillStyle = '#12261e'; cc.fillRect(0, 0, ww, hh);
            const cols = [PANDAN_L, KAYA, SAMBAL, '#9fd'];
            for (let i = 0; i < 5; i++) { cc.fillStyle = cols[i % 4]; cc.globalAlpha = 0.6 + 0.4 * g(i); cc.fillRect(2 + (i % 2) * 3, 2 + i * 2.4, 6 + ((i * 7) % 9), 1.3); }
            cc.globalAlpha = 1;
          }, 0.64, 0.36);
          B(x + w / 2 - 0.3, y + 0.42, 0.77, 0.6, 0.18, 0.025, '#e9e6df');
          B(x + w / 2 + 0.38, y + 0.45, 0.77, 0.08, 0.12, 0.03, '#ddd');
          B(x + 0.1, y + 0.15, 0.77, 0.16, 0.16, 0.18, SAMBAL);
        } else if (it.top === 'drawing') {
          const x0 = x + 0.15, x1 = x + w - 0.35;
          this.poly([P(this, x0, y + 0.6, 0.79), P(this, x1, y + 0.6, 0.79), P(this, x1, y + 0.15, 1.18), P(this, x0, y + 0.15, 1.18)], '#fffdf6', '#c9b89a');
          c.strokeStyle = SAMBAL; c.lineWidth = 1;
          const a = P(this, x0 + 0.2, y + 0.45, 0.92), b = P(this, x0 + 0.6, y + 0.3, 1.05), e = P(this, x0 + 0.85, y + 0.42, 0.95);
          c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(b.x, b.y, e.x, e.y); c.stroke();
          c.strokeStyle = PANDAN; const f = P(this, x0 + 0.3, y + 0.3, 1.05), gg = P(this, x0 + 0.7, y + 0.5, 0.9);
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(gg.x, gg.y); c.stroke();
          B(x + w - 0.28, y + 0.2, 0.77, 0.14, 0.14, 0.16, PANDAN_L);
          for (const [k, col] of [[0, SAMBAL], [1, KAYA], [2, PANDAN]]) B(x + w - 0.25 + k * 0.03, y + 0.24, 0.93, 0.02, 0.02, 0.12, col);
        }
        break;
      }
      case 'stool': this.stool(cx, cy, 0.45, pal.dark ? this.shade(it.color, -30) : it.color); break;
      case 'beanbag': this.beanbag(cx, cy, pal.dark ? this.shade(it.color, -40) : it.color); break;
      case 'plant': this.plant(cx, cy); break;
      case 'lamp': this.floorLamp(cx, cy); break;
      case 'sidetable': {
        B(x + 0.2, y + 0.2, 0, 0.08, 0.08, 0.5, pal.deskL);
        this.box(x, y, 0.5, w, d, 0.05, this.shade(pal.deskTop, 8), pal.deskL, pal.deskR);
        B(x + 0.08, y + 0.1, 0.55, 0.28, 0.2, 0.06, PANDAN);          // the ledger
        B(x + 0.1, y + 0.12, 0.61, 0.24, 0.16, 0.012, '#f6f0e0');
        B(x + 0.36, y + 0.3, 0.55, 0.09, 0.09, 0.1, '#fff');          // tea
        break;
      }
      case 'tripod': {
        const top = P(this, cx, cy, 1.05);
        c.strokeStyle = '#2b2b2e'; c.lineWidth = 1.4;
        for (const [dx, dy] of [[-0.15, -0.05], [0.15, -0.05], [0, 0.17]]) { const f = P(this, cx + dx, cy + dy, 0); c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(top.x, top.y); c.stroke(); }
        B(cx - 0.08, cy - 0.02, 1.05, 0.16, 0.04, 0.28, '#111');
        const s = P(this, cx, cy - 0.02, 1.3); c.fillStyle = '#e8553d'; c.beginPath(); c.arc(s.x + 1, s.y + 2, 1.2, 0, 7); c.fill();
        break;
      }
      case 'ringlight': {
        B(cx - 0.03, cy - 0.03, 0, 0.06, 0.06, 1.35, '#3a3a3e');
        this.wingPlane('y', cx - 0.4, cy, 1.95, (cc, ww, hh) => {
          cc.shadowColor = 'rgba(255,240,190,.9)'; cc.shadowBlur = 10;
          cc.strokeStyle = '#fff6dc'; cc.lineWidth = 3.2;
          cc.beginPath(); cc.arc(ww / 2, hh / 2, ww * 0.34, 0, Math.PI * 2); cc.stroke();
        }, 0.8, 0.8);
        break;
      }
      case 'tv': {
        B(x, y, 0, w, d, 0.48, this.shade(pal.deskTop, -18));
        B(x + 0.15, y + d - 0.06, 0.08, w / 2 - 0.25, 0.01, 0.3, this.shade(pal.deskL, -10));
        B(x + w / 2 + 0.1, y + d - 0.06, 0.08, w / 2 - 0.25, 0.01, 0.3, this.shade(pal.deskL, -10));
        B(x + w / 2 - 0.05, y + 0.15, 0.48, 0.1, 0.08, 0.12, '#222');
        B(x + 0.1, y + 0.12, 0.6, w - 0.2, 0.06, 0.82, '#16181b');
        this.wingPlane('y', x + 0.14, y + 0.181, 1.38, ART.tv, w - 0.28, 0.74, this.t);
        B(x + w - 0.45, y + 0.25, 0.48, 0.3, 0.2, 0.06, '#2c2c30');   // console
        break;
      }
      case 'snackbar': {
        this.box(x, y, 0, w, d, 0.92, this.shade(pal.deskTop, 10), SAMBAL_D, this.shade(SAMBAL_D, -20));
        // popcorn, chips, kaya toast, teh tarik
        B(x + 0.2, y + 0.2, 0.92, 0.22, 0.22, 0.3, '#fff');
        for (let k = 0; k < 3; k++) B(x + 0.2 + k * 0.075, y + 0.42, 0.92, 0.04, 0.005, 0.3, SAMBAL);
        const bowl = P(this, x + 0.85, y + 0.33, 0.95);
        c.fillStyle = '#c9a26b'; c.beginPath(); c.ellipse(bowl.x, bowl.y, 9, 4.5, 0, 0, 7); c.fill();
        c.fillStyle = KAYA; c.beginPath(); c.ellipse(bowl.x, bowl.y - 2, 7, 3, 0, 0, 7); c.fill();
        B(x + 1.25, y + 0.2, 0.92, 0.3, 0.22, 0.05, '#e9c08a'); B(x + 1.25, y + 0.2, 0.97, 0.3, 0.22, 0.03, PANDAN_L); B(x + 1.25, y + 0.2, 1.0, 0.3, 0.22, 0.05, '#e9c08a');
        for (let k = 0; k < 3; k++) B(x + 1.75 + k * 0.17, y + 0.25, 0.92, 0.1, 0.1, 0.18, '#c98b4e');
        break;
      }
      case 'gametable': {
        B(cx - 0.05, cy - 0.05, 0, 0.1, 0.1, 0.7, '#555');
        const t = P(this, cx, cy, 0.72);
        c.fillStyle = this.shade(pal.deskTop, -15); c.beginPath(); c.ellipse(t.x, t.y + 3, 30, 15, 0, 0, 7); c.fill();
        c.fillStyle = this.shade(pal.deskTop, 12); c.beginPath(); c.ellipse(t.x, t.y, 30, 15, 0, 0, 7); c.fill();
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const a = cx - 0.25 + i * 0.125, b = cy - 0.25 + j * 0.125;
          this.poly([P(this, a, b, 0.73), P(this, a + 0.125, b, 0.73), P(this, a + 0.125, b + 0.125, 0.73), P(this, a, b + 0.125, 0.73)], (i + j) % 2 ? SOY : COCONUT);
        }
        for (const [a, b, col] of [[-0.18, -0.18, SAMBAL], [0.06, 0.06, KAYA], [0.18, -0.06, SAMBAL]]) { const q = P(this, cx + a, cy + b, 0.76); c.fillStyle = col; c.beginPath(); c.arc(q.x, q.y, 2, 0, 7); c.fill(); }
        break;
      }
      case 'record': {
        this.box(x, y, 0, w, d, 0.62, this.shade(pal.deskTop, -5), pal.deskL, pal.deskR);
        B(x + 0.1, y + 0.05, 0.62, w - 0.2, d - 0.1, 0.06, '#2a2a2e');
        const r = P(this, x + w / 2 - 0.05, y + d / 2, 0.69);
        c.fillStyle = '#111'; c.beginPath(); c.ellipse(r.x, r.y, 10, 5, 0, 0, 7); c.fill();
        const a = this.t / 300;
        c.fillStyle = SAMBAL; c.beginPath(); c.ellipse(r.x + Math.cos(a) * 1.2, r.y + Math.sin(a) * 0.6, 3, 1.5, 0, 0, 7); c.fill();
        // little floating notes
        c.font = '700 9px ui-sans-serif, system-ui, sans-serif'; c.fillStyle = PANDAN;
        for (let i = 0; i < 2; i++) {
          const k = (this.t / 2600 + i / 2) % 1;
          c.globalAlpha = 1 - k; c.fillText(i ? '♫' : '♪', r.x + 6 + k * 10 + i * 6, r.y - 8 - k * 22); c.globalAlpha = 1;
        }
        break;
      }
      case 'speaker': {
        B(x, y, 0, w, d, 1.0, SOY);
        const f1 = P(this, x + w / 2, y + d, 0.7), f2 = P(this, x + w / 2, y + d, 0.3);
        const pulse = 1 + 0.08 * Math.sin(this.t / 120);
        c.fillStyle = '#3c4a44';
        c.beginPath(); c.ellipse(f1.x, f1.y, 3.5 * pulse, 4.5 * pulse, -0.45, 0, 7); c.fill();
        c.beginPath(); c.ellipse(f2.x, f2.y, 5 * pulse, 6.5 * pulse, -0.45, 0, 7); c.fill();
        break;
      }
    }
  };

  // ------------------------------------------------------------ who goes where
  const isIdle = (p) => !!(p.s && p.s.state === 'idle');
  O.prototype.poiAllowed = function (p, q) {
    if (q.room) return isIdle(p) && q.room === p.s.name;   // private
    if (isIdle(p)) return !!q.ent;                         // on a break: own room or the chill zone
    return true;
  };
  O.prototype.poiBoost = function (p, q) {
    if (isIdle(p)) return q.room ? 8 : 0.45;               // ~85% own room, ~15% chill zone
    return q.ent ? 1.2 : 1;
  };
  O.prototype.deskNapAllowed = function (p) { return !isIdle(p); };

  // When someone's status changes (e.g. goes on a break), drop a spot they're
  // no longer allowed at so they head somewhere that fits.
  const baseUpdate = O.prototype.update;
  O.prototype.update = function (sessions) {
    baseUpdate.call(this, sessions);
    for (const p of this.people.values()) {
      if (p.mode === 'wander' && p.poi && !this.poiAllowed(p, p.poi)) {
        this.release(p);
        p.until = 0;
        p.path = [];
      }
    }
  };
})();
