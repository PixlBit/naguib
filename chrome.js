/* ════════════════════════════════════════════════════════════════════════
   chrome.js — the furniture every page in the workshop shares.

   The cursor, the scroll progress, the nav's stuck state, the reveal
   observer that every animated element on the site waits for, the clock in
   the contact block, and the section tracking that lights the nav.

   Nothing here is a framework and nothing polls. Everything is either an
   IntersectionObserver, a passive scroll listener that writes exactly one
   custom property, or a pointer listener that writes one transform. The
   whole file runs in under a millisecond on a scroll frame.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const FINE   = matchMedia('(pointer:fine)').matches;
  const CALM   = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad    = n => String(n).padStart(2, '0');
  window.CALM  = CALM;

  /* ══ THE REVEAL ════════════════════════════════════════════════════════
     One observer for the whole site. Anything with .rv, .rv-cut, .rv-w or
     .rv-wipe
     gets .in when it arrives, and keeps it — a section that re-animates
     every time you scroll back past it is a section that never settles.

     `observe()` is exported because the grids are built after this runs,
     and a card that appears later still has to be watched.              */
  const revealed = new WeakSet();
  const pending = new Map();          /* observed element → what it reveals */

  const io = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting) continue;
      const list = pending.get(e.target);
      if (list) for (const el of list) el.classList.add('in');
      pending.delete(e.target);
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  /* AN ELEMENT HIDDEN BY clip-path CANNOT SEE ITSELF ARRIVE. The browser
     computes an intersection against the CLIPPED box, and .rv-cut starts at
     inset(0 0 102% 0) — an empty rect, which is never intersecting at any
     threshold. Watching those elements directly meant every section title on
     the site stayed clipped for good. They are watched through their parent
     instead, which has a real box; everything else watches itself. */
  function add(el){
    if (revealed.has(el)) return;
    revealed.add(el);
    const host = el.classList.contains('rv-cut') ? (el.parentElement || el) : el;
    let list = pending.get(host);
    if (!list) { list = []; pending.set(host, list); io.observe(host); }
    list.push(el);
  }
  const watch = root => (root || document)
    .querySelectorAll('.rv,.rv-cut,.rv-w,.rv-wipe,.plate,.step')
    .forEach(add);
  window.reveal = watch;
  watch();

  /* The process steps light one after another rather than together: the
     section is describing a sequence, so it should behave like one. */
  new MutationObserver(() => watch()).observe(document.body, { childList: true, subtree: true });

  /* ══ THE CURSOR ════════════════════════════════════════════════════════
     A warm point that opens into a ring over anything worth a closer look.
     It moves on a transform inside one rAF — the pointer event only stores
     two numbers, so a fast sweep costs one paint, not forty.            */
  const cur = $('#cur');
  if (cur && FINE && !CALM) {
    document.body.classList.add('pointer');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, run = false;
    const frame = () => {
      cx += (x - cx) * 0.22; cy += (y - cy) * 0.22;
      cur.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      if (Math.abs(x - cx) > 0.1 || Math.abs(y - cy) > 0.1) requestAnimationFrame(frame);
      else run = false;
    };
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!run) { run = true; requestAnimationFrame(frame); }
    }, { passive: true });
    addEventListener('pointerdown', () => cur.classList.add('big'));
    addEventListener('pointerup',   () => { if (!cur.dataset.stick) cur.classList.remove('big'); });
    document.addEventListener('mouseleave', () => cur.classList.add('hide'));
    document.addEventListener('mouseenter', () => cur.classList.remove('hide'));

    /* what the ring says depends on what is under it */
    const OPEN = '[data-cur]';
    document.addEventListener('pointerover', e => {
      const t = e.target.closest(OPEN);
      if (!t) return;
      cur.dataset.stick = '1';
      cur.dataset.t = t.dataset.cur || 'View';
      cur.classList.add('big');
    });
    document.addEventListener('pointerout', e => {
      if (!e.target.closest(OPEN)) return;
      delete cur.dataset.stick;
      cur.classList.remove('big');
    });
  }

  /* ══ SCROLL: the progress bar and the nav's shadow ═════════════════════
     Both are read from the same passive listener and written as one
     transform and one class — no layout is forced on a scroll frame.   */
  const prog = $('#prog'), nav = $('#nav');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY;
    if (prog) {
      const h = document.documentElement.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    }
    if (nav) nav.classList.toggle('stuck', y > 40);
    track(y);
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  /* ══ WHICH SECTION AM I IN ═════════════════════════════════════════════
     Scroll position, not intersection ratio: the work section is many
     screens tall, so a percentage-of-self threshold can never fire for it.
     The active section is simply the last one whose top has passed under
     the nav. Offsets are cached and only re-measured when the document
     changes height, so this reads layout once per resize, never per frame. */
  const links = $$('.n-links a[data-sec], #dock a[data-sec]');
  const secs  = $$('section[id]');
  let tops = [], docH = 0;
  function measure() {
    tops = secs.map(s => s.getBoundingClientRect().top + scrollY);
    docH = document.documentElement.scrollHeight;
  }
  let active = null;
  function track(y) {
    if (!secs.length) return;
    if (document.documentElement.scrollHeight !== docH) measure();
    const line = y + 96;
    let now = secs[0];
    for (let i = 0; i < secs.length; i++) if (tops[i] <= line) now = secs[i]; else break;
    if (now === active) return;
    active = now;
    links.forEach(a => a.classList.toggle('on', a.dataset.sec === now.id));
  }
  addEventListener('resize', () => { measure(); onScroll(); }, { passive: true });
  measure(); onScroll();

  /* ══ SMOOTH, OFFSET SCROLLING ══════════════════════════════════════════
     The nav is fixed, so a plain hash jump buries the heading underneath
     it. This lands the section's top just below the bar. */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + scrollY - (id === '#hero' ? 0 : 74);
    scrollTo({ top, behavior: CALM ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ══ HIS CLOCK ═════════════════════════════════════════════════════════
     In the contact block, beside the phone number, because that is where
     the time in Marseille is a fact somebody needs rather than decoration.
     The mark swaps to a moon after six in the evening. */
  (() => {
    const t = $('#nc-time'); if (!t) return;
    const d = $('#nc-day'), orb = $('#nc-orb');
    const TZ = 'Europe/Paris';
    const fT = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    const fH = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
    const fD = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' });
    const tick = () => {
      const now = new Date();
      t.textContent = fT.format(now);
      if (d) d.textContent = fD.format(now) + ' · Marseille';
      const h = +fH.format(now);
      const night = h < 7 || h >= 19;
      if (orb) orb.firstElementChild.setAttribute('href', night ? '#i-moon' : '#i-sun');
    };
    tick(); setInterval(tick, 20000);
  })();
})();
