'use client'

import { motion } from 'framer-motion'
import { Task } from '@/types'
import { Calendar, XCircle } from 'lucide-react'

type TaskCardProps = {
  task: Task
  index: number
  onToggle?: (id: string) => void
  onDelete?: (id: string) => void
}

export function TaskCard({ task, index, onToggle, onDelete }: TaskCardProps) {
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }

  const priorityLabels = {
    high: 'عاجل',
    medium: 'متوسط',
    low: 'عادي',
  }

  const priorityGlows = {
    high: 'shadow-red-500/20',
    medium: 'shadow-yellow-500/20',
    low: 'shadow-green-500/20',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
      whileHover={{ scale: 1.01, x: 4 }}
      className={`flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 shadow-lg hover:shadow-xl ${priorityGlows[task.priority]}`}
    >
      {/* زر إكمال المهمة */}
      <motion.button
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onToggle?.(task.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
          task.done 
            ? 'bg-green-500 border-green-500' 
            : 'border-gray-500 hover:border-[#D4AF37]'
        }`}
      >
        {task.done && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </motion.button>

      {/* نقطة الأولوية */}
      <motion.span
        whileHover={{ scale: 1.3 }}
        className={`w-2 h-2 rounded-full ${priorityColors[task.priority]} animate-pulse`}
      />

      {/* اسم المهمة */}
      <span className={`flex-1 font-medium ${task.done ? 'line-through text-gray-500' : ''}`}>
        {task.name}
      </span>

      {/* التاريخ */}
      {task.due_date && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 + 0.1 }}
          className="text-sm text-gray-400 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full"
        >
          <Calendar className="w-3 h-3" />
          {task.due_date}
        </motion.span>
      )}

      {/* علامة الأولوية */}
      <span className={`text-xs px-3 py-1 rounded-full border border-white/10 ${
        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
        task.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-green-500/20 text-green-400'
      }`}>
        {priorityLabels[task.priority]}
      </span>

      {/* زر الحذف */}
      <motion.button
        whileHover={{ scale: 1.2, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete?.(task.id)}
        className="text-gray-500 hover:text-red-400 transition-colors p-1 hover:bg-red-500/10 rounded-full"
      >
        <XCircle className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
}