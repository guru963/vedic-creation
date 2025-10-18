// prokerala-proxy/index.mjs
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors()); // allow all origins for dev
app.use(express.json());

const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;
const PORT = process.env.PORT || 8787;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing PROKERALA_CLIENT_ID / PROKERALA_CLIENT_SECRET in .env");
  process.exit(1);
}

// in-memory token cache
let tokenCache = { access_token: null, expires_at: 0 };

async function getAccessToken() {
  const now = Date.now();
  if (tokenCache.access_token && now < tokenCache.expires_at - 60_000) {
    return tokenCache.access_token;
  }
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", CLIENT_ID);
  form.set("client_secret", CLIENT_SECRET);

  const r = await fetch("https://api.prokerala.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Token fetch failed: ${r.status} ${txt}`);
  }
  const j = await r.json();
  tokenCache = {
    access_token: j.access_token,
    expires_at: Date.now() + j.expires_in * 1000,
  };
  return tokenCache.access_token;
}

function endpointFor(op) {
  switch (op) {
    case "kundli":
      return { url: "https://api.prokerala.com/v2/astrology/kundli", method: "GET", sendAs: "query" };
    case "panchang":
      return { url: "https://api.prokerala.com/v2/astrology/panchang", method: "GET", sendAs: "query" };
    case "match":
      return { url: "https://api.prokerala.com/v2/astrology/kundli-matching", method: "GET", sendAs: "query" };
    case "muhurta":
      return { url: "https://api.prokerala.com/v2/astrology/muhurat", method: "GET", sendAs: "query" };
    case "numerology":
      return { url: "https://api.prokerala.com/v2/numerology/worksheet", method: "GET", sendAs: "query" };
    default:
      return null;
  }
}

// POST /api/prokerala  { op: "kundli"|"panchang"|..., params: {...} }
app.post("/api/prokerala", async (req, res) => {
  try {
    const { op, params = {} } = req.body || {};
    const ep = endpointFor(op);
    if (!op || !ep) return res.status(400).json({ error: "Invalid or missing 'op'" });

    const token = await getAccessToken();

    let outboundUrl = ep.url;
    const init = { method: ep.method, headers: { Authorization: `Bearer ${token}` } };

    if (ep.sendAs === "query") {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        qs.set(k, typeof v === "string" ? v : String(v));
      }
      outboundUrl = `${ep.url}?${qs.toString()}`;
    } else {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(params);
    }

    const resp = await fetch(outboundUrl, init);
    const text = await resp.text();
    res.status(resp.status).type(resp.headers.get("content-type") || "application/json").send(text);
  } catch (e) {
    console.error("[proxy error]", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Prokerala proxy running at http://localhost:${PORT}`);
});
