/**
 * 统一「按文件类型 / 用户选择推导导出 mime + 扩展名 + 质量」的散落逻辑。
 * 原逻辑分散在 BlurRegionView / ResizeView / RotateView，语义略有出入，
 * 此处收敛为单一可信来源，避免重复与漂移。
 *
 * 行为约定：
 * - 显式 format（'jpeg' | 'png'）优先；
 * - 否则按 file.type 推断：jpeg/jpg → image/jpeg，png → image/png，
 *   webp → image/webp，其余兜底 image/png；
 * - JPEG 统一质量 0.92（与既有三处一致）。
 */

export const JPEG_QUALITY = 0.92

/**
 * @param {{ type?: string }} [file]
 * @param {{ format?: 'jpeg' | 'png' | null | undefined }} [opts]
 * @returns {string} mime，必为 image/jpeg | image/png | image/webp
 */
export function inferOutputMime(file, opts = {}) {
  const format = opts.format
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'png') return 'image/png'

  const t = (file && file.type) || ''
  if (t.includes('jpeg') || t.includes('jpg')) return 'image/jpeg'
  if (t.includes('png')) return 'image/png'
  if (t.includes('webp')) return 'image/webp'
  return 'image/png'
}

/**
 * @param {string} mime
 * @returns {'jpg' | 'webp' | 'png'}
 */
export function mimeToExt(mime) {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'png'
}

/**
 * 便捷：一次拿到导出所需的三元组。
 * @param {{ type?: string }} [file]
 * @param {{ format?: 'jpeg' | 'png' | null | undefined }} [opts]
 * @returns {{ mime: string, ext: string, quality: number | undefined }}
 */
export function inferOutput(file, opts = {}) {
  const mime = inferOutputMime(file, opts)
  return {
    mime,
    ext: mimeToExt(mime),
    quality: mime === 'image/jpeg' ? JPEG_QUALITY : undefined,
  }
}
