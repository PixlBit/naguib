/* ════════════════════════════════════════════════════════════════════════
   project.js — behaviour for one piece's page.

   A render is a picture, so there is no player to build and nothing to wait
   for. What is left is the full-screen look at the frame and the two keys
   that walk to the piece before or after it. chrome.js does the rest — the
   cursor, the progress bar, the nav.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const stage = document.querySelector('.pj-stage');
  if (!stage) return;
  const img = stage.querySelector('.pj-img');

  /* ── the whole screen, black around it ─────────────────────────────────
     Built from the picture the page already has, so opening it costs a
     paint rather than a download. */
  let full = null;
  function open() {
    if (full || !img) return;
    full = document.createElement('div');
    full.className = 'pj-full';
    full.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="" />' +
      '<span class="pj-full-x"><svg class="ic"><use href="#i-close"/></svg>Close</span>';
    full.addEventListener('click', close);
    document.body.appendChild(full);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => full.classList.add('on'));
  }
  function close() {
    if (!full) return;
    full.remove(); full = null;
    document.body.style.overflow = '';
  }
  stage.addEventListener('click', open);

  /* ── keys ──────────────────────────────────────────────────────────── */
  const prev = document.querySelector('.pn-prev');
  const next = document.querySelector('.pn-next');
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { if (full) return close(); location.href = '../../#work'; return; }
    if (full) return;                          /* the frame owns the keyboard */
    if (e.key === 'ArrowLeft'  && prev) prev.click();
    if (e.key === 'ArrowRight' && next) next.click();
    if ((e.key === ' ' || e.key === 'Enter') && document.activeElement === document.body) {
      e.preventDefault(); open();
    }
  });
})();
