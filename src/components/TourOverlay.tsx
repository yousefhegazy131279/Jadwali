'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTour } from '@/context/TourContext'
import { tourSteps } from '@/lib/tourSteps'
import { X, ChevronRight, ChevronLeft, Lock } from 'lucide-react'

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
  }
}

export default function TourOverlay() {
  const { t: tr, language } = useLanguage()

  const { isOpen, currentStep, nextStep, prevStep, skipTour, isActionDone } = useTour()
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [fallback, setFallback] = useState(false)
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'center'>('top')

  // ✅ فحص مبكر: إذا كانت الجولة مغلقة أو الخطوة غير موجودة، لا نعرض شيئًا
  const step = isOpen ? tourSteps[currentStep] : undefined

  const updatePosition = useCallback(() => {
    if (!isOpen || !step) return
    const target = document.querySelector(step.selector)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      const pos = getElementPosition(step.selector)
      if (!pos) return
      setPosition(pos)
      setFallback(false)

      const elementCenter = pos.top + pos.height / 2
      const windowCenter = window.innerHeight / 2
      setPlacement(elementCenter < windowCenter ? 'bottom' : 'top')
    } else {
      setFallback(true)
      setPosition(null)
      setPlacement('center')
    }
  }, [isOpen, step])

  useEffect(() => {
    if (!isOpen || !step) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    const timer = setTimeout(updatePosition, 500)
    const retry = window.setInterval(() => {
      if (document.querySelector(step.selector)) {
        updatePosition()
        clearInterval(retry)
      }
    }, 250)
    return () => {
      window.removeEventListener('resize', updatePosition)
      clearTimeout(timer)
      clearInterval(retry)
    }
  }, [updatePosition, isOpen, step])

  useEffect(() => {
    if (!isOpen || !step) return
    const target = document.querySelector(step.selector)
    if (target) {
      target.classList.add('tour-highlight')
      return () => target.classList.remove('tour-highlight')
    }
  }, [isOpen, step])

  // ✅ إذا كانت الجولة مغلقة أو لا توجد خطوة، لا نعرض الطبقة
  if (!isOpen || !step) return null

  const isLast = currentStep === tourSteps.length - 1
  const isNextDisabled = step.required && !isActionDone && !fallback

  let cardStyle: React.CSSProperties = {}
  if (fallback || placement === 'center') {
    cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
  } else if (position) {
    if (placement === 'top') {
      cardStyle = {
        top: position.top - 20,
        left: position.left + position.width / 2,
        transform: 'translate(-50%, -100%)',
      }
    } else {
      cardStyle = {
        top: position.top + position.height + 20,
        left: position.left + position.width / 2,
        transform: 'translate(-50%, 0)',
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[2000] pointer-events-none"
    >
      {/* إطار التوهج حول العنصر المستهدف */}
      {position && (
        <div
          className="absolute border-2 border-[#D4AF37] rounded-lg pointer-events-none"
          style={{
            top: position.top - 4,
            left: position.left - 4,
            width: position.width + 8,
            height: position.height + 8,
            boxShadow: '0 0 30px rgba(212,175,55,0.9)',
          }}
        />
      )}

      {/* بطاقة الشرح - الوحيدة القابلة للنقر */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="false"
        aria-label={tr(step.title)}
        className="absolute z-10 pointer-events-auto bg-white text-gray-900 border border-gray-300 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-md w-[90%] md:w-96 max-md:!left-3 max-md:!right-3 max-md:!top-auto max-md:!bottom-4 max-md:!w-auto max-md:!max-w-none max-md:!translate-x-0 max-md:!translate-y-0"
        style={cardStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-xl">{tr(step.title)}</h3>
          <button onClick={skipTour} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-base leading-relaxed">{tr(step.description)}</p>

        {isNextDisabled && (
          <p className="mt-3 text-sm text-amber-600 bg-amber-50 p-2 rounded-lg flex items-center gap-1">
            <Lock className="w-4 h-4" /> {tr(" قم بتنفيذ الإجراء المطلوب أولًا ")}</p>
        )}

        <div className="flex items-center justify-between mt-5">
          <span className="text-sm text-gray-500">{currentStep + 1} / {tourSteps.length}</span>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button onClick={prevStep} className="px-4 py-2 rounded-xl bg-gray-200">
                {tr(" السابق ")}</button>
            )}
            <button
              onClick={nextStep}
              disabled={isNextDisabled}
              className={`px-5 py-2 rounded-xl font-bold flex items-center gap-1 ${
                isNextDisabled
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#D4AF37] text-gray-900 hover:shadow-lg'
              }`}
            >
              {isNextDisabled ? <Lock className="w-4 h-4" /> : isLast ? tr('إنهاء') : tr('التالي')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
