'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Phase = {
  type: 'work' | 'shortBreak' | 'longBreak'
  duration: number // بالثواني
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

function playAlertSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const playTone = (freq: number, start: number, duration: number, volume = 0.3) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    playTone(880, 0, 0.3)
    playTone(1100, 0.3, 0.4)
    setTimeout(() => playTone(1320, 0, 0.5, 0.35), 800)
  } catch (e) {
    console.error('فشل تشغيل الصوت:', e)
  }
}

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
  const phaseCompletedRef = useRef(false) // ✅ منع التكرار عند الوصول إلى 0

  // حفظ الحالة في localStorage عند أي تغيير
  useEffect(() => {
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

  // ✅ دالة إكمال المرحلة الحالية، تستخدم عند انتهاء الوقت أو الضغط على إنهاء
  const handlePhaseComplete = useCallback(() => {
    setTimerState(prev => {
      if (prev.currentPhaseIndex === null) return prev

      const currentIndex = prev.currentPhaseIndex
      const currentPhase = prev.phases[currentIndex]
      const nextIndex = currentIndex + 1
      const completed = prev.completedPhases + 1

      // تشغيل الصوت وإرسال الإشعار
      playAlertSound()
      if (currentPhase?.type === 'work') {
        toast.success('✅ اكتملت جلسة عمل!')
      } else if (currentPhase?.type === 'shortBreak') {
        toast.info('☕ انتهت الراحة القصيرة')
      } else if (currentPhase?.type === 'longBreak') {
        toast.info('🛌 انتهت الراحة الطويلة')
      }

      if (nextIndex < prev.phases.length) {
        const nextPhase = prev.phases[nextIndex]
        const now = Date.now()
        const endTime = new Date(now + nextPhase.duration * 1000).toISOString()
        return {
          ...prev,
          currentPhaseIndex: nextIndex,
          timeLeft: nextPhase.duration,
          endTime,
          completedPhases: completed,
          taskName: nextPhase.taskName || null,
          sessionNumber: nextPhase.sessionNumber || null,
        }
      } else {
        toast.success('🎉 اكتملت جميع الجلسات!')
        return {
          ...prev,
          isRunning: false,
          isPaused: false,
          currentPhaseIndex: null,
          timeLeft: 0,
          endTime: null,
          completedPhases: prev.phases.length,
          taskName: null,
          sessionNumber: null,
        }
      }
    })
  }, [])

  // ✅ مراقبة وصول timeLeft إلى 0 لاستدعاء handlePhaseComplete مرة واحدة
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused && timerState.timeLeft === 0) {
      if (!phaseCompletedRef.current) {
        phaseCompletedRef.current = true
        handlePhaseComplete()
      }
    } else {
      phaseCompletedRef.current = false
    }
  }, [timerState.timeLeft, timerState.isRunning, timerState.isPaused, handlePhaseComplete])

  // ✅ بدء الفاصل الزمني للعد التنازلي
  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setTimerState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev
        if (prev.timeLeft > 0) {
          return { ...prev, timeLeft: prev.timeLeft - 1 }
        }
        return prev // يترك الباقي للمراقب useEffect
      })
    }, 1000)
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

  // عند التحميل، إذا كان المؤقت يعمل، احسب الوقت المتبقي
  useEffect(() => {
    const state = loadInitialState()
    if (state.isRunning && !state.isPaused && state.endTime) {
      const now = Date.now()
      const end = new Date(state.endTime).getTime()
      const diff = Math.max(0, Math.floor((end - now) / 1000))
      setTimerState(prev => ({ ...prev, timeLeft: diff }))
    }
  }, [])

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