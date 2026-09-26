'use client'

import { formatTime12 } from '@/lib/time'
import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import SharingPanel, { type MemberProgress } from '@/components/SharingPanel'
import { completedPhaseCount } from '@/lib/progress'
import { useTimer } from '@/context/TimerContext'
import { toast } from 'sonner'
import {
  ArrowRight, Calendar, Clock, CheckCircle, Plus, X, Loader2,
  BookOpen, Coffee, Sparkles, Moon, Tag, Timer, Eye, EyeOff,
  Play, Pause, Check, AlertCircle, Save, Lock, Zap, Target,
  TrendingUp, CircleDot, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/* ============================================================
   الأنواع
   ============================================================ */
type Schedule = {
  id: string
  user_id: string
  title: string
  day: string
  start_time: string
  pomodoro: {
    workDuration: number
    shortBreak: number
    longBreak: number
    cyclesBeforeLong: number
  }
  created_at: string
}

type Task = {
  id: string
  user_id: string
  schedule_id: string
  name: string
  category: string
  duration: number
  type: 'task' | 'side'
  priority: 'high' | 'medium' | 'low'
  done: boolean
  completed_sessions?: number | null
  created_at: string
}

type Prayer = {
  id: string
  user_id: string
  schedule_id: string
  day: string
  name: string
  time: string
  done: boolean
  created_at: string
}

type CustomCard = {
  id: string
  user_id: string
  schedule_id: string
  title: string
  items: string[]
  created_at: string
}

type Phase = {
  type: 'work' | 'shortBreak' | 'longBreak'
  duration: number
  taskId?: string
  taskName?: string
  sessionNumber?: number
  startTime: Date
  endTime: Date
  hasPrayerConflict?: boolean
  prayerName?: string
}

/* ============================================================
   أدوات مساعدة
   ============================================================ */
function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ============================================================
   حلقة تقدّم دائرية
   ============================================================ */
function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.min(Math.max(value, 0), 100) / 100) * c

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          className="text-white/5"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#E8C84A" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  )
}

/* ============================================================
   كارت إحصائية
   ============================================================ */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'gold',
  delay = 0,
}: {
  icon: typeof Target
  label: string
  value: string | number
  hint?: string
  accent?: 'gold' | 'emerald' | 'sky' | 'purple'
  delay?: number
}) {
  const accents = {
    gold: 'from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accents[accent]} p-4 backdrop-blur-xl`}
    >
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-['Cairo'] text-[10px] uppercase tracking-wider opacity-70">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
          {hint}
        </div>
      )}
    </motion.div>
  )
}

/* ============================================================
   عنصر جلسة (Phase)
   ============================================================ */
