// Wikipedia(ja) / Wikimedia Commons から人物・家紋・合戦・城の画像メタデータを取得し data/images.js にキャッシュする。
// - Node 標準 fetch のみ。User-Agent を設定し、リクエスト間隔を空ける。再実行しても取得済みは再取得しない(再開可能)。
// - 許可ライセンス: PD / CC0 / CC BY / CC BY-SA のみ(Commons の extmetadata で検証)。
// - 人物は記事タイトルを people.js の wiki と照合し、曖昧さ回避ページは拒否する。
// - 画像ファイルは保存せず upload.wikimedia.org のサムネイルURLをホットリンクする。
// 使い方: node scripts/fetch-images.mjs [--retry-failed]
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = '/tmp/sengoku-fetch.log';
const UA = 'sengoku-map-build/0.1 (personal educational static site; contact: daisukei@gmail.com)';
const WAIT = 400;
const RETRY = process.argv.includes('--retry-failed');

function loadData() {
  const w = {};
  const ctx = { window: w };
  vm.createContext(ctx);
  for (const f of ['clans', 'people', 'events']) vm.runInContext(readFileSync(join(root, `data/${f}.js`), 'utf8'), ctx, { filename: f });
  return w.SENGOKU;
}
const D = loadData();

const IMG_FILE = join(root, 'data/images.js');
const FAIL_FILE = join(root, 'scripts/src/image-failures.json');
let images = {};
if (existsSync(IMG_FILE)) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(IMG_FILE, 'utf8'), ctx);
  images = ctx.window.SENGOKU?.images || {};
}
let failures = existsSync(FAIL_FILE) ? JSON.parse(readFileSync(FAIL_FILE, 'utf8')) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => { console.error(s); appendFileSync(LOG, s + '\n'); };

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    await sleep(WAIT);
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (r.status === 429 || r.status >= 500) { await sleep(3000 * (i + 1)); continue; }
    return null;
  }
  return null;
}

// ---- 対象一覧 ----
const targets = [];
for (const p of D.people) targets.push({ key: 'person:' + p.id, kind: 'portrait', wiki: p.wiki, label: p.name, strict: true });
for (const c of D.clans) if (c.wiki) targets.push({ key: 'mon:' + c.id, kind: 'mon', wiki: c.wiki, label: c.name + 'の家紋', strict: false });
for (const e of D.events) targets.push({ key: 'event:' + e.id, kind: 'battle', wiki: e.wiki, label: e.title, strict: false });
for (const p of D.places) targets.push({ key: 'place:' + p.id, kind: 'castle', wiki: p.wiki, label: p.name, strict: false });

// 手動指定(記事のリード画像が不適切な場合に Commons ファイル名で上書きする): { key: 'File名' }
const OVERRIDE_FILE = join(root, 'scripts/src/image-overrides.json');
const OVERRIDES = existsSync(OVERRIDE_FILE) ? JSON.parse(readFileSync(OVERRIDE_FILE, 'utf8')) : {};

const LICENSE_OK = /^(public domain|pd(\b|-)|cc0|cc[- ]by(-sa)?[- ][0-9.]+|cc by(-sa)? [0-9.]+|attribution|no restrictions)/i;
const LICENSE_NG = /(nc|nd|non-?free|fair use|gfdl only)/i;
const okLicense = (s) => !!s && LICENSE_OK.test(s.trim()) && !/-nc|-nd|\bnc\b|\bnd\b|non-?free|fair use/i.test(s);

