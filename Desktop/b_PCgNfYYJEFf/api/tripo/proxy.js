// ============================================================
//  GET /api/tripo/proxy?url=<encodedUrl>
//  Streams a Tripo-hosted GLB through our origin so the browser
//  can fetch it under the project's COEP=require-corp policy
//  and so we can add long-lived caching headers.
//  Only allow-listed Tripo CDN hosts are proxied.
// ============================================================

const ALLOWED_HOSTS = new Set([
  "tripo-data.rg1.data.tripo3d.com",
  "data.rg1.data.tripo3d.com",
  "data.tripo3d.ai",
  "data.tripo3d.com",
  "tripo3d.ai",
])

const ALLOWED_HOST_SUFFIXES = [".tripo3d.com", ".tripo3d.ai"]

function isAllowed(host) {
  if (ALLOWED_HOSTS.has(host)) return true
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s))
}

export const config = {
  // Allow up to 60s for large GLB downloads.
  maxDuration: 60,
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const raw = req.query?.url
  const target = Array.isArray(raw) ? raw[0] : raw
  if (!target) {
    res.status(400).json({ error: "Missing url" })
    return
  }

  let url
  try {
    url = new URL(target)
  } catch {
    res.status(400).json({ error: "Invalid url" })
    return
  }
  if (url.protocol !== "https:") {
    res.status(400).json({ error: "Only https URLs allowed" })
    return
  }
  if (!isAllowed(url.hostname)) {
    res.status(403).json({ error: `Host not allowed: ${url.hostname}` })
    return
  }

  try {
    const upstream = await fetch(url.toString())
    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status || 502).json({ error: "Upstream fetch failed" })
      return
    }

    // Forward content type when available; default to GLB binary.
    const contentType = upstream.headers.get("content-type") || "model/gltf-binary"
    res.setHeader("Content-Type", contentType)
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin")
    // Tripo URLs already embed expiring signatures, so safe to cache aggressively
    // by the proxy URL on Vercel's CDN.
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable")

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.status(200).send(buf)
  } catch (err) {
    res.status(502).json({ error: "Proxy fetch error", message: String(err?.message || err) })
  }
}
