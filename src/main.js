import { ViteSSG } from 'vite-ssg'
import './style.css'
import App from './App.vue'
import routes from './router'
import { createI18nInstance, loadLocaleMessages, I18N_KEY } from './i18n'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './i18n/localeConfig.js'

// 从路径第一段推导语种（SSR 用预渲染 routePath；客户端用浏览器 pathname）。
function localeFromPath(path) {
  const m = String(path || '/').match(/^\/([^/]+)(\/.*)?$/)
  const loc = m && m[1]
  return loc && SUPPORTED_LOCALES.includes(loc) ? loc : DEFAULT_LOCALE
}

// SSG 入口：ViteSSG 内部用 routes 创建 router，并在 SSR 阶段把每个路由预渲染为独立静态 HTML。
// 每个 locale 页面的内容（含 <head> 的 title/meta/canonical/hreflang/json-ld）由 App.vue 的
// useHead(() => buildHeadConfig(route, i18n)) 在渲染期声明，vite-ssg 写入产物 HTML。
//
// 注：此处刻意**不**从 'element-plus' 主包导入任何符号。此前为 SSR 确定性而导入
// ID_INJECTION_KEY / ZINDEX_INJECTION_KEY，会把 element-plus 主包的 utils（含 lodash 依赖）
// 提升为共享 chunk（产物 use-z-index-*.js，11.5KB raw / 5KB gz），令每个页面首屏都强制加载。
// 这两个 key 在 EP 内部均有 inject 默认值兜底，缺失只影响自增 id / z-index 的确定性，
// 不抛异常；随 EP 组件逐步原生化，该需求会自然消失。
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
    // 极简 i18n：每路由独立实例经 provide 注入（非 app.use 的全局插件），
    // SSR 并行预渲染时各路由实例互不干扰，语种不会串位。
    app.provide(I18N_KEY, i18n)
    // 客户端：切换语种时按需补载消息，避免预载全部 9 语种。
    // SSR 不注册（首屏语种已在 createI18nInstance 内载入）。
    if (!import.meta.env.SSR) {
      router.beforeEach(async (to) => {
        const loc = to.params.locale
        if (loc && SUPPORTED_LOCALES.includes(loc) && loc !== i18n.locale.value) {
          const msgs = await loadLocaleMessages(loc)
          if (!Object.keys(i18n.getLocaleMessage(loc)).length) {
            i18n.setLocaleMessage(loc, msgs)
          }
          i18n.locale.value = loc
        }
      })
    }
  },
)
