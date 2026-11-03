// CREDITS.md を data/images.js から生成する: node scripts/build-credits.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const w = {}; vm.runInNewContext(readFileSync(join(root, 'data/images.js'), 'utf8'), { window: w });
const imgs = w.SENGOKU.images;
const KIND = { portrait: '人物の肖像', mon: '家紋', battle: '合戦・出来事の図版', castle: '城・史跡' };
let md = `# クレジット

## 地図
- 令制国地図: Wikimedia Commons「Provinces of Japan with names.svg」および「Provinces of Japan-*.svg」（国ごとの図形の特定に使用）
  作者 Ash Crow、ライセンス [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/)。
  https://commons.wikimedia.org/wiki/File:Provinces_of_Japan_with_names.svg
  国ごとの図形を抽出し、色分け用に座標を変換・整理しています（変更あり）。当時の国境とは細部が異なる近似です。
- フォント: Google Fonts「Shippori Mincho」「Shippori Mincho B1」「Zen Old Mincho」（SIL Open Font License）。

## 画像
画像は upload.wikimedia.org からホットリンクしており、リポジトリにはコピーを置いていません。許可ライセンスは PD・CC0・CC BY・CC BY-SA のみです。
サイト内「画像クレジット」ページにも同じ一覧があります。

`;
for (const kind of Object.keys(KIND)) {
  const items = Object.entries(imgs).filter(([, r]) => r.kind === kind);
  md += `### ${KIND[kind]}（${items.length}点）\n\n| 対象 | ファイル | 作者 | ライセンス | 取得元 |\n|---|---|---|---|---|\n`;
  for (const [k, r] of items) md += `| ${r.label} (${k}) | [${r.file.replace(/\|/g, '/')}](${r.filePage}) | ${r.artist.replace(/\|/g, '/').slice(0, 80)} | ${r.license} | ${r.source} / [${r.article}](${r.articleUrl}) |\n`;
  md += '\n';
}
writeFileSync(join(root, 'CREDITS.md'), md);
console.log('CREDITS.md', md.length);
