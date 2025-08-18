// /api/index.js — caches GET /api?endpoint=tiers for 30s (memory) and sets CDN headers
let TIERS_CACHE = { data: null, exp: 0 };

export default async function handler(req, res) {
  const APPS   = process.env.APPS_SCRIPT_BASE; // your /exec URL
  const SECRET = process.env.API_SECRET;       // same as Code.gs

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      // support both endpoints through one handler
      const ep = req.query.endpoint;

      if (ep === 'tiers') {
        const now = Date.now();
        if (now < TIERS_CACHE.exp && TIERS_CACHE.data) {
          res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
          return res.status(200).json({ ok: true, data: TIERS_CACHE.data, cached: true });
        }
        const r = await fetch(`${APPS}?endpoint=tiers`, { cache: "no-store" });
        const j = await r.json();
        if (j?.ok) {
          TIERS_CACHE = { data: j.data, exp: now + 30_000 };
        }
        res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
        return res.status(200).json(j);
      }

      // simple health passthrough
      if (ep === 'health') {
        const r = await fetch(`${APPS}?endpoint=health`, { cache: "no-store" });
        const text = await r.text();
        res.setHeader("Cache-Control", "public, s-maxage=5");
        res.setHeader("Content-Type", "application/json");
        return res.status(200).send(text);
      }

      return res.status(404).json({ ok:false, error:"Not found" });
    }

    if (req.method === "POST") {
      const body = { ...(req.body || {}), secret: SECRET };
      const r = await fetch(APPS, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });
      const text = await r.text();

      // bust the small cache after a reservation (availability may change)
      TIERS_CACHE = { data: null, exp: 0 };

      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }

    res.status(405).json({ ok:false, error:"Method not allowed" });
  } catch (err) {
    res.status(500).json({ ok:false, error: String(err) });
  }
}
