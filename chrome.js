/* ════════════════════════════════════════════════════════════════════════
   chrome.js — the furniture every page shares: the Marseille clock in the nav
   and the running timecode.

   It lives apart from studio.js because the project pages and the 404 carry
   the same header and footer but none of the home page's engine, and a
   second copy of a clock is a second clock to keep correct.

   Self-starting, and every element it touches is optional — a page that
   has no clock simply gets no clock.
   ════════════════════════════════════════════════════════════════════════ */
const pad = (n, l = 2) => String(n).padStart(l, '0');

(() => {
  'use strict';

  /* sound.js is not on every page that loads this one — the work console
     wears the same nav and clock and has no sound at all — and a hover must
     never throw because of that. studio.js carries the same stub for the
     same reason: the file that has a voice and the file that uses it are
     allowed to arrive separately, or not at all. */
  window.SFX = window.SFX || { play(){}, scroll(){}, loading(){}, loaded(){},
    get enabled(){ return false; }, get available(){ return false; } };

  /* ── Marseille clock ─────────────────────────────────────────────────── */
  function initClock(){
    const dayEl = document.getElementById('nc-day'), dateEl = document.getElementById('nc-date'),
          timeEl = document.getElementById('nc-time'), orb = document.getElementById('nc-orb');
    if(!timeEl) return;
    const TZ = 'Europe/Paris';
    const fT = new Intl.DateTimeFormat('en-US', {timeZone:TZ, hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true});
    const f24 = new Intl.DateTimeFormat('en-GB', {timeZone:TZ, hour:'2-digit', hour12:false});
    const fD = new Intl.DateTimeFormat('en-GB', {timeZone:TZ, weekday:'long', day:'2-digit', month:'short', year:'numeric'});
    function tick(){
      const now = new Date();
      const t = {}; fT.formatToParts(now).forEach(p => t[p.type] = p.value);
      const d = {}; fD.formatToParts(now).forEach(p => d[p.type] = p.value);
      const h = +f24.format(now).replace(/\D/g, ''), m = +t.minute, s = +t.second;
      timeEl.innerHTML = pad(+t.hour)+'<i>:</i>'+pad(m)+'<i>:</i>'+pad(s)+'<em>'+(t.dayPeriod||'').toUpperCase()+'</em>';
      if(dayEl) dayEl.textContent = (d.weekday||'').toUpperCase();
      if(dateEl) dateEl.textContent = d.day+' '+(d.month||'').toUpperCase()+' '+d.year;
      if(orb) orb.classList.toggle('night', h < 6 || h >= 18);
    }
    tick(); setInterval(tick, 1000);
  }

  /* ── running timecode, 24fps ──────────────────────────────────────── */
  function initTimecode(){
    /* The lightbox used to carry a running timecode too. It shows a still,
       and a timecode counting up over a photograph is a clock pretending to
       be a playhead — so that panel says what the piece actually is now,
       written by studio.js, and this ticker leaves it alone. */
    const nav = document.getElementById('n-tc'), hero = document.getElementById('hero-tc'),
          foot = document.getElementById('ft-tc');
    if(!nav && !hero && !foot) return;
    let fr = 0;
    setInterval(() => {
      /* the frame count still advances — a timecode that stalls while you
         read another tab is a broken timecode — but nothing is written to
         the DOM for a page nobody is looking at */
      if(document.hidden){ fr++; return; }
      fr++;
      const f = fr%24, s = Math.floor(fr/24)%60, m = Math.floor(fr/1440)%60;
      const tc = pad(m)+':'+pad(s)+':'+pad(f);
      if(nav) nav.textContent = tc;
      if(hero) hero.textContent = '00:'+tc;
      if(foot) foot.textContent = 'TC 00:'+tc;
    }, 1000/24);
  }

  /* ── scroll progress bar ──────────────────────────────────────────── */
  function initProgress(){
    const bar = document.getElementById('prog');
    if(!bar) return;
    /* Three mistakes in three lines, and the last one is the expensive one.
       width is a layout property; the handler ran on every scroll EVENT,
       which on a touch screen arrive far faster than frames; and reading
       scrollHeight forces the browser to lay out the entire document before
       it can answer. That third one alone measured at 27% of all CPU during
       a scroll — the profile named this line.

       So the height is measured when it CHANGES, not when it is needed. A
       ResizeObserver on the body catches every reason it would: a lazy
       poster landing, the grid being filtered, a rotation. The scroll path
       is now arithmetic and one composited transform — no layout at all. */
    let span = 0, pending = false;
    const remeasure = () => {
      if(pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        span = document.documentElement.scrollHeight - innerHeight;
      });
    };
    remeasure();
    addEventListener('resize', remeasure, {passive:true});
    if('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);

    let queued = false;
    addEventListener('scroll', () => {
      if(queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        bar.style.transform = 'scaleX(' + (span > 0 ? scrollY/span : 0).toFixed(4) + ')';
      });
    }, {passive:true});
  }

  /* ── the footer's signal bars ──────────────────────────────────────────
     Built here rather than written into every page: the count follows the
     width, so the strip reads the same on a phone as on a 27-inch monitor.
     Colours are the 404 deck's test pattern, and the motion steps rather
     than eases — a level meter glides, a torn signal jumps.              */
  const BAR_HUES = [
    'var(--wh)', 'var(--lm)', 'var(--cy)', '#8fd45c',
    'var(--yw)', '#4bd8c8', 'var(--cy)', 'var(--lm)',
  ];
  function buildBars(){
    const strip = document.querySelector('.ft-bars');
    if(!strip) return;
    const PITCH = 7;                         /* bar + gap, in px */
    const n = Math.max(24, Math.min(220, Math.floor(strip.clientWidth / PITCH)));
    if(+strip.dataset.n === n) return;        /* nothing to redraw */
    strip.dataset.n = n;
    const frag = document.createDocumentFragment();
    for(let k = 0; k < n; k++){
      const bar = document.createElement('i');
      /* deterministic per position, so a resize doesn't reshuffle the whole
         strip — it just adds or removes bars at the end */
      const a = (k * 2654435761) >>> 0;
      bar.style.background = BAR_HUES[(a >>> 3) % BAR_HUES.length];
      bar.style.animationDuration = (0.7 + ((a >>> 7) % 190) / 100) + 's';
      bar.style.animationDelay = '-' + ((a >>> 11) % 300) / 100 + 's';
      if(((a >>> 17) % 9) === 0) bar.className = 'hot';
      frag.appendChild(bar);
    }
    strip.replaceChildren(frag);
  }

  /* ── holding the animation nobody is watching ──────────────────────────
     A browser will not work this out on its own: an animation off screen is
     still an animation, and it asks the compositor for frames all the same.
     Two hundred and five of the home page's were the footer signal strip
     alone, ticking below the fold on every page of the site, and another
     hundred and twenty-five were the sections you had already scrolled past.

     studio.js had this for thirteen hand-tagged elements, which meant it
     covered whatever somebody remembered to tag. It lives here now, where
     every page can use it, and it takes whole sections and the footer
     rather than a list to keep up to date.

     The class pauses descendants, so anything built later — the work cards,
     the footer bars — is covered without rescanning. The margin is wide on
     purpose: a reveal must never be caught half-played, so a section is
     released long before any of it can be seen.                          */
  function initAnimGuards(){
    if(!('IntersectionObserver' in window)) return;
    const zones = document.querySelectorAll('.io-anim, section[id], footer');
    if(!zones.length) return;
    const io = new IntersectionObserver(es => {
      for(const e of es) e.target.classList.toggle('anim-off', !e.isIntersecting);
    }, {rootMargin: '300px'});
    for(const z of zones){ z.classList.add('anim-off'); io.observe(z); }
  }

  /* The glitch system lived here: four fixed layers over the whole page, and
     all four are gone at the client's word.

       #roll  a band of head-switching noise drifting down the screen forever
       #scan  standing scanlines across everything
       #tear  RGB bleed at the edges, tracking scroll velocity through --gi
       #glx   the hard hit — a viewport-sized canvas of painted hairlines and
              two inverted strips, fired when a scroll crossed a threshold

     With them go the requestAnimationFrame velocity pump that fed the last
     two and the matchMedia constants that gated the lot. Nothing is laid over
     the page any more, and --gi is not written, read or defined anywhere.

     What is left is glitch that belongs to one specific thing rather than to
     the whole screen: the portrait's loop, the headline's RGB burst, the
     section titles' reveal, the nav wordmark, and the scanline inside a
     project's video stage. Those are treatments on an element, not a sheet
     laid over the site. */

  /* ══ THE VOICE, ON EVERY PAGE ══════════════════════════════════════════
     This lived in studio.js, which only the home page loads — so a project
     page and the 404 shipped sound.js and then never called it. Silence on
     two thirds of the site. It belongs here with the rest of the furniture.

     The home page still wires its own hovers, because there the sound rides
     along with the custom cursor (see addH in studio.js); everything below
     the wiring — a click on nothing, the scroll, a selection, the farewell —
     belongs to every page and is set up here for all of them. */
  const SMALL = matchMedia('(max-width: 768px)').matches ||
                ('ontouchstart' in window && innerWidth < 900);

  /* what kind of thing is this? The sound is decided by the ELEMENT, not by
     whoever wired it. Most specific claim wins; `ui` is the floor. */
  function kindOf(el){
    if(el.closest('.n-links, .n-logo, #dock, .pj-back, .pn-link, .mw-all')) return 'menu';
    if(el.matches('.wf-btn, .wg-more-btn, .mw-cat'))               return 'chip';
    /* a button that leaves for the film itself is a link, not a call to
       action — everything else shaped like a button is one, on every page.
       Without this the 404's two buttons fell to `ui` while the same two
       classes on the home page were a cta. */
    if(el.matches('.pj-src'))                                      return 'link';
    if(el.matches('.n-cta, .btn-y, .btn-o') || el.closest('.h-ctas, .pj-cta')) return 'cta';
    if(el.matches('.wc, .ai-card, .mw-card, .pj-stage, .pj-play') ||
       el.closest('.wc, .ai-card, .mw-card, .pj-stage'))           return 'card';
    if(el.matches('.sc-card, .cc') || el.closest('.sc-card, .cc')) return 'panel';
    if(el.matches('.cs2, .m-ext, .ab-ig, .ft-big, .pj-src') ||
       el.closest('.cs2, .c-social, footer'))                      return 'link';
    return 'ui';
  }
  window.kindOf = kindOf;                 /* studio.js uses the same judgement */

  const goesAway = el => {
    const a = el.closest('a');
    return !!(a && a.target === '_blank' && /^https?:/i.test(a.getAttribute('href') || ''));
  };
  window.goesAway = goesAway;

  /* one element, its own voice — and never claimed twice */
  function wire(el){
    if(SMALL || el.__sfx) return;
    el.__sfx = 1;
    const kind = kindOf(el), away = goesAway(el);
    el.addEventListener('mouseenter', () => {
      if(kind === 'card'){
        const y = el.getBoundingClientRect().top / Math.max(1, innerHeight);
        SFX.play('hover.card', Math.min(1, Math.max(0, y)));
      } else SFX.play('hover.' + kind);
    });
    el.addEventListener('click', () =>
      SFX.play(el.dataset.sfx || (away ? 'away' : 'tap.' + kind)));
  }
  const WIRED = 'a,button,.sc-card,.cc,.wf-btn,.mw-card,.mw-cat,.pj-stage,.pj-play';
  window.wireSound = root => (root || document).querySelectorAll(WIRED).forEach(wire);

  /* A click that lands on nothing is still a click, and a surface that
     answers every button but goes dead in the gap between them reads as
     broken rather than restrained. It steps aside for anything already
     spoken for, and for the click that ends a text selection. */
  function initVoidClick(){
    if(SMALL) return;
    document.addEventListener('click', e => {
      for(let n = e.target; n && n !== document; n = n.parentNode)
        if(n.__sfx) return;
      if(e.target.closest &&
         e.target.closest('a,button,input,textarea,select,label,[role="button"],#modal'))
        return;
      if(String(getSelection() || '').trim().length > 1) return;
      SFX.play('tap.void');
    });
  }

  /* The wheel fires dozens of times a second, so this hands SFX a speed and
     lets the bed there follow it. 3px per millisecond is about as fast as a
     page ever moves, so that is the top of the scale. */
  function initScrollSound(){
    if(SMALL) return;
    let lastY = scrollY, lastT = performance.now();
    addEventListener('scroll', () => {
      const y = scrollY, t = performance.now();
      const dy = y - lastY, dt = Math.max(16, t - lastT);
      lastY = y; lastT = t;
      if(!dy) return;
      SFX.scroll(Math.abs(dy) / dt / 3, dy > 0 ? 1 : -1);
      const bottom = document.documentElement.scrollHeight - innerHeight;
      if(y <= 0 || y >= bottom - 1) SFX.play('edge');
    }, {passive:true});
  }

  /* Marking text is the only interaction on the page that leaves no visible
     control behind. On the release, and only when what is selected is both
     non-empty and different from before. */
  function initSelectSound(){
    if(SMALL) return;
    let lastSel = '';
    const check = () => {
      const sel = String(getSelection() || '').trim();
      if(sel.length > 1 && sel !== lastSel) SFX.play('select');
      lastSel = sel;
    };
    document.addEventListener('mouseup', () => setTimeout(check, 0));
    document.addEventListener('keyup', e => { if(e.shiftKey || e.key === 'a') check(); });
  }

  /* A tab that is actually closing cannot make a sound — the page is torn
     down first, in every browser, deliberately. So the farewell answers the
     two moments of leaving that happen while the page is still alive. */
  function initByeSound(){
    if(SMALL) return;
    document.addEventListener('mouseout', e => {
      if(e.relatedTarget) return;
      if(e.clientY > 24) return;
      SFX.play('bye');
    });
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) SFX.play('bye');
    });
  }

  const go = () => {
    initClock(); initTimecode(); initProgress();
    buildBars(); initAnimGuards();
    initVoidClick(); initScrollSound(); initSelectSound(); initByeSound();
    let t = null;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(buildBars, 200); }, {passive:true});
    /* The home page wires its own — with the cursor — and BOOT does it after
       its grids exist. Everywhere else, this is the only wiring there is.
       DOMContentLoaded, not now: deferred scripts run before it, so studio.js
       has been parsed by the time this asks whether it is there. */
    document.addEventListener('DOMContentLoaded', () => {
      if(typeof window.BUILD !== 'function') window.wireSound(document);
    });
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
