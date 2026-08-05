import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fa from './locales/fa.json'

export type AppLanguage = 'en' | 'fa'

const savedLanguage = (localStorage.getItem('language') as AppLanguage) || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
  },
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

// Apply direction/lang immediately (before React mounts) to avoid a
// flash of the wrong layout direction on load.
document.documentElement.lang = savedLanguage
document.documentElement.dir = savedLanguage === 'fa' ? 'rtl' : 'ltr'

export default i18n
