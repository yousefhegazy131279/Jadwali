'use client'

import { useEffect, useState, useCallback, useLayoutEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTour } from '@/context/TourContext'
import { useLanguage } from '@/context/LanguageContext'
import { tourSteps } from '@/lib/tourSteps'
import {
  X, ChevronRight, ChevronLeft, Lock, Home, Sparkles, Calendar,
  ListChecks, FolderOpen, Users, BarChart3, Settings, CheckCircle2,
  SkipForward, MousePointerClick, Keyboard, AlertCircle,
} from 'lucide-react'

/* ============================================================
   خريطة الأيقونات
   ============================================================ */
const ICONS: Record<string, typeof Home> = {
  home: Home,
  sparkles: Sparkles,
  calendar: Calendar,
  tasks: ListChecks,
  folder: FolderOpen,
  users: Users,
  chart: BarChart3,
  settings: Settings,
}

/* ============================================================
   قراءة موضع العنصر
   ============================================================ */
function getElementPosition(selector: string) {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom,
    right: rect.right,
  }
}

/* ============================================================
   المكوّن الرئيسي
   ============================================================ */
export default function TourOverlay() {
  const { t, language } = useLanguage()
  const { isOpen, currentStep, nextStep, prevStep, skipTour, isActionDone } = useTour()

  const [position, setPosition] = useState<ReturnType<typeof getElementPosition>>(null)
  const [fallback, setFallback] = useState(false)
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'center'>('bottom')
  const [cardReady, setCardReady] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const step = isOpen ? tourSteps[currentStep] : undefined
  const Icon = step?.icon ? ICONS[step.icon] : MousePointerClick
  const totalSteps = tourSteps.length
  const isLast = currentStep === totalSteps - 1
  const isFirst = currentStep === 0
  const progress = ((currentStep + 1) / totalSteps) * 100

  /* ====== حساب الموضع ====== */
  const updatePosition = useCallback(() => {
    if (!isOpen || !step) return
    const target = document.querySelector(step.selector)
    if (!target) {
      setFallback(true)
      setPosition(null)
      setPlacement('center')
      return
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    const pos = getElementPosition(step.selector)
    if (!pos) return
    setPosition(pos)
    setFallback(false)

    // قرار الموضع: أسفل إن كان هناك متسع، وإلا فوق
    const vh = window.innerHeight
    const spaceBelow = vh - pos.bottom
    const spaceAbove = pos.top
    if (spaceBelow >= 320 || spaceBelow >= spaceAbove) setPlacement('bottom')
    else setPlacement('top')
  }, [isOpen, step])

  /* ====== التحديث ====== */
  useEffect(() => {
    if (!isOpen || !step) return
    updatePosition()
    const t1 = setTimeout(updatePosition, 300)
    const t2 = setTimeout(updatePosition, 700)
    const interval = window.setInterval(() => {
      if (document.querySelector(step.selector)) {
        updatePosition()
        clearInterval(interval)
      }
    }, 200)

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearInterval(interval)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition, isOpen, step])

  /* ====== تأثير النبض على العنصر ====== */
  useEffect(() => {
    if (!isOpen || !step) return
    const target = document.querySelector(step.selector)
    if (target) {
      target.classList.add('tour-highlight')
      return () => target.classList.remove('tour-highlight')
    }
  }, [isOpen, step, currentStep])

  /* ====== اهتزاز بسيط عند تغيير الخطوة ====== */
  useEffect(() => {
    setCardReady(false)
    const t = setTimeout(() => setCardReady(true), 40)
    return () => clearTimeout(t)
  }, [currentStep])

  /* ====== اختصارات لوحة المفاتيح ====== */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        skipTour()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        // في RTL، السهم الأيمن = السابق
        if (language === 'ar') prevStep()
        else nextStep()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (language === 'ar') nextStep()
        else prevStep()
      } else if (e.key === 'Enter' && !isNextDisabled) {
        e.preventDefault()
        nextStep()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, nextStep, prevStep, skipTour, language])

  /* ====== إخفاء الجسم من التمرير أثناء الجولة ====== */
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen || !step) return null

  const isNextDisabled = step.required && !isActionDone && !fallback

  /* ====== موضع البطاقة ====== */
  const cardWidth = 400
  const cardHeightEstimate = 280
  const gap = 20

  let cardStyle: React.CSSProperties = {}

  if (fallback || placement === 'center' || !position) {
    cardStyle = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else if (window.innerWidth >= 768) {
    // سطح المكتب: نحدد موضعاً ذكياً
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (placement === 'bottom') {
      const top = position.bottom + gap
      const left = Math.max(
        16,
        Math.min(position.left + position.width / 2 - cardWidth / 2, vw - cardWidth - 16)
      )
      cardStyle = { top, left, width: cardWidth }
    } else {
      const top = Math.max(16, position.top - cardHeightEstimate - gap)
      const left = Math.max(
        16,
        Math.min(position.left + position.width / 2 - cardWidth / 2, vw - cardWidth - 16)
      )
      cardStyle = { top, left, width: cardWidth }
    }
  }
  // على الجوال: نستخدم fixed bottom

  /* ============================================================
     العرض
     ============================================================ */
  return (
    <div
      className="fixed inset-0 z-[2000]"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={t(step.title)}
    >
      {/* ===== Spotlight على العنصر ===== */}
      <AnimatePresence>
        {position && (
          <motion.div
            key={`spot-${currentStep}-${position.top}-${position.left}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed"
            style={{
              top: Math.max(0, position.top - 8),
              left: Math.max(0, position.left - 8),
              width: Math.min(window.innerWidth, position.width + 16),
              height: Math.min(window.innerHeight, position.height + 16),
              borderRadius: 16,
              boxShadow:
                '0 0 0 9999px rgba(5, 8, 15, 0.78), 0 0 40px 6px rgba(212, 175, 55, 0.45), inset 0 0 0 2px rgba(212, 175, 55, 0.85)',
            }}
          >
            {/* نبض متوهج حول العنصر */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(212,175,55,0.5)',
                  '0 0 0 14px rgba(212,175,55,0)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-2xl"
            />
          </motion.div>
        )}

        {/* ===== شاشة كاملة معتمة عند غياب العنصر ===== */}
        {!position && (
          <motion.div
            key="full-mask"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgba(5,8,15,0.85)] backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ===== البطاقة ===== */}
      <motion.div
        ref={cardRef}
        key={`card-${currentStep}`}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: cardReady ? 1 : 0, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="pointer-events-auto fixed z-[2010] max-md:!inset-x-3 max-md:!bottom-3 max-md:!top-auto max-md:!left-auto max-md:!w-auto max-md:!max-w-none"
        style={cardStyle}
      >
        <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[var(--bg-card)] shadow-2xl shadow-black/60 backdrop-blur-2xl">
          {/* شريط تقدم أعلى البطاقة */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white/5">
            <motion.div
              className="h-full bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#D4AF37]"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* هالة علوية */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#D4AF37]/15 blur-3xl" />

          <div className="relative p-5 sm:p-6">
            {/* الرأس */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.5, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30"
                >
                  <Icon className="h-5 w-5" strokeWidth={2.5} />
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-secondary)] font-mono text-[9px] font-bold text-[#D4AF37]">
                    {currentStep + 1}
                  </div>
                </motion.div>

                <div className="min-w-0">
                  {step.category && (
                    <div className="font-['Cairo'] text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                      {t(step.category, step.category)}
                    </div>
                  )}
                  <h3 className="truncate font-['Amiri'] text-lg font-bold text-[var(--text-primary)] sm:text-xl">
                    {t(step.title)}
                  </h3>
                </div>
              </div>

              <button
                onClick={skipTour}
                aria-label={t('إغلاق الجولة', 'Close tour')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* الوصف */}
            <p className="font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)]">
              {t(step.description)}
            </p>

            {/* تنبيه الإجراء المطلوب */}
            {isNextDisabled && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2"
              >
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                <span className="font-['Cairo'] text-xs text-amber-300">
                  {t('قم بتنفيذ الإجراء المطلوب أولاً', 'Complete the required action first')}
                </span>
              </motion.div>
            )}

            {/* خطأ العنصر غير الموجود */}
            {fallback && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                <span className="font-['Cairo'] text-xs text-sky-300">
                  {t(
                    'العنصر غير ظاهر الآن — يمكنك المتابعة.',
                    'Element not visible now — you can continue.'
                  )}
                </span>
              </motion.div>
            )}

            {/* نقاط التقدم */}
            <div className="mt-5 flex items-center justify-center gap-1.5">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i < currentStep) {
                      // رجوع لخطوات سابقة
                      const diff = currentStep - i
                      for (let k = 0; k < diff; k++) prevStep()
                    } else if (i > currentStep) {
                      // التقدم فقط للخطوات المسموح بها
                      const diff = i - currentStep
                      for (let k = 0; k < diff; k++) {
                        setTimeout(() => nextStep(), k * 100)
                      }
                    }
                  }}
                  aria-label={t(`اذهب للخطوة ${i + 1}`, `Go to step ${i + 1}`)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-6 bg-[#D4AF37]'
                      : i < currentStep
                        ? 'w-1.5 bg-[#D4AF37]/50 hover:bg-[#D4AF37]'
                        : 'w-1.5 bg-white/10 hover:bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* الفوتر */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                onClick={skipTour}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-['Cairo'] text-xs font-bold text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <SkipForward className="h-3.5 w-3.5" />
                {t('تخطي الجولة', 'Skip tour')}
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={prevStep}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-0 ltr:rotate-180" />
                    {t('السابق', 'Back')}
                  </button>
                )}

                <button
                  onClick={nextStep}
                  disabled={isNextDisabled}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-4 font-['Cairo'] text-xs font-bold shadow-md transition-all ${
                    isNextDisabled
                      ? 'cursor-not-allowed bg-white/5 text-[var(--text-muted)]'
                      : isLast
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30 hover:shadow-lg'
                        : 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/40'
                  }`}
                >
                  {isNextDisabled ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      {t('بانتظار الإجراء', 'Awaiting')}
                    </>
                  ) : isLast ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('إنهاء الجولة', 'Finish')}
                    </>
                  ) : (
                    <>
                      {t('التالي', 'Next')}
                      <ChevronLeft className="h-3.5 w-3.5 ltr:rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* شريط اختصارات لوحة المفاتيح — سطح المكتب فقط */}
            <div className="mt-4 hidden items-center justify-center gap-3 border-t border-[var(--border-color)] pt-3 font-['Cairo'] text-[10px] text-[var(--text-muted)] sm:flex">
              <span className="inline-flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                <kbd className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[9px]">
                  Enter
                </kbd>
                {t('التالي', 'Next')}
              </span>
              <span className="text-white/10">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[9px]">
                  Esc
                </kbd>
                {t('إغلاق', 'Close')}
              </span>
              <span className="text-white/10">•</span>
              <span>
                {currentStep + 1} / {totalSteps}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}