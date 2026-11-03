// 大名家一覧と武将ギャラリー。
(function () {
  const SG = window.SG;
  const $ = (s, r) => (r || document).querySelector(s);

  SG.initClanGrid = function () {
    const grid = $('#clan-grid');
    const clans = SG.S.clans.filter((c) => c.detail);
    const peak = (id) => Math.max(...SG.snaps.map((s, i) => SG.counts(i)[id] || 0));
    clans.forEach((c) => {
      const a = SG.el('a', { class: 'clan-card', href: '#/clan/' + c.id, style: `--c:${c.color}` },
        SG.el('div', { class: 'cc-mon' }, SG.img('mon:' + c.id, { w: 250, alt: c.name + 'の家紋' })),
        SG.el('b', null, c.name),
        SG.el('span', null, c.base),
        SG.el('em', null, `最大${peak(c.id)}国`));
      grid.append(a);
    });
  };

  SG.initGallery = function () {
    const filter = $('#people-filter');
    const grid = $('#people-grid');
    let cur = 'all';
    const groups = [['all', 'すべて']];
    const seen = new Set();
    SG.S.people.forEach((p) => { if (p.clan && !seen.has(p.clan)) { seen.add(p.clan); } });
    // 家ごとの絞り込み: 人数の多い順
    const cnt = {};
    SG.S.people.forEach((p) => { cnt[p.clan || '-'] = (cnt[p.clan || '-'] || 0) + 1; });
    [...seen].sort((a, b) => cnt[b] - cnt[a]).forEach((id) => groups.push([id, SG.clanById[id].name.replace('（後北条）', '').replace('（一向一揆）', '').replace('家', '')]));
    const draw = () => {
      grid.replaceChildren();
      const list = SG.S.people.filter((p) => cur === 'all' || p.clan === cur).sort((a, b) => a.birth - b.birth);
      list.forEach((p) => {
        const c = SG.clanById[p.clan];
        grid.append(SG.el('a', { class: 'person-card', href: '#/person/' + p.id, style: `--c:${c ? c.color : '#999'}` },
          SG.el('div', { class: 'pc-img' }, SG.img('person:' + p.id, { w: 250, alt: p.name + 'の肖像' })),
          SG.el('b', null, p.name), SG.el('span', null, SG.fmtYears(p)), SG.el('small', null, p.role)));
      });
      filter.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === cur));
      $('#people-count') && ($('#people-count').textContent = list.length);
    };
    groups.forEach(([id, label]) => filter.append(SG.el('button', { type: 'button', 'data-id': id, class: 'pill', onclick: () => { cur = id; draw(); } }, label)));
    filter.append(SG.el('span', { class: 'people-count' }, SG.el('b', { id: 'people-count' }, '0'), '人'));
    draw();
  };
})();
