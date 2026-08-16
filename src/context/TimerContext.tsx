'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Phase = {
  type: 'work' | 'shortBreak' | 'longBreak'
  duration: number
  taskId?: string
  taskName?: string
  sessionNumber?: number
  startTime: Date
  endTime: Date
}

type TimerState = {
  isRunning: boolean
  isPaused: boolean
  timeLeft: number
  currentPhaseIndex: number | null
  phases: Phase[]
  scheduleId: string | null
  scheduleTitle: string | null
  taskName: string | null
  sessionNumber: number | null
  totalPhases: number
  completedPhases: number
  isVisible: boolean
  endTime: string | null
}

const defaultState: TimerState = {
  isRunning: false,
  isPaused: false,
  timeLeft: 0,
  currentPhaseIndex: null,
  phases: [],
  scheduleId: null,
  scheduleTitle: null,
  taskName: null,
  sessionNumber: null,
  totalPhases: 0,
  completedPhases: 0,
  isVisible: false,
  endTime: null,
}

const STORAGE_KEY = 'jadwali_timer_state'

function loadInitialState(): TimerState {
  if (typeof window === 'undefined') return defaultState
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.phases && Array.isArray(parsed.phases)) {
        parsed.phases = parsed.phases.map((p: any) => ({
          ...p,
          startTime: new Date(p.startTime),
          endTime: new Date(p.endTime),
        }))
      }
      return { ...defaultState, ...parsed }
    }
  } catch (_) {}
  return defaultState
}

type TimerContextType = {
  timerState: TimerState
  startTimer: (scheduleId: string, scheduleTitle: string, phases: Phase[], startIndex: number) => void
  pauseTimer: () => void
  resumeTimer: () => void
  completePhase: () => void
  resetTimer: () => void
  setTimerVisibility: (visible: boolean) => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>(loadInitialState)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const savedStateRef = useRef<TimerState>(timerState)

  // حفظ الحالة في localStorage عند أي تغيير
  useEffect(() => {
    savedStateRef.current = timerState
    try {
      const toSave = {
        ...timerState,
        phases: timerState.phases.map(p => ({
          ...p,
          startTime: p.startTime instanceof Date ? p.startTime.toISOString() : p.startTime,
          endTime: p.endTime instanceof Date ? p.endTime.toISOString() : p.endTime,
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (_) {}
  }, [timerState])

  // عند التحميل، إذا كان المؤقت يعمل أو متوقفًا مؤقتًا، احسب الوقت المتبقي
  useEffect(() => {
    const state = savedStateRef.current
    if (state.isRunning && !state.isPaused && state.endTime) {
      const calculateTimeLeft = () => {
        const now = Date.now()
        const end = new Date(state.endTime).getTime()
        const diff = Math.max(0, Math.floor((end - now) / 1000))
        if (diff <= 0) {
          handlePhaseComplete()
        } else {
          setTimerState(prev => ({ ...prev, timeLeft: diff }))
        }
      }
      calculateTimeLeft()
      startInterval()
    }
  }, [])

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev
        const newTime = prev.timeLeft - 1
        if (newTime <= 0) {
          handlePhaseComplete()
          return { ...prev, timeLeft: 0 }
        }
        return { ...prev, timeLeft: newTime }
      })
    }, 1000)
  }, [])

  const handlePhaseComplete = useCallback(() => {
    setTimerState(prev => {
      if (prev.currentPhaseIndex === null) return prev
      const nextIndex = prev.currentPhaseIndex + 1
      const completedPhases = prev.completedPhases + 1
      if (nextIndex < prev.phases.length) {
        const nextPhase = prev.phases[nextIndex]
        const now = Date.now()
        const endTime = new Date(now + nextPhase.duration * 1000).toISOString()
        toast.info(`🔄 بدأت ${nextPhase.type === 'work' ? 'جلسة' : nextPhase.type === 'shortBreak' ? 'راحة قصيرة' : 'راحة طويلة'}`)
        return {
          ...prev,
          currentPhaseIndex: nextIndex,
          timeLeft: nextPhase.duration,
          endTime,
          completedPhases,
          taskName: nextPhase.taskName || null,
          sessionNumber: nextPhase.sessionNumber || null,
        }
      } else {
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          currentPhaseIndex: null,
          timeLeft: 0,
          endTime: null,
          completedPhases: prev.phases.length,
        }
      }
    })
  }, [])

  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      startInterval()
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState.isRunning, timerState.isPaused, startInterval])

  const startTimer = useCallback((scheduleId: string, scheduleTitle: string, phases: Phase[], startIndex: number) => {
    const phase = phases[startIndex]
    if (!phase) return
    const now = Date.now()
    const endTime = new Date(now + phase.duration * 1000).toISOString()
    const newState: TimerState = {
      isRunning: true,
      isPaused: false,
      timeLeft: phase.duration,
      currentPhaseIndex: startIndex,
      phases: phases.map(p => ({
        ...p,
        startTime: new Date(p.startTime),
        endTime: new Date(p.endTime),
      })),
      scheduleId,
      scheduleTitle,
      taskName: phase.taskName || null,
      sessionNumber: phase.sessionNumber || null,
      totalPhases: phases.length,
      completedPhases: 0,
      isVisible: true,
      endTime,
    }
    setTimerState(newState)
    try {
      const toSave = {
        ...newState,
        phases: newState.phases.map(p => ({
          ...p,
          startTime: p.startTime.toISOString(),
          endTime: p.endTime.toISOString(),
        })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch (_) {}
  }, [])

  const pauseTimer = useCallback(() => {
    setTimerState(prev => {
      if (!prev.isRunning) return prev
      return { ...prev, isPaused: true, isRunning: false }
    })
  }, [])

  const resumeTimer = useCallback(() => {
    setTimerState(prev => {
      if (!prev.isPaused) return prev
      const now = Date.now()
      const endTime = new Date(now + prev.timeLeft * 1000).toISOString()
      return { ...prev, isRunning: true, isPaused: false, endTime }
    })
  }, [])

  const completePhase = useCallback(() => {
    handlePhaseComplete()
  }, [handlePhaseComplete])

  const resetTimer = useCallback(() => {
    setTimerState(defaultState)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (_) {}
  }, [])

  const setTimerVisibility = useCallback((visible: boolean) => {
    setTimerState(prev => ({ ...prev, isVisible: visible }))
  }, [])

  // ✅ مراقبة حذف الجداول لإيقاف المؤقت (بدون فلتر)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('timer-schedule-deletion')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'schedules' },
        (payload) => {
          const deletedId = payload.old?.id
          if (deletedId && timerState.scheduleId === deletedId) {
            resetTimer()
            toast.info('🗑️ تم حذف الجدول المرتبط بالمؤقت، تم إيقاف المؤقت.')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [timerState.scheduleId, resetTimer])

  return (
    <TimerContext.Provider
      value={{
        timerState,
        startTimer,
        pauseTimer,
        resumeTimer,
        completePhase,
        resetTimer,
        setTimerVisibility,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider')
  }
  return context
}