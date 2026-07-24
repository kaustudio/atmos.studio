// sx('position:fixed;top:24px;…') → memoized React style object.
// The design comp authored every static style as an inline CSS string; parsing them verbatim
// (instead of hand-transcribing to camelCase objects) keeps the port pixel-faithful.
const cache = new Map();

const VENDOR = /^(webkit|moz|ms|o)-/;

function toCamel(prop) {
  let p = prop.trim();
  const vendorWebkit = p.startsWith('-webkit-');
  const vendorMoz = p.startsWith('-moz-');
  p = p.replace(/^-+/, '');
  let camel = p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (vendorWebkit) camel = 'Webkit' + camel.charAt(0).toUpperCase() + camel.slice(1);
  else if (vendorMoz) camel = 'Moz' + camel.charAt(0).toUpperCase() + camel.slice(1);
  else if (VENDOR.test(prop.trim())) camel = camel.charAt(0).toUpperCase() + camel.slice(1);
  return camel;
}

export function sx(css) {
  if (!css) return undefined;
  const hit = cache.get(css);
  if (hit) return hit;
  const out = {};
  // split on ';' but not inside url(...) / gradients — inline styles here never nest ';' in values,
  // so a simple split is safe (verified against the source comp).
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return;
    const prop = decl.slice(0, i);
    const val = decl.slice(i + 1).trim();
    if (!prop.trim() || !val) return;
    out[toCamel(prop)] = val;
  });
  cache.set(css, out);
  return out;
}

export default sx;
