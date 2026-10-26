/**
 * 全站唯一的规范域名来源：canonical / og:url / hreflang / sitemap / robots 必须同源。
 *
 * 不使用 window.location.origin 作为 canonical 的域名 —— Netlify 站点通常同时可通过
 * <site>.netlify.app 与自定义域名访问，若 canonical 随访问域名漂移，各变体会各自自指，
 * 被 Google 判定为「重复网页，用户未选定规范网页」。
 *
 * 生产/预发布一律取配置值；本地开发允许跟随本机 origin（localhost 不会被索引）。
 */
export const DEFAULT_SITE_ORIGIN = 'https://image.chobit.org'

/** @returns {string} 不含结尾斜杠的规范域名，如 https://image.chobit.org */
export function siteOrigin() {
  const configured = String(import.meta.env?.VITE_SITE_ORIGIN || DEFAULT_SITE_ORIGIN)
  if (import.meta.env?.DEV && typeof window !== 'undefined') return window.location.origin
  return configured.replace(/\/+$/, '')
}
