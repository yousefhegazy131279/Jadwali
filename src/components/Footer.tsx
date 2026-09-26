'use client'

import { useLanguage } from '@/context/LanguageContext'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { motion } from 'framer-motion'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaGithub } from 'react-icons/fa'
import { Heart, ArrowUpRight, Sparkles, Compass, BookOpen } from 'lucide-react'
import { memo } from 'react'

/* ============================================================
   البيانات
   ============================================================ */
const socialLinks = [
  {
    href: 'https://www.facebook.com/ywsf.hjazy.160024',
    icon: FaFacebookF,
    labelAr: 'فيسبوك',
    labelEn: 'Facebook',
    hover: 'hover:text-blue-500 hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-blue-500/20',
  },
  {
    href: 'https://www.instagram.com/hgz1312/',
    icon: FaInstagram,
    labelAr: 'انستجرام',
    labelEn: 'Instagram',
    hover: 'hover:text-pink-500 hover:border-pink-500/50 hover:bg-pink-500/10 hover:shadow-pink-500/20',
  },
  {
    href: 'https://www.linkedin.com/in/yousef-hegazy-a0aa13333/',
    icon: FaLinkedinIn,
    labelAr: 'لينكد إن',
    labelEn: 'LinkedIn',
    hover: 'hover:text-sky-500 hover:border-sky-500/50 hover:bg-sky-500/10 hover:shadow-sky-500/20',
  },
  {
    href: 'https://github.com/yousefhegazy131279',
    icon: FaGithub,
    labelAr: 'جيت هاب',
    labelEn: 'GitHub',
    hover: 'hover:text-purple-500 hover:border-purple-500/50 hover:bg-purple-500/10 hover:shadow-purple-500/20',
  },
]

const quickLinksAr = [
  { href: '/dashboard', labelAr: 'لوحة التحكم', labelEn: 'Dashboard' },
  { href: '/dashboard/planner', labelAr: 'المخطط الذكي', labelEn: 'Planner' },
  { href: '/dashboard/schedule', labelAr: 'الجداول', labelEn: 'Schedules' },
  { href: '/dashboard/workspace', labelAr: 'المهام', labelEn: 'Tasks' },
]

const quickLinksEn = [
  { href: '/dashboard/projects', labelAr: 'المشاريع', labelEn: 'Projects' },
  { href: '/dashboard/analytics', labelAr: 'الإحصائيات', labelEn: 'Analytics' },
  { href: '/dashboard/settings', labelAr: 'الإعدادات', labelEn: 'Settings' },
]

/* ============================================================
   رابط سريع
   ============================================================ */
function QuickLink({
  href,
  label,
  delay = 0,
}: {
  href: string
  label: string
  delay?: number
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
    >
      <Link
        href={href}
        className="group inline-flex items-center gap-2 py-1.5 font-['Cairo'] text-sm text-[var(--text-secondary)] transition-colors hover:text-[#D4AF37]"
      >
        <span className="h-px w-0 bg-[#D4AF37] transition-all duration-300 group-hover:w-4" />
        <span className="transition-transform duration-300 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5">
          {label}
        </span>
      </Link>
    </motion.li>
  )
}

/* ============================================================
   Footer
   ============================================================ */
