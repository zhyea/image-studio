/**
 * 按与关键色的距离将像素设为透明（适合白底、绿幕等）。
 * @param {ImageData} imageData
 * @param {[number, number, number]} keyRgb
 * @param {number} tolerance — 欧氏距离阈值（约 0–440）
 * @param {number} feather — 过渡区宽度（同色距单位），0 为硬边
 */

/**
 * 单像素区间处理（内部）。对 [startPx, endPx) 的像素原地修改 alpha。
 * 抽成区间版，供同步整图版与异步分块版复用，保证算法单一来源。
 */
function applyColorKeyRange(data, keyRgb, tolerance, feather, startPx, endPx) {
  const [kr, kg, kb] = keyRgb
  const f = Math.max(0, feather)
  for (let i = startPx * 4; i < endPx * 4; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a0 = data[i + 3]
    const d = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)

    if (d <= tolerance) {
      data[i + 3] = 0
      continue
    }

    if (f <= 0 || d >= tolerance + f) continue

    const t = (d - tolerance) / f
    data[i + 3] = Math.round(a0 * Math.min(1, Math.max(0, t)))
  }
}

export function applyColorKey(imageData, keyRgb, tolerance, feather) {
  const data = imageData.data
  applyColorKeyRange(data, keyRgb, tolerance, feather, 0, data.length / 4)
}

/**
 * 超过该像素数即视为「大图」，调用方应给出提示（见 RemoveBgView）。
 * 4000×4000 ≈ 1600 万像素，同步逐像素循环在此量级会阻塞主线程数秒。
 */
export const COLOR_KEY_WARN_PIXELS = 4000 * 4000

const DEFAULT_CHUNK_PIXELS = 1 << 18 // 262144（约 512×512）

/**
 * 协作式分块去背：每处理约 chunkPixels 个像素后让出主线程（await yieldFn），
 * 避免超大图在主线程同步循环导致界面卡死。结果与同步 applyColorKey 逐像素等价。
 * @param {ImageData} imageData
 * @param {[number, number, number]} keyRgb
 * @param {number} tolerance
 * @param {number} feather
 * @param {{ chunkPixels?: number, yieldFn?: () => Promise<void> }} [opts]
 *        yieldFn 默认 setTimeout(0)；单测可注入同步 resolve 以验证等价性。
 */
export async function applyColorKeyAsync(imageData, keyRgb, tolerance, feather, opts = {}) {
  const data = imageData.data
  const totalPx = data.length / 4
  const chunkPixels = opts.chunkPixels ?? DEFAULT_CHUNK_PIXELS
  const yieldFn = opts.yieldFn ?? (() => new Promise((resolve) => setTimeout(resolve, 0)))
  for (let start = 0; start < totalPx; start += chunkPixels) {
    const end = Math.min(totalPx, start + chunkPixels)
    applyColorKeyRange(data, keyRgb, tolerance, feather, start, end)
    if (start > 0) await yieldFn() // 块间让出主线程，保持 UI 响应
  }
}
