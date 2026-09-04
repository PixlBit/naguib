/* ════════════════════════════════════════════════════════════════════════
   mascot.js — PIXL, the little screen that lives on this site.

   A CRT the size of a business card that drifts around the window,
   watches the cursor, reacts to the scroll, and says two or three words
   about whatever section you have arrived at. Poke it and it takes
   offence. Pick it up and throw it and it flies, bounces off the walls,
   and settles wherever it lands — it can never leave the window, and it
   never lands on top of anything you could click unless you put it there
   yourself.

   IT IS DRAWN, NOT LOADED. Every frame is painted on a 42×40 grid of
   whole pixels and blown up with nearest-neighbour, which is what makes it
   read as pixel art rather than as a small blurry picture: no image is
   fetched, nothing to cache, and it is as sharp on a retina screen as on a
   cheap one. The whole character costs one canvas and one frame loop that
   stops itself the moment it is off screen or the tab is in the background.

   THE PALETTE IS THE SITE'S. Cyan eyes, lime mouth, magenta when angry,
   the same near-black behind the glass, the same scanlines the project
   pages have — it is the site's own language, in a face.

   Desktop only, and never during a modal: it is a flourish, and a flourish
   that gets in the way of the work is a mistake.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SMALL = matchMedia('(max-width: 768px)').matches ||
                ('ontouchstart' in window && innerWidth < 900);
  if (SMALL) return;

  /* it has a voice, but it must never depend on having one */
  window.SFX = window.SFX || { play(){}, scroll(){}, loading(){}, loaded(){},
    get enabled(){ return false; }, get available(){ return false; } };
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── the grid ──────────────────────────────────────────────────────────
     Everything below is in these units. 42 across, 40 down, drawn at 3×,
     so the character is 126 by 120 CSS pixels — big enough to have a face,
     small enough to live in a corner. */
  const W = 42, H = 40, S = 3;
  const SCREEN = { x: 3, y: 3, w: 36, h: 24 };      /* the glass */
  const EYE = { l: 9, r: 25, y: 9, s: 8 };          /* two 8×8 sockets */
  const MOUTH = { x: 21, y: 22 };                   /* centre of the mouth */

  const C = {
    out:   '#080d11',      /* the outline, darker than the page */
    case1: '#1c2b33',      /* the bezel */
    case2: '#2e4450',      /* its lit top edge */
    glass: '#04070a',      /* what the site's background is */
    cy:    '#5fd4ff',      /* eyes */
    lm:    '#3ee0d0',      /* mouth, and the power light */
    yw:    '#e0803c',      /* anger */
    dim:   '#4a6470',
  };

  /* ── the shell ─────────────────────────────────────────────────────── */
  const wrap = document.createElement('div');
  wrap.id = 'pixl';
  wrap.setAttribute('aria-hidden', 'true');       /* a flourish, not content */

  const bub = document.createElement('div');
  bub.className = 'pixl-bub';
  const bubT = document.createElement('b');
  bub.appendChild(bubT);

  const cv = document.createElement('canvas');
  cv.className = 'pixl-cv';
  const DPR = Math.min(3, Math.max(1, devicePixelRatio || 1));
  cv.width = W * S * DPR;
  cv.height = H * S * DPR;
  cv.style.width = (W * S) + 'px';
  cv.style.height = (H * S) + 'px';
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.scale(S * DPR, S * DPR);

  wrap.append(bub, cv);
  const mount = () => {
    if (!document.body || document.getElementById('pixl')) return;
    document.body.appendChild(wrap);
  };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', mount);
  else mount();

  /* ── drawing in whole pixels ──────────────────────────────────────── */
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };

  /* ── THE FACES ─────────────────────────────────────────────────────────
     Each expression is a pair of small drawing routines — the eyes and the
     mouth — so they can be mixed: the dizzy eyes over the talking mouth,
     the angry eyes over a gritted one. `look` is where the pupils are
     pointing, -1..1 on each axis. */
  function eyeOpen(x, look, c) {
    px(x, EYE.y, EYE.s, EYE.s, c);
    px(x + 2 + Math.round(look.x * 2), EYE.y + 2 + Math.round(look.y * 2), 4, 4, C.glass);
  }
  function eyeShut(x, c) { px(x, EYE.y + 3, EYE.s, 2, c); }
  function eyeArc(x, c) {                       /* ^ — the happy one */
    px(x, EYE.y + 4, 2, 2, c);
    px(x + 2, EYE.y + 2, 2, 2, c);
    px(x + 4, EYE.y + 2, 2, 2, c);
    px(x + 6, EYE.y + 4, 2, 2, c);
  }
  function eyeWide(x, look, c) {
    px(x - 1, EYE.y - 1, EYE.s + 2, EYE.s + 2, c);
    px(x + 2 + Math.round(look.x * 2), EYE.y + 2 + Math.round(look.y * 2), 3, 3, C.glass);
  }
  function eyeCross(x, c) {                     /* × — seen too much scroll */
    for (let i = 0; i < 4; i++) {
      px(x + i * 2, EYE.y + i * 2, 2, 2, c);
      px(x + 6 - i * 2, EYE.y + i * 2, 2, 2, c);
    }
  }
  function eyeMad(x, left, c) {                 /* narrowed, under a brow */
    px(x, EYE.y + 3, EYE.s, 4, c);
    px(x + 2, EYE.y + 4, 3, 2, C.glass);
    for (let i = 0; i < 4; i++)                 /* the brow, slanting in */
      px(left ? x + i * 2 : x + 6 - i * 2, EYE.y + i - 1, 2, 2, c);
  }
  const EYES = {
    open:  (l, c) => { eyeOpen(EYE.l, l, c); eyeOpen(EYE.r, l, c); },
    shut:  (l, c) => { eyeShut(EYE.l, c); eyeShut(EYE.r, c); },
    arc:   (l, c) => { eyeArc(EYE.l, c); eyeArc(EYE.r, c); },
    wide:  (l, c) => { eyeWide(EYE.l, l, c); eyeWide(EYE.r, l, c); },
    cross: (l, c) => { eyeCross(EYE.l, c); eyeCross(EYE.r, c); },
    mad:   (l, c) => { eyeMad(EYE.l, true, c); eyeMad(EYE.r, false, c); },
  };

  function mLine(c)  { px(MOUTH.x - 5, MOUTH.y, 10, 2, c); }
  function mSmile(c) {                          /* a curve, in three steps */
    px(MOUTH.x - 6, MOUTH.y - 2, 2, 2, c);
    px(MOUTH.x - 4, MOUTH.y, 8, 2, c);
    px(MOUTH.x + 4, MOUTH.y - 2, 2, 2, c);
  }
  function mGrin(c) {                           /* open, with teeth */
    px(MOUTH.x - 6, MOUTH.y - 2, 12, 6, c);
    px(MOUTH.x - 4, MOUTH.y, 8, 2, C.glass);
  }
  function mO(c)     { px(MOUTH.x - 3, MOUTH.y - 2, 6, 6, c); px(MOUTH.x - 1, MOUTH.y, 2, 2, C.glass); }
  function mFlat(c)  { px(MOUTH.x - 4, MOUTH.y + 1, 8, 2, c); }
  function mGrit(c) {                           /* clenched */
    px(MOUTH.x - 6, MOUTH.y - 1, 12, 5, c);
    for (let i = 0; i < 5; i++) px(MOUTH.x - 4 + i * 2, MOUTH.y, 1, 3, C.glass);
  }
  function mWave(c) {                           /* woozy */
    px(MOUTH.x - 6, MOUTH.y, 3, 2, c);
    px(MOUTH.x - 3, MOUTH.y + 2, 3, 2, c);
    px(MOUTH.x, MOUTH.y, 3, 2, c);
    px(MOUTH.x + 3, MOUTH.y + 2, 3, 2, c);
  }
  const MOUTHS = { line: mLine, smile: mSmile, grin: mGrin, o: mO,
                   flat: mFlat, grit: mGrit, wave: mWave };

  /* An expression is two names and a colour. Nothing else. */
  const FACE = {
    idle:      { eyes: 'open',  mouth: 'line',  c: C.cy, m: C.lm },
    happy:     { eyes: 'arc',   mouth: 'grin',  c: C.lm, m: C.lm },
    look:      { eyes: 'open',  mouth: 'smile', c: C.cy, m: C.lm },
    surprised: { eyes: 'wide',  mouth: 'o',     c: C.cy, m: C.cy },
    dizzy:     { eyes: 'cross', mouth: 'wave',  c: C.yw, m: C.yw },
    angry:     { eyes: 'mad',   mouth: 'grit',  c: C.yw, m: C.yw },
    sleep:     { eyes: 'shut',  mouth: 'flat',  c: C.dim, m: C.dim },
    talk:      { eyes: 'open',  mouth: 'o',     c: C.cy, m: C.lm },
  };

  /* ── the body ──────────────────────────────────────────────────────── */
  function drawShell(power) {
    px(0, 0, W, 30, C.out);                       /* the case, and its edge */
    px(1, 1, W - 2, 28, C.case1);
    px(1, 1, W - 2, 1, C.case2);
    px(SCREEN.x - 1, SCREEN.y - 1, SCREEN.w + 2, SCREEN.h + 2, C.out);
    px(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.h, C.glass);
    px(W - 6, 26, 2, 2, power);                   /* the power light */
    px(17, 30, 8, 4, C.case1);                    /* neck */
    px(17, 30, 8, 1, C.case2);
    px(11, 34, 20, 3, C.case1);                   /* base */
    px(11, 34, 20, 1, C.case2);
    px(11, 37, 20, 1, C.out);
  }
  /* THE SCANLINES ARE A HINT, NOT A PATTERN. At a third of a pixel's worth
     of black on every other row they read as a barcode rather than as a
     screen — the eye sees stripes first and the face second, which is the
     wrong way round for a face. Every third row, at a fifth of the weight. */
  function drawScan() {
    g.fillStyle = 'rgba(0,0,0,.20)';
    for (let y = SCREEN.y + 1; y < SCREEN.y + SCREEN.h; y += 3)
      g.fillRect(SCREEN.x, y, SCREEN.w, 1);
    /* and the glass catches a little light along its top edge */
    g.fillStyle = 'rgba(255,255,255,.045)';
    g.fillRect(SCREEN.x, SCREEN.y, SCREEN.w, 1);
  }

  function draw(face, look, glitch) {
    g.clearRect(0, 0, W, H);
    drawShell(face === FACE.angry ? C.yw : C.lm);
    /* a frame of interference, on the beat of a hard reaction */
    if (glitch) {
      px(SCREEN.x, SCREEN.y + ((Math.random() * SCREEN.h) | 0), SCREEN.w, 2,
         Math.random() < 0.5 ? C.cy : C.yw);
    }
    EYES[face.eyes](look, face.c);
    MOUTHS[face.mouth](face.m);
    drawScan();
  }

  /* ══ WHAT IT SAYS ══════════════════════════════════════════════════════
     Two or three words. A mascot that writes paragraphs is a mascot people
     want gone, and the site's own voice is short anyway. */
  const LINES = {
    hero:       ['START THE SCULPT', 'QUADS ONLY', 'FRAME ONE'],
    philosophy: ['WALLS TO PIXELS', 'GIZA TO MARSEILLE', 'STILL HUMAN'],
    work:       ['CLICK A RENDER', 'FRESH OFF THE GPU', 'HIS BEST WORK'],
    ai:         ['PENCIL FIRST', 'BEFORE THE MESH', 'PAPER, THEN POLYGONS'],
    archive:    ['THE OTHER SIDE', 'TURN IT AROUND', 'CLOSER LOOK'],
    services:   ['MODEL. TEXTURE. LIGHT.', 'THE FULL CHAIN', 'BAKE IT PROPERLY'],
    pipeline:   ['BLOCKOUT TO RENDER', 'RETOPO IS LOVE', 'NO SHORTCUTS'],
    contact:    ['SAY HELLO', 'MARSEILLE CALLING', 'BRING A BRIEF'],
    project:    ['GOOD PICK', 'LOOK CLOSER', 'ONE OF HIS'],
    lost:       ['WRONG TURN', 'NOTHING HERE', 'TRY THE GRID'],
    angry:      ['HANDS OFF', 'OW. RUDE.', 'I AM WORKING'],
    fast:       ['SLOW DOWN', 'TOO FAST', 'MY EYES'],
    bottom:     ['THAT IS A WRAP', 'THE END', 'STILL SCROLLING?'],
    sleep:      ['ZZZ', 'STILL HERE', 'WAKE ME'],
    thrown:     ['WHEEEE', 'NICE ARM', 'I CAN FLY'],
  };
  const pick = key => {
    const a = LINES[key] || LINES.hero;
    return a[(Math.random() * a.length) | 0];
  };

  /* NOT EVERYTHING IT SAYS IS WORTH THE SAME. Jumping to a section is
     also a fast scroll, so both had something to say and whichever spoke
     last won — which meant landing on the work grid announced "MY EYES"
     instead of naming the grid. Three ranks settle it: being poked beats
     arriving somewhere, and arriving somewhere beats a joke about the
     scroll wheel. A quieter line cannot talk over a louder one that is
     still on screen. */
  const RANK = { angry: 3, hero: 2, philosophy: 2, work: 2, ai: 2, archive: 2,
                 services: 2, pipeline: 2, contact: 2, project: 2, lost: 2 };
  let bubUntil = 0, bubRank = 0;
  function say(key, ms) {
    const rank = RANK[key] || 1;
    const now = performance.now();
    if (rank < bubRank && now < bubUntil) return;
    const text = pick(key);
    if (text === bubT.textContent && now < bubUntil) return;
    bubT.textContent = text;
    bub.classList.add('on');
    bubUntil = now + (ms || 2600);
    bubRank = rank;
    talkUntil = now + Math.min(900, text.length * 55);
    SFX.play('hover.chip');
  }

  /* ══ HOW IT MOVES ══════════════════════════════════════════════════════
     IT HAS THE WHOLE WINDOW. It used to patrol a lane along the bottom
     right, because given the full width it drifted over the hero's two
     buttons — and a character that covers the thing it is decorating is a
     mistake. The lane is gone and the problem is solved properly instead:
     while it is floating on its own it steers away from anything you could
     click, and the moment you pick it up and put it somewhere, that is
     where it stays. Your placement is not second-guessed; its own
     wandering is.

     Everything below is a velocity. Floating is a weak spring toward a
     point it re-picks every few seconds; a throw is that spring switched
     off and friction left to do the work; an edge is a bounce. And every
     frame ends by clamping it inside the window, so nothing — a throw, a
     resize, a bad number — can put it somewhere you cannot reach it. */
  const EDGE = 6;                                /* how close it may get */
  /* clientWidth, not innerWidth: innerWidth counts the scrollbar, and now
     that the scrollbar is a visible thirteen-pixel filmstrip, drifting
     underneath it means drifting behind something. */
  const bounds = () => ({ x0: EDGE, y0: EDGE,
                          x1: document.documentElement.clientWidth - W * S - EDGE,
                          y1: document.documentElement.clientHeight - H * S - EDGE });
  let x = bounds().x1 - 40, y = bounds().y1 - 30;
  let vx = 0, vy = 0;                            /* px per second */
  let tx = x, ty = y, retarget = 0;              /* where it is drifting to */
  let thrown = 0;                                /* while flying, no steering */
  let bob = 0, tilt = 0, squash = 0, hop = 0;
  let look = { x: 0, y: 0 }, want = { x: 0, y: 0 };
  let mood = 'idle', moodUntil = 0;
  let blinkAt = performance.now() + 2000, blinkFor = 0;
  let talkUntil = 0, glitchFor = 0;
  let lastMove = performance.now(), lastY = scrollY, vScroll = 0;

  const setMood = (m, ms) => { mood = m; moodUntil = performance.now() + ms; };

  /* the cursor: the pupils go where it is, and the body leans a little */
  addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    want.x = Math.max(-1, Math.min(1, (e.clientX - cx) / 260));
    want.y = Math.max(-1, Math.min(1, (e.clientY - cy) / 200));
    lastMove = performance.now();
    if (mood === 'sleep') setMood('surprised', 700);
  }, { passive: true });

  /* the scroll: a little startled, and properly dizzy if you really go */
  addEventListener('scroll', () => {
    const now = performance.now();
    const dy = scrollY - lastY;
    lastY = scrollY;
    vScroll = Math.abs(dy);
    lastMove = now;
    want.y = dy > 0 ? 0.8 : -0.8;
    if (vScroll > 130) {
      setMood('dizzy', 900);
      if (Math.random() < 0.25) say('fast', 1600);
    } else if (vScroll > 45 && mood !== 'dizzy') setMood('surprised', 450);
    /* the end of the page is worth a word */
    const bottom = document.documentElement.scrollHeight - innerHeight;
    if (bottom > 0 && scrollY >= bottom - 4) say('bottom', 3000);
  }, { passive: true });

  /* ══ PICKING IT UP ═════════════════════════════════════════════════════
     Press and it comes with you; let go and it keeps whatever speed your
     hand had. That last part is the whole trick — a drag that simply drops
     the thing where the pointer stopped feels like moving an icon, and a
     drag that hands over the speed of the throw feels like letting go of
     something alive.

     A press that never moves is not a drag, it is a poke, and a poke still
     makes it angry. Six pixels is the line between the two: below that, a
     hand that shook is not an instruction. */
  const POKE = 6;
  let grab = null;          /* {dx, dy, moved, trail:[…]} while held */

  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    grab = { dx: e.clientX - x, dy: e.clientY - y, moved: 0,
             trail: [{ x: e.clientX, y: e.clientY, t: performance.now() }] };
    vx = vy = 0; thrown = 0;
    setMood('surprised', 400);
    wrap.classList.add('held');
    SFX.play('tap.card');
  });

  addEventListener('pointermove', e => {
    if (!grab) return;
    const nx = e.clientX - grab.dx, ny = e.clientY - grab.dy;
    grab.moved = Math.max(grab.moved, Math.abs(e.clientX - grab.trail[0].x)
                                    + Math.abs(e.clientY - grab.trail[0].y));
    const b = bounds();
    x = Math.max(b.x0, Math.min(b.x1, nx));
    y = Math.max(b.y0, Math.min(b.y1, ny));
    /* only the last 90ms of the movement decides the throw: a slow drag
       that ends in a flick should fly, and one that ends stopped should not */
    const now = performance.now();
    grab.trail.push({ x: e.clientX, y: e.clientY, t: now });
    while (grab.trail.length > 2 && now - grab.trail[0].t > 90) grab.trail.shift();
    if (grab.moved > POKE && mood !== 'happy') setMood('happy', 600);
  }, { passive: false });

  addEventListener('pointerup', e => {
    if (!grab) return;
    const held = grab;
    grab = null;
    wrap.classList.remove('held');
    if (held.moved <= POKE) {                     /* a poke, not a throw */
      setMood('angry', 1500);
      say('angry', 1800);
      hop = 1; squash = 1;
      glitchFor = performance.now() + 320;
      SFX.play('deny');
      return;
    }
    const a = held.trail[0], b = held.trail[held.trail.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    vx = Math.max(-2600, Math.min(2600, (b.x - a.x) / dt));
    vy = Math.max(-2600, Math.min(2600, (b.y - a.y) / dt));
    const fast = Math.hypot(vx, vy);
    thrown = performance.now() + (fast > 260 ? 2600 : 700);
    if (fast > 700) { setMood('dizzy', 1100); say('thrown', 1600); SFX.play('away'); }
    else setMood('happy', 700);
    /* wherever it lands is where it will drift from next */
    tx = x; ty = y; retarget = performance.now() + 2400;
  });

  cv.addEventListener('mouseenter', () => {
    if (mood === 'angry' || grab) return;
    setMood('happy', 900);
    SFX.play('hover.card', 0.8);
  });

  /* ── what it must not sit on ───────────────────────────────────────────
     Read on a timer, never on the scroll path: sixty rectangles is a
     layout, and a layout on every scroll event is how a page starts
     dropping frames. Twice a second is plenty for something that moves at
     ninety pixels a second. */
  let noGo = [], noGoAt = 0;
  function readNoGo() {
    const out = [];
    for (const el of document.querySelectorAll('a,button,.wc,.ai-card,.sc-card,.cc,.wf-btn')) {
      if (el.closest('#pixl')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.bottom < -40 || r.top > innerHeight + 40) continue;
      out.push(r);
    }
    noGo = out;
  }
  /* would it be standing on something, if it stood here? */
  const busy = (px, py) => {
    const x1 = px + W * S, y1 = py + H * S;
    for (const r of noGo)
      if (!(x1 < r.left || px > r.right || y1 < r.top || py > r.bottom)) return true;
    return false;
  };
  /* ── SOMEWHERE ELSE TO BE ───────────────────────────────────────────────
     A push away from what it is standing on was not enough: the damping
     that keeps it from orbiting also swallows a nudge, so it sat on the
     card and shuffled. Choosing where to go is the decision, not how hard
     to shove — so a new target is one that is CLEAR, and if it is standing
     on something it goes and finds one now rather than in four seconds.

     On the work grid every middle point is a card, so after a dozen tries
     it takes the gutter instead: this layout keeps its margins empty, and
     the edge of the window is always somewhere to stand. */
  function findSpot() {
    const b = bounds();
    for (let i = 0; i < 14; i++) {
      const px = b.x0 + Math.random() * Math.max(1, b.x1 - b.x0);
      const py = b.y0 + Math.random() * Math.max(1, b.y1 - b.y0);
      if (!busy(px, py)) return { x: px, y: py };
    }
    const edge = Math.random() < 0.5 ? b.x0 : b.x1;
    return { x: edge, y: b.y0 + Math.random() * Math.max(1, b.y1 - b.y0) };
  }

  /* ── which section is it standing in front of ────────────────────────
     The home page has sections; a project page is a project page and the
     404 is lost. Only a change is worth speaking about. */
  let here = '';
  function watchSections() {
    const secs = [...document.querySelectorAll('section[id]')];
    if (!secs.length) {
      here = document.body.classList.contains('pj-body') ? 'project'
           : /404/.test(document.title) ? 'lost' : 'hero';
      setTimeout(() => say(here, 3200), 1800);
      return;
    }
    /* WHICH SECTION YOU ARE IN IS HOW MUCH OF THE SCREEN IT FILLS, not how
       much of ITSELF is on screen. Ratio is measured against the element,
       so a short section that fits entirely reports 1.0 while the work grid
       — six screens tall and filling every pixel of the window — reports
       0.2 and loses. Landing on the grid announced the section above it.

       intersectionRect.height is the honest number, and it comes free with
       the entry: no layout read, nothing measured on the scroll path. Every
       section's last answer is kept, because a callback only carries the
       ones that changed and the winner may not be among them. */
    const seen = new Map();
    const io = new IntersectionObserver(es => {
      for (const e of es)
        seen.set(e.target.id, e.isIntersecting ? e.intersectionRect.height : 0);
      let id = null, most = 0;
      for (const [k, v] of seen) if (v > most) { most = v; id = k; }
      if (!id || id === here) return;
      here = id;
      if (LINES[id]) say(id, 3000);
    }, { threshold: [0, 0.05, 0.25, 0.5, 0.75, 1] });
    secs.forEach(s => io.observe(s));
  }

  /* ══ THE LOOP ══════════════════════════════════════════════════════════
     It runs only while the character is on screen and the tab is in front,
     and it stops dead behind a modal — a face pulling expressions behind a
     film somebody is watching is exactly the wrong thing. */
  let last = performance.now(), running = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    /* ── where it goes ─────────────────────────────────────────────── */
    const b = bounds();
    if (!grab && !CALM) {
      if (now > thrown) {
        /* FLOATING. A weak spring toward a point somewhere in the window,
           re-picked every few seconds, damped so it arrives rather than
           orbits. Slow on purpose: this is a thing drifting, not a fly. */
        /* IT STEERS OFF ANYTHING YOU COULD CLICK — but only while it is
           drifting on its own. A thrown character stays exactly where it
           was thrown, because that was somebody's decision, not its own. */
        if (now > noGoAt) {
          readNoGo();
          noGoAt = now + 500;
          if (busy(x, y)) retarget = 0;      /* standing on something: move */
        }
        if (now > retarget) {
          const spot = findSpot();
          tx = spot.x; ty = spot.y;
          retarget = now + 4200 + Math.random() * 5200;
        }
        vx += (tx - x) * 0.55 * dt;
        vy += (ty - y) * 0.55 * dt;
        const damp = Math.pow(0.90, dt * 60);
        vx *= damp; vy *= damp;
        const cap = 120;                      /* px per second, drifting */
        const sp = Math.hypot(vx, vy);
        if (sp > cap) { vx = vx / sp * cap; vy = vy / sp * cap; }
      } else {
        /* THROWN. No steering at all — only friction, and the walls. */
        const fr = Math.pow(0.988, dt * 60);
        vx *= fr; vy *= fr;
      }
      x += vx * dt;
      y += vy * dt;

      /* the walls. It cannot leave, and hitting one is worth a sound. */
      const hit = (v) => { squash = Math.min(1, Math.abs(v) / 900 + 0.25); };
      if (x < b.x0) { x = b.x0; if (vx < -30) { hit(vx); SFX.play('hover.menu'); } vx = Math.abs(vx) * 0.62; }
      if (x > b.x1) { x = b.x1; if (vx > 30) { hit(vx); SFX.play('hover.menu'); } vx = -Math.abs(vx) * 0.62; }
      if (y < b.y0) { y = b.y0; if (vy < -30) { hit(vy); SFX.play('hover.menu'); } vy = Math.abs(vy) * 0.62; }
      if (y > b.y1) { y = b.y1; if (vy > 30) { hit(vy); SFX.play('hover.menu'); } vy = -Math.abs(vy) * 0.62; }
    }
    /* whatever happened above — a throw, a resize, a number that went
       wrong — it ends the frame inside the window */
    x = Math.max(b.x0, Math.min(b.x1, x));
    y = Math.max(b.y0, Math.min(b.y1, y));

    bob = CALM ? 0 : Math.sin(now / 620) * 3;
    hop = Math.max(0, hop - dt * 3.4);
    squash = Math.max(0, squash - dt * 3.6);
    vScroll *= 0.88;
    /* it leans into wherever it is going, and hangs straight when held */
    const leanTo = grab ? 0 : Math.max(-14, Math.min(14, vx * 0.06));
    tilt = CALM ? 0 : tilt + (leanTo - tilt) * 0.08;

    /* the pupils catch up rather than snap */
    look.x += (want.x - look.x) * 0.18;
    look.y += (want.y - look.y) * 0.18;

    /* blinking, on its own clock */
    if (now > blinkAt) { blinkFor = now + 110; blinkAt = now + 2400 + Math.random() * 3600; }

    /* boredom */
    if (now - lastMove > 22000 && mood === 'idle') { setMood('sleep', 6000); say('sleep', 2600); }
    if (mood !== 'idle' && now > moodUntil) mood = 'idle';
    if (performance.now() > bubUntil) bub.classList.remove('on');

    /* which face this frame is */
    let face = FACE[mood] || FACE.idle;
    if (mood === 'idle') {
      if (now < talkUntil) face = ((now / 130) | 0) % 2 ? FACE.talk : FACE.idle;
      else if (Math.abs(look.x) > 0.35 || Math.abs(look.y) > 0.35) face = FACE.look;
      if (now < blinkFor) face = { ...face, eyes: 'shut' };
    } else if (mood === 'sleep' && now < blinkFor) face = FACE.sleep;

    draw(face, look, now < glitchFor && Math.random() < 0.5);

    const lift = y + bob - hop * 16;
    const sx = 1 + squash * 0.18, sy = 1 - squash * 0.16;
    wrap.style.transform =
      'translate3d(' + x.toFixed(1) + 'px,' + lift.toFixed(1) + 'px,0)';
    cv.style.transform =
      'rotate(' + tilt.toFixed(1) + 'deg) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')';
    /* the bubble rides on the same body, so it never lags behind it */
    bub.style.transform = 'translateY(' + (-hop * 8).toFixed(1) + 'px)';

    requestAnimationFrame(frame);
  }
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  const stop = () => { running = false; };

  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  /* a modal is somebody watching a film: get out of the way, completely */
  const modal = document.getElementById('modal');
  if (modal) new MutationObserver(() => {
    const open = modal.classList.contains('open');
    wrap.classList.toggle('away', open);
    open ? stop() : start();
  }).observe(modal, { attributes: true, attributeFilter: ['class'] });

  addEventListener('resize', () => {
    const b = bounds();
    x = Math.max(b.x0, Math.min(b.x1, x));
    y = Math.max(b.y0, Math.min(b.y1, y));
    tx = Math.max(b.x0, Math.min(b.x1, tx));
    ty = Math.max(b.y0, Math.min(b.y1, ty));
    noGoAt = 0;
  }, { passive: true });

  /* ── on ────────────────────────────────────────────────────────────────
     Not while the loader is up: the character belongs to the site, not to
     the screen in front of it. */
  const wake = () => {
    watchSections();
    start();
    setTimeout(() => { if (!bub.classList.contains('on')) say(here || 'hero', 3200); }, 1200);
  };
  const ldr = document.getElementById('ldr');
  if (ldr) {
    new MutationObserver((m, o) => {
      if (!ldr.classList.contains('out')) return;
      o.disconnect();
      setTimeout(wake, 700);
    }).observe(ldr, { attributes: true, attributeFilter: ['class'] });
    /* and if the loader is already gone, or was never there */
    setTimeout(() => { if (!document.getElementById('ldr')) wake(); }, 900);
  } else setTimeout(wake, 600);
})();
