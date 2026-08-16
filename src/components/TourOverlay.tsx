'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTour } from '@/context/TourContext'
import { tourSteps } from '@/lib/tourSteps'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

function getElementPosition(selector: string) {
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
  const { isOpen, currentStep, nextStep, prevStep, skipTour } = useTour()
  const [position, setPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [fallback, setFallback] = useState(false) // لعرض البطاقة في المنتصف إذا لم يُعثر على العنصر
  const retryTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const step = tourSteps[currentStep]
    let attempts = 0
    const maxAttempts = 10 // 10 * 300ms = 3 ثوانٍ كحد أقصى
    const attemptInterval = 300

    const tryFindElement = () => {
      const pos = getElementPosition(step.selector)
      if (pos) {
        // وجدنا العنصر: مرر إليه واضبط الموضع
        const el = document.querySelector(step.selector)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        setPosition(pos)
        setFallback(false)
      } else {
        attempts++
        if (attempts >= maxAttempts) {
          // لم نجد العنصر: اعرض البطاقة في منتصف الشاشة
          setPosition(null)
          setFallback(true)
        } else {
          // حاول مجددًا
          retryTimer.current = setTimeout(tryFindElement, attemptInterval)
        }
      }
    }

    tryFindElement()

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [isOpen, currentStep])

  if (!isOpen) return null

  const step = tourSteps[currentStep]
  const isLast = currentStep === tourSteps.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] pointer-events-none"
      >
        {/* خلفية معتمة */}
        <div
          className="absolute inset-0 bg-black/85"
          style={{
            clipPath: position
              ? `polygon(0% 0%, 0% 100%, ${position.left}px 100%, ${position.left}px ${position.top}px, ${position.left + position.width}px ${position.top}px, ${position.left + position.width}px ${position.top + position.height}px, ${position.left}px ${position.top + position.height}px, ${position.left}px 100%, 100% 100%, 100% 0%)`
              : undefined,
          }}
        />

        {/* البطاقة التعليمية */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`absolute z-10 pointer-events-auto bg-white text-gray-900 border border-gray-300 rounded-2xl p-6 shadow-2xl max-w-md w-[90%] md:w-96 ${
            fallback
              ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' // في المنتصف إذا لم يوجد العنصر
              : ''
          }`}
          style={
            !fallback && position
              ? {
                  top: position.top - 20,
                  left: position.left + position.width / 2,
                  transform: 'translate(-50%, -100%)',
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xl text-gray-900 font-sans">
              {step.title}
            </h3>
            <button
              onClick={skipTour}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-base text-gray-700 font-sans leading-relaxed">
            {step.description}
          </p>
          <div className="flex items-center justify-between mt-5">
            <span className="text-sm text-gray-500 font-sans">
              {currentStep + 1} / {tourSteps.length}
            </span>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors font-sans flex items-center gap-1"
                >
                  <ChevronRight className="w-5 h-5" />
                  السابق
                </button>
              )}
              <button
                onClick={nextStep}
                className="px-5 py-2 rounded-xl bg-[#D4AF37] text-gray-900 font-bold hover:shadow-lg hover:shadow-[#D4AF37]/40 transition-all font-sans flex items-center gap-1"
              >
                {isLast ? 'إنهاء' : 'التالي'}
                {!isLast && <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}