// 起動とハッシュルーティング: #/year/1582  #/clan/oda  #/person/oda-nobunaga  #/event/honnoji  #/credits
(function () {
  const SG = window.SG;
  const $ = (s) => document.querySelector(s);

  function hero() {
    const rec = SG.imgRec('event:sekigahara') || SG.imgRec('event:nagashino');
    if (rec) {
      const img = new Image();
      const url = SG.imgUrl(rec, 1280);
      img.onload = () => { $('#hero-bg').style.backgroundImage = `url("${url}")`; $('#hero-bg').classList.add('on'); };
      img.src = url;
    }
  }

  function route() {
    const r = SG.parseHash();
    const ex = SG.explorer;
    ex.clearTouch();
    const credits = r.route === 'credits';
    document.body.dataset.view = credits ? 'credits' : 'home';
    $('#home').hidden = credits;
    $('#credits-view').hidden = !credits;
    document.querySelectorAll('.site-nav a').forEach((a) => a.classList.toggle('cur', credits && a.dataset.nav === 'credits'));
    if (credits) { SG.closeSheet(true); SG.initCredits(); window.scrollTo(0, 0); return; }
    if (r.route === 'clan' && SG.clanById[r.id]) {
      if (SG.showClan(r.id)) ex.setHighlight(r.id);
      return;
    }
    if (r.route === 'person' && SG.personById[r.id]) { SG.showPerson(r.id); return; }
    SG.closeSheet(true);
    if (r.route === 'event' && SG.eventById[r.id]) { SG.storyGoto(r.id); return; }
    if (r.route === 'year') {
      const y = parseInt(r.id, 10);
      if (!isNaN(y)) { ex.gotoYear(y, { user: true, silent: true }); }
      ex.setHighlight(null);
      if (!route.first) { route.first = true; } else if (r.id) document.getElementById('map').scrollIntoView({ behavior: SG.reduced ? 'auto' : 'smooth' });
      return;
    }
    if (r.anchor) { const t = document.getElementById(r.anchor); if (t) t.scrollIntoView(); }
  }

  function init() {
    SG.explorer = new SG.Explorer();
    SG.initStory();
    SG.initClanGrid();
    SG.initGallery();
    hero();
    const first = SG.parseHash();
    route.first = first.route !== 'year';
    window.addEventListener('hashchange', route);
    route();
    // ナビの現在地
    const secs = ['map', 'story', 'clans', 'people'].map((id) => document.getElementById(id));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) document.querySelectorAll('.site-nav a').forEach((a) => a.classList.toggle('cur', a.dataset.nav === e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
    document.documentElement.dataset.ready = '1';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
