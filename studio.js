/* ════ NAGUIB STUDIO — engine (3D portfolio: stills, not film) ════════════

   Same instrument panel as a film site, driving a different medium. A 3D
   asset has no player and no runtime, so where a video portfolio fetches a
   poster from a host and builds an iframe on click, this one owns its
   frames: every render ships from assets/work/ in two sizes, the grid takes
   the small one and the lightbox the large. No third-party request is made
   for a single pixel of the work.                                        */
const IS_MOBILE = matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && innerWidth < 900);
document.body.classList.add(IS_MOBILE ? 'exp-mobile' : 'exp-desktop');

/* sound.js defines SFX. If it never arrives — blocked, a bad cache, a 404 —
   the interface has to carry on in silence rather than throw on every hover. */
window.SFX = window.SFX || { play(){}, scroll(){}, loading(){}, loaded(){},
  get enabled(){ return false; }, get available(){ return false; } };

/* ════ DATA — the work ═══════════════════════════════════════════════════
   One entry per render. `id` is both the identity of the piece and the name
   of its file: assets/work/<id>.jpg is the full frame and assets/work/<id>-sm.jpg
   the one the grid loads. Nothing else has to be kept in step — drop the two
   JPEGs in, paste a line here, and the card, the filter counts, the lightbox
   and the project page under /work/<id>/ all follow.

     cat    one of the keys in CAT below
     hi     full-bleed banner spanning the grid row
     prod   the production it was made for — shown on the card and the page
     soft   the software it was built in
     desc   real copy for the project page, its meta description and its
            structured data. Worth writing: a generated sentence ranks nothing.
                                                                            */
