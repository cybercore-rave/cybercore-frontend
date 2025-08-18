export default async function handler(req, res) {
  const { GAS_EXEC_URL, API_SECRET } = process.env;
  if (!GAS_EXEC_URL) return res.status(500).json({ ok: false, error: 'Missing GAS_EXEC_URL' });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 9000);

  try {
    if (req.method === 'GET') {
      const endpoint = (req.query.endpoint || 'health').toString();
      const url = `${GAS_EXEC_URL}?endpoint=${encodeURIComponent(endpoint)}&t=${Date.now()}`;
      const r = await fetch(url, { cache: 'no-store', signal: controller.signal });
      const j = await r.json().catch(() => ({ ok: false, error: `Upstream ${r.status}` }));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(j);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const upstream = await fetch(GAS_EXEC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, secret: API_SECRET }),
        signal: controller.signal,
      });
      const j = await upstream.json().catch(() => ({ ok: false, error: `Upstream ${upstream.status}` }));
      return res.status(200).json(j);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ ok: false, error: 'Upstream timeout' });
    return res.status(500).json({ ok: false, error: String(e) });
  } finally {
    clearTimeout(t);
  }
}
