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
  const m = u.replace(/[?#].*$/, '').match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
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
      url: ii.url.replace(/[?#].*$/, ''),
      w: ii.width, h: ii.height,
      mime: ii.mime,
      artist: stripHtml(md.Artist?.value) || '不明',
      license,
      licenseUrl: md.LicenseUrl?.value || '',
      filePage: ii.descriptionurl.replace(/[?#].*$/, ''),
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

// ---- Wikidata ----
async function wikidataClaims(qid) {
  const j = await getJson('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + qid);
  return j?.entities?.[qid]?.claims || {};
}
const claimFiles = (claims, prop) => (claims[prop] || []).map((c) => c.mainsnak?.datavalue?.value).filter((v) => typeof v === 'string');
const claimIds = (claims, prop) => (claims[prop] || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);

// 肖像として不適切なファイル名(墓・城・鎧・家紋・合戦図・地図・現代人の写真など)
const BAD_PORTRAIT = /(墓|廟|城|鎧|具足|兜|甲冑|家紋|屏風|合戦|戦い|grave|tomb|cemetery|castle|armou?r|domaru|yoroi|helmet|kabuto|\bmon\b|crest|kamon|flag|banner|map|battle|screen|statue of|memorial|monument|shrine|temple|花押|kao\\b|signature|autograph|seal|stamp|\bgackt\b|20[0-2][0-9]|19[5-9][0-9])/i;
const MON_HINT = /(mon\b|mon[_ .-]|crest|kamon|紋|emblem|seal|coat of arms|[_ ]mon\.)/i;

const okPortrait = (nm) => /portrait|肖像/i.test(nm) ? !/(statue|grave|tomb|castle|armou?r|gackt)/i.test(nm) : !BAD_PORTRAIT.test(nm);

async function pickFile(t, names, pageTitle, source, check) {
  for (const name of names) {
    if (check && !check(name)) { log(`    skip ${name} (name filter)`); continue; }
    const infos = await commonsInfo([name]);
    const info = infos[name] || Object.values(infos)[0];
    if (!info) { log(`    no commons info for ${name}`); continue; }
    const r = record(t, null, name, info, pageTitle);
    if (r.ok) return { ...r.ok, source };
    log(`    rejected ${name}: ${r.reject}`);
  }
  return null;
}

// 手動除外(取得できたが対象と一致しない画像): { key: 理由 }
const EXCL_FILE = join(root, 'scripts/src/image-exclusions.json');
const EXCL = existsSync(EXCL_FILE) ? JSON.parse(readFileSync(EXCL_FILE, 'utf8')) : {};
for (const [k, why] of Object.entries(EXCL)) { delete images[k]; failures[k] = 'excluded: ' + why; }

let n = 0;
const todo = targets.filter((t) => !images[t.key] && !EXCL[t.key] && (RETRY || !failures[t.key]));
log(`# fetch start ${new Date().toISOString()} targets=${targets.length} todo=${todo.length}`);

for (const t of todo) {
  n++;
  const tag = `[${n}/${todo.length}] ${t.key} (${t.wiki})`;
  try {
    const ov = OVERRIDES[t.key];
    let sum = ov ? null : await summary(t.wiki);
    if (!ov) {
      if (!sum) { failures[t.key] = 'no summary'; log(`${tag} FAIL no summary`); continue; }
      if (sum.type === 'disambiguation') { failures[t.key] = 'disambiguation'; log(`${tag} FAIL disambiguation page`); continue; }
      if (t.strict && sum.title !== t.wiki) { failures[t.key] = `title mismatch ${sum.title}`; log(`${tag} FAIL title mismatch: ${sum.title}`); continue; }
    }
    const pageTitle = sum?.title || t.wiki;
    const leadSrc = sum?.originalimage?.source || sum?.thumbnail?.source;
    const leadName = leadSrc ? fileFromUrl(leadSrc) : null;
    let claims = {};
    if (sum?.wikibase_item) claims = await wikidataClaims(sum.wikibase_item);
    let rec = null;
    if (ov) rec = await pickFile(t, [ov], pageTitle, 'override');
    else if (t.kind === 'portrait') {
      // 人物: P31=Q5 を確認し、Wikidata P18 → 記事リード画像(名前フィルタ付き)の順。記事内の任意画像は使わない。
      if (!claimIds(claims, 'P31').includes('Q5')) { failures[t.key] = 'wikidata: not human (P31!=Q5) or no item'; log(`${tag} FAIL not human/no wikidata`); continue; }
      rec = await pickFile(t, claimFiles(claims, 'P18'), pageTitle, 'P18', okPortrait);
      if (!rec && leadName) rec = await pickFile(t, [leadName], pageTitle, 'lead', okPortrait);
    } else if (t.kind === 'mon') {
      // 家紋: Wikidata P94(紋章) → P158(印章) → 記事リード画像(家紋らしい名前のもの) → Commons検索(家紋SVG)
      rec = await pickFile(t, [...claimFiles(claims, 'P94'), ...claimFiles(claims, 'P158')], pageTitle, 'P94');
      if (!rec && leadName) rec = await pickFile(t, [leadName], pageTitle, 'lead', (nm) => MON_HINT.test(nm));
    } else if (t.kind === 'castle') {
      rec = leadName ? await pickFile(t, [leadName], pageTitle, 'lead') : null;
      if (!rec) rec = await pickFile(t, claimFiles(claims, 'P18'), pageTitle, 'P18');
    } else { // battle / event
      rec = leadName ? await pickFile(t, [leadName], pageTitle, 'lead') : null;
      if (!rec) rec = await pickFile(t, claimFiles(claims, 'P18'), pageTitle, 'P18');
    }
    if (!rec && (t.kind === 'battle' || t.kind === 'castle')) {
      const fb = await fallbackFromArticle(t, pageTitle);
      if (fb) rec = { ...fb, source: 'article-image' };
    }
    if (!rec) { failures[t.key] = 'no usable image (placeholder)'; log(`${tag} FAIL no usable image -> placeholder`); continue; }
    images[t.key] = rec;
    delete failures[t.key];
    log(`${tag} OK ${rec.file} [${rec.license}] source=${rec.source}`);
  } catch (e) {
    log(`${tag} ERROR ${e.message}`);
  }
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
