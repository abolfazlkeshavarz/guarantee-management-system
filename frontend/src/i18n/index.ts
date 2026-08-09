import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fa from './locales/fa.json'
import enExtra from './locales/extra.en.json'
import faExtra from './locales/extra.fa.json'

export type AppLanguage = 'en' | 'fa'

type Dict = Record<string, unknown>

/**
 * Merges the extra bundles into the main locale files at load time.
 *
 * New strings used to arrive as a snippet you had to paste into en.json and
 * fa.json by hand. Miss that step and the UI silently falls back to the
 * English defaultValue -- which is exactly why the period dropdown still read
 * "months ۳" after the code was already in place. Keeping additions in their
 * own file removes the manual step and the merge conflicts that come with two
 * people editing one 400-line JSON.
 */
function deepMerge(base: Dict, extra: Dict): Dict {
  const result: Dict = { ...base }

  for (const [key, value] of Object.entries(extra)) {
    const existing = result[key]
    const bothPlainObjects =
      existing !== null &&
      typeof existing === 'object' &&
      !Array.isArray(existing) &&
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)

    result[key] = bothPlainObjects
      ? deepMerge(existing as Dict, value as Dict)
      : value
  }

  return result
}

const savedLanguage = (localStorage.getItem('language') as AppLanguage) || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: deepMerge(en as Dict, enExtra as Dict) },
    fa: { translation: deepMerge(fa as Dict, faExtra as Dict) },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// Applied before React mounts so the page never flashes in the wrong direction.
document.documentElement.lang = savedLanguage
document.documentElement.dir = savedLanguage === 'fa' ? 'rtl' : 'ltr'

export default i18n
