import { ref } from 'vue'
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './localeConfig.js'

// Element Plus locale 按需动态加载：避免静态全量 import 9 个 EP locale 把 ~20-30KB 塞进 app.js。
// 与 vue-i18n 消息拆分同源思路——当前语种（及客户端切换语种）才下载，其余按需。
// 注意：SSR 并行预渲染不能用模块级共享可变值存 EP locale（会重演 i18n 串位竞态），
// 必须每路由经 app.provide 注入确定值；模块级 epLocaleRef 仅客户端单会话复用。
const epLoaders = {
  zh: () => import('element-plus/es/locale/lang/zh-cn'),
  en: () => import('element-plus/es/locale/lang/en'),
  es: () => import('element-plus/es/locale/lang/es'),
  fr: () => import('element-plus/es/locale/lang/fr'),
  de: () => import('element-plus/es/locale/lang/de'),
  ja: () => import('element-plus/es/locale/lang/ja'),
  pt: () => import('element-plus/es/locale/lang/pt-br'),
  ru: () => import('element-plus/es/locale/lang/ru'),
  ar: () => import('element-plus/es/locale/lang/ar'),
}

const cache = new Map()

// 客户端单会话内复用、按需加载的 EP locale；SSR 构建不依赖此 ref（见 main.js 的 app.provide）。
export const epLocaleRef = ref(null)

export async function loadEpLocale(locale) {
  const code = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
  if (!cache.has(code)) {
    const mod = await epLoaders[code]()
    cache.set(code, mod.default)
  }
  return cache.get(code)
}

// 客户端：切换语种时调用，更新响应式 EP locale 以驱动 el-config-provider 重新提供。
export async function ensureEpLocale(locale) {
  epLocaleRef.value = await loadEpLocale(locale)
}

export const EP_LOCALE_KEY = 'epLocale'
