// Vercel Serverless Function → proxies to your Apps Script /exec
export default async function handler(req, res) {
  const APPS   = process.env.APPS_SCRIPT_BASE; // set in Vercel env
  const SECRET = process.env.API_SECRET;       // same as Code.gs API_SECRET
  if (!APPS) return res.status(500).json({ ok:false, error:"Missing APPS_SCRIPT_BASE env var" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const r = await fetch(`${APPS}?endpoint=tiers`);
      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }
    if (req.method === "POST") {
      const body = { ...(req.body || {}), secret: SECRET };
      const r = await fetch(APPS, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(body)
      });
      const text = await r.text();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(text);
    }
    res.status(405).json({ ok:false, error:"Method not allowed" });
  } catch (err) {
    res.status(500).json({ ok:false, error: String(err) });
  }
}
