'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
// ============================================================
//  2. `src/components/Greeting.tsx` (جمل ترحيبية مختلفة)
// ============================================================
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const greetings = [
  'مرحباً بك في منصتك الذكية 🚀',
  'يوم جديد، إنجازات جديدة ✨',
  'أنت في المكان المناسب لتنظيم حياتك 📋',
  'معاً نصنع النجاح 💪',
  'ابدأ يومك بتركيز وإيجابية 🌟',
  'الإنتاجية تبدأ من هنا ⚡',
  'جَدْوَلِي ينتظر خطوتك القادمة 📅',
  'كن أفضل نسخة من نفسك اليوم 💎',
]

export function Greeting({ name }: { name: string }) {
  const { t: tr, language } = useLanguage()

  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const random = greetings[Math.floor(Math.random() * greetings.length)]
    setGreeting(random)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-gray-300 text-sm font-['Cairo']"
    >
      {tr(greeting)} {name && `، ${name}`}
    </motion.div>
  )
}