const HERO_ART = 'assets/hero-art.png';
const PROJECTS = [
  {title:"The Hawaiian Alien Dancer", id:"hawaiian-alien-dancer", cat:"characters", year:"2025", hi:true,
   prod:"Les Yeux du Large", soft:"ZBrush · 3ds Max · Substance Painter",
   desc:"The hardest design on the film, and the only one built without a concept sketch — pure visual research, then straight into ZBrush. An outer-space fantasy needed a dancer who could not have come from Earth, so the silhouette fuses a Hawaiian hula dancer with an extraterrestrial: octopus tentacles for hair, a shell headdress, skin patterned like a reef. Sculpted, retopologised, UV'd and textured for real-time in Unreal Engine."},
  {title:"The Corporation Hangar Wall", id:"corporation-hangar-wall", cat:"environment", year:"2025", hi:true,
   prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter · Unreal Engine",
   desc:"A modular hangar wall for Sector G-21, built to read as one continuous structure however the shot is framed. The corporate seal is sunk into the panel rather than decalled onto it, so it catches the light with the plate; wear, dust and edge damage are painted in Substance Painter against the film's grade."},
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

/* Strongest work first: characters lead, then environments, props, and the
   hard-surface studies last. Set AUTO_ORDER true and the array sorts itself
   by this ranking; leave it false and the order above is used verbatim.    */
const CAT_RANK = {characters:0, environment:1, props:2, hardsurface:3};
const AUTO_ORDER = false;
if(AUTO_ORDER) PROJECTS.sort((a,b) => (CAT_RANK[a.cat] ?? 99) - (CAT_RANK[b.cat] ?? 99));

/* ════ DETAIL PASSES — second grid, same card engine ═════════════════════
   Turnarounds, back views and the studies that sit behind a hero render.
   They are the same work seen from another side, so they get their own
   shelf rather than padding the selected grid with near-duplicates.       */
const ARCHIVE = [
  {title:"Alien Dancer — Back Detail",      id:"alien-dancer-back-detail",      cat:"characters",  year:"2025", prod:"Les Yeux du Large", soft:"ZBrush · Substance Painter"},
  {title:"Alien Dancer — Rear Turnaround",  id:"alien-dancer-rear-turnaround",  cat:"characters",  year:"2025", prod:"Les Yeux du Large", soft:"ZBrush · Substance Painter"},
  {title:"Signal Deck",                          id:"signal-deck",                   cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Radiation Gauge",                      id:"radiation-gauge",               cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Billboard — Electronics Bay",     id:"billboard-electronics",         cat:"hardsurface", year:"2025", prod:"Les Yeux du Large", soft:"3ds Max · Substance Painter"},
  {title:"Bumper Block",                         id:"bumper-block",                  cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
  {title:"Track Bogie",                          id:"track-bogie",                   cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
  {title:"Pipe Junction",                        id:"pipe-junction",                 cat:"hardsurface", year:"2024", prod:"Fantasy Racers",    soft:"3ds Max · Substance Painter"},
];
const ACAT = {all:"ALL", characters:"CHARACTERS", hardsurface:"HARD SURFACE"};
/* anything already in the selected grid is dropped from the second one */
const LIVE_IDS = new Set(PROJECTS.map(p => p.id));
/* id → project, so the lightbox can offer a link to that project's own page */
const BY_ID = new Map(PROJECTS.map(p => [p.id, p]));
const VAULT = ARCHIVE.filter(p => !LIVE_IDS.has(p.id));

/* ════ THE CONCEPT LAB ═══════════════════════════════════════════════════
   The 2D that comes before the 3D. Same shape as a project, drawn from
   assets/concept/ instead, and shown on a 4:3 card because a drawing is
   not a render and should not pretend to be one.                          */
const CONCEPTS = [
  {title:"Cockpit & Helm Layout",     id:"cockpit-helm-layout"},
  {title:"Emergency Alarm Device",    id:"emergency-alarm-device"},
  {title:"Space Billboard — Paint", id:"space-billboard-paint"},
  {title:"Ship's Helm",               id:"ships-helm"},
  {title:"Main Center Screen",        id:"main-center-screen"},
  {title:"Left Side Screen",          id:"left-side-screen"},
  {title:"Side Screen 01",            id:"side-screen-01"},
];
/* the line that types itself above the concept rail */
const PROMPTS = [
  'brief: bridge of a salvage ship, ancient tech, hand-drawn',
  'brief: an alarm device nobody has serviced in forty years',
  'brief: a billboard that has been in orbit since the sixties',
  'brief: the helm — part ship’s wheel, part reactor',
];
const ARTS = [
  '<svg viewBox="0 0 200 200" stroke="#e0803c" fill="none" stroke-width=".5"><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="40"/><line x1="30" y1="100" x2="170" y2="100"/><line x1="100" y1="30" x2="100" y2="170"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#3ee0d0" fill="none" stroke-width=".5"><polyline points="10,180 50,70 100,120 150,30 190,180"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#e0803c" fill="none" stroke-width=".5"><rect x="20" y="20" width="160" height="160"/><rect x="55" y="55" width="90" height="90"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#3ee0d0" fill="none" stroke-width=".5"><polygon points="100,20 180,170 20,170"/><polygon points="100,60 150,140 50,140"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#e0803c" fill="none" stroke-width=".5"><circle cx="100" cy="100" r="80"/><path d="M100,20L100,180 M20,100L180,100"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#3ee0d0" fill="none" stroke-width=".5"><polygon points="20,100 100,20 180,100 100,180"/><polygon points="60,100 100,60 140,100 100,140"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#e0803c" fill="none" stroke-width=".5"><rect x="30" y="60" width="140" height="80"/><circle cx="100" cy="100" r="20"/></svg>',
  '<svg viewBox="0 0 200 200" stroke="#3ee0d0" fill="none" stroke-width=".5"><polyline points="20,100 60,40 100,100 140,40 180,100"/><line x1="20" y1="140" x2="180" y2="140"/></svg>',
];
const FLOATS = ['floatUDsm 6.5s ease-in-out 0s infinite','floatUDsm 6.5s ease-in-out .7s infinite','floatUDsm 6.5s ease-in-out 1.4s infinite','floatLR 7.5s ease-in-out .35s infinite','floatLR 7.5s ease-in-out 1.15s infinite','floatUDsm 6.5s ease-in-out .55s infinite','floatUDsm 6.5s ease-in-out 1.9s infinite','floatLR 7.5s ease-in-out .85s infinite'];
/* pad(), the Marseille clock and the timecode ticker live in chrome.js — the
   project pages and the 404 wear the same header and footer. */
const isAR = s => /[\u0600-\u06FF]/.test(s);

/* ════ LIVE CLOCK — Marseille (day · date · time) ════ */
/* ════ POSTERS ═══════════════════════════════════════════════════════════
   Every frame is ours and sits next to the page, so there is no lookup to
   make and nothing to cache: the card takes the small rendition, the
   lightbox the large one. `base` lets a page one or two folders down
   (work/<slug>/) point at the same files.                                */
const ASSET_BASE = window.ASSET_BASE || '';
const posterSm = (p, dir) => ASSET_BASE+'assets/'+(dir||'work')+'/'+p.id+'-sm.jpg';
const posterLg = (p, dir) => ASSET_BASE+'assets/'+(dir||'work')+'/'+p.id+'.jpg';

/* ════ CURSOR ════ */
const cur = document.getElementById('cur');
const trDot = document.getElementById('tr');
/* chrome.js decides what kind of thing an element is, because every page
   needs that judgement and only this one loads studio.js. If it is missing,
   everything here is still safe — it just all sounds like `ui`. */
const kindOf = window.kindOf || (() => 'ui');
const goesAway = window.goesAway || (() => false);

/* Every interactive thing on the site already passes through here for the
   cursor, so it is also where the interface gets its voice — one hook
   instead of a listener bolted onto each of a hundred elements.

   A card's hover is pitched by how far down the viewport it sits, so running
   a cursor down the grid plays a rising phrase rather than the same blip
   thirty-five times. `play` still forces the film voice for the two grids
   that pass it, whatever else the element looks like. */
function addH(el, play=false){
  if(IS_MOBILE) return;
  el.__sfx = 1;                         /* claimed — the void click steps aside */
  const kind = play ? 'card' : kindOf(el);
  const away = goesAway(el);
  el.addEventListener('mouseenter', () => {
    cur.classList.add(play?'p':'h');
    if(kind === 'card'){
      const y = el.getBoundingClientRect().top / Math.max(1, innerHeight);
      SFX.play('hover.card', Math.min(1, Math.max(0, y)));
    } else SFX.play('hover.' + kind);
  });
  el.addEventListener('mouseleave', () => cur.classList.remove('p','h'));
  /* An element may name its own click voice with data-sfx; without that it
     gets the voice of its kind. Two calls for one click would just phase
     against each other, so nothing else fires a click sound by hand. */
  el.addEventListener('click', () =>
    SFX.play(el.dataset.sfx || (away ? 'away' : 'tap.' + kind)));
}
if(!IS_MOBILE){
  document.addEventListener('mousemove', e => {
    cur.style.left = e.clientX+'px'; cur.style.top = e.clientY+'px';
    setTimeout(() => { trDot.style.left = e.clientX+'px'; trDot.style.top = e.clientY+'px'; }, 70);
  });
}

/* ════ SMOOTH SCROLL (eased, nav-offset aware) ════ */
function initSmoothScroll(){
  const NAV = 56;
  let animating = false;
  function easeInOutCubic(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function scrollTo(target){
    const startY = scrollY;
    const endY = Math.max(0, target.getBoundingClientRect().top + scrollY - NAV);
    const dist = endY - startY;
    if(Math.abs(dist) < 4) return;
    const dur = Math.min(1300, Math.max(550, Math.abs(dist)*.55));
    let t0 = null; animating = true;
    function step(now){
      if(!t0) t0 = now;
      const p = Math.min((now-t0)/dur, 1);
      scrollTo_y(startY + dist*easeInOutCubic(p));
      if(p < 1 && animating) requestAnimationFrame(step);
      else animating = false;
    }
    requestAnimationFrame(step);
  }
  function scrollTo_y(y){ window.scrollTo(0, y); }
  // cancel on user input
  ['wheel','touchstart','keydown'].forEach(ev =>
    addEventListener(ev, () => { animating = false; }, {passive:true}));
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if(id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if(!target) return;
      e.preventDefault();
      scrollTo(target);
      history.replaceState(null, '', id);
    });
  });
}

/* ════ GRAIN — desktop only ════ */
/* Film grain. It used to build a fresh ImageData every 90ms — at 1440x900 that
   is 324k pixels of Math.random() eleven times a second, several million calls
   per second on the main thread. Boiling grain only needs a handful of frames
   cycled, which is how it is done on a bench, so the frames are rendered once
   and then swapped. Identical on screen, effectively free to run. */
/* ════ PERF guards ════ */
/* ════ THE LOADER ══════════════════════════════════════════════════════
   It used to be a lie. A setInterval added a random 1–3.5% every 46ms and
   called BOOT when the number reached a hundred — the bar was a countdown
   to nothing, unrelated to whether one byte of the site had arrived, and
   it hit 100% while the grid had not been built and the film had not
   started. A progress bar that does not track progress is set dressing.

   Now every percent is a thing that actually finished. Six of them, each
   worth what it costs, and the screen lifts when they are all in:

     dom     the markup is parsed — true the moment this file runs
     fonts   document.fonts.ready: the display face is decoded
     face    the portrait on the loader itself has decoded
     build   the page is BUILT — grids, ticker, clients, the lot
     load    window.load: every image, style and script in the markup
     hero    the film behind the hero is actually rolling, not merely
             embedded — the player says so itself

   The page is therefore finished before it is ever seen, rather than
   assembling itself in front of the visitor after a fake bar clears.

   Two safeguards, because a loader that can trap someone is worse than a
   loader that lies. Nothing is allowed to hold the screen for more than
   NEVER_LONGER; and the hero, the one milestone that depends on a third
   party, gets its own shorter patience — a hero frame that will not decode
   holds the site for that long and no longer.                        */
(() => {
  const wv = document.getElementById('l-wave');
  if(wv) for(let i=0;i<34;i++){
    const s = document.createElement('span');
    s.style.cssText = 'height:'+(Math.random()*17+3)+'px;animation-delay:'+(Math.random()*.9)+'s;animation-duration:'+(Math.random()*.5+.55)+'s';
    wv.appendChild(s);
  }
  const fill = document.getElementById('l-fill'), pct = document.getElementById('l-pct'),
        ltc  = document.getElementById('l-tc'),  say = document.getElementById('l-say');

  /* what each step is worth, and what to call it while it is happening */
  const STEP = {
    dom:   {w:8,  say:'READING MARKUP'},
    fonts: {w:14, say:'DECODING TYPE'},
    face:  {w:8,  say:'RESOLVING FRAME'},
    build: {w:34, say:'BUILDING THE GRID'},
    load:  {w:24, say:'FETCHING ASSETS'},
    hero:  {w:12, say:'DECODING THE FRAME'},
  };
  /* Every milestone that depends on somebody else's server gets its own
     deadline, not just the film. A route that never answers means window.load
     never fires either — with only one overall cap that turned a dead player
     into a thirteen-second wait, which is a worse loader than the fake one. */
  const PATIENCE = { fonts: 4000, face: 4000, load: 6000, hero: 2500 };
  const NEVER_LONGER = 8000, MIN_ON_SCREEN = 1100;

  const t0 = performance.now();
  const done = new Set();
  let target = 0, shown = 0, closing = false, lifted = false;

  function mark(name){
    if(done.has(name) || !STEP[name]) return;
    done.add(name);
    target += STEP[name].w;
    /* one blip per real milestone, climbing as the page fills */
    SFX.play('load', Math.min(1, target / 100));
    const next = Object.keys(STEP).find(k => !done.has(k));
    if(say) say.textContent = next ? STEP[next].say : 'READY';
    if(target >= 100) finish();
  }

  /* The bar eases toward the truth instead of jumping to it: the numbers
     arrive in six lumps, and a bar that teleports reads as broken even when
     it is honest. It can never pass what has actually completed. */
  function frame(){
    if(lifted) return;
    shown += (target - shown) * 0.12;
    if(target - shown < 0.4) shown = target;
    const v = Math.min(100, shown);
    if(fill) fill.style.width = v + '%';
    if(pct) pct.textContent = Math.floor(v) + '%';
    if(ltc){
      const f2 = Math.floor(v * 0.24);
      ltc.textContent = '00:'+pad(Math.floor(f2/1440)%60)+':'+pad(Math.floor(f2/24)%60)+':'+pad(f2%24);
    }
    SFX.loading(v / 100);
    /* the lift happens HERE, when the bar has actually arrived at a hundred —
       not on a timer running alongside it. A frame already scheduled would
       otherwise land after the jump and walk the bar back down. */
    if(closing && shown >= 99.9) return lift();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function finish(){
    if(closing) return;
    /* a loader that flashes past is worse than no loader — if everything was
       already cached, hold the screen long enough to be a beat, not a blink */
    const held = Math.max(0, MIN_ON_SCREEN - (performance.now() - t0));
    setTimeout(() => { closing = true; target = 100; }, held);
  }

  function lift(){
    if(lifted) return;
    lifted = true;
    if(fill) fill.style.width = '100%';
    if(pct) pct.textContent = '100%';
    if(say) say.textContent = 'READY';
    SFX.loaded();
    setTimeout(REVEAL, 260);
  }

  /* ── the six ─────────────────────────────────────────────────────── */
  mark('dom');                                   /* this file is running */

  if(document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => mark('fonts')).catch(() => mark('fonts'));
  else mark('fonts');

  const face = document.querySelector('#ldr .l-face');
  if(face && face.decode) face.decode().then(() => mark('face')).catch(() => mark('face'));
  else if(face && !face.complete) face.addEventListener('load', () => mark('face'), {once:true});
  else mark('face');

  if(document.readyState === 'complete') mark('load');
  else addEventListener('load', () => mark('load'), {once:true});

  /* BUILD is the expensive one and it is ours, so it goes now rather than
     after a countdown. Everything it makes is finished before anyone sees it. */
  requestAnimationFrame(() => { BUILD(); mark('build'); });

  /* the film reports for itself; window.__hero is set where the src is */
  const heroWatch = setInterval(() => {
    if(window.__hero && window.__hero.playing){ clearInterval(heroWatch); mark('hero'); }
  }, 120);

  /* nobody waits past their deadline, and nothing at all waits past the cap */
  for(const [name, ms] of Object.entries(PATIENCE))
    setTimeout(() => { if(name === 'hero') clearInterval(heroWatch); mark(name); }, ms);
  setTimeout(finish, NEVER_LONGER);
})();

/* ════ BUILDERS ════ */
function buildTicker(){
  const items = ['CHARACTER MODELING','DIGITAL SCULPTING','HARD-SURFACE MODELING','RETOPOLOGY','UV UNWRAPPING','SUBSTANCE PAINTER','LOOK DEVELOPMENT','LIGHTING & RENDER','CONCEPT ART','ENVIRONMENT & PROPS','KEYFRAME ANIMATION','WORLD-BUILDING'];
  const t = document.getElementById('t-track');
  [...items,...items].forEach(x => {
    const d = document.createElement('div'); d.className='t-item';
    d.innerHTML = x+'<div class="t-gem"></div>'; t.appendChild(d);
  });
}
function buildFilmstrips(){
  ['fs1','fs2','fs3','fs4'].forEach(id => {
    const t = document.getElementById(id); if(!t) return;
    for(let i=0;i<120;i++){ const h=document.createElement('div'); h.className='fs-hole'; t.appendChild(h); }
  });
}

/* ════ GRID CONFIGS — the live reel and the vault share one card engine ════ */
const GRIDS = {
  work:   {list:PROJECTS, cats:CAT,  filters:'wf',  grid:'wg',  label:'ASSET',  feat:true,  arch:false, dir:'work'},
  vault:  {list:VAULT,    cats:ACAT, filters:'af',  grid:'ag',  label:'STUDY',  feat:false, arch:true,  dir:'work'},
  lab:    {list:CONCEPTS, cats:null, filters:null,  grid:'cg',  label:'CONCEPT',feat:false, arch:true,  dir:'concept', sq:true},
};

/* Every live project also has its own page under /work/, generated by
   tools/build-project-pages.mjs — which reads THIS function, so the URL a
   card points at and the folder the generator writes can never disagree.
   An explicit `slug` on the project wins; an Arabic-only title has no
   sensible transliteration, so those carry one.                          */
function slugOf(p){
  if(p.slug) return p.slug;
  const s = p.title.normalize('NFKD').replace(/[̀-ͯ]/g,'')
    .toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return s || 'project-'+p.id;
}
function buildFilters(cfg){
  const cats = ['all', ...new Set(cfg.list.map(p=>p.cat))];
  const wf = document.getElementById(cfg.filters); if(!wf) return;
  wf.innerHTML='';
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'wf-btn'+(c==='all'?' on':'');
    btn.textContent = cfg.cats[c]||c.toUpperCase();
    btn.addEventListener('click', () => {
      wf.querySelectorAll('.wf-btn').forEach(b=>b.classList.remove('on'));
      btn.classList.add('on'); buildCards(c, cfg);
    });
    wf.appendChild(btn); addH(btn);
  });
}
/* A render has no embed and no player. What used to build an iframe now
   just names the file — kept as a function because the card, the lightbox
   and the project-page generator all ask the same question.            */
