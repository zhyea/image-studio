/**
 * 按与关键色的距离将像素设为透明（适合白底、绿幕等）。
 * @param {ImageData} imageData
 * @param {[number, number, number]} keyRgb
 * @param {number} tolerance — 欧氏距离阈值（约 0–440）
 * @param {number} feather — 过渡区宽度（同色距单位），0 为硬边
 */
export function applyColorKey(imageData, keyRgb, tolerance, feather) {
  const data = imageData.data
  const [kr, kg, kb] = keyRgb
  const f = Math.max(0, feather)

  for (let i = 0; i < data.length; i += 4) {
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