function PhaseItem({
  phase,
  index,
  isActive,
  isCompleted,
  isLocked,
  isLast,
  onStart,
  onComplete,
  onPause,
  onResume,
  isPaused,
  timeLeft,
  totalDuration,
  canComplete,
  canEdit,
}: {
  phase: Phase
  index: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  isLast: boolean
  onStart: () => void
  onComplete: () => void
  onPause: () => void
  onResume: () => void
  isPaused: boolean
  timeLeft: number
  totalDuration: number
  canComplete: boolean
  canEdit: boolean
}) {
  const { t: tr, language } = useLanguage()

  const pct = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0
  const isBreak = phase.type !== 'work'

  const phaseStyles = {
    work: {
      accent: '#D4AF37',
      ring: 'ring-[#D4AF37]/40',
      glow: 'shadow-[#D4AF37]/20',
      bg: 'from-[#D4AF37]/10 via-transparent to-transparent',
      icon: <BookOpen className="h-4 w-4" />,
      label: tr('جلسة', 'Session'),
    },
    shortBreak: {
      accent: '#60A5FA',
      ring: 'ring-blue-400/40',
      glow: 'shadow-blue-400/20',
      bg: 'from-blue-500/10 via-transparent to-transparent',
      icon: <Coffee className="h-4 w-4" />,
      label: tr('راحة قصيرة', 'Short break'),
    },
    longBreak: {
      accent: '#34D399',
      ring: 'ring-emerald-400/40',
      glow: 'shadow-emerald-400/20',
      bg: 'from-emerald-500/10 via-transparent to-transparent',
      icon: <Moon className="h-4 w-4" />,
      label: tr('راحة طويلة', 'Long break'),
    },
  }[phase.type]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: 'spring', stiffness: 380, damping: 28 }}
      className="relative flex gap-4"
    >
      {/* عمود الخط الزمني */}
      <div className="relative flex flex-col items-center pt-2">
        <motion.div
          animate={
            isActive
              ? { scale: [1, 1.15, 1], boxShadow: [`0 0 0 0 ${phaseStyles.accent}66`, `0 0 0 10px ${phaseStyles.accent}00`] }
              : {}
          }
          transition={{ duration: 1.6, repeat: isActive ? Infinity : 0 }}
          className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            isCompleted
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : isActive
                ? 'border-transparent text-[#0b1a2e]'
                : isLocked
                  ? 'border-white/10 bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
          }`}
          style={isActive ? { background: phaseStyles.accent } : {}}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <span className="text-[10px] font-bold">{index + 1}</span>
          )}
        </motion.div>

        {!isLast && (
          <div
            className={`my-1 w-0.5 flex-1 rounded-full ${
              isCompleted ? 'bg-emerald-500/40' : 'bg-white/5'
            }`}
          />
        )}
      </div>

      {/* الكارت */}
      <div
        className={`group relative mb-3 flex-1 overflow-hidden rounded-2xl border bg-[var(--bg-card)] transition-all duration-300 ${
          isActive
            ? `border-transparent ring-2 ${phaseStyles.ring} shadow-xl ${phaseStyles.glow}`
            : isCompleted
              ? 'border-emerald-500/20 opacity-70'
              : isLocked
                ? 'border-[var(--border-color)] opacity-50'
                : 'border-[var(--border-color)] hover:border-white/15'
        }`}
      >
        {/* خلفية متدرجة عند التفعيل */}
        {isActive && (
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${phaseStyles.bg}`} />
        )}

        {/* شارة الصلاة */}
        {phase.hasPrayerConflict && (
          <div className="absolute -top-px right-4 flex items-center gap-1 rounded-b-lg bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-[#0b1a2e] shadow-lg">
            <AlertCircle className="h-3 w-3" />
            {phase.prayerName}
          </div>
        )}

        <div className="relative p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* اليسار: الأيقونة والمعلومات */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isBreak
                    ? phase.type === 'shortBreak'
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-[#D4AF37]/15 text-[#D4AF37]'
                }`}
              >
                {phaseStyles.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-md px-1.5 py-0.5 font-['Cairo'] text-[10px] font-bold"
                    style={{
                      background: `${phaseStyles.accent}22`,
                      color: phaseStyles.accent,
                    }}
                  >
                    {phase.type === 'work' && phase.sessionNumber
                      ? `${phaseStyles.label} ${phase.sessionNumber}`
                      : phaseStyles.label}
                  </span>
                  {isCompleted && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-['Cairo'] text-[10px] font-bold text-emerald-400">
                      {tr('مكتملة', 'Done')}
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                  {phase.taskName || phaseStyles.label}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-['Cairo'] text-[11px] text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {formatTime12(phase.startTime, language)}
                    <ChevronRight className="h-3 w-3 opacity-40" />
                    {formatTime12(phase.endTime, language)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {Math.floor(phase.duration / 60)} {tr('د', 'm')}
                  </span>
                </div>
              </div>
            </div>

            {/* اليمين: المؤقت / الإجراءات */}
            <div className="flex shrink-0 items-center gap-2">
              {isActive && (
                <motion.div
                  key={timeLeft}
                  animate={timeLeft < 10 ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`rounded-xl border px-3 py-1.5 text-center font-mono text-xl font-bold ${
                    timeLeft < 10
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]'
                  }`}
                >
                  {formatClock(timeLeft)}
                </motion.div>
              )}

              {isActive ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={isPaused ? onResume : onPause}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                      isPaused
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}
                    title={isPaused ? tr('استئناف', 'Resume') : tr('إيقاف', 'Pause')}
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={onComplete}
                    disabled={!canComplete}
                    className={`flex h-9 items-center gap-1 rounded-xl px-3 font-['Cairo'] text-xs font-bold transition-all ${
                      canComplete
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50'
                        : 'cursor-not-allowed bg-white/5 text-[var(--text-muted)]'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    {tr('إنهاء', 'Finish')}
                  </button>
                </div>
              ) : isCompleted ? null : isLocked ? (
                <span className="inline-flex items-center gap-1 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5 font-['Cairo'] text-xs text-[var(--text-muted)]">
                  <Lock className="h-3 w-3" />
                  {tr('مقفلة', 'Locked')}
                </span>
              ) : (
                <button
                  onClick={onStart}
                  disabled={!canEdit}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-3 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40 disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  {tr('ابدأ', 'Start')}
                </button>
              )}
            </div>
          </div>

          {/* شريط التقدم */}
          {isActive && (
            <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${phaseStyles.accent}, ${phaseStyles.accent}cc)` }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <div
                className="absolute top-0 h-full w-1 rounded-full bg-white/40 blur-sm"
                style={{ left: `calc(${Math.min(pct, 100)}% - 2px)` }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   عنصر عمل جانبي
   ============================================================ */
function SideTaskItem({
  task,
  onToggle,
  canEdit,
}: {
  task: Task
  onToggle: (id: string) => void
  canEdit: boolean
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => canEdit && onToggle(task.id)}
      disabled={!canEdit}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-right transition-all ${
        task.done
          ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[#D4AF37]/30'
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          task.done
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-[var(--text-muted)] group-hover:border-[#D4AF37]'
        }`}
      >
        {task.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </div>
      <span
        className={`flex-1 font-['Cairo'] text-sm ${
          task.done
            ? 'text-[var(--text-muted)] line-through'
            : 'text-[var(--text-primary)]'
        }`}
      >
        {task.name}
      </span>
    </motion.button>
  )
}

