// /api/status.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end(); return;
  }

  const BASE = process.env.APPS_SCRIPT_URL || process.env.GAS_URL; // same var you used for tiers
  if (!BASE) return res.status(200).json({ ok:false, error:'APPS_SCRIPT_URL not set' });

  try {
    const r = await fetch(`${BASE}?endpoint=status`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!j || !('ok' in j)) return res.status(200).json({ ok:false, error:'Bad response' });
    return res.status(200).json(j.ok ? { ok:true, open: !!j.open } : { ok:false, error:j.error || 'Error' });
  } catch (e) {
    return res.status(200).json({ ok:false, error:String(e) });
  }
}
