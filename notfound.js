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

  /* A 24fps timecode used to run here, counting up beside a REC dot, as if
     the page were recording something. It is a failed render, not a take —
     the readout says so once and then holds still. */

  document.body.classList.toggle('exp-mobile',
    matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && innerWidth < 900));
})();
