'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'
type ThemeContextType = {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t: tr, language } = useLanguage()

  const [theme, setTheme] = useState<Theme>('dark')
  const [ready, setReady] = useState(false)

  // عند التحميل: اقرأ الثيم المحفوظ أو استخدم تفضيل النظام
  useEffect(() => {
    try {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light')
    }
    } catch {}
    setReady(true)
  }, [])

  // عند تغيّر الثيم: طبّقه على العنصر الجذري واحفظه
  useEffect(() => {
    if (!ready) return
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme, ready])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}