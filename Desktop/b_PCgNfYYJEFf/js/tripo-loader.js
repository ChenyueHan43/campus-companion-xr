// ============================================================
//  Static GLB loader for pre-generated Tripo models.
//
//  All Tripo generation happens OFFLINE via scripts/generate-models.mjs,
//  which writes /models/<key>.glb files. At runtime this loader just
//  fetches that static GLB, normalises it (size + alignment) and mounts
//  it under a parent Object3D.
//
//  Public API:
//    mountTripoModel(parent, key, opts)   // eager mount, returns anchor
//    loadTripoModel(key, opts)            // returns Promise<Group>
//
//  opts:
//    position  : THREE.Vector3 | [x,y,z]
//    rotationY : number (radians)
//    targetSize: longest-edge metres (default 1)
//    fitWidth  : metres — force the model's local X (width along the wall
//                after pre-rotation) to match this value. Overrides targetSize.
//    fitHeight : metres — force the model's local Y to match this value.
//                Combined with fitWidth, the smaller scale wins so neither
//                axis exceeds its constraint.
//    yAlign    : 'bottom' (default) | 'center' | 'top' | 'none'
//    onLoad    : (model) => void
// ============================================================

import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

const MODELS_BASE = "/models"
const _gltf = new GLTFLoader()

// Same key requested twice → only one network/parse cycle, then clone.
const _templateCache = new Map() // key → Promise<THREE.Group>

function _modelUrl(key) {
  return `${MODELS_BASE}/${encodeURIComponent(key)}.glb`
}

function _loadGLTF(url) {
  return new Promise((resolve, reject) => {
    _gltf.load(url, resolve, undefined, reject)
  })
}

function _loadTemplate(key) {
  if (_templateCache.has(key)) return _templateCache.get(key)
  const p = _loadGLTF(_modelUrl(key))
    .then((gltf) => {
      const root = gltf.scene
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true
          obj.receiveShadow = true
          if (obj.material && "roughness" in obj.material && obj.material.roughness === 0) {
            obj.material.roughness = 0.6
          }
        }
      })
      return root
    })
    .catch((err) => {
      _templateCache.delete(key) // allow retry next time
      throw err
    })
  _templateCache.set(key, p)
  return p
}

function _normalise(group, opts) {
  const yAlign = opts.yAlign ?? "bottom"

  group.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(group)
  if (!isFinite(box.min.x)) return group // empty model

  const size = box.getSize(new THREE.Vector3())

  // Decide scale. fitWidth / fitHeight take priority and let callers pin a
  // specific axis (e.g. a curtain that must exactly match a window's width).
  // When both are passed, the more restrictive scale wins so neither axis
  // overflows its budget.
  let scale
  if (opts.fitWidth || opts.fitHeight) {
    const sx = opts.fitWidth  ? opts.fitWidth  / (size.x || 1) : Infinity
    const sy = opts.fitHeight ? opts.fitHeight / (size.y || 1) : Infinity
    scale = Math.min(sx, sy)
  } else {
    const targetSize = opts.targetSize ?? 1
    const longest = Math.max(size.x, size.y, size.z) || 1
    scale = targetSize / longest
  }
  group.scale.multiplyScalar(scale)

  group.updateMatrixWorld(true)
  box = new THREE.Box3().setFromObject(group)
  const center = box.getCenter(new THREE.Vector3())
  group.position.x -= center.x
  group.position.z -= center.z
  if (yAlign === "bottom") group.position.y -= box.min.y
  else if (yAlign === "center") group.position.y -= center.y
  else if (yAlign === "top") group.position.y -= box.max.y
  return group
}

/**
 * Resolve a model template, then return a fresh, normalised clone ready to
 * drop into the scene. Multiple call sites with the same key share geometry
 * via clone().
 */
// ── Tripo "front" axis correction ──────────────────────────
//  Tripo's exported GLBs treat +X as the visible front face of the model
//  (i.e. the side a "front-facing render" prompt was rendered from). The
//  rest of the codebase, however, follows the GLTF/Three.js convention
//  where rotationY = 0 should mean "front faces -Z". To make these line
//  up we pre-rotate every Tripo model by +π/2 around Y, so its local +X
//  ends up pointing toward the wrapper's local -Z.
const TRIPO_FRONT_OFFSET_Y = Math.PI / 2

export async function loadTripoModel(key, opts = {}) {
  const template = await _loadTemplate(key)
  const wrapper = new THREE.Group()
  const inner = template.clone(true)
  inner.rotation.y = TRIPO_FRONT_OFFSET_Y
  wrapper.add(inner)
  return _normalise(wrapper, opts)
}

/**
 * Eagerly attach an empty anchor Group to `parent`. Once the static GLB has
 * been loaded and normalised, it is appended as a child of that anchor. The
 * anchor is returned synchronously so callers can manipulate it immediately.
 */
export function mountTripoModel(parent, key, opts = {}) {
  const anchor = new THREE.Group()
  if (opts.position) {
    if (Array.isArray(opts.position)) anchor.position.set(...opts.position)
    else anchor.position.copy(opts.position)
  }
  if (opts.rotationY) anchor.rotation.y = opts.rotationY
  parent.add(anchor)

  loadTripoModel(key, opts)
    .then((model) => {
      if (!anchor.parent) return // scene torn down while we waited
      anchor.add(model)
      opts.onLoad?.(model)
    })
    .catch((err) => {
      console.warn(`[tripo-loader] /models/${key}.glb load failed:`, err?.message || err)
    })

  return anchor
}
