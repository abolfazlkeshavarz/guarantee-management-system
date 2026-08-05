import React, { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { type AppLanguage } from '@/i18n'

interface LanguageContextType {
  language: AppLanguage
  direction: 'ltr' | 'rtl'
  setLanguage: (lang: AppLanguage) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function applyDocumentDirection(lang: AppLanguage) {
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInstance } = useTranslation()
  const language = (i18nInstance.language as AppLanguage) || 'en'

  useEffect(() => {
    applyDocumentDirection(language)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const setLanguage = (lang: AppLanguage) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('language', lang)
    applyDocumentDirection(lang)
  }

  const toggleLanguage = () => setLanguage(language === 'fa' ? 'en' : 'fa')

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction: language === 'fa' ? 'rtl' : 'ltr',
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
