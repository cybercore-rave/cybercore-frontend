// /api/index.js — proxy to Apps Script with durable rate-limit & CORS allowlist

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ----- Durable global rate-limit (works across regions/instances) -----
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, "15 s"), // 5 requests per 15 seconds
  prefix: "rl:reserve"
});

function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  return (xf ? xf.split(",")[0] : "") || "unknown";
}

// ----- CORS allowlist -----
const ALLOW_ORIGINS = new Set([
  "https://cybercorerave.com",
  "https://www.cybercorerave.com",
  "https://cybercore-frontend-five.vercel.app" // replace with your actual Vercel domain
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

      if (ep === "tiers") {
        const r = await fetch(`${APPS}?endpoint=tiers`, { cache: "no-store" });
        const j = await r.json();
        res.setHeader("Cache-Control","public, s-maxage=30, stale-while-revalidate=300");
        return res.status(200).json(j);
      }

      return res.status(404).json({ ok:false, error:"Not found" });
    }

    if (req.method === "POST") {
      // Durable rate-limit
      const ipKey = getIp(req) || req.headers["user-agent"] || "unknown";
      const { success } = await ratelimit.limit(ipKey);
      if (!success) {
        return res.status(429).json({ ok:false, error:"Too many requests, try again shortly." });
      }

      // Forward to Apps Script with secret
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
