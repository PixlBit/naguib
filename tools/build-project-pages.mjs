/* ════════════════════════════════════════════════════════════════════════
   build-project-pages.mjs — one shareable page per piece.

   Reads PROJECTS straight out of studio.js so the pages can never drift
   from the site, and writes /work/<slug>/index.html for each, plus a
   refreshed sitemap.xml.

     node tools/build-project-pages.mjs

   Re-run it after editing PROJECTS. It rewrites the whole /work directory,
   so nothing hand-edited in there survives — put changes in studio.js.

   Optional fields on a PROJECTS entry:
     slug:   "alien-dancer"       fixes the URL when the derived one is wrong
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
const src  = readFileSync(join(ROOT, 'studio.js'), 'utf8');

/* Asset URLs carry a version so a changed file can never be answered from a
   stale cache. A generated page is born on whatever version the home page
   currently carries. */
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
const CAT      = grab('CAT');
const CAT_RANK = grab('CAT_RANK');
const AUTO_ORDER = !/const AUTO_ORDER\s*=\s*false/.test(src);
const list = !AUTO_ORDER ? [...PROJECTS] : [...PROJECTS]
  .sort((a, b) => (CAT_RANK[a.cat] ?? 99) - (CAT_RANK[b.cat] ?? 99));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isAR = s => /[؀-ۿ]/.test(s);
const pad  = n => String(n).padStart(2, '0');

/* studio.js's own slugOf, lifted out of the file rather than copied, so the
   href a link renders and the folder written here cannot disagree. */
const slugify = (() => {
  const m = /^function slugOf\(p\)\{[\s\S]*?\n\}/m.exec(src);
  if (!m) throw new Error('slugOf not found in studio.js');
  return new Function(m[0] + '; return slugOf;')();
})();

/* ── WHAT A PIECE SAYS ABOUT ITSELF ────────────────────────────────────
   Written by hand where it is worth writing, worked out from the fields
   where it is not. The brief and the meta description are the same
   sentence today but they are not the same thing: a brief can be a
   paragraph, and Google shows about 160 characters — so a hand-written
   brief is trimmed for the meta tag, at a word, and left whole on the page. */
const DEFAULTS = { role: '3D Artist' };
const factsOf = p => Array.isArray(p.facts)
  ? p.facts.filter(f => f && String(f.k || '').trim() && String(f.v || '').trim())
  : [];
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
  const ar  = ' أحمد نجيب.';
  const head = `${p.title} — ${cat}${p.year ? `, ${p.year}` : ''}.`;
  const c = p.prod ? ` Made for ${p.prod}.` : '';
  const by = ' 3D modeling and texturing by Ahmed Naguib, Marseille.';
  const out = `${head}${c}${by}${ar}`;
  return out.length > 158 ? `${head}${by}${ar}` : out;
}

/* A render is a file, not a stream. */
const frame = p => `../../assets/work/${p.id}.jpg`;
const small = p => `../../assets/work/${p.id}-sm.jpg`;

const slugs = list.map(slugify);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) throw new Error('duplicate slugs: ' + [...new Set(dupes)].join(', '));

/* ── the "more work" strip ────────────────────────────────────────────────
   Six other pieces under each page, picked at build time rather than on
   load: a JS shuffle would hide these links from a crawler, and reachable
   work is the whole point of the pages. The shuffle is seeded with the
   piece's own id, so each page's six differ from its neighbours' and stay
   identical on every visit.                                               */
