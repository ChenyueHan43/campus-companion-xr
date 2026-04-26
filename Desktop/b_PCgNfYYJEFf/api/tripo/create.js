// ============================================================
//  POST /api/tripo/create
//  Body: { prompt: string, modelVersion?: string }
//  Resp: { taskId: string }
//
//  Creates a Tripo text-to-model task. The Tripo API key never
//  leaves the server.
// ============================================================

const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const apiKey = process.env.TRIPO_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: "TRIPO_API_KEY not configured on the server" })
    return
  }

  // Vercel parses JSON automatically when content-type is set, but be defensive.
  let body = req.body
  if (typeof body === "string") {
    try {
      body = JSON.parse(body)
    } catch {
      res.status(400).json({ error: "Invalid JSON body" })
      return
    }
  }
  body = body || {}

  const prompt = String(body.prompt || "").trim()
  if (!prompt) {
    res.status(400).json({ error: "Missing prompt" })
    return
  }
  if (prompt.length > 800) {
    res.status(400).json({ error: "Prompt too long" })
    return
  }

  const payload = {
    type: "text_to_model",
    prompt,
    model_version: body.modelVersion || "v2.5-20250123",
  }

  try {
    const upstream = await fetch(`${TRIPO_BASE}/task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await upstream.json().catch(() => null)
    if (!upstream.ok || !data || data.code !== 0) {
      res.status(upstream.status || 502).json({
        error: "Tripo task creation failed",
        upstream: data,
      })
      return
    }

    const taskId = data.data?.task_id
    if (!taskId) {
      res.status(502).json({ error: "Tripo response missing task_id", upstream: data })
      return
    }

    res.status(200).json({ taskId })
  } catch (err) {
    res.status(502).json({ error: "Tripo upstream error", message: String(err?.message || err) })
  }
}
