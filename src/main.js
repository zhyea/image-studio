import { ViteSSG } from 'vite-ssg'
import './style.css'
import App from './App.vue'
import routes from './router'
import { createI18nInstance, loadLocaleMessages } from './i18n'
import { loadEpLocale, ensureEpLocale, epLocaleRef, EP_LOCALE_KEY } from './i18n/epLocale.js'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './i18n/localeConfig.js'
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'

// 从路径第一段推导语种（SSR 用预渲染 routePath；客户端用浏览器 pathname）。
function localeFromPath(path) {
  const m = String(path || '/').match(/^\/([^/]+)(\/.*)?$/)
  const loc = m && m[1]
  return loc && SUPPORTED_LOCALES.includes(loc) ? loc : DEFAULT_LOCALE
}

// SSG 入口：ViteSSG 内部用 routes 创建 router，并在 SSR 阶段把每个路由预渲染为独立静态 HTML。
// 每个 locale 页面的内容（含 <head> 的 title/meta/canonical/hreflang/json-ld）由 App.vue 的
// useHead(() => buildHeadConfig(route, i18n)) 在渲染期声明，vite-ssg 写入产物 HTML。
export const createApp = ViteSSG(
  App,
  { routes, base: import.meta.env.BASE_URL || '/' },
  async ({ app, router, routePath }) => {
    // 每路由独立 i18n 实例（SSR 按 routePath；客户端按浏览器路径），消除全局单例竞态，
    // 使 vite-ssg 可并行（默认 concurrency=20）预渲染而互不串位。
    const initialLocale = import.meta.env.SSR
      ? localeFromPath(routePath)
      : localeFromPath(typeof window !== 'undefined' ? window.location.pathname : '/')
    const i18n = await createI18nInstance(initialLocale)
    app.use(i18n)
    // Element Plus locale 按当前语种按需加载并注入：SSR 用确定值（避免并行竞态），
    // 客户端用响应式 ref（单会话无竞态，切换语种时由 beforeEach 更新）。
    const epLocale = await loadEpLocale(initialLocale)
    if (import.meta.env.SSR) {
      app.provide(EP_LOCALE_KEY, epLocale)
    } else {
      epLocaleRef.value = epLocale
      app.provide(EP_LOCALE_KEY, epLocaleRef)
    }
    // Element Plus 在 SSR 渲染期需要确定性 id / z-index provider，否则会抛 IdInjection /
    // ZIndexInjection 警告，且服务端与客户端的自增 id 不一致导致 hydrate 不匹配。
    app.provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 })
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    // 客户端：切换语种时按需补载消息与 EP locale，避免预载全部 9 语种。
    // SSR 不注册（首屏语种已在 createI18nInstance / loadEpLocale 内载入）。
    if (!import.meta.env.SSR) {
      router.beforeEach(async (to) => {
        const loc = to.params.locale
        if (loc && SUPPORTED_LOCALES.includes(loc) && loc !== i18n.global.locale.value) {
          const msgs = await loadLocaleMessages(loc)
          if (!Object.keys(i18n.global.getLocaleMessage(loc)).length) {
            i18n.global.setLocaleMessage(loc, msgs)
          }
          i18n.global.locale.value = loc
          await ensureEpLocale(loc)
        }
      })
    }
  },
)
