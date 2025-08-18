export default async function handler(req, res) {
  const { GAS_EXEC_URL } = process.env;
  if (!GAS_EXEC_URL) return res.status(500).json({ ok: false, error: 'Missing GAS_EXEC_URL' });

  try {
    const r = await fetch(`${GAS_EXEC_URL}?endpoint=status`, { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    // Normalize: fail-open if upstream is down
    const open = j && j.ok ? !!j.open : true;
    return res.status(200).json({ ok: true, open });
  } catch (_) {
    return res.status(200).json({ ok: true, open: true });
  }
}
