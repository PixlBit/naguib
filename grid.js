/* ════════════════════════════════════════════════════════════════════════
   grid.js — how a row of work is arranged.

   A `hi` project spans the whole grid, so dropped in mid-row it would leave
   empty cells beside it. This holds each banner back until the row of normal
   cards before it is complete, then releases one per row break.

   It lives in its own file because two things need it and they must never
   disagree: studio.js, which builds the real grid, and the work console,
   which previews the arrangement before you commit it. One copy, one
   behaviour.
   ════════════════════════════════════════════════════════════════════════ */
function makeLayout(colsOf){
  return function layout(list, cfg, cat){
    if(!cfg.feat) return list;
    const GRID_COLS = colsOf();
    const out = [];
    let rest = list;
    /* buildCards() renders whatever is first in an unfiltered grid full-bleed,
       whether or not it is the showreel — so row 1 is reserved on the same
       terms. Testing for the showreel id here instead meant that promoting
       anything else to the top produced a banner with two empty cells beside
       it, which is precisely the arrangement the console lets you make.     */
    if(cat === 'all' && list.length){
      out.push(list[0]); rest = list.slice(1);      /* opening banner owns row 1 */
    }
    const held = [];
    let col = 0;
    for(const p of rest){
      if(p.hi){ held.push(p); continue; }
      out.push(p);
      col = (col + 1) % GRID_COLS;
      if(col === 0 && held.length) out.push(held.shift());
    }
    /* Banners still queued (a filtered view can run out of row breaks): never
       let one sit behind a half-filled row, or that row keeps an empty cell.
       Park the stray cards after them so the only short row is the last.    */
    if(held.length && col !== 0){
      const trail = out.splice(out.length - col, col);
      return out.concat(held, trail);
    }
    return out.concat(held);
  };
}
