// 合戦・出来事のスクロールストーリー。カードが画面中央に来ると、左(スマホは上)の地図がその年へ遷移する。
(function () {
  const SG = window.SG;
  const $ = (s, r) => (r || document).querySelector(s);

  function credit(key) {
    const r = SG.imgRec(key);
    if (!r) return SG.el('figcaption', { class: 'credit' }, '（画像なし）');
    return SG.el('figcaption', { class: 'credit' }, '図版: ', SG.el('a', { href: r.filePage, target: '_blank', rel: 'noopener' }, r.file.replace(/\.[a-z]+$/i, '').slice(0, 56)), `／${r.artist.slice(0, 36)}／`, r.licenseUrl ? SG.el('a', { href: r.licenseUrl, target: '_blank', rel: 'noopener' }, r.license) : r.license);
  }

  SG.initStory = function () {
    const cards = $('#story-cards');
    const map = new SG.SengokuMap($('#story-map'), { interactive: false });
    SG.storyMap = map;
    map.setSnapNow(0);
    let cur = -1;
    const setYear = (year) => {
      const idx = SG.snapIndex(year);
      if (idx === cur) return;
      cur = idx;
      map.setSnap(idx, { duration: 1000 });
      $('#story-year').textContent = SG.years[idx];
      $('#story-year-label').textContent = SG.snaps[idx].label;
      const counts = SG.counts(idx);
      const top = Object.keys(counts).filter((k) => k !== 'kokujin').sort((a, b) => counts[b] - counts[a]).slice(0, 6);
      $('#story-legend').replaceChildren(...top.map((id) => SG.el('li', null, SG.el('i', { class: 'chip', style: `background:${SG.clanById[id].color}` }), SG.clanById[id].name.replace('（後北条）', '').replace('（一向一揆）', ''), SG.el('em', null, counts[id]))));
      cards.querySelectorAll('.ev-card').forEach((c) => c.classList.toggle('active', +c.dataset.snap === SG.years[idx]));
    };
    SG.S.events.forEach((e, i) => {
      const key = 'event:' + e.id;
      const fig = SG.el('figure', { class: 'ev-fig' }, SG.el('div', { class: 'ev-img' }, SG.img(key, { w: 960, alt: e.title })), credit(key), e.imgNote ? SG.el('figcaption', { class: 'credit note' }, '※ ' + e.imgNote) : null);
      const faces = SG.el('div', { class: 'ev-faces' }, e.people.map((pid) => { const p = SG.personById[pid]; return p ? SG.el('a', { class: 'mini-face', href: '#/person/' + pid, title: p.name }, SG.img('person:' + pid, { w: 120, alt: p.name }), SG.el('span', null, p.name)) : null; }));
      const clans = SG.el('p', { class: 'ev-clans' }, e.clans.map((cid) => { const c = SG.clanById[cid]; return c.detail ? SG.el('a', { class: 'clan-chip', href: '#/clan/' + cid }, SG.el('i', { class: 'chip', style: `background:${c.color}` }), c.name) : null; }));
      const li = SG.el('li', { class: 'ev-card', id: 'ev-' + e.id, 'data-snap': e.snapshot, 'data-year': e.year },
        SG.el('div', { class: 'ev-no' }, `図${i + 1}`),
        fig,
        SG.el('div', { class: 'ev-body' },
          SG.el('p', { class: 'ev-date' }, e.date),
          SG.el('h3', null, e.title),
          SG.el('p', null, e.text),
          faces, clans,
          SG.el('p', null, SG.el('button', { type: 'button', class: 'btn btn-sm', onclick: () => { setYear(e.snapshot); li.scrollIntoView({ behavior: SG.reduced ? 'auto' : 'smooth', block: 'center' }); SG.go('#/event/' + e.id, true); } }, 'この出来事へ（地図を' + e.snapshot + '年に）'),
            SG.el('button', { type: 'button', class: 'btn btn-sm btn-ghost', onclick: () => { SG.explorer.gotoYear(e.snapshot, { user: true }); document.getElementById('map').scrollIntoView({ behavior: SG.reduced ? 'auto' : 'smooth' }); } }, '大きな地図で見る'))));
      cards.append(li);
    });
    setYear(SG.years[0]);
    const io = new IntersectionObserver((ents) => {
      for (const en of ents) if (en.isIntersecting) { setYear(+en.target.dataset.snap); }
    }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });
    cards.querySelectorAll('.ev-card').forEach((c) => io.observe(c));
    SG.storyGoto = (id) => {
      const c = document.getElementById('ev-' + id);
      if (!c) return false;
      setYear(+c.dataset.snap);
      c.scrollIntoView({ behavior: SG.reduced ? 'auto' : 'smooth', block: 'center' });
      return true;
    };
  };
})();
