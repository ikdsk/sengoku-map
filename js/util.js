// 共通ユーティリティとデータ索引。window.SG に公開する。
(function () {
  const S = window.SENGOKU;
  S.images = S.images || {};
  const SG = (window.SG = {});

  SG.S = S;
  SG.clanById = Object.fromEntries(S.clans.map((c) => [c.id, c]));
  SG.personById = Object.fromEntries(S.people.map((p) => [p.id, p]));
  SG.provById = Object.fromEntries(S.map.provinces.map((p) => [p.id, p]));
  SG.eventById = Object.fromEntries(S.events.map((e) => [e.id, e]));
  SG.placeById = Object.fromEntries(S.places.map((e) => [e.id, e]));
  SG.snaps = S.snapshots;
  SG.years = S.snapshots.map((s) => s.year);
  SG.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  SG.el = function (tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(kid));
    return e;
  };
  SG.svgEl = function (tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  // ---- 色 ----
  SG.hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  SG.rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  SG.lerpC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  SG.darken = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  SG.clanRGB = (id) => SG.hex((SG.clanById[id] || SG.clanById.kokujin).color);

  // ---- スナップショット ----
  SG.snapIndex = (year) => {
    let best = 0;
    for (let i = 0; i < SG.years.length; i++) if (SG.years[i] <= year) best = i;
    return best;
  };
  SG.counts = (snapIdx) => {
    const c = {};
    const o = SG.snaps[snapIdx].owners;
    for (const k in o) c[o[k]] = (c[o[k]] || 0) + 1;
    return c;
  };
  SG.headAt = (clan, year) => {
    let cur = null;
    for (const [y, h] of clan.heads || []) if (y <= year) cur = h;
    if (!cur && clan.heads && clan.heads.length) cur = clan.heads[0][1];
    return cur;
  };
  // head → {name, person|null}
  SG.resolveHead = (h) => {
    if (!h) return null;
    if (typeof h === 'string') { const p = SG.personById[h]; return p ? { name: p.name, person: p } : { name: h, person: null }; }
    return { name: h.n, person: null };
  };

  // ---- 画像 ----
  const STD = [120, 250, 330, 500, 960, 1280, 1920];
  SG.imgRec = (key) => S.images[key] || null;
  SG.imgUrl = function (rec, w) {
    if (!rec) return '';
    const url0 = rec.url.replace(/[?#].*$/, '');
    const raster = rec.mime !== 'image/svg+xml';
    if (raster && rec.w && w >= rec.w) return url0;
    const m = url0.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+)$/);
    if (!m) return url0;
    const std = STD.find((s) => s >= w) || STD[STD.length - 1];
    if (raster && rec.w && std >= rec.w) return url0;
    return `${m[1]}/thumb/${m[2]}/${m[3]}/${std}px-${m[3]}${raster ? '' : '.png'}`;
  };

  // 家紋風プレースホルダ(画像が無い・読み込み失敗)
  SG.placeholder = function (label, cls) {
    const w = SG.el('div', { class: 'ph ' + (cls || ''), role: 'img', 'aria-label': label || '画像なし' });
    w.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="1"/><g fill="currentColor"><circle cx="50" cy="28" r="9"/><circle cx="31" cy="61" r="9"/><circle cx="69" cy="61" r="9"/></g></svg>';
    return w;
  };
  // 画像要素。失敗時は placeholder に差し替える。
  SG.img = function (key, opts) {
    opts = opts || {};
    const rec = SG.imgRec(key);
    if (!rec) return SG.placeholder(opts.alt, opts.cls);
    const img = SG.el('img', { class: opts.cls || '', alt: opts.alt || rec.label || '', loading: opts.eager ? 'eager' : 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    img.src = SG.imgUrl(rec, opts.w || 500);
    if (rec.w && rec.h) { img.width = rec.w; img.height = rec.h; }
    img.dataset.key = key;
    img.addEventListener('error', () => { if (img.parentNode) img.replaceWith(SG.placeholder(opts.alt || rec.label, opts.cls)); }, { once: true });
    return img;
  };
  SG.creditLine = function (key) {
    const r = SG.imgRec(key);
    if (!r) return '';
    return `${r.artist}／${r.license}`;
  };

  // ---- ルーティング ----
  SG.parseHash = function () {
    const h = location.hash || '';
    const m = h.match(/^#\/(year|clan|person|event|credits)(?:\/([^/?#]+))?/);
    if (!m) return { route: null, id: null, anchor: h.replace(/^#/, '') };
    return { route: m[1], id: m[2] ? decodeURIComponent(m[2]) : null };
  };
  SG.go = (hash, replace) => {
    if (replace) history.replaceState(null, '', hash); else location.hash = hash;
  };
  SG.fmtYears = (p) => `${p.birth}${p.fuzzy ? '頃' : ''}–${p.death}`;
  SG.yearLabel = (y) => `${y}年`;
})();
