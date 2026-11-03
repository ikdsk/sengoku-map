// 画像クレジットページ: 画像ごとに作者・ライセンス・Commons ファイルページ・Wikipedia 記事リンク。
(function () {
  const SG = window.SG;
  const $ = (s, r) => (r || document).querySelector(s);
  const KIND = { portrait: '人物の肖像', mon: '家紋', battle: '合戦・出来事の図版', castle: '城・史跡' };
  let built = false;
  SG.initCredits = function () {
    if (built) return;
    built = true;
    $('#credits-map').append(SG.el('div', { class: 'credit-row map-credit' },
      SG.el('div', null, SG.el('b', null, '地図（令制国）'), SG.el('p', null, '原図: Provinces of Japan with names.svg / Provinces of Japan-*.svg（Wikimedia Commons）　作者: Ash Crow　ライセンス: ',
        SG.el('a', { href: 'https://creativecommons.org/licenses/by/2.5/', target: '_blank', rel: 'noopener' }, 'CC BY 2.5'), '　',
        SG.el('a', { href: 'https://commons.wikimedia.org/wiki/File:Provinces_of_Japan_with_names.svg', target: '_blank', rel: 'noopener' }, 'ファイルページ'),
        '。国ごとの図形を抽出して色分け用に加工しています（変更あり）。当時の国境とは細部が異なる近似です。'))));
    const list = $('#credits-list');
    const groups = {};
    for (const [key, r] of Object.entries(SG.S.images)) (groups[r.kind] = groups[r.kind] || []).push([key, r]);
    for (const kind of Object.keys(KIND)) {
      const items = groups[kind] || [];
      if (!items.length) continue;
      const sec = SG.el('section', { class: 'credit-group' }, SG.el('h3', null, `${KIND[kind]}（${items.length}点）`));
      for (const [key, r] of items) {
        sec.append(SG.el('div', { class: 'credit-row' },
          SG.el('div', { class: 'cr-thumb' }, SG.img(key, { w: 120, alt: r.label })),
          SG.el('div', { class: 'cr-text' },
            SG.el('b', null, r.label),
            SG.el('p', null, '作者: ', r.artist, '　ライセンス: ', r.licenseUrl ? SG.el('a', { href: r.licenseUrl, target: '_blank', rel: 'noopener' }, r.license) : r.license),
            SG.el('p', null, SG.el('a', { href: r.filePage, target: '_blank', rel: 'noopener' }, 'Commons: ' + r.file), '　', SG.el('a', { href: r.articleUrl, target: '_blank', rel: 'noopener' }, 'Wikipedia: ' + r.article), r.source ? SG.el('small', null, `　取得元: ${r.source}`) : null))));
      }
      list.append(sec);
    }
  };
})();
