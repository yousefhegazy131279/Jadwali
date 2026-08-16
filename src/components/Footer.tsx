// ============================================================
//  3. `src/components/Footer.tsx` (فووتر مع لوجو مكبر + الإصدار + نبض القلب)
// ============================================================
'use client'

import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9 }}
      className="text-center py-4 border-t border-[var(--border-color)] mt-6"
    >
      <div className="flex flex-col md:flex-row items-center justify-center gap-3 text-sm text-[var(--text-muted)] font-['Cairo']">
        {/* حقوق النشر */}
        <div className="flex items-center gap-2">
          <span>© {year}</span>
          <span className="text-[#D4AF37] font-bold font-['Amiri']">جَدْوَلِي</span>
          <span>جميع الحقوق محفوظة</span>
        </div>

        {/* اللوجو المكبر */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 opacity-80 hover:opacity-100 transition-opacity">
            <Logo />
          </div>
        </div>
      </div>

      {/* الإصدار بخط صغير */}
      <p className="text-xs text-[var(--text-muted)] opacity-70 mt-2 font-['Cairo']">
        الإصدار: v0.5
      </p>

      {/* صنع بكل ❤️ من HGZ */}
      <p className="text-xs text-[var(--text-muted)] opacity-70 mt-2 font-['Cairo'] flex items-center justify-center gap-1">
        صنع بكل
        <motion.span
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          className="inline-block text-red-500"
          style={{ display: 'inline-block' }}
        >
          ❤️
        </motion.span>
        من HGZ
      </p>
    </motion.footer>
  )
}