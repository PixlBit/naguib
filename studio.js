/* ════════════════════════════════════════════════════════════════════════
   NAGUIB — the workshop engine.

   The data first, then the things built from it. Every render belongs to
   this repository and ships from assets/ in two sizes: the page loads the
   small one, the lightbox the large. No third party is asked for a single
   pixel of the work, which is why the content policy has nothing in
   frame-src and why a card cannot go blank because somebody else's API
   throttled.

   The work console (studio-admin.html) and the project-page generator
   (tools/build-project-pages.mjs) both read the eight blocks below straight
   out of this file, so their shape is a contract: PROJECTS, CAT, CAT_RANK,
   AUTO_ORDER, ARCHIVE, ACAT, CONCEPTS and HERO_ART.
   ════════════════════════════════════════════════════════════════════════ */

/* ════ DATA — the work ═══════════════════════════════════════════════════
   One entry per render. `id` is both the identity of the piece and the name
   of its file: assets/work/<id>.jpg is the full frame and <id>-sm.jpg the
   one the page loads. Drop the two JPEGs in, paste a line here, and the
   plate, the index, the lightbox and the page at /work/<id>/ all follow.

     cat    one of the keys in CAT below
     hi     leads the section — the first plate on the page
     prod   the production it was made for
     soft   the software it was built in
     desc   real copy for the plate, the project page, its meta description
            and its structured data
                                                                            */
