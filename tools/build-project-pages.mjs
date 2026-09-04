/* ════════════════════════════════════════════════════════════════════════
   build-project-pages.mjs — one shareable page per project.

   Reads PROJECTS straight out of studio.js so the pages can never drift
   from the grid, and writes /work/<slug>/index.html for each, plus a
   refreshed sitemap.xml.

     node tools/build-project-pages.mjs

   Re-run it after editing PROJECTS. It rewrites the whole /work directory,
   so nothing hand-edited in there survives — put changes in studio.js.

   Optional fields on a PROJECTS entry, every one of them picked up
   automatically and every one of them written from the console:
     slug:   "alien-dancer"       fixed URL, when the derived one is wrong
     desc:   "Two sentences…"     the brief; blank lines make paragraphs
     prod:   "Les Yeux du Large"  the production it was made for
     soft:   "ZBrush · 3ds Max"   the software it was built in
     role:   "Character Artist"   otherwise 3D Artist
     facts:  [{k,v}, …]           any other rows for the list beside the brief
   ════════════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://naguib.art';
const src = readFileSync(join(ROOT, 'studio.js'), 'utf8');

/* Asset URLs carry a version so a changed file can never be answered from a
   stale cache — see tools/version-assets.mjs. A generated page has to be born
   with the same version the rest of the site is on, which is whatever the home
   page currently carries. */
const V = (() => {
  const seen = [...readFileSync(join(ROOT, 'index.html'), 'utf8')
    .matchAll(/\?v=(\d+)"/g)].map(m => +m[1]);
  return seen.length ? Math.max(...seen) : 1;
})();

/* pull the data out of studio.js without executing the rest of it */
function grab(name, kind = 'const') {
  const re = new RegExp(`^${kind} ${name}\\s*=\\s*`, 'm');
  const m = re.exec(src);
  if (!m) throw new Error(`${name} not found in studio.js`);
  const open = src.indexOf(src[m.index + m[0].length] === '[' ? '[' : '{', m.index);
  const close = src[open] === '[' ? ']' : '}';
  let depth = 0, str = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === src[open]) depth++;
    else if (c === close && --depth === 0)
      return new Function('return ' + src.slice(open, i + 1))();
  }
  throw new Error(`unterminated ${name}`);
}

const PROJECTS = grab('PROJECTS');
const CAT = grab('CAT');
/* same order the grid uses, so prev/next follows what the visitor just saw —
   including AUTO_ORDER, which the console turns off when the array has been
   arranged by hand */
const CAT_RANK = grab('CAT_RANK');
const AUTO_ORDER = !/const AUTO_ORDER\s*=\s*false/.test(src);
const list = !AUTO_ORDER ? [...PROJECTS] : [...PROJECTS]
  .sort((a, b) => (CAT_RANK[a.cat] ?? 99) - (CAT_RANK[b.cat] ?? 99));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isAR = s => /[؀-ۿ]/.test(s);

/* Use studio.js's own slugOf, lifted out of the file rather than copied, so
   the href a grid card renders and the folder written here cannot disagree. */
const slugify = (() => {
  const m = /^function slugOf\(p\)\{[\s\S]*?\n\}/m.exec(src);
  if (!m) throw new Error('slugOf not found in studio.js');
  return new Function(m[0] + '; return slugOf;')();
})();

/* the part before the dash is the client, when there is one */
function client(title) {
  const m = /^(.+?)\s*[—–-]\s*/.exec(title);
  return m && m[1].length <= 34 ? m[1].trim() : null;
}
/* ── WHAT A PROJECT SAYS ABOUT ITSELF ──────────────────────────────────
   Everything below is written by hand when it is worth writing, and worked
   out from the fields when it is not. A piece with nothing filled in reads
   exactly as it did before any of this existed.

     desc     the paragraph under // BRIEF, and the meta description
     prod     the PRODUCTION fact — otherwise the part before the dash
     role     the ROLE fact       — otherwise 3D Artist
     soft     the SOFTWARE fact
     facts    any other rows for that list, [{k, v}, …]

   The brief and the meta description are the same sentence today, but they
   are not the same thing: a brief can be a paragraph, and Google shows
   about 160 characters. So a hand-written brief is trimmed for the meta
   tag — at a word, never mid-word — and left whole on the page.        */
const DEFAULTS = { role: '3D Artist' };
const factsOf = p => Array.isArray(p.facts)
  ? p.facts.filter(f => f && String(f.k || '').trim() && String(f.v || '').trim())
  : [];
