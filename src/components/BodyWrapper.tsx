'use client'

import { useTheme } from '@/context/ThemeContext'

export function BodyWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0b1a2e]' : 'bg-[#f5f2ed]'}`}>
      {children}
    </div>
  )
}