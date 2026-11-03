// 大名家パネルと人物モーダル。
(function () {
  const SG = window.SG;
  const $ = (s, r) => (r || document).querySelector(s);
  const overlay = $('#overlay');
  const body = $('#sheet-body');
  let lastFocus = null;
  let miniMap = null;

  SG.openClan = (id) => SG.go('#/clan/' + id);
  SG.openPerson = (id) => SG.go('#/person/' + id);

  function openSheet(kind) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    overlay.dataset.kind = kind;
    document.body.classList.add('sheet-open');
    $('#sheet').scrollTop = 0;
    requestAnimationFrame(() => { overlay.classList.add('open'); $('#sheet .close').focus({ preventScroll: true }); });
  }
  SG.closeSheet = function (silent) {
    if (overlay.hidden) return;
    overlay.classList.remove('open');
    document.body.classList.remove('sheet-open');
    overlay.hidden = true;
    body.replaceChildren();
    miniMap = null;
    if (lastFocus && lastFocus.focus) try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
    if (!silent) SG.go('#/year/' + SG.years[SG.explorer ? SG.explorer.idx : 0], true);
  };
  overlay.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) SG.closeSheet(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) SG.closeSheet();
    if (e.key === 'Tab' && !overlay.hidden) {
      const f = [...$('#sheet').querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // 著者・ライセンス行
  function credit(key) {
    const r = SG.imgRec(key);
    if (!r) return null;
    return SG.el('figcaption', { class: 'credit' }, SG.el('span', null, `${r.label}　`), '画像: ', SG.el('a', { href: r.filePage, target: '_blank', rel: 'noopener' }, r.file.replace(/\.[a-z]+$/i, '').slice(0, 48)), `／${r.artist.slice(0, 40)}／`, r.licenseUrl ? SG.el('a', { href: r.licenseUrl, target: '_blank', rel: 'noopener' }, r.license) : r.license);
  }

  function chipLink(clan) {
    return SG.el('a', { class: 'clan-chip', href: '#/clan/' + clan.id }, SG.el('i', { class: 'chip', style: `background:${clan.color}` }), clan.name);
  }

  function faceCard(p, sub) {
    return SG.el('a', { class: 'face-card', href: '#/person/' + p.id },
      SG.el('div', { class: 'face-img' }, SG.img('person:' + p.id, { w: 250, alt: p.name + 'の肖像' })),
      SG.el('b', null, p.name), SG.el('span', null, sub || SG.fmtYears(p)));
  }

  // ---- 勢力の推移(折れ線) ----
  function chart(clan) {
    const W = 560, H = 220, L = 34, R = 12, T = 28, B = 30;
    const counts = SG.snaps.map((s, i) => SG.counts(i)[clan.id] || 0);
    const maxC = Math.max(5, Math.ceil(Math.max(...counts) / 5) * 5);
    const y0 = SG.years[0], y1 = SG.years[SG.years.length - 1];
    const X = (y) => L + ((y - y0) / (y1 - y0)) * (W - L - R);
    const Y = (c) => T + (1 - c / maxC) * (H - T - B);
    const svg = SG.svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': `${clan.name}の支配国数の推移` });
    for (let c = 0; c <= maxC; c += 5) {
      svg.append(SG.svgEl('line', { x1: L, x2: W - R, y1: Y(c), y2: Y(c), class: 'grid' }));
      const t = SG.svgEl('text', { x: L - 6, y: Y(c) + 4, class: 'ax', 'text-anchor': 'end' }); t.textContent = c; svg.append(t);
    }
    [1467, 1500, 1550, 1582, 1600, 1615].forEach((y) => {
      const t = SG.svgEl('text', { x: X(y), y: H - 8, class: 'ax', 'text-anchor': y === 1467 ? 'start' : y === 1615 ? 'end' : 'middle' }); t.textContent = y; svg.append(t);
      svg.append(SG.svgEl('line', { x1: X(y), x2: X(y), y1: H - B, y2: H - B + 4, class: 'tk' }));
    });
    // 階段状(次のスナップショットまで一定ではなく折れ線)
    const pts = SG.years.map((y, i) => [X(y), Y(counts[i])]);
    const area = `M${pts[0][0]},${Y(0)} ` + pts.map((p) => `L${p[0]},${p[1]}`).join(' ') + ` L${pts[pts.length - 1][0]},${Y(0)}Z`;
    svg.append(SG.svgEl('path', { d: area, fill: clan.color, 'fill-opacity': 0.2 }));
    svg.append(SG.svgEl('path', { d: 'M' + pts.map((p) => p.join(',')).join(' L'), fill: 'none', stroke: clan.color, 'stroke-width': 2.4, 'stroke-linejoin': 'round' }));
    const peak = counts.indexOf(Math.max(...counts));
    pts.forEach((p, i) => {
      const c = SG.svgEl('circle', { cx: p[0], cy: p[1], r: i === peak ? 4.6 : 2.8, fill: i === peak ? '#c8321e' : clan.color, class: 'pt' });
      const tt = SG.svgEl('title'); tt.textContent = `${SG.years[i]}年 ${counts[i]}国`; c.append(tt);
      svg.append(c);
    });
    const cur = SG.explorer ? SG.explorer.idx : 0;
    svg.append(SG.svgEl('line', { x1: X(SG.years[cur]), x2: X(SG.years[cur]), y1: T, y2: H - B, class: 'cur' }));
    if (counts[peak] > 0) {
      const t = SG.svgEl('text', { x: Math.min(W - R - 4, Math.max(L + 4, pts[peak][0])), y: pts[peak][1] - 9, class: 'pk', 'text-anchor': pts[peak][0] > W - 90 ? 'end' : pts[peak][0] < 90 ? 'start' : 'middle' });
      t.textContent = `最大 ${counts[peak]}国（${SG.years[peak]}年）`; svg.append(t);
    }
    return { svg, counts, peak };
  }

  function section(title, ...kids) {
    return SG.el('section', { class: 'sh-sec' }, SG.el('h3', null, title), ...kids);
  }

  SG.showClan = function (id) {
    const clan = SG.clanById[id];
    if (!clan) return false;
    body.replaceChildren();
    const head = SG.el('header', { class: 'sh-head clan-head', style: `--c:${clan.color}` });
    const mon = SG.el('div', { class: 'mon-big' }, SG.img('mon:' + id, { w: 330, alt: clan.name + 'の家紋', cls: 'mon-img', eager: true }));
    const info = SG.el('div', { class: 'sh-title' },
      SG.el('p', { class: 'eyebrow' }, clan.base ? `本拠 ${clan.base}` : '勢力'),
      SG.el('h2', { id: 'sheet-title' }, clan.name),
      SG.el('p', { class: 'sh-meta' }, SG.el('i', { class: 'chip lg', style: `background:${clan.color}` }), `地図の色: ${clan.colorName}`, clan.range ? `　勢力圏の存続: ${clan.range[0]}–${clan.range[1]}年` : ''));
    head.append(mon, info);
    body.append(head);
    const mk = credit('mon:' + id);
    if (mk) body.append(SG.el('figure', { class: 'credit-fig' }, mk));
    body.append(SG.el('p', { class: 'sh-desc' }, clan.desc));

    // 勢力の推移
    if (id !== 'kokujin') {
      const { svg, counts, peak } = chart(clan);
      const mapBox = SG.el('div', { class: 'mini-map' });
      const wrap = SG.el('div', { class: 'trend' }, SG.el('div', { class: 'trend-chart' }, svg), SG.el('figure', { class: 'trend-map' }, mapBox,
        SG.el('figcaption', null, counts[peak] > 0 ? `最大版図: ${SG.years[peak]}年（${counts[peak]}国）` : '')));
      body.append(section('勢力の推移', SG.el('p', { class: 'sec-note' }, '各時点で支配していた国の数。赤い点が最大、縦線は地図で表示中の年代です。'), wrap,
        SG.el('p', null, SG.el('button', { type: 'button', class: 'btn btn-sm', onclick: () => { SG.explorer.gotoYear(SG.years[peak]); SG.explorer.setHighlight(id); SG.closeSheet(true); document.getElementById('map').scrollIntoView({ behavior: SG.reduced ? 'auto' : 'smooth' }); SG.go('#/year/' + SG.years[peak], true); } }, '地図で最大版図を見る'))));
      // ミニ地図(最大版図)
      miniMap = new SG.SengokuMap(mapBox, { interactive: false, animate: false });
      miniMap.setSnapNow(peak);
      miniMap.highlight(id);
    }

    // 歴代当主
    const heads = (clan.heads || []);
    if (heads.length) {
      const row = SG.el('div', { class: 'faces' });
      heads.forEach(([from, h], i) => {
        const r = SG.resolveHead(h);
        const to = heads[i + 1] ? heads[i + 1][0] : null;
        const span = `${from}年〜${to ? to + '年' : ''}`;
        if (r.person) row.append(faceCard(r.person, span));
        else row.append(SG.el('div', { class: 'face-card plain' }, SG.el('div', { class: 'face-img' }, SG.placeholder(r.name)), SG.el('b', null, r.name), SG.el('span', null, span)));
      });
      body.append(section('歴代当主', SG.el('p', { class: 'sec-note' }, '年は当主の座にあった目安です。肖像画がある人物は詳細を開けます。'), row));
    }

    // 居城
    const places = SG.S.places.filter((p) => p.clan === id);
    if (places.length) {
      const fig = places.map((p) => SG.el('figure', { class: 'plate' }, SG.el('div', { class: 'plate-img' }, SG.img('place:' + p.id, { w: 500, alt: p.name })), SG.el('figcaption', null, SG.el('b', null, p.name), SG.el('span', null, p.text), credit('place:' + p.id))));
      body.append(section('居城・史跡', SG.el('div', { class: 'plates' }, fig)));
    }

    // 出来事
    const evs = SG.S.events.filter((e) => e.clans.includes(id));
    if (evs.length) body.append(section('関わる出来事', SG.el('ul', { class: 'ev-list' }, evs.map((e) => SG.el('li', null, SG.el('a', { href: '#/event/' + e.id }, SG.el('b', null, e.year + '年'), ' ' + e.title))))));

    // 人物
    const ppl = SG.S.people.filter((p) => p.clan === id);
    if (ppl.length) body.append(section('この家の主な人物', SG.el('div', { class: 'faces' }, ppl.map((p) => faceCard(p)))));

    openSheet('clan');
    return true;
  };

  SG.showPerson = function (id) {
    const p = SG.personById[id];
    if (!p) return false;
    body.replaceChildren();
    const clan = SG.clanById[p.clan];
    const key = 'person:' + id;
    const fig = SG.el('figure', { class: 'portrait' }, SG.el('div', { class: 'portrait-img' }, SG.img(key, { w: 500, alt: p.name + 'の肖像', eager: true })), credit(key));
    const txt = SG.el('div', { class: 'sh-title' },
      SG.el('p', { class: 'eyebrow' }, p.role),
      SG.el('h2', { id: 'sheet-title' }, p.name),
      SG.el('p', { class: 'kana' }, p.kana),
      SG.el('p', { class: 'sh-meta' }, `${SG.fmtYears(p)}年`, p.fuzzy ? SG.el('small', null, '（生没年に諸説あり）') : null),
      clan ? SG.el('p', null, chipLink(clan)) : null,
      SG.el('p', { class: 'sh-desc' }, p.desc));
    body.append(SG.el('div', { class: 'person-head' }, fig, txt));
    const evs = SG.S.events.filter((e) => e.people.includes(id));
    if (evs.length) body.append(section('関わる出来事', SG.el('ul', { class: 'ev-list' }, evs.map((e) => SG.el('li', null, SG.el('a', { href: '#/event/' + e.id }, SG.el('b', null, e.year + '年'), ' ' + e.title))))));
    const art = SG.imgRec(key);
    body.append(SG.el('p', { class: 'src' }, '参考: ', SG.el('a', { href: 'https://ja.wikipedia.org/wiki/' + encodeURIComponent(p.wiki), target: '_blank', rel: 'noopener' }, `Wikipedia「${p.wiki}」`)));
    if (p.clan) {
      const others = SG.S.people.filter((q) => q.clan === p.clan && q.id !== id).slice(0, 8);
      if (others.length) body.append(section(`${clan.name}の人物`, SG.el('div', { class: 'faces' }, others.map((q) => faceCard(q)))));
    }
    openSheet('person');
    return true;
  };
})();