const clientOf = p => (p.prod && String(p.prod).trim()) || client(p.title);
function metaDesc(p) {
  const full = describe(p).replace(/\s+/g, ' ').trim();
  if (full.length <= 160) return full;
  const cut = full.slice(0, 158);
  const at = cut.lastIndexOf(' ');
  return (at > 90 ? cut.slice(0, at) : cut).replace(/[\s·—,;:]+$/, '') + '…';
}
function describe(p) {
  if (p.desc) return String(p.desc).trim();
  const cat = (CAT[p.cat] || p.cat).toLowerCase().replace(/s$/, '');
  /* Google shows about 160 characters and drops the rest. The Arabic name is
     the whole reason this line exists, so it goes where it will survive that
     cut, and the English is written tight enough to leave room for it. */
  const ar = ' أحمد نجيب.';
  const head = `${p.title} — ${cat}${p.year ? `, ${p.year}` : ''}.`;
  const c = p.prod ? ` Made for ${p.prod}.` : '';
  const by = ' 3D modeling and texturing by Ahmed Naguib, Marseille.';
  let out = `${head}${c}${by}${ar}`;
  if (out.length > 158) out = `${head}${by}${ar}`;
  return out;
}
/* A render is a file, not a stream. `frame` is the full one the page shows,
   `small` the rendition the strip of other work uses — the same two files
   the grid and the lightbox load, so a visitor arriving here has usually
   got them already.                                                       */
const frame = p => `../../assets/work/${p.id}.jpg`;
const small = p => `../../assets/work/${p.id}-sm.jpg`;

const slugs = list.map(slugify);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) throw new Error('duplicate slugs: ' + [...new Set(dupes)].join(', '));

/* ── the "more work" strip ────────────────────────────────────────────────
   Six other projects under each page. Picked at build time, not on load:
   a JS shuffle would hide these links from a crawler, and the whole point
   of the pages is that the work is reachable. Seeding the shuffle with the
   project's own id makes each page's six different from its neighbours' and
   identical on every visit.                                               */
