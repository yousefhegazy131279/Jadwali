'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type QuickActionProps = {
  icon: ReactNode
  label: string
  onClick: () => void
  color?: string
  delay?: number
}

export function QuickAction({ icon, label, onClick, color = 'bg-[#D4AF37]', delay = 0 }: QuickActionProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${color} text-[#0b1a2e] px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300`}
    >
      {icon}
      {label}
    </motion.button>
  )
}