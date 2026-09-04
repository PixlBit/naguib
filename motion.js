/* ════════════════════════════════════════════════════════════════════════
   motion.js — the slice of GSAP this site actually used.

   The page pulled ~110KB of GSAP + ScrollTrigger from cdnjs to do four
   things: fade/slide a few elements in, wipe the section titles open, pull
   a button toward the cursor, and fire two callbacks on scroll. That is a
   third-party origin trusted with arbitrary script execution, plus two
   network round-trips, for about 90 lines of arithmetic.

   This is that arithmetic, with GSAP's own easing formulas so the motion is
   identical, exposed under the same names so studio.js needs no changes.

   It deliberately writes inline style.transform / style.opacity / style.clipPath,
   exactly as GSAP does. That matters: .h-l1, .s-title, .btn-y and friends
   all run infinite CSS keyframes on transform, and a CSS animation outranks
   an inline style in the cascade. So on those elements the x/y half of a
   tween never showed and only opacity did. Reproducing the same writes
   reproduces the same result — including where it was already inert.

   Supported, because it is all that is used:
     gsap.to / gsap.fromTo   props x, y, opacity, clipPath
                             opts duration, delay, ease, stagger, scrollTrigger
     gsap.set
     ScrollTrigger.create    trigger, start:'top N%', once, onEnter, onEnterBack
   ════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ── easing ───────────────────────────────────────────────────────────
     GSAP names its power eases one step below the maths: Power1 is quad,
     Power2 is cubic, Power3 is quart. So power3.out is 1-(1-t)^4, not ^3 —
     getting this wrong makes everything feel subtly slower.            */
  const TAU = Math.PI * 2;
  function elasticOut(amplitude, period){
    const a = amplitude >= 1 ? amplitude : 1,
          p = (period || .3) / (amplitude < 1 ? amplitude : 1),
          s = p / TAU * Math.asin(1 / a);
    return t => t === 1 ? 1 : a * Math.pow(2, -10 * t) * Math.sin((t - s) * TAU / p) + 1;
  }
  const easeCache = {};
  function ease(name){
    if(!name) return t => t;
    if(typeof name === 'function') return name;
    if(easeCache[name]) return easeCache[name];
    let fn = t => t;
    let m = /^power(\d)\.(in|out|inOut)$/.exec(name);
    if(m){
      const pw = +m[1] + 1;                       /* power3 → exponent 4 */
      fn = m[2] === 'in'    ? t => Math.pow(t, pw)
         : m[2] === 'out'   ? t => 1 - Math.pow(1 - t, pw)
         : t => t < .5 ? Math.pow(t * 2, pw) / 2 : 1 - Math.pow((1 - t) * 2, pw) / 2;
    } else if((m = /^elastic\.out(?:\(([^)]*)\))?$/.exec(name))){
      const [a, p] = (m[1] || '1,0.3').split(',').map(Number);
      fn = elasticOut(a, p);
    } else if(name === 'none' || name === 'linear'){
      fn = t => t;
    }
    return (easeCache[name] = fn);
  }

  /* ── property writing ─────────────────────────────────────────────────
     x and y share one transform, so they need a per-element scratchpad.  */
  const xy = new WeakMap();
  function writeTransform(el){
    const s = xy.get(el);
    el.style.transform = 'translate(' + s.x + 'px, ' + s.y + 'px)';
  }
  function write(el, prop, v){
    if(prop === 'x' || prop === 'y'){
      let s = xy.get(el);
      if(!s) xy.set(el, (s = {x:0, y:0}));
      s[prop] = v;
      writeTransform(el);
    } else if(prop === 'opacity'){
      el.style.opacity = v;
    } else {
      el.style[prop] = v;                          /* clipPath and friends */
    }
  }
  /* clipPath is a string: lerp the numbers inside it and keep the shape,
     so inset(0 0 100% 0) → inset(0 0 0% 0) moves through inset(0 0 42% 0). */
  const NUM = /-?\d*\.?\d+/g;
  function lerpString(from, to, t){
    const a = String(from).match(NUM) || [];
    let i = 0;
    return String(to).replace(NUM, m => {
      const s = parseFloat(a[i++] ?? m);
      return String(+(s + (parseFloat(m) - s) * t).toFixed(4));
    });
  }
  function read(el, prop){
    if(prop === 'x' || prop === 'y') return (xy.get(el) || {x:0, y:0})[prop];
    if(prop === 'opacity'){
      const v = el.style.opacity !== '' ? el.style.opacity : getComputedStyle(el).opacity;
      return parseFloat(v) || 0;
    }
    return el.style[prop] || getComputedStyle(el)[prop];
  }

  /* ── ticker ───────────────────────────────────────────────────────────
     One rAF loop for every live tween; it stops dead when nothing is
     animating rather than spinning a frame callback forever.            */
  const live = new Set();
  let raf = null;
  function pump(now){
    raf = null;
    for(const tw of [...live]) tw.render(now);
    if(live.size) raf = requestAnimationFrame(pump);
  }
  function wake(){ if(!raf) raf = requestAnimationFrame(pump); }

  /* one tween owns a property on an element; a newer one takes it over */
  const owner = new Map();                          /* el → {prop → tween} */
  function claim(el, props, tw){
    let map = owner.get(el);
    if(!map) owner.set(el, (map = {}));
    for(const p of props){
      const prev = map[p];
      if(prev && prev !== tw) prev.drop(p);
      map[p] = tw;
    }
  }
  function release(el, prop, tw){
    const map = owner.get(el);
    if(map && map[prop] === tw) delete map[prop];
  }

  function Tween(el, from, to, opt){
    const props = Object.keys(to).filter(k => !RESERVED[k]);
    const t0 = performance.now() + (opt.delay || 0) * 1000;
    const dur = (opt.duration != null ? opt.duration : .5) * 1000;
    const fn = ease(opt.ease);
    const start = {}, end = {};
    const self = {
      render(now){
        if(now < t0) return;
        const p = dur <= 0 ? 1 : Math.min((now - t0) / dur, 1);
        const e = fn(p);
        for(const k of props){
          const a = start[k], b = end[k];
          write(el, k, typeof b === 'number' ? a + (b - a) * e : lerpString(a, b, e));
        }
        if(p >= 1){
          live.delete(self);
          for(const k of props) release(el, k, self);
        }
      },
      drop(prop){
        const i = props.indexOf(prop);
        if(i > -1) props.splice(i, 1);
        if(!props.length) live.delete(self);
      },
      play(){
        for(const k of props){
          start[k] = from && from[k] != null ? from[k] : read(el, k);
          end[k]   = to[k];
        }
        claim(el, props, self);
        live.add(self); wake();
        self.render(performance.now());            /* honour the from-state now */
        return self;
      },
      kill(){ live.delete(self); for(const k of props) release(el, k, self); }
    };
    /* fromTo paints its starting frame the instant it is created, even when
       it is waiting on a delay or a scroll trigger — that is what keeps the
       section titles clipped shut until you reach them. */
    if(from) for(const k of props) if(from[k] != null) write(el, k, from[k]);
    return self;
  }
  const RESERVED = {duration:1, delay:1, ease:1, stagger:1, scrollTrigger:1, onComplete:1};

  function resolve(target){
    if(!target) return [];
    if(typeof target === 'string') return [...document.querySelectorAll(target)];
    if(target.nodeType) return [target];
    if(Array.isArray(target) || target.length != null)
      return [].concat(...[...target].map(resolve));
    return [];
  }

  function build(target, from, to){
    const els = resolve(target);
    const tweens = els.map((el, i) => {
      const opt = Object.assign({}, to);
      opt.delay = (to.delay || 0) + (to.stagger || 0) * i;
      return Tween(el, from, to, opt);
    });
    if(to.scrollTrigger){
      /* default toggleActions is "play none none none": fire once, forward */
      ST.create(Object.assign({once:true}, to.scrollTrigger,
        {onEnter: () => tweens.forEach(t => t.play())}));
    } else {
      tweens.forEach(t => t.play());
    }
    return {kill(){ tweens.forEach(t => t.kill()); }};
  }

  /* ── ScrollTrigger ────────────────────────────────────────────────────
     start is 'top N%': the element's top reaching N% down the viewport.
     end is GSAP's default 'bottom top': the element's bottom leaving the
     top of the viewport. Between them the trigger is active, and the four
     crossings are onEnter / onLeave / onEnterBack / onLeaveBack.        */
  const triggers = [];
  function parseStart(start){
    const m = /^top\s+(-?[\d.]+)(%|px)?$/.exec(String(start || 'top 85%').trim());
    if(!m) return () => innerHeight * .85;
    const v = parseFloat(m[1]);
    return m[2] === 'px' ? () => v : () => innerHeight * (v / 100);
  }
  const ST = {
    create(cfg){
      const el = typeof cfg.trigger === 'string'
        ? document.querySelector(cfg.trigger) : cfg.trigger;
      if(!el) return null;
      const t = {el, cfg, line: parseStart(cfg.start), state: null, dead: false};
      triggers.push(t);
      check(t);                                    /* honour where we already are */
      return t;
    },
    refresh(){ triggers.forEach(check); }
  };

  function check(t, pre){
    if(t.dead) return;
    const r = pre || t.el.getBoundingClientRect();
    const state = r.bottom <= 0 ? 'after' : (r.top <= t.line() ? 'active' : 'before');
    const was = t.state;
    if(state === was) return;
    t.state = state;
    if(was === null) {                             /* first look, not a crossing */
      if(state === 'active' || state === 'after') fire(t, 'onEnter');
      return;
    }
    const fwd = ORDER[state] > ORDER[was];
    if(fwd){
      if(was === 'before') fire(t, 'onEnter');
      if(state === 'after') fire(t, 'onLeave');
    } else {
      if(was === 'after')  fire(t, 'onEnterBack');
      if(state === 'before') fire(t, 'onLeaveBack');
    }
  }
  const ORDER = {before:0, active:1, after:2};
  function fire(t, name){
    if(t.dead) return;
    if(name === 'onEnter' && t.cfg.once) t.dead = true;
    const cb = t.cfg[name];
    if(cb) cb(t);
  }

  let queued = false;
  function onScroll(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      /* Every rectangle is read before a single callback runs. A callback
         that touches a style invalidates layout, so asking the next trigger
         for its rectangle forced the whole document to be recalculated —
         thirteen triggers meant thirteen recalculations per frame. Reading
         first and firing second turns that into one. */
      const live = triggers.filter(t => !t.dead);
      const rects = live.map(t => t.el.getBoundingClientRect());
      for(let i = 0; i < live.length; i++) check(live[i], rects[i]);
    });
  }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll, {passive:true});

  /* ── public surface ───────────────────────────────────────────────── */
  window.gsap = {
    registerPlugin(){},
    to(target, vars){ return build(target, null, vars); },
    fromTo(target, from, vars){ return build(target, from, vars); },
    set(target, vars){
      resolve(target).forEach(el => {
        for(const k in vars) if(!RESERVED[k]) write(el, k, vars[k]);
      });
    }
  };
  window.ScrollTrigger = ST;
})();
