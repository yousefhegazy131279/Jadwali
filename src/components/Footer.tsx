'use client'

import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaGithub } from 'react-icons/fa'
import { Heart } from 'lucide-react'
import { memo } from 'react'

export const Footer = memo(function Footer() {
  // ... نفس الكود الحالي بدون تغيير

  const year = new Date().getFullYear()

  const quickLinks = [
    { href: '/dashboard', label: 'لوحة التحكم' },
    { href: '/dashboard/planner', label: 'المخطط' },
    { href: '/dashboard/schedule', label: 'الجداول' },
    { href: '/dashboard/workspace', label: 'المهام' },
    { href: '/dashboard/settings', label: 'الإعدادات' },
  ]

  const socialLinks = [
    { href: 'https://www.facebook.com/ywsf.hjazy.160024', icon: FaFacebookF, label: 'فيسبوك', color: 'hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/10' },
    { href: 'https://www.instagram.com/hgz1312/', icon: FaInstagram, label: 'انستجرام', color: 'hover:text-pink-500 hover:border-pink-500/50 hover:bg-pink-500/10' },
    { href: 'https://www.linkedin.com/in/yousef-hegazy-a0aa13333/', icon: FaLinkedinIn, label: 'لينكد إن', color: 'hover:text-blue-700 hover:border-blue-700/50 hover:bg-blue-700/10' },
    { href: 'https://github.com/yousefhegazy131279', icon: FaGithub, label: 'جيت هاب', color: 'hover:text-purple-500 hover:border-purple-500/50 hover:bg-purple-500/10' },
  ]

  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mt-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/40 backdrop-blur-xl overflow-hidden"
    >
      {/* خط ذهبي متوهج علوي */}
      <motion.div
        className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* توهجات خلفية */}
      <div className="absolute -top-20 left-1/4 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* الشعار والوصف + أزرار التواصل + زر من نحن */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                whileHover={{ rotate: 20, scale: 1.15 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="w-12 h-12"
              >
                <Logo />
              </motion.div>
              <div>
                <h3 className="text-2xl font-bold font-['Amiri'] text-[var(--text-primary)]">
                  جَدْوَلِي
                </h3>
                <p className="text-xs text-[#D4AF37] font-['Cairo']">
                  خطط يومك، أنجز مهامك، عش حياتك
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-['Cairo'] leading-relaxed mb-5 max-w-md">
              تطبيق إدارة الوقت والإنتاجية اليومية، مصمم خصيصًا للمستخدم العربي
              ليجمع بين التخطيط الذكي والالتزام الروحي في مكان واحد.
            </p>

            {/* أزرار التواصل الاجتماعي */}
            <div className="flex gap-3 mb-6">
              {socialLinks.map(({ href, icon: Icon, label, color }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -6, scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  className={`p-2.5 rounded-lg border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] transition-colors duration-200 ${color}`}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>

            {/* زر من نحن */}
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-300 font-['Cairo'] text-sm font-bold"
            >
              من نحن؟
            </Link>
          </motion.div>

          {/* روابط سريعة */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h4 className="text-sm font-bold font-['Cairo'] text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <motion.span
                className="w-1 h-4 bg-gradient-to-b from-[#D4AF37] to-transparent rounded-full"
                animate={{ height: ['16px', '20px', '16px'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              روابط سريعة
            </h4>
            <ul className="space-y-1.5">
              {quickLinks.map((link) => (
                <motion.li
                  key={link.href}
                  whileHover={{ x: 6 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors font-['Cairo'] py-1"
                  >
                    <motion.span
                      className="w-0 h-px bg-[#D4AF37] group-hover:w-4 transition-all duration-300"
                    />
                    {link.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* الجزء السفلي */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-[var(--text-muted)] font-['Cairo']">
            © {year} <span className="text-[#D4AF37] font-bold font-['Amiri']">جَدْوَلِي</span> جميع الحقوق محفوظة
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-['Cairo']">
            <span>الإصدار: v0.5</span>
            <span className="mx-1 opacity-50">•</span>
            <span className="flex items-center gap-1">
              صُنع بكل
              <motion.span
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
                className="inline-block text-red-500"
              >
                <Heart className="w-3 h-3 fill-red-500" />
              </motion.span>
              من <span className="text-[#D4AF37] font-bold">HGZ</span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.footer>
  )
})