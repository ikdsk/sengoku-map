// 令制国地図(SVG)。年代の切り替えで国の色・境界色を補間アニメーションし、新たに獲得した国に波紋を出す。
(function () {
  const SG = window.SG;
  const M = SG.S.map;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  class SengokuMap {
    constructor(container, opts) {
      this.opts = Object.assign({ interactive: true, animate: true }, opts || {});
      this.container = container;
      this.snapIdx = 0;
      this.owners = {};
      this.fill = {}; // id -> [r,g,b]
      this.raf = null;
      this.hlClan = null;
      this.selected = null;
      this.build();
    }

    build() {
      const [x, y, w, h] = M.viewBox;
      const svg = SG.svgEl('svg', { viewBox: `${x} ${y} ${w} ${h}`, class: 'jp-map', role: 'img', 'aria-label': '令制国単位の日本地図（戦国時代の勢力図）', preserveAspectRatio: 'xMidYMid meet' });
      svg.append(SG.svgEl('rect', { x: x - 20, y: y - 20, width: w + 40, height: h + 40, class: 'sea' }));
      const gl = SG.svgEl('g', { class: 'lakes' });
      M.lakes.forEach((d) => gl.append(SG.svgEl('path', { d, class: 'lake' })));
      const gp = SG.svgEl('g', { class: 'provs' });
      this.paths = {};
      for (const p of M.provinces) {
        const path = SG.svgEl('path', { d: p.d, class: 'prov', 'data-id': p.id, 'fill-rule': 'evenodd' });
        if (this.opts.interactive) {
          path.setAttribute('tabindex', '0');
          path.setAttribute('role', 'button');
          path.addEventListener('pointerenter', (e) => this.opts.onHover && e.pointerType !== 'touch' && this.opts.onHover(p.id, e));
          path.addEventListener('pointermove', (e) => this.opts.onMove && e.pointerType !== 'touch' && this.opts.onMove(p.id, e));
          path.addEventListener('pointerleave', (e) => this.opts.onLeave && this.opts.onLeave(p.id, e));
          path.addEventListener('click', (e) => this.opts.onSelect && this.opts.onSelect(p.id, e));
          path.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.opts.onSelect && this.opts.onSelect(p.id, e); } });
          path.addEventListener('focus', (e) => this.opts.onFocus && this.opts.onFocus(p.id, e));
        }
        this.paths[p.id] = path;
        gp.append(path);
      }
      this.pulseLayer = SG.svgEl('g', { class: 'pulses', 'pointer-events': 'none' });
      svg.append(gl, gp, this.pulseLayer);
      this.svg = svg;
      this.container.append(svg);
    }

    ownersOf(idx) { return SG.snaps[idx].owners; }

    paint(id, rgb) {
      const p = this.paths[id];
      p.setAttribute('fill', SG.rgb(rgb));
      p.setAttribute('stroke', SG.rgb(SG.darken(rgb, 0.62)));
    }

    // 即時設定
    setSnapNow(idx) {
      this.cancel();
      this.snapIdx = idx;
      this.owners = Object.assign({}, this.ownersOf(idx));
      for (const id in this.owners) { this.fill[id] = SG.clanRGB(this.owners[id]); this.paint(id, this.fill[id]); this.updateLabel(id); }
      this.applyHighlight();
    }

    cancel() { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }

    // idx のスナップショットへ。duration(ms) で色補間し、獲得した国に波紋を出す。
    setSnap(idx, opts) {
      opts = opts || {};
      if (idx === this.snapIdx && Object.keys(this.owners).length) return Promise.resolve();
      const dur = this.opts.animate && !SG.reduced && opts.animate !== false ? (opts.duration || 900) : 0;
      if (!dur) { this.setSnapNow(idx); return Promise.resolve(); }
      this.cancel();
      const target = this.ownersOf(idx);
      const from = {};
      const changed = [];
      for (const id in target) {
        from[id] = (this.fill[id] || SG.clanRGB(target[id])).slice();
        if (this.owners[id] !== target[id]) changed.push(id);
      }
      const to = {};
      for (const id in target) to[id] = SG.clanRGB(target[id]);
      this.snapIdx = idx;
      const prevOwners = this.owners;
      this.owners = Object.assign({}, target);
      const gained = changed.filter((id) => target[id] !== 'kokujin' && prevOwners[id] !== target[id]);
      let pulsed = false;
      const t0 = performance.now();
      return new Promise((resolve) => {
        const step = (now) => {
          const t = Math.min(1, (now - t0) / dur);
          const e = ease(t);
          for (const id of changed) { const c = SG.lerpC(from[id], to[id], e); this.fill[id] = c; this.paint(id, c); }
          if (!pulsed && t > 0.3) { pulsed = true; this.pulse(gained); }
          if (t < 1) this.raf = requestAnimationFrame(step);
          else { this.raf = null; for (const id of changed) { this.fill[id] = to[id]; this.paint(id, to[id]); this.updateLabel(id); } resolve(); }
        };
        this.raf = requestAnimationFrame(step);
      });
    }

    updateLabel(id) {
      const p = this.paths[id];
      const clan = SG.clanById[this.owners[id]];
      p.setAttribute('aria-label', `${SG.provById[id].name}国 ― ${clan ? clan.name : ''}`);
    }

    pulse(ids) {
      if (SG.reduced || !ids.length) return;
      ids.slice(0, 28).forEach((id, i) => {
        const p = SG.provById[id];
        const path = this.paths[id];
        path.classList.remove('gain'); void path.getBoundingClientRect(); path.classList.add('gain');
        setTimeout(() => path.classList.remove('gain'), 1800);
        for (let k = 0; k < 2; k++) {
          const c = SG.svgEl('circle', { cx: p.cx, cy: p.cy, r: 3, class: 'ripple' });
          c.style.animationDelay = (i % 6) * 60 + k * 260 + 'ms';
          this.pulseLayer.append(c);
          setTimeout(() => c.remove(), 1900 + k * 260 + (i % 6) * 60);
        }
      });
    }

    // 大名のハイライト(null で解除)
    highlight(clanId) {
      this.hlClan = clanId || null;
      this.applyHighlight();
    }
    applyHighlight() {
      const on = !!this.hlClan;
      this.svg.classList.toggle('has-hl', on);
      const gp = this.svg.querySelector('.provs');
      const hl = [];
      for (const id in this.paths) {
        const is = on && this.owners[id] === this.hlClan;
        this.paths[id].classList.toggle('hl', is);
        if (is) hl.push(this.paths[id]);
      }
      hl.forEach((p) => gp.append(p));
    }
    select(id) {
      if (this.selected && this.paths[this.selected]) this.paths[this.selected].classList.remove('sel');
      this.selected = id;
      if (id && this.paths[id]) { this.paths[id].classList.add('sel'); this.svg.querySelector('.provs').append(this.paths[id]); }
    }
  }

  SG.SengokuMap = SengokuMap;
})();
