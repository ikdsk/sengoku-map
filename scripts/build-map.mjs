// 旧国地図データ生成: Wikimedia Commons "Provinces of Japan with names.svg" (Ash Crow, CC BY 2.5) から
// 各国のパス・ラベル座標・重心を抽出し data/map.js を出力する。Node 標準機能のみ。
// 使い方: node scripts/build-map.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'scripts/src/provinces_with_names.svg'), 'utf8');

// ---- 国定義: 英語ラベル(原図表記の揺れ含む) → id / 漢字 / 地方 ----
const P = [
  ['Ezo', 'ezo', '蝦夷地', 'hokkaido'],
  ['Mutsu', 'mutsu', '陸奥', 'tohoku'], ['Dewa', 'dewa', '出羽', 'tohoku'],
  ['Sado', 'sado', '佐渡', 'hokuriku'], ['Echigo', 'echigo', '越後', 'hokuriku'], ['Noto', 'noto', '能登', 'hokuriku'],
  ['Shimotsuke', 'shimotsuke', '下野', 'kanto'], ['Hitachi', 'hitachi', '常陸', 'kanto'],
  ['Shimofusa', 'shimosa', '下総', 'kanto'], ['Kasuza', 'kazusa', '上総', 'kanto'], ['Awa', 'awa_b', '安房', 'kanto'],
  ['Kōzuke', 'kozuke', '上野', 'kanto'], ['Musashi', 'musashi', '武蔵', 'kanto'],
  ['Etchū', 'etchu', '越中', 'hokuriku'], ['Shinano', 'shinano', '信濃', 'tosan'], ['Kai', 'kai', '甲斐', 'tosan'],
  ['Izu', 'izu', '伊豆', 'tokai'], ['Sagami', 'sagami', '相模', 'kanto'], ['Suruga', 'suruga', '駿河', 'tokai'],
  ['Tōtomi', 'totomi', '遠江', 'tokai'], ['Kaga', 'kaga', '加賀', 'hokuriku'], ['Hida', 'hida', '飛騨', 'tosan'],
  ['Echizen', 'echizen', '越前', 'hokuriku'], ['Mino', 'mino', '美濃', 'tosan'], ['Mikawa', 'mikawa', '三河', 'tokai'],
  ['Owari', 'owari', '尾張', 'tokai'], ['Shima', 'shima', '志摩', 'kinki'], ['Iga', 'iga', '伊賀', 'kinki'],
  ['Ise', 'ise', '伊勢', 'kinki'], ['Yamato', 'yamato', '大和', 'kinki'], ['Kii', 'kii', '紀伊', 'kinki'],
  ['Ōmi', 'omi', '近江', 'kinki'], ['Kawa', 'kawachi', '河内', 'kinki'], ['Izumi', 'izumi', '和泉', 'kinki'],
  ['Yamashiro', 'yamashiro', '山城', 'kinki'], ['Wasaka', 'wakasa', '若狭', 'hokuriku'], ['Settsu', 'settsu', '摂津', 'kinki'],
  ['Tanba', 'tanba', '丹波', 'kinki'], ['Tango', 'tango', '丹後', 'kinki'], ['Tajima', 'tajima', '但馬', 'sanin'],
  ['Harima', 'harima', '播磨', 'sanyo'], ['Ibana', 'inaba', '因幡', 'sanin'], ['Hōki', 'hoki', '伯耆', 'sanin'],
  ['Oki', 'oki', '隠岐', 'sanin'], ['Mimakasa', 'mimasaka', '美作', 'sanyo'], ['Bizen', 'bizen', '備前', 'sanyo'],
  ['Awaji', 'awaji', '淡路', 'kinki'], ['Bitchū', 'bitchu', '備中', 'sanyo'], ['Awa', 'awa_s', '阿波', 'shikoku'],
  ['Sanuki', 'sanuki', '讃岐', 'shikoku'], ['Bingo', 'bingo', '備後', 'sanyo'], ['Izumo', 'izumo', '出雲', 'sanin'],
  ['Iwami', 'iwami', '石見', 'sanin'], ['Aki', 'aki', '安芸', 'sanyo'], ['Suwo', 'suo', '周防', 'sanyo'],
  ['Nagato', 'nagato', '長門', 'sanyo'], ['Iyo', 'iyo', '伊予', 'shikoku'], ['Tosa', 'tosa', '土佐', 'shikoku'],
  ['Buzen', 'buzen', '豊前', 'kyushu'], ['Bungo', 'bungo', '豊後', 'kyushu'], ['Chizuken', 'chikuzen', '筑前', 'kyushu'],
  ['Hizen', 'hizen', '肥前', 'kyushu'], ['Chikugo', 'chikugo', '筑後', 'kyushu'], ['Higo', 'higo', '肥後', 'kyushu'],
  ['Hyūga', 'hyuga', '日向', 'kyushu'], ['Ōsumi', 'osumi', '大隅', 'kyushu'], ['Satsuma', 'satsuma', '薩摩', 'kyushu'],
];
// 原図に無い離島国(壱岐・対馬)は近似の小さな楕円を手で追加する(下で生成)。座標は後で原図の九州北方に配置。

