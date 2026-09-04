/* ════════════════════════════════════════════════════════════════════════
   studio-admin.js — the work console.

   The site is static: there is no server to save to. So this reads the real
   studio.js over the network, edits the data in memory, and writes back a
   studio.js with only those blocks rewritten — everything else byte for byte
   as it was.

   Publishing goes through GitHub's contents API with a fine-grained key kept
   in this browser and nowhere else, and the push is all it takes: Cloudflare
   rebuilds the site, the build workflow regenerates the project pages. The
   page is behind HTTP Basic auth at the edge, so nobody who is not you ever
   receives a byte of it — see functions/_middleware.js.

   Nine blocks are owned by this page: PROJECTS, CAT, CAT_RANK, AUTO_ORDER,
   ARCHIVE, ACAT, AI_REELS, HERO_VIDEO and SHOWREEL_ID. It also writes two
   kinds of image into the repository — reel covers and the portrait —
   which are scaled and re-encoded here before they are sent, and always
   uploaded BEFORE the code that names them.

   CHECK runs makeLayout() from grid.js — the very function the site builds
   its grid with, not a copy — so what it says about the last row is what the
   site will actually do, including the rule that a full-width banner waits
   for the row of cards before it to finish.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* studio.css hides the nav links and shows the phone dock behind
     .exp-mobile; only the mobile half is wanted, since .exp-desktop hides the
     cursor and a console needs one. */
  if (matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && innerWidth < 900))
    document.body.classList.add('exp-mobile');

  const $ = s => document.querySelector(s);
  const state = $('#state');
  const say = (msg, kind) => { state.textContent = msg; state.className = 'ad-state' + (kind ? ' ' + kind : ''); };

  let SRC = '';                       /* the untouched studio.js text */
  let IDX = '';                       /* index.html, for the hero film's src */
  let D = null;                       /* the working copy of the data */
  let ORIGINAL = '';                  /* JSON snapshot, to detect real changes */

  /* ── reading studio.js ─────────────────────────────────────────────── */

  /* find `const NAME = <literal>;` and return the literal's bounds */
  function blockOf(src, name) {
    const m = new RegExp('^const ' + name + '\\s*=\\s*', 'm').exec(src);
    if (!m) throw new Error(name + ' not found in studio.js');
    let i = m.index + m[0].length;
    const openCh = src[i];
    if (openCh !== '[' && openCh !== '{') {           /* a bare value, to the ; */
      const end = src.indexOf(';', i);
      return { head: m.index, start: i, end, name };
    }
    const closeCh = openCh === '[' ? ']' : '}';
    let depth = 0, str = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
      if (c === '"' || c === "'" || c === '`') { str = c; continue; }
      if (c === openCh) depth++;
      else if (c === closeCh && --depth === 0)
        return { head: m.index, start: m.index + m[0].length, end: i + 1, name };
    }
    throw new Error('unterminated ' + name);
  }
  /* Parse the literal rather than eval it. `new Function` is exactly what a
     Content-Security-Policy without 'unsafe-eval' is there to stop, and the
     policy is worth more than the shortcut — so this reads the small, regular
     subset of JS these four blocks are written in: strings, numbers, booleans,
     arrays, and objects with bare or quoted keys. Trailing commas welcome. */
  function parse(text) {
    let i = 0;
    const err = m => { throw new Error(m + ' at character ' + i + ' of the literal'); };
    const ws = () => {
      for (;;) {
        while (i < text.length && /\s/.test(text[i])) i++;
        if (text[i] === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
        if (text[i] === '/' && text[i + 1] === '*') { i = text.indexOf('*/', i) + 2; continue; }
        return;
      }
    };
    function str() {
      const q = text[i++];
      let out = '';
      while (i < text.length && text[i] !== q) {
        if (text[i] !== '\\') { out += text[i++]; continue; }
        i++;
        const e = text[i++];
        if (e === 'u') { out += String.fromCharCode(parseInt(text.substr(i, 4), 16)); i += 4; }
        else if (e === 'n') out += '\n';
        else if (e === 't') out += '\t';
        else if (e === 'r') out += '\r';
        else out += e;
      }
      i++;
      return out;
    }
    function value() {
      ws();
      const c = text[i];
      if (c === '"' || c === "'" || c === '`') return str();
      if (c === '[') {
        i++; const arr = [];
        for (;;) {
          ws();
          if (text[i] === ']') { i++; return arr; }
          arr.push(value());
          ws();
          if (text[i] === ',') i++;
          else if (text[i] === ']') { i++; return arr; }
          else err('expected , or ]');
        }
      }
      if (c === '{') {
        i++; const obj = {};
        for (;;) {
          ws();
          if (text[i] === '}') { i++; return obj; }
          const k = (text[i] === '"' || text[i] === "'") ? str()
            : (() => { const s0 = i; while (i < text.length && /[\w$]/.test(text[i])) i++;
                       if (i === s0) err('expected a key'); return text.slice(s0, i); })();
          ws();
          if (text[i] !== ':') err('expected :');
          i++;
          obj[k] = value();
          ws();
          if (text[i] === ',') i++;
          else if (text[i] === '}') { i++; return obj; }
          else err('expected , or }');
        }
      }
      if (text.startsWith('true', i)) { i += 4; return true; }
      if (text.startsWith('false', i)) { i += 5; return false; }
      if (text.startsWith('null', i)) { i += 4; return null; }
      const s0 = i;
      while (i < text.length && /[-+0-9.eE]/.test(text[i])) i++;
      if (i === s0) err('unexpected ' + JSON.stringify(text[i] || 'end'));
      return Number(text.slice(s0, i));
    }
    return value();
  }

  const literal = (src, name) => {
    const b = blockOf(src, name);
    return parse(src.slice(b.start, b.end));
  };
  /* blockOf already handles a bare value — it stops at the semicolon — so a
     quoted id comes back with its quotes still on. */
  const bare = (src, name) => {
    const b = blockOf(src, name);
    return src.slice(b.start, b.end).trim().replace(/^['"]|['"]$/g, '');
  };

  async function load() {
    say('reading studio.js…');
    const res = await fetch('studio.js?t=' + Date.now());
    if (!res.ok) throw new Error('studio.js came back ' + res.status);
    SRC = await res.text();
    /* index.html carries the hero film's src in its markup so the film needs
       no script to play. That means this page owns a line in a second file,
       and it reads it here so publishing can keep the two in step. Failing to
       fetch it is not fatal: studio.js still repoints the iframe at runtime,
       so the worst case is the old behaviour rather than a broken hero. */
    IDX = '';
    try {
      const r2 = await fetch('index.html?t=' + Date.now());
      if (r2.ok) IDX = await r2.text();
    } catch {}
    D = {
      projects: literal(SRC, 'PROJECTS'),
      cat: literal(SRC, 'CAT'),
      rank: literal(SRC, 'CAT_RANK'),
      auto: literal(SRC, 'AUTO_ORDER'),
      /* the vault and the reels are lists like PROJECTS, owned the same way */
      archive: literal(SRC, 'ARCHIVE'),
      acat: literal(SRC, 'ACAT'),
      reels: literal(SRC, 'AI_REELS'),
      /* two bare ids, quoted rather than bracketed */
      hero: bare(SRC, 'HERO_VIDEO'),
      showreel: bare(SRC, 'SHOWREEL_ID'),
      renamed: {},          /* old category key → the key it became */
    };
    /* the array in the file is in source order; the site sorts it on load, so
       sort here too or the console would show an order nobody ever sees */
    if (D.auto) D.projects = autoSort(D.projects);
    ORIGINAL = snapshot();
    say('studio.js loaded · ' + D.projects.length + ' projects', 'ok');
  }

  /* Anything not in here is invisible to the dirty check, which means an
     edit to it would never enable the save button. */
  const snapshot = () => JSON.stringify(
    [D.projects, D.cat, D.rank, D.auto, D.archive, D.acat, D.reels, D.hero, D.showreel, covers()]);
  const dirty = () => snapshot() !== ORIGINAL;

  /* ── what actually changed ────────────────────────────────────────────
     A count is not an answer to "what am I about to publish". This walks the
     loaded file against the working copy and says it in words. A renamed
     category key drags every project using it along, so those are folded
     into the one rename line rather than repeated per project.          */
  const q = t => '\u201c' + t + '\u201d';
  function changes(){
    const [wasP, wasC, wasR, wasA] = JSON.parse(ORIGINAL);
    const out = [];
    const label = k => D.cat[k] || wasC[k] || k;
    const nowKey = k => D.renamed[k] || k;      /* follow a rename */

    /* categories */
    for(const k of Object.keys(wasC)){
      if(k === 'all') continue;
      const to = nowKey(k);
      if(to !== k) out.push(['~', 'Category ' + q(k) + ' renamed to ' + q(to)]);
      else if(!(k in D.cat)) out.push(['\u2212', 'Category ' + q(wasC[k]) + ' removed']);
      else if(D.cat[k] !== wasC[k]) out.push(['~', 'Category label ' + q(wasC[k]) + ' \u2192 ' + q(D.cat[k])]);
    }
    const renamedTo = new Set(Object.values(D.renamed));
    for(const k of Object.keys(D.cat))
      if(k !== 'all' && !(k in wasC) && !renamedTo.has(k))
        out.push(['+', 'Category ' + q(D.cat[k]) + ' added']);
    const rankBefore = Object.keys(wasC).filter(k => k !== 'all')
      .sort((a,b) => (wasR[a] ?? 99) - (wasR[b] ?? 99)).map(nowKey).join(',');
    const rankNow = Object.keys(D.cat).filter(k => k !== 'all')
      .sort((a,b) => (D.rank[a] ?? 99) - (D.rank[b] ?? 99)).join(',');
    if(rankBefore !== rankNow && out.every(r => !/reordered/.test(r[1])))
      out.push(['~', 'Category order changed']);

    /* projects */
    const before = new Map(wasP.map(p => [p.id, p]));
    const now = new Set(D.projects.map(p => p.id));
    for(const p of wasP) if(!now.has(p.id)) out.push(['\u2212', 'Removed ' + q(p.title)]);
    for(const p of D.projects){
      const was = before.get(p.id);
      if(!was){ out.push(['+', 'Added ' + q(p.title)]); continue; }
      if(was.title !== p.title) out.push(['~', 'Renamed ' + q(was.title) + ' \u2192 ' + q(p.title)]);
      if(nowKey(was.cat) !== p.cat)
        out.push(['~', q(p.title) + ' moved to ' + label(p.cat)]);
      if((was.year || '') !== (p.year || ''))
        out.push(['~', q(p.title) + ' year ' + (was.year || '\u2014') + ' \u2192 ' + (p.year || '\u2014')]);
      if(!!was.hi !== !!p.hi)
        out.push(['~', q(p.title) + ' is now ' + (p.hi ? 'full width' : 'a card')]);
    }

    /* the vault */
    const [ , , , , wasArch, wasAcat, wasReels, wasHero, wasShow ] = JSON.parse(ORIGINAL);
    const aBefore = new Map((wasArch || []).map(p => [p.id, p]));
    const aNow = new Set(D.archive.map(p => p.id));
    for (const p of (wasArch || [])) if (!aNow.has(p.id)) out.push(['\u2212', 'Vault: removed ' + q(p.title)]);
    for (const p of D.archive) {
      const was = aBefore.get(p.id);
      if (!was) { out.push(['+', 'Vault: added ' + q(p.title)]); continue; }
      if (was.title !== p.title) out.push(['~', 'Vault: renamed ' + q(was.title) + ' \u2192 ' + q(p.title)]);
      if (was.cat !== p.cat) out.push(['~', 'Vault: ' + q(p.title) + ' moved to ' + (D.acat[p.cat] || p.cat)]);
    }
    if (JSON.stringify(wasAcat) !== JSON.stringify(D.acat)) out.push(['~', 'Vault categories changed']);

    /* the reels */
    const rBefore = new Map((wasReels || []).map(r => [r.id, r]));
    const rNow = new Set(D.reels.map(r => r.id));
    for (const r of (wasReels || [])) if (!rNow.has(r.id)) out.push(['\u2212', 'Reel ' + q(r.id) + ' removed']);
    for (const r of D.reels) {
      const was = rBefore.get(r.id);
      if (!was) { out.push(['+', 'Reel ' + q(r.id) + ' added']); continue; }
      if ((was.t || '') !== (r.t || '')) out.push(['~', 'Reel ' + q(r.id) + ' titled ' + q(r.t || '\u2014')]);
      if (!!was.cover !== !!r.cover) out.push(['~', 'Reel ' + q(r.id) + (r.cover ? ' got a cover' : ' lost its cover')]);
    }

    /* the two films and the portrait */
    if (wasHero !== D.hero) out.push(['~', 'Hero video \u2192 vimeo.com/' + D.hero]);
    if (wasShow !== D.showreel) out.push(['~', 'Showreel \u2192 vimeo.com/' + D.showreel]);
    for (const path of covers())
      out.push(['+', path === PORTRAIT ? 'New portrait uploaded' : 'Cover uploaded: ' + path.split('/').pop()]);

    /* arrangement */
    if(wasA !== D.auto)
      out.push(['~', D.auto ? 'Order set back to automatic' : 'Order set by hand']);
    else if(!D.auto && wasP.map(p => p.id).join() !== D.projects.map(p => p.id).join())
      out.push(['~', 'Projects rearranged']);
    return out;
  }

  function autoSort(list) {
    return [...list].sort((a, b) => {
      if (a.id === D.showreel) return -1;
      if (b.id === D.showreel) return 1;
      const r = (D.rank[a.cat] ?? 99) - (D.rank[b.cat] ?? 99);
      if (r) return r;
      const na = /^\d+$/.test(a.id) ? +a.id : -1, nb = /^\d+$/.test(b.id) ? +b.id : -1;
      return nb - na;
    });
  }

  /* ── writing studio.js ─────────────────────────────────────────────── */

  /* keep the file ASCII the way it already is: Arabic goes back as escapes */
  function jsStr(s) {
    let out = '"';
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (ch === '"') out += '\\"';
      else if (ch === '\\') out += '\\\\';
      else if (c < 0x20 || c > 0x7e) {
        for (let k = 0; k < ch.length; k++)
          out += '\\u' + ch.charCodeAt(k).toString(16).padStart(4, '0');
      } else out += ch;
    }
    return out + '"';
  }
  /* The order here is the order in the file, so a project reads the way it
     is thought about: what it is, where it lives, how it is filed, how it is
     shown — and what belongs to it, last. */
  const KEYS = ['title', 'id', 'cat', 'year', 'hi', 'yt', 'ig', 'x',
                'slug', 'desc', 'client', 'role', 'studio', 'facts', 'bts'];
  /* An array or an object is written as JSON — `bts` is the only one so far,
     and a list of videos has no business being hand-formatted. */
  const emitVal = v => (typeof v === 'boolean' ? String(v)
    : typeof v === 'object' ? JSON.stringify(v) : jsStr(v));
  const empty = v => v === undefined || v === '' || v === false
    || (Array.isArray(v) && !v.length);

  function emitProjects() {
    const rows = D.projects.map(p => {
      const bits = [];
      for (const k of KEYS) {
        if (empty(p[k])) continue;
        bits.push(k + ':' + emitVal(p[k]));
      }
      /* anything this console does not know about survives untouched */
      for (const k in p) if (!KEYS.includes(k)) bits.push(k + ':' + JSON.stringify(p[k]));
      return '  {' + bits.join(', ') + '},';
    });
    return '[\n' + rows.join('\n') + '\n]';
  }
  const emitCat = () =>
    '{' + Object.entries(D.cat).map(([k, v]) => k + ':' + jsStr(v)).join(',') + '}';
  const emitRank = () =>
    '{' + Object.entries(D.rank).map(([k, v]) => k + ':' + v).join(', ') + '}';

  const emitList = (rows, keys) => '[\n' + rows.map(p => {
    const bits = [];
    for (const k of keys) {
      if (empty(p[k])) continue;
      bits.push(k + ':' + emitVal(p[k]));
    }
    for (const k in p) if (!keys.includes(k)) bits.push(k + ':' + JSON.stringify(p[k]));
    return '  {' + bits.join(', ') + '},';
  }).join('\n') + '\n]';

  function buildFile() {
    /* replace back-to-front so earlier offsets stay valid */
    const edits = [
      ['PROJECTS', emitProjects()],
      ['CAT', emitCat()],
      ['CAT_RANK', emitRank()],
      ['AUTO_ORDER', String(D.auto)],
      ['ARCHIVE', emitList(D.archive, KEYS)],
      ['ACAT', '{' + Object.entries(D.acat).map(([k, v]) => k + ':' + jsStr(v)).join(',') + '}'],
      ['AI_REELS', emitList(D.reels, ['title', 'id', 'yt', 'ig', 'x', 'cover'])],
      ['HERO_VIDEO', "'" + D.hero + "'"],
      ['SHOWREEL_ID', "'" + D.showreel + "'"],
    ].map(([name, text]) => ({ ...blockOf(SRC, name), text }))
      .sort((a, b) => b.start - a.start);
    let out = SRC;
    for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    return out;
  }

  /* ── posters ───────────────────────────────────────────────────────────
     A video shows up twice — once in the grid preview, once in its row — and
     more if it moves. One oEmbed lookup per video serves all of them.      */
  const posters = new Map();                 /* id → url, or null if none    */
  const waiting = new Map();                 /* id → elements still expecting */
  function thumb(el, p) {
    if (p.ig || p.x) return;             /* neither publishes a poster */
    if (posters.has(p.id)) {
      const u = posters.get(p.id);
      if (u) el.style.backgroundImage = 'url(' + u + ')';
      return;
    }
    if (waiting.has(p.id)) { waiting.get(p.id).push(el); return; }
    waiting.set(p.id, [el]);
    const done = u => {
      posters.set(p.id, u);
      if (u) for (const n of waiting.get(p.id)) n.style.backgroundImage = 'url(' + u + ')';
      waiting.delete(p.id);
    };
    if (p.yt) return done('https://i.ytimg.com/vi/' + p.id + '/mqdefault.jpg');
    if (!/^\d+$/.test(p.id)) return done(null);
    fetch('https://vimeo.com/api/oembed.json?url=https://vimeo.com/' + p.id + '&width=295')
      .then(r => r.ok ? r.json() : null)
      .then(d => done(d && d.thumbnail_url ? d.thumbnail_url : null))
      .catch(() => done(null));
  }

  /* ── how the grid will come out ────────────────────────────────────────
     There used to be a picture here: three columns of 32px-tall thumbnails
     standing in for the live grid. At that height a frame is a smear, and
     every poster the browser could not fetch left a blank box next to the
     ones it could — so it read as broken whether or not it was right, and a
     preview you cannot trust is worse than none.

     What it was genuinely for survives as a sentence in CHECK. This runs the
     site's own makeLayout — grid.js, the same function index.html builds the
     grid with, not a copy of it — and reports where the tiles land. Words
     can say "one short" exactly; a smear could only hint at it.            */
  let layout = null;
  function gridShape() {
    if (typeof makeLayout !== 'function') return null;
    if (!layout) layout = makeLayout(() => 3);
    const laid = layout(D.projects, { feat: true }, 'all');
    /* buildCards() features index 0 of the unfiltered grid whatever it is,
       plus every hi — mirror exactly that, not "is it the showreel" */
    let open = false, col = 0, holes = 0;
    laid.forEach((p, i) => {
      if (i === 0 || p.hi) {                    /* a banner takes a row alone */
        if (open && col) holes += 3 - col;
        open = false; col = 0;
        return;
      }
      if (!open || col === 3) { open = true; col = 0; }
      col++;
      if (col === 3) open = false;
    });
    return { holes, last: col === 0 ? 3 : col, tiles: laid.length };
  }

  /* ── project rows ──────────────────────────────────────────────────── */
  const isAR = s => /[؀-ۿ]/.test(s);
  const tpl = $('#row-tpl');

  const WORK_CTX = { get list(){ return D.projects; }, get cats(){ return D.cat; },
                     redraw: () => drawProjects(), manual: true };
  const VAULT_CTX = { get list(){ return D.archive; }, get cats(){ return D.acat; },
                      redraw: () => drawArchive(), manual: false };

  function drawProjects() {
    const ol = $('#plist');
    ol.innerHTML = '';
    D.projects.forEach((p, i) => ol.appendChild(projectRow(p, i, WORK_CTX)));
    $('#n-proj').textContent = D.projects.length;
    const os = $('#order-state');
    os.className = 'ad-order ' + (D.auto ? 'auto' : 'manual');
    os.innerHTML = D.auto
      ? 'ORDER: <b>AUTOMATIC</b> — by category, then newest first'
      : 'ORDER: <b>MANUAL</b> — exactly as listed below';
    markDirty();
  }

  /* One row, two lists. The vault is the same shape as the live grid — the
     same fields, the same shapes, the same drag — so it gets the same row
     rather than a near-copy that drifts. `ctx` says which list this row
     belongs to and how to redraw it. */
  function projectRow(p, i, ctx) {
    const list = ctx.list, cats = ctx.cats, redraw = ctx.redraw;
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.i = i;
    li.classList.toggle('banner', !!p.hi);
    li.querySelector('.ad-idx').textContent = String(i + 1).padStart(2, '0');
    thumb(li.querySelector('.ad-thumb'), p);

    const t = li.querySelector('.ad-title');
    t.value = p.title;
    t.classList.toggle('ar', isAR(p.title));
    t.addEventListener('input', () => {
      p.title = t.value;
      t.classList.toggle('ar', isAR(t.value));
      /* NOT manual(): the automatic sort goes by category then Vimeo id, so a
         title has no bearing on it. Calling it here switched the whole site to
         hand-ordering because someone fixed a typo. */
      markDirty();
    });

    const sel = li.querySelector('.ad-cat');
    for (const k of Object.keys(cats)) {
      if (k === 'all') continue;
      sel.appendChild(new Option(cats[k], k, false, k === p.cat));
    }
    if (!cats[p.cat]) sel.appendChild(new Option(p.cat + ' (unknown)', p.cat, false, true));
    sel.addEventListener('change', () => { p.cat = sel.value; markDirty(); });

    const y = li.querySelector('.ad-year');
    y.value = p.year || '';
    y.addEventListener('input', () => { p.year = y.value.trim(); markDirty(); });

    /* ── where the video lives, and which video it is ────────────────────
       The id used to be a label you could read and not change, which meant
       fixing a wrong link was a delete and a re-add — losing the title, the
       category, the year, the order and anything attached to it. Both are
       fields now: change the host and the row keeps everything but its
       address; paste a different link over it and the row becomes that
       video, still in its place in the grid. */
    const host = li.querySelector('.ad-host');
    for (const [k, label] of HOSTS)
      host.appendChild(new Option(label, k, false, k === hostOf(p)));

    const vid = li.querySelector('.ad-vid');
    const showVid = () => { vid.value = p.id; vid.classList.remove('bad'); };
    showVid();

    host.addEventListener('change', () => {
      setHost(p, host.value);
      posters.delete(p.id);                 /* a different host, a different poster */
      redraw();
    });

    vid.addEventListener('change', () => {
      const raw = vid.value.trim();
      if (!raw || raw === p.id) return showVid();
      const got = videoFrom(raw, hostOf(p));
      if (!got) { showVid(); return say('that is not a video link — nothing changed', 'err'); }
      if (list.some(x => x !== p && x.id === got.id)) {
        showVid();
        return say('that video is already in this list — nothing changed', 'err');
      }
      p.id = got.id;
      setHost(p, got.yt ? 'yt' : got.ig ? 'ig' : got.x ? 'x' : 'vimeo');
      redraw();
      say('row now points at ' + hostOf(p).toUpperCase() + ' ' + p.id, 'ok');
    });

    /* ── everything else about this project ────────────────────────────
       Only the live grid has project pages, so only the live grid has any
       of this: a vault entry has nowhere to show a brief or a making-of. */
    const moreBtn = li.querySelector('.ad-more');
    const detBox = li.querySelector('.ad-det');
    if (!ctx.manual) { moreBtn.remove(); detBox.remove(); }
    else {
      markMore(moreBtn, p);
      moreBtn.addEventListener('click', () => {
        const open = detBox.hasAttribute('hidden');
        detBox.toggleAttribute('hidden', !open);
        moreBtn.setAttribute('aria-expanded', String(open));
        li.classList.toggle('open', open);
        if (open) drawDetails(detBox, p, li);
      });
    }

    li.querySelectorAll('.ad-seg').forEach(b => {
      b.classList.toggle('on', b.dataset.shape === (p.hi ? 'hi' : 'card'));
      b.addEventListener('click', () => {
        p.hi = b.dataset.shape === 'hi';
        if (!p.hi) delete p.hi;
        redraw();
      });
    });

    const del = li.querySelector('.ad-del');
    del.setAttribute('aria-label', 'Remove ' + p.title);
    del.addEventListener('click', () => {
      if (!confirm('Remove "' + p.title + '" from the ' + (ctx.manual ? 'grid' : 'vault') +
        '?\n\nThe video stays where it is on Vimeo — this only takes it off the site.')) return;
      list.splice(i, 1);
      redraw();
      say('removed “' + p.title + '” — press DISCARD to bring it back', 'ok');
    });

    wireDrag(li, (from, to) => {
      if (from === to) return;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      if (ctx.manual) manual();
      redraw();
    });
    return li;
  }

  /* ══ EVERYTHING ELSE ABOUT ONE PROJECT ═══════════════════════════════
     The row holds what the GRID needs: a title, a category, a year, a
     shape, a video. This holds what the PAGE needs — and every field is
     optional, because the page has always worked these out from the title
     and a project with nothing filled in must go on reading exactly as it
     does today. So each field shows the automatic answer as its
     placeholder: you are never guessing what you are overriding.

     These defaults are the generator's, mirrored — tools/build-project-
     pages.mjs is the one that renders them, and a test holds the two in
     step rather than trusting them to stay that way.                    */
  const DEFAULTS = { role: 'Post-Production Lead', studio: 'Direct Group · Riyadh' };
  const autoClient = title => {
    const m = /^(.+?)\s*[—–-]\s*/.exec(String(title || ''));
    return m && m[1].length <= 34 ? m[1].trim() : '';
  };
  const autoSlug = p => {
    if (p.slug) return p.slug;
    const s = String(p.title || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || 'project-' + p.id;
  };
  /* The sentence the page writes when the brief is left empty. This is the
     generator's describe(), mirrored so the placeholder can show exactly
     what will be published — and console4.cjs compares the two against a
     real generated page, so a change to one that is not made to the other
     fails rather than drifts. */
  function autoDesc(p) {
    const cat = String(D.cat[p.cat] || p.cat).toLowerCase();
    const ar = ' أحمد غنيم · الرياض.';
    const one = cat.replace(/s$/, '');
    const kind = one === 'film' || one === 'showreel' ? 'A ' + one
      : /^[aeiou]/.test(one) ? 'An ' + one + ' film' : 'A ' + one + ' film';
    const head = isAR(p.title)
      ? kind + (p.year ? ', ' + p.year : '') + '.'
      : p.title + ' — ' + cat + (p.year ? ', ' + p.year : '') + '.';
    const c = isAR(p.title) ? null : autoClient(p.title);
    const by = c ? 'Post-production for ' + c + ' by Ahmed Gonaim, Riyadh.'
                 : 'Post-production by Ahmed Gonaim, Riyadh.';
    const out = head + ' ' + by + ' Editing, motion, VFX, colour.' + ar;
    return out.length > 158 ? head + ' ' + by + ar : out;
  }

  /* what the button says before it is opened: how much is written here */
  const written = p => (p.desc ? 1 : 0) + (p.client ? 1 : 0) + (p.role ? 1 : 0)
    + (p.studio ? 1 : 0) + (p.slug ? 1 : 0)
    + (Array.isArray(p.facts) ? p.facts.length : 0)
    + (Array.isArray(p.bts) ? p.bts.length : 0);
  function markMore(btn, p) {
    if (!btn) return;
    const n = written(p);
    const films = Array.isArray(p.bts) ? p.bts.length : 0;
    btn.querySelector('i').textContent = films ? String(films) : n ? '·' : '';
    btn.classList.toggle('has', n > 0);
    btn.title = n ? 'Written by hand: ' + n + ' of the details on this page'
                  : 'Nothing written yet — the page works it all out from the title';
  }

  function drawDetails(box, p, li) {
    box.innerHTML = '';
    const refresh = () => { markMore(li.querySelector('.ad-more'), p); markDirty(); };

    const section = (label, note) => {
      const head = document.createElement('div');
      head.className = 'ad-bts-h';
      const l = document.createElement('span');
      l.textContent = label;
      const n = document.createElement('em');
      n.textContent = note;
      head.append(l, n);
      box.appendChild(head);
    };

    /* ── the brief ──────────────────────────────────────────────────── */
    section('// BRIEF', 'the paragraph under the film, and what Google shows');
    const ta = document.createElement('textarea');
    ta.className = 'ad-desc';
    ta.rows = 3;
    ta.value = p.desc || '';
    ta.placeholder = 'Left empty, the page writes: ' + autoDesc(p);
    ta.setAttribute('aria-label', 'Description');
    ta.classList.toggle('ar', isAR(ta.value));
    const count = document.createElement('span');
    count.className = 'ad-count-n';
    const tell = () => {
      const n = (p.desc || '').length;
      count.textContent = n ? n + ' characters' + (n > 160
        ? ' · the page shows all of it, Google shows the first 160' : '') : '';
    };
    ta.addEventListener('input', () => {
      p.desc = ta.value;
      if (!p.desc) delete p.desc;
      ta.classList.toggle('ar', isAR(ta.value));
      tell(); refresh();
    });
    tell();
    box.append(ta, count);

    /* ── the facts list ─────────────────────────────────────────────── */
    section('// FACTS', 'the list beside the brief');
    const grid = document.createElement('div');
    grid.className = 'ad-facts';
    const field = (key, label, auto) => {
      const wrap = document.createElement('label');
      wrap.className = 'ad-field';
      const l = document.createElement('span');
      l.textContent = label;
      const i = document.createElement('input');
      i.value = p[key] || '';
      i.placeholder = auto || '—';
      i.spellcheck = false;
      i.addEventListener('input', () => {
        p[key] = i.value.trim();
        if (!p[key]) delete p[key];
        refresh();
      });
      wrap.append(l, i);
      grid.appendChild(wrap);
    };
    field('client', 'CLIENT', autoClient(p.title) || 'none');
    field('role', 'ROLE', DEFAULTS.role);
    field('studio', 'STUDIO', DEFAULTS.studio);
    field('slug', 'WEB ADDRESS', autoSlug(p));
    box.appendChild(grid);

    /* anything else he wants on that list */
    if (!Array.isArray(p.facts)) p.facts = [];
    const extra = document.createElement('div');
    extra.className = 'ad-facts extra';
    p.facts.forEach((f, i) => {
      const wrap = document.createElement('label');
      wrap.className = 'ad-field pair';
      const k = document.createElement('input');
      k.className = 'ad-fact-k';
      k.value = f.k || '';
      k.placeholder = 'DIRECTOR';
      k.addEventListener('input', () => { f.k = k.value; refresh(); });
      const v = document.createElement('input');
      v.value = f.v || '';
      v.placeholder = 'Name, tool, running time — anything';
      v.classList.toggle('ar', isAR(f.v || ''));
      v.addEventListener('input', () => {
        f.v = v.value;
        v.classList.toggle('ar', isAR(v.value));
        refresh();
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ad-del sm';
      del.textContent = 'REMOVE';
      del.setAttribute('aria-label', 'Remove this fact');
      del.addEventListener('click', () => {
        p.facts.splice(i, 1);
        if (!p.facts.length) delete p.facts;
        refresh();
        drawDetails(box, p, li);
      });
      wrap.append(k, v, del);
      extra.appendChild(wrap);
    });
    box.appendChild(extra);

    const addFact = document.createElement('button');
    addFact.type = 'button';
    addFact.className = 'ad-btn ghost sm';
    addFact.textContent = '+ ANOTHER FACT';
    addFact.addEventListener('click', () => {
      if (!Array.isArray(p.facts)) p.facts = [];
      p.facts.push({ k: '', v: '' });
      refresh();
      drawDetails(box, p, li);
    });
    box.appendChild(addFact);

    /* ── the making-of ──────────────────────────────────────────────── */
    const bts = document.createElement('div');
    bts.className = 'ad-bts';
    box.appendChild(bts);
    drawBts(bts, p, li);
  }

  /* ── the behind-the-scenes list for one project ────────────────────────
     These are videos that belong to a piece rather than to the grid: the
     making-of, a cutdown, a second angle. They appear on that project's own
     page, under the film, and nowhere else on the site — so nothing here
     changes the grid, the vault or the AI rail.

     Drawn on demand, into the row that owns it: thirty-five projects each
     rendering an editor nobody opened is thirty-five editors to keep in
     step with the data behind them.                                      */
  function drawBts(box, p, li) {
    if (!Array.isArray(p.bts)) p.bts = [];
    box.innerHTML = '';

    const head = document.createElement('div');
    head.className = 'ad-bts-h';
    const lbl = document.createElement('span');
    lbl.textContent = '// BEHIND THE SCENES';
    const on = document.createElement('em');
    on.textContent = 'shown on the page for ' + q(p.title);
    head.append(lbl, on);
    box.appendChild(head);

    const ol = document.createElement('ol');
    ol.className = 'ad-bts-list';
    box.appendChild(ol);

    const refresh = () => {
      if (!p.bts.length) delete p.bts;      /* an empty list is no list */
      markMore(li.querySelector('.ad-more'), p);
      markDirty();
      drawBts(box, p, li);
    };

    p.bts.forEach((b, i) => {
      const row = document.createElement('li');
      row.className = 'ad-bts-row';

      const shot = document.createElement('span');
      shot.className = 'ad-thumb sm';
      thumb(shot, b);

      const t = document.createElement('input');
      t.className = 'ad-title';
      t.value = b.title || '';
      t.placeholder = 'What is it — “The Making”, “Director’s cut”…';
      t.setAttribute('aria-label', 'Title of this behind-the-scenes film');
      t.classList.toggle('ar', isAR(b.title || ''));
      t.addEventListener('input', () => {
        b.title = t.value;
        t.classList.toggle('ar', isAR(t.value));
        markDirty();
      });

      const host = document.createElement('select');
      host.className = 'ad-host';
      host.setAttribute('aria-label', 'Where this film is hosted');
      for (const [k, label] of HOSTS)
        host.appendChild(new Option(label, k, false, k === hostOf(b)));
      host.addEventListener('change', () => { setHost(b, host.value); refresh(); });

      const vid = document.createElement('input');
      vid.className = 'ad-vid';
      vid.value = b.id;
      vid.spellcheck = false;
      vid.setAttribute('aria-label', 'Link or id');
      vid.addEventListener('change', () => {
        const got = videoFrom(vid.value.trim(), hostOf(b));
        if (!got) { vid.value = b.id; return say('that is not a video link — nothing changed', 'err'); }
        b.id = got.id;
        setHost(b, got.yt ? 'yt' : got.ig ? 'ig' : got.x ? 'x' : 'vimeo');
        refresh();
      });

      const open = document.createElement('a');
      open.className = 'ad-mini';
      open.target = '_blank';
      open.rel = 'noopener';
      open.href = watchUrl(b);
      open.textContent = 'OPEN';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ad-del sm';
      del.textContent = 'REMOVE';
      del.setAttribute('aria-label', 'Remove ' + (b.title || b.id) + ' from this project');
      del.addEventListener('click', () => {
        p.bts.splice(i, 1);
        refresh();
        say('taken off “' + p.title + '” — the video itself is untouched', 'ok');
      });

      row.append(shot, t, host, vid, open, del);
      ol.appendChild(row);
    });

    if (!p.bts.length) {
      const none = document.createElement('p');
      none.className = 'ad-bts-none';
      none.textContent = 'Nothing yet. Anything you add here shows up as a second '
        + 'film on this project’s page, under the main one.';
      box.appendChild(none);
    }

    /* ── adding one ──────────────────────────────────────────────────── */
    const form = document.createElement('form');
    form.className = 'ad-add sm';
    form.innerHTML =
      '<input name="link" autocomplete="off" spellcheck="false" ' +
      'placeholder="Vimeo, YouTube, Instagram or X link" />' +
      '<input name="title" autocomplete="off" placeholder="Title (optional)" />' +
      '<button class="ad-btn sm" type="submit">+ ADD</button>' +
      '<span class="ad-add-why"></span>';
    const why = form.querySelector('.ad-add-why');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const link = form.link.value.trim();
      const got = videoFrom(link);
      if (!got) {
        form.link.classList.add('bad'); form.link.focus();
        why.textContent = NOT_A_VIDEO; why.className = 'ad-add-why';
        return;
      }
      if (got.id === p.id) {
        why.textContent = 'That is this project’s own film — it is already the '
          + 'video at the top of the page.';
        why.className = 'ad-add-why';
        return;
      }
      if (p.bts.some(b => b.id === got.id)) {
        why.textContent = 'That one is already on this project.';
        why.className = 'ad-add-why';
        return;
      }
      const b = { title: form.title.value.trim(), id: got.id };
      setHost(b, got.yt ? 'yt' : got.ig ? 'ig' : got.x ? 'x' : 'vimeo');
      p.bts.push(b);
      refresh();
      say('added to “' + p.title + '”', 'ok');
    });
    form.link.addEventListener('input', () => {
      form.link.classList.remove('bad');
      why.textContent = '';
    });
    box.appendChild(form);
  }

  /* open one project's details and put it where it can be seen */
  function openDetails(i) {
    const li = $('#plist').children[i];
    if (!li) return;
    const btn = li.querySelector('.ad-more');
    if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
    li.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const desc = li.querySelector('.ad-desc');
    if (desc) setTimeout(() => desc.focus({ preventScroll: true }), 260);
  }

  /* dragging is a deliberate arrangement, so it turns automatic ordering off */
  function manual() { D.auto = false; }

  /* ── categories ────────────────────────────────────────────────────── */
  /* the add form offers the same categories the rows do */
  function fillAddCats() {
    const sel = $('#add-cat');
    if (!sel) return;
    const was = sel.value;
    sel.innerHTML = '';
    for (const k of Object.keys(D.cat)) {
      if (k === 'all') continue;
      sel.appendChild(new Option(D.cat[k], k));
    }
    if (was && D.cat[was]) sel.value = was;
  }

  function drawCats() {
    const ol = $('#clist');
    ol.innerHTML = '';
    const keys = Object.keys(D.cat).filter(k => k !== 'all')
      .sort((a, b) => (D.rank[a] ?? 99) - (D.rank[b] ?? 99));
    keys.forEach((k, i) => ol.appendChild(catRow(k, i, keys)));
    fillAddCats();
    $('#n-cats').textContent = keys.length;
    markDirty();
  }

  function catRow(key, i, keys) {
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.i = i;
    li.querySelector('.ad-thumb').remove();
    li.querySelector('.ad-shape').remove();
    li.querySelector('.ad-idx').textContent = String(i + 1).padStart(2, '0');

    /* The key is what every project stores, so renaming one has to carry the
       projects with it — otherwise they would all point at a category that no
       longer exists. Committed on change, not on every keystroke. */
    const k = document.createElement('input');
    k.className = 'ad-key';
    k.value = key;
    k.setAttribute('aria-label', 'Category key');
    k.addEventListener('input', () => {
      const v = k.value.trim().toLowerCase();
      k.classList.toggle('bad', !/^[a-z0-9]+$/.test(v) || (v !== key && !!D.cat[v]));
    });
    k.addEventListener('change', () => {
      const v = k.value.trim().toLowerCase();
      if (v === key) return;
      if (!/^[a-z0-9]+$/.test(v)) { k.value = key; k.classList.remove('bad');
        return alert('A key is lowercase letters and digits only — no spaces.'); }
      if (D.cat[v]) { k.value = key; k.classList.remove('bad');
        return alert('There is already a category with the key "' + v + '".'); }
      /* rebuild both maps in place so the order on screen survives the rename */
      D.cat = Object.fromEntries(Object.entries(D.cat).map(([kk, vv]) => [kk === key ? v : kk, vv]));
      D.rank = Object.fromEntries(Object.entries(D.rank).map(([kk, vv]) => [kk === key ? v : kk, vv]));
      for (const p of D.projects) if (p.cat === key) p.cat = v;
      /* remember it, and follow a chain: a→b then b→c must read as a→c */
      for (const [from, to] of Object.entries(D.renamed)) if (to === key) D.renamed[from] = v;
      if (!Object.values(D.renamed).includes(v)) D.renamed[key] = v;
      drawCats(); drawProjects();
    });
    li.insertBefore(k, li.querySelector('.ad-fields'));

    const fields = li.querySelector('.ad-fields');
    fields.querySelector('.ad-sub').remove();
    const t = fields.querySelector('.ad-title');
    t.value = D.cat[key];
    t.addEventListener('input', () => {
      D.cat[key] = t.value;
      /* the project rows carry this label in their dropdowns — patch just
         those options rather than rebuilding 35 rows on every keystroke */
      document.querySelectorAll('#plist .ad-cat option[value="' + CSS.escape(key) + '"]')
        .forEach(o => { o.textContent = t.value; });
      markDirty();
    });

    const used = D.projects.filter(p => p.cat === key).length;
    const c = document.createElement('span');
    c.className = 'ad-count' + (used ? '' : ' zero');
    c.textContent = used ? used + ' PROJECT' + (used > 1 ? 'S' : '') : 'UNUSED';
    li.insertBefore(c, li.querySelector('.ad-del'));

    li.querySelector('.ad-del').addEventListener('click', () => {
      if (used) return alert('"' + D.cat[key] + '" is still on ' + used +
        ' project' + (used > 1 ? 's' : '') + '.\n\nMove them to another category first.');
      delete D.cat[key]; delete D.rank[key];
      drawCats(); drawProjects();
    });

    wireDrag(li, (from, to) => {
      if (from === to) return;
      const order = [...keys];
      order.splice(to, 0, order.splice(from, 1)[0]);
      order.forEach((kk, n) => { D.rank[kk] = n; });
      if (D.auto) D.projects = autoSort(D.projects);
      drawCats(); drawProjects();
    });
    return li;
  }


  /* ── drag and drop ─────────────────────────────────────────────────── */
  let dragging = null;
  /* `li` here is whichever row the listener is attached to, so on drop it is
     the TARGET. The row being dragged is the one held in `dragging` — reading
     the index off `li` for both would make every drop a no-op. */
  function wireDrag(li, drop) {
    li.addEventListener('dragstart', e => {
      dragging = li; li.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.i);
    });
    li.addEventListener('dragend', () => {
      /* a drop redraws the list, so by now this row is usually detached and
         has no parent to clean up — clear the highlight from the document */
      li.classList.remove('drag');
      document.querySelectorAll('.ad-row.over').forEach(n => n.classList.remove('over'));
      dragging = null;
    });
    li.addEventListener('dragover', e => {
      if (!dragging || dragging === li || dragging.parentElement !== li.parentElement) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      li.classList.add('over');
    });
    li.addEventListener('dragleave', () => li.classList.remove('over'));
    li.addEventListener('drop', e => {
      e.preventDefault();
      li.classList.remove('over');
      if (!dragging || dragging === li) return;
      drop(+dragging.dataset.i, +li.dataset.i);
    });
  }

  /* ══ ADDING, THE SAME WAY EVERYWHERE ══════════════════════════════════
     Adding used to be prompt(): an unlabelled grey box, one question at a
     time, no example of what it wanted, no way back to the first answer once
     you were on the second — and if what you pasted was wrong it threw the
     lot away and told you so in a second box.

     Every list has a visible form instead, and one helper drives all four of
     them. It collects the fields, hands them to that list's own check, and
     either says what is wrong directly under the field you are still looking
     at, or adds the row and says what just happened. The red edge clears the
     moment you start fixing it.                                          */
  function wireAdd(sel, whySel, check) {
    const f = $(sel); if (!f) return;
    const why = $(whySel);
    const fields = [...f.querySelectorAll('input, select')];
    const tell = (msg, ok) => {
      why.textContent = msg || '';
      why.className = 'ad-add-why' + (ok ? ' ok' : '');
    };
    fields.forEach(i => i.addEventListener('input', () => {
      i.classList.remove('bad');
      if (why.textContent && !why.classList.contains('ok')) tell('');
    }));
    f.addEventListener('submit', e => {
      e.preventDefault();
      const vals = {};
      for (const i of fields) vals[i.name] = i.value.trim();
      const res = check(vals) || {};
      if (res.err) {
        const bad = fields.find(i => i.name === res.field) || fields[0];
        bad.classList.add('bad');
        bad.focus();
        return tell(res.err);
      }
      f.reset();
      fields.forEach(i => i.classList.remove('bad'));
      /* a select's reset is not a reset — put it back on the first category */
      for (const i of fields) if (i.tagName === 'SELECT' && i.options.length) i.selectedIndex = 0;
      tell(res.ok || 'Added.', true);
      fields[0].focus();                 /* ready for the next one */
    });
  }

  const firstCat = map => Object.keys(map).find(k => k !== 'all');

  /* ── one reader for every list ──────────────────────────────────────────
     PROJECTS, the vault, the AI rail and a project's behind-the-scenes all
     take the same four kinds of link, so they share this: paste a URL from
     any of the four hosts, or a bare id, and it comes back as the record the
     site stores. Order matters — an Instagram code and a YouTube id are both
     eleven-ish characters of the same alphabet, so the URL forms are tried
     before either bare form. */
  function videoFrom(raw, now) {
    const s = String(raw).trim();
    let m;
    /* A URL says which host it is, so those are tried first and always win. */
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(s))) return { id: m[1] };
    /* Instagram's share button hands out four shapes of URL, including one
       with the account name in the middle — that form is what the share
       sheet gives you on a phone, so it is the one most often pasted. */
    if ((m = /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv|share\/reel)\/([\w-]+)/.exec(s)))
      return { id: m[1], ig: true };
    if ((m = /(?:twitter|x)\.com\/(?:[^/]+\/)?status(?:es)?\/(\d+)/.exec(s))) return { id: m[1], x: true };
    if ((m = /(?:youtu\.be\/|[?&]v=|youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/.exec(s)))
      return { id: m[1], yt: true };

    /* A BARE ID CANNOT SAY. An Instagram code and a YouTube id are both
       eleven characters of the same alphabet — there is no telling them
       apart, and guessing turned a pasted reel code into a YouTube video.
       So when a row is being edited, a bare id keeps that row's host: you
       are editing an Instagram row, you paste a code, it stays Instagram.
       Only a full URL is allowed to change what a row is.

       `now` is the host of the row being edited, or nothing at all when
       something is being added from scratch — there the shapes decide. */
    if ((m = /^(\d{15,})$/.exec(s))) return { id: m[1], x: true };
    if ((m = /^(\d{6,14})$/.exec(s))) return { id: m[1], ...(now === 'x' ? { x: true } : {}) };
    if (now === 'ig' && (m = /^([\w-]{5,})$/.exec(s))) return { id: m[1], ig: true };
    if ((m = /^([\w-]{11})$/.exec(s))) return { id: m[1], yt: true };
    return null;
  }
  const NOT_A_VIDEO = 'That is not a link this site can play. Vimeo looks like '
    + 'https://vimeo.com/1174930627, YouTube like https://youtu.be/dQw4w9WgXcQ, '
    + 'Instagram like https://www.instagram.com/reel/DbyEq2GNEyR/, and X like '
    + 'https://x.com/gonaim/status/1234567890123456789.';

  /* where a video lives, and how to say so — the same four the site knows */
  const HOSTS = [['vimeo', 'VIMEO'], ['yt', 'YOUTUBE'], ['ig', 'INSTAGRAM'], ['x', 'X']];
  const hostOf = p => p.yt ? 'yt' : p.ig ? 'ig' : p.x ? 'x' : 'vimeo';
  function setHost(p, host) {
    delete p.yt; delete p.ig; delete p.x;
    if (host !== 'vimeo') p[host] = true;
  }
  const WATCH = {
    vimeo: id => 'https://vimeo.com/' + id,
    yt:    id => 'https://youtu.be/' + id,
    ig:    id => 'https://www.instagram.com/reel/' + id + '/',
    x:     id => 'https://x.com/i/status/' + id,
  };
  const watchUrl = p => WATCH[hostOf(p)](p.id);

  wireAdd('#add-proj', '#why-proj', v => {
    if (!v.link) return { err: 'Paste the video link first.', field: 'link' };
    const vid = videoFrom(v.link);
    if (!vid) return { err: NOT_A_VIDEO, field: 'link' };
    if (D.projects.some(p => p.id === vid.id))
      return { err: 'That video is already in the grid.', field: 'link' };
    if (!v.title) return { err: 'Give it a title — it is what a visitor reads under the frame.', field: 'title' };
    const year = String(v.year || '').trim();
    if (year && !/^\d{4}$/.test(year))
      return { err: 'A year is four digits, or nothing at all.', field: 'year' };
    const p = { title: v.title, id: vid.id,
                cat: v.cat || firstCat(D.cat),
                year: year || String(new Date().getFullYear()) };
    setHost(p, vid.yt ? 'yt' : vid.ig ? 'ig' : vid.x ? 'x' : 'vimeo');
    D.projects.unshift(p);
    manual();                            /* an addition is a deliberate order */
    drawProjects();
    /* AND OPEN IT. Adding used to drop a row at the top of a long list with
       nothing but a title in it and leave you to find the rest yourself.
       The brief, the client, the role and the making-of are the things you
       know at the moment you add something — so they are on screen at that
       moment, not somewhere to be hunted for later. */
    openDetails(0);
    return { ok: q(v.title) + ' added — its details are open below, ready to write.' };
  });

  wireAdd('#add-arch', '#why-arch', v => {
    if (!v.link) return { err: 'Paste the video link first.', field: 'link' };
    const vid = videoFrom(v.link);
    if (!vid) return { err: NOT_A_VIDEO, field: 'link' };
    if (D.archive.some(p => p.id === vid.id))
      return { err: 'That video is already in the vault.', field: 'link' };
    if (D.projects.some(p => p.id === vid.id))
      return { err: 'That video is in PROJECTS. The vault hides anything already live, '
        + 'so adding it here would show nothing.', field: 'link' };
    if (!v.title) return { err: 'Give it a title.', field: 'title' };
    const p = { title: v.title, id: vid.id, cat: firstCat(D.acat) };
    setHost(p, vid.yt ? 'yt' : vid.ig ? 'ig' : vid.x ? 'x' : 'vimeo');
    D.archive.unshift(p);
    drawArchive();
    return { ok: q(v.title) + ' added at the top of the vault.' };
  });

  wireAdd('#add-reel', '#why-reel', v => {
    if (!v.link) return { err: 'Paste the link first.', field: 'link' };
    const got = videoFrom(v.link);
    if (!got) return { err: NOT_A_VIDEO, field: 'link' };
    if (D.reels.some(r => r.id === got.id))
      return { err: 'That video is already in this list.', field: 'link' };
    const r = { title: v.title || '', id: got.id };
    setHost(r, got.yt ? 'yt' : got.ig ? 'ig' : got.x ? 'x' : 'vimeo');
    D.reels.unshift(r);
    drawReels();
    const host = hostOf(r);
    return { ok: 'Added at the top of the AI section' + (host === 'ig' || host === 'x'
      ? ' — ' + host.toUpperCase() + ' publishes no thumbnail, so it draws its own '
        + 'artwork until you upload a frame.'
      : ' — ' + host.toUpperCase() + ' brings its own poster.') };
  });

  wireAdd('#newcat', '#why-cat', v => {
    const key = v.key.toLowerCase();
    if (!key) return { err: 'The key is what every project stores internally — '
      + 'lowercase letters and digits, no spaces.', field: 'key' };
    if (!/^[a-z0-9]+$/.test(key))
      return { err: q(v.key) + ' will not do as a key: lowercase letters and digits '
        + 'only, no spaces and no punctuation.', field: 'key' };
    if (D.cat[key]) return { err: 'There is already a category with the key ' + q(key) + '.', field: 'key' };
    if (!v.label) return { err: 'The label is what a visitor reads on the filter button.', field: 'label' };
    D.cat[key] = v.label.toUpperCase();
    D.rank[key] = Math.max(-1, ...Object.values(D.rank)) + 1;
    drawCats(); drawProjects();
    return { ok: q(D.cat[key]) + ' added at the end — drag it up the list to move it '
      + 'earlier in the grid.' };
  });

  $('#auto').addEventListener('click', () => {
    D.auto = true;
    D.projects = autoSort(D.projects);
    drawProjects();
  });

  $('#revert').addEventListener('click', async () => {
    if (dirty() && !confirm('Throw away every change since the last load?')) return;
    await boot();
  });

  /* ── the new controls ─────────────────────────────────────────────── */
  const vimeoId = raw => {
    const s = String(raw).trim();
    const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(s) || /^(\d{6,})$/.exec(s);
    return m ? m[1] : null;
  };
  /* Instagram hands out more shapes of link than it used to: the plain one,
     the one with your username in front of it, /reels/ in the plural from the
     app, /p/ and /tv/ from older posts, and all of them with a ?igsh=… tail.
     Every one of those is a link somebody will actually paste, so every one of
     them has to work — the code is the part between the slashes either way. */
  const igCode = raw => {
    const s = String(raw).trim();
    const m = /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv|share\/reel)\/([\w-]+)/.exec(s)
      || /^([\w-]{6,})$/.exec(s);
    return m ? m[1] : null;
  };
  const REEL_URL = id => 'https://www.instagram.com/reel/' + id + '/';
  const VIMEO_URL = id => 'https://vimeo.com/' + id;

  /* Both films hold their whole link, because a whole link is the only thing
     anybody ever has in hand — and take a bare number too, for when you do. */
  for (const [el, key] of [['#hero-id', 'hero'], ['#reel-id', 'showreel']]) {
    const inp = $(el);
    if (!inp) continue;
    inp.addEventListener('input', () => inp.classList.toggle('bad', !vimeoId(inp.value)));
    inp.addEventListener('change', () => {
      const id = vimeoId(inp.value);
      if (!id) {
        inp.value = VIMEO_URL(D[key]);
        inp.classList.remove('bad');
        return say('that is not a Vimeo link — nothing changed', 'err');
      }
      D[key] = id;
      drawStudio();
      say((key === 'hero' ? 'hero film' : 'showreel') + ' → ' + VIMEO_URL(id), 'ok');
    });
  }

  const pShot = $('#portrait-shot');
  if ($('#portrait-pick')) $('#portrait-pick').addEventListener('click', async () => {
    const f = await pickFile('image/*');
    if (!f) return;
    try {
      /* PNG, because the whole point of this picture is its transparency —
         re-encoding it as JPEG would hand back the black square we spent
         two rounds removing. */
      const { blob, w, h } = await shrink(f, 720, 720, 'image/png');
      pending.set(PORTRAIT, { blob, w, h, name: f.name });
      await paintPreview(pShot, blob, { w: 112, h: 112 });
      drawStudio();
      if (!/png/i.test(f.type))
        say('note: that was not a PNG, so it has no transparency — it will show as a square', 'err');
      else say('portrait ready \u00b7 ' + w + '\u00d7' + h + ' \u00b7 ' + kb(blob.size) + ' — publish to upload it', 'ok');
    } catch (err) { alert(err.message); }
  });
  if ($('#portrait-clear')) $('#portrait-clear').addEventListener('click', () => {
    pending.delete(PORTRAIT);
    if (pShot) pShot.replaceChildren();
    drawStudio();
  });

  /* ── tabs ──────────────────────────────────────────────────────────── */
  document.querySelectorAll('.ad-tab').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.ad-tab').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.ad-pane').forEach(x =>
      x.classList.toggle('on', x.id === 'pane-' + b.dataset.tab));
    if (b.dataset.tab === 'data') drawData();
  }));


  /* ══ IMAGES ═══════════════════════════════════════════════════════════
     A picture chosen here is not sent as it arrives. It is decoded, scaled
     to what the page actually draws it at, and re-encoded — because the
     alternative is a four-megabyte phone photo landing in the repository
     and then on every visitor's connection.

     Nothing uploads on pick. Files queue, and PUBLISH writes them before it
     writes studio.js, so a cover always exists before the code that names
     it. Order matters: the other way round leaves a card pointing at a file
     that is not there yet.                                                */
  const pending = new Map();          /* repo path → {blob, w, h, name} */
  const covers = () => [...pending.keys()].sort();
  const kb = n => (n / 1024).toFixed(0) + ' KB';

  async function shrink(file, maxW, maxH, type, quality) {
    if (!/^image\//.test(file.type)) throw new Error('That is not an image.');
    if (file.size > 25 * 1024 * 1024) throw new Error('That file is over 25 MB — pick a smaller one.');
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error('The browser could not open that image.'); }
    const s = Math.min(1, maxW / bmp.width, maxH / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * s)), h = Math.max(1, Math.round(bmp.height * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise(r => c.toBlob(r, type, quality));
    if (!blob) throw new Error('The browser could not re-encode that image.');
    return { blob, w, h };
  }

  /* Previews are drawn onto a canvas rather than shown through a blob: URL,
     which keeps the console's image-src policy as narrow as it already is. */
  async function paintPreview(box, blob, fit) {
    const bmp = await createImageBitmap(blob);
    const c = box.querySelector('canvas') || box.appendChild(document.createElement('canvas'));
    const W = fit.w, H = fit.h;
    c.width = W * 2; c.height = H * 2;
    c.style.width = W + 'px'; c.style.height = H + 'px';
    const cx = c.getContext('2d');
    const s = Math.max(c.width / bmp.width, c.height / bmp.height);
    const dw = bmp.width * s, dh = bmp.height * s;
    cx.clearRect(0, 0, c.width, c.height);
    cx.drawImage(bmp, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    if (bmp.close) bmp.close();
  }

  function pickFile(accept) {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept;
      inp.addEventListener('change', () => res(inp.files && inp.files[0] || null), { once: true });
      inp.click();
    });
  }

  /* ══ VALIDATION ═══════════════════════════════════════════════════════
     Everything that could be wrong, found before it is published rather
     than after. An id in the wrong shape, the same video listed twice, a
     category nothing uses, a reel with no cover — each one is cheap to
     check here and expensive to notice live.                             */
  const ID_OK = {
    vimeo: /^\d{6,14}$/,
    yt: /^[\w-]{11}$/,
    ig: /^[\w-]{6,}$/,
    x: /^\d{15,}$/,           /* a status id is far longer than a Vimeo one */
  };
  const kindOf = p => hostOf(p);

  function problems() {
    const out = [];
    /* A video in both PROJECTS and the vault is not a mistake — VAULT is
       ARCHIVE minus everything live, so the site already hides the vault
       copy. Saying "error" there would be crying wolf, and a checker that
       cries wolf gets ignored. Twice in the SAME list is a real duplicate. */
    const seen = new Map();
    const note = (p, where) => {
      const k = kindOf(p) + ':' + p.id;
      const had = seen.get(k);
      if (had === where) out.push(['dup', where + ' lists the same video twice — ' + q(p.title || p.id)]);
      else if (had) out.push(['soft', q(p.title || p.id) + ' is in both PROJECTS and the vault — the vault copy hides itself, so only the live one shows']);
      else seen.set(k, where);
    };
    for (const p of D.projects) {
      note(p, 'PROJECTS');
      if (!ID_OK[kindOf(p)].test(p.id))
        out.push(['id', q(p.title || '(untitled)') + ' has an id that is not a ' + kindOf(p) + ' id: ' + q(p.id)]);
      if (!String(p.title || '').trim()) out.push(['blank', 'A project has no title (' + p.id + ')']);
      if (!D.cat[p.cat]) out.push(['cat', q(p.title) + ' is in ' + q(p.cat) + ', which is not a category']);
    }
    for (const p of D.archive) {
      note(p, 'the vault');
      if (!ID_OK[kindOf(p)].test(p.id))
        out.push(['id', 'Vault: ' + q(p.title || '(untitled)') + ' has an id that is not a ' + kindOf(p) + ' id']);
      if (!D.acat[p.cat]) out.push(['cat', 'Vault: ' + q(p.title) + ' is in ' + q(p.cat) + ', which is not a vault category']);
    }
    const reelIds = new Set();
    for (const r of D.reels) {
      if (!ID_OK[kindOf(r)].test(r.id))
        out.push(['id', 'AI: ' + q(r.id) + ' is not a ' + kindOf(r) + ' id']);
      if (reelIds.has(r.id)) out.push(['dup', 'AI: ' + q(r.id) + ' is listed twice']);
      reelIds.add(r.id);
    }
    /* ── behind the scenes ─────────────────────────────────────────────
       These never appear in a grid, so nothing else in this list would ever
       catch a bad one: a wrong id is a dead player on a project page and no
       sign of it anywhere else. */
    for (const p of D.projects) {
      const kids = Array.isArray(p.bts) ? p.bts : [];
      const ids = new Set();
      for (const b of kids) {
        const where = 'BTS on ' + q(p.title || p.id) + ': ';
        if (!b || !b.id) { out.push(['id', where + 'an entry has no video']); continue; }
        if (!ID_OK[kindOf(b)].test(b.id))
          out.push(['id', where + q(b.id) + ' is not a ' + kindOf(b) + ' id']);
        if (b.id === p.id)
          out.push(['dup', where + 'the same video as the project itself']);
        if (ids.has(b.id)) out.push(['dup', where + q(b.id) + ' is listed twice']);
        ids.add(b.id);
        if (!String(b.title || '').trim())
          out.push(['soft', where + q(b.id) + ' has no title — the page will call it '
            + '“Behind the scenes”']);
      }
    }
    if (!/^\d{6,}$/.test(D.hero)) out.push(['id', 'The hero video id is not a Vimeo id: ' + q(D.hero)]);
    if (!/^\d{6,}$/.test(D.showreel)) out.push(['id', 'The showreel id is not a Vimeo id: ' + q(D.showreel)]);
    /* How the grid actually comes out, from the site's own layout function.
       A hole mid-grid would be a bug in layout(), which is built to prevent
       one, so it is an error if it ever appears. A short last row is not a
       fault — fillLastRow() stretches a lone card wide on purpose — but it
       is the one thing about the grid worth knowing before you publish
       rather than after, which is what the preview was for. */
    const g = gridShape();
    if (g && g.holes)
      out.push(['grid', g.holes + ' empty cell' + (g.holes > 1 ? 's' : '') + ' mid-grid — a '
        + 'full-width banner is opening a row before the cards above it have filled theirs']);
    /* Said every time, including when it is fine. "Nothing about the grid" and
       "the grid is even" look identical in a list that only speaks up about
       faults, and only one of them is worth publishing on. */
    else if (g)
      out.push(['soft', g.tiles + ' tiles · the grid ends on a row of ' + g.last + ' of 3'
        + (g.last === 3 ? ' — even.'
          : g.last === 1 ? ' — that last card stretches the full width.'
          : ' — one short, so the last two stretch to fill it.')]);

    /* soft notes, not errors */
    const bare = D.reels.filter(r => (kindOf(r) === 'ig' || kindOf(r) === 'x')
      && !r.cover && !pending.has('assets/reels/' + r.id + '.jpg')).length;
    if (bare) out.push(['soft', bare + ' of ' + D.reels.length +
      ' AI videos are on a host that publishes no thumbnail and have no cover — '
      + 'those draw their own artwork instead']);
    for (const k of Object.keys(D.cat))
      if (k !== 'all' && !D.projects.some(p => p.cat === k))
        out.push(['soft', 'Category ' + q(D.cat[k]) + ' has nothing in it']);
    return out;
  }

  function drawProblems() {
    const box = $('#issues'); if (!box) return;
    const list = problems();
    const hard = list.filter(x => x[0] !== 'soft');
    box.replaceChildren(...list.map(([kind, text]) => {
      const li = document.createElement('li');
      li.className = 'ad-issue ' + (kind === 'soft' ? 'soft' : 'hard');
      li.textContent = text;
      return li;
    }));
    const tag = $('#n-issues');
    if (tag) { tag.textContent = list.length; tag.classList.toggle('bad', hard.length > 0); }
    return hard.length;
  }

  /* ══ THE VAULT ════════════════════════════════════════════════════════ */
  function drawArchive() {
    const ol = $('#alist'); if (!ol) return;
    ol.innerHTML = '';
    D.archive.forEach((p, i) => ol.appendChild(projectRow(p, i, VAULT_CTX)));
    $('#n-arch').textContent = D.archive.length;
    markDirty();
  }

  /* ══ THE REELS ════════════════════════════════════════════════════════ */
  function drawReels() {
    const ol = $('#rlist'); if (!ol) return;
    ol.innerHTML = '';
    D.reels.forEach((r, i) => ol.appendChild(reelRow(r, i)));
    $('#n-reels').textContent = D.reels.length;
    markDirty();
  }

  function reelRow(r, i) {
    const li = document.createElement('li');
    li.className = 'ad-row reel';
    li.draggable = true;
    li.dataset.i = i;

    const grip = document.createElement('span');
    grip.className = 'ad-grip'; grip.setAttribute('aria-hidden', 'true');
    grip.textContent = '⠿';

    const idx = document.createElement('span');
    idx.className = 'ad-idx'; idx.textContent = String(i + 1).padStart(2, '0');

    /* the cover, or the reason there isn't one */
    const shot = document.createElement('span');
    shot.className = 'ad-shot';
    const path = 'assets/reels/' + r.id + '.jpg';
    if (pending.has(path)) paintPreview(shot, pending.get(path).blob, { w: 54, h: 96 });
    else if (r.cover) shot.classList.add('has');
    else shot.classList.add('none');

    const fields = document.createElement('span');
    fields.className = 'ad-fields';
    const t = document.createElement('input');
    /* `t` was this list's name for a title when it only held reels; both are
       read so a half-migrated file still shows its titles, and only `title`
       is written back. */
    t.className = 'ad-title'; t.value = r.title || r.t || '';
    t.placeholder = 'Title (optional)';
    t.setAttribute('aria-label', 'Title');
    t.classList.toggle('ar', isAR(t.value));
    t.addEventListener('input', () => {
      r.title = t.value; delete r.t;
      t.classList.toggle('ar', isAR(t.value));
      markDirty();
    });

    /* ── the link IS the row ──────────────────────────────────────────
       This field used to hold the bare code and reject anything else, which
       meant it rejected every link Instagram's share button has ever
       produced. It holds the whole URL now, and the code is read out of
       whatever is dropped in. Paste a different reel's link over this one
       and the row becomes that reel — that is how a reel is edited.

       The cover is a file named after the code, so a new code means the
       cover on screen belongs to the reel that just left. Carrying it over
       would put the wrong frame on the new one, silently, and it would not
       be found until it was live — so it is cleared, and said out loud. */
    const sub = document.createElement('span');
    sub.className = 'ad-sub';

    /* where it lives — the same four the rest of the site knows */
    const host = document.createElement('select');
    host.className = 'ad-host';
    host.setAttribute('aria-label', 'Where this video is hosted');
    for (const [k, label] of HOSTS)
      host.appendChild(new Option(label, k, false, k === hostOf(r)));
    host.addEventListener('change', () => { setHost(r, host.value); drawReels(); });

    const url = document.createElement('input');
    url.className = 'ad-url';
    url.value = watchUrl(r);
    url.spellcheck = false;
    url.placeholder = 'Vimeo, YouTube, Instagram or X link';
    url.setAttribute('aria-label', 'Video link');
    const flag = () => url.classList.toggle('bad', !videoFrom(url.value, hostOf(r)));
    url.addEventListener('input', flag);
    url.addEventListener('change', () => {
      const got = videoFrom(url.value.trim(), hostOf(r));
      url.classList.remove('bad');
      if (!got) { url.value = watchUrl(r);
        return say('that is not a video link — nothing changed', 'err'); }
      if (got.id === r.id) { url.value = watchUrl(r); return; }
      if (D.reels.some(x => x !== r && x.id === got.id)) { url.value = watchUrl(r);
        return say('that video is already in this list — nothing changed', 'err'); }
      /* The cover is a file named after the id, so a new id means the cover
         on screen belongs to the video that just left. Carrying it over would
         put the wrong frame on the new one, silently, and it would not be
         found until it was live — so it is cleared, and said out loud. */
      const had = r.cover || pending.has(path);
      pending.delete(path);
      delete r.cover;
      r.id = got.id;
      setHost(r, got.yt ? 'yt' : got.ig ? 'ig' : got.x ? 'x' : 'vimeo');
      drawReels();
      say('row ' + (i + 1) + ' is now ' + hostOf(r).toUpperCase() + ' ' + got.id
        + (had ? ' — its old cover was cleared, upload a frame for the new one' : ''), 'ok');
    });
    flag();

    const go = document.createElement('a');
    go.className = 'ad-go';
    go.href = watchUrl(r);
    go.target = '_blank';
    go.rel = 'noopener noreferrer';
    go.textContent = 'OPEN ↗';
    go.setAttribute('aria-label', 'Open this video where it lives');

    const state = document.createElement('span');
    state.className = 'ad-cover-state';
    const selfPoster = hostOf(r) === 'yt' || hostOf(r) === 'vimeo';
    state.textContent = pending.has(path) ? 'NEW COVER READY · UPLOADS WHEN YOU PUBLISH'
      : r.cover ? 'COVER: ' + r.cover
      : selfPoster ? 'NO COVER · ' + hostOf(r).toUpperCase() + ' PUBLISHES ITS OWN'
      : 'NO COVER · DRAWS ITS OWN ARTWORK';
    /* only worth a warning where the host has no poster to fall back on */
    state.classList.toggle('warn', !selfPoster && !r.cover && !pending.has(path));
    sub.append(host, url, go);
    fields.append(t, sub, state);

    const acts = document.createElement('span');
    acts.className = 'ad-shape';
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'ad-seg';
    up.textContent = pending.has(path) ? 'REPLACE' : 'UPLOAD COVER';
    up.addEventListener('click', async () => {
      const f = await pickFile('image/*');
      if (!f) return;
      try {
        up.disabled = true; up.textContent = 'RESIZING…';
        /* a reel is 9:16 and drawn a few hundred pixels tall at most */
        const { blob, w, h } = await shrink(f, 720, 1280, 'image/jpeg', 0.82);
        pending.set(path, { blob, w, h, name: f.name });
        r.cover = r.id + '.jpg';
        drawReels();
        say('cover ready · ' + w + '×' + h + ' · ' + kb(blob.size) + ' — publish to upload it', 'ok');
      } catch (err) { alert(err.message); }
      finally { up.disabled = false; }
    });
    acts.appendChild(up);
    if (r.cover || pending.has(path)) {
      const clr = document.createElement('button');
      clr.type = 'button'; clr.className = 'ad-seg';
      clr.textContent = 'CLEAR';
      clr.addEventListener('click', () => {
        pending.delete(path); delete r.cover; drawReels();
      });
      acts.appendChild(clr);
    }

    const del = document.createElement('button');
    del.type = 'button'; del.className = 'ad-del';
    del.textContent = 'REMOVE';
    del.setAttribute('aria-label', 'Remove this reel');
    del.addEventListener('click', () => {
      if (!confirm('Remove this reel from the AI section?\n\nIt stays on Instagram — this only takes it off the site.')) return;
      pending.delete(path);
      D.reels.splice(i, 1);
      drawReels();
      say('reel removed — press DISCARD to bring it back', 'ok');
    });

    li.append(grip, idx, shot, fields, acts, del);
    wireDrag(li, (from, to) => {
      if (from === to) return;
      const [m] = D.reels.splice(from, 1);
      D.reels.splice(to, 0, m);
      drawReels();
    });
    return li;
  }

  /* ══ DATA — WHAT THE SITE IS MADE OF ══════════════════════════════════
     Three sources, and every panel names its own:

       the file    PROJECTS, ARCHIVE, AI_REELS and the rest, already parsed
                   and sitting in memory — the same numbers the site builds
                   itself from.
       the site    each real file fetched from this origin and measured, so
                   the weight is bytes actually served rather than an
                   estimate off disk.
       the repo    commits to studio.js through the API, which is a publish
                   log: every one of them is a press of the button below.

     Nothing is modelled, extrapolated or rounded up to look better. Where a
     figure cannot be measured — visitor numbers, with no analytics on the
     site — it says so and says what would be needed, because a plausible
     invented number is worse than an honest gap.                          */

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const nfmt = n => n.toLocaleString('en-GB');
  const kbytes = n => n < 1024 ? n + ' B'
    : n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB'
    : (n / 1048576).toFixed(2) + ' MB';

  function kpi(box, value, label, note, kind) {
    const d = el('div', 'ad-kpi' + (kind ? ' ' + kind : ''));
    d.append(el('b', '', value), el('span', '', label));
    if (note) d.append(el('em', '', note));
    box.appendChild(d);
  }
  /* One bar, its magnitude relative to the biggest in its own group — a bar
     scaled to anything else is a picture of the wrong thing. */
  function bar(box, key, value, max, text, heavy) {
    const row = el('div', 'ad-bar-row' + (heavy ? ' heavy' : ''));
    const track = el('div', 'ad-bar-t');
    const fill = el('div', 'ad-bar-f');
    fill.style.transform = 'scaleX(' + (max > 0 ? Math.max(0.012, value / max) : 0) + ')';
    track.appendChild(fill);
    row.append(el('div', 'ad-bar-k', key), track, el('div', 'ad-bar-v', text));
    row.title = key + ' — ' + text;
    box.appendChild(row);
  }
  function fact(box, label, value, kind) {
    const d = el('div', 'ad-fact');
    d.append(el('span', '', label), el('b', kind || '', value));
    box.appendChild(d);
  }

  /* ── the file ─────────────────────────────────────────────────────── */
  function drawData() {
    if (!D || !$('#kpis')) return;

    const live = D.projects.length;
    const liveIds = new Set(D.projects.map(p => p.id));
    /* the site does exactly this: VAULT = ARCHIVE minus everything live */
    const vaultShown = D.archive.filter(p => !liveIds.has(p.id)).length;
    const banners = D.projects.filter(p => p.hi).length;
    const covered = D.reels.filter(r =>
      r.cover || pending.has('assets/reels/' + r.id + '.jpg')).length;
    const withDesc = D.projects.filter(p => String(p.desc || '').trim()).length;

    const box = $('#kpis');
    box.replaceChildren();
    kpi(box, nfmt(live + vaultShown), 'FILMS ON THE SITE',
      live + ' in the grid · ' + vaultShown + ' in the vault');
    kpi(box, nfmt(live), 'IN THE LIVE GRID',
      banners + ' full width · ' + (live - banners) + ' cards');
    kpi(box, nfmt(D.reels.length), 'INSTAGRAM REELS',
      covered + ' of ' + D.reels.length + ' have a cover',
      covered === D.reels.length ? 'good' : 'warn');
    kpi(box, nfmt(Object.keys(D.cat).length - 1), 'CATEGORIES',
      Object.keys(D.cat).filter(k => k !== 'all' &&
        !D.projects.some(p => p.cat === k)).length + ' with nothing in them', 'cy');

    /* by category, biggest first */
    const cbox = $('#d-cats');
    cbox.replaceChildren();
    const counts = Object.keys(D.cat).filter(k => k !== 'all')
      .map(k => [D.cat[k], D.projects.filter(p => p.cat === k).length])
      .sort((a, b) => b[1] - a[1]);
    const cmax = Math.max(1, ...counts.map(c => c[1]));
    for (const [label, n] of counts)
      bar(cbox, label, n, cmax, n ? nfmt(n) : '—', n === 0);

    /* by year, oldest first, gaps included so a quiet year is visible */
    const ybox = $('#d-years');
    ybox.replaceChildren();
    const years = {};
    for (const p of D.projects) {
      const y = String(p.year || '').trim();
      if (/^\d{4}$/.test(y)) years[y] = (years[y] || 0) + 1;
    }
    const ks = Object.keys(years).sort();
    if (!ks.length) fact(ybox, 'No project carries a year', '—', 'dim');
    else {
      const lo = +ks[0], hi = +ks[ks.length - 1];
      const ymax = Math.max(...Object.values(years));
      for (let y = lo; y <= hi; y++)
        bar(ybox, String(y), years[y] || 0, ymax, years[y] ? nfmt(years[y]) : '—', !years[y]);
      const undated = D.projects.length - Object.values(years).reduce((a, b) => a + b, 0);
      if (undated) fact(ybox, 'Projects with no year', nfmt(undated), 'warn');
    }

    /* coverage — the gaps worth closing */
    const gbox = $('#d-cover');
    gbox.replaceChildren();
    fact(gbox, 'Reels with an uploaded cover', covered + ' of ' + D.reels.length,
      covered === D.reels.length ? 'good' : 'warn');
    fact(gbox, 'Projects with a written description', withDesc + ' of ' + live,
      withDesc === live ? 'good' : withDesc ? '' : 'warn');
    fact(gbox, 'Projects marked full width', nfmt(banners));
    fact(gbox, 'Films listed in both the grid and the vault',
      nfmt(D.archive.filter(p => liveIds.has(p.id)).length), 'dim');
    fact(gbox, 'Grid order', D.auto ? 'automatic' : 'set by hand');

    drawWeight();
    drawHistory();
    drawVisitors();
  }

  /* ── the site: real bytes, fetched from this origin ───────────────────
     Sizes off disk are not what a visitor pays; these are the responses the
     site actually serves, measured as they arrive. Requested once and kept,
     because nothing here changes while the page is open. */
  const WEIGHED = [
    ['index.html', 'the page'],
    ['studio.js', 'the site engine'],
    ['studio.css', 'the styling'],
    ['chrome.js', 'shared furniture'],
    ['motion.js', 'motion'],
    ['grid.js', 'the grid layout'],
    ['assets/gonaim-portrait.png', 'your portrait'],
    ['assets/favicon.ico', 'the favicon'],
  ];
  /* the promise is cached, not just its answer: markDirty can call this on
     every keystroke and must not start a second round of fetches */
  let weighing = null, weighed = null;
  async function drawWeight() {
    const box = $('#d-weight'); if (!box) return;
    if (!weighed) {
      if (!weighing) {
        box.replaceChildren();
        fact(box, 'Measuring…', '', 'dim');
        weighing = Promise.all(WEIGHED.map(async ([path, what]) => {
        try {
          const r = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
          if (!r.ok) return { path, what, bytes: null };
          return { path, what, bytes: (await r.blob()).size };
        } catch { return { path, what, bytes: null }; }
      }));
      }
      weighed = await weighing;
    }
    const got = weighed.filter(w => w.bytes !== null);
    const total = got.reduce((a, w) => a + w.bytes, 0);
    const max = Math.max(1, ...got.map(w => w.bytes));
    box.replaceChildren();
    for (const w of [...got].sort((a, b) => b.bytes - a.bytes))
      bar(box, w.path.split('/').pop(), w.bytes, max, kbytes(w.bytes),
        w.bytes > 100 * 1024);
    const missed = weighed.length - got.length;
    const f = el('div', 'ad-rowsx');
    fact(f, 'Everything above, together', kbytes(total),
      total < 300 * 1024 ? 'good' : total < 600 * 1024 ? '' : 'warn');
    fact(f, 'The heaviest single file',
      got.length ? [...got].sort((a, b) => b.bytes - a.bytes)[0].path.split('/').pop() : '—', 'dim');
    if (missed) fact(f, 'Files that could not be read', nfmt(missed), 'warn');
    box.appendChild(f);
  }

  /* ── the repo: commits to studio.js are the publish log ─────────────── */
  let history = null, reading = null;
  async function drawHistory() {
    const box = $('#d-hist'), spark = $('#d-spark'), src = $('#d-hist-src');
    if (!box) return;
    box.replaceChildren();
    if (spark) spark.replaceChildren();
    if (!token()) {
      fact(box, 'Connect the publishing key and this fills in', 'not connected', 'dim');
      src.className = 'ad-src';
      src.textContent = 'From the repository’s commits to studio.js. '
        + 'Connect the key in the save sheet and this reads itself.';
      return;
    }
    if (!history) {
      if (!reading) {
        fact(box, 'Reading the repository…', '', 'dim');
        reading = gh('https://api.github.com/repos/' + REPO
          + '/commits?path=' + FILE + '&sha=' + BRANCH + '&per_page=100')
          .catch(err => ({ error: err.message }));
      }
      history = await reading;
    }
    box.replaceChildren();
    if (history.error || !Array.isArray(history)) {
      fact(box, 'GitHub could not be read', 'unavailable', 'warn');
      src.className = 'ad-src warn';
      src.textContent = history.error || 'The repository did not answer.';
      return;
    }
    src.className = 'ad-src';
    src.textContent = 'From the repository’s last ' + history.length
      + ' commits to studio.js — one per publish.';

    const when = c => new Date(c.commit.author.date);
    const last = history[0];
    const DAYMS = 864e5;
    const days = n => history.filter(c => Date.now() - when(c) < n * DAYMS).length;
    const ago = d => {
      const h = Math.round((Date.now() - d) / 36e5);
      if (h < 1) return 'just now';
      if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
      const dd = Math.round(h / 24);
      return dd + (dd === 1 ? ' day ago' : ' days ago');
    };

    /* twelve weeks of publishes, newest on the right */
    if (spark) {
      const weeks = new Array(12).fill(0);
      for (const c of history) {
        const w = Math.floor((Date.now() - when(c)) / (7 * DAYMS));
        if (w >= 0 && w < 12) weeks[11 - w]++;
      }
      const wmax = Math.max(1, ...weeks);
      weeks.forEach((n, i) => {
        const i2 = el('i');
        i2.style.height = Math.max(2, Math.round(n / wmax * 64)) + 'px';
        i2.dataset.n = n;
        i2.title = n + (n === 1 ? ' publish' : ' publishes')
          + ' · ' + (11 - i === 0 ? 'this week' : (11 - i) + ' weeks ago');
        if (n) i2.classList.add('on');
        spark.appendChild(i2);
      });
    }

    fact(box, 'Last published', ago(when(last)), 'good');
    fact(box, 'That change', (last.commit.message.split('\n')[0] || '').slice(0, 64));
    fact(box, 'Published in the last 7 days', nfmt(days(7)));
    fact(box, 'Published in the last 30 days', nfmt(days(30)));
    fact(box, 'Publishes recorded here', nfmt(history.length)
      + (history.length === 100 ? ' (the most GitHub returns at once)' : ''), 'dim');
    fact(box, 'First of these', when(history[history.length - 1])
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), 'dim');
  }

  /* ── visitors: measured or not shown ──────────────────────────────────
     There is no analytics beacon in index.html, so this console has no
     visitor numbers to read and will not invent any. It says what is
     missing and exactly what would fill it. */
  let beaconIs = null;
  async function drawVisitors() {
    const box = $('#d-visitors'); if (!box) return;
    box.replaceChildren();
    if (beaconIs === null) {
      beaconIs = fetch('index.html?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.text() : '')
        .then(html => /static\.cloudflareinsights\.com|beacon\.min\.js/.test(html))
        .catch(() => false);
    }
    const beacon = await beaconIs;
    if (beacon) {
      fact(box, 'Analytics beacon in the page', 'installed', 'good');
      const n = el('div', 'ad-fact note');
      n.append(document.createTextNode('Cloudflare collects the numbers; they are '
        + 'read from its dashboard, not from here. '));
      const a = el('a', '', 'Web Analytics ↗');
      a.href = 'https://dash.cloudflare.com/?to=/:account/web-analytics';
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      n.appendChild(a);
      box.appendChild(n);
      return;
    }
    fact(box, 'Analytics beacon in the page', 'not installed', 'warn');
    fact(box, 'Visitor figures available to this console', 'none', 'dim');
    const n = el('div', 'ad-fact note');
    n.innerHTML = 'Nothing on the site counts visits, so there is nothing to show '
      + 'and nothing worth guessing. Cloudflare will do it without adding a '
      + 'cookie or a third party: <b>Workers &amp; Pages → gonaim → '
      + 'Metrics → Web Analytics → Enable</b>. It injects its own '
      + 'beacon, so no change is needed here, and the site’s policy already '
      + 'allows it. The figures then live in the Cloudflare dashboard.';
    box.appendChild(n);
    const a = el('a', '', 'Open Cloudflare ↗');
    a.href = 'https://dash.cloudflare.com/?to=/:account/web-analytics';
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    const w = el('div', 'ad-fact note');
    w.appendChild(a);
    box.appendChild(w);
  }

  /* ══ THE STUDIO TAB — the two films and the portrait ══════════════════ */
  function drawStudio() {
    const wrap = $('#pane-studio'); if (!wrap) return;
    const hero = $('#hero-id'), reel = $('#reel-id');
    hero.value = VIMEO_URL(D.hero); reel.value = VIMEO_URL(D.showreel);
    hero.classList.remove('bad'); reel.classList.remove('bad');
    $('#hero-link').href = VIMEO_URL(D.hero);
    $('#reel-link').href = VIMEO_URL(D.showreel);
    const p = pending.get(PORTRAIT);
    $('#portrait-state').textContent = p
      ? 'NEW PICTURE READY · ' + p.w + '×' + p.h + ' · ' + kb(p.blob.size)
      : 'the picture currently on the site';
    markDirty();
  }
  const PORTRAIT = 'assets/gonaim-portrait.png';

  /* ── publishing ────────────────────────────────────────────────────────
     Saving used to mean four steps by hand: download the file, drop it in the
     repo, run the page generator, commit and push. Three of those are a
     computer's work, so the computer does them.

     This writes studio.js straight to the repository through GitHub's contents
     API. The push triggers two things on its own: Cloudflare Pages rebuilds
     the site, and the "Build project pages" workflow regenerates /work and the
     sitemap. One button, and the rest is machinery.

     The key is a fine-grained token, kept in this browser's localStorage and
     nowhere else — never in the repository, never in a file that ships. It
     needs one repository and one permission, Contents: read and write, so the
     worst it can do is the thing it is for. DISCONNECT wipes it.           */
  const REPO = 'PixlBit/Gonaim';
  const BRANCH = 'main';
  const FILE = 'studio.js';
  const TOKEN_KEY = 'gonaim.publish.token';
  const EXP_KEY = 'gonaim.publish.expires';
  const NEW_TOKEN = 'https://github.com/settings/personal-access-tokens/new';
  const API = 'https://api.github.com/repos/' + REPO + '/contents/' + FILE;

  const held = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const keep = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const drop = k => { try { localStorage.removeItem(k); } catch {} };
  const token = () => held(TOKEN_KEY);

  /* btoa wants one character per byte; a Latin title or an Arabic comment in
     the file is several bytes per character, so encode before, decode after */
  function b64(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const unb64 = s =>
    new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

  /* GitHub returns the key's own expiry date on every answer it gives. Whether
     a browser is allowed to read it depends on GitHub's CORS list, so this is
     written to work when it comes through and to say nothing at all when it
     does not — a missing date must never look like an expired one. */
  let lastExpiry = null;

  async function gh(url, init = {}) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: 'Bearer ' + token(),
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    lastExpiry = res.headers.get('github-authentication-token-expiration') || null;
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    /* GitHub's own message is usually the useful one; these are the three that
       are really "your token is wrong" wearing different numbers */
    const why =
      res.status === 401 ? 'GitHub refused the key — almost always because it has '
        + 'expired. Nothing is lost: make a new one and connect again, then press '
        + 'publish. Your changes are still here.'
      : res.status === 403 ? 'The key does not have Contents: read and write on ' + REPO + '.'
      : res.status === 404 ? 'GitHub cannot see ' + REPO + '. Check the key is scoped to this repository.'
      : res.status === 409 || res.status === 422
        ? 'Somebody changed studio.js since this page loaded. Discard and load it again first.'
        : (body.message || 'GitHub answered ' + res.status);
    const err = new Error(why);
    err.status = res.status;
    throw err;
  }

  /* An image is written the same way studio.js is, only its body is the
     file's bytes. Replacing one needs the sha of what is there; adding one
     must not send a sha at all, so a 404 on the lookup is the answer, not
     an error. */
  async function putFile(path, blob, message) {
    const url = 'https://api.github.com/repos/' + REPO + '/contents/' + path;
    let sha = null;
    try {
      const head = await gh(url + '?ref=' + BRANCH);
      sha = head.sha || null;
    } catch (err) { if (err.status !== 404) throw err; }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    await gh(url, {
      method: 'PUT',
      body: JSON.stringify({ message, content: btoa(bin), branch: BRANCH, ...(sha ? { sha } : {}) }),
    });
  }

  /* ── the hero film's line in index.html ────────────────────────────────
     One iframe src, matched on the player URL rather than on the id, so it
     finds the line whatever number is currently in it. `&amp;` is how the
     separators are written in the markup and how they are written back. */
  const HERO_IN_IDX = /(<iframe[^>]*id="h-iframe"[^>]*\ssrc=")https:\/\/player\.vimeo\.com\/video\/(\d+)([^"]*)(")/;
  const heroInMarkup = () => {
    const m = HERO_IN_IDX.exec(IDX);
    return m ? m[2] : null;
  };
  const withHero = (html, id) =>
    html.replace(HERO_IN_IDX, (_, a, was, tail, q) =>
      a + 'https://player.vimeo.com/video/' + id + tail + q);

  /* the same PUT as an image, with text instead of bytes */
  async function putText(path, text, message) {
    const url = 'https://api.github.com/repos/' + REPO + '/contents/' + path;
    let sha = null;
    try {
      const head = await gh(url + '?ref=' + BRANCH);
      sha = head.sha || null;
    } catch (err) { if (err.status !== 404) throw err; }
    await gh(url, {
      method: 'PUT',
      body: JSON.stringify({ message, content: b64(text), branch: BRANCH,
                             ...(sha ? { sha } : {}) }),
    });
  }

  const pubSay = (msg, kind) => {
    const el = $('#pub-state');
    el.textContent = msg;
    el.className = 'ad-pub-state' + (kind ? ' ' + kind : '');
  };

  /* Every key has an expiry date, and finding out on the day you needed to
     publish is the wrong time. This counts the days down where the key is
     shown, and turns it into a warning in the last fortnight. */
  const DAY = 864e5;
  function expiryNote() {
    const raw = held(EXP_KEY);
    if (!raw) return ['', ''];                 /* the date never came through */
    const when = new Date(raw);
    if (isNaN(when)) return ['', ''];
    const left = Math.ceil((when - Date.now()) / DAY);
    const on = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (left <= 0) return ['the key expired on ' + on + ' — make a new one', 'dead'];
    if (left <= 14) return ['key expires in ' + left + ' day' + (left === 1 ? '' : 's')
      + ', on ' + on + ' — worth replacing now', 'soon'];
    return ['key good until ' + on, ''];
  }

  /* the connect panel has two faces: a key to paste, or a key already held */
  function drawConn() {
    const on = !!token();
    $('#conn').classList.toggle('on', on);
    $('#pub').disabled = false;
    $('#pub').textContent = on ? 'PUBLISH TO SITE' : 'CONNECT, THEN PUBLISH';
    /* say what the button leads to: a review then a live push, or a file */
    $('#export').textContent = on ? 'REVIEW & PUBLISH' : 'SAVE CHANGES';
    const [note, kind] = on ? expiryNote() : ['', ''];
    const el = $('#conn-exp');
    el.textContent = note;
    el.className = 'ad-conn-exp' + (kind ? ' ' + kind : '');
    $('#conn-dot').className = 'ad-conn-dot' + (kind ? ' ' + kind : '');
  }

  async function connect() {
    const key = $('#tok').value.trim();
    if (!key) return pubSay('Paste the key first.', 'err');
    $('#conn-go').disabled = true;
    pubSay('checking the key…');
    try {
      keep(TOKEN_KEY, key);
      drop(EXP_KEY);
      const repo = await gh('https://api.github.com/repos/' + REPO);
      if (!(repo.permissions && repo.permissions.push))
        throw new Error('That key can read ' + REPO + ' but not write to it.');
      if (lastExpiry) keep(EXP_KEY, lastExpiry);
      $('#tok').value = '';
      drawConn();
      const [note] = expiryNote();
      pubSay('connected to ' + repo.full_name + ' · ready to publish'
        + (note ? ' · ' + note : ''), 'ok');
    } catch (err) {
      forget();
      pubSay(err.message, 'err');
    } finally {
      $('#conn-go').disabled = false;
    }
  }

  function forget() { drop(TOKEN_KEY); drop(EXP_KEY); drawConn(); }

  function disconnect() {
    forget();
    pubSay('key forgotten — this browser can no longer publish.', 'ok');
  }

  async function publish() {
    if (!token()) {
      $('#conn').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('#tok').focus();
      return pubSay('Connect a key first — it is the one-time setup below.', 'err');
    }
    const file = buildFile();
    $('#pub').disabled = true;
    try {
      pubSay('reading the file on GitHub…');
      const head = await gh(API + '?ref=' + BRANCH);

      /* Refuse to overwrite work this page never saw. Without the check, two
         tabs open on the console would each publish their own idea of the
         file and the second would erase the first. */
      if (!head.content || !head.sha)
        throw new Error('GitHub returned studio.js without its contents.');
      if (unb64(head.content) !== SRC)
        throw new Error('studio.js on GitHub is no longer the file this page '
          + 'loaded — somebody else has saved since. Discard, load it '
          + 'again, and redo these changes.');

      /* Files before code, always. A cover has to exist before studio.js
         names it, or the first visitor after the push sees a card pointing
         at nothing. If any upload fails, studio.js is not touched at all. */
      if (pending.size) {
        let n = 0;
        for (const [path, item] of pending) {
          n++;
          pubSay('uploading ' + path.split('/').pop() + ' (' + n + ' of ' + pending.size + ')…');
          await putFile(path, item.blob, 'Add ' + path.split('/').pop() + ' from the console');
        }
      }
      /* The hero film's src is in index.html so it plays without a script.
         Keeping it there means keeping it correct, so a changed id is written
         to both files. index.html goes first for the same reason the covers
         do: whatever lands first must never be the thing that names something
         not there yet. If the markup somehow does not contain the line, this
         says so and stops rather than pushing an index.html it did not
         actually edit — studio.js repoints the iframe at runtime anyway, so
         the film still plays either way. */
      if (D.hero !== heroInMarkup()) {
        if (!IDX) throw new Error('The hero film changed, but index.html could not '
          + 'be read, so it cannot be updated to match. Reload the console and try again.');
        const next = withHero(IDX, D.hero);
        if (next === IDX) throw new Error('The hero film changed, but the player URL '
          + 'could not be found in index.html to update it.');
        pubSay('writing index.html…');
        await putText('index.html', next, 'Point the hero film at vimeo.com/' + D.hero);
        IDX = next;
      }

      pubSay('writing studio.js…');
      const list = changes();
      const msg = list.length === 1
        ? list[0][1]
        : 'Update the grid from the console (' + list.length + ' changes)';
      const done = await gh(API, {
        method: 'PUT',
        body: JSON.stringify({
          message: msg + '\n\nPublished from the work console.',
          content: b64(file),
          sha: head.sha,
          branch: BRANCH,
        }),
      });

      /* what is on GitHub is now what is on screen */
      pending.clear();
      SRC = file; ORIGINAL = snapshot(); D.renamed = {};
      markDirty();
      if (lastExpiry) keep(EXP_KEY, lastExpiry);      /* the countdown, refreshed */
      drawConn();
      const sha = (done.commit && done.commit.sha || '').slice(0, 7);
      pubSay('published' + (sha ? ' · ' + sha : '')
        + ' — the site rebuilds itself in a minute or two.', 'ok');
      say('published to ' + REPO, 'ok');
      setTimeout(() => { $('#sheet').hidden = true; }, 2600);
    } catch (err) {
      /* An expired key is the one failure that will happen to everybody, on a
         schedule. Drop it, so the panel that comes back is the one with the
         link to make a new one — the changes stay in memory either way. */
      if (err.status === 401) forget();
      pubSay(err.message, 'err');
    } finally {
      $('#pub').disabled = false;
    }
  }

  $('#pub').addEventListener('click', publish);
  $('#conn-go').addEventListener('click', connect);
  $('#conn-off').addEventListener('click', disconnect);
  $('#tok').addEventListener('keydown', e => { if (e.key === 'Enter') connect(); });
  drawConn();

  /* ── save sheet ────────────────────────────────────────────────────── */
  function markDirty() {
    const d = dirty();
    const n = d ? changes().length : 0;
    $('#export').disabled = !d;
    $('#revert').disabled = !d;
    $('#savebar').classList.toggle('dirty', d);
    $('#save-txt').textContent = d
      ? n + (n === 1 ? ' unsaved change' : ' unsaved changes')
      : 'All changes saved';
    const hard = drawProblems();
    /* the figures follow the edits, but only while that tab is the one on
       screen — recomputing a pane nobody is looking at is work for nothing */
    if ($('#pane-data') && $('#pane-data').classList.contains('on')) drawData();
    say('studio.js \u00b7 ' + D.projects.length + ' projects \u00b7 ' + D.archive.length +
        ' in the vault \u00b7 ' + D.reels.length + ' in the AI section' +
        (hard ? ' \u00b7 ' + hard + ' need fixing' : ''), d ? 'err' : 'ok');
  }

  $('#export').addEventListener('click', () => {
    const file = buildFile();
    $('#code').textContent = 'const PROJECTS = ' + emitProjects() + ';\n\n'
      + 'const CAT = ' + emitCat() + ';\n\n'
      + 'const CAT_RANK = ' + emitRank() + ';\n\n'
      + 'const AUTO_ORDER = ' + D.auto + ';';
    const list = changes();
    const box = $('#changes');
    box.replaceChildren(...list.map(([mark, text]) => {
      const li = document.createElement('li');
      li.className = mark === '+' ? 'add' : mark === '\u2212' ? 'del' : 'mod';
      const b = document.createElement('b'); b.textContent = mark;
      const t = document.createElement('span'); t.textContent = text;
      li.append(b, t);
      return li;
    }));
    const banners = D.projects.filter(p => p.hi).length;
    $('#diff').textContent = list.length + (list.length === 1 ? ' change' : ' changes') +
      ' \u00b7 ' + D.projects.length + ' projects, ' + banners + ' full width, ' +
      (Object.keys(D.cat).length - 1) + ' categories, order ' +
      (D.auto ? 'automatic' : 'by hand') + '. ' +
      'Only PROJECTS, CAT, CAT_RANK and AUTO_ORDER are rewritten \u2014 the other ' +
      (SRC.split('\n').length - 1) + ' lines of studio.js are carried across untouched.';
    $('#sheet').hidden = false;
    pubSay(token()
      ? 'One button. It writes studio.js to ' + REPO + ' and the site rebuilds itself.'
      : 'Connect a key once, below, and saving becomes a single button forever after.');
    $('#dl').onclick = () => {
      const url = URL.createObjectURL(new Blob([file], { type: 'text/javascript' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'studio.js';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      /* Deliberately does NOT clear the unsaved-changes flag. A download is a
         copy on your desktop, not a save \u2014 the live site still has the old
         file, and pretending otherwise is how work gets lost. */
      pubSay('downloaded \u00b7 the live site still has the old file until you '
        + 'publish or push it yourself.', 'err');
    };
    $('#copy').onclick = async () => {
      try {
        await navigator.clipboard.writeText($('#code').textContent);
        $('#copy').textContent = 'COPIED';
        setTimeout(() => { $('#copy').textContent = 'COPY THE BLOCK'; }, 1600);
      } catch { alert('Clipboard blocked — select the text below and copy it.'); }
    };
  });
  $('#sheet-x').addEventListener('click', () => { $('#sheet').hidden = true; });
  $('#sheet').addEventListener('click', e => { if (e.target === $('#sheet')) $('#sheet').hidden = true; });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#sheet').hidden = true;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();                    /* not the browser's save-page */
      if (!$('#export').disabled) $('#export').click();
    }
  });

  addEventListener('beforeunload', e => { if (dirty()) e.preventDefault(); });

  /* The save bar is fixed, so the page has to leave room under itself for it —
     and how much room is not a constant: the bar wraps to two lines on a phone.
     Publish the measured height and let the stylesheet do the arithmetic. The
     bar is full-width and body padding cannot change that, so setting this
     cannot make the observer fire again. */
  (() => {
    const bar = $('#savebar');
    if (!bar || typeof ResizeObserver !== 'function') return;
    const set = () =>
      document.documentElement.style.setProperty('--savebar', bar.offsetHeight + 'px');
    new ResizeObserver(set).observe(bar);
    set();
  })();

  /* ── go ────────────────────────────────────────────────────────────── */
  async function boot() {
    try {
      await load();
      layout = null;                 /* the column count never changes, but a
                                        fresh file deserves a fresh layout */
      pending.clear();
      drawProjects();
      drawCats();
      drawArchive();
      drawReels();
      drawStudio();
      drawData();
    } catch (err) {
      say(String(err.message || err), 'err');
    }
  }
  boot();
})();
