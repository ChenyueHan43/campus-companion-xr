// ============================================================
//  GET /api/tripo/status?id=<taskId>
//  Resp: { status: 'queued'|'running'|'success'|'failed',
//          progress: number 0..1,
//          modelUrl: string|null,
//          proxiedUrl: string|null }   ← same-origin URL for COEP
// ============================================================

const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi"

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const apiKey = process.env.TRIPO_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: "TRIPO_API_KEY not configured on the server" })
    return
  }

  const taskId = String(req.query?.id || "").trim()
  if (!taskId) {
    res.status(400).json({ error: "Missing task id" })
    return
  }

  try {
    const upstream = await fetch(`${TRIPO_BASE}/task/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await upstream.json().catch(() => null)
    if (!upstream.ok || !data || data.code !== 0) {
      res.status(upstream.status || 502).json({
        error: "Tripo status query failed",
        upstream: data,
      })
      return
    }

    const t = data.data || {}
    // Tripo returns model URLs in a few possible shapes depending on version.
    // Prefer .pbr_model.url (new) → .model.url (new) → .model (legacy string)
    // → .pbr_model (legacy string).
    const out = t.output || {}
    const modelUrl =
      (out.pbr_model && out.pbr_model.url) ||
      (out.model && out.model.url) ||
      (typeof out.model === "string" ? out.model : null) ||
      (typeof out.pbr_model === "string" ? out.pbr_model : null) ||
      null

    const proxiedUrl = modelUrl
      ? `/api/tripo/proxy?url=${encodeURIComponent(modelUrl)}`
      : null

    res.status(200).json({
      status: t.status || "running",
      progress: typeof t.progress === "number" ? t.progress : 0,
      modelUrl,
      proxiedUrl,
    })
  } catch (err) {
    res.status(502).json({ error: "Tripo upstream error", message: String(err?.message || err) })
  }
}
