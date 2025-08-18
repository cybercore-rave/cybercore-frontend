// /api/tiers.js  — ultra-fast, cached tiers endpoint (Edge Runtime)
export const config = { runtime: 'edge' };

let cache = { data: null, exp: 0 }; // 30s in-memory cache per edge region

export default async function handler(req) {
  const APPS = process.env.APPS_SCRIPT_BASE;
  if (!APPS) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing APPS_SCRIPT_BASE' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  const now = Date.now();
  if (cache.data && now < cache.exp) {
    return new Response(JSON.stringify({ ok: true, data: cache.data, cached: true }), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=30, stale-while-revalidate=300'
      }
    });
  }

  try {
    const r = await fetch(`${APPS}?endpoint=tiers`, { cache: 'no-store' });
    const j = await r.json();
    if (j?.ok && Array.isArray(j.data)) {
      cache = { data: j.data, exp: now + 30_000 };
    }
    return new Response(JSON.stringify(j), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=30, stale-while-revalidate=300'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
