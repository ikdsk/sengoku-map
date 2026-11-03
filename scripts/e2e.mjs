// E2E: headless Chrome を Node 標準 WebSocket + CDP で駆動する(追加依存なし)。
// - python3 -m http.server を自分で起動し、終了時に自分が起動したPIDだけを停止する
// - デスクトップ1280px / モバイル390pxでスクリーンショットを docs/screenshots/ に保存
// - 画像の naturalWidth>0、computed font-family が明朝であること、主要機能の動作を検証
// 使い方: node scripts/e2e.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(root, 'docs/screenshots');
mkdirSync(SHOTS, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HTTP_PORT = 8765, CDP_PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

// ---- サーバーとChrome ----
const server = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'sengoku-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore', detached: true });
const cleanup = () => { try { process.kill(-chrome.pid); } catch { try { chrome.kill(); } catch {} } try { server.kill(); } catch {} };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

async function waitHttp(url, tries = 60) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return r; } catch {} await sleep(250); }
  throw new Error('timeout ' + url);
}
await waitHttp(`http://127.0.0.1:${HTTP_PORT}/index.html`);
const targets = await (await waitHttp(`http://127.0.0.1:${CDP_PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let msgId = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++msgId; pending.set(id, (m) => (m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'eval error'); return r.result.value; };
await send('Page.enable'); await send('Runtime.enable');
const consoleErrors = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });

async function viewport(kind) {
  if (kind === 'mobile') await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  else await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1100, deviceScaleFactor: 1, mobile: false });
}
async function open(hash, reload) {
  if (reload) await send('Page.navigate', { url: 'about:blank' });
  await send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/index.html${hash || ''}` });
  for (let i = 0; i < 80; i++) { await sleep(250); try { if (await ev(`document.documentElement.dataset.ready==='1'`)) break; } catch {} }
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOTS, name), Buffer.from(r.data, 'base64'));
  console.log('  screenshot', 'docs/screenshots/' + name);
}
const scrollTo = (sel, block = 'start') => ev(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:${JSON.stringify(block)},behavior:'instant'}); window.scrollBy(0, ${block === 'start' ? -70 : 0}); 1`);

// 画像の読み込み完了待ち(最大 ms)
async function settleImages(ms = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const st = await ev(`(()=>{const a=[...document.images].filter(i=>i.getBoundingClientRect().height>0&&i.loading!=='x'); return {pending:a.filter(i=>!i.complete).length,total:a.length}})()`);
    if (!st.pending) return st;
    await sleep(400);
  }
  return null;
}
// 未読込の画像を1枚ずつ表示位置へスクロールして読み込ませる(lazy対策)
async function loadAll() {
  for (let pass = 0; pass < 3; pass++) {
    const n = await ev(`(async()=>{const a=[...document.images].filter(i=>!(i.complete&&i.naturalWidth>0)&&i.isConnected); for(const i of a){ i.scrollIntoView({block:'center',behavior:'instant'}); await new Promise(r=>setTimeout(r,140)); } return a.length})()`);
    await sleep(2000);
    if (!n) break;
  }
}
// ページ全体をスクロールして lazy 画像を読み込ませる
async function scrollThrough() {
  const h = await ev('document.documentElement.scrollHeight');
  for (let y = 0; y < h; y += 700) { await ev(`window.scrollTo(0,${y});1`); await sleep(120); }
  await ev('window.scrollTo(0,0);1');
}

async function suite(kind) {
  console.log(`\n===== ${kind} =====`);
  await viewport(kind);
  await open('#/year/1467');
  await sleep(1200);
  const pre = kind === 'mobile' ? 'm-' : 'd-';

  // 基本構造
  const base = await ev(`({prov: document.querySelectorAll('#main-map .prov').length, ranks: document.querySelectorAll('.rk-row').length, cards: document.querySelectorAll('.ev-card').length, clans: document.querySelectorAll('.clan-card').length, people: document.querySelectorAll('.person-card').length, ticks: document.querySelectorAll('#ticks .tick').length})`);
  check(`${kind}: 地図の国が69区画`, base.prov === 69, JSON.stringify(base));
  check(`${kind}: 年代ティック21`, base.ticks === 21);
  check(`${kind}: 出来事カード16以上`, base.cards >= 16, base.cards);
  check(`${kind}: 大名家カード20以上`, base.clans >= 20, base.clans);
  check(`${kind}: 武将カード40以上`, base.people >= 40, base.people);

  // 横スクロールが発生していない
  const ov = await ev(`({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth})`);
  check(`${kind}: 横スクロールなし`, ov.sw <= ov.cw + 1, `scrollWidth=${ov.sw} clientWidth=${ov.cw}`);

  // トップ
  await ev('window.scrollTo(0,0);1'); await sleep(1800);
  await shot(`${pre}01-top.png`);

  // 年代ごとの地図
  const yearShots = [[1560, '02-year-1560'], [1582, '03-year-1582'], [1600, '04-year-1600']];
  let prevFills = null;
  for (const [y, name] of yearShots) {
    await open(`#/year/${y}`);
    await sleep(300);
    await ev(`document.getElementById('map').scrollIntoView({behavior:'instant'}); 1`);
    await sleep(2200);
    const hd = await ev(`({t: document.getElementById('map-title').getBoundingClientRect().top, h: document.querySelector('.site-head').getBoundingClientRect().bottom})`);
    check(`${kind}: ${y}年 遷移後に見出しが固定ヘッダーに隠れない`, hd.t >= hd.h - 1, JSON.stringify(hd));
    const info = await ev(`({year: document.getElementById('year-num').textContent, hash: location.hash, slider: +document.getElementById('year-slider').value, fills: [...document.querySelectorAll('#main-map .prov')].map(p=>p.getAttribute('fill')).join('|'), top: [...document.querySelectorAll('.rk-row')].filter(r=>r.style.opacity==='1').sort((a,b)=>a.firstChild.textContent-b.firstChild.textContent).slice(0,3).map(r=>r.dataset.clan+':'+r.querySelector('.rk-n').textContent)})`);
    check(`${kind}: #/year/${y} で ${y}年を表示`, info.year === String(y), JSON.stringify(info.top));
    if (prevFills) check(`${kind}: ${y}年は前の年と地図の色が異なる`, info.fills !== prevFills);
    prevFills = info.fills;
    await shot(`${pre}${name}.png`);
  }

  // 補間アニメーション: 再生を開始して途中の色が中間色であること
  await open('#/year/1565'); await sleep(500); await scrollTo('#map');
  await ev(`document.getElementById('year-slider').value=${10}; document.getElementById('year-slider').dispatchEvent(new Event('input',{bubbles:true})); 1`);
  await sleep(60);
  const mid1 = await ev(`document.querySelector('#main-map .prov[data-id=suruga]').getAttribute('fill')`);
  await sleep(2200);
  const end1 = await ev(`document.querySelector('#main-map .prov[data-id=suruga]').getAttribute('fill')`);
  check(`${kind}: 色が滑らかに補間される(途中色≠終了色)`, mid1 !== end1, `${mid1} → ${end1}`);
  // 再生ボタン
  await open('#/year/1467'); await sleep(500);
  await ev(`document.getElementById('speed').value='1000'; document.getElementById('btn-play').click(); 1`);
  await sleep(3800);
  const played = await ev(`({y: +document.getElementById('year-num').textContent, pressed: document.getElementById('btn-play').getAttribute('aria-pressed')})`);
  check(`${kind}: 再生で年代が進む`, played.y > 1467 && played.pressed === 'true', JSON.stringify(played));
  await ev(`document.getElementById('btn-play').click(); 1`);

  // ホバーカード(デスクトップ)/タップ(モバイル)
  await open('#/year/1560'); await sleep(600); await scrollTo('#main-map', 'center'); await sleep(600);
  const box = await ev(`(()=>{const r=document.querySelector('#main-map .prov[data-id=owari]').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (kind === 'desktop') {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
    await sleep(500);
  } else {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(600);
  }
  const tipTxt = await ev(`(()=>{const t=document.getElementById('tip'); return t.hidden?'':t.textContent})()`);
  check(`${kind}: 国カード(国名・大名・当主)`, /尾張/.test(tipTxt) && /織田/.test(tipTxt) && /当主/.test(tipTxt), tipTxt.slice(0, 60));
  await shot(`${pre}05-province-card.png`);

  // 大名パネル
  await open('#/clan/oda'); await sleep(1200);
  await settleImages(6000);
  const panel = await ev(`({open: !document.getElementById('overlay').hidden, title: document.getElementById('sheet-title')?.textContent, faces: document.querySelectorAll('#sheet-body .face-card').length, chart: !!document.querySelector('#sheet-body .chart'), mini: document.querySelectorAll('#sheet-body .mini-map .prov').length, hl: document.querySelectorAll('#main-map .prov.hl').length})`);
  check(`${kind}: 大名パネル(織田)が開く`, panel.open && /織田/.test(panel.title), JSON.stringify(panel));
  check(`${kind}: 勢力推移グラフとミニ地図`, panel.chart && panel.mini === 69);
  check(`${kind}: 大名クリックで領国がハイライト`, panel.hl > 0, `hl=${panel.hl}`);
  await shot(`${pre}06-clan-panel.png`);
  await ev(`document.querySelector('#sheet .close').click(); 1`); await sleep(300);

  // 人物モーダル
  await open('#/person/oda-nobunaga'); await sleep(1000); await settleImages(6000);
  const per = await ev(`({t: document.getElementById('sheet-title')?.textContent, img: document.querySelector('#sheet-body .portrait img')?.naturalWidth||0})`);
  check(`${kind}: 人物詳細(織田信長)と肖像`, per.t === '織田信長' && per.img > 0, JSON.stringify(per));
  await ev(`document.querySelector('#sheet .close').click(); 1`); await sleep(300);

  // 合戦ストーリー
  await open('#/event/honnoji'); await sleep(2500); await settleImages(8000);
  const st = await ev(`({y: document.getElementById('story-year').textContent, active: document.querySelector('.ev-card.active')?.id})`);
  check(`${kind}: ストーリーで本能寺の変の年(1582)へ`, st.y === '1582', JSON.stringify(st));
  const sv = await ev(`(()=>{const m=document.querySelector('#story-map .jp-map'); const r=m.getBoundingClientRect(); const fills=[...m.querySelectorAll('.prov')].map(p=>p.getAttribute('fill')).filter(f=>f&&f!=='none'); return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,w:r.width,h:r.height,vh:innerHeight,vw:innerWidth,fills:fills.length}})()`);
  check(`${kind}: ストーリー画面で地図SVGが可視範囲にあり塗り色を持つ`, sv.w > 100 && sv.top >= 0 && sv.bottom <= sv.vh + 1 && sv.right <= sv.vw && sv.fills === 69 && (kind === 'mobile' || sv.left < sv.vw / 2), JSON.stringify(sv));
  await shot(`${pre}07-story.png`);
  // スクロール連動
  await scrollTo('#ev-okehazama', 'center'); await sleep(2200);
  const st2 = await ev(`document.getElementById('story-year').textContent`);
  check(`${kind}: スクロールで地図の年が1560に遷移`, st2 === '1560', st2);

  // ギャラリー
  await scrollTo('#people'); await sleep(500);
  await scrollThrough();
  await scrollTo('#people'); await sleep(1500); await settleImages(8000);
  await shot(`${pre}08-gallery.png`);

  // 画像: 全体をスクロールして naturalWidth>0 を確認
  await scrollThrough();
  await loadAll(); await settleImages(10000);
  const imgs = await ev(`(()=>{const a=[...document.images]; const ok=a.filter(i=>i.complete&&i.naturalWidth>0); const bad=a.filter(i=>!(i.complete&&i.naturalWidth>0)).map(i=>i.src.slice(-70)); return {total:a.length, ok:ok.length, ph:document.querySelectorAll('.ph').length, bad:bad.slice(0,6)}})()`);
  check(`${kind}: 表示中の画像が読み込めている(naturalWidth>0)`, imgs.total > 0 && imgs.ok / imgs.total >= 0.9, `ok=${imgs.ok}/${imgs.total} placeholders=${imgs.ph} bad=${JSON.stringify(imgs.bad)}`);

  // フォント: 全要素の computed font-family が明朝系で、ゴシック系が無い
  const fonts = await ev(`(()=>{
    const bad=[]; const seen=new Set();
    const all=[...document.querySelectorAll('body, body *')];
    for(const e of all){ const ff=getComputedStyle(e).fontFamily; seen.add(ff);
      if(!/Mincho|serif/i.test(ff) || /sans-serif|Gothic|ゴシック|Arial|Helvetica|system-ui|-apple-system|Roboto/i.test(ff.replace(/serif/gi,'')) && /sans/i.test(ff)) bad.push(e.tagName+'.'+e.className+':'+ff.slice(0,50)); }
    const load = ['Shippori Mincho','Shippori Mincho B1','Zen Old Mincho'].map(f=>f+':'+document.fonts.check('16px "'+f+'"'));
    return {checked:all.length, bad:bad.slice(0,5), nbad:bad.length, families:[...seen].slice(0,4), load};
  })()`);
  check(`${kind}: 全${fonts.checked}要素が明朝(ゴシック0)`, fonts.nbad === 0, JSON.stringify({ bad: fonts.bad, families: fonts.families }));
  check(`${kind}: Webフォント(Shippori Mincho)が読み込み済み`, fonts.load.some((s) => s.startsWith('Shippori Mincho:true')), fonts.load.join(' '));

  // クレジットページ
  await open('#/credits'); await sleep(800);
  const cr = await ev(`({rows: document.querySelectorAll('#credits-list .credit-row').length, links: document.querySelectorAll('#credits-list a[href*="commons.wikimedia.org"]').length})`);
  check(`${kind}: 画像クレジットページ`, cr.rows > 20 && cr.links > 20, JSON.stringify(cr));
}

try {
  await suite('desktop');
  await suite('mobile');
  // reduced-motion
  await viewport('desktop');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await open('#/year/1467', true); await sleep(500);
  await ev(`document.getElementById('year-slider').value=8; document.getElementById('year-slider').dispatchEvent(new Event('input',{bubbles:true})); 1`);
  await sleep(150);
  const rm = await ev(`({y: document.getElementById('year-num').textContent, ripples: document.querySelectorAll('.ripple').length, tweening: document.querySelector('#main-map .prov[data-id=suruga]').getAttribute('fill')})`);
  check('reduced-motion: 即時切替・波紋なし', rm.ripples === 0 && rm.y === '1561', JSON.stringify(rm));
  check('JS例外なし', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' / '));
} catch (e) {
  check('e2e 実行中の例外なし', false, e.message);
} finally {
  if (consoleErrors.length) console.log('JS errors:', consoleErrors.slice(0, 4).join('\n'));
  const fail = results.filter((r) => !r.ok);
  console.log(`\nE2E: ${results.length - fail.length}/${results.length} passed, ${fail.length} failed`);
  cleanup();
  setTimeout(() => process.exit(fail.length ? 1 : 0), 300);
}
