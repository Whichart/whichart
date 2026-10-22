import type { APIRoute } from 'astro';
import { routes } from '../lib/routes';
import { url } from '../lib/url';

export const GET: APIRoute = ({ site }) => {
  const body = routes()
    .map((r) => `  <url><loc>${new URL(url(r.path), site).href}</loc></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