const MORE = 6;
function rngFrom(seed) {
  let h = 2166136261;                                   /* FNV-1a, then xorshift */
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = h >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function moreWork(i) {
  const skip = new Set([i, i - 1, i + 1]);        /* prev/next are linked already */
  const pool = list.map((_, n) => n).filter(n => !skip.has(n));
  const rnd = rngFrom(list[i].id);
  for (let n = pool.length - 1; n > 0; n--) {     /* Fisher-Yates, seeded */
    const j = Math.floor(rnd() * (n + 1));
    [pool[n], pool[j]] = [pool[j], pool[n]];
  }
  return pool.slice(0, MORE);
}

/* ── the site's own header and footer ────────────────────────────────────
   Lifted from index.html with the hash links pointed back up two levels, so
   a project page carries the same chrome as everything else. The clock and
   the timecode come from chrome.js, which both pages load. `up` is how far
   the page sits from the root.                                            */
function siteNav(up, active) {
  const link = (href, label) =>
    `<li><a href="${up}${href}" data-txt="${label}"${active === label ? ' class="on"' : ''}>${label}</a></li>`;
  return `<nav>
  <a href="${up}" class="n-logo"><div class="n-pip"></div><span class="n-type">AHMED <b>NAGUIB</b></span></a>
  <ul class="n-links">
${['#philosophy ABOUT', '#work WORK', '#ai CONCEPT', '#archive DETAIL', '#services SKILLS',
   '#pipeline PIPELINE', '#contact CONTACT'].map(x => '    ' + link(...x.split(' '))).join('\n')}
  </ul>
  <div class="n-right">
    <div class="n-clock" id="n-clock" aria-label="Marseille local time">
      <span class="nc-orb" id="nc-orb"><svg viewBox="0 0 24 24"><g class="nc-sun"><circle cx="12" cy="12" r="4"></circle><g class="nc-rays"><line x1="12" y1="1.5" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="22.5"></line><line x1="1.5" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="22.5" y2="12"></line><line x1="4.6" y1="4.6" x2="6.4" y2="6.4"></line><line x1="17.6" y1="17.6" x2="19.4" y2="19.4"></line><line x1="4.6" y1="19.4" x2="6.4" y2="17.6"></line><line x1="17.6" y1="6.4" x2="19.4" y2="4.6"></line></g></g><g class="nc-moon"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"></path></g></svg></span>
      <span class="nc-stack"><b class="nc-day" id="nc-day">&#8212;</b><span class="nc-date" id="nc-date">&#8212;</span></span>
      <span class="nc-sep"></span>
      <span class="nc-time" id="nc-time">00<i>:</i>00<i>:</i>00</span>
      <span class="nc-zone">MRS</span>
    </div>
    <a href="${up}#contact" class="n-cta">GET IN TOUCH</a>
  </div>
</nav>

<div id="dock">
  <a href="${up}"><svg viewBox="0 0 24 24"><path d="M3 12l9-9 9 9"></path><path d="M5 10v10h5v-6h4v6h5V10"></path></svg>HOME</a>
  <a href="${up}#work"${active === 'WORK' ? ' class="on"' : ''}><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"></rect><polygon points="10,9 15,12 10,15"></polygon></svg>WORK</a>
  <a href="${up}#services"><svg viewBox="0 0 24 24"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"></polygon></svg>SKILLS</a>
  <a href="${up}#contact"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"></path><polyline points="4,7 12,13 20,7"></polyline></svg>CONTACT</a>
</div>`;
}

function siteFooter(up) {
  return `<footer>
  <div class="ft-bars" aria-hidden="true"></div>
  <div class="ft-main">
    <a class="ft-big g-loop" href="${up}" data-txt="NAGUIB">NAGUIB</a>
    <div class="ft-tag">MODEL &#183; SCULPT &#183; TEXTURE &#183; LIGHT &#183; RENDER</div>
    <div class="ft-meta">
      <span>&#169; 2026 AHMED NAGUIB</span>
      <span class="ft-dot">&#9679;</span><span>MARSEILLE, FRANCE</span>
      <span class="ft-dot">&#9679;</span><span class="ft-tc" id="ft-tc">TC 00:00:00:00</span>
    </div>
  </div>
</footer>`;
}

function page(p, i) {
  const slug = slugs[i];
  const url = `${SITE}/work/${slug}/`;
  const prev = i > 0 ? list[i - 1] : null;
  const next = i < list.length - 1 ? list[i + 1] : null;
  const desc = describe(p);          /* the brief: whole, however long */
  const meta = metaDesc(p);          /* the snippet: trimmed to fit */
  const cat = CAT[p.cat] || p.cat.toUpperCase();
  const c = clientOf(p);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: p.title,
    description: meta,
    url,
    contentUrl: `${SITE}/assets/work/${p.id}.jpg`,
    thumbnailUrl: `${SITE}/assets/work/${p.id}-sm.jpg`,
    dateCreated: `${p.year || 2025}`,
    genre: cat,
    keywords: [cat, p.prod, p.soft].filter(Boolean).join(', '),
    inLanguage: 'en',
    /* Same @id as the Person on the home page, so every page reinforces one
       entity instead of describing strangers who happen to share a name. */
    creator: {
      '@type': 'Person',
      '@id': SITE + '/#ahmed',
      name: 'Ahmed Naguib',
      alternateName: ['أحمد نجيب', 'احمد نجيب', 'Art of Naguib'],
      url: SITE + '/'
    },
    isPartOf: { '@type': 'CollectionPage', name: 'Selected Work', url: SITE + '/#work' }
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Work', item: SITE + '/#work' },
      { '@type': 'ListItem', position: 2, name: p.title, item: url }
    ]
  };
  const link = (q, label, arrow) => q
    ? `<a class="pn-link${arrow === '←' ? '' : ' pn-next'}" href="../${slugs[list.indexOf(q)]}/">
         <span class="pn-dir">${arrow} ${label}</span>
         <span class="pn-name${isAR(q.title) ? ' ar' : ''}"${isAR(q.title) ? ' lang="ar" dir="rtl"' : ''}>${esc(q.title)}</span></a>`
    : '<span></span>';

  /* the page furniture is English even when the film's title is Arabic, so
     the document stays lang="en" and only the title itself is marked up */
  const ar = isAR(p.title) ? ' lang="ar" dir="rtl"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(p.title)} — Ahmed Naguib | أحمد نجيب</title>
<meta name="description" content="${esc(meta)}" />
<meta name="theme-color" content="#04070a" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="NAGUIB STUDIO" />
<meta property="og:title" content="${esc(p.title)} — Ahmed Naguib" />
<meta property="og:description" content="${esc(meta)}" />
<meta property="og:image" content="${SITE}/assets/work/${p.id}.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)} — Ahmed Naguib" />
<meta name="twitter:image" content="${SITE}/assets/work/${p.id}.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;700&family=Oswald:wght@200;300;400;600;700&display=swap" rel="stylesheet" />
<link rel="icon" type="image/x-icon" href="../../assets/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon-32.png" />
<link rel="stylesheet" href="../../studio.css?v=${V}" />
<link rel="stylesheet" href="../../project.css?v=${V}" />
<script type="application/ld+json">${JSON.stringify(ld, null, 1)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs, null, 1)}</script>
<script defer src="../../sound.js?v=${V}"></script>
<script defer src="../../chrome.js?v=${V}"></script>
<script defer src="../../project.js?v=${V}"></script>
<script defer src="../../mascot.js?v=${V}"></script>
</head>
<body class="pj-body">
<div id="prog"></div>