/* ============================================================
   كارد مخصص
   ============================================================ */
function CustomCardItem({
  card,
  onDelete,
  canEdit,
}: {
  card: CustomCard
  onDelete: (id: string) => void
  canEdit: boolean
}) {
  const { t: tr } = useLanguage()
  const [done, setDone] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setDone((p) => {
      const n = new Set(p)
      n.has(i) ? n.delete(i) : n.add(i)
      return n
    })
  }

  const progress = card.items.length > 0 ? (done.size / card.items.length) * 100 : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-400" />
          <span className="truncate font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
            {card.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">
            {done.size}/{card.items.length}
          </span>
          {canEdit && (
            <button
              onClick={() => onDelete(card.id)}
              className="rounded-lg p-1 text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="h-0.5 w-full bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-400 to-purple-600"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <ul className="space-y-1 p-3">
        {card.items.map((item, i) => (
          <li
            key={i}
            onClick={() => toggle(i)}
            className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/5"
          >
            <div
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                done.has(i)
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-[var(--text-muted)]'
              }`}
            >
              {done.has(i) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
            </div>
            <span
              className={`font-['Cairo'] text-xs ${
                done.has(i)
                  ? 'text-[var(--text-muted)] line-through'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

/* ============================================================
   مودال موحّد
   ============================================================ */
function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  iconColor = 'text-[#D4AF37]',
  children,
  maxWidth = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: typeof Plus
  iconColor?: string
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function ScheduleDetailPage() {
  const { t: tr, language } = useLanguage()
  const { id } = useParams()
  const router = useRouter()
  const { user } = useSupabase()
  const {
    timerState,
    startTimer: startGlobalTimer,
    completePhase: completeGlobalPhase,
    setTimerVisibility,
    pauseTimer,
    resumeTimer,
  } = useTimer()

  const [memberRole, setMemberRole] = useState<string | null>(null)
  const updateMembers = useCallback(
    (members: MemberProgress[]) =>
      setMemberRole(members.find((m) => m.user_id === user?.id)?.role ?? null),
    [user?.id]
  )

  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [customCards, setCustomCards] = useState<CustomCard[]>([])
  const [showPrayers, setShowPrayers] = useState(true)
  const [phases, setPhases] = useState<Phase[]>([])
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number | null>(null)
  const [completedCount, setCompletedCount] = useState(0)

  const [isAddSideTaskModalOpen, setIsAddSideTaskModalOpen] = useState(false)
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const today = new Date().toISOString().split('T')[0]

  /* ====== تحميل البيانات ====== */
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user && id) fetchData()
  }, [user, id])

  useEffect(() => {
    setTimerVisibility(false)
    return () => setTimerVisibility(true)
  }, [])

  useEffect(() => {
    if (timerState.scheduleId === id) {
      setCurrentPhaseIndex(timerState.currentPhaseIndex)
      setCompletedCount((prev) => Math.max(prev, timerState.completedPhases || 0))
    } else {
      setCurrentPhaseIndex(null)
    }
  }, [timerState, id])

  const fetchData = async () => {
    if (!user || !id) return
    const supabase = createClient()
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', id)
        .single()

      if (scheduleError || !scheduleData) {
        toast.error(tr('الجدول غير موجود', 'Schedule not found'))
        router.push('/dashboard/schedule')
        return
      }
      setSchedule(scheduleData)

      const [tasksRes, prayersRes, cardsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('schedule_id', id).order('created_at', { ascending: true }),
        supabase.from('prayers').select('*').eq('schedule_id', id).order('time', { ascending: true }),
        supabase.from('custom_cards').select('*').eq('schedule_id', id).order('created_at', { ascending: true }),
      ])

      setTasks(tasksRes.data || [])
      setPrayers(prayersRes.data || [])
      setCustomCards(cardsRes.data || [])

      generatePhases(tasksRes.data || [], scheduleData, prayersRes.data || [])
    } catch (error) {
      console.error(error)
      toast.error(tr('حدث خطأ في تحميل البيانات', 'Error loading data'))
    } finally {
      setLoading(false)
    }
  }

  const generatePhases = (tasksData: Task[], scheduleData: Schedule, prayersData: Prayer[]) => {
    const studyTasks = tasksData.filter((t) => t.type === 'task' && t.duration > 0)
    const pom = scheduleData.pomodoro
    const startDate = new Date(`${scheduleData.day}T${scheduleData.start_time}`)
    let currentTime = startDate
    const newPhases: Phase[] = []
    let sessionCounter = 0
    let cycleCounter = 0

    const conflictFor = (start: Date, end: Date) => {
      for (const p of prayersData) {
        const [h, m] = p.time.split(':').map(Number)
        const pd = new Date(scheduleData.day)
        pd.setHours(h, m, 0, 0)
        if (pd >= start && pd <= end) return { hasPrayerConflict: true, prayerName: p.name }
      }
      return { hasPrayerConflict: false, prayerName: '' }
    }

    studyTasks.forEach((task) => {
      const totalMinutes = task.duration
      const workDur = pom.workDuration
      const count = Math.ceil(totalMinutes / workDur)

      for (let i = 0; i < count; i++) {
        sessionCounter++
        const phaseStart = new Date(currentTime)
        const phaseEnd = new Date(
          currentTime.getTime() + Math.min(workDur, totalMinutes - i * workDur) * 60000
        )
        const conflict = conflictFor(phaseStart, phaseEnd)

        newPhases.push({
          type: 'work',
          duration: Math.min(workDur, totalMinutes - i * workDur) * 60,
          taskId: task.id,
          taskName: task.name,
          sessionNumber: sessionCounter,
          startTime: phaseStart,
          endTime: phaseEnd,
          ...conflict,
        })
        currentTime = new Date(phaseEnd.getTime())

        if (!(i === count - 1 && task === studyTasks[studyTasks.length - 1])) {
          cycleCounter++
          let breakDur = pom.shortBreak
          let breakType: 'shortBreak' | 'longBreak' = 'shortBreak'
          if (cycleCounter % pom.cyclesBeforeLong === 0) {
            breakDur = pom.longBreak
            breakType = 'longBreak'
          }
          const breakStart = new Date(currentTime)
          const breakEnd = new Date(currentTime.getTime() + breakDur * 60000)
          const breakConflict = conflictFor(breakStart, breakEnd)

          newPhases.push({
            type: breakType,
            duration: breakDur * 60,
            startTime: breakStart,
            endTime: breakEnd,
            ...breakConflict,
          })
          currentTime = new Date(breakEnd.getTime())
        }
      }
    })

    setPhases(newPhases)
    setCompletedCount(completedPhaseCount(newPhases, tasksData))
  }

  /* ====== المزامنة الحية ====== */
  useEffect(() => {
    if (!user || !id) return
    const supabase = createClient()
    const refresh = () => void fetchData()
    const channel = supabase
      .channel('schedule-progress-' + id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: 'schedule_id=eq.' + id },
        refresh
      )
      .subscribe()

    window.addEventListener('focus', refresh)
    window.addEventListener('jadwali-progress', refresh)
    const poll = setInterval(refresh, 15000)

    return () => {
      clearInterval(poll)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('jadwali-progress', refresh)
      void supabase.removeChannel(channel)
    }
  }, [user?.id, id])

  /* ====== الإجراءات ====== */
  const canEdit = schedule?.user_id === user?.id || memberRole === 'editor'

  const handleStartPhase = (index: number) => {
    if (!canEdit) return
    const currentFloor = Math.max(
      completedCount,
      timerState.scheduleId === id ? timerState.completedPhases : 0
    )
    if (index !== currentFloor) return
    if (currentPhaseIndex !== null && currentPhaseIndex !== index) {
      toast.error(tr('أنهِ الجلسة الحالية أولاً', 'Finish current session first'))
      return
    }
    const phase = phases[index]
    if (!phase) return
    startGlobalTimer(schedule!.id, schedule!.title, phases, index)
    setCurrentPhaseIndex(index)
    toast.success(`🎯 ${tr('بدأت الجلسة', 'Session started')}`)
  }

  const handleCompletePhase = (index: number) => {
    if (currentPhaseIndex !== index) return
    if (timerState.timeLeft > 0) {
      toast.error(tr('لا يمكن الإنهاء قبل انتهاء الوقت', 'Cannot finish early'))
      return
    }
    completeGlobalPhase()
  }

  const handleToggleSideTask = async (taskId: string) => {
    if (!canEdit) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ done: !task.done }).eq('id', taskId)
    if (error) toast.error(tr('خطأ في التحديث', 'Update error'))
    else setTasks(tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)))
  }

  const handleTogglePrayer = async (prayerId: string) => {
    if (!canEdit) return
    const prayer = prayers.find((p) => p.id === prayerId)
    if (!prayer) return
    const supabase = createClient()
    const { error } = await supabase.from('prayers').update({ done: !prayer.done }).eq('id', prayerId)
    if (error) toast.error(tr('خطأ في التحديث', 'Update error'))
    else setPrayers(prayers.map((p) => (p.id === prayerId ? { ...p, done: !p.done } : p)))
  }

  const handleAddSideTask = async (name: string) => {
    if (!user || !schedule || !canEdit) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: schedule.user_id,
        schedule_id: schedule.id,
        name,
        category: tr('جانبي', 'Side'),
        duration: 0,
        type: 'side',
        priority: 'low',
        done: false,
        completed_sessions: 0,
      })
      .select()
      .single()

    if (error) toast.error(tr('خطأ في الإضافة', 'Add error'))
    else {
      setTasks([...tasks, data])
      toast.success(tr('✅ تمت الإضافة', '✅ Added'))
      setIsAddSideTaskModalOpen(false)
    }
    setIsSaving(false)
  }

  const handleAddCard = async (title: string, items: string[]) => {
    if (!user || !schedule || !canEdit) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('custom_cards')
      .insert({
        user_id: schedule.user_id,
        schedule_id: schedule.id,
        title,
        items,
      })
      .select()
      .single()

    if (error) {
      toast.error(tr('خطأ في إضافة الكارد', 'Card error'))
      console.error(error)
    } else {
      setCustomCards([...customCards, data])
      toast.success(tr('✅ تمت الإضافة', '✅ Added'))
      setIsAddCardModalOpen(false)
    }
    setIsSaving(false)
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!canEdit) return
    if (!confirm(tr('حذف هذا الكارد؟', 'Delete this card?'))) return
    const supabase = createClient()
    const { error } = await supabase.from('custom_cards').delete().eq('id', cardId)
    if (error) toast.error(tr('خطأ في الحذف', 'Delete error'))
    else {
      setCustomCards(customCards.filter((c) => c.id !== cardId))
      toast.success(tr('🗑️ تم الحذف', '🗑️ Deleted'))
    }
  }

  /* ====== Loading ====== */
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 h-14 w-14 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37]"
          />
          <p className="font-['Cairo'] text-sm text-[var(--text-muted)]">
            {tr('جارٍ التحميل…', 'Loading…')}
          </p>
        </div>
      </div>
    )
  }

  if (!schedule) return null

  /* ====== الحسابات ====== */
  const totalPhases = phases.length
  const completedFromState =
    timerState.scheduleId === id
      ? Math.max(completedCount, timerState.completedPhases)
      : completedCount
  const progress = totalPhases > 0 ? Math.round((completedFromState / totalPhases) * 100) : 0
  const formattedDate = format(new Date(schedule.day), 'EEEE، d MMMM yyyy', {
    locale: language === 'ar' ? ar : enUS,
  })
  const isToday = schedule.day === today

  const workPhases = phases.filter((p) => p.type === 'work')
  const totalWorkMinutes = workPhases.reduce((s, p) => s + p.duration / 60, 0)
  const completedWorkMinutes = workPhases
    .slice(0, completedFromState)
    .filter((p) => p.type === 'work')
    .reduce((s, p) => s + p.duration / 60, 0)

  const isTimerActive = timerState.isRunning || timerState.isPaused
  const isTimerPaused = timerState.isPaused

  const sideTasks = tasks.filter((t) => t.type === 'side')
  const sideDone = sideTasks.filter((t) => t.done).length

  /* ====== العرض ====== */
  return (
    <div className="space-y-5 p-3 sm:p-6">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 p-5 sm:p-7"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* العنوان والوصف */}
          <div className="flex min-w-0 items-start gap-4">
            <button
              onClick={() => router.push('/dashboard/schedule')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
            >
              <ArrowRight className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {isToday && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-0.5 font-['Cairo'] text-[10px] font-bold text-[#D4AF37]">
                    <CircleDot className="h-2.5 w-2.5 animate-pulse" />
                    {tr('اليوم', 'Today')}
                  </span>
                )}
                {!canEdit && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 font-['Cairo'] text-[10px] font-bold text-sky-400">
                    <Eye className="h-3 w-3" />
                    {tr('مشاهدة فقط', 'View only')}
                  </span>
                )}
                {canEdit && memberRole === 'editor' && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-['Cairo'] text-[10px] font-bold text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    {tr('محرر', 'Editor')}
                  </span>
                )}
              </div>

              <h1 className="truncate font-['Amiri'] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                {schedule.title}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-['Cairo'] text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
                  {formattedDate}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                  {tr('يبدأ', 'Starts')} {formatTime12(schedule.start_time, language)}
                </span>
              </div>
            </div>
          </div>

          {/* الساعة والمؤقت */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5">
              <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {tr('الوقت الآن', 'Current time')}
              </div>
              <div className="font-mono text-lg font-bold text-[#D4AF37]">
                {formatTime12(currentTime, language, true)}
              </div>
            </div>

            {isTimerActive && timerState.scheduleId === id && (
              <button
                onClick={isTimerPaused ? resumeTimer : pauseTimer}
                className={`flex h-11 items-center gap-2 rounded-2xl px-4 font-['Cairo'] text-sm font-bold text-white shadow-lg transition-all hover:scale-105 ${
                  isTimerPaused
                    ? 'bg-emerald-500 shadow-emerald-500/30'
                    : 'bg-amber-500 shadow-amber-500/30'
                }`}
              >
                {isTimerPaused ? (
                  <>
                    <Play className="h-4 w-4" /> {tr('استئناف', 'Resume')}
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" /> {tr('إيقاف', 'Pause')}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border-color)] pt-5">
          <button
            onClick={() => setIsAddCardModalOpen(true)}
            disabled={!canEdit}
            className="flex h-10 items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 font-['Cairo'] text-xs font-bold text-purple-300 transition-all hover:bg-purple-500/20 disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            {tr('كارد جديد', 'New card')}
          </button>

          <button
            onClick={() => setIsAddSideTaskModalOpen(true)}
            disabled={!canEdit}
            className="flex h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3.5 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-all hover:bg-[#D4AF37]/20 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {tr('عمل جانبي', 'Side task')}
          </button>

          <button
            onClick={() => setShowPrayers(!showPrayers)}
            className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 font-['Cairo'] text-xs font-bold transition-all ${
              showPrayers
                ? 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[#D4AF37]/30 hover:text-[#D4AF37]'
                : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
            }`}
          >
            {showPrayers ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showPrayers ? tr('إخفاء الصلوات', 'Hide prayers') : tr('إظهار الصلوات', 'Show prayers')}
          </button>

          <div className="ms-auto hidden items-center gap-3 font-['Cairo'] text-[11px] text-[var(--text-muted)] sm:flex">
            <span>⏱️ {schedule.pomodoro.workDuration}{tr('د', 'm')} {tr('عمل', 'work')}</span>
            <span>☕ {schedule.pomodoro.shortBreak}{tr('د', 'm')}</span>
            <span>🛌 {schedule.pomodoro.longBreak}{tr('د', 'm')}</span>
          </div>
        </div>
      </motion.section>

      {/* ============ SharingPanel ============ */}
      <SharingPanel
        scheduleId={schedule.id}
        owner={schedule.user_id === user?.id}
        onRole={updateMembers}
      />

      {/* ============ شبكة الإحصائيات ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label={tr('التقدم', 'Progress')}
          value={`${progress}%`}
          hint={`${completedFromState}/${totalPhases} ${tr('جلسة', 'sessions')}`}
          accent="gold"
          delay={0.05}
        />
        <StatCard
          icon={Timer}
          label={tr('وقت العمل', 'Work time')}
          value={`${Math.round(completedWorkMinutes)}${tr('د', 'm')}`}
          hint={`${tr('من', 'of')} ${Math.round(totalWorkMinutes)}${tr('د', 'm')}`}
          accent="emerald"
          delay={0.1}
        />
        <StatCard
          icon={Coffee}
          label={tr('أعمال جانبية', 'Side tasks')}
          value={`${sideDone}/${sideTasks.length}`}
          hint={tr('منجزة', 'completed')}
          accent="sky"
          delay={0.15}
        />
        <StatCard
          icon={Moon}
          label={tr('الصلوات', 'Prayers')}
          value={`${prayers.filter((p) => p.done).length}/${prayers.length}`}
          hint={tr('أُدّيت', 'performed')}
          accent="purple"
          delay={0.2}
        />
      </div>

      {/* ============ التخطيط الرئيسي ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ===== العمود الأيسر ===== */}
        <div className="space-y-4 lg:col-span-3">
          {/* حلقة التقدم */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col items-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
          >
            <ProgressRing value={progress} size={130} stroke={10}>
              <div className="font-mono text-3xl font-bold text-[#D4AF37]">{progress}%</div>
              <div className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {tr('مكتمل', 'Complete')}
              </div>
            </ProgressRing>
            <div className="mt-3 text-center font-['Cairo'] text-xs text-[var(--text-secondary)]">
              {completedFromState} {tr('من', 'of')} {totalPhases} {tr('جلسة', 'sessions')}
            </div>
          </motion.div>

          {/* الأعمال الجانبية */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15">
                  <Coffee className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {tr('أعمال جانبية', 'Side tasks')}
                </h3>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                {sideDone}/{sideTasks.length}
              </span>
            </div>

            {sideTasks.length === 0 ? (
              <div className="py-4 text-center font-['Cairo'] text-xs text-[var(--text-muted)]">
                {tr('لا توجد أعمال جانبية', 'No side tasks')}
              </div>
            ) : (
              <div className="max-h-[280px] space-y-1.5 overflow-y-auto pe-1">
                {sideTasks.map((task) => (
                  <SideTaskItem
                    key={task.id}
                    task={task}
                    onToggle={handleToggleSideTask}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* الكاردات المخصصة */}
          {customCards.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {tr('كاردات مخصصة', 'Custom cards')}
                </h3>
              </div>
              <div className="max-h-[400px] space-y-3 overflow-y-auto pe-1">
                {customCards.map((card) => (
                  <CustomCardItem
                    key={card.id}
                    card={card}
                    onDelete={handleDeleteCard}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== العمود الأوسط: الجلسات ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-6"
        >
          <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37]/15">
                  <Timer className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                    {tr('جلسات اليوم', "Today's sessions")}
                  </h2>
                  <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {totalPhases} {tr('مرحلة', 'phases')} • {completedFromState} {tr('مكتملة', 'done')}
                  </p>
                </div>
              </div>
            </div>

            {phases.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/5">
                  <BookOpen className="h-7 w-7 text-[#D4AF37]/40" />
                </div>
                <p className="font-['Cairo'] text-sm text-[var(--text-muted)]">
                  {tr('لا توجد جلسات دراسية في هذا الجدول', 'No study sessions')}
                </p>
              </div>
            ) : (
              <div className="max-h-[680px] overflow-y-auto p-5 pe-3">
                {phases.map((phase, index) => {
                  const isActive =
                    timerState.scheduleId === id && timerState.currentPhaseIndex === index
                  const isCompleted = index < completedFromState
                  const isLocked =
                    !canEdit || (!isActive && !isCompleted && index > completedFromState)
                  const canComplete = isActive && timerState.timeLeft === 0
                  const timeLeft = isActive ? timerState.timeLeft : phase.duration

                  return (
                    <PhaseItem
                      key={index}
                      phase={phase}
                      index={index}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      isLocked={isLocked}
                      isLast={index === phases.length - 1}
                      onStart={() => handleStartPhase(index)}
                      onComplete={() => handleCompletePhase(index)}
                      onPause={pauseTimer}
                      onResume={resumeTimer}
                      isPaused={timerState.isPaused}
                      timeLeft={timeLeft}
                      totalDuration={phase.duration}
                      canComplete={canComplete}
                      canEdit={canEdit}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== العمود الأيمن: الصلوات ===== */}
        <div className="space-y-4 lg:col-span-3">
          {showPrayers && prayers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37]/15">
                  <Moon className="h-3.5 w-3.5 text-[#D4AF37]" />
                </div>
                <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                  {tr('مواقيت الصلاة', 'Prayer times')}
                </h3>
              </div>

              <div className="space-y-2">
                {prayers.map((prayer) => {
                  const [h, m] = prayer.time.split(':').map(Number)
                  const now = new Date()
                  const pd = new Date(schedule.day)
                  pd.setHours(h, m, 0, 0)
                  const isPast = pd < now
                  const isNext =
                    !isPast &&
                    !prayer.done &&
                    prayers.findIndex((p) => {
                      const [ph, pm] = p.time.split(':').map(Number)
                      const pdd = new Date(schedule.day)
                      pdd.setHours(ph, pm, 0, 0)
                      return !p.done && pdd > now
                    }) === prayers.indexOf(prayer)

                  return (
                    <motion.button
                      key={prayer.id}
                      onClick={() => handleTogglePrayer(prayer.id)}
                      disabled={!canEdit}
                      whileHover={canEdit ? { scale: 1.02 } : {}}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        prayer.done
                          ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                          : isNext
                            ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]/20'
                            : isPast
                              ? 'border-[var(--border-color)] bg-white/[0.01] opacity-60'
                              : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            prayer.done
                              ? 'border-emerald-500 bg-emerald-500'
                              : isNext
                                ? 'border-[#D4AF37]'
                                : 'border-[var(--text-muted)]'
                          }`}
                        >
                          {prayer.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <span
                          className={`font-['Cairo'] text-sm font-bold ${
                            prayer.done
                              ? 'text-[var(--text-muted)] line-through'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {tr(prayer.name)}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          prayer.done
                            ? 'text-emerald-400'
                            : isNext
                              ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {formatTime12(prayer.time, language)}
                      </span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* معلومات البومودورو */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                {tr('إعدادات البومودورو', 'Pomodoro settings')}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: tr('العمل', 'Work'), value: `${schedule.pomodoro.workDuration}د`, color: 'text-[#D4AF37]' },
                { label: tr('راحة قصيرة', 'Short'), value: `${schedule.pomodoro.shortBreak}د`, color: 'text-blue-400' },
                { label: tr('راحة طويلة', 'Long'), value: `${schedule.pomodoro.longBreak}د`, color: 'text-emerald-400' },
                { label: tr('دورات', 'Cycles'), value: schedule.pomodoro.cyclesBeforeLong, color: 'text-purple-400' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 text-center"
                >
                  <div className={`font-mono text-lg font-bold ${item.color}`}>{item.value}</div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ============ المودالات ============ */}
      <Modal
        open={isAddSideTaskModalOpen}
        onClose={() => setIsAddSideTaskModalOpen(false)}
        title={tr('إضافة عمل جانبي', 'Add side task')}
        icon={Plus}
        iconColor="text-sky-400"
      >
        <SideTaskForm
          onSave={handleAddSideTask}
          onCancel={() => setIsAddSideTaskModalOpen(false)}
          isLoading={isSaving}
        />
      </Modal>

      <Modal
        open={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        title={tr('إضافة كارد', 'Add card')}
        icon={Sparkles}
        iconColor="text-purple-400"
        maxWidth="max-w-lg"
      >
        <CardForm
          onSave={handleAddCard}
          onCancel={() => setIsAddCardModalOpen(false)}
          isLoading={isSaving}
        />
      </Modal>
    </div>
  )
}

/* ============================================================
   نماذج المودال (مفصولة لتبسيط المكوّن الرئيسي)
   ============================================================ */
function SideTaskForm({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (name: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  const { t: tr } = useLanguage()
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error(tr('أدخل اسماً', 'Enter a name'))
      return
    }
    await onSave(name.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
          {tr('اسم العمل الجانبي', 'Side task name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr('مثال: شرب ماء، تمرين…', 'e.g. Drink water, exercise…')}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
          autoFocus
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-white/5"
        >
          {tr('إلغاء', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] transition-all hover:shadow-lg hover:shadow-[#D4AF37]/30 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {tr('إضافة', 'Add')}
        </button>
      </div>
    </form>
  )
}

function CardForm({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (title: string, items: string[]) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  const { t: tr } = useLanguage()
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<string[]>([''])

  const addItem = () => items.length < 10 && setItems([...items, ''])
  const updateItem = (i: number, v: string) => {
    const u = [...items]
    u[i] = v
    setItems(u)
  }
  const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error(tr('أدخل عنواناً', 'Enter a title'))
      return
    }
    const filtered = items.filter((i) => i.trim().length > 0)
    if (filtered.length === 0) {
      toast.error(tr('أضف عنصراً واحداً', 'Add at least one item'))
      return
    }
    await onSave(title.trim(), filtered)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
          {tr('عنوان الكارد', 'Card title')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr('مثال: أذكار الصباح', 'e.g. Morning adhkar')}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1.5 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
          {tr('العناصر', 'Items')} <span className="text-[var(--text-muted)]">({items.length}/10)</span>
        </label>
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 font-mono text-[10px] text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder={`${tr('عنصر', 'Item')} ${i + 1}`}
                  className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {items.length < 10 && (
          <button
            type="button"
            onClick={addItem}
            className="mt-2 flex items-center gap-1 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-colors hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            {tr('إضافة عنصر', 'Add item')}
          </button>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-white/5"
        >
          {tr('إلغاء', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] transition-all hover:shadow-lg hover:shadow-[#D4AF37]/30 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {tr('حفظ الكارد', 'Save card')}
        </button>
      </div>
    </form>
  )
}