const frameSrc = (p, dir) => posterLg(p, dir);

/* A full-bleed card claims a whole grid row. Dropped in mid-row it would leave
   the rest of that row empty, so each highlight is held back until the row of
   normal cards is complete, and only one is released per break — that keeps the
   banners spread out instead of stacking. Desktop only; mobile is a swipe rail.
   Keep the number of non-highlight projects a multiple of the column count or
   the last row will come up short.                                            */
const gridCols = () => IS_MOBILE ? 2 : 3;
/* The row arrangement lives in grid.js so the work console previews exactly
   what this builds — see that file for why a banner waits for its row.    */
const layout = makeLayout(gridCols);
/* ════ HOVER — the full frame, on the card ═══════════════════════════════
   A film card previews by starting a player. A render has nothing to play,
   so hovering a banner quietly swaps its small rendition for the full one
   underneath the pointer: the same promise — "there is more here than the
   thumbnail" — paid in an image the lightbox is about to want anyway, so
   opening it afterwards costs nothing.                                    */
const preview = (() => {
  const OPEN = 180;
  let openT = null, seen = new Set();
  return {
    want(box, p, dir){
      clearTimeout(openT);
      if(!box || seen.has(p.id)) return;
      openT = setTimeout(() => {
        const im = new Image();
        im.src = posterLg(p, dir);
        im.decode ? im.decode().then(swap).catch(()=>{}) : im.addEventListener('load', swap);
        function swap(){
          seen.add(p.id);
          if(box.style.backgroundImage) box.style.backgroundImage = 'url('+im.src+')';
        }
      }, OPEN);
    },
    drop(){ clearTimeout(openT); }
  };
})();

/* How many cards a phone builds before you ask for more.

   Turning the work grid off entirely halved the time the main thread spent
   blocked during a scroll — 3.5 seconds down to 1.6 across a run. Not the
   blend modes, not the overlays, not the filters; those measured as noise.
   It is simply the amount of grid: eighty-odd cards of frames, overlays,
   posters and titles is a lot of document for a phone to lay out, paint and
   composite while it is also being dragged.

   So a phone builds a screenful and a half, and adds more when asked. The
   desktop, which has the headroom, still gets everything at once. */
const PAGE_SIZE = 12;

