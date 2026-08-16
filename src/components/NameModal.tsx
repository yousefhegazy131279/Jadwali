'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, User, Check } from 'lucide-react'

type NameModalProps = {
  isOpen: boolean
  onSave: (name: string) => void
}

export function NameModal({ isOpen, onSave }: NameModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      alert('الرجاء إدخال اسم مكون من حرفين على الأقل')
      return
    }
    setLoading(true)
    onSave(name.trim())
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-full bg-[#D4AF37]/20">
              <Sparkles className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Amiri']">
            مرحباً بك في <span className="text-[#D4AF37]">جَدْوَلِي</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-2 font-['Cairo']">
            كيف نناديك؟ أدخل اسمك ليكون هوية لك في المنصة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك..."
              className="w-full pr-10 pl-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              autoFocus
              dir="rtl"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0b1a2e] border-t-transparent" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                تأكيد الاسم
              </>
            )}
          </motion.button>
        </form>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4 font-['Cairo']">
          يمكنك تغيير هذا الاسم لاحقاً من الإعدادات
        </p>
      </motion.div>
    </div>
  )
}