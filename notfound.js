/* ════════════════════════════════════════════════════════════════════════
   notfound.js — the two live readings on the 404 deck.

   SOURCE shows the path that failed, so a visitor who mistyped can see
   exactly what the deck went looking for. It is printed with textContent,
   never as markup: the path is whatever a stranger put in the address bar
   and must never be able to write HTML into the page.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const path = document.getElementById('nf-path');
  if (path) {
    let where = location.pathname + location.search;
    if (where.length > 64) where = where.slice(0, 61) + '…';
    path.textContent = where || '/';
  }

  /* a second timecode, running at 24fps like the tape it can't find */
  const tc = document.getElementById('nf-tc');
  if (tc) {
    let fr = 0;
    setInterval(() => {
      fr++;
      const f = fr % 24, s = Math.floor(fr / 24) % 60,
            m = Math.floor(fr / 1440) % 60, h = Math.floor(fr / 86400) % 24;
      tc.textContent = [h, m, s, f].map(n => String(n).padStart(2, '0')).join(':');
    }, 1000 / 24);
  }

  document.body.classList.toggle('exp-mobile',
    matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && innerWidth < 900));
})();
