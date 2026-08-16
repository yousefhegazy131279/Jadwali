// ============================================================
//  3. src/components/FloatingTimer.tsx
// ============================================================
'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTimer } from '@/context/TimerContext'
import { useRouter, usePathname } from 'next/navigation'
import { Clock, Play, Pause, X, CheckCircle, Minus } from 'lucide-react'

export function FloatingTimer() {
  const { timerState, pauseTimer, resumeTimer, resetTimer, completePhase } = useTimer()
  const router = useRouter()
  const pathname = usePathname()
  const [localTimeLeft, setLocalTimeLeft] = useState(timerState.timeLeft)
  const [isMinimized, setIsMinimized] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const isOnScheduleDetail = pathname?.startsWith('/dashboard/schedule/') && pathname !== '/dashboard/schedule'

  // مزامنة الوقت المحلي مع السياق
  useEffect(() => {
    setLocalTimeLeft(timerState.timeLeft)
  }, [timerState.timeLeft])

  // المؤقت الرئيسي - يعمل بشكل مستمر
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (timerState.isRunning && !timerState.isPaused && timerState.currentPhaseIndex !== null) {
      intervalRef.current = setInterval(() => {
        setLocalTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            playAlertSound()
            completePhase()
            return 0
          }
          return newTime
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState.isRunning, timerState.isPaused, timerState.currentPhaseIndex])

  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
      setTimeout(() => {
        const osc2 = ctx.createOscillator()
        const gain2 = ctx.createGain()
        osc2.connect(gain2)
        gain2.connect(ctx.destination)
        osc2.frequency.value = 1100
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.25, ctx.currentTime)
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc2.start(ctx.currentTime)
        osc2.stop(ctx.currentTime + 0.4)
      }, 200)
    } catch (_) {}
  }

  if (!timerState.isVisible || timerState.currentPhaseIndex === null || isOnScheduleDetail) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const currentPhase = timerState.currentPhaseIndex !== null ? timerState.phases[timerState.currentPhaseIndex] : null
  const isWork = currentPhase?.type === 'work'
  const label = isWork ? `جلسة ${timerState.sessionNumber}` : currentPhase?.type === 'shortBreak' ? 'راحة قصيرة' : 'راحة طويلة'

  const handleClick = () => {
    if (timerState.scheduleId) {
      router.push(`/dashboard/schedule/${timerState.scheduleId}`)
    }
  }

  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMinimized(!isMinimized)
  }

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className="fixed bottom-6 left-6 z-50 bg-[var(--bg-card)] backdrop-blur-xl border border-[#D4AF37] rounded-full shadow-2xl shadow-[#D4AF37]/20 cursor-pointer p-2"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-xs font-['Cairo'] text-[var(--text-secondary)]">
            {timerState.scheduleTitle}
          </span>
          <span className="text-xs font-mono font-bold text-[#D4AF37]">
            {formatTime(localTimeLeft)}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-6 left-6 z-50 bg-[var(--bg-card)] backdrop-blur-xl border border-[#D4AF37] rounded-2xl shadow-2xl shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 transition-shadow cursor-pointer min-w-[220px] max-w-[300px]"
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isWork ? 'bg-[#D4AF37]/20' : 'bg-blue-500/20'}`}>
            <Clock className={`w-5 h-5 ${isWork ? 'text-[#D4AF37]' : 'text-blue-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[var(--text-secondary)] font-['Cairo'] truncate">
              {timerState.scheduleTitle}
            </div>
            <div className="font-bold text-[var(--text-primary)] font-['Cairo'] truncate">
              {timerState.taskName || label}
            </div>
            <div className="text-lg font-mono font-bold text-[#D4AF37]">
              {formatTime(localTimeLeft)}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              {timerState.isRunning ? (
                <button
                  onClick={(e) => { e.stopPropagation(); pauseTimer() }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); resumeTimer() }}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); resetTimer() }}
                className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={toggleMinimize}
              className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors text-center"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>
        </div>
        {timerState.completedPhases > 0 && (
          <div className="mt-2 text-xs text-[var(--text-muted)] font-['Cairo'] flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            {timerState.completedPhases}/{timerState.totalPhases} مكتملة
          </div>
        )}
        <div className="mt-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
            initial={{ width: '0%' }}
            animate={{
              width: timerState.totalPhases > 0
                ? `${(timerState.completedPhases / timerState.totalPhases) * 100}%`
                : '0%'
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  )
}