function buildCards(cat, cfg, limit){
  const grid = document.getElementById(cfg.grid); if(!grid) return;
  grid.innerHTML='';
  const old = grid.parentElement.querySelector('.wg-more');
  if(old) old.remove();
  const full = layout(cat==='all' ? cfg.list : cfg.list.filter(p=>p.cat===cat), cfg, cat);
  const cap = IS_MOBILE ? (limit || PAGE_SIZE) : full.length;
  const list = full.slice(0, cap);
  /* Frames resolve as a card nears the viewport, not all at once. Painting
     every card at load would decode thirty renders the moment the loader
     lifted, nearly all of them screens below the fold. The margin is wide
     enough that the frame is always there before the card is, so nothing
     looks any different.

     The card stays observed rather than being unobserved once painted: a
     decoded bitmap costs width × height × 4 bytes for as long as it is
     referenced, and a grid of them left decoded is what gets a phone tab
     discarded and silently reloaded underneath you. Coming into the band
     paints the frame, leaving it drops the reference so the memory can go.
     The bytes stay in the HTTP cache, so coming back costs a decode and
     nothing else, and the band is a full screen either side — the frame is
     always back long before it could be seen missing.                    */
  const posterOf = new WeakMap();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const th = e.target.querySelector('.wc-thumb');
    if(!th) return;
    if(e.isIntersecting){
      const load = posterOf.get(e.target);
      if(load) load();
    } else if(th.style.backgroundImage){
      th.style.backgroundImage = '';
    }
  }), {rootMargin: IS_MOBILE ? '900px 0px' : '600px 0px'});
  list.forEach((p,i) => {
    /* full-bleed row: the opening piece, plus the flagged highlights */
    const feat = cfg.feat && ((i===0 && cat==='all') || p.hi);
    const card = document.createElement('div');
    card.className = 'wc'+(feat?' feat':'')+(cfg.arch?' arch':'')+(cfg.sq?' sq':'');
    card.dataset.cat = p.cat || '';
    if(!IS_MOBILE) card.style.animation = FLOATS[i%FLOATS.length];
    /* The title is a real link to the piece's own page. Clicking the card
       still opens the lightbox — the anchor is there so the pages are
       crawlable and so cmd-click / middle-click behave as expected. The
       detail passes and the concepts have no page, so those stay plain. */
    const titleHTML = cfg.arch ? p.title
      : '<a href="'+ASSET_BASE+'work/'+slugOf(p)+'/" class="wc-link">'+p.title+'</a>';
    const tags = '<div class="wc-tags">'+
      (cfg.cats && p.cat ? '<span class="wc-tag y">'+(cfg.cats[p.cat]||p.cat).toUpperCase()+'</span>' : '')+
      (p.year ? '<span class="wc-tag">'+p.year+'</span>' : '')+
      (p.prod ? '<span class="wc-tag pr">'+p.prod.toUpperCase()+'</span>' : '')+'</div>';
    card.innerHTML =
      '<div class="wc-art">'+ARTS[i%ARTS.length]+'</div>'+
      '<div class="wc-thumb"></div>'+
      '<div class="wc-frame"></div>'+
      '<div class="wc-ov"></div>'+
      '<div class="wc-play"><div class="wc-pb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9,3 3,3 3,9"></polyline><polyline points="15,21 21,21 21,15"></polyline><line x1="3" y1="3" x2="10" y2="10"></line><line x1="21" y1="21" x2="14" y2="14"></line></svg></div></div>'+
      '<div class="wc-tc">'+pad(i+1)+':00:'+pad(i*4)+':00</div>'+
      '<div class="wc-info"><div class="wc-num">'+cfg.label+' / '+pad(i+1,3)+'</div><div class="wc-title'+(isAR(p.title)?' ar':'')+'">'+titleHTML+'</div>'+tags+'</div>';
    /* the frame itself — deferred until the card is near the viewport */
    posterOf.set(card, () => {
      const th = card.querySelector('.wc-thumb');
      if(th) th.style.backgroundImage = 'url('+posterSm(p, cfg.dir)+')';
    });
    io.observe(card);
    /* Banners upgrade to the full render under the pointer; a plain card
       does not, and leaving one cancels a swap that has not happened yet. */
    if(!IS_MOBILE && feat){
      card.addEventListener('mouseenter', () => {
        card.style.animationPlayState = 'paused';
        preview.want(card.querySelector('.wc-thumb'), p, cfg.dir);
      });
      card.addEventListener('mouseleave', () => {
        card.style.animationPlayState = 'running';
        preview.drop();
      });
    }
    card.addEventListener('click', e => {
      /* Anywhere on the card opens the frame. The title is a link to the
         piece's own page, so a click on the words goes there instead, as
         does any modifier click. */
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if(e.target.closest('.wc-link')) return;
      e.preventDefault();
      openModal(p, p.title, cfg);
    });
    addH(card, true);
    grid.appendChild(card);
  });
  fillLastRow(grid);

  /* The rest, on request. Rebuilding the whole grid to append a batch would
     throw away every poster already decoded and every observer already
     watching, so the button hands the next slice to the same builder and
     lets it carry on from where it stopped. */
  if(IS_MOBILE && full.length > list.length) addMoreButton(grid, full.length, list.length, cat, cfg);
}

/* One code path, not two: the button asks the same builder for a bigger
   slice. Rebuilding twenty-four cards costs a few milliseconds, and the
   posters come straight back from cache — cheap enough that it is not worth
   a second, subtly different append path to maintain. */
function addMoreButton(grid, total, shown, cat, cfg){
  const wrap = document.createElement('div');
  wrap.className = 'wg-more';
  const left = total - shown;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wg-more-btn';
  btn.textContent = 'LOAD ' + Math.min(PAGE_SIZE, left) + ' MORE  \u2193';
  btn.dataset.sfx = 'more';                    /* its own voice, not a chip's */
  const count = document.createElement('span');
  count.className = 'wg-more-n';
  count.textContent = shown + ' OF ' + total;
  btn.addEventListener('click', () => {
    const y = scrollY;
    buildCards(cat, cfg, shown + PAGE_SIZE);
    scrollTo(0, y);                            /* the page grew below you */
  });
  wrap.append(btn, count);
  grid.parentElement.insertBefore(wrap, grid.nextSibling);
}
/* Two-column phone grid: if the very last card sits alone it stretches across
   both columns, so the grid never ends on a half-empty row. */
function fillLastRow(grid){
  const kids = [...grid.children];
  kids.forEach(el => el.classList.remove('wc-wide'));
  if(!IS_MOBILE) return;
  const COLS = gridCols();
  let col = 0, last = null;
  kids.forEach(el => {
    if(el.classList.contains('feat')){ col = 0; last = null; return; }
    col = (col + 1) % COLS; last = el;
  });
  if(col !== 0 && last) last.classList.add('wc-wide');
}
/* ════ SECTION GLYPHS ════
   One animated mark per section, sitting behind the heading on the right.
   They share a vocabulary — a slow dashed ring, pulsing nodes, a breathing
   core — so each reads as part of the same instrument panel.               */
