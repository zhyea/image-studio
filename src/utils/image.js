/**
 * Browser-side image helpers (Canvas).
 */

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function fileBaseName(file) {
  const n = file.name.replace(/\.[^.]+$/, '')
  return n || 'image'
}

export function drawImageContain(img, maxW, maxH) {
  const rw = img.naturalWidth || img.width
  const rh = img.naturalHeight || img.height
  const scale = Math.min(maxW / rw, maxH / rh, 1)
  const w = Math.round(rw * scale)
  const h = Math.round(rh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)
  return canvas
}

export function resizeCanvas(sourceCanvas, targetW, targetH) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(targetW))
  canvas.height = Math.max(1, Math.round(targetH))
  const ctx = canvas.getContext('2d', { alpha: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * 放大画布：分多步缩放，每步不超过 maxStep 倍，再最后对齐目标尺寸。
 * 比一次性 drawImage 拉大更不易糊（多轮高质量插值）。
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number} targetW
 * @param {number} targetH
 * @param {{ maxStep?: number }} [opts]
 */
export function resizeCanvasUpscale(sourceCanvas, targetW, targetH, opts = {}) {
  const tw = Math.max(1, Math.round(targetW))
  const th = Math.max(1, Math.round(targetH))
  let w = sourceCanvas.width
  let h = sourceCanvas.height
  if (w === tw && h === th) {
    return sourceCanvas
  }
  if (w >= tw && h >= th) {
    return resizeCanvas(sourceCanvas, tw, th)
  }

  const maxStep = opts.maxStep ?? 2
  let current = sourceCanvas
  let guard = 0
  const maxIterations = 32

  while ((w < tw || h < th) && guard++ < maxIterations) {
    const rx = tw / w
    const ry = th / h
    const factor = Math.min(maxStep, rx, ry)
    if (factor <= 1.0005) break

    let nw = Math.min(tw, Math.round(w * factor))
    let nh = Math.min(th, Math.round(h * factor))
    if (nw <= w) nw = Math.min(tw, w + 1)
    if (nh <= h) nh = Math.min(th, h + 1)
    if (nw <= w && nh <= h) break

    current = resizeCanvas(current, nw, nh)
    w = nw
    h = nh
  }

  if (w !== tw || h !== th) {
    current = resizeCanvas(current, tw, th)
  }
  return current
}

let picaSingleton = null

async function getPica() {
  if (!picaSingleton) {
    const mod = await import('pica')
    const Pica = mod.default
    picaSingleton = new Pica()
  }
  return picaSingleton
}

/**
 * 使用 pica（WASM / Worker + Lanczos 类重采样）缩放画布，适合放大。
 * @param {HTMLCanvasElement | HTMLImageElement} source
 * @param {number} targetW
 * @param {number} targetH
 * @param {{ filter?: 'lanczos3' | 'lanczos2' | 'mks2013' }} [opts]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function resizeCanvasWithPica(source, targetW, targetH, opts = {}) {
  const tw = Math.max(1, Math.round(targetW))
  const th = Math.max(1, Math.round(targetH))
  const sw =
    source instanceof HTMLCanvasElement ? source.width : source.naturalWidth || source.width
  const sh =
    source instanceof HTMLCanvasElement ? source.height : source.naturalHeight || source.height
  if (sw === tw && sh === th) {
    if (source instanceof HTMLCanvasElement) return source
    const c = document.createElement('canvas')
    c.width = tw
    c.height = th
    c.getContext('2d', { alpha: true }).drawImage(source, 0, 0)
    return c
  }
  if (sw >= tw && sh >= th) {
    if (source instanceof HTMLCanvasElement) {
      return resizeCanvas(source, tw, th)
    }
    return resizeCanvas(drawImageToCanvas(source), tw, th)
  }

  const pica = await getPica()
  const dest = document.createElement('canvas')
  dest.width = tw
  dest.height = th
  const filter = opts.filter ?? 'lanczos3'
  await pica.resize(source, dest, { filter })
  return dest
}

function drawImageToCanvas(img) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth || img.width
  c.height = img.naturalHeight || img.height
  const ctx = c.getContext('2d', { alpha: true })
  ctx.drawImage(img, 0, 0)
  return c
}

export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const raw = atob(parts[1])
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** 将长边限制在 maxEdge 内，返回新的已解码 Image（用于控制 WebGL 显存）。 */
export async function constrainImageMaxEdge(img, maxEdge) {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const m = Math.max(w, h)
  if (m <= maxEdge) return img

  const s = maxEdge / m
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * s))
  canvas.height = Math.max(1, Math.round(h * s))
  const ctx = canvas.getContext('2d', { alpha: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const blob = await canvasToBlob(canvas, 'image/png')
  const u = URL.createObjectURL(blob)
  try {
    return await loadImage(u)
  } finally {
    URL.revokeObjectURL(u)
  }
}
