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

   Eight blocks are owned by this page: PROJECTS, CAT, CAT_RANK, AUTO_ORDER,
   ARCHIVE, ACAT, CONCEPTS and HERO_ART.

   THE PICTURES ARE THE POINT. A film console edits links; the work here is
   files this repository owns, so this one edits pictures. Choose a render and
   it is decoded, scaled to the two sizes the site actually draws — the grid
   takes the small one, the lightbox the large — and queued. PUBLISH writes
   every queued picture BEFORE it writes studio.js, so a card can never be
   published pointing at a file that is not there yet.

   CHECK runs makeLayout() from grid.js — the very function the site builds
   its grid with, not a copy — so what it says about the last row is what the
   site will actually do, including the rule that a full-width banner waits
   for the row of cards before it to finish. It also asks the server for every
   picture the data names, so a missing render is found here rather than as a
   black card on the live site.
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
    D = {
      projects: literal(SRC, 'PROJECTS'),
      cat: literal(SRC, 'CAT'),
      rank: literal(SRC, 'CAT_RANK'),
      auto: literal(SRC, 'AUTO_ORDER'),
      /* the detail passes and the concept sheets are lists like PROJECTS,
         owned the same way */
      archive: literal(SRC, 'ARCHIVE'),
      acat: literal(SRC, 'ACAT'),
      concepts: literal(SRC, 'CONCEPTS'),
      /* one bare path, quoted rather than bracketed */
      heroArt: bare(SRC, 'HERO_ART'),
      renamed: {},          /* old category key → the key it became */
    };
    /* the array in the file is in source order; the site sorts it on load, so
       sort here too or the console would show an order nobody ever sees */
    if (D.auto) D.projects = autoSort(D.projects);
    ORIGINAL = snapshot();
    haveImage.clear();
    probeImages();
    say('studio.js loaded · ' + D.projects.length + ' pieces', 'ok');
  }

  /* Anything not in here is invisible to the dirty check, which means an
     edit to it would never enable the save button. */
  const snapshot = () => JSON.stringify(
    [D.projects, D.cat, D.rank, D.auto, D.archive, D.acat, D.concepts, D.heroArt, covers()]);
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

    /* the detail passes */
    const [ , , , , wasArch, wasAcat, wasCon, wasHero ] = JSON.parse(ORIGINAL);
    const aBefore = new Map((wasArch || []).map(p => [p.id, p]));
    const aNow = new Set(D.archive.map(p => p.id));
    for (const p of (wasArch || [])) if (!aNow.has(p.id)) out.push(['\u2212', 'Detail: removed ' + q(p.title)]);
    for (const p of D.archive) {
      const was = aBefore.get(p.id);
      if (!was) { out.push(['+', 'Detail: added ' + q(p.title)]); continue; }
      if (was.title !== p.title) out.push(['~', 'Detail: renamed ' + q(was.title) + ' \u2192 ' + q(p.title)]);
      if (was.cat !== p.cat) out.push(['~', 'Detail: ' + q(p.title) + ' moved to ' + (D.acat[p.cat] || p.cat)]);
    }
    if (JSON.stringify(wasAcat) !== JSON.stringify(D.acat)) out.push(['~', 'Detail categories changed']);

    /* the concept sheets */
    const cBefore = new Map((wasCon || []).map(r => [r.id, r]));
    const cNow = new Set(D.concepts.map(r => r.id));
    for (const r of (wasCon || [])) if (!cNow.has(r.id)) out.push(['\u2212', 'Concept ' + q(r.title || r.id) + ' removed']);
    for (const r of D.concepts) {
      const was = cBefore.get(r.id);
      if (!was) { out.push(['+', 'Concept ' + q(r.title || r.id) + ' added']); continue; }
      if ((was.title || '') !== (r.title || '')) out.push(['~', 'Concept ' + q(r.id) + ' titled ' + q(r.title || '\u2014')]);
    }

    /* the hero render, and any picture waiting to go up with it */
    if (wasHero !== D.heroArt) out.push(['~', 'Hero render \u2192 ' + D.heroArt]);
    for (const path of covers())
      out.push(['+', 'Uploads: ' + path]);

    /* arrangement */
    if(wasA !== D.auto)
      out.push(['~', D.auto ? 'Order set back to automatic' : 'Order set by hand']);
    else if(!D.auto && wasP.map(p => p.id).join() !== D.projects.map(p => p.id).join())
      out.push(['~', 'Projects rearranged']);
    return out;
  }

  /* Ranking by category is all there is to sort on: a render has no upload
     date to sort on, so within a group the order is the order in the file,
     and a stable sort keeps it that way. */
  function autoSort(list) {
    return [...list].sort((a, b) => (D.rank[a.cat] ?? 99) - (D.rank[b.cat] ?? 99));
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
  const KEYS = ['title', 'id', 'cat', 'year', 'hi',
                'prod', 'soft', 'slug', 'desc', 'role', 'facts'];
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
      ['CONCEPTS', emitList(D.concepts, ['title', 'id'])],
      ['HERO_ART', "'" + D.heroArt + "'"],
    ].map(([name, text]) => ({ ...blockOf(SRC, name), text }))
      .sort((a, b) => b.start - a.start);
    let out = SRC;
    for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    return out;
  }

  /* ── the pictures ─────────────────────────────────────────────────────
     Every frame belongs to this repository, so there is no lookup to make:
     a row's thumbnail is the small rendition the grid itself loads. What
     IS worth asking is whether the file is actually there — a row can name
     a picture nobody has uploaded yet, and that is a black card on the live
     site. So each id is probed once, the answer kept, and CHECK reports the
     ones that came back missing.

     A picture queued for upload counts as present: it will exist by the time
     studio.js names it, because PUBLISH writes the files first.           */
  const smUrl = (p, dir) => 'assets/' + (dir || 'work') + '/' + p.id + '-sm.jpg';
  const lgUrl = (p, dir) => 'assets/' + (dir || 'work') + '/' + p.id + '.jpg';
  const haveImage = new Map();               /* path → true | false */
  let probing = null;

  function thumb(el, p, dir) {
    if (!p || !p.id) return;
    const q = pending.get(smUrl(p, dir));
    if (q) { paintPreview(el, q.blob, { w: 88, h: 50 }); return; }
    el.style.backgroundImage = 'url(' + smUrl(p, dir) + '?t=' + BOOTED + ')';
  }
  /* one cache-buster for the whole session: a picture replaced during this
     sitting must not keep showing the one the browser already holds, and a
     fresh number per row would defeat the cache entirely */
  const BOOTED = Date.now();

  /* Asks for every picture the data names, in one pass, and redraws CHECK
     when the answers are in. HEAD rather than GET: the question is whether
     the file exists, not what is in it. */
  function probeImages() {
    const want = [
      ...D.projects.map(p => smUrl(p, 'work')),
      ...D.archive.map(p => smUrl(p, 'work')),
      ...D.concepts.map(p => smUrl(p, 'concept')),
    ];
    const todo = [...new Set(want)].filter(u => !haveImage.has(u));
    if (!todo.length) return;
    probing = Promise.all(todo.map(async u => {
      try {
        const r = await fetch(u, { method: 'HEAD', cache: 'no-store' });
        haveImage.set(u, r.ok);
      } catch { haveImage.set(u, false); }
    })).then(() => { probing = null; drawProblems(); });
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
                     redraw: () => drawProjects(), manual: true, dir: 'work',
                     what: 'the grid' };
  const VAULT_CTX = { get list(){ return D.archive; }, get cats(){ return D.acat; },
                      redraw: () => drawArchive(), manual: false, dir: 'work',
                      what: 'the detail passes' };

  function drawProjects() {
    const ol = $('#plist');
    ol.innerHTML = '';
    D.projects.forEach((p, i) => ol.appendChild(projectRow(p, i, WORK_CTX)));
    $('#n-proj').textContent = D.projects.length;
    const os = $('#order-state');
    os.className = 'ad-order ' + (D.auto ? 'auto' : 'manual');
    os.innerHTML = D.auto
      ? 'ORDER: <b>AUTOMATIC</b> — grouped by category, in the order the categories are ranked'
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
    thumb(li.querySelector('.ad-thumb'), p, ctx.dir);

    const t = li.querySelector('.ad-title');
    t.value = p.title;
    t.classList.toggle('ar', isAR(p.title));
    t.addEventListener('input', () => {
      p.title = t.value;
      t.classList.toggle('ar', isAR(t.value));
      /* NOT manual(): the automatic sort goes by category alone, so a title
         has no bearing on it. Calling it here would switch the whole site to
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

    /* ── which picture this is ───────────────────────────────────────────
       One field, and it is the piece's whole identity: the file its render
       is in, the folder its page is written to, and the name every other
       list refers to it by. Rename it and the row keeps everything else —
       but the pictures do not follow, so the row will say its render is
       missing until one is uploaded under the new name. That is the honest
       thing for it to say, and it is said the moment it becomes true rather
       than after a publish. */
    const vid = li.querySelector('.ad-vid');
    const showVid = () => { vid.value = p.id; vid.classList.remove('bad'); };
    vid.placeholder = 'file name';
    showVid();

    vid.addEventListener('change', () => {
      const raw = slugify(vid.value);
      if (!raw) { showVid(); return say('a file name is lowercase letters, digits and dashes', 'err'); }
      if (raw === p.id) return showVid();
      if (list.some(x => x !== p && x.id === raw)) {
        showVid();
        return say('there is already a piece called ' + q(raw) + ' — nothing changed', 'err');
      }
      /* a queued picture belongs to the name it was queued under */
      for (const dir of ['work', 'concept'])
        for (const suffix of ['.jpg', '-sm.jpg']) {
          const from = 'assets/' + dir + '/' + p.id + suffix;
          if (pending.has(from)) {
            pending.set('assets/' + dir + '/' + raw + suffix, pending.get(from));
            pending.delete(from);
          }
        }
      p.id = raw;
      redraw();
      probeImages();
      say('renamed to ' + q(raw) + ' — its render has to be uploaded under that name', 'ok');
    });

    /* ── the render itself ────────────────────────────────────────────── */
    const up = li.querySelector('.ad-up');
    if (up) {
      const smPath = smUrl(p, ctx.dir), lgPath = lgUrl(p, ctx.dir);
      const queued = pending.has(smPath);
      const here = queued || haveImage.get(smPath) !== false;
      up.textContent = queued ? 'RENDER READY' : here ? 'REPLACE RENDER' : 'UPLOAD RENDER';
      up.classList.toggle('warn', !here);
      up.title = queued ? 'Waiting to be uploaded when you publish'
        : here ? smPath : 'No picture at ' + smPath + ' — this card is blank on the site';
      up.addEventListener('click', () => uploadFrame(up, p, ctx.dir, redraw));
    }

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
      if (!confirm('Remove "' + p.title + '" from ' + ctx.what +
        '?\n\nThe picture stays in the repository — this only takes it off the page.')) return;
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
  const DEFAULTS = { role: '3D Artist' };
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
     what will be published. */
  function autoDesc(p) {
    const cat = String(D.cat[p.cat] || p.cat).toLowerCase().replace(/s$/, '');
    const ar = ' أحمد نجيب.';
    const head = p.title + ' — ' + cat + (p.year ? ', ' + p.year : '') + '.';
    const c = p.prod ? ' Made for ' + p.prod + '.' : '';
    const by = ' 3D modeling and texturing by Ahmed Naguib, Marseille.';
    const out = head + c + by + ar;
    return out.length > 158 ? head + by + ar : out;
  }

  /* what the button says before it is opened: how much is written here */
  const written = p => (p.desc ? 1 : 0) + (p.prod ? 1 : 0) + (p.soft ? 1 : 0)
    + (p.role ? 1 : 0) + (p.slug ? 1 : 0)
    + (Array.isArray(p.facts) ? p.facts.length : 0);
  function markMore(btn, p) {
    if (!btn) return;
    const n = written(p);
    btn.querySelector('i').textContent = n ? '·' : '';
    btn.classList.toggle('has', n > 0);
    btn.title = n ? 'Written by hand: ' + n + ' of the details on this page'
                  : 'Nothing written yet — the page works it all out from the fields';
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
    section('// BRIEF', 'the paragraph under the render, and what Google shows');
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
    field('prod', 'PRODUCTION', autoClient(p.title) || 'none');
    field('soft', 'SOFTWARE', 'ZBrush · 3ds Max · Substance Painter');
    field('role', 'ROLE', DEFAULTS.role);
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
      k.placeholder = 'TRIANGLES';
      k.addEventListener('input', () => { f.k = k.value; refresh(); });
      const v = document.createElement('input');
      v.value = f.v || '';
      v.placeholder = 'A count, a texture size, a render engine — anything';
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

  /* ── one name for every list ────────────────────────────────────────────
     A film console read four kinds of link. Here every list stores the same
     thing — the name of a file this repository owns — so there is one rule
     instead of four: lowercase letters, digits and dashes. Anything typed is
     folded into that shape rather than rejected, because "Mine Wagon" and
     "mine-wagon" are the same intention and only one of them is a filename. */
  const slugify = raw => String(raw || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const NOT_A_NAME = 'A file name is lowercase letters, digits and dashes — '
    + 'the name of the picture in assets/, like mine-wagon. It becomes the '
    + 'address of the piece\u2019s own page too.';

  /* ── uploading a render ─────────────────────────────────────────────────
     One picture in, two out: the frame the lightbox opens and the rendition
     the grid loads. Both are made here, in this browser, from the file that
     was chosen — a phone photograph or a 4K render straight out of Marmoset
     is not what should land in the repository, and asking somebody to export
     two sizes by hand is asking them to forget one.

     Nothing uploads on pick. Files queue, and PUBLISH writes them before it
     writes studio.js, so the picture always exists before the code names it. */
  const SIZES = {
    work:    { lg: [1600, 900],  sm: [880, 495] },
    concept: { lg: [1400, 1050], sm: [760, 570] },
  };
  async function uploadFrame(btn, p, dir, redraw) {
    const f = await pickFile('image/*');
    if (!f) return;
    const size = SIZES[dir] || SIZES.work;
    const was = btn.textContent;
    try {
      btn.disabled = true; btn.textContent = 'RESIZING…';
      const big = await shrink(f, size.lg[0], size.lg[1], 'image/jpeg', 0.84);
      const small = await shrink(f, size.sm[0], size.sm[1], 'image/jpeg', 0.82);
      pending.set(lgUrl(p, dir), { blob: big.blob, w: big.w, h: big.h, name: f.name });
      pending.set(smUrl(p, dir), { blob: small.blob, w: small.w, h: small.h, name: f.name });
      redraw();
      say('render ready · ' + big.w + '×' + big.h + ' and ' + small.w + '×' + small.h
        + ' · ' + kb(big.blob.size + small.blob.size) + ' — publish to upload them', 'ok');
    } catch (err) { alert(err.message); btn.textContent = was; }
    finally { btn.disabled = false; }
  }

  wireAdd('#add-proj', '#why-proj', v => {
    const id = slugify(v.id);
    if (!id) return { err: NOT_A_NAME, field: 'id' };
    if (D.projects.some(p => p.id === id))
      return { err: 'There is already a piece called ' + q(id) + ' in the grid.', field: 'id' };
    if (!v.title) return { err: 'Give it a title — it is what a visitor reads under the frame.', field: 'title' };
    const year = String(v.year || '').trim();
    if (year && !/^\d{4}$/.test(year))
      return { err: 'A year is four digits, or nothing at all.', field: 'year' };
    D.projects.unshift({ title: v.title, id, cat: v.cat || firstCat(D.cat),
                         year: year || String(new Date().getFullYear()) });
    manual();                            /* an addition is a deliberate order */
    drawProjects();
    probeImages();
    /* AND OPEN IT. Adding used to drop a row at the top of a long list with
       nothing but a title in it and leave you to find the rest yourself.
       The brief, the production and the software are the things you know at
       the moment you add something — so they are on screen at that moment,
       not somewhere to be hunted for later. */
    openDetails(0);
    return { ok: q(v.title) + ' added — its details are open below. Press UPLOAD '
      + 'RENDER on its row to give it a picture.' };
  });

  wireAdd('#add-arch', '#why-arch', v => {
    const id = slugify(v.id);
    if (!id) return { err: NOT_A_NAME, field: 'id' };
    if (D.archive.some(p => p.id === id))
      return { err: 'That name is already in the detail passes.', field: 'id' };
    if (D.projects.some(p => p.id === id))
      return { err: 'That piece is in the selected grid. This grid hides anything '
        + 'already there, so adding it here would show nothing.', field: 'id' };
    if (!v.title) return { err: 'Give it a title.', field: 'title' };
    D.archive.unshift({ title: v.title, id, cat: firstCat(D.acat) });
    drawArchive();
    probeImages();
    return { ok: q(v.title) + ' added at the top of the detail passes.' };
  });

  wireAdd('#add-reel', '#why-reel', v => {
    const id = slugify(v.id);
    if (!id) return { err: NOT_A_NAME, field: 'id' };
    if (D.concepts.some(r => r.id === id))
      return { err: 'There is already a sheet called ' + q(id) + '.', field: 'id' };
    if (!v.title) return { err: 'Give it a title — a sheet is a title and a picture.', field: 'title' };
    D.concepts.unshift({ title: v.title, id });
    drawReels();
    probeImages();
    return { ok: q(v.title) + ' added at the top of the concept lab. Press UPLOAD '
      + 'SHEET on its row to give it a picture.' };
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

  /* ── the two pictures the site names directly ───────────────────────
     Everything else on the site is a row in a list. These two are named in
     the markup itself — the render behind the headline and the portrait on
     the loading screen — so they are replaced rather than added to: the file
     keeps its name and the new picture takes its place. */
  const HERO_ART_PATH = 'assets/hero-art.png';
  const PORTRAIT = 'assets/naguib-portrait.png';

  const wirePicture = (pickSel, clearSel, shotSel, path, box, note) => {
    const shot = $(shotSel);
    if ($(pickSel)) $(pickSel).addEventListener('click', async () => {
      const f = await pickFile('image/*');
      if (!f) return;
      try {
        /* PNG, because the whole point of both pictures is their
           transparency — re-encoding either as JPEG would hand back the
           rectangle the design exists to avoid. */
        const { blob, w, h } = await shrink(f, box, box, 'image/png');
        pending.set(path, { blob, w, h, name: f.name });
        await paintPreview(shot, blob, { w: 112, h: 112 });
        drawStudio();
        if (!/png/i.test(f.type))
          say('note: that was not a PNG, so it has no transparency — it will show as a rectangle', 'err');
        else say(note + ' ready · ' + w + '×' + h + ' · ' + kb(blob.size) + ' — publish to upload it', 'ok');
      } catch (err) { alert(err.message); }
    });
    if ($(clearSel)) $(clearSel).addEventListener('click', () => {
      pending.delete(path);
      if (shot) shot.replaceChildren();
      drawStudio();
    });
  };
  wirePicture('#hero-pick', '#hero-clear', '#hero-shot', HERO_ART_PATH, 1000, 'hero render');
  wirePicture('#portrait-pick', '#portrait-clear', '#portrait-shot', PORTRAIT, 720, 'portrait');

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
  /* A name is a file name, and there is one rule for all three lists. */
  const ID_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  /* A picture is missing only if the server said so AND nothing is queued to
     put one there. Anything still being probed is not yet an answer. */
  const missingPic = (p, dir) => {
    const u = smUrl(p, dir);
    return haveImage.get(u) === false && !pending.has(u);
  };

  function problems() {
    const out = [];
    /* A piece in both grids is not a mistake — the second grid is ARCHIVE
       minus everything live, so the site already hides the duplicate. Saying
       "error" there would be crying wolf, and a checker that cries wolf gets
       ignored. Twice in the SAME list is a real duplicate. */
    const seen = new Map();
    const note = (p, where) => {
      const had = seen.get(p.id);
      if (had === where) out.push(['dup', where + ' lists the same name twice — ' + q(p.title || p.id)]);
      else if (had) out.push(['soft', q(p.title || p.id) + ' is in both grids — the second one hides itself, so only the selected copy shows']);
      else seen.set(p.id, where);
    };
    const checkPic = (p, dir, where) => {
      if (missingPic(p, dir))
        out.push(['pic', where + q(p.title || p.id) + ' has no picture at ' + smUrl(p, dir)
          + ' — that card is blank on the site']);
    };
    for (const p of D.projects) {
      note(p, 'The grid');
      if (!ID_OK.test(p.id))
        out.push(['id', q(p.title || '(untitled)') + ' has a name that is not a file name: ' + q(p.id)]);
      if (!String(p.title || '').trim()) out.push(['blank', 'A piece has no title (' + p.id + ')']);
      if (!D.cat[p.cat]) out.push(['cat', q(p.title) + ' is in ' + q(p.cat) + ', which is not a category']);
      checkPic(p, 'work', '');
    }
    for (const p of D.archive) {
      note(p, 'The detail passes');
      if (!ID_OK.test(p.id))
        out.push(['id', 'Detail: ' + q(p.title || '(untitled)') + ' has a name that is not a file name']);
      if (!D.acat[p.cat]) out.push(['cat', 'Detail: ' + q(p.title) + ' is in ' + q(p.cat) + ', which is not a category there']);
      checkPic(p, 'work', 'Detail: ');
    }
    const conIds = new Set();
    for (const r of D.concepts) {
      if (!ID_OK.test(r.id)) out.push(['id', 'Concept: ' + q(r.id) + ' is not a file name']);
      if (conIds.has(r.id)) out.push(['dup', 'Concept: ' + q(r.id) + ' is listed twice']);
      conIds.add(r.id);
      if (!String(r.title || '').trim())
        out.push(['soft', 'Concept: ' + q(r.id) + ' has no title — the card shows its number instead']);
      checkPic(r, 'concept', 'Concept: ');
    }
    if (probing) out.push(['soft', 'still asking the server which pictures exist…']);
    /* How the grid actually comes out, from the site's own layout function.
       A hole mid-grid would be a bug in layout(), which is built to prevent
       one, so it is an error if it ever appears. A short last row is not a
       fault — fillLastRow() stretches a lone card wide on purpose — but it
       is the one thing about the grid worth knowing before you publish
       rather than after. */
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
    const nodesc = D.projects.filter(p => !String(p.desc || '').trim()).length;
    if (nodesc) out.push(['soft', nodesc + ' of ' + D.projects.length + ' pieces have no '
      + 'written brief — those pages compose a sentence from the fields instead, '
      + 'which is the single biggest thing left to improve in search']);
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

  /* ══ THE DETAIL PASSES ════════════════════════════════════════════════ */
  function drawArchive() {
    const ol = $('#alist'); if (!ol) return;
    ol.innerHTML = '';
    D.archive.forEach((p, i) => ol.appendChild(projectRow(p, i, VAULT_CTX)));
    $('#n-arch').textContent = D.archive.length;
    markDirty();
  }

  /* ══ THE CONCEPT SHEETS ═══════════════════════════════════════════════
     A sheet is the simplest thing on the site: a title, a file name and a
     picture. No category, no year, no page — so its row is the same three
     controls and nothing else.                                            */
  function drawReels() {
    const ol = $('#rlist'); if (!ol) return;
    ol.innerHTML = '';
    D.concepts.forEach((r, i) => ol.appendChild(reelRow(r, i)));
    $('#n-reels').textContent = D.concepts.length;
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

    const shot = document.createElement('span');
    shot.className = 'ad-thumb';
    thumb(shot, r, 'concept');

    const fields = document.createElement('span');
    fields.className = 'ad-fields';
    const t = document.createElement('input');
    t.className = 'ad-title'; t.value = r.title || '';
    t.placeholder = 'What the sheet is';
    t.setAttribute('aria-label', 'Title');
    t.classList.toggle('ar', isAR(t.value));
    t.addEventListener('input', () => {
      r.title = t.value;
      t.classList.toggle('ar', isAR(t.value));
      markDirty();
    });

    const sub = document.createElement('span');
    sub.className = 'ad-sub';

    /* ── the name IS the row ─────────────────────────────────────────────
       It names the picture and nothing else refers to it, so renaming one
       is safe — but the file does not follow the name, so anything queued
       for the old name comes with it and anything already uploaded does
       not. The row says which of those has happened. */
    const name = document.createElement('input');
    name.className = 'ad-vid';
    name.value = r.id;
    name.spellcheck = false;
    name.placeholder = 'file name';
    name.setAttribute('aria-label', 'File name of the sheet');
    name.addEventListener('change', () => {
      const to = slugify(name.value);
      if (!to) { name.value = r.id; return say(NOT_A_NAME, 'err'); }
      if (to === r.id) { name.value = r.id; return; }
      if (D.concepts.some(x => x !== r && x.id === to)) {
        name.value = r.id;
        return say('there is already a sheet called ' + q(to) + ' — nothing changed', 'err');
      }
      for (const suffix of ['.jpg', '-sm.jpg']) {
        const from = 'assets/concept/' + r.id + suffix;
        if (pending.has(from)) {
          pending.set('assets/concept/' + to + suffix, pending.get(from));
          pending.delete(from);
        }
      }
      r.id = to;
      drawReels();
      probeImages();
      say('row ' + (i + 1) + ' is now ' + q(to), 'ok');
    });

    const go = document.createElement('a');
    go.className = 'ad-go';
    go.href = lgUrl(r, 'concept');
    go.target = '_blank';
    go.rel = 'noopener noreferrer';
    go.textContent = 'OPEN ↗';
    go.setAttribute('aria-label', 'Open this sheet at full size');

    const state = document.createElement('span');
    state.className = 'ad-cover-state';
    const queued = pending.has(smUrl(r, 'concept'));
    const missing = missingPic(r, 'concept');
    state.textContent = queued ? 'NEW SHEET READY · UPLOADS WHEN YOU PUBLISH'
      : missing ? 'NO PICTURE AT ' + smUrl(r, 'concept').toUpperCase()
      : smUrl(r, 'concept');
    state.classList.toggle('warn', missing);
    sub.append(name, go);
    fields.append(t, sub, state);

    const acts = document.createElement('span');
    acts.className = 'ad-shape';
    const up = document.createElement('button');
    up.type = 'button'; up.className = 'ad-seg';
    up.textContent = queued ? 'SHEET READY' : missing ? 'UPLOAD SHEET' : 'REPLACE SHEET';
    up.addEventListener('click', () => uploadFrame(up, r, 'concept', drawReels));
    acts.appendChild(up);

    const del = document.createElement('button');
    del.type = 'button'; del.className = 'ad-del';
    del.textContent = 'REMOVE';
    del.setAttribute('aria-label', 'Remove this sheet');
    del.addEventListener('click', () => {
      if (!confirm('Remove this sheet from the concept lab?\n\nThe picture stays in the repository — this only takes it off the page.')) return;
      pending.delete(smUrl(r, 'concept'));
      pending.delete(lgUrl(r, 'concept'));
      D.concepts.splice(i, 1);
      drawReels();
      say('sheet removed — press DISCARD to bring it back', 'ok');
    });

    li.append(grip, idx, shot, fields, acts, del);
    wireDrag(li, (from, to) => {
      if (from === to) return;
      const [m] = D.concepts.splice(from, 1);
      D.concepts.splice(to, 0, m);
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
    const withPic = list => list.filter(p => !missingPic(p, 'work')).length;
    const conPic = D.concepts.filter(r => !missingPic(r, 'concept')).length;
    const withDesc = D.projects.filter(p => String(p.desc || '').trim()).length;

    const box = $('#kpis');
    box.replaceChildren();
    kpi(box, nfmt(live + vaultShown), 'PIECES ON THE SITE',
      live + ' selected · ' + vaultShown + ' detail passes');
    kpi(box, nfmt(live), 'IN THE SELECTED GRID',
      banners + ' full width · ' + (live - banners) + ' cards');
    kpi(box, nfmt(D.concepts.length), 'CONCEPT SHEETS',
      conPic + ' of ' + D.concepts.length + ' have their picture',
      conPic === D.concepts.length ? 'good' : 'warn');
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
    fact(gbox, 'Selected pieces with their render', withPic(D.projects) + ' of ' + live,
      withPic(D.projects) === live ? 'good' : 'warn');
    fact(gbox, 'Detail passes with their render', withPic(D.archive) + ' of ' + D.archive.length,
      withPic(D.archive) === D.archive.length ? 'good' : 'warn');
    fact(gbox, 'Concept sheets with their picture', conPic + ' of ' + D.concepts.length,
      conPic === D.concepts.length ? 'good' : 'warn');
    fact(gbox, 'Pieces with a written brief', withDesc + ' of ' + live,
      withDesc === live ? 'good' : withDesc ? '' : 'warn');
    fact(gbox, 'Pieces marked full width', nfmt(banners));
    fact(gbox, 'Names listed in both grids',
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
    ['assets/hero-art.png', 'the hero render'],
    ['assets/naguib-portrait.png', 'your portrait'],
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
      + 'cookie or a third party: <b>Workers &amp; Pages → naguib → '
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

  /* ══ THE STUDIO TAB — the hero render and the portrait ═══════════════ */
  function drawStudio() {
    const wrap = $('#pane-studio'); if (!wrap) return;
    for (const [path, stateSel, what] of [
      [HERO_ART_PATH, '#hero-state', 'the render currently on the site'],
      [PORTRAIT, '#portrait-state', 'the picture currently on the site'],
    ]) {
      const el = $(stateSel);
      if (!el) continue;
      const p = pending.get(path);
      el.textContent = p
        ? 'NEW PICTURE READY · ' + p.w + '×' + p.h + ' · ' + kb(p.blob.size)
        : what;
      el.classList.toggle('warn', !!p);
    }
    markDirty();
  }

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
  const REPO = 'PixlBit/naguib';
  const BRANCH = 'main';
  const FILE = 'studio.js';
  const TOKEN_KEY = 'naguib.publish.token';
  const EXP_KEY = 'naguib.publish.expires';
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

      /* Files before code, always. A render has to exist before studio.js
         names it, or the first visitor after the push sees a blank card. If
         any upload fails, studio.js is not touched at all. */
      if (pending.size) {
        let n = 0;
        for (const [path, item] of pending) {
          n++;
          pubSay('uploading ' + path.split('/').pop() + ' (' + n + ' of ' + pending.size + ')…');
          await putFile(path, item.blob, 'Add ' + path + ' from the console');
        }
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
      /* the pictures just uploaded exist now — ask again rather than keep
         reporting them missing */
      haveImage.clear(); probeImages();
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
    say('studio.js \u00b7 ' + D.projects.length + ' pieces \u00b7 ' + D.archive.length +
        ' in the detail passes \u00b7 ' + D.concepts.length + ' concept sheets' +
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
      ' \u00b7 ' + D.projects.length + ' pieces, ' + banners + ' full width, ' +
      (Object.keys(D.cat).length - 1) + ' categories, order ' +
      (D.auto ? 'automatic' : 'by hand') + '. ' +
      'Only PROJECTS, CAT, CAT_RANK, AUTO_ORDER, ARCHIVE, ACAT, CONCEPTS and ' +
      'HERO_ART are rewritten \u2014 the other ' +
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
