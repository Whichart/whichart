import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// SITE_URL and BASE_PATH are set by the Pages deploy workflow, so the site
// works at both whichart.github.io and whichart.github.io/<repo>.
export default defineConfig({
  site: process.env.SITE_URL || 'https://whichart.github.io',
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  vite: {
    // Chart code and data live in the repo root, outside site/.
    server: { fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  },
});
