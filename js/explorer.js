// 勢力図エクスプローラ: 年表スライダー・再生・勢力ランキング・凡例・ホバーカード。
(function () {
  const SG = window.SG;
  const $ = (s, r) => (r || document).querySelector(s);
  const REGION = { hokkaido: '北海道', tohoku: '東北', kanto: '関東', hokuriku: '北陸', tosan: '東山', tokai: '東海', kinki: '畿内・近畿', sanin: '山陰', sanyo: '山陽', shikoku: '四国', kyushu: '九州' };
  const NOT_RANKED = new Set(['kokujin', 'ainu']);
  const ROW_H = 32;
  const TOP_N = 10;

  // ---- ホバー/タップカード ----
  const tip = $('#tip');
  function hideTip() { tip.hidden = true; tip.classList.remove('dock'); }
  function tipContent(id, snapIdx) {
    const pv = SG.provById[id];
    const owner = SG.snaps[snapIdx].owners[id];
    const clan = SG.clanById[owner];
    const prevOwner = snapIdx > 0 ? SG.snaps[snapIdx - 1].owners[id] : null;
    const year = SG.snaps[snapIdx].year;
    const wrap = SG.el('div', { class: 'tip-in' });
    wrap.append(SG.el('div', { class: 'tip-prov' }, `${pv.name}${id === 'ezo' ? '' : '国'}`, SG.el('small', null, REGION[pv.region] || '')));
    const chip = SG.el('span', { class: 'chip', style: `background:${clan.color}` });
    wrap.append(SG.el('div', { class: 'tip-owner' }, chip, SG.el('b', null, clan.name), SG.el('span', { class: 'tip-yr' }, `（${year}年）`)));
    if (prevOwner && prevOwner !== owner) {
      const pc = SG.clanById[prevOwner];
      wrap.append(SG.el('div', { class: 'tip-prev' }, `前の時点（${SG.snaps[snapIdx - 1].year}年）: ${pc.name} → ${clan.name}`));
    }
    if (owner === 'kokujin') {
      wrap.append(SG.el('div', { class: 'tip-note' }, '複数の国人・小勢力が入り組む、または史料上断定しにくい国です。'));
    } else {
      const hd = SG.resolveHead(SG.headAt(clan, year));
      if (hd) {
        const row = SG.el('div', { class: 'tip-head' });
        if (hd.person) row.append(SG.img('person:' + hd.person.id, { w: 120, cls: 'tip-face', alt: hd.name }));
        row.append(SG.el('div', null, SG.el('small', null, `${year}年の当主`), SG.el('b', null, hd.name), hd.person ? SG.el('span', null, SG.fmtYears(hd.person)) : null));
        wrap.append(row);
      }
      if (clan.detail) wrap.append(SG.el('div', { class: 'tip-cta' }, `${clan.name}のページを開く`));
    }
    return wrap;
  }
  SG.showTip = function (id, snapIdx, ev, dock) {
    tip.replaceChildren(tipContent(id, snapIdx));
    tip.hidden = false;
    tip.classList.toggle('dock', !!dock);
    if (!dock && ev) SG.moveTip(ev);
  };
  SG.moveTip = function (ev) {
    if (tip.classList.contains('dock')) return;
    const pad = 14;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
    if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  };
  SG.hideTip = hideTip;

  function tweenNumber(el, to, ms) {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (SG.reduced || from === to) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      el.textContent = Math.round(from + (to - from) * t);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  class Explorer {
    constructor() {
      this.idx = 0;
      this.playing = false;
      this.timer = null;
      this.map = new SG.SengokuMap($('#main-map'), {
        interactive: true,
        onHover: (id, e) => { if (this.touchSel) return; SG.showTip(id, this.idx, e, false); },
        onMove: (id, e) => SG.moveTip(e),
        onLeave: () => { if (!this.touchSel) hideTip(); },
        onSelect: (id, e) => this.onSelect(id, e),
        onFocus: (id) => { const r = this.map.paths[id].getBoundingClientRect(); SG.showTip(id, this.idx, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, false); },
      });
      this.slider = $('#year-slider');
      this.buildTicks();
      this.buildRank();
      this.bind();
      this.map.setSnapNow(0);
      this.render(0, false);
    }

    buildTicks() {
      const ticks = $('#ticks');
      const n = SG.years.length;
      const showLabel = new Set([0, 3, 7, 10, 15, 19, 20]);
      SG.years.forEach((y, i) => {
        const b = SG.el('button', { class: 'tick' + (showLabel.has(i) ? ' lab' : ''), type: 'button', 'aria-label': `${y}年 ${SG.snaps[i].label}`, style: `left:${(i / (n - 1)) * 100}%`, onclick: () => this.goto(i, { user: true }) });
        b.append(SG.el('i'));
        if (showLabel.has(i)) b.append(SG.el('span', null, String(y)));
        ticks.append(b);
      });
      this.slider.max = n - 1;
    }

    buildRank() {
      const rank = $('#rank');
      rank.style.height = TOP_N * ROW_H + 'px';
      this.rows = {};
      for (const c of SG.S.clans) {
        if (NOT_RANKED.has(c.id)) continue;
        const row = SG.el('div', { class: 'rk-row', 'data-clan': c.id });
        const btn = SG.el('button', { class: 'rk-name', type: 'button', onclick: () => SG.openClan(c.id) });
        btn.append(SG.el('i', { class: 'chip', style: `background:${c.color}` }), c.name.replace('（後北条）', '').replace('（一向一揆）', ''));
        const bar = SG.el('div', { class: 'rk-bar' }, SG.el('i', { style: `background:${c.color}` }));
        row.append(SG.el('span', { class: 'rk-no' }), btn, bar, SG.el('b', { class: 'rk-n' }, '0'));
        row.style.height = ROW_H + 'px';
        rank.append(row);
        this.rows[c.id] = row;
      }
    }

    renderRank(idx, animate) {
      const counts = SG.counts(idx);
      const list = Object.keys(this.rows).filter((id) => counts[id] > 0).sort((a, b) => counts[b] - counts[a] || SG.S.clans.findIndex((c) => c.id === a) - SG.S.clans.findIndex((c) => c.id === b));
      const max = Math.max(10, counts[list[0]] || 1);
      const shown = new Set(list.slice(0, TOP_N));
      list.forEach((id, i) => {
        const row = this.rows[id];
        const vis = shown.has(id);
        row.style.transform = `translateY(${vis ? i * ROW_H : TOP_N * ROW_H}px)`;
        row.style.opacity = vis ? 1 : 0;
        row.style.pointerEvents = vis ? '' : 'none';
        row.firstChild.textContent = vis ? i + 1 : '';
        row.querySelector('.rk-bar i').style.width = (counts[id] / max) * 100 + '%';
        tweenNumber(row.querySelector('.rk-n'), counts[id], animate ? 700 : 0);
        row.classList.toggle('active', id === this.hl);
        row.setAttribute('aria-hidden', vis ? 'false' : 'true');
      });
      for (const id in this.rows) if (!(counts[id] > 0)) {
        const row = this.rows[id];
        row.style.opacity = 0; row.style.pointerEvents = 'none'; row.style.transform = `translateY(${TOP_N * ROW_H + 40}px)`;
        row.setAttribute('aria-hidden', 'true');
        tweenNumber(row.querySelector('.rk-n'), 0, 0);
      }
      const k = counts.kokujin || 0, a = counts.ainu || 0;
      $('#rank-meta').textContent = `中小勢力・国人（灰色）${k}国 ／ 蝦夷地 ${a}区画 ／ 全${Object.keys(SG.snaps[idx].owners).length}区画`;
      this.renderLegend(counts);
    }

    renderLegend(counts) {
      const ul = $('#legend');
      ul.replaceChildren();
      const ids = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      for (const id of ids) {
        const c = SG.clanById[id];
        const li = SG.el('li', null, SG.el('button', { type: 'button', class: id === this.hl ? 'on' : '', onclick: () => (c.detail ? SG.openClan(id) : this.toggleHl(id)) },
          SG.el('i', { class: 'chip', style: `background:${c.color}` }), SG.el('span', null, c.name), SG.el('em', null, counts[id])));
        ul.append(li);
      }
    }

    render(idx, animate) {
      const s = SG.snaps[idx];
      this.idx = idx;
      $('#year-num').textContent = s.year;
      $('#year-label').textContent = s.label;
      $('#year-title').textContent = s.title;
      this.slider.value = idx;
      this.slider.style.setProperty('--p', (idx / (SG.years.length - 1)) * 100 + '%');
      const note = $('#year-note');
      note.replaceChildren(SG.el('p', null, s.note));
      const ev = SG.S.events.find((e) => e.snapshot === s.year);
      if (ev) note.append(SG.el('p', { class: 'year-ev' }, SG.el('a', { href: '#/event/' + ev.id }, `「${ev.title}」を読む →`)));
      document.querySelectorAll('#ticks .tick').forEach((t, i) => t.classList.toggle('on', i === idx));
      this.renderRank(idx, animate);
    }

    goto(idx, opts) {
      opts = opts || {};
      idx = Math.max(0, Math.min(SG.years.length - 1, idx));
      if (opts.user) this.pause();
      const first = idx === this.idx && !opts.force;
      if (first) return;
      hideTip();
      this.map.setSnap(idx, { duration: opts.duration || 900, animate: opts.animate });
      this.render(idx, true);
      if (!opts.silent) SG.go('#/year/' + SG.years[idx], true);
    }
    gotoYear(year, opts) { this.goto(SG.snapIndex(year), opts); }

    play() {
      if (this.playing) return;
      if (this.idx >= SG.years.length - 1) this.goto(0, { silent: true, duration: 500 });
      this.playing = true;
      this.setPlayUi();
      const tick = () => {
        if (!this.playing) return;
        if (this.idx >= SG.years.length - 1) { this.pause(); return; }
        const ms = +$('#speed').value;
        this.goto(this.idx + 1, { duration: Math.min(1200, ms * 0.6) });
        this.timer = setTimeout(tick, ms);
      };
      this.timer = setTimeout(tick, 350);
    }
    pause() { this.playing = false; clearTimeout(this.timer); this.setPlayUi(); }
    setPlayUi() {
      const b = $('#btn-play');
      b.classList.toggle('on', this.playing);
      b.setAttribute('aria-pressed', this.playing);
      b.setAttribute('aria-label', this.playing ? '一時停止' : '再生');
    }

    bind() {
      $('#btn-play').addEventListener('click', () => (this.playing ? this.pause() : this.play()));
      $('#btn-prev').addEventListener('click', () => this.goto(this.idx - 1, { user: true }));
      $('#btn-next').addEventListener('click', () => this.goto(this.idx + 1, { user: true }));
      this.slider.addEventListener('input', () => this.goto(+this.slider.value, { user: true, duration: 600 }));
      document.addEventListener('pointerdown', (e) => { if (this.touchSel && !e.target.closest('.prov') && !e.target.closest('#tip')) this.clearTouch(); });
      $('#tip').addEventListener('click', () => { if (this.touchSel) this.openOwner(this.touchSel); });
    }

    onSelect(id, e) {
      const owner = SG.snaps[this.idx].owners[id];
      const isTouch = e.pointerType === 'touch' || (e.detail === 0 && false) || window.matchMedia('(hover: none)').matches;
      if (isTouch) {
        if (this.touchSel === id) { this.openOwner(id); return; }
        this.touchSel = id;
        this.map.select(id);
        SG.showTip(id, this.idx, null, true);
        return;
      }
      this.map.select(id);
      this.openOwner(id);
    }
    openOwner(id) {
      const owner = SG.snaps[this.idx].owners[id];
      this.clearTouch();
      const c = SG.clanById[owner];
      if (c.detail) SG.openClan(owner);
      else this.toggleHl(owner);
    }
    clearTouch() { this.touchSel = null; this.map.select(null); hideTip(); }
    toggleHl(id) { this.setHighlight(this.hl === id ? null : id); }
    setHighlight(id) {
      this.hl = id || null;
      this.map.highlight(this.hl);
      document.querySelectorAll('.rk-row').forEach((r) => r.classList.toggle('active', r.dataset.clan === this.hl));
      this.renderLegend(SG.counts(this.idx));
    }
  }

  SG.Explorer = Explorer;
})();
