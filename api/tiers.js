// /api/tiers.js
export default async function handler(req, res) {
  try {
    const upstream = `${process.env.GAS_URL}?endpoint=tiers`;
    const r = await fetch(upstream, { cache: 'no-store' });
    const json = await r.json();

    // 30s CDN cache, allow 5 min stale-while-revalidate
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json(json);
  } catch (e) {
    // brief cache for errors to avoid thundering herd
    res.setHeader('Cache-Control', 'public, s-maxage=5');
    res.status(200).json({ ok:false, error:'Upstream error' });
  }
}
