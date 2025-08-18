// /api/tiers.js — ultra-fast, adaptive-cached tiers (Edge Runtime)
export const config = { runtime: 'edge' };

let cache = { data: null, exp: 0 }; // 30s in-memory cache per edge region

export default async function handler(req) {
  const APPS = process.env.APPS_SCRIPT_BASE;
  if (!APPS) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing APPS_SCRIPT_BASE' }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }

  const now = Date.now();

  // Serve from memory cache if still fresh
  if (cache.data && now < cache.exp) {
    const low = Array.isArray(cache.data) && cache.data.some(t => t.remaining <= 5);
    const sMax = low ? 5 : 30; // 5s when low, 30s otherwise
    return new Response(JSON.stringify({ ok: true, data: cache.data, cached: true }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, s-maxage=${sMax}, stale-while-revalidate=300`,
        'x-adaptive-cache': low ? 'low' : 'normal'
      }
    });
  }

  // Fetch fresh from Apps Script
  try {
    const r = await fetch(`${APPS}?endpoint=tiers`, { cache: 'no-store' });
    const j = await r.json();

    if (j?.ok && Array.isArray(j.data)) {
      const low = j.data.some(t => t.remaining <= 5);
      const sMax = low ? 5 : 30;

      // Set in-memory cache to match the chosen s-maxage
      cache = { data: j.data, exp: now + sMax * 1000 };

      return new Response(JSON.stringify(j), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, s-maxage=${sMax}, stale-while-revalidate=300`,
          'x-adaptive-cache': low ? 'low' : 'normal'
        }
      });
    }

    // Pass through error payloads from Apps Script
    return new Response(JSON.stringify(j || { ok: false, error: 'Bad response' }), {
      status: j?.ok ? 200 : 500,
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