const SECTION_GLYPHS = {
  /* ABOUT — a lens iris opening and closing */
  philosophy:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-iris"><polygon points="60,26 89,43 89,77 60,94 31,77 31,43"/></g>'+
    '<g class="g-spokes"><line x1="60" y1="60" x2="60" y2="26"/><line x1="60" y1="60" x2="89" y2="43"/>'+
      '<line x1="60" y1="60" x2="89" y2="77"/><line x1="60" y1="60" x2="60" y2="94"/>'+
      '<line x1="60" y1="60" x2="31" y2="77"/><line x1="60" y1="60" x2="31" y2="43"/></g>'+
    '<circle class="g-core" cx="60" cy="60" r="8"/><circle class="g-pulse" cx="60" cy="60" r="8"/>',
  /* WORK — a film frame with sprockets running past */
  work:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<rect class="g-box" x="28" y="40" width="64" height="40" rx="2"/>'+
    '<g class="g-run"><rect x="22" y="44" width="5" height="7"/><rect x="22" y="56" width="5" height="7"/>'+
      '<rect x="22" y="68" width="5" height="7"/><rect x="93" y="44" width="5" height="7"/>'+
      '<rect x="93" y="56" width="5" height="7"/><rect x="93" y="68" width="5" height="7"/></g>'+
    '<polygon class="g-play" points="52,49 74,60 52,71"/>',
  /* AI — the neural core */
  ai:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-ring2"><circle cx="60" cy="60" r="35"/></g>'+
    '<g class="g-web"><line x1="60" y1="25" x2="88" y2="46"/><line x1="88" y1="46" x2="78" y2="82"/>'+
      '<line x1="78" y1="82" x2="42" y2="82"/><line x1="42" y1="82" x2="32" y2="46"/>'+
      '<line x1="32" y1="46" x2="60" y2="25"/><line x1="60" y1="25" x2="78" y2="82"/>'+
      '<line x1="32" y1="46" x2="88" y2="46"/><line x1="42" y1="82" x2="88" y2="46"/></g>'+
    '<g class="g-nd"><circle cx="60" cy="25" r="3.4"/><circle cx="88" cy="46" r="3.4" style="animation-delay:.5s"/>'+
      '<circle cx="78" cy="82" r="3.4" style="animation-delay:1s"/><circle cx="42" cy="82" r="3.4" style="animation-delay:1.5s"/>'+
      '<circle cx="32" cy="46" r="3.4" style="animation-delay:2s"/></g>'+
    '<g class="g-orb"><circle cx="60" cy="10" r="2.6"/></g>'+
    '<circle class="g-core" cx="60" cy="60" r="8"/><circle class="g-pulse" cx="60" cy="60" r="8"/>',
  /* VAULT — a safe dial turning */
  archive:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-dial"><circle class="g-box" cx="60" cy="60" r="36"/>'+
      '<g class="g-tick"><line x1="60" y1="24" x2="60" y2="32"/><line x1="96" y1="60" x2="88" y2="60"/>'+
      '<line x1="60" y1="96" x2="60" y2="88"/><line x1="24" y1="60" x2="32" y2="60"/>'+
      '<line x1="85" y1="35" x2="80" y2="40"/><line x1="85" y1="85" x2="80" y2="80"/>'+
      '<line x1="35" y1="85" x2="40" y2="80"/><line x1="35" y1="35" x2="40" y2="40"/></g></g>'+
    '<g class="g-ring2"><circle cx="60" cy="60" r="20"/></g>'+
    '<circle class="g-core" cx="60" cy="60" r="6"/>',
  /* SERVICES — a capability rosette */
  services:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-rose"><line x1="60" y1="18" x2="60" y2="42"/><line x1="102" y1="60" x2="78" y2="60"/>'+
      '<line x1="60" y1="102" x2="60" y2="78"/><line x1="18" y1="60" x2="42" y2="60"/>'+
      '<line x1="90" y1="30" x2="73" y2="47"/><line x1="90" y1="90" x2="73" y2="73"/>'+
      '<line x1="30" y1="90" x2="47" y2="73"/><line x1="30" y1="30" x2="47" y2="47"/></g>'+
    '<g class="g-ring2"><circle cx="60" cy="60" r="28"/></g>'+
    '<circle class="g-core" cx="60" cy="60" r="7"/><circle class="g-pulse" cx="60" cy="60" r="7"/>',
  /* PIPELINE — keyframes travelling down a track */
  pipeline:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-track"><line x1="20" y1="44" x2="100" y2="44"/><line x1="20" y1="60" x2="100" y2="60"/>'+
      '<line x1="20" y1="76" x2="100" y2="76"/></g>'+
    '<g class="g-kf"><rect x="34" y="40" width="8" height="8" transform="rotate(45 38 44)"/></g>'+
    '<g class="g-kf2"><rect x="56" y="56" width="8" height="8" transform="rotate(45 60 60)"/></g>'+
    '<g class="g-kf3"><rect x="74" y="72" width="8" height="8" transform="rotate(45 78 76)"/></g>',
  /* CLIENTS — a constellation of marks */
  clients:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<g class="g-ring2"><circle cx="60" cy="60" r="32"/></g>'+
    '<g class="g-nd"><circle cx="60" cy="18" r="3.2"/><circle cx="90" cy="35" r="3.2" style="animation-delay:.3s"/>'+
      '<circle cx="90" cy="85" r="3.2" style="animation-delay:.6s"/><circle cx="60" cy="102" r="3.2" style="animation-delay:.9s"/>'+
      '<circle cx="30" cy="85" r="3.2" style="animation-delay:1.2s"/><circle cx="30" cy="35" r="3.2" style="animation-delay:1.5s"/></g>'+
    '<circle class="g-core" cx="60" cy="60" r="7"/><circle class="g-pulse" cx="60" cy="60" r="7"/>',
  /* CONTACT — a signal going out */
  contact:
    '<g class="g-ring"><circle cx="60" cy="60" r="50"/></g>'+
    '<circle class="g-wave" cx="60" cy="60" r="14"/>'+
    '<circle class="g-wave" cx="60" cy="60" r="14" style="animation-delay:1.1s"/>'+
    '<circle class="g-wave" cx="60" cy="60" r="14" style="animation-delay:2.2s"/>'+
    '<circle class="g-core" cx="60" cy="60" r="8"/>',
};
function buildGlyphs(){
  Object.keys(SECTION_GLYPHS).forEach(id => {
    const sec = document.getElementById(id);
    if(!sec || sec.querySelector('.sec-glyph')) return;
    const d = document.createElement('div');
    d.className = 'sec-glyph';
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<svg viewBox="0 0 120 120">'+SECTION_GLYPHS[id]+'</svg>';
    sec.insertBefore(d, sec.firstChild);
  });
}

/* ════ THE CONCEPT LAB — the 2D that came first ══════════════════════════
   The same card engine as the two grids above, pointed at assets/concept/
   and told to lay its cards out square-ish rather than 16:9. A drawing has
   its own proportions and cropping one into a film frame throws away the
   half of the sheet the annotations are on.                               */
function buildConcepts(){
  buildCards('all', GRIDS.lab);
  const c = document.getElementById('ai-count');
  if(c) c.textContent = CONCEPTS.length+' SHEETS · PENCIL · INK · DIGITAL';
}

/* prompt line that types itself — only while the section is on screen */
function initPromptTyper(){
  const el = document.getElementById('ai-type'), sec = document.getElementById('ai');
  if(!el || !sec) return;
  let live = false, li = 0, ci = 0, del = false, timer = null;
  new IntersectionObserver(es => es.forEach(e => {
    live = e.isIntersecting;
    if(live && !timer) tick(); else if(!live && timer){ clearTimeout(timer); timer = null; }
  }), {rootMargin:'80px'}).observe(sec);
  function tick(){
    const s = PROMPTS[li];
    el.textContent = s.slice(0, ci);
    let wait = del ? 16 : 40;
    /* Only while a letter is being ADDED, and only while the section is on
       screen. Deleting runs at 16ms a character — sounding that would be a
       buzz, not a texture — and the throttle inside SFX thins the rest to
       the machine working rather than a rhythm you could count. */
    if(!del && ci < s.length){ SFX.play('type'); ci++; }
    else if(!del){ del = true; wait = 2000; }
    else if(ci > 0) ci--;
    else { del = false; li = (li+1) % PROMPTS.length; wait = 320; }
    timer = live ? setTimeout(tick, wait) : null;
  }
}

/* ════ live counts — no hand-edited totals to fall out of date ════ */
function deferVault(){
  const cfg = GRIDS.vault;
  const grid = document.getElementById(cfg.grid);
  if(!grid) return;
  const wrap = document.createElement('div');
  wrap.className = 'wg-more';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'wg-more-btn';
  btn.textContent = 'SHOW THE DETAIL PASSES  \u2193';
  btn.dataset.sfx = 'more';
  const n = document.createElement('span');
  n.className = 'wg-more-n';
  n.textContent = cfg.list.length + ' TURNAROUNDS & STUDIES';
  btn.addEventListener('click', () => {
    wrap.remove();
    buildFilters(cfg);
    buildCards('all', cfg);
  });
  wrap.append(btn, n);
  grid.parentElement.insertBefore(wrap, grid.nextSibling);
}

function buildVaultMeta(){
  const nCat = new Set(PROJECTS.map(p=>p.cat)).size;
  const w = document.getElementById('work-count');
  if(w) w.textContent = PROJECTS.length+' ASSETS · '+nCat+' CATEGORIES';
  const a = document.getElementById('arch-count');
  if(a) a.textContent = VAULT.length+' DETAIL PASSES · SAME ASSETS, OTHER ANGLES';
}
/* ════ THE TOOLKIT — the software the work is actually made in ═══════════
   Two counter-scrolling rows under *The Toolkit*. `m` is the mark shown on
   the plate; leave it out and it is derived from the name.                 */
