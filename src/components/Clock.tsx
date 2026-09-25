'use client'
import { formatTime12 } from '@/lib/time'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
// ============================================================
//  1. `src/components/Clock.tsx` (نظام 12 ساعة)
// ============================================================
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export function Clock() {
  const { t: tr, language } = useLanguage()

  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  let hours = time.getHours()
  const minutes = String(time.getMinutes()).padStart(2, '0')
  const seconds = String(time.getSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? tr('مساءً') : tr('صباحاً')
  hours = hours % 12 || 12

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="font-mono text-2xl font-bold text-[#D4AF37] tracking-wider bg-[var(--bg-card)] px-4 py-2 rounded-xl border border-[var(--border-color)] shadow-lg backdrop-blur-sm"
    >
      {formatTime12(time, language, true)}
    </motion.div>
  )
}