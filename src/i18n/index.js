import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './localeConfig.js'
import zh from './locales/zh.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ja from './locales/ja.json'
import pt from './locales/pt.json'
import ru from './locales/ru.json'
import ar from './locales/ar.json'

export { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_META, localeMeta, LOCALE_PATH_PATTERN } from './localeConfig.js'

export default createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: ['en', 'zh'],
  messages: {
    zh,
    en,
    es,
    fr,
    de,
    ja,
    pt,
    ru,
    ar,
  },
})
