import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      // Two pages. 404.html is a Vite entry rather than a static file in public/ because it is the
      // one standalone page with a bundled dependency (three.js, for the particle type) — and
      // because as dist/404.html it is what Vercel serves for any path the deployment has no file
      // for. privacy.html and terms.html stay static: they need nothing from the build.
      input: { main: 'index.html', notFound: '404.html' },
    },
  },
});
