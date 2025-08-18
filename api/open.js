// /api/open.js – answers whether doors are currently "open"
const EVENT_START_ISO = '2025-10-11T21:00:00-04:00'; // 9pm Oct 11 (Port of Spain, UTC-4)
const EVENT_END_ISO   = '2025-10-12T03:00:00-04:00'; // 3am Oct 12

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const now = Date.now();
    const start = new Date(EVENT_START_ISO).getTime();
    const end   = new Date(EVENT_END_ISO).getTime();
    const open = now >= start && now <= end;
    return res.status(200).json({ ok: true, open });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