const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const fileFromUrl = (u) => {
  // https://upload.wikimedia.org/wikipedia/commons/a/ab/Name.jpg  または  .../thumb/a/ab/Name.jpg/330px-Name.jpg
  const m = u.match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

async function summary(wiki) {
  const u = 'https://ja.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(wiki) + '?redirect=true';
  return getJson(u);
}

async function commonsInfo(files) {
  // files: ['Name.jpg', ...] → { name: info }
  const out = {};
  for (let i = 0; i < files.length; i += 20) {
    const chunk = files.slice(i, i + 20);
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&redirects=1&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiextmetadatafilter=Artist|LicenseShortName|LicenseUrl|Credit|ImageDescription|ObjectName&titles=' +
      encodeURIComponent(chunk.map((f) => 'File:' + f).join('|'));
    const j = await getJson(u);
    if (!j?.query) continue;
    const redirMap = {};
    for (const r of j.query.redirects || []) redirMap[r.to] = r.from;
    for (const pg of Object.values(j.query.pages || {})) {
      if (!pg.imageinfo) continue;
      const ii = pg.imageinfo[0];
      const title = pg.title.replace(/^File:/, '');
      const entry = { title, ii };
      out[title] = entry;
      const from = redirMap[pg.title];
      if (from) out[from.replace(/^File:/, '')] = entry;
    }
  }
  return out;
}

function record(t, sum, fileName, info, pageTitle) {
  const ii = info.ii;
  const md = ii.extmetadata || {};
  const license = stripHtml(md.LicenseShortName?.value);
  if (!okLicense(license)) return { reject: `license ${license || '(none)'}` };
  if (!/^image\/(jpeg|png|svg\+xml|gif|webp)$/.test(ii.mime)) return { reject: 'mime ' + ii.mime };
  return {
    ok: {
      kind: t.kind,
      label: t.label,
      file: info.title,
      url: ii.url,
      w: ii.width, h: ii.height,
      mime: ii.mime,
      artist: stripHtml(md.Artist?.value) || '不明',
      license,
      licenseUrl: md.LicenseUrl?.value || '',
      filePage: ii.descriptionurl,
      article: pageTitle,
      articleUrl: 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(pageTitle),
    },
  };
}

// 記事の画像一覧から、Commons で許可ライセンスの最初の写真系画像を探す(リード画像がNGのときの代替)
async function fallbackFromArticle(t, pageTitle) {
  const j = await getJson('https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=images&imlimit=60&titles=' + encodeURIComponent(pageTitle));
  const pg = j?.query && Object.values(j.query.pages)[0];
  const names = (pg?.images || []).map((x) => x.title.replace(/^(ファイル|File):/, '')).filter((n) => /\.(jpe?g|png)$/i.test(n) && !/(icon|logo|flag|map|Commons-|Wiki|Question|Edit-|Nuvola|Ambox|Disambig|Portal)/i.test(n));
  if (!names.length) return null;
  const infos = await commonsInfo(names.slice(0, 20));
  for (const n of names) {
    const info = infos[n] || infos[n.replace(/ /g, '_')];
    if (!info) continue;
    if (info.ii.width < 300) continue;
    const r = record(t, null, n, info, pageTitle);
    if (r.ok) return r.ok;
  }
  return null;
}

let n = 0;
const todo = targets.filter((t) => !images[t.key] && (RETRY || !failures[t.key]));
log(`# fetch start ${new Date().toISOString()} targets=${targets.length} cached=${targets.length - todo.length - Object.keys(failures).filter((k) => !images[k]).length} todo=${todo.length}`);

for (const t of todo) {
  n++;
  const tag = `[${n}/${todo.length}] ${t.key} (${t.wiki})`;
  try {
    let fileName = OVERRIDES[t.key] || null;
    let pageTitle = t.wiki;
    let sum = null;
    if (!fileName) {
      sum = await summary(t.wiki);
      if (!sum) { failures[t.key] = 'no summary'; log(`${tag} FAIL no summary`); continue; }
      if (sum.type === 'disambiguation') { failures[t.key] = 'disambiguation'; log(`${tag} FAIL disambiguation page`); continue; }
      pageTitle = sum.title;
      if (t.strict && sum.title !== t.wiki) { failures[t.key] = `title mismatch ${sum.title}`; log(`${tag} FAIL title mismatch: ${sum.title}`); continue; }
      const src = sum.originalimage?.source || sum.thumbnail?.source;
      fileName = src ? fileFromUrl(src) : null;
      if (src && !fileName) log(`${tag} lead image is not a Commons file (skip): ${src}`);
    }
    let rec = null;
    if (fileName) {
      const infos = await commonsInfo([fileName]);
      const info = infos[fileName] || Object.values(infos)[0];
      if (info) {
        const r = record(t, sum, fileName, info, pageTitle);
        if (r.ok) rec = r.ok; else log(`${tag} lead image rejected: ${fileName} — ${r.reject}`);
      } else log(`${tag} no commons info for ${fileName}`);
    }
    if (!rec && t.kind !== 'portrait') rec = await fallbackFromArticle(t, pageTitle);
    if (!rec && t.kind === 'portrait') rec = await fallbackFromArticle(t, pageTitle); // 肖像は最後の手段
    if (!rec) { failures[t.key] = 'no usable image'; log(`${tag} FAIL no usable image`); continue; }
    images[t.key] = rec;
    delete failures[t.key];
    log(`${tag} OK ${rec.file} [${rec.license}]`);
  } catch (e) {
    log(`${tag} ERROR ${e.message}`);
  }
  // 定期保存(途中で止めても再開できる)
  if (n % 10 === 0) save();
}
save();

function save() {
  const sorted = Object.fromEntries(Object.keys(images).sort().map((k) => [k, images[k]]));
  writeFileSync(IMG_FILE, '// 自動生成: node scripts/fetch-images.mjs （Wikipedia/Commons メタデータのキャッシュ。画像本体は upload.wikimedia.org をホットリンク）\nwindow.SENGOKU = window.SENGOKU || {};\nwindow.SENGOKU.images = ' + JSON.stringify(sorted, null, 1) + ';\n');
  writeFileSync(FAIL_FILE, JSON.stringify(failures, null, 1));
}
const okCount = Object.keys(images).length;
log(`# done: images=${okCount} failures=${Object.keys(failures).length}`);
for (const [k, v] of Object.entries(failures)) log(`  FAILED ${k}: ${v}`);
