/* THE TILES' WORDS RISE THROUGH THEIR MASKS (19.09.26, by request: "Hex code and LCH should use the text
   masked animation").

   How it Works 2.1's key is a set of colour tiles, and each tile's hex and OKLCH take the page's masked
   line arrival: the line sits in its own clipping mask and rises out of it. It is not [data-reveal],
   and that is deliberate: pageReveal reveals a section's copy as ONE cascade when its heading enters,
   which for this figure is a screen before the tiles are, so the lines would rise out of sight. These
   rise with their tiles instead. The trigger and the enter line are the cascade's (aboutCascade.js, which
   lands the tiles themselves), the stagger between tiles is its --dur-stagger, and the rise is the
   page's maskMotion, so the words follow the tile they sit on.

   Floors as the page's other modules do: no GSAP, no ScrollTrigger or reduced motion leaves the words
   where the stylesheet puts them. A catch-up plays anything whose enter line has already passed (the
   trigger-created-before-fonts note in pageReveal.js), and a stalled run is finished rather than left
   below its mask. */

function noop() { }
const ENTER = 0.88;

function cssSeconds(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) return fallback;
    return Math.min(/ms$/i.test(raw) ? n / 1000 : n, 0.2);
  } catch (e) { return fallback; }
}

export function initTileLines(root, motion) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || !root) return noop;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return noop; } catch (e) { }
  try { gsap.registerPlugin(ScrollTrigger); } catch (e) { return noop; }

  const sets = [].slice.call(root.querySelectorAll('[data-tile-lines]'));
  if (!sets.length) return noop;
  const M = motion || { duration: 0.62, ease: 'expo.out', stagger: 0.09 };
  const between = cssSeconds('--dur-stagger', 0.05);
  const triggers = [];
  const timers = [];
  const units = [];

  sets.forEach((set) => {
    const tiles = [].slice.call(set.children).filter((el) => el.nodeType === 1);
    const lines = tiles.map((t) => [].slice.call(t.querySelectorAll('[data-tile-line] > *')));
    const all = [].concat.apply([], lines);
    if (!all.length) return;
    gsap.set(all, { yPercent: 110 });
    const unit = { set, done: false };
    unit.run = () => {
      if (unit.done || !set.isConnected) return;
      unit.done = true;
      const tweens = lines.map((ls, i) => gsap.to(ls, {
        yPercent: 0, duration: M.duration, ease: M.ease, stagger: M.stagger, delay: i * between, overwrite: 'auto',
      }));
      timers.push(setTimeout(() => {
        if (!set.isConnected) return;
        tweens.forEach((tw) => { if (tw.progress() < 1) { try { tw.kill(); } catch (e) { } } });
        try { gsap.set(all, { yPercent: 0 }); } catch (e) { }
      }, (M.duration + M.stagger + between * tiles.length) * 1000 + 900));
    };
    units.push(unit);
    triggers.push(ScrollTrigger.create({
      trigger: set, start: 'top ' + (ENTER * 100) + '%', once: true, invalidateOnRefresh: true, onEnter: unit.run,
    }));
  });

  function catchUp() {
    const limit = window.innerHeight * ENTER;
    units.forEach((u) => { if (!u.done && u.set.getBoundingClientRect().top <= limit) u.run(); });
  }
  const onRefresh = () => catchUp();
  ScrollTrigger.addEventListener('refresh', onRefresh);
  window.addEventListener('load', onRefresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(catchUp, catchUp);
  timers.push(setTimeout(catchUp, 0), setTimeout(catchUp, 1200), setTimeout(catchUp, 3000));

  return function destroy() {
    timers.forEach(clearTimeout);
    try { ScrollTrigger.removeEventListener('refresh', onRefresh); } catch (e) { }
    window.removeEventListener('load', onRefresh);
    triggers.forEach((t) => { try { t.kill(); } catch (e) { } });
  };
}
