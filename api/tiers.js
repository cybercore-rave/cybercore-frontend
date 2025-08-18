export default async function handler(req, res) {
  const { GAS_EXEC_URL } = process.env;
  if (!GAS_EXEC_URL) return res.status(500).json({ ok: false, error: 'Missing GAS_EXEC_URL' });

  try {
    const r = await fetch(`${GAS_EXEC_URL}?endpoint=tiers`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({ ok: false, error: `Upstream ${r.status}` }));
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    return res.status(200).json(j);
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) });
  }
}
