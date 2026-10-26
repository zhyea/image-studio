/**
 * Netlify Edge Function：服务端 canonical / hreflang 注入 + URL 规范化 + 未知路径真 404。
 *
 * 背景：本站为 SPA，canonical 原先只在客户端 JS 运行时写入 <head>。Google 在未执行 JS 的
 * 抓取里看不到 canonical，而多个 URL 变体（大小写、尾斜杠、netlify.app 子域）又各自自指，
 * 于是被判定为「重复网页，用户未选定规范网页」。
 *
 * 本函数在边缘层完成三件事：
 *   1. host / 协议 / 路径与规范形式不一致 → 301 收敛到唯一 URL
 *   2. 白名单路径 → 200，并在 HTML 与 HTTP Link 头里服务端注入 canonical + hreflang
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
    return { kind: 'page', locale, slug: segments.length === 2 ? slug : '' }
  }

  // 非白名单路径：若域名本身不规范仍先 301 收敛，否则直接判定为不存在
  if (hostRedirect) {
    return { kind: 'redirect', location: `${hostRedirect}${rawPath.replace(/\/{2,}/g, '/')}` }
  }
  return { kind: 'not-found' }
}

/** 服务端注入 <head> 的 canonical + hreflang 标签 */
export function buildHeadTags(locale, slug) {
  const tail = slug ? `/${slug}` : ''
  const lines = [`<link rel="canonical" href="${SITE_ORIGIN}/${locale}${tail}">`]
  for (const code of SUPPORTED_LOCALES) {
    lines.push(`<link rel="alternate" hreflang="${HREFLANG[code]}" href="${SITE_ORIGIN}/${code}${tail}">`)
  }
  lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}/${X_DEFAULT_LOCALE}${tail}">`)
  return lines.join('\n    ')
}

/** HTTP Link 头形式，供不解析 HTML 的抓取通道使用 */
export function buildLinkHeader(locale, slug) {
  const tail = slug ? `/${slug}` : ''
  const parts = [`<${SITE_ORIGIN}/${locale}${tail}>; rel="canonical"`]
  for (const code of SUPPORTED_LOCALES) {
    parts.push(`<${SITE_ORIGIN}/${code}${tail}>; rel="alternate"; hreflang="${HREFLANG[code]}"`)
  }
  parts.push(`<${SITE_ORIGIN}/${X_DEFAULT_LOCALE}${tail}>; rel="alternate"; hreflang="x-default"`)
  return parts.join(', ')
}

function injectTags(html, tags) {
  if (html.includes('</head>')) return html.replace('</head>', `    ${tags}\n  </head>`)
  if (html.includes('<head>')) return html.replace('<head>', `<head>\n    ${tags}`)
  return `${tags}\n${html}`
}

export default async function handler(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return

  const url = new URL(request.url)
  const decision = resolveSeoRequest(url)
  if (decision.kind === 'passthrough') return

  if (decision.kind === 'redirect') {
    return new Response(null, {
      status: 301,
      headers: {
        location: decision.location,
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    })
  }

  const isPage = decision.kind === 'page'
  const upstream = await fetch(new URL('/index.html', request.url).toString())
  let html = await upstream.text()
  // 仅白名单页面注入 canonical/hreflang；404 页不得把 canonical 指向任何既有页面，
  // 否则等于把整批无效 URL 声明为某个页面的重复版本，反而放大重复信号
  if (isPage) {
    html = injectTags(html, buildHeadTags(decision.locale || X_DEFAULT_LOCALE, decision.slug || ''))
  }

  const headers = new Headers(upstream.headers)
  headers.delete('etag')
  headers.delete('content-length')
  headers.set('content-type', 'text/html; charset=utf-8')
  headers.set('cache-control', 'public, max-age=0, must-revalidate')
  if (isPage) {
    headers.set('link', buildLinkHeader(decision.locale, decision.slug || ''))
    headers.set('x-robots-tag', 'index, follow, max-image-preview:large, max-snippet:-1')
  } else {
    // 真 404 且不给 canonical：404 页不该与任何页面争夺规范身份
    headers.delete('link')
    headers.set('x-robots-tag', 'noindex, nofollow')
  }

  return new Response(html, { status: isPage ? 200 : 404, headers })
}
