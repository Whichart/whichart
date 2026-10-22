import { defineConfig } from 'astro/config';

// SITE_URL and BASE_PATH are set by the Pages deploy workflow, so the site
// works at both whichart.github.io and whichart.github.io/<repo>.
export default defineConfig({
  site: process.env.SITE_URL || 'https://whichart.github.io',
  base: process.env.BASE_PATH || '/',
});
