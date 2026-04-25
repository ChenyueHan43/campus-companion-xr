// ============================================================
//  Campus Companion XR — Tripo AI Client (browser-side)
//  Talks to OUR /api/tripo/* serverless routes — never to Tripo
//  directly — so the API key stays on the server.
//
//  Flow: createTask → poll /api/tripo/status → resolve with a
//  same-origin proxiedUrl pointing at /api/tripo/proxy?url=...
//
//  Public surface (kept compatible with previous version):
//    TripoClient.generateModel(prompt, onProgress) → Promise<string>
//    TripoClient.createTextToModelTask(prompt)     → Promise<taskId>
//    TripoClient.getTaskStatus(taskId)             → Promise<status obj>
// ============================================================

const TripoClient = (() => {
  const POLL_INTERVAL = 3000 // ms
  const MAX_POLLS = 80 // ~4 min worst case

  // Session-level cache so the same prompt during one tab session is reused.
  // We cache the proxied URL only; bytes are cached by Vercel's CDN.
  const URL_CACHE_KEY = "tripoModelUrlCache:v1"
  function loadCache() {
    try {
      return JSON.parse(sessionStorage.getItem(URL_CACHE_KEY) || "{}")
    } catch {
      return {}
    }
  }
  function saveCache(c) {
    try {
      sessionStorage.setItem(URL_CACHE_KEY, JSON.stringify(c))
    } catch {
      /* quota / private mode → ignore */
    }
  }
  function cacheKey(prompt) {
    return prompt.trim().toLowerCase()
  }

  // ── Create task ──────────────────────────────────────────
  async function createTextToModelTask(prompt) {
    const res = await fetch("/api/tripo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Tripo create failed (${res.status}): ${text}`)
    }
    const data = await res.json()
    if (!data.taskId) throw new Error("Tripo create: missing taskId")
    return data.taskId
  }

  // ── Get status ───────────────────────────────────────────
  async function getTaskStatus(taskId) {
    const res = await fetch(`/api/tripo/status?id=${encodeURIComponent(taskId)}`)
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Tripo status failed (${res.status}): ${text}`)
    }
    return res.json()
  }

  // ── Poll until done ──────────────────────────────────────
  async function waitForCompletion(taskId, onProgress) {
    for (let polls = 0; polls < MAX_POLLS; polls++) {
      await sleep(POLL_INTERVAL)
      const t = await getTaskStatus(taskId)
      if (onProgress) onProgress(t.status, typeof t.progress === "number" ? t.progress : 0)
      if (t.status === "success") {
        const url = t.proxiedUrl || t.modelUrl
        if (!url) throw new Error("Tripo: success but no model URL")
        return url
      }
      if (t.status === "failed" || t.status === "banned" || t.status === "expired") {
        throw new Error(`Tripo task ${t.status}`)
      }
      // queued | running → keep polling
    }
    throw new Error("Tripo: timed out waiting for model generation")
  }

  // ── Public: full pipeline ────────────────────────────────
  /**
   * @param {string} prompt    Description of the model to generate
   * @param {(s:string,p:number)=>void} [onProgress]
   * @returns {Promise<string>} same-origin URL ready for THREE.GLTFLoader
   */
  async function generateModel(prompt, onProgress) {
    const key = cacheKey(prompt)
    const cache = loadCache()
    if (cache[key]) {
      if (onProgress) onProgress("cached", 1)
      return cache[key]
    }

    const taskId = await createTextToModelTask(prompt)
    if (onProgress) onProgress("queued", 0)
    const url = await waitForCompletion(taskId, onProgress)

    const fresh = loadCache()
    fresh[key] = url
    saveCache(fresh)
    return url
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms))
  }

  return { generateModel, createTextToModelTask, getTaskStatus }
})()

// Expose globally (legacy callers + ES modules read via window.TripoClient).
if (typeof window !== "undefined") window.TripoClient = TripoClient
