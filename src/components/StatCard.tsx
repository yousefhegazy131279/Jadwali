'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

type StatCardProps = {
  icon: ReactNode
  value: number | string
  label: string
  color?: string
  delay?: number
}

export function StatCard({ icon, value, label, color = 'text-[#D4AF37]', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 group"
    >
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ rotate: 10, scale: 1.1 }}
          className={`p-3 rounded-xl bg-white/10 ${color} group-hover:shadow-lg transition-all duration-300`}
        >
          {icon}
        </motion.div>
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="text-2xl font-bold"
          >
            {value}
          </motion.div>
          <div className="text-gray-400 text-sm">{label}</div>
        </div>
      </div>
    </motion.div>
  )
}