const MORE = 6;
function rngFrom(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = h >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function moreWork(i) {
  const skip = new Set([i, i - 1, i + 1]);
  const pool = list.map((_, n) => n).filter(n => !skip.has(n));
  const rnd = rngFrom(list[i].id);
  for (let n = pool.length - 1; n > 0; n--) {
    const j = Math.floor(rnd() * (n + 1));
    [pool[n], pool[j]] = [pool[j], pool[n]];
  }
  return pool.slice(0, MORE);
}

/* ── the icons a project page uses ─────────────────────────────────────
   The same sprite the home page carries, cut down to what these pages
   actually draw. Inline, so a page costs no extra request for its icons. */
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-arrow" viewBox="0 0 24 24"><path class="slid" d="M4.6 12h14.8M13.4 6l6 6-6 6"/></symbol>
<symbol id="i-prev" viewBox="0 0 24 24"><path d="M19.4 12H4.6M10.6 6l-6 6 6 6"/></symbol>
<symbol id="i-expand" viewBox="0 0 24 24"><path d="M9 3.6H3.6V9M15 20.4h5.4V15M3.6 3.6 10 10M20.4 20.4 14 14"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><g class="spin"><path d="M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/></g></symbol>
<symbol id="i-out" viewBox="0 0 24 24"><path class="lift" d="M7 17 17 7M9 7h8v8"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="2.6" y="4.8" width="18.8" height="14.4"/><path class="lift" d="M2.6 6 12 13.4 21.4 6"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path class="lift" d="M3.4 11.6 12 3.4l8.6 8.2"/><path d="M5.6 10.4v10h12.8v-10"/></symbol>
<symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.4" y="3.4" width="7" height="7"/><rect x="13.6" y="3.4" width="7" height="7"/><rect x="3.4" y="13.6" width="7" height="7"/><rect class="puls" x="13.6" y="13.6" width="7" height="7"/></symbol>
<symbol id="i-list" viewBox="0 0 24 24"><path d="M8.4 6.4h12M8.4 12h12M8.4 17.6h12"/><path class="glow" d="M3.6 6.4h.01M3.6 12h.01M3.6 17.6h.01"/></symbol>
<symbol id="i-person" viewBox="0 0 24 24"><circle class="lift" cx="12" cy="8" r="4"/><path d="M4.4 20.6v-1a7.6 7.6 0 0 1 15.2 0v1"/></symbol>
</defs></svg>`;

/* ── the site's own header and footer ────────────────────────────────────
   Lifted from index.html with the hash links pointed back up two levels, so
   a project page wears the same chrome as everything else. */
function siteNav(up) {
  const link = (href, label) => `    <li><a href="${up}${href}">${label}</a></li>`;
  return `<nav id="nav" class="stuck">
  <a href="${up}" class="n-logo" aria-label="Ahmed Naguib — home">
    <svg class="n-mark" viewBox="0 0 26 26" aria-hidden="true">
      <circle class="r" cx="13" cy="14.5" r="9"/><circle class="d" cx="13" cy="3.4" r="2.1"/>
    </svg>
    <span class="n-name">AHMED <b>NAGUIB</b></span>
  </a>
  <ul class="n-links">
${['#work Work', '#index Index', '#about About', '#process Process',
   '#sheets Sketchbook', '#contact Contact'].map(x => link(...x.split(' '))).join('\n')}
  </ul>
  <div class="n-right">
    <span class="n-open"><i></i>Open for work</span>
    <a href="${up}#contact" class="n-cta"><span>Get in touch</span></a>
  </div>
</nav>

<div id="dock">
  <a href="${up}"><svg class="ic"><use href="#i-home"/></svg>Home</a>
  <a href="${up}#work" class="on"><svg class="ic"><use href="#i-grid"/></svg>Work</a>
  <a href="${up}#index"><svg class="ic"><use href="#i-list"/></svg>Index</a>
  <a href="${up}#about"><svg class="ic"><use href="#i-person"/></svg>About</a>
  <a href="${up}#contact"><svg class="ic"><use href="#i-mail"/></svg>Contact</a>
</div>`;
}

function siteFooter(up) {
  return `<footer>
  <div class="wrap">
    <a class="ft-mark" href="${up}">NAGUIB</a>
    <div class="ft-tag">Sculpt &middot; Retopo &middot; Texture &middot; Light &middot; Render</div>
    <div class="ft-meta">
      <span>&copy; 2026 Ahmed Naguib</span><i></i>
      <span>Marseille, France</span><i></i>
      <span class="ar">أحمد نجيب</span>
    </div>
  </div>
</footer>`;
}

function page(p, i) {
  const slug = slugs[i];
  const url  = `${SITE}/work/${slug}/`;
  const prev = i > 0 ? list[i - 1] : null;
  const next = i < list.length - 1 ? list[i + 1] : null;
  const desc = describe(p);
  const meta = metaDesc(p);
  const cat  = CAT[p.cat] || p.cat;

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
    /* the same @id as the Person on the home page, so every page reinforces
       one entity rather than describing strangers who share a name */
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

  const step = (q, label, icon, cls) => q
    ? `<a class="pn ${cls}" href="../${slugs[list.indexOf(q)]}/">
         <span class="pn-d"><svg class="ic"><use href="#${icon}"/></svg>${label}</span>
         <span class="pn-t${isAR(q.title) ? ' ar' : ''}">${esc(q.title)}</span></a>`
    : '<span></span>';

  const ar = isAR(p.title) ? ' lang="ar" dir="rtl"' : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>${esc(p.title)} — Ahmed Naguib | أحمد نجيب</title>
<meta name="description" content="${esc(meta)}" />
<meta name="theme-color" content="#080708" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="Ahmed Naguib" />
<meta property="og:title" content="${esc(p.title)} — Ahmed Naguib" />
<meta property="og:description" content="${esc(meta)}" />
<meta property="og:image" content="${SITE}/assets/work/${p.id}.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)} — Ahmed Naguib" />
<meta name="twitter:image" content="${SITE}/assets/work/${p.id}.jpg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;700;800;900&family=Archivo:wght@300;400;500;600;700&family=Cairo:wght@300;400;600;700&display=swap" rel="stylesheet" />
<link rel="icon" type="image/x-icon" href="../../assets/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon-32.png" />
<link rel="stylesheet" href="../../studio.css?v=${V}" />
<link rel="stylesheet" href="../../project.css?v=${V}" />
<script type="application/ld+json">${JSON.stringify(ld, null, 1)}</script>
<script type="application/ld+json">${JSON.stringify(crumbs, null, 1)}</script>
<script defer src="../../chrome.js?v=${V}"></script>
<script defer src="../../project.js?v=${V}"></script>
</head>
<body class="pj">
${SPRITE}
<div id="cur" data-t="Zoom"></div>
<div id="prog"></div>

${siteNav('../../')}

<main class="pj-wrap">
  <div class="wrap">
    <a href="../../#work" class="pj-back"><svg class="ic"><use href="#i-prev"/></svg>All work</a>

    <header class="pj-head">
      <p class="lbl">${esc(cat)}${p.year ? ' &middot; ' + p.year : ''} &middot; ${pad(i + 1)} of ${pad(list.length)}</p>
      <h1 class="d2 pj-title${isAR(p.title) ? ' ar' : ''}"${ar}>${esc(p.title)}</h1>
    </header>

    <figure class="pj-stage" data-cur="Zoom">
      <img class="pj-img" src="${frame(p)}" alt="${esc(p.title)} — 3D render by Ahmed Naguib"
           width="1600" height="900" fetchpriority="high" />
      <button class="pj-zoom" type="button" aria-label="View ${esc(p.title)} full size">
        <svg class="ic"><use href="#i-expand"/></svg>
      </button>
    </figure>

    <div class="pj-grid">
      <div class="pj-copy">
        <p class="lbl">The brief</p>
${desc.split(/\n{2,}/).map(par => `        <p>${esc(par.trim())}</p>`).join('\n')}
        <a class="btn btn-b pj-src" href="${frame(p)}" target="_blank" rel="noopener">
          <svg class="ic"><use href="#i-out"/></svg>Open the full frame</a>
      </div>
      <dl class="pj-facts">
        ${p.prod ? `<div><dt>Production</dt><dd>${esc(p.prod)}</dd></div>` : ''}
        <div><dt>Category</dt><dd>${esc(cat)}</dd></div>
        ${p.year ? `<div><dt>Year</dt><dd>${p.year}</dd></div>` : ''}
        <div><dt>Role</dt><dd>${esc(p.role || DEFAULTS.role)}</dd></div>
        ${p.soft ? `<div><dt>Built in</dt><dd>${esc(p.soft)}</dd></div>` : ''}${factsOf(p).map(f => `\n        <div><dt>${esc(String(f.k))}</dt><dd${isAR(String(f.v)) ? ' lang="ar" dir="rtl"' : ''}>${esc(String(f.v))}</dd></div>`).join('')}
      </dl>
    </div>

    <nav class="pj-pn">
      ${step(prev, 'Previous', 'i-prev', 'pn-prev')}
      ${step(next, 'Next', 'i-arrow', 'pn-next')}
    </nav>

    <section class="pj-more">
      <p class="lbl">More from the bench</p>
      <div class="mw">
${moreWork(i).map(n => {
  const q = list[n];
  return `        <a class="mw-c" href="../${slugs[n]}/">
          <span class="mw-fr"><img src="${small(q)}" alt="${esc(q.title)}" loading="lazy" decoding="async" width="880" height="495" /></span>
          <span class="mw-t${isAR(q.title) ? ' ar' : ''}">${esc(q.title)}</span>
          <span class="mw-m">${esc(CAT[q.cat] || q.cat)}${q.year ? ' · ' + q.year : ''}</span></a>`;
}).join('\n')}
      </div>
      <a class="mw-all" href="../../#index">See all ${list.length} pieces <svg class="ic"><use href="#i-arrow"/></svg></a>
    </section>

    <div class="pj-cta">
      <a href="../../#contact" class="btn btn-a"><svg class="ic"><use href="#i-mail"/></svg>Work with me</a>
    </div>
  </div>
</main>

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
