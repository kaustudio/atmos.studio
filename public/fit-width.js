/* Osmo Supply — Fit Text to Width.
   Used verbatim: the [data-fit-width] contract, the 5-pass ratio fit, the rAF-throttled
   ResizeObserver on the parent and the re-fit after document.fonts.ready are all the resource's own
   and are left alone. No [ATMOS] accommodations were needed.

   Loaded by /404.html, where it sizes the 404 to the full width of its container. It is a plain
   script rather than a module import so the resource stays a delivered file, and it is placed BEFORE
   the page's own module so its DOMContentLoaded listener is registered first.

   The one integration note lives on the other side of the seam, in public/notfound.css: this script
   fills the *parent's* inner width, so the parent (.nf-type) is what decides how wide the 404 gets. */

function initTextFitToWidth(root) {
  const scope = root || document;
  const elements = [...scope.querySelectorAll("[data-fit-width]")];
  if (!elements.length) return () => {};

  const groups = new Map();
  elements.forEach((el) => {
    const parent = el.parentElement;
    if (!parent) return;
    el.style.whiteSpace = "nowrap";
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });

  function availableWidth(parent) {
    const cs = getComputedStyle(parent);
    return parent.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function fit(el, available) {
    if (available <= 0) return;
    let size = parseFloat(getComputedStyle(el).fontSize) || 16;
    for (let i = 0; i < 5; i++) {
      const width = el.getBoundingClientRect().width;
      if (width <= 0) break;
      const ratio = available / width;
      if (Math.abs(ratio - 1) < 0.002) break;
      size *= ratio;
      el.style.fontSize = size + "px";
    }
  }

  function refit() {
    groups.forEach((els, parent) => {
      const available = availableWidth(parent);
      els.forEach((el) => fit(el, available));
    });
  }

  let frame = null;
  function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      refit();
    });
  }

  let ro;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(schedule);
    groups.forEach((els, parent) => ro.observe(parent));
  }
  window.addEventListener("resize", schedule);

  refit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);

  return () => {
    if (frame) cancelAnimationFrame(frame);
    if (ro) ro.disconnect();
    window.removeEventListener("resize", schedule);
    elements.forEach((el) => {
      el.style.whiteSpace = "";
      el.style.fontSize = "";
    });
  };
}

// Initialize Text Fit to Width
document.addEventListener("DOMContentLoaded", () => {
  initTextFitToWidth();
});
