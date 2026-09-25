'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { tourSteps } from '@/lib/tourSteps'

type TourContextType = {
  isOpen: boolean
  currentStep: number
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  markActionDone: () => void
  isActionDone: boolean
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const { t: tr, language } = useLanguage()

  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isActionDone, setIsActionDone] = useState(false)

  // التوجيه عند تغيّر الخطوة
  useEffect(() => {
    if (isOpen && tourSteps[currentStep] && !tourSteps[currentStep].skipNavigation) {
      router.push(tourSteps[currentStep].path)
    }
    if (isOpen && currentStep >= tourSteps.length) {
      setIsOpen(false)
    }
  }, [currentStep, isOpen, router])

  // الانتقال التلقائي عند الوصول لمسار كامل
  useEffect(() => {
    if (!isOpen) return
    const step = tourSteps[currentStep]
    if (step?.autoNextPath && pathname === step.autoNextPath) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, tourSteps.length))
        setIsActionDone(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, isOpen, currentStep])

  // الانتقال التلقائي عند الوصول لبادئة مسار
  useEffect(() => {
    if (!isOpen) return
    const step = tourSteps[currentStep]
    if (step?.autoNextPathPrefix && pathname.startsWith(step.autoNextPathPrefix)) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, tourSteps.length))
        setIsActionDone(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [pathname, isOpen, currentStep])

  const startTour = () => {
    setCurrentStep(0)
    setIsOpen(true)
    setIsActionDone(false)
  }

  const nextStep = useCallback(() => {
    const step = tourSteps[currentStep]
    if (step?.required && !isActionDone && document.querySelector(step.selector)) {
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, tourSteps.length))
    setIsActionDone(false)
  }, [currentStep, isActionDone])

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
    setIsActionDone(false)
  }, [])

  const skipTour = () => {
    setIsOpen(false)
    setCurrentStep(0)
    setIsActionDone(false)
  }

  const markActionDone = () => {
    setIsActionDone(true)
  }

  // مراقبة تفاعل المستخدم مع العنصر المستهدف
  useEffect(() => {
    if (!isOpen) return
    const step = tourSteps[currentStep]
    if (!step || step.action === 'wait' || !step.actionTarget) return

    const eventType = step.action === 'click' ? 'click' : step.action === 'input' ? 'input' : 'change'

    const handleAction = (e: Event) => {
      const targetEl = e.target as HTMLElement
      if (targetEl.closest(step.actionTarget!)) {
        markActionDone()
      }
    }

    document.addEventListener(eventType, handleAction, true)

    return () => {
      document.removeEventListener(eventType, handleAction, true)
    }
  }, [isOpen, currentStep, markActionDone])

  return (
    <TourContext.Provider
      value={{ isOpen, currentStep, startTour, nextStep, prevStep, skipTour, markActionDone, isActionDone }}
    >
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) throw new Error('useTour must be used within TourProvider')
  return context
}