const HERO_ART = 'assets/hero-art.png';
const PROJECTS = [
  {title:"The Hawaiian Alien Dancer", id:"hawaiian-alien-dancer", cat:"characters", year:"2025", hi:true,
   prod:"Les Yeux du Large", soft:"ZBrush · 3ds Max · Substance Painter",
   desc:"The hardest design on the film, and the only one built without a concept sketch — pure visual research, then straight into ZBrush. An outer-space fantasy needed a dancer who could not have come from Earth, so the silhouette fuses a Hawaiian hula dancer with an extraterrestrial: octopus tentacles for hair, a shell headdress, skin patterned like a reef."},
  {title:"The Corporation Hangar Wall", id:"corporation-hangar-wall", cat:"environment", year:"2025", hi:true,
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter · Unreal Engine",
   desc:"A modular hangar wall for Sector G-21, built to read as one continuous structure however the shot is framed. The corporate seal is sunk into the panel rather than decalled onto it, so it catches the light with the plate; wear, dust and edge damage are painted against the film's grade."},
  {title:"Astranova Billboard", id:"astranova-billboard", cat:"environment", year:"2025", hi:true,
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter · Photoshop",
   desc:"A space billboard advertising Astranova, Outerworlds Atlantica — an in-world advertisement designed as a period poster first and modelled second. The frame is battered sheet metal on cast mounts; the artwork was painted separately so it could be swapped for a second placement without re-texturing the prop."},
  {title:"Mine Wagon", id:"mine-wagon", cat:"props", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A hero prop for the mine track: a stylised ore wagon with a caged lantern, oxidised iron and split-timber planking. Modelled to a game budget and hand-painted so the silhouette still reads at racing speed."},
  {title:"Nuclear Waste Disposal Bin", id:"nuclear-waste-bin", cat:"props", year:"2025",
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter",
   desc:"Set dressing that had to survive a close-up: banded panels, recessed latches and a stencilled hazard label worn back to the metal. The typography is part of the texture, not a decal, so it ages with the surface underneath it."},
  {title:"Pilot Seat", id:"pilot-seat", cat:"props", year:"2025",
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter",
   desc:"A single-column pilot seat for the bridge — stitched leather over a machined post, polished where hands and boots land and dulled everywhere else. The wear pattern is the storytelling: this chair has been sat in for years."},
  {title:"Security Barrier", id:"security-barrier", cat:"props", year:"2025",
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter",
   desc:"A pipework barrier assembled from a small kit of joints, clamps and tape wraps so it can be re-laid to any length in the set. Built as a modular piece from the start rather than a single mesh, which is what made it usable in three different shots."},
  {title:"Asteroid", id:"asteroid", cat:"environment", year:"2025",
   prod:"Les Yeux du Large", soft:"ZBrush · Substance Painter",
   desc:"A sculpted asteroid with an iridescent mineral crust — the ore is in the shader, the craters are in the sculpt. Dressed with a rim of cold light so it separates from the black of space without a matte behind it."},
  {title:"The Stone Ark", id:"the-stone-ark", cat:"environment", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A fractured stone gateway that marks a section of the racing circuit. Carved detail is baked from a high-poly sculpt onto a low-poly shell so it holds up at track speed, with moss and mineral staining painted into the cracks."},
  {title:"Iron Anvil", id:"iron-anvil", cat:"props", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A blacksmith's anvil for the forge set — cast iron with a hammered face, chamfered horn and a stone footing. A small prop, treated as a study in reading weight through silhouette and specular alone."},
  {title:"Wood & Metal Handle Mug", id:"wood-metal-mug", cat:"props", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A tavern mug banded in riveted iron over split staves. Two materials meeting on one small object is the whole exercise: the join has to be believable at any distance, so the wood is cut, not shrunk, around every band."},
  {title:"Comm Terminal", id:"comm-terminal", cat:"hardsurface", year:"2025",
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter",
   desc:"A field communication terminal with a live waveform display, a stamped keypad and a folding antenna. Emissive is kept to the screen alone so the unit still reads as a solid object in a dark cabin."},
  {title:"Field Radio Unit", id:"field-radio-unit", cat:"hardsurface", year:"2025",
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter",
   desc:"Three gauges, a vent stack and a recessed readout in one machined housing. Panel gaps, screw heads and scratch passes are all in the bake — the low-poly is a box until the normal map lands on it."},
  {title:"Kevin the Wooden Stick", id:"kevin-the-wooden-stick", cat:"characters", year:"2025",
   prod:"Hug Back Studio — internship", soft:"ZBrush · Nomad Sculpt",
   desc:"Character design and ZBrush sculpt made during a three-month internship at Hug Back Studio. A walking stick with a face: the grain has to run through the character so the head reads as carved from the same branch as the crook."},
  {title:"The Hawaiian Alien Dancer — Full Body", id:"alien-dancer-full-body", cat:"characters", year:"2025",
   prod:"Les Yeux du Large", soft:"ZBrush · Maya · Substance Painter",
   desc:"The full figure on her plinth, ukulele in hand — leaf skirt, shell lei and a pose set for the film's opening frame. Proportions were pushed twice after animation tests: a silhouette that works in a turntable does not always work in a shot."},
];

/* ════ CATEGORIES ════ */
const CAT = {all:"ALL", characters:"CHARACTERS", environment:"ENVIRONMENTS", props:"PROPS", hardsurface:"HARD SURFACE"};

/* Characters lead, then environments, props, and the hard-surface studies.
   Set AUTO_ORDER true and the array sorts itself by this ranking; leave it
   false and the order above is used verbatim. */
const CAT_RANK = {characters:0, environment:1, props:2, hardsurface:3};
const AUTO_ORDER = false;
if(AUTO_ORDER) PROJECTS.sort((a,b) => (CAT_RANK[a.cat] ?? 99) - (CAT_RANK[b.cat] ?? 99));

/* ════ DETAIL PASSES ═════════════════════════════════════════════════════
   Turnarounds, back views and the studies that sit behind a hero render.
   They are the same work seen from another side, so they live in the index
   rather than taking a plate of their own.                                */
const ARCHIVE = [
  {title:"Alien Dancer — Back Detail",     id:"alien-dancer-back-detail",     cat:"characters",  year:"2025", prod:"Les Yeux du Large", soft:"ZBrush · Substance Painter"},
  {title:"Alien Dancer — Rear Turnaround", id:"alien-dancer-rear-turnaround", cat:"characters",  year:"2025", prod:"Les Yeux du Large", soft:"ZBrush · Substance Painter"},
  {title:"Signal Deck",                    id:"signal-deck",                  cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Radiation Gauge",                id:"radiation-gauge",              cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Billboard — Electronics Bay",    id:"billboard-electronics",        cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Bumper Block",                   id:"bumper-block",                 cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
  {title:"Track Bogie",                    id:"track-bogie",                  cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
  {title:"Pipe Junction",                  id:"pipe-junction",                cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
];
const ACAT = {all:"ALL", characters:"CHARACTERS", hardsurface:"HARD SURFACE"};

/* ════ THE SKETCHBOOK ════════════════════════════════════════════════════
   The 2D that came before the 3D. A title and a file name is all a sheet
   is — there is no category to file a drawing under and no page to give it. */
const CONCEPTS = [
  {title:"Cockpit & Helm Layout",   id:"cockpit-helm-layout"},
  {title:"Emergency Alarm Device",  id:"emergency-alarm-device"},
  {title:"Space Billboard — Paint", id:"space-billboard-paint"},
  {title:"Ship's Helm",             id:"ships-helm"},
  {title:"Main Center Screen",      id:"main-center-screen"},
  {title:"Left Side Screen",        id:"left-side-screen"},
  {title:"Side Screen 01",          id:"side-screen-01"},
];

/* ── everything else on the page ─────────────────────────────────────── */
const BENCH = ['Character modeling','Digital sculpting','Hard-surface','Retopology',
  'UV unwrapping','Baking','Substance Painter','Look development','Lighting',
  'Concept art','Environments & props','World-building'];

const SKILLS = [
  {i:'i-clay',    n:'Digital sculpting',   d:'ZBrush and Nomad Sculpt, from a blocked mass to skin, cloth and surface noise.'},
  {i:'i-hand',    n:'Character design',    d:'Silhouette first. A design that cannot be read as a shadow is not finished.'},
  {i:'i-cage',    n:'Hard-surface',        d:'Panels, gaps, fasteners and machined edges that survive a close-up.'},
  {i:'i-chisel',  n:'Environments & props',d:'Modular kits built to be re-laid, not single meshes built for one shot.'},
  {i:'i-caliper', n:'Retopology',          d:'Quads that deform, edge loops where they are needed and nowhere else.'},
  {i:'i-uv',      n:'UV & baking',         d:'Layouts packed for the texel density the shot actually needs.'},
  {i:'i-brush',   n:'Texturing & PBR',     d:'Substance Painter. Wear that tells you who used the object and for how long.'},
  {i:'i-lamp',    n:'Lookdev & lighting',  d:'Marmoset and Unreal. One light that means something beats four that do not.'},
];

const PROCESS = [
  {i:'i-eye',    n:'Reference',  d:'Photographs, plans, and other people’s mistakes. The cheapest hour of the job.'},
  {i:'i-pencil', n:'Concept',    d:'Sketch until the silhouette works on paper. Rarely the first drawing.'},
  {i:'i-cage',   n:'Blockout',   d:'Primitives at true scale, in the shot, before a single detail exists.'},
  {i:'i-clay',   n:'High-poly',  d:'Sculpt or bevel up to the detail the camera will actually resolve.'},
  {i:'i-caliper',n:'Retopology', d:'A clean low-poly cage built over the sculpt, budgeted for its use.'},
  {i:'i-uv',     n:'UV unwrap',  d:'Seams hidden where the eye does not travel, shells packed by importance.'},
  {i:'i-render', n:'Bake',       d:'Normals, curvature, ambient occlusion and thickness, checked for skew.'},
  {i:'i-brush',  n:'Texture',    d:'Materials, then wear, then dirt — in that order, never the reverse.'},
  {i:'i-lamp',   n:'Light & render', d:'Key, rim and bounce. The frame that goes on the portfolio.'},
];

/* Each tool carries the id of a mark in the sprite at the top of
   index.html — drawn for this site from what the software does, never a
   copy of anybody's logo — and the one word it is used for. */
const TOOLKIT = [
  {n:'ZBrush',         i:'s-zbrush',    m:'Sculpting'},
  {n:'3ds Max',        i:'s-max',       m:'Modeling'},
  {n:'Maya',           i:'s-maya',      m:'Modeling'},
  {n:'Blender',        i:'s-blender',   m:'Modeling'},
  {n:'Substance',      i:'s-painter',   m:'Texturing'},
  {n:'Marmoset',       i:'s-marmoset',  m:'Lookdev'},
  {n:'Unreal',         i:'s-unreal',    m:'Real-time'},
  {n:'Nomad Sculpt',   i:'s-nomad',     m:'Sculpting'},
  {n:'RizomUV',        i:'s-rizom',     m:'Unwrapping'},
  {n:'Topogun',        i:'s-topogun',   m:'Retopology'},
  {n:'Photoshop',      i:'s-photoshop', m:'Retouching'},
  {n:'After Effects',  i:'s-after',     m:'Compositing'},
  {n:'Procreate',      i:'s-procreate', m:'Concept'},
  {n:'Quixel Bridge',  i:'s-quixel',    m:'Scan library'},
];

/* ════ THE PIECES, ADDRESSED ═════════════════════════════════════════════ */
const LIVE_IDS = new Set(PROJECTS.map(p => p.id));
const BY_ID = new Map(PROJECTS.map(p => [p.id, p]));
const VAULT = ARCHIVE.filter(p => !LIVE_IDS.has(p.id));

const sm = (p, dir) => 'assets/' + (dir || 'work') + '/' + p.id + '-sm.jpg';
const lg = (p, dir) => 'assets/' + (dir || 'work') + '/' + p.id + '.jpg';
const isAR = s => /[؀-ۿ]/.test(s);
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

/* Every piece also has its own page under /work/, generated by
   tools/build-project-pages.mjs — which reads THIS function out of this
   file, so the URL a link points at and the folder the generator writes
   can never disagree. */
function slugOf(p){
  if(p.slug) return p.slug;
  const s = p.title.normalize('NFKD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return s || 'project-'+p.id;
}

/* ════ THE BENCH — the strip of disciplines ════ */
function buildBench(){
  const t = document.getElementById('bench'); if(!t) return;
  const row = BENCH.map(x => '<span class="bench-i">'+x+'<i></i></span>').join('');
  t.innerHTML = row + row;          /* doubled, so the loop has no seam */
}

/* ════ THE PLATES ════════════════════════════════════════════════════════
   A grid of tiles is how you show a hundred thumbnails; he has fifteen
   pieces worth looking at, so each gets a plate — the render at the size it
   was made to be seen, and beside it the few facts that matter. They
   alternate sides, which walks the eye down the page instead of letting it
   scan a column.                                                          */
function buildPlates(){
  const box = document.getElementById('plates'); if(!box) return;
  box.innerHTML = PROJECTS.map((p,i) => `
    <article class="plate${p.hi ? ' lead' : ''}" data-id="${esc(p.id)}">
      <div class="plate-art" data-cur="Open" data-open="${esc(p.id)}">
        <span class="plate-n">${pad2(i+1)}</span>
        <div class="plate-fr">
          <img src="${sm(p)}" alt="${esc(p.title)} — 3D render by Ahmed Naguib"
               loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async" width="880" height="495" />
        </div>
      </div>
      <div class="plate-body">
        <p class="lbl plate-cat">${esc(CAT[p.cat] || p.cat)}${p.year ? ' &middot; ' + p.year : ''}</p>
        <h3 class="plate-t${isAR(p.title)?' ar':''}"><a href="work/${slugOf(p)}/">${esc(p.title)}</a></h3>
        ${p.desc ? '<p class="plate-desc">'+esc(p.desc)+'</p>' : ''}
        <dl class="plate-facts">
          ${p.prod ? `<div class="plate-fact"><dt>Production</dt><dd>${esc(p.prod)}</dd></div>` : ''}
          ${p.soft ? `<div class="plate-fact"><dt>Built in</dt><dd>${esc(p.soft)}</dd></div>` : ''}
        </dl>
        <a class="plate-go" href="work/${slugOf(p)}/">Open the project<i></i></a>
      </div>
    </article>`).join('');

  const c = document.getElementById('work-count');
  if(c) c.innerHTML = '<b>'+PROJECTS.length+'</b> pieces &middot; '
    + new Set(PROJECTS.map(p=>p.cat)).size + ' categories';
}

/* ════ THE INDEX ═════════════════════════════════════════════════════════
   The plates are the argument; this is the evidence. Every piece on the
   site as one typographic list, with the render following the pointer.   */
const ALL = [...PROJECTS, ...VAULT];
function buildIndex(){
  const box = document.getElementById('idx'); if(!box) return;
  box.innerHTML = ALL.map((p,i) => {
    const page = BY_ID.has(p.id);
    const tag  = page ? 'a' : 'button';
    const attr = page ? ` href="work/${slugOf(p)}/"` : ' type="button"';
    return `<${tag} class="idx-row"${attr} data-peek="${sm(p)}" data-open="${esc(p.id)}" data-cur="${page?'Page':'Open'}">
      <span class="idx-n">${pad2(i+1)}</span>
      <span class="idx-t${isAR(p.title)?' ar':''}">${esc(p.title)}</span>
      <span class="idx-p">${esc(p.prod || '')}</span>
      <span class="idx-s">${esc((CAT[p.cat]||p.cat||'').toLowerCase())}${p.year?' · '+p.year:''}</span>
      <svg class="ic idx-go"><use href="#i-arrow"/></svg>
    </${tag}>`;
  }).join('');

  const c = document.getElementById('idx-count');
  if(c) c.innerHTML = '<b>'+ALL.length+'</b> renders &middot; '+PROJECTS.length
    +' with a page &middot; '+VAULT.length+' detail passes';
  initPeek();
}

/* the preview that follows the pointer down the list */
function initPeek(){
  const peek = document.getElementById('peek');
  const img  = peek && peek.querySelector('img');
  if(!peek || !img || !matchMedia('(pointer:fine)').matches || window.CALM) return;
  let x = 0, y = 0, run = false, on = false;
  const frame = () => {
    run = false;
    peek.style.transform = `translate3d(${x + 26}px,${y - 84}px,0) scale(${on ? 1 : .94})`;
  };
  document.querySelectorAll('.idx-row').forEach(row => {
    row.addEventListener('pointerenter', () => {
      const src = row.dataset.peek;
      if(img.getAttribute('src') !== src) img.src = src;
      on = true; peek.classList.add('on');
    });
    row.addEventListener('pointerleave', () => { on = false; peek.classList.remove('on'); });
  });
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if(!run){ run = true; requestAnimationFrame(frame); }
  }, {passive:true});
}

/* ════ SKILLS, PROCESS, SHEETS, RACK ════ */
function buildSkills(){
  const box = document.getElementById('skill-grid'); if(!box) return;
  box.innerHTML = SKILLS.map((s,i) => `
    <div class="skill rv" style="--d:${i*45}ms">
      <span class="skill-i">${pad2(i+1)}</span>
      <svg class="ic"><use href="#${s.i}"/></svg>
      <h3 class="skill-n">${s.n}</h3>
      <p class="skill-d">${s.d}</p>
    </div>`).join('');
}

function buildProcess(){
  const box = document.getElementById('proc'); if(!box) return;
  box.innerHTML = PROCESS.map((s,i) => `
    <div class="step" style="--d:${i*60}ms">
      <div class="step-n">${pad2(i+1)}</div>
      <svg class="ic"><use href="#${s.i}"/></svg>
      <h3 class="step-t">${s.n}</h3>
      <p class="step-d">${s.d}</p>
    </div>`).join('');
  /* The steps light one after another as the section is read, so the page
     performs the sequence it is describing instead of illustrating it. */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(!e.isIntersecting) return;
    const i = [...box.children].indexOf(e.target);
    setTimeout(() => e.target.classList.add('lit'), (i % 3) * 110);
    io.unobserve(e.target);
  }), {threshold:.35});
  [...box.children].forEach(el => io.observe(el));
}

function buildSheets(){
  const box = document.getElementById('sheet-grid'); if(!box) return;
  box.innerHTML = CONCEPTS.map((p,i) => `
    <figure class="sheet rv" style="--d:${i*50}ms" data-cur="Open"
            data-open="${esc(p.id)}" data-dir="concept">
      <div class="sheet-fr">
        <img src="${sm(p,'concept')}" alt="${esc(p.title)} — concept sheet by Ahmed Naguib"
             loading="lazy" decoding="async" width="760" height="570" />
      </div>
      <figcaption>
        <div class="sheet-t">${esc(p.title)}</div>
        <div class="sheet-n">Sheet ${pad2(i+1)}</div>
      </figcaption>
    </figure>`).join('');
  const c = document.getElementById('sheet-count');
  if(c) c.innerHTML = '<b>'+CONCEPTS.length+'</b> sheets &middot; pencil, ink, digital';
}

function buildTools(){
  const box = document.getElementById('tool-rack'); if(!box) return;
  box.innerHTML = TOOLKIT.map((t,i) => `
    <span class="tool" style="--i:${i * 90}ms">
      <svg class="ic"><use href="#${t.i}"/></svg>
      <span><b class="tool-n">${t.n}</b><span class="tool-m">${t.m}</span></span>
    </span>`).join('');
}

/* ════ THE FRAME, FULL SIZE ══════════════════════════════════════════════
   The small rendition is already decoded — it is what the page was
   showing — so it is blurred in behind the full frame while that decodes,
   and the frame is never empty for a beat. Arrow keys and the two buttons
   walk whichever list it was opened from.                               */
const box = {
  el:null, list:[], i:-1, dir:'work',
  open(id, dir){
    this.el = this.el || document.getElementById('box');
    this.dir = dir || 'work';
    this.list = dir === 'concept' ? CONCEPTS : ALL;
    this.i = this.list.findIndex(p => p.id === id);
    if(this.i < 0) return;
    this.paint();
    this.el.classList.add('open');
    this.el.classList.toggle('sq', this.dir === 'concept');
    document.body.style.overflow = 'hidden';
  },
  paint(){
    const p = this.list[this.i];
    const img = document.getElementById('box-img');
    const bg  = document.getElementById('box-bg');
    bg.style.backgroundImage = 'url('+sm(p, this.dir)+')';
    img.classList.remove('rdy');
    img.alt = p.title;
    img.onload = () => img.classList.add('rdy');
    img.src = lg(p, this.dir);
    document.getElementById('box-t').textContent = p.title;
    document.getElementById('box-m').textContent =
      [p.prod, p.soft, p.year].filter(Boolean).join('  ·  ');
    const page = document.getElementById('box-page');
    const full = BY_ID.get(p.id);
    page.hidden = !full;
    if(full) page.href = 'work/'+slugOf(full)+'/';
  },
  step(d){
    if(this.i < 0) return;
    this.i = (this.i + d + this.list.length) % this.list.length;
    this.paint();
  },
  close(){
    if(!this.el) return;
    this.el.classList.remove('open','sq');
    document.body.style.overflow = '';
    this.i = -1;
  }
};

function initBox(){
  const el = document.getElementById('box'); if(!el) return;
  document.getElementById('box-x').addEventListener('click', () => box.close());
  document.getElementById('box-prev').addEventListener('click', e => { e.stopPropagation(); box.step(-1); });
  document.getElementById('box-next').addEventListener('click', e => { e.stopPropagation(); box.step(1); });
  el.addEventListener('click', e => { if(e.target === el) box.close(); });
  addEventListener('keydown', e => {
    if(!el.classList.contains('open')) return;
    if(e.key === 'Escape') box.close();
    if(e.key === 'ArrowRight') box.step(1);
    if(e.key === 'ArrowLeft')  box.step(-1);
  });

  /* One listener for the whole document rather than one per card: the
     plates, the sheets and the index rows all say what they open with a
     data attribute, so nothing has to be re-wired when a list is rebuilt. */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open]');
    if(!t) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    /* an index row IS a link to the page — the frame is for the plates and
       the sheets, and for the rows that have no page of their own */
    if(t.tagName === 'A' && t.getAttribute('href')) return;
    e.preventDefault();
    box.open(t.dataset.open, t.dataset.dir);
  });
}

