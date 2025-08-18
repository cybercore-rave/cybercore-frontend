// /api/status.js
export default function handler(req, res) {
  // CORS + no cache (safe for GET)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  try {
    // Event is Oct 11, 2025 9:00 PM → Oct 12, 2025 3:00 AM in Port of Spain (UTC-4)
    // Convert once to UTC to avoid timezone math in the function:
    const START_UTC = '2025-10-12T01:00:00Z'; // 9:00 PM -04:00 = 01:00Z
    const END_UTC   = '2025-10-12T07:00:00Z'; // 3:00 AM -04:00 = 07:00Z

    const now = new Date();
    const open = now >= new Date(START_UTC) && now <= new Date(END_UTC);

    res.status(200).json({ ok: true, open });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
}
