# 戦国勢力図

応仁の乱（1467）から大坂の陣（1615）まで、戦国大名の勢力圏が令制国（旧国）単位でどう変わったかを、アニメーションと画像で学ぶ静的 Web サイトです。ビルド不要・npm 依存なし。`file://` でも動きます（データは `window.SENGOKU` の JS ファイル）。

## 起動
```bash
python3 -m http.server 8000     # → http://localhost:8000/
# または index.html をブラウザで開く
```
外部通信は Google Fonts と upload.wikimedia.org（画像のホットリンク）のみ。

## 機能
- 年表スライダー＋再生（21時点）。国の色・境界色が補間アニメーションし、新たに獲得した国は波紋で強調。勢力ランキング（国数）が並べ替わる。
- 国にホバー/タップで国名・支配大名・その年の当主（肖像つき）。大名をクリックでその家の領国をハイライトし、大名家パネルを開く。
- 大名家パネル（22家）: 家紋、歴代当主、勢力の推移（折れ線＋最大版図ミニ地図）、居城、関連する出来事、人物。
- 合戦・出来事のスクロールストーリー（16件）: スクロールで地図がその年へ遷移。
- 武将ギャラリー（72人、家で絞り込み）。画像クレジットページ。
- URL ハッシュ: `#/year/1582` `#/clan/oda` `#/person/oda-nobunaga` `#/event/honnoji` `#/credits`
- `prefers-reduced-motion` 対応、390px 幅のスマホ対応。全体を明朝体（Shippori Mincho 系）で統一。

## 構成
```
index.html  css/style.css  js/*.js
data/map.js        令制国69区画のSVGパス（自動生成）
data/clans.js      大名家（色・当主の変遷・解説）
data/snapshots.js  国ごとの支配者の変遷 → 21スナップショットに展開
data/people.js     人物72人  data/events.js 出来事16件・居城14件
data/images.js     画像メタデータのキャッシュ（自動生成）
scripts/build-map.mjs / fetch-province-svgs.mjs   地図の生成（Commons の旧国SVGから）
scripts/fetch-images.mjs   画像取得（再開可能・ログ /tmp/sengoku-fetch.log）
scripts/validate.mjs       データ検証
scripts/e2e.mjs            headless Chrome + CDP のE2E（スクリーンショットは docs/screenshots/）
scripts/build-credits.mjs  CREDITS.md 生成
```

## 画像取得の方針
- 人物: 日本語版 Wikipedia 記事 → Wikidata（P31=人間を確認）の **P18** を第一候補、無ければ記事のリード画像（墓・城・鎧・家紋・合戦図・花押などのファイル名は除外）。記事内の任意の画像は使わない。適切な肖像が無い人物はプレースホルダ。記事タイトルは `people.js` の `wiki` と照合し、曖昧さ回避ページは拒否。
- 家紋: Wikidata P94（紋章）→ 家紋らしい名前のリード画像。合戦: 記事のリード画像（屏風絵など）。城: 城記事のリード画像。
- Commons の `extmetadata` でライセンスを検証し、PD・CC0・CC BY・CC BY-SA のみ許可。手動の除外は `scripts/src/image-exclusions.json`。

## 出典・ライセンス
詳細は [CREDITS.md](CREDITS.md) とサイト内の画像クレジットページ。地図: Ash Crow（CC BY 2.5, Wikimedia Commons）。

## データについて
勢力図は国単位の概略です。実際は郡・城単位で入り組み、国人・寺社勢力も存在します。判断のむずかしい国は灰色（中小勢力・国人）としています。1600年は関ヶ原直後で、東軍系大名の領地を「徳川」として概括しています。
