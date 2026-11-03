// Commons の "Provinces of Japan-<国>.svg"（Ash Crow, CC BY 2.5。各国を赤く塗った同一ジオメトリ版）を取得し、
// 塗り色が #f07568 のパスID → 国ID の対応表 scripts/src/path-province.json を作る。
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'scripts/src/prov');
mkdirSync(dir, { recursive: true });
const UA = 'sengoku-map-build/0.1 (personal educational project; +https://github.com/ikdsk/sengoku-map)';
const N = { // 国ID -> Commons ファイル名の末尾
  mutsu: 'Mutsu', dewa: 'Dewa', sado: 'Sado', echigo: 'Echigo', noto: 'Noto', shimotsuke: 'Shimotsuke', hitachi: 'Hitachi',
  shimosa: 'Shimosa', kazusa: 'Kazusa', awa_b: 'Awa (Chiba)', kozuke: 'Kozuke', musashi: 'Musashi', etchu: 'Etchu', shinano: 'Shinano',
  kai: 'Kai', izu: 'Izu', sagami: 'Sagami', suruga: 'Suruga', totomi: 'Totomi', kaga: 'Kaga', hida: 'Hida', echizen: 'Echizen',
  mino: 'Mino', mikawa: 'Mikawa', owari: 'Owari', shima: 'Shima', iga: 'Iga', ise: 'Ise', yamato: 'Yamato', kii: 'Kii', omi: 'Omi',
  kawachi: 'Kawachi', izumi: 'Izumi', yamashiro: 'Yamashiro', wakasa: 'Wakasa', settsu: 'Settsu', tanba: 'Tamba', tango: 'Tango',
  tajima: 'Tajima', harima: 'Harima', inaba: 'Inaba', hoki: 'Hoki', oki: 'Oki', mimasaka: 'Mimasaka', bizen: 'Bizen', awaji: 'Awaji',
  bitchu: 'Bitchu', awa_s: 'Awa (Tokushima)', sanuki: 'Sanuki', bingo: 'Bingo', izumo: 'Izumo', iwami: 'Iwami', aki: 'Aki', suo: 'Suo',
  nagato: 'Nagato', iyo: 'Iyo', tosa: 'Tosa', buzen: 'Buzen', bungo: 'Bungo', chikuzen: 'Chikuzen', hizen: 'Hizen', chikugo: 'Chikugo',
  higo: 'Higo', hyuga: 'Hyuga', osumi: 'Osumi', satsuma: 'Satsuma', iki: 'Iki', tsushima: 'Tsushima',
};
const out = {};
for (const [id, fn] of Object.entries(N)) {
  const f = join(dir, id + '.svg');
  if (!existsSync(f)) {
    const url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(`Provinces of Japan-${fn}.svg`.replace(/ /g, '_'));
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!r.ok) { console.error('FAIL', id, r.status); continue; }
    writeFileSync(f, await r.text());
    await new Promise((r) => setTimeout(r, 400));
  }
  const s = readFileSync(f, 'utf8');
  const ids = [];
  for (const m of s.matchAll(/<path\b([^>]*?)\/>/gs)) {
    if (/fill:#f07568/i.test(m[1])) ids.push((m[1].match(/\bid="([^"]+)"/) || [])[1]);
  }
  console.error(id, ids.join(','));
  for (const p of ids) out[p] = id;
}
writeFileSync(join(root, 'scripts/src/path-province.json'), JSON.stringify(out, null, 0));
console.error('paths mapped', Object.keys(out).length);