${siteNav('../../', 'WORK')}

<main class="pj-wrap">
  <a href="../../#work" class="pj-back">&#8592; ALL WORK</a>
  <div class="pj-kicker">// ${String(i + 1).padStart(3, '0')} &nbsp;·&nbsp; ${esc(cat)}${p.year ? ' &nbsp;·&nbsp; ' + p.year : ''}</div>
  <h1 class="pj-title${isAR(p.title) ? ' ar' : ''}"${ar}>${esc(p.title)}</h1>

  <figure class="pj-stage">
    <img class="pj-img" src="${frame(p)}" alt="${esc(p.title)} — 3D render by Ahmed Naguib" />
    <button class="pj-zoom" type="button" aria-label="View ${esc(p.title)} full size">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9,3 3,3 3,9"></polyline><polyline points="15,21 21,21 21,15"></polyline><line x1="3" y1="3" x2="10" y2="10"></line><line x1="21" y1="21" x2="14" y2="14"></line></svg>
    </button>
    <div class="pj-scan"></div>
  </figure>

  <div class="pj-grid">
    <div class="pj-copy">
      <div class="pj-lbl">// BRIEF</div>
${desc.split(/\n{2,}/).map(par => `      <p>${esc(par.trim())}</p>`).join('\n')}
      <a class="btn-o pj-src" href="${frame(p)}" target="_blank" rel="noopener">
        OPEN THE FULL FRAME ↗</a>
    </div>
    <dl class="pj-facts">
      ${c ? `<div><dt>PRODUCTION</dt><dd>${esc(c)}</dd></div>` : ''}
      <div><dt>CATEGORY</dt><dd>${esc(cat)}</dd></div>
      ${p.year ? `<div><dt>YEAR</dt><dd>${p.year}</dd></div>` : ''}
      <div><dt>ROLE</dt><dd>${esc(p.role || DEFAULTS.role)}</dd></div>
      ${p.soft ? `<div><dt>SOFTWARE</dt><dd>${esc(p.soft)}</dd></div>` : ''}${factsOf(p).map(f => `\n      <div><dt>${esc(String(f.k).toUpperCase())}</dt><dd${isAR(String(f.v)) ? ' lang="ar" dir="rtl"' : ''}>${esc(String(f.v))}</dd></div>`).join('')}
    </dl>
  </div>


  <nav class="pj-pn">
    ${link(prev, 'PREVIOUS', '←')}
    ${link(next, 'NEXT', '→')}
  </nav>

  <section class="pj-more">
    <div class="pj-lbl">// MORE WORK</div>
    <div class="mw-grid">
${moreWork(i).map(n => {
  const q = list[n];
  return `      <a class="mw-card" href="../${slugs[n]}/">
        <span class="mw-thumb" data-poster="${esc(small(q))}"></span>
        <span class="mw-meta">
          <span class="mw-cat">${esc(CAT[q.cat] || q.cat)}${q.year ? ' · ' + q.year : ''}</span>
          <span class="mw-name${isAR(q.title) ? ' ar' : ''}"${isAR(q.title) ? ' lang="ar" dir="rtl"' : ''}>${esc(q.title)}</span>
        </span></a>`;
}).join('\n')}
    </div>
    <a class="mw-all" href="../../#work">SEE ALL ${list.length} ASSETS →</a>
  </section>
</main>

<div class="pj-cta">
  <a href="../../#contact" class="btn-y">WORK WITH ME</a>
</div>

${siteFooter('../../')}

</body>
</html>
`;
}

/* ── write ─────────────────────────────────────────────────────────────── */
const workDir = join(ROOT, 'work');
if (existsSync(workDir)) rmSync(workDir, { recursive: true });
list.forEach((p, i) => {
  const dir = join(workDir, slugs[i]);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(p, i));
});

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
${slugs.map(s => `  <url>
    <loc>${SITE}/work/${s}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>
`);

console.log(`wrote ${list.length} project pages + sitemap.xml`);
console.log(slugs.map((s, i) => `  /work/${s}/`.padEnd(46) + list[i].title).join('\n'));
