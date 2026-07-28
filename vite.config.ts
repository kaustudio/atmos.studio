import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/* Clean URLs, in dev and preview, matching what vercel.json turns on at the edge.
 *
 * Production serves /privacy from dist/privacy.html and 308s /privacy.html to it — that is
 * `cleanUrls: true`, and it is the host's job. Neither Vite's dev server nor `vite preview` does any
 * of it, so without this the two disagree in both directions: /privacy.html would still resolve
 * locally long after it stopped existing in production, and /privacy would fall through to the SPA
 * shell in preview rather than to the prerendered document that is the thing worth checking.
 *
 * A local server that is wrong in the reader's favour is the worst kind: it hides exactly the
 * breakage it is supposed to surface.
 */
function cleanUrls() {
  const LEGAL = ['privacy', 'terms'];
  const handler = (outDir: string | null) => (req: any, res: any, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const legacy = path.match(/^\/(privacy|terms)\.html$/);
    if (legacy) {
      res.statusCode = 308;
      res.setHeader('Location', '/' + legacy[1] + url.search);
      res.end();
      return;
    }
    const name = path.slice(1);
    // Only in preview, and only when the prerender actually produced the file: in dev there is no
    // dist/, and the SPA fallback rendering the route client-side is the correct local behaviour.
    if (outDir && LEGAL.includes(name)) {
      const file = resolve(outDir, name + '.html');
      if (existsSync(file)) req.url = '/' + name + '.html' + url.search;
    }
    next();
  };
  return {
    name: 'atmos-clean-urls',
    configureServer(server: any) { server.middlewares.use(handler(null)); },
    configurePreviewServer(server: any) { server.middlewares.use(handler(resolve(process.cwd(), 'dist'))); },
  };
}

export default defineConfig({
  plugins: [react(), cleanUrls()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      // Two entries. 404.html is a Vite entry rather than a static file in public/ because it is the
      // one standalone page with a bundled dependency (three.js, for the particle type) — and
      // because as dist/404.html it is what Vercel serves for any path the deployment has no file
      // for. privacy and terms are no longer here at all: they are routes of index.html, written out
      // as their own documents after the build by scripts/prerender.mjs so that a reader with no
      // JavaScript still gets the whole text.
      input: { main: 'index.html', notFound: '404.html' },
    },
  },
});