/* ════ THE LOADER ════════════════════════════════════════════════════════
   Four real milestones, each worth what it costs, and the screen lifts when
   they are all in. Nothing here is a timer pretending to be progress — but
   nothing is allowed to hold the screen for more than three seconds either,
   because a loader that can trap somebody is worse than one that lies.   */
function initLoader(){
  const ldr = document.getElementById('ldr');
  if(!ldr) return;
  const arc = document.getElementById('ld-arc');
  const say = document.getElementById('ld-say');
  const STEP = {
    dom:   {w:14, say:'SETTING THE BENCH'},
    fonts: {w:26, say:'CUTTING THE TYPE'},
    build: {w:34, say:'LAYING OUT THE WORK'},
    art:   {w:26, say:'LIGHTING THE FIRST PIECE'},
  };
  const done = new Set();
  let at = 0, lifted = false;
  const mark = name => {
    if(lifted || done.has(name) || !STEP[name]) return;
    done.add(name);
    at += STEP[name].w;
    if(arc) arc.style.strokeDasharray = Math.min(100, at) + ' 100';
    const next = Object.keys(STEP).find(k => !done.has(k));
    if(say) say.textContent = next ? STEP[next].say : 'READY';
    if(at >= 100) lift();
  };
  function lift(){
    if(lifted) return;
    lifted = true;
    if(arc) arc.style.strokeDasharray = '100 100';
    setTimeout(() => {
      ldr.classList.add('out');
      setTimeout(() => ldr.remove(), 800);
      const art = document.querySelector('.h-art img');
      if(art) art.classList.add('rdy');
      /* The life rule sits at the very bottom of the first screen, which is
         inside the viewport but outside the reveal observer's margin — that
         margin exists so nothing animates while it is still half off the
         page. It belongs to the hero's entrance rather than to the scroll,
         so it is let in here, by hand, as the screen lifts. */
      const life = document.getElementById('h-life');
      if(life) setTimeout(() => life.classList.add('in'), 420);
      if(window.reveal) window.reveal();
    }, 220);
  }

  mark('dom');
  if(document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => mark('fonts')).catch(() => mark('fonts'));
  else mark('fonts');

  requestAnimationFrame(() => { BUILD(); mark('build'); });

  const art = document.querySelector('.h-art img');
  if(!art) mark('art');
  else if(art.complete && art.naturalWidth) mark('art');
  else if(art.decode) art.decode().then(() => mark('art')).catch(() => mark('art'));
  else art.addEventListener('load', () => mark('art'), {once:true});

  setTimeout(() => mark('fonts'), 2200);
  setTimeout(() => mark('art'), 2600);
  setTimeout(lift, 3200);                        /* nothing waits past this */
}

/* ════ BUILD ════════════════════════════════════════════════════════════
   Each step is independent — the rack knows nothing about the plates — so
   one that throws fails alone and says which it was, rather than taking
   every step after it down in silence.                                   */
function BUILD(){
  const step = (name, fn) => {
    try { fn(); } catch(err){ console.error('BUILD step "'+name+'" failed:', err); }
  };
  step('bench', buildBench);
  step('plates', buildPlates);
  step('index', buildIndex);
  step('skills', buildSkills);
  step('process', buildProcess);
  step('sheets', buildSheets);
  step('rack', buildTools);
  step('frame', initBox);
  if(window.reveal) window.reveal();
}

initLoader();
