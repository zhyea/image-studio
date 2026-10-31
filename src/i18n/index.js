/**
 * 极简 i18n（drop-in 替代 vue-i18n）。
 *
 * 背景：本项目实际只用到 `t(key)`、`t(key, params)` 与响应式 `locale`，
 * 却为此引入了 33.5KB(gzip) 的 vue-i18n 运行时（占初始 JS 约 21%）。
 * 本实现约 1KB，API 与 `useI18n()` 完全一致，9 语种与全部 `t('...')` 调用点均不变。
 *
 * 关键约束：SSR 并行预渲染（vite-ssg concurrency=20）下**不能**用模块级共享的可变语种状态，
 * 否则会重演「全局单例被并发渲染互相覆盖」的语种串位。故每路由经 app.provide 注入独立实例。
 */
import { inject, ref, shallowRef } from 'vue'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './localeConfig.js'

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_META, localeMeta, LOCALE_PATH_PATTERN } from './localeConfig.js'

/** 注入键：main.js 每路由 app.provide，组件经 useI18n() 取回 */
export const I18N_KEY = 'liteI18n'

// 已加载的语种消息缓存：SSR 进程内 / 客户端会话内复用，避免重复动态 import 与重复下载。
const messageCache = new Map()

// 动态加载某语种消息：每个语种被编译为独立 chunk，按需（首屏当前语种 + 兜底 / 切换语种）才下载，
// 不再把 9 语种全量塞进主包 app.js（合计约 144KB raw / ~48KB gz，全量预载属浪费）。
export async function loadLocaleMessages(locale) {
  if (!messageCache.has(locale)) {
    const mod = await import(`./locales/${locale}.json`)
    messageCache.set(locale, mod.default)
  }
  return messageCache.get(locale)
}

function resolvePath(dict, key) {
  let cur = dict
  for (const seg of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[seg]
  }
  return cur
}

/** 极简 Composer：{ t, locale, getLocaleMessage, setLocaleMessage } */
function createComposer(locale, messages) {
  const localeRef = ref(locale)
  // shallowRef：避免为 224 键的嵌套字典逐层创建深层响应式代理（每路由一次，内存与耗时都是纯浪费）。
  // 语种切换由 localeRef 驱动重渲染；补载消息时整体替换 .value 以触发更新。
  const messagesRef = shallowRef(messages)

  function lookup(key) {
    const direct = resolvePath(messagesRef.value[localeRef.value] || {}, key)
    if (typeof direct === 'string') return direct
    // 兜底 en → zh：保证个别 key 缺失时不出现裸 key
    for (const fb of [DEFAULT_LOCALE, 'zh']) {
      if (fb === localeRef.value) continue
      const v = resolvePath(messagesRef.value[fb] || {}, key)
      if (typeof v === 'string') return v
    }
    return undefined
  }

  /**
   * @param {string} key 形如 'nav.home' / 'tools.compress.title'
   * @param {Record<string, string|number>} [params] 具名插值，形如 { r, g, b } → '{r}'
   */
  function t(key, params) {
    const val = lookup(key)
    if (typeof val !== 'string') return key
    if (!params || typeof params !== 'object') return val
    return val.replace(/\{(\w+)\}/g, (raw, name) => (name in params ? String(params[name]) : raw))
  }

  return {
    t,
    locale: localeRef,
    getLocaleMessage: (loc) => messagesRef.value[loc] || {},
    setLocaleMessage: (loc, msg) => {
      messagesRef.value = { ...messagesRef.value, [loc]: msg }
    },
  }
}

/**
 * 每路由 / 每客户端会话独立实例工厂。
 * 旧版是 vue-i18n 模块级全局单例，20 路由并发预渲染时全局 locale 互相覆盖→串位；
 * 现在每个渲染上下文（SSR 的单个 routePath、客户端的一次启动）拥有自己的实例，故可并行而互不串位。
 *
 * @param {string} locale 初始语种（由路由路径或浏览器路径推导）
 */
export async function createI18nInstance(locale = DEFAULT_LOCALE) {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
  // 兜底语种保证即便个别 key 缺失也有英文/中文兜底，不出现裸 key
  const fallback = safeLocale === DEFAULT_LOCALE ? 'zh' : DEFAULT_LOCALE
  const messages = {
    [safeLocale]: await loadLocaleMessages(safeLocale),
  }
  if (fallback !== safeLocale) {
    messages[fallback] = await loadLocaleMessages(fallback)
  }
  return createComposer(safeLocale, messages)
}

/**
 * drop-in 替代 vue-i18n 的 useI18n()：返回 { t, locale }（locale 为 Ref）。
 * 组件侧无需任何改动。
 */
export function useI18n() {
  const composer = inject(I18N_KEY, null)
  if (!composer) {
    // 兜底：未注入时退化为「返回 key 原文」，避免抛错打断渲染（正常流程不会发生）
    return { t: (key) => key, locale: ref(DEFAULT_LOCALE) }
  }
  return composer
}
