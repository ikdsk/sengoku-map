// データ検証: node scripts/validate.mjs  (エラー数を出力し、1件でもあれば exit 1)
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const w = {}; const ctx = { window: w }; vm.createContext(ctx);
for (const f of ['map', 'clans', 'snapshots', 'people', 'events', 'images']) {
  const p = join(root, `data/${f}.js`);
  if (existsSync(p)) vm.runInContext(readFileSync(p, 'utf8'), ctx, { filename: f });
}
const S = w.SENGOKU;
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const provIds = S.map.provinces.map((p) => p.id);
const clanIds = new Set(S.clans.map((c) => c.id));
const people = Object.fromEntries(S.people.map((p) => [p.id, p]));
if (new Set(provIds).size !== provIds.length) err('国IDが重複');
if (provIds.length !== 69) err(`国の数が69ではない: ${provIds.length}`);
if (S.clans.length !== clanIds.size) err('大名IDが重複');
if (S.people.length !== Object.keys(people).length) err('人物IDが重複');

// スナップショット
const years = S.snapshots.map((s) => s.year);
if (years.some((y, i) => i && y <= years[i - 1])) err('スナップショットの年が昇順でない');
if (S.snapshots.length < 15 || S.snapshots.length > 25) err(`スナップショット数が範囲外: ${S.snapshots.length}`);
const used = new Set();
S.snapshots.forEach((s) => {
  for (const id of provIds) {
    const o = s.owners[id];
    if (!o) err(`${s.year}: ${id} の支配者が未定義`);
    else if (!clanIds.has(o)) err(`${s.year}: ${id} の支配者 ${o} が大名一覧に無い`);
    else used.add(o);
  }
  for (const id in s.owners) if (!provIds.includes(id)) err(`${s.year}: 未知の国 ${id}`);
});
for (const c of S.clans) {
  if (!used.has(c.id)) warn(`未使用の大名: ${c.id}`);
  if (!/^#[0-9a-f]{6}$/i.test(c.color)) err(`${c.id}: 色が不正`);
  if (c.detail && !(c.desc && c.heads && c.heads.length)) err(`${c.id}: 詳細ページに desc/heads が必要`);
  // 勢力圏が range 外のスナップショットに現れない
  if (c.range) S.snapshots.forEach((s, i) => {
    const n = Object.values(s.owners).filter((x) => x === c.id).length;
    if (n && (s.year < c.range[0] || s.year > c.range[1])) err(`${c.id}: ${s.year}年に領国があるが range ${c.range} の外`);
  });
  // 当主
  let prev = 0;
  for (const [from, h] of c.heads || []) {
    if (from < prev) err(`${c.id}: heads が昇順でない`);
    prev = from;
    if (typeof h === 'string') {
      const p = people[h];
      if (!p) { err(`${c.id}: 当主 ${h} が人物一覧に無い`); continue; }
      if (from < p.birth || from > p.death) err(`${c.id}: 当主 ${p.name}(${p.birth}-${p.death}) が ${from}年に就任は矛盾`);
      if (p.birth > from - 1) err(`${c.id}: ${p.name} は ${from}年にまだ生まれていない`);
    }
  }
}
const detailN = S.clans.filter((c) => c.detail).length;
if (detailN < 20) err(`詳細大名家が20未満: ${detailN}`);

// 人物
for (const p of S.people) {
  if (p.clan && !clanIds.has(p.clan)) err(`人物 ${p.id}: 大名 ${p.clan} が無い`);
  if (!(p.birth < p.death)) err(`人物 ${p.id}: 生没年が不正`);
  if (!p.wiki) err(`人物 ${p.id}: wiki 記事名が無い`);
  if (/(曖昧さ回避|\(曖昧)/.test(p.wiki)) err(`人物 ${p.id}: 曖昧さ回避ページ名`);
}
if (S.people.length < 40) err(`人物が40未満: ${S.people.length}`);

// 出来事・城
for (const e of S.events) {
  if (!years.includes(e.snapshot)) err(`出来事 ${e.id}: snapshot ${e.snapshot} が無い`);
  for (const c of e.clans) if (!clanIds.has(c)) err(`出来事 ${e.id}: 大名 ${c} が無い`);
  for (const pid of e.people) {
    const p = people[pid];
    if (!p) { err(`出来事 ${e.id}: 人物 ${pid} が無い`); continue; }
    if (e.year < p.birth || e.year > p.death) err(`出来事 ${e.id}(${e.year}): 人物 ${p.name}(${p.birth}-${p.death}) の生没年と矛盾`);
  }
}
for (const p of S.places) if (!clanIds.has(p.clan)) err(`居城 ${p.id}: 大名 ${p.clan} が無い`);

// 画像
const LICENSE_OK = /^(public domain|pd(\b|-)|cc0|cc[- ]by(-sa)?[- ][0-9.]+)/i;
const entityKeys = new Set([
  ...S.people.map((p) => 'person:' + p.id), ...S.clans.filter((c) => c.wiki).map((c) => 'mon:' + c.id),
  ...S.events.map((e) => 'event:' + e.id), ...S.places.map((p) => 'place:' + p.id)]);
const imgs = S.images || {};
const byFile = {};
const kinds = {};
for (const [k, r] of Object.entries(imgs)) {
  if (!entityKeys.has(k)) err(`画像 ${k}: 対応する人物/大名/出来事/城が無い`);
  if (!LICENSE_OK.test(r.license || '') || /-nc|-nd|non-?free/i.test(r.license)) err(`画像 ${k}: 許可外ライセンス ${r.license}`);
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(r.url)) err(`画像 ${k}: URLが upload.wikimedia.org ではない`);
  if (!r.filePage || !r.article || !r.artist) err(`画像 ${k}: filePage/article/artist 不足`);
  if (k.startsWith('person:') && !['P18', 'lead', 'override'].includes(r.source)) err(`画像 ${k}: 人物画像の source が P18/lead/override ではない (${r.source})`);
  if (k.startsWith('person:')) {
    if (/(墓|城|鎧|家紋|屏風|花押|signature|grave|tomb|castle|armou?r|domaru|crest|gackt)/i.test(r.file)) err(`画像 ${k}: 肖像らしくないファイル名 ${r.file}`);
    (byFile[r.file] = byFile[r.file] || []).push(k);
  }
  kinds[r.kind] = (kinds[r.kind] || 0) + 1;
}
for (const [f, ks] of Object.entries(byFile)) if (ks.length > 1) err(`同じ肖像ファイルを複数人物が使用: ${f} ← ${ks.join(', ')}`);
const nPortraitMissing = S.people.filter((p) => !imgs['person:' + p.id]).length;
if (Object.keys(imgs).length === 0) err('images.js が空（node scripts/fetch-images.mjs を実行）');

console.log(`validate: snapshots=${S.snapshots.length} provinces=${provIds.length} clans=${S.clans.length}(detail ${detailN}) people=${S.people.length} events=${S.events.length} places=${S.places.length}`);
console.log(`images: total=${Object.keys(imgs).length} ${Object.entries(kinds).map(([k, n]) => `${k}=${n}`).join(' ')}  人物で画像なし=${nPortraitMissing}`);
warns.forEach((m) => console.log('WARN  ' + m));
errors.forEach((m) => console.log('ERROR ' + m));
console.log(`${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
