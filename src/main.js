import { ViteSSG } from 'vite-ssg'
import './style.css'
import App from './App.vue'
import routes from './router'
import i18n from './i18n'
import { SUPPORTED_LOCALES } from './i18n/localeConfig.js'
import { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'

// SSG 入口：ViteSSG 内部用 routes 创建 router，并在 SSR 阶段把每个路由预渲染为独立静态 HTML。
// 每个 locale 页面的内容（含 <head> 的 title/meta/canonical/hreflang/json-ld）由 App.vue 的
// useHead(() => buildHeadConfig(route, i18n)) 在渲染期声明，vite-ssg 写入产物 HTML。
export const createApp = ViteSSG(
  App,
  { routes, base: import.meta.env.BASE_URL || '/' },
  ({ app, router }) => {
    app.use(i18n)
    // Element Plus 在 SSR 渲染期需要确定性 id / z-index provider，否则会抛 IdInjection /
    // ZIndexInjection 警告，且服务端与客户端的自增 id 不一致导致 hydrate 不匹配。
    app.provide(ID_INJECTION_KEY, { prefix: 1024, current: 0 })
    app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
    // 渲染每个 locale 路由前，把 vue-i18n 切到对应语言，使预渲染内容为该语种
    router.beforeEach((to) => {
      const loc = to.params.locale
      if (loc && SUPPORTED_LOCALES.includes(loc)) {
        i18n.global.locale.value = loc
      }
    })
  },
)
