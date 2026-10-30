import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './localeConfig.js'

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_META, localeMeta, LOCALE_PATH_PATTERN } from './localeConfig.js'

// 已加载的语种消息缓存：SSR 进程内 / 客户端会话内复用，避免重复动态 import 与重复下载。
const messageCache = new Map()

// 动态加载某语种消息：每个语种被编译为独立 chunk，按需（首屏当前语种 / 切换语种时）才下载，
// 不再把 9 语种全量塞进主包 app.js（合计约 144KB raw / ~48KB gz，全量预载属浪费）。
export async function loadLocaleMessages(locale) {
  if (!messageCache.has(locale)) {
    const mod = await import(`./locales/${locale}.json`)
    messageCache.set(locale, mod.default)
  }
  return messageCache.get(locale)
}

/**
 * 每路由 / 每客户端会话独立 i18n 实例工厂。
 *
 * 根治 vite-ssg 预渲染竞态：旧版是模块级全局单例，20 路由并发预渲染时全局 locale 互相覆盖→串位。
 * 现在每个渲染上下文（SSR 的单个 routePath、客户端的一次启动）拥有自己的实例，
 * 初始仅载入「当前语种 + 兜底语种(en/zh)」，因此 vite-ssg 可恢复默认并行（concurrency=20）而互不串位。
 *
 * @param {string} locale  初始语种（由路由路径或浏览器路径推导）
 * @returns {Promise<import('vue-i18n').I18n>}
 */
export async function createI18nInstance(locale = DEFAULT_LOCALE) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
  // 兜底语种保证即便个别 key 缺失也有英文/中文兜底，不出现裸 key
  const fallback = safeLocale === 'en' ? 'zh' : 'en'
  const messages = {
    [safeLocale]: await loadLocaleMessages(safeLocale),
  }
  if (fallback !== safeLocale) {
    messages[fallback] = await loadLocaleMessages(fallback)
  }
  return createI18n({
    legacy: false,
    locale: safeLocale,
    fallbackLocale: fallback,
    messages,
    missingWarn: false,
    fallbackWarn: false,
  })
}
