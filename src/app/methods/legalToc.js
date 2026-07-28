/* Osmo Supply — Table of Contents for Article.
   Used verbatim except for four integration accommodations, each marked [ATMOS] below. The data-*
   attribute contract, the clone-the-template approach and the ScrollTrigger-driven active state are
   all the resource's own and are left alone.

   [ATMOS 4] is the whole reason this file moved out of /public. It used to be a plain script that
   ran itself once on DOMContentLoaded, which is all a static document ever needs. Privacy and terms
   are routes now: the same markup mounts, unmounts and mounts again inside one document, and a
   build-once-and-forget script leaks a little more each time — a second set of ScrollTriggers
   measuring detached headings, a second click listener on a list that already had one, an active
   state fighting itself. So the body below is wrapped in an init that takes the mounted root and
   hands back a destroy, and everything it creates is now something it can also take away. */

// [ATMOS 4] Was a bare top-level call. gsap and ScrollTrigger are still the vendored globals from
// index.html rather than imports — that has not changed, only when we are allowed to touch them.
function registerPlugins() {
  // [ATMOS 1] Guarded. The original calls gsap.registerPlugin(ScrollTrigger) at the top level; on a
  // page where either vendored script 404s this would throw and take the click-to-scroll handler
  // down with it. Guarding keeps the TOC a working list of links even with no GSAP at all.
  if (window.gsap && window.ScrollTrigger) {
    try { window.gsap.registerPlugin(window.ScrollTrigger); } catch (e) { }
  }
}

/* [ATMOS 4] `root` was `document` and the sweep was over every [data-toc-wrap] on the page. It is the
   mounted route's own element now, so a build can never reach markup belonging to a route that is on
   its way out. `lenis` is the app's instance, handed in rather than read off a global: the original
   looked for a bare `lenis` binding, which this app has never had — its Lenis lives on the component
   (see misc.js _initLenis), so without this the smooth click-to-scroll silently fell back to
   window.scrollTo on the one page whose links are all in-page jumps. */
export function initTableOfContents(root, options) {
  var opts = options || {};
  var ScrollTrigger = window.ScrollTrigger;
  var teardown = [];
  registerPlugins();

  (root || document).querySelectorAll('[data-toc-wrap]').forEach(function (wrap) {
    const contentEl = wrap.querySelector('[data-toc-content]');
    const listEl = wrap.querySelector('[data-toc-list]');
    const templateLink = listEl && listEl.querySelector('[data-toc-link]');
    if (!contentEl || !listEl || !templateLink) return;

    const levels = (wrap.getAttribute('data-toc-levels') || 'h2,h3').split(',').map(l => l.trim().toLowerCase()).filter(l => /^h[1-6]$/.test(l));
    const levelSelector = levels.join(', ');
    if (!levelSelector) return;

    const offset = parseInt(wrap.getAttribute('data-toc-offset')) || 50;
    const marker = '{skip}';

    const slugCounts = new Map();

    function slugify(text) {
      let slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!slug) slug = 'section';

      const count = slugCounts.get(slug) || 0;
      slugCounts.set(slug, count + 1);
      return count === 0 ? slug : slug + '-' + (count + 1);
    }

    function stripMarker(el) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes(marker)) {
          node.textContent = node.textContent.replace(marker, '').trim();
        }
      }
    }

    const allHeadings = Array.from(contentEl.querySelectorAll(levelSelector));
    const headings = [];

    allHeadings.forEach(heading => {
      if (heading.hasAttribute('data-toc-ignore')) return;
      if (heading.textContent.includes(marker)) {
        stripMarker(heading);
        return;
      }
      const text = heading.textContent.trim();
      if (!text) return;
      headings.push(heading);
    });

    if (!headings.length) return;

    headings.forEach(heading => {
      if (!heading.id) {
        heading.id = slugify(heading.textContent.trim());
      }
    });

    const tocLinks = [];

    headings.forEach(heading => {
      const clone = templateLink.cloneNode(true);
      const textTarget = clone.querySelector('[data-toc-text]') || clone;
      textTarget.textContent = heading.textContent.trim();

      clone.href = '#' + heading.id;
      clone.removeAttribute('data-toc-link');
      clone.setAttribute('data-toc-item', '');

      const level = heading.tagName.charAt(1);
      clone.setAttribute('data-toc-depth', level);

      listEl.appendChild(clone);
      tocLinks.push(clone);
    });

    listEl.querySelectorAll('[data-toc-link]').forEach(el => el.remove());

    // Active state tracking via ScrollTrigger
    if (ScrollTrigger) {
      function setActive(index) {
        tocLinks.forEach(link => link.setAttribute('data-toc-status', ''));
        if (tocLinks[index]) tocLinks[index].setAttribute('data-toc-status', 'active');
      }

      headings.forEach((heading, i) => {
        const nextHeading = headings[i + 1];

        // [ATMOS 4] The trigger is kept so destroy() can kill it. Left unkilled, an unmounted route's
        // triggers stay in ScrollTrigger's global list measuring headings that are no longer in the
        // document — which is not merely wasteful: refresh() then computes positions against
        // detached elements, and the next route's own triggers are recalculated alongside them.
        teardown.push(ScrollTrigger.create({
          trigger: heading,
          start: 'top ' + (offset + 1) + 'px',
          endTrigger: nextHeading || contentEl,
          end: nextHeading ? 'top ' + (offset + 1) + 'px' : 'bottom top',
          onToggle: self => {
            if (self.isActive) setActive(i);
          }
        }));
      });

      if (window.scrollY <= headings[0].getBoundingClientRect().top + window.scrollY - offset) {
        setActive(0);
      }

      // [ATMOS 2] Neue Montreal is a local .otf loaded with font-display:swap, so first paint uses
      // a fallback face and every heading moves when the real one lands. ScrollTrigger caches
      // trigger positions at create time, so without this the active state is measured against a
      // layout that no longer exists.
      if (document.fonts && document.fonts.ready) {
        // [ATMOS 4] Guarded on still being mounted. This promise can settle after the reader has
        // already left the route, and refreshing then measures the route that replaced it.
        document.fonts.ready.then(() => { if (wrap.isConnected) ScrollTrigger.refresh(); });
      }
    }

    // Click handler with smooth scroll
    const onClick = e => {
      const link = e.target.closest('[data-toc-item]');
      if (!link) return;
      e.preventDefault();
      e.stopPropagation();

      const id = link.getAttribute('href')?.slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      // [ATMOS 4] `opts.lenis` replaces the original's bare `lenis` global — see the note on init.
      const lenis = opts.lenis;
      if (lenis && typeof lenis.scrollTo === 'function') {
        lenis.scrollTo(target, { offset: -offset });
      } else {
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        // [ATMOS 3] The app honours prefers-reduced-motion throughout (see PaletteApp's _reduce);
        // a legal page is the last place to override it. Same destination either way, no travel.
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      }
    };
    listEl.addEventListener('click', onClick);
    teardown.push({ kill: () => listEl.removeEventListener('click', onClick) });
  });

  // [ATMOS 4] The resource has no teardown because a static document never needs one. Everything
  // above that outlives a single call registers itself in `teardown`; this is the only way back out.
  return function destroy() {
    teardown.forEach(function (t) { try { t.kill(); } catch (e) { } });
    teardown = [];
  };
}
