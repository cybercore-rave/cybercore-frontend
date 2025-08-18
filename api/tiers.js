// /api/tiers.js
// Proxies to your Apps Script "tiers" endpoint and adds fast CDN caching.

export default async function handler(req, res) {
  try {
    const base = process.env.GAS_URL; // <-- must be your Apps Script /exec URL
    if (!base) {
      res.status(200).json({ ok:false, error:'Missing GAS_URL env var' });
      return;
    }

    const upstream = `${base}?endpoint=tiers`;

    const r = await fetch(upstream, { method: 'GET', cache: 'no-store' });
    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // Surface upstream body so we know what came back
      res.setHeader('Cache-Control', 'public, s-maxage=5');
      res.status(200).json({ ok:false, error:'Upstream not JSON', upstream: text.slice(0,200) });
      return;
    }

    // 30s CDN cache; allow 5m stale while background refreshes
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json(json);
  } catch (e) {
    res.setHeader('Cache-Control', 'public, s-maxage=5');
    res.status(200).json({ ok:false, error: e.message || 'Fetch failed' });
  }
}
