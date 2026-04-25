// ============================================================
//  Bulk-generate all Tripo GLBs declared in scripts/tripo-models.js
//  and save them to <repo>/models/<key>.glb so the runtime app
//  loads them directly with no Tripo API calls at runtime.
//
//  Usage:
//    node --env-file-if-exists=/vercel/share/.env.project \
//         scripts/generate-models.mjs            # generate missing
//    node ... scripts/generate-models.mjs --force   # regenerate all
//    node ... scripts/generate-models.mjs key1 key2 # only some keys
// ============================================================

import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { MODELS } from "./tripo-models.js"

const TRIPO_BASE = "https://api.tripo3d.ai/v2/openapi"
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 12 * 60 * 1000 // 12 min per task
const CONCURRENCY = 3 // simultaneous Tripo tasks

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const OUT_DIR = path.join(ROOT, "models")

const apiKey = process.env.TRIPO_API_KEY
if (!apiKey) {
  console.error("[generate] TRIPO_API_KEY missing in env. Source it first, e.g.")
  console.error("  node --env-file-if-exists=/vercel/share/.env.project scripts/generate-models.mjs")
  process.exit(1)
}

const args = process.argv.slice(2)
const force = args.includes("--force")
const onlyKeys = args.filter((a) => !a.startsWith("--"))

await fs.mkdir(OUT_DIR, { recursive: true })

async function fileExists(p) {
  try {
    const s = await fs.stat(p)
    return s.size > 0
  } catch {
    return false
  }
}

async function tripoCreate(prompt) {
  const res = await fetch(`${TRIPO_BASE}/task`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "text_to_model", prompt, model_version: "v2.5-20250123" }),
  })
  const j = await res.json().catch(() => null)
  if (!res.ok || !j || j.code !== 0) {
    throw new Error(`create failed (${res.status}): ${JSON.stringify(j)}`)
  }
  const taskId = j.data?.task_id
  if (!taskId) throw new Error(`create returned no task_id: ${JSON.stringify(j)}`)
  return taskId
}

async function tripoStatus(taskId) {
  const res = await fetch(`${TRIPO_BASE}/task/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const j = await res.json().catch(() => null)
  if (!res.ok || !j || j.code !== 0) {
    throw new Error(`status failed (${res.status}): ${JSON.stringify(j)}`)
  }
  return j.data || {}
}

function extractModelUrl(t) {
  const out = t.output || {}
  return (
    (out.pbr_model && out.pbr_model.url) ||
    (out.model && out.model.url) ||
    (typeof out.model === "string" ? out.model : null) ||
    (typeof out.pbr_model === "string" ? out.pbr_model : null) ||
    null
  )
}

async function downloadTo(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(dest, buf)
  return buf.length
}

async function generateOne(key, def) {
  const dest = path.join(OUT_DIR, `${key}.glb`)
  if (!force && (await fileExists(dest))) {
    console.log(`[skip ] ${key} already exists`)
    return { key, status: "skip" }
  }

  console.log(`[start] ${key}`)
  const taskId = await tripoCreate(def.prompt)
  console.log(`[task ] ${key} → ${taskId}`)

  const t0 = Date.now()
  let lastLog = 0
  while (true) {
    if (Date.now() - t0 > POLL_TIMEOUT_MS) throw new Error("poll timeout")
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const t = await tripoStatus(taskId)
    const s = String(t.status || "").toLowerCase()
    const p = typeof t.progress === "number" ? t.progress : 0
    if (Date.now() - lastLog > 8000) {
      console.log(`[poll ] ${key} status=${s} progress=${p}`)
      lastLog = Date.now()
    }
    if (s === "success" || s === "succeeded" || s === "completed") {
      const url = extractModelUrl(t)
      if (!url) throw new Error("no model url in finished task")
      const bytes = await downloadTo(url, dest)
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0)
      console.log(`[done ] ${key} → ${path.relative(ROOT, dest)} (${(bytes / 1024).toFixed(0)} KB, ${elapsed}s)`)
      return { key, status: "ok", bytes }
    }
    if (s === "failed" || s === "cancelled" || s === "banned" || s === "expired" || s === "error") {
      throw new Error(`task ${s}: ${JSON.stringify(t)}`)
    }
  }
}

const todo = Object.entries(MODELS).filter(([k]) => onlyKeys.length === 0 || onlyKeys.includes(k))
console.log(`[gen  ] ${todo.length} models, concurrency=${CONCURRENCY}, force=${force}`)

const queue = todo.slice()
const results = []
async function worker(id) {
  while (queue.length) {
    const next = queue.shift()
    if (!next) return
    const [k, def] = next
    try {
      const r = await generateOne(k, def)
      results.push(r)
    } catch (err) {
      console.error(`[fail ] ${k}: ${err?.message || err}`)
      results.push({ key: k, status: "fail", error: String(err?.message || err) })
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)))

const ok = results.filter((r) => r.status === "ok").length
const skipped = results.filter((r) => r.status === "skip").length
const failed = results.filter((r) => r.status === "fail").length
console.log(`[done ] ok=${ok} skipped=${skipped} failed=${failed}`)
process.exit(failed > 0 ? 1 : 0)