const CLIENTS = [
  {n:"Autodesk 3ds Max",   m:"3DS"},
  {n:"Autodesk Maya",      m:"MAYA"},
  {n:"ZBrush",             m:"ZBR"},
  {n:"Blender",            m:"BLND"},
  {n:"Substance Painter",  m:"SP"},
  {n:"Marmoset Toolbag",   m:"MRMS"},
  {n:"Unreal Engine",      m:"UE5"},
  {n:"Nomad Sculpt",       m:"NMD"},
  {n:"Adobe Photoshop",    m:"PS"},
  {n:"Adobe After Effects",m:"AE"},
  {n:"Procreate",          m:"PRC"},
  {n:"RizomUV",            m:"UV"},
  {n:"Topogun",            m:"TOPO"},
  {n:"Adobe Illustrator",  m:"AI"},
  {n:"Quixel Bridge",      m:"QXL"},
  {n:"Mixamo",             m:"MIX"},
];
function mark(c){
  if(c.m) return c.m;
  const w = c.n.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean);
  /* a single token is already an acronym/wordmark — don't reduce it to one letter */
  if(w.length === 1) return w[0].slice(0,5).toUpperCase();
  return w.map(x=>x[0]).join('').slice(0,4).toUpperCase();
}
const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
/* Set `logo:true` on a client to use assets/logos/<slug>.png (or `logo:"file.png"`).
   The plate renders it as a white silhouette via CSS — colour art is fine as a
   source. If the file is missing the monogram takes its place, so the wall never
   shows a broken image. See assets/logos/README.md for the artwork spec.       */
function logoFile(c){
  return typeof c.logo === 'string' ? c.logo : slug(c.n)+'.png';
}
function buildClients(){
  const half = Math.ceil(CLIENTS.length/2);
  [['ct', CLIENTS.slice(0,half)], ['ct2', CLIENTS.slice(half)]].forEach(([id,row]) => {
    const t = document.getElementById(id); if(!t) return;
    [...row,...row].forEach(c => {                       /* doubled = seamless loop */
      const d = document.createElement('div'); d.className='cc';
      const plate = c.logo
        /* not lazy: plates sit outside the clipped marquee, and a lazy image that
           is never requested never fires `error` — the fallback would never run */
        ? '<img class="cc-logo" src="assets/logos/'+logoFile(c)+'" alt="" />'
        : '<span class="cc-m">'+mark(c)+'</span>';
      d.innerHTML = plate+'<span class="cc-n">'+c.n+'</span>';
      const img = d.querySelector('.cc-logo');
      if(img) img.addEventListener('error', () => {       /* graceful: fall back to the mark */
        const s = document.createElement('span');
        s.className = 'cc-m'; s.textContent = mark(c);
        img.replaceWith(s);
      });
      addH(d); t.appendChild(d);
    });
  });
  const cnt = document.getElementById('client-count');
  if(cnt) cnt.textContent = CLIENTS.length+' APPLICATIONS · MODEL → SCULPT → TEXTURE → RENDER';
}
function buildWave(){
  const el = document.getElementById('tlwv'); if(!el) return;
  for(let i=0;i<(IS_MOBILE?70:130);i++){
    const b = document.createElement('div'); b.className='tl-wvb';
    b.style.height=(Math.random()*18+2)+'px';
    b.style.animationDelay=(Math.random()*1.5)+'s';
    el.appendChild(b);
  }
}

/* ════ THE LIGHTBOX ══════════════════════════════════════════════════════
   Same furniture as a video modal — a frame, a title, a way through to the
   project page — showing the full render instead of a player. The small
   rendition is painted underneath immediately so the frame is never empty
   while the large one decodes, and ← / → walk the list you opened from
   without closing and reopening.                                         */
let lbList = [], lbIndex = -1, lbCfg = null;

function openModal(p, title, cfg){
  if(typeof p === 'string') p = BY_ID.get(p) || {id:p, title:p};
  cfg = cfg || GRIDS.work;
  lbCfg = cfg;
  lbList = cfg.list;
  lbIndex = lbList.indexOf(p);
  paintModal(p, title || p.title, cfg);
  const modal = document.getElementById('modal');
  modal.classList.add('open');
  SFX.play('open');
  document.body.style.overflow='hidden';
}

function paintModal(p, title, cfg){
  const wrap = document.getElementById('m-wrap');
  const modal = document.getElementById('modal');
  modal.classList.toggle('sq', !!cfg.sq);
  /* the small file is almost certainly already decoded — it is what the card
     was showing — so it stands in until the full frame arrives */
  wrap.innerHTML =
    '<div class="m-stage" style="background-image:url('+posterSm(p, cfg.dir)+')">'+
      '<img class="m-img" alt="'+String(title).replace(/"/g,'&quot;')+'" />'+
    '</div>';
  const img = wrap.querySelector('.m-img');
  img.addEventListener('load', () => img.classList.add('rdy'), {once:true});
  img.src = posterLg(p, cfg.dir);

  const meta = [p.prod, p.soft, p.year].filter(Boolean).join('  ·  ');
  const mt = document.getElementById('m-tc');
  if(mt) mt.textContent = meta || '';
  const ext = document.getElementById('m-ext');
  if(ext) ext.hidden = true;
  /* Only the selected grid has pages — the detail passes and the concept
     sheets do not, so the chip simply does not appear for those.        */
  const pg = document.getElementById('m-page');
  if(pg){
    const full = BY_ID.get(p.id);
    pg.hidden = !full;
    if(full) pg.href = ASSET_BASE+'work/'+slugOf(full)+'/';
  }
  const t = document.getElementById('m-title');
  if(t){ t.textContent = title; t.classList.toggle('ar', isAR(title)); }
}

/* ← / → step through whichever list the lightbox was opened from. */
function stepModal(d){
  if(!lbList.length || lbIndex < 0) return;
  lbIndex = (lbIndex + d + lbList.length) % lbList.length;
  const p = lbList[lbIndex];
  paintModal(p, p.title, lbCfg);
  SFX.play('hover');
}
addEventListener('keydown', e => {
  if(!document.getElementById('modal').classList.contains('open')) return;
  if(e.key === 'ArrowRight') stepModal(1);
  if(e.key === 'ArrowLeft')  stepModal(-1);
});
/* the same two steps for a pointer and for touch, where there is no
   keyboard to press */
(() => {
  const p = document.getElementById('m-prev'), n = document.getElementById('m-next');
  if(p) p.addEventListener('click', e => { e.stopPropagation(); stepModal(-1); });
  if(n) n.addEventListener('click', e => { e.stopPropagation(); stepModal(1); });
})();

function closeModal(){
  const modal = document.getElementById('modal');
  if(modal.classList.contains('open')) SFX.play('close');
  modal.classList.remove('open','sq');
  document.getElementById('m-wrap').innerHTML='';
  const pg = document.getElementById('m-page'); if(pg) pg.hidden = true;
  lbList = []; lbIndex = -1;
  document.body.style.overflow='';
}
document.getElementById('m-close').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if(e.target===document.getElementById('modal')) closeModal(); });
/* Escape closes — but the players sit in cross-origin iframes, and once one of
   them takes focus its key presses never reach this document. So the modal is
   focused when it opens, and focus is taken back the moment the pointer leaves
   the player, which is exactly when someone reaches for Escape. */
(() => {
  const modal = document.getElementById('modal');
  const grab = () => { if(modal.classList.contains('open')) modal.focus({preventScroll:true}); };
  modal.setAttribute('tabindex', '-1');
  modal.addEventListener('mouseenter', grab);
  modal.addEventListener('mousemove', e => { if(e.target === modal || e.target.closest('.m-meta,.m-close')) grab(); });
  addEventListener('keydown', e => { if(e.key === 'Escape' && modal.classList.contains('open')) closeModal(); }, true);
  new MutationObserver(() => { if(modal.classList.contains('open')) grab(); })
    .observe(modal, {attributes:true, attributeFilter:['class']});
})();

/* ════ THE HERO FRAME ════════════════════════════════════════════════════
   A film site rolls a loop behind its title. There is no loop here, so the
   hero carries the one image that says what this is at a glance: the
   character the portfolio opens on, cut out and lit from behind by the
   aurora. It is markup, not script — the element is in index.html and
   plays no part in whether anything else works — and this block exists
   only to tell the loader when the picture has actually decoded, so the
   screen never lifts onto a hero that is still empty.                    */
