// /api/index.js — proxy to Apps Script with basic rate-limit & CORS allowlist

// ----- Simple in-memory rate limit (per Vercel region instance) -----
const WINDOW_MS = 15_000;     // 15s window
const MAX_HITS  = 5;          // max requests per window per IP
const hits = new Map();       // ip -> { n, t }

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (xf ? xf.split(",")[0] : "") || "unknown";
}
function tooMany(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > WINDOW_MS) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  return rec.n > MAX_HITS;
}

// ----- CORS allowlist (add your domains here) -----
const ALLOW_ORIGINS = new Set([
  "https://cybercorerave.com",
  "https://www.cybercorerave.com",
  "https://cybercore-frontend-five.vercel.app" // keep your Vercel preview/primary too
]);

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin && ALLOW_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

export default async function handler(req, res) {
  const APPS   = process.env.APPS_SCRIPT_BASE; // your /exec URL
  const SECRET = process.env.API_SECRET;

  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!APPS || !SECRET) {
    return res.status(500).json({ ok:false, error:"Server not configured" });
  }

  try {
    if (req.method === "GET") {
      const ep = req.query.endpoint;

      // Health check (passthrough to Apps Script if available)
      if (ep === "health") {
        try {
          const r = await fetch(`${APPS}?endpoint=health`, { cache: "no-store" });
          const text = await r.text();
          res.setHeader("Content-Type","application/json");
          return res.status(200).send(text);
        } catch {
          return res.status(200).json({ ok:true, status:"up" });
        }
      }

      // Still support GET /api?endpoint=tiers (though /api/tiers is faster)
      if (ep === "tiers") {
        const r = await fetch(`${APPS}?endpoint=tiers`, { cache: "no-store" });
        const j = await r.json();
        res.setHeader("Cache-Control","public, s-maxage=30, stale-while-revalidate=300");
        return res.status(200).json(j);
      }

      return res.status(404).json({ ok:false, error:"Not found" });
    }

    if (req.method === "POST") {
      // Basic per-IP rate limit for reserve
      const ip = getIp(req);
      if (tooMany(ip)) {
        return res.status(429).json({ ok:false, error:"Too many requests, try again in a moment." });
      }

      // Forward to Apps Script with secret injected
      const body = { ...(req.body || {}), secret: SECRET };
      const r = await fetch(APPS, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });

      const text = await r.text();
      res.setHeader("Content-Type","application/json");
      return res.status(200).send(text);
    }

    return res.status(405).json({ ok:false, error:"Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok:false, error:String(err) });
  }
}
