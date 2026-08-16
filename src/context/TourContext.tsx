'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { tourSteps } from '@/lib/tourSteps'

type TourContextType = {
  isOpen: boolean
  currentStep: number
  startTour: () => void
  nextStep: () => void
  prevStep: () => void
  skipTour: () => void
  endTour: () => void
}

const TourContext = createContext<TourContextType | undefined>(undefined)

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // التنقل عند تغيّر الخطوة (خارج نطاق التحديث)
  useEffect(() => {
    if (isOpen && tourSteps[currentStep]) {
      router.push(tourSteps[currentStep].path)
    }
  }, [currentStep, isOpen, router])

  const startTour = () => {
    setCurrentStep(0)
    setIsOpen(true)
  }

  const nextStep = () => {
    if (currentStep === tourSteps.length - 1) {
      endTour()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  const skipTour = () => {
    setIsOpen(false)
    setCurrentStep(0)
  }

  const endTour = () => {
    setIsOpen(false)
    setCurrentStep(0)
  }

  return (
    <TourContext.Provider value={{ isOpen, currentStep, startTour, nextStep, prevStep, skipTour, endTour }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) throw new Error('useTour must be used within TourProvider')
  return context
}