(() => {
  const art = document.querySelector('#h-art img');
  const st = window.__hero = {playing:false};
  const ready = () => { st.playing = true; if(art) art.classList.add('rdy'); };
  if(!art) return ready();
  if(art.complete && art.naturalWidth) return ready();
  if(art.decode) art.decode().then(ready).catch(ready);
  else art.addEventListener('load', ready, {once:true});
  setTimeout(ready, 4000);
})();

/* ════ SCRAMBLE ════ */
function initScramble(){
  if(IS_MOBILE) return;
  const chars = '!<>-_\\/[]{}=+*^?#';
  document.querySelectorAll('.n-links a').forEach(link => {
    const original = link.dataset.txt; if(!original) return;
    let iv = null;
    link.addEventListener('mouseenter', () => {
      let frame = 0; clearInterval(iv);
      iv = setInterval(() => {
        link.textContent = original.split('').map((c,i) => i<frame ? c : chars[Math.random()*chars.length|0]).join('');
        frame += .6;
        if(frame >= original.length){ clearInterval(iv); link.textContent = original; }
      }, 28);
    });
    link.addEventListener('mouseleave', () => { clearInterval(iv); link.textContent = original; });
  });
}

/* ════ NOW PLAYING + NAV/DOCK TRACK ════ */
/* Scroll position decides the active section, not intersection ratio: WORK and
   THE VAULT are several screens tall, so a percentage-of-self threshold can
   never fire for them and the nav would stick on whichever section reported
   last. Here the active section is simply the last one whose top has crossed
   just under the nav — correct at any section height.                        */
function initTracking(){
  const label = document.getElementById('np-label');
  const navLinks = [...document.querySelectorAll('.n-links a')];
  const dockLinks = [...document.querySelectorAll('#dock a')];
  const sections = [...document.querySelectorAll('section[id]')];
  if(!sections.length) return;
  const LINE = 56 + 28;                       /* nav height + a little slack */
  let queued = false, current = null;

  /* This asked every section for its rectangle on every scroll frame — nine
     forced layout recalculations of a six-thousand-node document, sixty
     times a second, to answer a question whose answer barely changes.

     The positions are cached instead. scrollHeight has to be read anyway for
     the bottom-of-page case, so it doubles as the signal that the page has
     changed shape: a lazy poster landing, a filter redrawing the grid, a
     rotation. When it moves, the offsets are taken again. One layout read a
     frame instead of ten, and the cache can never go stale without noticing. */
  let tops = [], docH = 0, pending = false;
  /* Measured when the page changes shape, never when a frame needs it —
     reading scrollHeight is itself a full layout, so using it as the
     staleness signal just moved the cost rather than removing it. */
  function remeasure(){
    if(pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      docH = document.documentElement.scrollHeight;
      tops = sections.map(s => s.getBoundingClientRect().top + scrollY);
    });
  }
  remeasure();
  addEventListener('resize', remeasure, {passive:true});
  if('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);

  function pick(){
    if(!tops.length) return sections[0];
    if(scrollY + innerHeight >= docH - 2) return sections[sections.length-1];
    const y = scrollY + LINE;
    let active = sections[0];
    for(let i = 0; i < sections.length; i++){
      if(tops[i] <= y) active = sections[i]; else break;
    }
    return active;
  }
  function sync(){
    queued = false;
    const s = pick();
    if(s === current) return;
    /* Not on the first resolve. That fires as the page settles, before
       anyone has scrolled, and would sound like the site talking to itself. */
    if(current) SFX.play('nav');
    current = s;
    if(label && s.dataset.np) label.textContent = s.dataset.np;
    const href = '#'+s.id;
    /* hero clears the bar; a section with no nav entry (clients) keeps the
       previous highlight rather than flickering everything off */
    if(s.id === 'hero') navLinks.forEach(l => l.classList.remove('on'));
    else if(navLinks.some(l => l.getAttribute('href') === href))
      navLinks.forEach(l => l.classList.toggle('on', l.getAttribute('href') === href));
    if(dockLinks.some(l => l.dataset.sec === s.id))
      dockLinks.forEach(l => l.classList.toggle('on', l.dataset.sec === s.id));
  }
  addEventListener('scroll', () => {
    if(!queued){ queued = true; requestAnimationFrame(sync); }
  }, {passive:true});
  addEventListener('resize', sync, {passive:true});
  sync();
}

/* ════ PIPELINE AUTO ════ */
const STAGES = [
  {id:'sg1',th:.04,label:'REFERENCE & CONCEPT',fills:[['tf-v',22]],kfs:['kf1']},
  {id:'sg2',th:.18,label:'BLOCKOUT',fills:[['tf-v',44]],kfs:['kf2']},
  {id:'sg5',th:.25,label:'HIGH-POLY SCULPT',fills:[['tf-m',28]],kfs:[]},
  {id:'sg3',th:.32,label:'RETOPOLOGY',fills:[['tf-v',62]],kfs:['kf3']},
  {id:'sg7',th:.36,label:'UV UNWRAP',fills:[['tf-x',36]],kfs:[]},
  {id:'sg6',th:.42,label:'BAKE',fills:[['tf-m',67]],kfs:['kf4']},
  {id:'sg4',th:.48,label:'LOW-POLY LOCK',fills:[['tf-v',78]],kfs:[]},
  {id:'sg8',th:.56,label:'TEXTURING',fills:[['tf-x',70]],kfs:['kf5']},
  {id:'sg9',th:.64,label:'LOOKDEV & LIGHTING',fills:[['tf-c',83]],kfs:['kf6']},
  {id:'sg10',th:.82,label:'FINAL RENDER',fills:[['tf-v',80],['tf-m',70],['tf-x',73],['tf-c',83]],kfs:['kf7']},
];
let pipeRunning=false, pipeProgress=0, pipeLast=null, pipeStarted=false;
const PIPE_DUR = 11000;
function updatePipe(p){
  const labelW = IS_MOBILE ? 64 : 104;
  const ph = document.getElementById('tl-ph');
  if(ph) ph.style.left = 'calc('+labelW+'px + '+(p*86)+'%)';
  const secs = Math.floor(p*120);
  const tc = document.getElementById('tl-ph-tc');
  if(tc) tc.textContent = '00:'+pad(Math.floor(secs/60))+':'+pad(secs%60);
  const ppf = document.getElementById('ppf'); if(ppf) ppf.style.width=(p*100)+'%';
  const pct = document.getElementById('pipe-pct'); if(pct) pct.textContent=Math.floor(p*100)+'%';
  document.querySelectorAll('.pd').forEach((d,i) => {
    const th=(i+1)/9; d.classList.remove('act','done');
    if(p>th) d.classList.add('done'); else if(p>th-.1) d.classList.add('act');
  });
  let current='STANDBY';
  STAGES.forEach(s => {
    const el = document.getElementById(s.id);
    if(p>=s.th){
      if(el) el.classList.add('visible');
      s.fills.forEach(([fid,w]) => { const fe=document.getElementById(fid); if(fe) fe.style.width=w+'%'; });
      s.kfs.forEach(k => { const ke=document.getElementById(k); if(ke) ke.classList.add('visible'); });
      current = s.label;
    } else if(el) el.classList.remove('visible');
  });
  const act = document.getElementById('active-stage');
  if(act) act.textContent = current;
}
function resetPipe(){
  ['tf-v','tf-m','tf-x','tf-c'].forEach(id => {
    const el=document.getElementById(id);
    if(el){ el.style.transition='none'; el.style.width='0%'; setTimeout(()=>el.style.transition='',60); }
  });
  STAGES.forEach(s => { const el=document.getElementById(s.id); if(el) el.classList.remove('visible'); });
  ['kf1','kf2','kf3','kf4','kf5','kf6','kf7'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.remove('visible'); });
  document.querySelectorAll('.pd').forEach(d => d.classList.remove('act','done'));
}
/* At most one frame is ever pending. The loop is stopped and restarted as
   the section comes and goes, and without this a stop-then-start that
   landed before the old frame fired would leave two chains running and the
   timeline playing at double speed. */
