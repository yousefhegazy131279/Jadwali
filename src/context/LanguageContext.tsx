'use client'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { translations } from '@/lib/translations'
export type Language = 'ar' | 'en'
function translateWith(key: string, language: Language, english?: string) {
  if (language === 'ar') return key
  const normalized = key.trim()
  const value = english ?? translations[normalized]
  return value === undefined ? key : key.replace(normalized, value)
}
export function translate(key: string, english?: string) {
  return translateWith(key, typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar', english)
}
const LanguageContext = createContext({ language: 'ar' as Language, setLanguage: (_: Language) => {}, t: (key: string, english?: string) => key })
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ar')
  const [ready, setReady] = useState(false)
  useEffect(() => { try { if (localStorage.getItem('jadwali-language') === 'en') setLanguage('en') } catch {} setReady(true) }, [])
  useEffect(() => {
    if (!ready) return
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    document.title = language === 'ar' ? 'جَدْوَلِي' : 'Jadwali'
    document.querySelector('link[rel="manifest"]')?.setAttribute('href', language === 'ar' ? '/manifest.json' : '/manifest.en.json')
    try { localStorage.setItem('jadwali-language', language) } catch {}
  }, [language, ready])
  const t = useCallback((key: string, english?: string) => translateWith(key, language, english), [language])
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}
export const useLanguage = () => useContext(LanguageContext)
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  return <button className="v1-button" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} aria-label="Change language">{language === 'ar' ? 'English' : 'العربية'}</button>
}
