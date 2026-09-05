/* ════════════════════════════════════════════════════════════════════════
   notfound.js — one job.

   Print the path that failed, as TEXT. It is whatever a stranger typed into
   the address bar, so it is written with textContent and never as markup —
   the one line on this page that could otherwise be turned against it.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  const el = document.getElementById('nf-path');
  if (!el) return;
  let where = location.pathname + location.search;
  if (where.length > 68) where = where.slice(0, 65) + '…';
  el.textContent = where || '/';
})();
