/**
 * URL 段与 vue-i18n 语言代码（与 locales/*.json 文件名一致）
 * 顺序：中文、英语、西语、法语、德语、日语、葡语、俄语、阿语
 */
export const SUPPORTED_LOCALES = ['zh', 'en', 'es', 'fr', 'de', 'ja', 'pt', 'ru', 'ar']

/** 根路径 / 重定向默认语言（系统语言不匹配时回退） */
export const DEFAULT_LOCALE = 'en'

/**
 * @typedef {{ bcp47: string, og: string, hreflang: string, dir: 'ltr' | 'rtl', label: string }} LocaleMeta
 * @type {Record<string, LocaleMeta>}
 */
export const LOCALE_META = {
  zh: { bcp47: 'zh-CN', og: 'zh_CN', hreflang: 'zh-CN', dir: 'ltr', label: '简体中文' },
  en: { bcp47: 'en', og: 'en_US', hreflang: 'en', dir: 'ltr', label: 'English' },
  es: { bcp47: 'es', og: 'es_ES', hreflang: 'es', dir: 'ltr', label: 'Español' },
  fr: { bcp47: 'fr', og: 'fr_FR', hreflang: 'fr', dir: 'ltr', label: 'Français' },
  de: { bcp47: 'de', og: 'de_DE', hreflang: 'de', dir: 'ltr', label: 'Deutsch' },
  ja: { bcp47: 'ja', og: 'ja_JP', hreflang: 'ja', dir: 'ltr', label: '日本語' },
  pt: { bcp47: 'pt', og: 'pt_BR', hreflang: 'pt-BR', dir: 'ltr', label: 'Português' },
  ru: { bcp47: 'ru', og: 'ru_RU', hreflang: 'ru', dir: 'ltr', label: 'Русский' },
  ar: { bcp47: 'ar', og: 'ar_SA', hreflang: 'ar', dir: 'rtl', label: 'العربية' },
}

/** @param {string} code */
export function localeMeta(code) {
  return LOCALE_META[code] ?? LOCALE_META.en
}

export const LOCALE_PATH_PATTERN = SUPPORTED_LOCALES.join('|')
