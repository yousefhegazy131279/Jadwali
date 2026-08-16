// ============================================================
//  2. `src/components/Greeting.tsx` (جمل ترحيبية مختلفة)
// ============================================================
'use client'

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
      {greeting} {name && `، ${name}`}
    </motion.div>
  )
}