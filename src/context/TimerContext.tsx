'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { completedPhaseCount, remainingSeconds, taskSessionNumber } from '@/lib/progress'

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
  isRunning: boolean; isPaused: boolean; timeLeft: number; currentPhaseIndex: number | null
  phases: Phase[]; scheduleId: string | null; scheduleTitle: string | null
  taskName: string | null; sessionNumber: number | null; totalPhases: number
  completedPhases: number; isVisible: boolean; endTime: string | null
}
const defaultState: TimerState = {
  isRunning: false, isPaused: false, timeLeft: 0, currentPhaseIndex: null, phases: [],
  scheduleId: null, scheduleTitle: null, taskName: null, sessionNumber: null,
  totalPhases: 0, completedPhases: 0, isVisible: false, endTime: null,
}
type TimerContextType = {
  timerState: TimerState
  startTimer: (scheduleId: string, title: string, phases: Phase[], index: number) => void
  pauseTimer: () => void; resumeTimer: () => void; completePhase: () => void
  resetTimer: () => void; setTimerVisibility: (visible: boolean) => void
}
const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const { t: tr, language } = useLanguage()

  const { user } = useSupabase()
  const [timerState, setTimerState] = useState<TimerState>(defaultState)
  const stateRef = useRef(defaultState)
  const busy = useRef(false)
  const account = useRef<string | null>(null)
  const publish = useCallback((state: TimerState) => {
    stateRef.current = state
    setTimerState(state)
    try { if (account.current) localStorage.setItem('jadwali_timer_v2:' + account.current, JSON.stringify(state)) } catch { /* Timer remains usable if browser storage is full. */ }
  }, [])
  const resetTimer = useCallback(() => publish({ ...defaultState }), [publish])

  useEffect(() => {
    account.current = user?.id ?? null
    let restored = { ...defaultState }
    try {
      const saved = account.current && localStorage.getItem('jadwali_timer_v2:' + account.current)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.phases) && parsed.phases.every((p: Phase) => Number.isFinite(p.duration) && p.duration > 0)) {
          restored = { ...defaultState, ...parsed, phases: parsed.phases.map((p: Phase) => ({ ...p, startTime: new Date(p.startTime), endTime: new Date(p.endTime) })) }
          if (restored.isRunning) restored.timeLeft = remainingSeconds(restored.endTime, restored.timeLeft)
        }
      }
    } catch { /* A corrupt local cache must not prevent login. */ }
    publish(restored)
  }, [user?.id, publish])

  const completePhase = useCallback(async () => {
    const previous = stateRef.current
    if (busy.current || previous.currentPhaseIndex === null || previous.timeLeft > 0) return
    const index = previous.currentPhaseIndex
    const phase = previous.phases[index]
    if (!phase) return
    busy.current = true
    const userId = account.current
    try {
      if (phase.type === 'work' && phase.taskId) {
        const { error } = await createClient().rpc('record_work_session', {
          p_task_id: phase.taskId, p_session_number: taskSessionNumber(previous.phases, index),
        })
        if (error) throw error
      }
      if (account.current !== userId || stateRef.current.scheduleId !== previous.scheduleId || stateRef.current.currentPhaseIndex !== index) return
      const next = previous.phases[index + 1]
      publish(next ? {
        ...stateRef.current, currentPhaseIndex: index + 1, completedPhases: index + 1,
        taskName: next.taskName ?? null, sessionNumber: next.sessionNumber ?? null,
        timeLeft: next.duration,
        endTime: stateRef.current.isRunning ? new Date(Date.now() + next.duration * 1000).toISOString() : null,
      } : { ...previous, isRunning: false, isPaused: false, currentPhaseIndex: null,
        timeLeft: 0, endTime: null, completedPhases: previous.phases.length, taskName: null, sessionNumber: null })
      window.dispatchEvent(new Event('jadwali-progress'))
      toast.success(next ? tr('✅ اكتملت الجلسة') : tr('🎉 اكتملت جميع الجلسات!'))
    } catch {
      if (account.current === userId && stateRef.current.scheduleId === previous.scheduleId) {
        publish({ ...stateRef.current, isRunning: false, isPaused: true, endTime: null })
        toast.error(tr('تعذر حفظ الجلسة. تحقق من الاتصال ثم اضغط استئناف لإعادة المحاولة.'))
      }
    } finally { busy.current = false }
  }, [publish])

  useEffect(() => {
    if (!timerState.isRunning) return
    const tick = () => {
      const state = stateRef.current
      if (!state.isRunning) return
      const timeLeft = remainingSeconds(state.endTime, state.timeLeft)
      if (timeLeft !== state.timeLeft) publish({ ...state, timeLeft })
      if (timeLeft === 0) void completePhase()
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [timerState.isRunning, completePhase, publish])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const reconcile = async () => {
      const before = stateRef.current
      if (!before.scheduleId || busy.current) return
      const { data: schedule, error: accessError } = await supabase.from('schedules').select('id').eq('id', before.scheduleId).maybeSingle()
      if (accessError) return
      if (stateRef.current.scheduleId !== before.scheduleId) return
      if (!schedule) { resetTimer(); return }
      const { data, error } = await supabase.from('tasks').select('id,completed_sessions').eq('schedule_id', before.scheduleId)
      if (error || !data || stateRef.current.scheduleId !== before.scheduleId || busy.current) return
      const state = stateRef.current
      const prefix = completedPhaseCount(state.phases, data)
      if (prefix <= state.completedPhases) return
      const next = state.phases[prefix]
      publish({ ...state, completedPhases: prefix, currentPhaseIndex: next ? prefix : null,
        isRunning: false, isPaused: !!next, timeLeft: next?.duration ?? 0, endTime: null,
        taskName: next?.taskName ?? null, sessionNumber: next?.sessionNumber ?? null })
    }
    void reconcile()
    window.addEventListener('focus', reconcile)
    const channel = supabase.channel('timer-progress-' + user.id).on('postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' }, reconcile).subscribe()
    return () => { window.removeEventListener('focus', reconcile); void supabase.removeChannel(channel) }
  }, [user?.id, resetTimer, publish])

  const startTimer = useCallback((scheduleId: string, scheduleTitle: string, phases: Phase[], index: number) => {
    const phase = phases[index]
    if (!phase || !account.current || busy.current) return
    if ((stateRef.current.isRunning || stateRef.current.isPaused) && stateRef.current.scheduleId !== scheduleId) {
      toast.error(tr('أوقف مؤقت الجدول الحالي أولاً')); return
    }
    publish({ ...defaultState, scheduleId, scheduleTitle, phases,
      isRunning: true, isVisible: true, timeLeft: phase.duration, currentPhaseIndex: index,
      completedPhases: index, totalPhases: phases.length, taskName: phase.taskName ?? null,
      sessionNumber: phase.sessionNumber ?? null, endTime: new Date(Date.now() + phase.duration * 1000).toISOString() })
  }, [publish])
  const pauseTimer = useCallback(() => {
    const state = stateRef.current
    if (state.isRunning) publish({ ...state, isRunning: false, isPaused: true,
      timeLeft: remainingSeconds(state.endTime, state.timeLeft), endTime: null })
  }, [publish])
  const resumeTimer = useCallback(() => {
    const state = stateRef.current
    if (state.isPaused) publish({ ...state, isRunning: true, isPaused: false,
      endTime: new Date(Date.now() + state.timeLeft * 1000).toISOString() })
  }, [publish])
  const setTimerVisibility = useCallback((visible: boolean) => publish({ ...stateRef.current, isVisible: visible }), [publish])
  return <TimerContext.Provider value={{ timerState, startTimer, pauseTimer, resumeTimer, completePhase, resetTimer, setTimerVisibility }}>{children}</TimerContext.Provider>
}
export function useTimer() {
  const context = useContext(TimerContext)
  if (!context) throw new Error('useTimer must be used within a TimerProvider')
  return context
}
