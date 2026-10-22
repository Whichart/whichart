import type { APIRoute } from 'astro';
import { catalogJson } from '../lib/content';

export const GET: APIRoute = () => new Response(catalogJson(), { headers: { 'Content-Type': 'application/json' } });
