/* ════════════════════════════════════════════════════════════════════════
   project.js — behaviour for the single-asset pages under /work/.

   A render is a picture, so there is no facade and no player to build: the
   frame is in the markup and it is the fastest thing the page can do. What
   is left is the furniture — the strip of other work loading as it comes
   into view, a full-screen look at the frame, and the keys.

   Escape walks back to the grid, ← / → move between pieces using the
   prev/next links already in the markup.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* studio.css hides the phone dock behind .exp-mobile, and the home page
     sets that class from its engine, which these pages don't load. Only the
     mobile half is wanted — .exp-desktop would hide the cursor and there is
     no custom cursor here to replace it with. */
  if (matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && innerWidth < 900))
    document.body.classList.add('exp-mobile');

  const stage = document.querySelector('.pj-stage');
  if (!stage) return;

  /* ── the strip of other work ─────────────────────────────────────────
     Six cards under the frame, each one a file that already exists. They
     wait for the viewport all the same: a page nobody scrolls should cost
     one image, not seven. */
  const strip = document.querySelectorAll('.mw-thumb[data-poster]');
  if (strip.length) {
    const io = new IntersectionObserver((es, ob) => es.forEach(e => {
      if (!e.isIntersecting) return;
      ob.unobserve(e.target);
      const url = e.target.dataset.poster;
      const probe = new Image();
      probe.onload = () => {
        e.target.style.backgroundImage = 'url(' + url + ')';
        e.target.classList.add('on');
      };
      probe.src = url;
    }), { rootMargin: '300px 0px' });
    strip.forEach(el => io.observe(el));
  }

  /* ── the full frame ──────────────────────────────────────────────────
     The page shows the render at the width of the column. Pressing it puts
     the same file on the whole screen, black around it, and pressing
     anywhere or Escape puts it back. It is the one interaction these pages
     have, so it is built from what is already loaded rather than from a
     second copy of the picture.                                          */
  const img = stage.querySelector('.pj-img');
  const zoom = stage.querySelector('.pj-zoom');
  let full = null;
  function open() {
    if (full || !img) return;
    full = document.createElement('div');
    full.className = 'pj-full';
    full.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="" />' +
                     '<span class="pj-full-x">&#10005; &nbsp;CLOSE</span>';
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
  if (zoom) zoom.addEventListener('click', e => { e.stopPropagation(); open(); });
  if (img) img.addEventListener('click', open);

  /* ── keys ─────────────────────────────────────────────────────────── */
  const prev = document.querySelector('.pn-link:not(.pn-next)');
  const next = document.querySelector('.pn-link.pn-next');
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { if (full) return close(); location.href = '../../#work'; return; }
    if (full) return;                       /* the frame owns the keyboard */
    if (e.key === 'ArrowLeft' && prev) prev.click();
    if (e.key === 'ArrowRight' && next) next.click();
    if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement === document.body) { e.preventDefault(); open(); }
    }
  });
})();