export const Footer = memo(function Footer() {
  const { t, language } = useLanguage()
  const year = new Date().getFullYear()

  const quickLinksA = quickLinksAr
  const quickLinksB = quickLinksEn

  return (
    <motion.footer
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mt-10 overflow-hidden border-t border-[var(--border-color)] bg-gradient-to-b from-[var(--bg-secondary)]/60 to-[var(--bg-card)]/40 backdrop-blur-xl"
    >
      {/* ===== خط ذهبي متوهج علوي ===== */}
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ===== هالات خلفية ===== */}
      <div className="pointer-events-none absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-[#D4AF37]/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-72 w-72 rounded-full bg-purple-500/8 blur-3xl" />

      {/* ===== المحتوى الرئيسي ===== */}
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12">
          {/* ============ العلامة التجارية + الوصف ============ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-5 lg:col-span-5"
          >
            {/* الشعار + الاسم */}
            <div className="mb-5 flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 320 }}
                className="h-14 w-14 shrink-0"
              >
                <Logo />
              </motion.div>
              <div>
                <h3 className="font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
                  {t('جَدْوَلِي', 'Jadwali')}
                </h3>
                <p className="mt-0.5 inline-flex items-center gap-1.5 font-['Cairo'] text-[11px] text-[#D4AF37]">
                  <Sparkles className="h-3 w-3" />
                  {t('خطط يومك، أنجز مهامك، عش حياتك', 'Plan, achieve, live')}
                </p>
              </div>
            </div>

            {/* الوصف */}
            <p className="mb-6 max-w-md font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)]">
              {t(
                'تطبيق إدارة الوقت والإنتاجية اليومية، مصمم خصيصًا للمستخدم العربي ليجمع بين التخطيط الذكي والالتزام الروحي في مكان واحد.',
                'A daily time-management app designed for Arabic users, blending smart planning with spiritual commitment in one place.'
              )}
            </p>

            {/* ===== أزرار التواصل الاجتماعي ===== */}
            <div className="mb-6">
              <div className="mb-3 font-['Cairo'] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {t('تابعنا على', 'Follow us')}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map(({ href, icon: Icon, labelAr, labelEn, hover }, i) => (
                  <motion.a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 380 }}
                    whileHover={{ y: -4, scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:shadow-lg ${hover}`}
                    aria-label={t(labelAr, labelEn)}
                    title={t(labelAr, labelEn)}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* ===== زر من نحن ===== */}
            <Link href="/about">
              <motion.div
                whileHover={{ scale: 1.02, x: 3 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/5 px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[#D4AF37] shadow-md shadow-[#D4AF37]/10 transition-all duration-300 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:shadow-lg hover:shadow-[#D4AF37]/30"
              >
                <Compass className="h-3.5 w-3.5" />
                {t('تعرّف علينا', 'Learn about us')}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.div>
            </Link>
          </motion.div>

          {/* ============ عمودا الروابط السريعة ============ */}
          <div className="grid grid-cols-2 gap-8 md:col-span-4 md:col-start-7 lg:col-span-4 lg:col-start-8">
            {/* العمود الأول */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <motion.span
                  className="h-4 w-1 rounded-full bg-gradient-to-b from-[#D4AF37] to-transparent"
                  animate={{ height: ['16px', '20px', '16px'] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <h4 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {t('الأساسية', 'Essentials')}
                </h4>
              </div>
              <ul className="space-y-0.5">
                {quickLinksA.map((link, i) => (
                  <QuickLink
                    key={link.href}
                    href={link.href}
                    label={t(link.labelAr, link.labelEn)}
                    delay={0.05 * i}
                  />
                ))}
              </ul>
            </motion.div>

            {/* العمود الثاني */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <motion.span
                  className="h-4 w-1 rounded-full bg-gradient-to-b from-purple-400 to-transparent"
                  animate={{ height: ['16px', '20px', '16px'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <h4 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {t('إضافية', 'More')}
                </h4>
              </div>
              <ul className="space-y-0.5">
                {quickLinksB.map((link, i) => (
                  <QuickLink
                    key={link.href}
                    href={link.href}
                    label={t(link.labelAr, link.labelEn)}
                    delay={0.05 * i}
                  />
                ))}
              </ul>
            </motion.div>
          </div>

          {/* ============ بطاقة الاقتراح ============ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="md:col-span-3 lg:col-span-3"
          >
            <div className="relative h-full overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/8 to-transparent p-4">
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#D4AF37]/15 blur-2xl" />
              <div className="relative">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h4 className="mb-1.5 font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {t('لديك اقتراح؟', 'Have a suggestion?')}
                </h4>
                <p className="mb-4 font-['Cairo'] text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  {t(
                    'رأيك يهمنا — شاركنا فكرة أو ملاحظة لتطوير جَدْوَلِي.',
                    'Your input matters — share an idea or feedback to improve Jadwali.'
                  )}
                </p>
                <Link
                  href="/about#contact"
                  className="group inline-flex items-center gap-1.5 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-colors hover:text-[#E8C84A]"
                >
                  {t('تواصل معنا', 'Contact us')}
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ===== الشريط السفلي ===== */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative border-t border-[var(--border-color)] bg-[var(--bg-card)]/40 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:px-6 md:flex-row">
          {/* حقوق النشر */}
          <div className="flex items-center gap-2 font-['Cairo'] text-xs text-[var(--text-muted)]">
            <span>© {year}</span>
            <span className="font-['Amiri'] text-sm font-bold text-[#D4AF37]">
              {t('جَدْوَلِي', 'Jadwali')}
            </span>
            <span className="hidden sm:inline">
              — {t('جميع الحقوق محفوظة', 'All rights reserved')}
            </span>
          </div>

          {/* الوسط: شارة الإصدار */}
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-3 py-1 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span>{t('الإصدار', 'Version')}</span>
            <span className="font-mono font-bold text-[var(--text-secondary)]">v1.0</span>
          </div>

          {/* صنع بـ ❤️ */}
          <div className="flex items-center gap-1.5 font-['Cairo'] text-xs text-[var(--text-muted)]">
            <span>{t('صُنع بـ', 'Made with')}</span>
            <motion.span
              animate={{ scale: [1, 1.35, 1] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="inline-flex"
            >
              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
            </motion.span>
            <span>{t('بواسطة', 'by')}</span>
            <span className="font-['Amiri'] text-sm font-bold text-[#D4AF37]">
              HGZ
            </span>
          </div>
        </div>
      </motion.div>
    </motion.footer>
  )
})