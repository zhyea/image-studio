/**
 * canonical 路径规范化：把任意大小写 / 尾斜杠 / 重复斜杠的 URL 变体收敛到唯一规范形式。
 *
 * SPA 的路由回退会把任意子路径都以 200 返回同一份 index.html，若不收敛，
 * 同一页面的多个 URL 变体会各自输出指向自己的 canonical，
 * 这正是 Google Search Console 「重复网页，用户未选定规范网页」的典型来源。
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../i18n/localeConfig.js'
import { TOOLS } from '../config/tools.js'

const TOOL_SLUG_BY_LOWER = new Map(TOOLS.map((t) => [t.slug.toLowerCase(), t.slug]))

function safeDecode(seg) {
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

/**
 * @param {string} rawPath 任意 pathname 或含 query/hash 的路径
 * @returns {string} `/{locale}` 或 `/{locale}/{toolslug}` 形式的规范路径
 */
export function canonicalPath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath === '') return `/${DEFAULT_LOCALE}`
  const withoutSuffix = rawPath.split(/[?#]/)[0]
  const segments = withoutSuffix
    .split('/')
    .map(safeDecode)
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return `/${DEFAULT_LOCALE}`

  const rawLocale = segments[0].toLowerCase()
  const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE

  const rest = segments.slice(1)
  if (rest.length === 0) return `/${locale}`
  if (rest.length > 1) {
    // 非白名单深度路径（不存在的内容）：保留自指，交由路由的 noindex 处理
    return `/${locale}/${rest.map((s) => s.toLowerCase()).join('/')}`
  }
  const slug = TOOL_SLUG_BY_LOWER.get(rest[0].toLowerCase()) || rest[0].toLowerCase()
  return `/${locale}/${slug}`
}
