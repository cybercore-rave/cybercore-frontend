// pages/api/tiers.js
// Uncached proxy to your Apps Script "tiers" endpoint.
// - Disables CDN & browser caching completely
// - Adds a cache-buster query param
// - Returns proper error codes when upstream fails

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const base = process.env.GAS_URL;
  if (!base) {
    // Do NOT cache this either
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.status(500).json({ ok: false, error: 'Missing GAS_URL env var' });
  }

  try {
    // Cache-buster to defeat any intermediary caches (including Apps Script fronting proxies)
    const buster = Date.now();
    const upstream = `${base}?endpoint=tiers&_=${buster}`;

    const r = await fetch(upstream, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        // Be very explicit to intermediaries and the browser
        'pragma': 'no-cache',
        'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
        'accept': 'application/json',
      },
    });

    const text = await r.text();

    // If upstream is not 2xx, pass through a 502 with upstream body preview
    if (!r.ok) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res.status(502).json({
        ok: false,
        error: `Upstream error ${r.status}`,
        upstream: text.slice(0, 300),
      });
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      return res.status(502).json({
        ok: false,
        error: 'Upstream not JSON',
        upstream: text.slice(0, 300),
      });
    }

    // Absolutely no caching at the edge or browser
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.status(200).json(json);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res.status(502).json({ ok: false, error: e?.message || 'Fetch failed' });
  }
}