// ---- アフィン変換 ----
const I = [1, 0, 0, 1, 0, 0];
const mul = (a, b) => [
  a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
function parseTransform(t) {
  if (!t) return I;
  let m = I;
  for (const mm of t.matchAll(/(translate|matrix|scale)\(([^)]*)\)/g)) {
    const v = mm[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n = I;
    if (mm[1] === 'translate') n = [1, 0, 0, 1, v[0], v[1] ?? 0];
    else if (mm[1] === 'scale') n = [v[0], 0, 0, v[1] ?? v[0], 0, 0];
    else n = v;
    m = mul(m, n);
  }
  return m;
}

// ---- SVG 走査 ----
const tokRe = /<g\b([^>]*)>|<\/g>|<path\b([^>]*?)\/>|<text\b([^>]*)>([\s\S]*?)<\/text>/g;
const stack = [I];
const stackIds = [''];
const polys = []; // {d(transformed), pts[], id}
const texts = [];
let mt;
while ((mt = tokRe.exec(svg))) {
  if (mt[0].startsWith('<g')) {
    if (mt[0].endsWith('/>')) continue; // 空の自己閉じ g
    const tr = parseTransform((mt[1].match(/transform="([^"]*)"/) || [])[1]);
    const id = (mt[1].match(/id="([^"]*)"/) || [])[1] || '';
    stack.push(mul(stack[stack.length - 1], tr));
    stackIds.push(id);
  } else if (mt[0] === '</g>') {
    stack.pop(); stackIds.pop();
  } else if (mt[0].startsWith('<path')) {
    const a = mt[2];
    const inLayer1 = stackIds.includes('layer1');
    if (!inLayer1) continue;
    const d = (a.match(/\bd="([^"]*)"/) || [])[1];
    if (!d || !d.trim()) continue;
    const own = parseTransform((a.match(/transform="([^"]*)"/) || [])[1]);
    const m = mul(stack[stack.length - 1], own);
    polys.push({ ...transformPath(d, m), id: (a.match(/id="([^"]*)"/) || [])[1] });
  } else {
    const a = mt[3];
    const tsp = mt[4].match(/<tspan\b[^>]*x="([-\d.]+)"[^>]*y="([-\d.]+)"[^>]*>([^<]*)<\/tspan>/);
    if (!tsp) continue;
    const own = parseTransform((a.match(/transform="([^"]*)"/) || [])[1]);
    const m = mul(stack[stack.length - 1], own);
    const [x, y] = apply(m, +tsp[1], +tsp[2]);
    texts.push({ name: tsp[3].trim(), x, y });
  }
}

function transformPath(d, m) {
  const toks = d.match(/[MLCZmlczHhVv]|-?\d*\.?\d+(?:e-?\d+)?/g);
  let out = '';
  const subs = []; // flattened subpaths for hit-testing
  let cur = null, i = 0, cmd = '', px = 0, py = 0;
  const num = () => parseFloat(toks[i++]);
  const fmt = (x, y) => { const [a, b] = apply(m, x, y); return `${a.toFixed(1)} ${b.toFixed(1)}`; };
  const add = (x, y) => { const [a, b] = apply(m, x, y); cur.push([a, b]); };
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++];
    switch (cmd) {
      case 'M': px = num(); py = num(); cur = []; subs.push(cur); add(px, py); out += `M${fmt(px, py)}`; cmd = 'L'; break;
      case 'L': px = num(); py = num(); add(px, py); out += `L${fmt(px, py)}`; break;
      case 'C': {
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
        // 折れ線近似(判定用)
        for (let t = 0.25; t <= 1.001; t += 0.25) {
          const u = 1 - t;
          add(u ** 3 * px + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x, u ** 3 * py + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y);
        }
        out += `C${fmt(x1, y1)} ${fmt(x2, y2)} ${fmt(x, y)}`; px = x; py = y; break;
      }
      case 'z': case 'Z': out += 'Z'; break;
      default: throw new Error('unsupported cmd ' + cmd + ' in ' + d.slice(0, 80));
    }
  }
  return { d: out, subs };
}

const inPoly = (pt, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const hit = (pt, poly) => poly.subs.reduce((n, r) => n + (inPoly(pt, r) ? 1 : 0), 0) % 2 === 1;
const area = (ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]); return a / 2; };
function centroid(poly) {
  // 最大サブパスの面積重心
  let best = poly.subs[0];
  for (const r of poly.subs) if (Math.abs(area(r)) > Math.abs(area(best))) best = r;
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const f = best[j][0] * best[i][1] - best[i][0] * best[j][1];
    a += f; cx += (best[j][0] + best[i][0]) * f; cy += (best[j][1] + best[i][1]) * f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)];
}

// ---- ラベル→ポリゴン対応 ----
// 1) ラベル座標がポリゴン内に入るものだけ厳密に対応(引出線ラベルは外れる)  2) 残りは OVERRIDE(手作業で確認)
const labelTexts = texts.filter((t) => P.some((p) => p[0] === t.name));
const assigned = new Map(); // poly index -> id
const awaTexts = labelTexts.filter((t) => t.name === 'Awa').sort((a, b) => a.x - b.x);
const labelId = (t) => (t.name === 'Awa' ? (t === awaTexts[awaTexts.length - 1] ? 'awa_b' : 'awa_s') : P.find((p) => p[0] === t.name)[1]);
const byPolyId = (id) => polys.findIndex((p) => p.id === id);
const unhit = [];
// 国→パス対応は fetch-province-svgs.mjs が作る path-province.json(各国版SVGの赤塗りパス)を使う。蝦夷のみラベル内包で判定。
const PP = JSON.parse(readFileSync(join(root, 'scripts/src/path-province.json'), 'utf8'));
for (const [pid, id] of Object.entries(PP)) {
  const k = byPolyId(pid);
  if (k < 0) { console.error('unknown path', pid); continue; }
  assigned.set(k, id);
}
const ezoLabel = labelTexts.find((t) => t.name === 'Ezo');
{ const k = polys.findIndex((p) => hit([ezoLabel.x, ezoLabel.y], p)); assigned.set(k, 'ezo'); }
assigned.set(byPolyId('path7264'), 'ezo');
const LAKES = ['path18670', 'path21307', 'path3370']; // 霞ヶ浦・琵琶湖・十和田湖?(水色塗り)
LAKES.forEach((id) => { const k = byPolyId(id); if (k >= 0) assigned.set(k, 'lake'); });
const used = new Set(assigned.values());
P.push(['Iki', 'iki', '壱岐', 'kyushu'], ['Tsushima', 'tsushima', '対馬', 'kyushu']);
const missing = P.filter((p) => !used.has(p[1])).map((p) => p[1]);
const unassigned = polys.map((p, k) => k).filter((k) => !assigned.has(k));
console.error('labels', labelTexts.length, 'polys', polys.length, 'unhit labels', unhit.join(','), '\nmissing', missing.join(','), '\nunassigned polys', unassigned.map((k) => polys[k].id + '@' + centroid(polys[k]).map((v) => v.toFixed(0))).join(' '));

// ---- 出力 ----
const prov = [];
const bbox = [1e9, 1e9, -1e9, -1e9];
const groups = new Map();
for (const [k, id] of assigned) { if (!groups.has(id)) groups.set(id, []); groups.get(id).push(polys[k]); }
for (const [id, ps] of groups) {
  const def = P.find((p) => p[1] === id);
  if (!def) continue; // lake
  // 重心は最大ポリゴンのもの
  let big = ps[0];
  for (const p of ps) if (Math.abs(area(p.subs[0])) > Math.abs(area(big.subs[0]))) big = p;
  const [cx, cy] = centroid(big);
  for (const p of ps) for (const r of p.subs) for (const [x, y] of r) { bbox[0] = Math.min(bbox[0], x); bbox[1] = Math.min(bbox[1], y); bbox[2] = Math.max(bbox[2], x); bbox[3] = Math.max(bbox[3], y); }
  prov.push({ id, name: def[2], region: def[3], cx: +cx.toFixed(1), cy: +cy.toFixed(1), d: ps.map((p) => p.d).join('') });
}
// 未割当(離島など)は最寄りの国に同梱するのではなく、国定義なしで「飾り」として別出力
const extras = [...assigned].filter(([, id]) => id === 'lake').map(([k]) => ({ d: polys[k].d }));
const order = P.map((p) => p[1]);
prov.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
const out = {
  viewBox: [Math.floor(bbox[0] - 6), Math.floor(bbox[1] - 6), Math.ceil(bbox[2] - bbox[0] + 12), Math.ceil(bbox[3] - bbox[1] + 12)],
  provinces: prov,
  extras,
};
import { mkdirSync } from 'node:fs';
mkdirSync(join(root, 'data'), { recursive: true });
const lakes = extras.map((e) => e.d);
const body = { viewBox: out.viewBox, provinces: prov, lakes,
  source: 'Wikimedia Commons: Provinces of Japan with names.svg / Provinces of Japan-*.svg (Ash Crow, CC BY 2.5) を加工' };
writeFileSync(join(root, 'data/map.js'), '// 自動生成: node scripts/build-map.mjs\nwindow.SENGOKU = window.SENGOKU || {};\nwindow.SENGOKU.map = ' + JSON.stringify(body) + ';\n');
console.error('provinces', prov.length, 'viewBox', out.viewBox, 'extras', extras.length);
if (process.env.DEBUG) {
  for (const t of texts.slice(0, 8)) console.error('T', t.name, t.x.toFixed(0), t.y.toFixed(0));
  for (const p of polys.slice(0, 80)) { const [cx, cy] = centroid(p); if (isFinite(cx)) console.error('P', p.id, cx.toFixed(0), cy.toFixed(0)); else console.error('P', p.id, 'NaN', p.d.slice(0, 60)); }
}
if (process.env.DEBUG_HTML) {
  const cols = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe','#008080','#e6beff','#9a6324','#fffac8','#800000','#aaffc3','#808000','#ffd8b1','#000075','#808080'];
  let h = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${out.viewBox.join(' ')}" width="1600" height="${1600*out.viewBox[3]/out.viewBox[2]}">`;
  polys.forEach((p, k) => { if (!assigned.has(k)) h += `<path d="${p.d}" fill="#ccc" stroke="#d00" stroke-width=".4"/>`; });
  prov.forEach((p, i) => { h += `<path d="${p.d}" fill="${cols[i % 20]}" stroke="#000" stroke-width=".4"/>`; });
  prov.forEach((p) => { h += `<text x="${p.cx}" y="${p.cy}" font-size="4" text-anchor="middle">${p.id}</text>`; });
  if (process.env.DEBUG_IDS) polys.forEach((p, k) => { const [cx, cy] = centroid(p); h += `<text x="${cx}" y="${cy}" font-size="3.2" fill="${assigned.has(k) ? '#006' : '#d00'}" text-anchor="middle">${p.id.replace('path', '')}</text>`; });
  h += '</svg>';
  writeFileSync(process.env.DEBUG_HTML, h);
}