let pipeScheduled = false;
function schedulePipe(){
  if(pipeScheduled || !pipeRunning) return;
  pipeScheduled = true;
  requestAnimationFrame(ts => { pipeScheduled = false; pipeLoop(ts); });
}
function pipeLoop(ts){
  if(!pipeRunning) return;
  if(!pipeLast) pipeLast = ts;
  const dt = ts - pipeLast; pipeLast = ts;
  pipeProgress += dt / PIPE_DUR;
  if(pipeProgress >= 1){
    pipeProgress = 1; updatePipe(1);
    setTimeout(() => { resetPipe(); pipeProgress=0; pipeLast=null; schedulePipe(); }, 1700);
    return;
  }
  updatePipe(pipeProgress);
  schedulePipe();
}
function startPipe(){
  if(pipeStarted) return;
  pipeStarted = true; pipeRunning = true;
  schedulePipe();
}
/* The timeline plays, resets and plays again for as long as the page is
   open — a frame loop for a section that is usually nowhere near the
   screen. It holds where it is when the section leaves, and picks up from
   there when it comes back. */
function initPipeGuard(){
  const sec = document.getElementById('pipeline');
  if(!sec || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(es => {
    const on = es.some(e => e.isIntersecting);
    if(!pipeStarted) return;
    if(on){ pipeRunning = true; pipeLast = null; schedulePipe(); }
    else pipeRunning = false;
  }, {rootMargin:'200px'}).observe(sec);
}

/* ════ COUNT UP ════ */
function countUp(el){
  const t = parseInt(el.dataset.c);
  if(!t || el.dataset.done) return;
  el.dataset.done='1';
  const sfx = el.textContent.replace(/[0-9]/g,'');
  const dur=1300, t0=performance.now();
  (function step(now){
    const p=Math.min((now-t0)/dur,1), e=1-Math.pow(1-p,3);
    el.textContent = pad(Math.floor(e*t), t>=100?3:2)+sfx;
    if(p<1) requestAnimationFrame(step);
    else el.textContent = pad(t, t>=100?3:2)+sfx;
  })(t0);
}

/* ════ SCROLL EFFECTS — light, no pinning ════ */
function initChoreo(){
  gsap.registerPlugin(ScrollTrigger);

  /* hero entrance (time-based, no scroll pin) */
  gsap.fromTo('.h-l1',{y:40,opacity:0},{y:0,opacity:1,duration:.9,ease:'power3.out',delay:.1});
  gsap.fromTo('.h-l2',{y:40,opacity:0},{y:0,opacity:1,duration:.9,ease:'power3.out',delay:.25});
  gsap.fromTo('.h-l3',{y:40,opacity:0},{y:0,opacity:1,duration:.9,ease:'power3.out',delay:.4});
  gsap.fromTo(['.h-sub','.h-ctas','.h-stats'],{y:24,opacity:0},{y:0,opacity:1,duration:.8,ease:'power3.out',delay:.55,stagger:.12});

  /* magnetic buttons (desktop) */
  if(!IS_MOBILE){
    document.querySelectorAll('.btn-y,.btn-o,.n-cta').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        gsap.to(btn,{x:(e.clientX-r.left-r.width/2)*.16,y:(e.clientY-r.top-r.height/2)*.16,duration:.28,ease:'power2.out'});
      });
      btn.addEventListener('mouseleave', () => gsap.to(btn,{x:0,y:0,duration:.5,ease:'elastic.out(1,.45)'}));
    });
  }

  /* shared triggers */
  ScrollTrigger.create({trigger:'#pipeline',start:'top 68%',once:true,onEnter:startPipe});
  ScrollTrigger.create({trigger:'#philosophy',start:'top 60%',once:true,
    onEnter:()=>document.querySelectorAll('[data-c]').forEach(countUp)});
  /* section titles: glitch reveal */
  document.querySelectorAll('.s-title').forEach(el => {
    el.addEventListener('animationend', e => { if(e.animationName==='glSplit') el.classList.remove('gl'); });
    ScrollTrigger.create({trigger:el,start:'top 85%',
      onEnter:()=>{ el.classList.remove('gl'); void el.offsetWidth; el.classList.add('gl'); },
      onEnterBack:()=>{ el.classList.remove('gl'); void el.offsetWidth; el.classList.add('gl'); }});
    gsap.fromTo(el,{clipPath:'inset(0 0 100% 0)',y:24},
      {clipPath:'inset(0 0 0% 0)',y:0,duration:.7,ease:'power3.out',
       scrollTrigger:{trigger:el,start:'top 85%'}});
  });
  gsap.fromTo('#c-left',{opacity:0,x:-26},{opacity:1,x:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'#contact',start:'top 72%'}});
  gsap.fromTo('#c-right',{opacity:0,x:26},{opacity:1,x:0,duration:.8,ease:'power3.out',delay:.1,scrollTrigger:{trigger:'#contact',start:'top 72%'}});

  /* the hero's second button opens the piece the hero art is taken from,
     rather than sending anyone off to look for it in the grid */
  const sr1=document.getElementById('sr-open');
  if(sr1) sr1.addEventListener('click',e=>{e.preventDefault();openModal(PROJECTS[0],PROJECTS[0].title,GRIDS.work);});
}

/* ════ BUILD, then REVEAL ══════════════════════════════════════════════
   These were one function, and it ran after the loader's fake bar finished:
   the visitor watched a countdown, and only then did the site start putting
   itself together behind the screen that had just claimed to be done.

   They are two things and they happen in that order. BUILD makes the page
   while the loader is still up — it is a milestone the bar actually waits
   for. REVEAL lifts the screen and starts the entrance, so the choreography
   plays to somebody rather than behind a curtain.                        */
function BUILD(){
  /* One throwing builder used to take every step after it down with it, in
     source order and in silence: fourteen pieces of the page hanging on the
     first thirteen all succeeding. The sections here are independent of one
     another — the ticker knows nothing about the clients wall — so a failure
     in one is no reason to lose the rest. What fails now fails alone, and
     says which one it was instead of leaving a blank half-page and no clue. */
  const step = (name, fn) => {
    try { fn(); }
    catch(err){ console.error('BUILD step "' + name + '" failed:', err); }
  };

  step('ticker', buildTicker);
  step('filmstrips', buildFilmstrips);
  step('work grid', () => { buildFilters(GRIDS.work); buildCards('all', GRIDS.work); });
  /* The vault is forty-nine projects from 2016 to 2023. It is worth keeping,
     and it is not worth a phone building it before anyone has asked. The
     heading, the count and the framing all stay; only the cards wait. */
  step('detail passes', () => {
    if(IS_MOBILE) deferVault(); else { buildFilters(GRIDS.vault); buildCards('all', GRIDS.vault); }
    buildVaultMeta();
  });
  step('glyphs', buildGlyphs);
  step('concept lab', buildConcepts);
  step('prompt typer', initPromptTyper);
  step('toolkit', buildClients);
  step('wave', buildWave);
  step('scramble', initScramble);
  step('tracking', initTracking);
  step('pipeline guard', initPipeGuard);
  step('smooth scroll', initSmoothScroll);
  step('hover', () =>
    document.querySelectorAll('a,button,.sc-card,.cc,.wf-btn').forEach(el => addH(el)));
}

function REVEAL(){
  const ldr = document.getElementById('ldr');
  if(ldr){
    ldr.classList.add('out');
    /* the one flourish the site gets */
    SFX.play('boot');
    /* visibility:hidden does not stop a CSS animation — the loader's 34-bar
       equaliser went on ticking for the whole session behind a screen nobody
       would see again, and the portrait stayed decoded in memory with it. It
       is single use, so it goes after the fade rather than merely hiding. */
    setTimeout(() => ldr.remove(), 900);
  }
  /* The entrance belongs to the moment the page is uncovered, not to the
     moment it was built — run at BUILD time it would play out entirely
     behind an opaque loader and be over before anyone saw a frame. */
  try { initChoreo(); }
  catch(err){ console.error('REVEAL step "choreo" failed:', err); }
}
