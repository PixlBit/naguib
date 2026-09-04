/* ════════════════════════════════════════════════════════════════════════
   sound.js — the interface has a voice.

   Every sound here is SYNTHESISED, in the browser, at the moment it plays.
   There is not one audio file. A set of ten UI sounds shipped as files is
   100–300KB — on a page whose entire payload is 314KB, the sound design
   would have been the heaviest thing on the site. This is zero bytes, needs
   no change to the content policy because nothing is ever fetched, and it
   can be parameterised: the hover tick is pitched by where the element sits
   on screen, so running a cursor across thirty-five cards plays a phrase
   rather than the same click thirty-five times.

   IT IS ON, AND THERE IS NO SWITCH. The site sounds the way it looks; a
   control asking permission for its own interface would be one more thing on
   the screen, so there isn't one. What still holds it back is the browser:
   no page may make a sound before the visitor has touched it, so nothing is
   built or played until the first click, key or scroll. Phones get none of
   it — people browse those in public, and it would be one more thing for a
   small battery to carry.

   THE PALETTE. Interface sound fails in two directions: too long, and too
   loud. Nothing here is over 400ms, most of it is under 80, and the master
   is capped and then limited so that no combination of events can spike.
   Hover is a hair above silence — you notice it when it stops. The pitches
   are one minor pentatonic across the whole site, so two sounds landing
   together are never a discord.
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SMALL = matchMedia('(max-width: 768px)').matches ||
                ('ontouchstart' in window && innerWidth < 900);

  /* A phone gets no sound. Everything below returns harmlessly so callers
     never have to ask whether the system exists. */
  const dead = { play(){}, scroll(){}, loading(){}, loaded(){},
                 get enabled(){ return false; }, get available(){ return false; } };
  if (SMALL) { window.SFX = dead; return; }

  let ctx = null, master = null, noiseBuf = null;

  /* ── the instrument ──────────────────────────────────────────────────
     Built on the first sound actually played, never before. An AudioContext
     created at load starts suspended and Chrome logs about it; one created
     inside a gesture starts running. */
  function build() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch { return false; }

    master = ctx.createGain();
    master.gain.value = 0.5;
    /* A limiter, not an effect. Two or three sounds can land on the same
       frame — a card hover under a modal opening under a scroll cue — and
       without this their peaks simply add. */
    const limit = ctx.createDynamicsCompressor();
    limit.threshold.value = -12;
    limit.knee.value = 6;
    limit.ratio.value = 12;
    limit.attack.value = 0.002;
    limit.release.value = 0.12;
    master.connect(limit).connect(ctx.destination);

    /* One noise buffer, made once and replayed. Building a fresh one per
       click would allocate a few thousand floats on every tap. */
    const n = Math.floor(ctx.sampleRate * 0.12);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    return true;
  }

  /* Suspended contexts happen: a tab backgrounded mid-session, or an
     autoplay policy that only lifts on the gesture we are inside. */
  const wake = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };

  /* ── no instrument before a gesture ───────────────────────────────────
     Browsers refuse to let audio start until the visitor has interacted
     with the page. A context built before that starts suspended, holds an
     audio thread it cannot use, and makes Chrome log about it — so it is
     not built at all until a real gesture has happened.

     This also settles the boot flourish honestly. On a cold load there has
     been no gesture by the time the loader finishes, so it does not play —
     which is not a loss, because the browser would have refused to sound it
     anyway. Someone who turned sound on during the loading screen has
     gestured, and hears it. */
  let gestured = false;
  const arm = () => { gestured = true; };
  for (const ev of ['pointerdown', 'keydown', 'touchstart'])
    addEventListener(ev, arm, { capture: true, once: true, passive: true });
  const hasGesture = () => gestured ||
    !!(navigator.userActivation && navigator.userActivation.hasBeenActive);

  /* ── voices ───────────────────────────────────────────────────────────
     A hard cap. Dragging a cursor across the grid fires a mouseenter per
     card; the throttle below thins those, but a cap is what guarantees the
     graph never grows without bound however the events arrive. */
  let voices = 0;
  const MAX_VOICES = 12;

  /* A gain stepped straight from 0 to its level is a click — a
     discontinuity in the waveform, which a speaker reproduces faithfully as
     a pop. Four milliseconds of attack removes it and is far too short to
     hear as a fade. And exponentialRamp cannot reach zero, hence 1e-4. */
  function env(g, level, t, dur, attack = 0.004) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(o) {
    if (voices >= MAX_VOICES) return;
    const t = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.08;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    env(g, o.gain == null ? 0.06 : o.gain, t, dur, o.attack);
    let last = g;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.value = o.cut || 1200;
      f.Q.value = o.q || 1;
      g.connect(f); last = f;
    }
    last.connect(master);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    voices++;
    osc.onended = () => { voices--; osc.disconnect(); g.disconnect(); if (o.filter) last.disconnect(); };
  }

  /* the transient — what makes a click read as a click rather than a beep */
  function tick(o) {
    if (!noiseBuf || voices >= MAX_VOICES) return;
    const t = ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.05;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = o.cut || 2600;
    f.Q.value = o.q || 1.2;
    const g = ctx.createGain();
    env(g, o.gain == null ? 0.05 : o.gain, t, dur, 0.001);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
    voices++;
    src.onended = () => { voices--; src.disconnect(); f.disconnect(); g.disconnect(); };
  }

  /* ── THE SCROLL ───────────────────────────────────────────────────────
     Not a tick per event. A wheel fires dozens of times a second and a
     discrete sound on each one is a machine gun; what a moving page wants is
     air. So: one looping bed of filtered noise, silent by default, whose
     level follows how fast the page is actually moving and falls back to
     nothing the moment it stops. Direction moves the filter rather than the
     pitch — going down is darker, coming back up is brighter — which is how
     movement reads without ever becoming a note you could hum.

     Built on the first scroll that happens while sound is on, never before,
     and it costs one node for the life of the page. */
  let bed = null, bedGain = null, bedFilt = null;
  function bedUp() {
    if (bed) return true;
    /* The click buffer decays to nothing by design, so looping it would
       pulse. The bed needs its own flat noise — and it is one-pole filtered
       on the way in, because raw white noise is hiss and this wants air. */
    const sr = ctx.sampleRate, n = Math.floor(sr * 2);
    const buf = ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = v * 0.86 + (Math.random() * 2 - 1) * 0.14;
      d[i] = v * 3.2;
    }
    /* A loop seam is a discontinuity, and a discontinuity is a tick — once
       every two seconds, forever. Crossfading the tail over the head makes
       the loop truly seamless. */
    const x = Math.floor(sr * 0.05);
    for (let i = 0; i < x; i++) {
      const a = i / x;
      d[i] = d[i] * a + d[n - x + i] * (1 - a);
    }
    bed = ctx.createBufferSource();
    bed.buffer = buf;
    bed.loop = true;
    bed.loopStart = 0;
    bed.loopEnd = (n - x) / sr;
    bedFilt = ctx.createBiquadFilter();
    bedFilt.type = 'bandpass';
    bedFilt.frequency.value = 900;
    bedFilt.Q.value = 0.7;
    bedGain = ctx.createGain();
    bedGain.gain.value = 0;
    bed.connect(bedFilt).connect(bedGain).connect(master);
    bed.start();
    return true;
  }
  /* v is 0..1 — how fast, not how far. dir is +1 down, -1 up. */
  function scroll(v, dir) {
    if (!hasGesture() || !build()) return;
    wake();
    if (ctx.state !== 'running' || !bedUp()) return;
    const t = ctx.currentTime;
    const lvl = Math.min(0.03, 0.004 + Math.max(0, Math.min(1, v)) * 0.026);
    bedGain.gain.cancelScheduledValues(t);
    bedGain.gain.setTargetAtTime(lvl, t, 0.05);
    bedGain.gain.setTargetAtTime(0, t + 0.13, 0.09);   /* stop moving, stop sounding */
    bedFilt.frequency.setTargetAtTime(dir < 0 ? 1450 : 720, t, 0.12);
  }

  /* ── THE LOADING HUM ──────────────────────────────────────────────────
     The loader is the one screen with nothing to do but wait, so it gets
     the one continuous sound on the site: a low machine hum that BRIGHTENS
     as the page fills. Two detuned saws an octave apart under a lowpass,
     and the filter opens from 260Hz to 2.2kHz across the load — the pitch
     never moves, so it reads as a machine spinning up rather than a tune.

     It is built on the first frame of the loader that has a gesture behind
     it, and torn down for good when the screen lifts. Nothing about it
     survives into the site. */
  let hum = null, hum2 = null, humGain = null, humFilt = null, humDead = false;
  function humUp() {
    if (hum || humDead) return true;
    humFilt = ctx.createBiquadFilter();
    humFilt.type = 'lowpass';
    humFilt.frequency.value = 260;
    humFilt.Q.value = 1.4;
    humGain = ctx.createGain();
    humGain.gain.value = 0;
    humFilt.connect(humGain).connect(master);
    hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 55;
    hum2 = ctx.createOscillator();
    hum2.type = 'sawtooth';
    hum2.frequency.value = 110.6;            /* a whisker sharp: it beats slowly */
    hum.connect(humFilt); hum2.connect(humFilt);
    hum.start(); hum2.start();
    humGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.25);
    return true;
  }
  /* p is 0..1 — how much of the page is in */
  function loading(p) {
    if (humDead || !hasGesture() || !build()) return;
    wake();
    if (ctx.state !== 'running' || !humUp()) return;
    const t = ctx.currentTime;
    humFilt.frequency.setTargetAtTime(260 + Math.max(0, Math.min(1, p)) * 1940, t, 0.18);
  }
  function loaded() {
    humDead = true;                          /* and it can never come back */
    if (!humGain) return;
    const t = ctx.currentTime;
    humGain.gain.cancelScheduledValues(t);
    humGain.gain.setTargetAtTime(0, t, 0.09);
    setTimeout(() => {
      try { hum.stop(); hum2.stop(); hum.disconnect(); hum2.disconnect();
            humFilt.disconnect(); humGain.disconnect(); } catch {}
      hum = hum2 = humGain = humFilt = null;
    }, 700);
  }

  /* ── the palette ──────────────────────────────────────────────────────
     One scale for the whole site — A minor pentatonic — so no two sounds
     that happen to overlap can clash. Hover walks it; everything else takes
     fixed degrees of it. */
  const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  const SOUNDS = {
    /* ── HOVER, one voice per kind of thing ──────────────────────────────
       These were built at a hair above silence — the sound designer's
       instinct, and wrong for this site. On a laptop speaker in a room with
       any air conditioning at all they simply were not there, and a sound
       nobody can hear is not restraint, it is a bug. They are around three
       times louder now, and still nothing reaches 60ms.

       The point is not that you hear seven different sounds; it is that a
       menu does not feel like a card and a card does not feel like a client
       mark, the way a real console has different switches under the finger. */

    /* THE MENU. A hair of transient and then a note that falls — the only
       hover with a click in it, because the menu is the one thing on the
       page you aim at rather than wander onto. */
    'hover.menu': () => {
      tick({ cut: 6000, dur: 0.01, gain: 0.022, q: 2 });
      tone({ freq: 2637, to: 1975.53, dur: 0.05, gain: 0.034, type: 'triangle' });
    },

    /* a film in the grid — pitched by where it sits, so a run down the
       column plays a phrase */
    'hover.card': (v = 0.5) => {
      const f = SCALE[Math.min(SCALE.length - 1, Math.round(v * (SCALE.length - 1)))];
      tone({ freq: f * 2, dur: 0.05, gain: 0.032, type: 'sine' });
    },

    /* a filter chip — a small hard thing */
    'hover.chip': () => tone({ freq: 2093, dur: 0.035, gain: 0.032, type: 'triangle' }),

    /* the call to action — it lifts, because it is asking for something */
    'hover.cta': () => tone({ freq: 1760, to: 2637, dur: 0.055, gain: 0.034,
                              type: 'triangle' }),

    /* A card of prose or a client mark — the roundest voice, and the lowest,
       which is why it carries the most gain of the seven: the ear is least
       sensitive down here, so equal numbers would not be equal loudness. */
    'hover.panel': () => tone({ freq: 880, dur: 0.06, gain: 0.036, type: 'sine' }),

    /* a contact or social link — warm, mid */
    'hover.link': () => tone({ freq: 1318.51, dur: 0.045, gain: 0.03, type: 'sine' }),

    /* anything not otherwise named */
    'hover.ui': () => tone({ freq: 2637, dur: 0.04, gain: 0.028, type: 'sine' }),

    /* ── CLICK, the same six, answered ──────────────────────────────── */

    /* going somewhere in the menu — a step down, like a detent */
    'tap.menu': () => {
      tick({ cut: 4000, dur: 0.022, gain: 0.032 });
      tone({ freq: 880, to: 659.25, dur: 0.06, gain: 0.04, type: 'triangle' });
    },
    /* the one that matters — opening a film */
    'tap.card': () => {
      tick({ cut: 1800, dur: 0.04, gain: 0.045 });
      tone({ freq: 329.63, to: 659.25, dur: 0.16, gain: 0.055, type: 'sawtooth',
             filter: 'lowpass', cut: 2200, q: 4 });
      tone({ freq: 880, dur: 0.1, gain: 0.03, type: 'sine', delay: 0.05 });
    },
    /* selecting a filter — two degrees, tight together */
    'tap.chip': () => {
      tick({ cut: 4200, dur: 0.025, gain: 0.035 });
      tone({ freq: 880, dur: 0.05, gain: 0.04 });
      tone({ freq: 1318.51, dur: 0.06, gain: 0.03, delay: 0.045 });
    },
    /* the call to action — the brightest confirmation the site has */
    'tap.cta': () => {
      tick({ cut: 3400, dur: 0.03, gain: 0.05 });
      tone({ freq: 587.33, to: 880, dur: 0.11, gain: 0.05, type: 'triangle' });
      tone({ freq: 1760, dur: 0.09, gain: 0.028, delay: 0.055, type: 'sine' });
    },
    /* a panel — a soft thunk, felt more than heard */
    'tap.panel': () => {
      tick({ cut: 900, dur: 0.045, gain: 0.04, q: 0.7 });
      tone({ freq: 220, dur: 0.09, gain: 0.04, type: 'sine' });
    },
    /* a contact link */
    'tap.link': () => {
      tick({ cut: 3000, dur: 0.028, gain: 0.038 });
      tone({ freq: 1046.5, dur: 0.07, gain: 0.038, type: 'triangle' });
    },
    'tap.ui': () => {
      tick({ cut: 3200, dur: 0.035, gain: 0.05 });
      tone({ freq: 587.33, to: 440, dur: 0.075, gain: 0.05, type: 'triangle' });
    },

    /* A CLICK THAT LANDS ON NOTHING. Pressing an empty part of the page is
       still a press, and a surface that answers everything except that reads
       as broken rather than restrained. So: the transient with no note under
       it — the sound of tapping a desk, not of pressing a button. */
    'tap.void': () => tick({ cut: 2400, dur: 0.018, gain: 0.022, q: 0.9 }),

    /* ── the details ────────────────────────────────────────────────── */

    /* leaving for another site — the same shape as tap.link, going up and
       away rather than landing */
    away: () => {
      tick({ cut: 3600, dur: 0.025, gain: 0.035 });
      tone({ freq: 880, to: 1760, dur: 0.13, gain: 0.04, type: 'triangle' });
    },

    /* THE TYPEWRITER. One click per character would be twenty-five sounds a
       second; the throttle thins it to a texture rather than a rhythm, and
       at this level it reads as the machine working, not as a sound. */
    type: () => tick({ cut: 5200, dur: 0.012, gain: 0.010, q: 2.4 }),

    /* SELECTING TEXT. A short swell on the moment a selection is made —
       the interface acknowledging that you marked something. */
    select: () => {
      tone({ freq: 261.63, to: 523.25, dur: 0.14, gain: 0.022, type: 'sine' });
      tone({ freq: 1046.5, dur: 0.07, gain: 0.012, delay: 0.06, type: 'sine' });
    },

    /* A MILESTONE OF THE LOAD. Not a tick on a timer — one of these is one
       real thing that finished, and it climbs the scale as the page fills,
       so the six of them together are the page assembling itself. */
    load: (p = 0) => {
      const i = Math.min(SCALE.length - 1, Math.round(Math.max(0, Math.min(1, p)) * (SCALE.length - 1)));
      tick({ cut: 4600, dur: 0.018, gain: 0.022, q: 1.6 });
      tone({ freq: SCALE[i] * 2, dur: 0.07, gain: 0.03, type: 'triangle' });
    },

    /* THE END OF THE PAGE. You reach the top or the bottom and the scroll
       stops answering; this is the surface saying so. Low, short, closed. */
    edge: () => tone({ freq: 174.61, dur: 0.12, gain: 0.03, type: 'sine',
                       filter: 'lowpass', cut: 600 }),

    /* ── the moments ────────────────────────────────────────────────── */
    open: () => {
      tone({ freq: 293.66, to: 880, dur: 0.19, gain: 0.05, type: 'triangle' });
      tone({ freq: 1174.66, dur: 0.12, gain: 0.022, delay: 0.08 });
    },
    close: () => {
      tone({ freq: 783.99, to: 246.94, dur: 0.15, gain: 0.045, type: 'triangle' });
    },
    /* moving between sections */
    nav: () => {
      tone({ freq: 659.25, dur: 0.07, gain: 0.035, type: 'triangle' });
      tone({ freq: 987.77, dur: 0.08, gain: 0.025, delay: 0.04 });
    },
    /* more of the grid arriving — three steps up */
    more: () => {
      [0, 2, 4].forEach((s, i) =>
        tone({ freq: SCALE[s + 2], dur: 0.09, gain: 0.038, delay: i * 0.055,
               type: 'triangle' }));
    },
    /* refusal — low, detuned, unmistakably not a confirmation */
    deny: () => {
      tone({ freq: 155.56, dur: 0.11, gain: 0.05, type: 'square',
             filter: 'lowpass', cut: 700 });
      tone({ freq: 146.83, dur: 0.13, gain: 0.04, type: 'square', delay: 0.06,
             filter: 'lowpass', cut: 600 });
    },
    /* GOODBYE. The rest of the site is a machine room; this one is a toy —
       square waves, three steps up and a boop back down, the way a handheld
       console says goodnight. It is the only cheerful thing here, and it is
       allowed to be because you only ever hear it on the way out.

       Note what it is NOT attached to: a tab actually closing. The page is
       torn down before any audio reaches the speaker, in every browser, on
       purpose. What it answers is the moment before — a cursor climbing to
       the tab bar, or the tab going to the background. */
    bye: () => {
      [1046.5, 1318.51, 1567.98].forEach((f, i) =>
        tone({ freq: f, dur: 0.085, gain: 0.036, delay: i * 0.07, type: 'square',
               filter: 'lowpass', cut: 2600 }));
      tone({ freq: 2093, to: 1046.5, dur: 0.16, gain: 0.022, delay: 0.22,
             type: 'triangle' });
    },
    /* the loader finishing — the one flourish the site gets */
    boot: () => {
      [440, 659.25, 880, 1318.51].forEach((f, i) =>
        tone({ freq: f, dur: 0.5 - i * 0.06, gain: 0.045, delay: i * 0.07,
               type: 'triangle' }));
      tone({ freq: 110, to: 220, dur: 0.6, gain: 0.05, type: 'sine' });
    },
  };

  /* Old names still answer, so nothing that calls play('hover') or
     play('tap') has to know the kinds exist. */
  SOUNDS.hover = SOUNDS['hover.ui'];
  SOUNDS.tap = SOUNDS['tap.ui'];
  SOUNDS.play = SOUNDS['tap.card'];
  SOUNDS.filter = SOUNDS['tap.chip'];

  /* ── the throttle ─────────────────────────────────────────────────────
     Per sound, not global: a hover storm must not swallow the click that
     comes out of it. Hover is thinned hardest because it is the one the
     cursor can fire dozens of times a second. */
  const GAP = { nav: 90, more: 200, select: 400, type: 62, boot: 2000, edge: 900, load: 70,
                bye: 8000 };   /* a cursor bobbing at the top edge is not a farewell */
  /* every hover is thinned the same, every click likewise, whatever kind it
     is — otherwise moving between two kinds of element would slip past a
     per-name throttle and fire twice as often as one kind does */
  const FAMILY = { hover: 55, tap: 40 };
  const family = n => FAMILY[n.split('.')[0]];
  const last = new Map();

  function play(name, arg) {
    const fn = SOUNDS[name];
    if (!fn) return;
    const now = performance.now();
    const fam = family(name);
    const key = fam ? name.split('.')[0] : name;
    const gap = fam || GAP[name] || 0;
    if (gap && now - (last.get(key) || -1e9) < gap) return;
    last.set(key, now);
    if (!hasGesture()) return;             /* nothing to hear yet, so build nothing */
    if (!build()) return;
    wake();
    if (ctx.state !== 'running') return;   /* still gated — stay silent */
    try { fn(arg); } catch {}
  }

  window.SFX = {
    play,
    scroll,
    loading,
    loaded,
    /* No switch, so these are true and constant. They stay because callers
       ask `available` before assuming the system exists at all — on a phone
       the same two answers come back false. */
    get enabled(){ return true; },
    get available(){ return true; },
  };

  /* a tab coming back from the background finds its context suspended */
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
})();
