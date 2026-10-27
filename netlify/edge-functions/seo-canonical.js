/**
 * Netlify Edge Function：仅做 URL 规范化 + 未知路径真 404。
 *
 * 背景变更：本站已迁移到 Vite SSG，每个 locale+tool 路由在构建期预渲染为独立静态 HTML，
 * 其 <head> 已含完整 canonical / hreflang / title / og / twitter / json-ld
 * （由 @unhead/vue 在构建期写入）。因此边缘层**不再注入** head 标签——
 * 否则会与静态 HTML 内既有的 canonical 重复，反而放大「重复网页」信号。
 *
 * 职责收敛为三件：
 *   1. host / 协议 / 路径与规范形式不一致 → 301 收敛到唯一 URL
 *   2. 白名单路径 → 直接放行，由 Netlify 静态服务预渲染 HTML（Pretty URLs 映射到无尾斜杠）
 *   3. 非白名单路径 → 404 状态码 + noindex（消除 SPA 200 回退带来的无限重复 URL 空间）
 *
 * 下方的 locale / slug / hreflang 清单必须与 src 保持一致，
 * 由 tests/netlifySeoCanonical.test.mjs 做逐项断言，漂移会被测试拦截。
 */

const PRIMARY_HOST = 'image.chobit.org'
const SITE_ORIGIN = `https://${PRIMARY_HOST}`
const X_DEFAULT_LOCALE = 'en'

export const SUPPORTED_LOCALES = ['zh', 'en', 'es', 'fr', 'de', 'ja', 'pt', 'ru', 'ar']

export const TOOL_SLUGS = [
  'compress',
  'upscale',
  'remove-bg',
  'resize',
  'crop',
  'convert-jpg',
  'rotate',
  'watermark',
  'meme',
  'html-to-image',
  'blur',
  'web-skeleton',
]

export const HREFLANG = {
  zh: 'zh-CN',
  en: 'en',
  es: 'es',
  fr: 'fr',
  de: 'de',
  ja: 'ja',
  pt: 'pt-BR',
  ru: 'ru',
  ar: 'ar',
}

/** 哈希化的静态资源直接放行，避免边缘层介入 CDN 缓存 */
const STATIC_EXT = /\.(?:js|mjs|css|json|map|svg|png|jpe?g|gif|webp|avif|ico|txt|xml|html|woff2?|ttf|otf|wasm)$/i

/** localhost / 127.0.0.1：Netlify CLI 本地运行即为 http，不能强制跳 https */
function isLoopback(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  )
}

/**
 * @returns {string | null} 需要重定向到的规范域名；null 表示保持当前域名
 */
export function redirectTargetForHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  if (h === PRIMARY_HOST) return null
  if (isLoopback(h)) return null
  if (h.endsWith('.netlify.app') && h.includes('--')) return null // deploy preview / branch deploy 保留
  return SITE_ORIGIN
}

/**
 * 纯函数，便于单测。入参为 URL 形态对象（{ hostname, pathname, protocol }）。
 * @returns {{kind: 'passthrough'|'redirect'|'page'|'not-found', location?: string, locale?: string, slug?: string}}
 */
export function resolveSeoRequest(url) {
  const hostname = String(url.hostname || '').toLowerCase()
  const rawPath = url.pathname || '/'

  if (STATIC_EXT.test(rawPath)) return { kind: 'passthrough' }
  // 根路径保留客户端语言探测跳转，不做 301，避免破坏按浏览器语种落地
  if (rawPath === '/') return { kind: 'passthrough' }

  const segments = rawPath.split('/').filter((s) => s !== '')
  const locale = (segments[0] || '').toLowerCase()
  const slug = (segments[1] || '').toLowerCase()
  const isKnown =
    SUPPORTED_LOCALES.includes(locale) &&
    segments.length <= 2 &&
    (segments.length === 1 || TOOL_SLUGS.includes(slug))

  const hostRedirect = redirectTargetForHost(hostname)

  if (isKnown) {
    const canonicalPath = `/${locale}${segments.length === 2 ? `/${slug}` : ''}`
    const needsSecure = String(url.protocol || '').toLowerCase() === 'http:' && !isLoopback(hostname)
    if (hostRedirect || needsSecure || canonicalPath !== rawPath) {
      const origin = hostRedirect || `${needsSecure ? 'https:' : url.protocol || 'https:'}//${hostname}`
      return { kind: 'redirect', location: `${origin}${canonicalPath}` }
    }
    // 已是规范 URL：直接放行，由 Netlify 静态服务预渲染 HTML（不再注入 head）
    return { kind: 'page', locale, slug: segments.length === 2 ? slug : '' }
  }

  // 非白名单路径：若域名本身不规范仍先 301 收敛，否则直接判定为不存在
  if (hostRedirect) {
    return { kind: 'redirect', location: `${hostRedirect}${rawPath.replace(/\/{2,}/g, '/')}` }
  }
  return { kind: 'not-found' }
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return

  const url = new URL(request.url)
  const decision = resolveSeoRequest(url)
  // 静态资源 / 根路径 / 已规范的白名单页面：全部放行，由 Netlify 静态服务预渲染 HTML。
  // 注意：白名单页面（kind 'page'）必须放行——head 已由 SSG 写入静态 HTML，边缘层不再注入，
  // 否则会落到下面的 404 分支把正常页面打成 404。
  if (decision.kind === 'passthrough' || decision.kind === 'page') return

  if (decision.kind === 'redirect') {
    return new Response(null, {
      status: 301,
      headers: {
        location: decision.location,
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    })
  }

  // 非白名单路径：真 404 + noindex，并且不给出任何 canonical（避免与既有页面争夺规范身份）
  return new Response('Not Found', {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}
