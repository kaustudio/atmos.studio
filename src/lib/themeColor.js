// Browser-chrome colour. On iOS the status bar and the Safari toolbar are painted from
// <meta name="theme-color">; with no such tag they fall back to the OS appearance, so a phone in
// dark mode framed this light page in two black bars — the page floated in a window that clearly
// wasn't part of it.
//
// The value is READ from the live --surface token rather than restated here: the app's theme is a
// runtime attribute on <html> (light by default, flipped by the nav toggle), and a second copy of
// #f5f5f3 / #141413 in JS is a copy that goes stale the first time the palette is retuned. The one
// unavoidable literal is index.html's own tag, which has to be right before any script runs.
export function syncThemeColor() {
  try {
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    if (!surface) return;
    let tag = document.querySelector('meta[name="theme-color"]');
    if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', 'theme-color'); document.head.appendChild(tag); }
    tag.setAttribute('content', surface);
  } catch (e) { }
}
