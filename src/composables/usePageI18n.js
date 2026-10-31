import { useI18n } from '../i18n'

/**
 * @param {string} pageKey — e.g. compress, convertJpg, removeBg
 */
export function usePageI18n(pageKey) {
  const { t } = useI18n()
  const tp = (subKey) => t(`pages.${pageKey}.${subKey}`)
  return { t, tp }
}
