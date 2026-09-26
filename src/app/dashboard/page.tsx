'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import { Clock } from '@/components/Clock'
import { NeonParticles } from '@/components/NeonParticles'
import { toast } from 'sonner'
import {
  Crown, Bell, User, CheckCircle2, ListChecks, Clock as ClockIcon,
  Play, Plus, Zap, AlertCircle, Flame, X, Calendar, Trash2,
  HelpCircle, Sparkles, TrendingUp, ArrowLeft, CircleDot,
  Pause, RotateCcw, Target, Timer as TimerIcon, ChevronRight,
  Coffee, Layers,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { useTimer } from '@/context/TimerContext'
import WelcomeAnimation from '@/components/WelcomeAnimation'
import { useTour } from '@/context/TourContext'

/* ============================================================
   الأنواع
   ============================================================ */
type Task = {
  id: string
  user_id: string
  schedule_id: string | null
  name: string
  category: string
  duration: number
  type: 'task' | 'side'
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  done: boolean
  completed_sessions?: number
  created_at: string
}

type Project = { id: string; name: string; color: string }

type Schedule = {
  id: string
  user_id: string
  title: string
  day: string
  start_time: string | null
  pomodoro: {
    workDuration: number
    shortBreak: number
    longBreak: number
    cyclesBeforeLong: number
  }
  created_at: string
}

type ScheduleWithSessions = Schedule & {
  totalSessions: number
  completedSessions: number
  pendingTasks: number
}

/* ============================================================
   أدوات
   ============================================================ */
function getLocalToday() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function formatSeconds(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ============================================================
   بطاقة KPI أنيقة
   ============================================================ */
function KpiCard({
  icon: Icon,
  value,
  label,
  hint,
  accent,
  delay = 0,
}: {
  icon: typeof Target
  value: string | number
  label: string
  hint?: string
  accent: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, type: 'spring', stiffness: 320 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-all hover:shadow-xl"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: accent }}
      />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${accent}20`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-40 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="font-mono text-3xl font-bold leading-none text-[var(--text-primary)]">
          {value}
        </div>
        <div className="mt-2 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">{hint}</div>
        )}
      </div>
    </motion.div>
  )
}

/* ============================================================
   مؤقت دائري
   ============================================================ */
function CircularTimer({
  timeLeft,
  totalDuration,
  taskName,
  scheduleTitle,
  isPaused,
  phaseType,
}: {
  timeLeft: number
  totalDuration: number
  taskName: string | null
  scheduleTitle: string | null
  isPaused: boolean
  phaseType?: string
}) {
  const { t } = useLanguage()
  const r = 52
  const c = 2 * Math.PI * r
  const progress = totalDuration > 0 ? Math.max(0, Math.min(1, timeLeft / totalDuration)) : 0
  const dashOffset = c * (1 - progress)
  const isBreak = phaseType === 'shortBreak' || phaseType === 'longBreak'
  const accent = isBreak ? '#3B82F6' : '#D4AF37'

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-52 w-52">
        {/* حلقات جمالية */}
        <div
          className="absolute inset-0 rounded-full opacity-20 blur-2xl"
          style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)` }}
        />
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={accent}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {isBreak ? t('راحة', 'Break') : t('جلسة عمل', 'Work session')}
          </div>
          <div className="my-1 font-mono text-5xl font-bold tabular-nums" style={{ color: accent }}>
            {formatSeconds(timeLeft)}
          </div>
          {isPaused && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="mt-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 font-['Cairo'] text-[10px] font-bold text-amber-400"
            >
              {t('متوقف مؤقتاً', 'Paused')}
            </motion.div>
          )}
        </div>
      </div>
      {taskName && (
        <div className="mt-4 max-w-[240px] truncate text-center font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
          {taskName}
        </div>
      )}
      {scheduleTitle && (
        <div className="mt-1 inline-flex items-center gap-1.5 font-['Cairo'] text-xs text-[var(--text-secondary)]">
          <Layers className="h-3 w-3 text-[#D4AF37]" />
          {scheduleTitle}
        </div>
      )}
    </div>
  )
}

/* ============================================================
   عنصر مهمة هامة
   ============================================================ */
function ImportantTaskItem({ task, language, t, index }: { task: Task; language: 'ar' | 'en'; t: (a: string, e?: string) => string; index: number }) {
  const isHigh = task.priority === 'high'
  const accent = isHigh ? '#EF4444' : '#F59E0B'
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ x: 3 }}
      className="group flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-2.5 transition-all hover:border-[var(--border-color)]"
    >
      <div
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: accent }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
          {task.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
          <CircleDot className="h-2.5 w-2.5" style={{ color: accent }} />
          {isHigh ? t('أولوية عالية', 'High priority') : t('أولوية متوسطة', 'Medium')}
          {task.due_date && (
            <>
              <span className="text-white/10">•</span>
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(task.due_date), 'd MMM', { locale: language === 'ar' ? ar : enUS })}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   بطاقة جدول مصغّرة
   ============================================================ */
function MiniScheduleCard({
  schedule,
  isToday,
  language,
  t,
  onView,
  onDelete,
  index,
}: {
  schedule: ScheduleWithSessions
  isToday: boolean
  language: 'ar' | 'en'
  t: (a: string, e?: string) => string
  onView: () => void
  onDelete: (e: React.MouseEvent) => void
  index: number
}) {
  const remaining = schedule.totalSessions - schedule.completedSessions
  const progress = schedule.totalSessions > 0
    ? Math.round((schedule.completedSessions / schedule.totalSessions) * 100)
    : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ x: 3 }}
      onClick={onView}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 transition-all ${
        isToday
          ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5 shadow-md shadow-[#D4AF37]/10'
          : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/40 hover:border-[#D4AF37]/30'
      }`}
    >
      {isToday && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-transparent" />
      )}

      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`truncate font-['Amiri'] text-sm font-bold ${
                isToday ? 'text-[#D4AF37]' : 'text-[var(--text-primary)]'
              }`}
            >
              {schedule.title}
            </span>
            {isToday && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#D4AF37] px-1.5 py-0.5 font-['Cairo'] text-[9px] font-bold text-[#0b1a2e]">
                <CircleDot className="h-2 w-2 animate-pulse" />
                {t('اليوم', 'Today')}
              </span>
            )}
          </div>
          <div className="mt-1 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            {format(new Date(schedule.day), 'EEEE، d MMMM', { locale: language === 'ar' ? ar : enUS })}
          </div>
        </div>

        <button
          onClick={onDelete}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
          title={t('حذف الجدول', 'Delete schedule')}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* شريط التقدم */}
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, delay: 0.15 }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-['Cairo'] text-[10px]">
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {schedule.completedSessions}
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
          <ClockIcon className="h-2.5 w-2.5" />
          {remaining} {t('متبقية', 'left')}
        </span>
        <span className="font-mono font-bold text-[#D4AF37]">{progress}%</span>
      </div>
    </motion.div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function DashboardPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { user, fullName } = useSupabase()
  const { timerState, pauseTimer, resumeTimer, resetTimer } = useTimer()
  const { startTour } = useTour()

  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState(getLocalToday)
  const [schedules, setSchedules] = useState<ScheduleWithSessions[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const notificationRef = useRef<HTMLDivElement>(null)

  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastSeenNotificationCount')
      return saved ? parseInt(saved, 10) : 0
    }
    return 0
  })

  const [stats, setStats] = useState({
    schedulesCount: 0,
    remainingTasks: 0,
    remainingSessions: 0,
    completedSessions: 0,
  })

  /* ====== مراقبة تغيّر اليوم ====== */
  useEffect(() => {
    const iv = setInterval(() => {
      const nt = getLocalToday()
      if (nt !== today) setToday(nt)
    }, 60000)
    return () => clearInterval(iv)
  }, [today])

  /* ====== جلب البيانات ====== */
  const fetchData = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    try {
      const { data: schedulesData, error: se } = await supabase
        .from('schedules').select('*').eq('user_id', user.id).order('day', { ascending: false })
      if (se) throw se

      const { data: tasksData, error: te } = await supabase
        .from('tasks').select('*').eq('user_id', user.id)
      if (te) throw te

      const schedulesList = schedulesData || []
      const tasksList = tasksData || []

      const enriched: ScheduleWithSessions[] = schedulesList.map((s) => {
        const scheduleTasks = tasksList.filter(
          (x) => x.schedule_id === s.id && x.type === 'task' && x.duration > 0
        )
        const wd = s.pomodoro?.workDuration || 50
        let total = 0
        let completed = 0
        scheduleTasks.forEach((task) => {
          const sessionsForTask = Math.ceil((task.duration || wd) / wd)
          total += sessionsForTask
          if (task.completed_sessions != null) {
            completed += Math.min(task.completed_sessions, sessionsForTask)
          } else if (task.done) {
            completed += sessionsForTask
          }
        })
        const pendingTasks = tasksList.filter(
          (x) => x.schedule_id === s.id && !x.done
        ).length
        return { ...s, totalSessions: total, completedSessions: completed, pendingTasks }
      })

      const todaySchedule = enriched.find((s) => s.day === today)
      const remainingTasks = tasksList.filter((x) => !x.done).length

      const { data: projectsData } = await supabase
        .from('projects').select('id, name, color').eq('user_id', user.id)

      if (timerState.scheduleId) {
        const { data: active, error } = await supabase
          .from('schedules').select('id').eq('id', timerState.scheduleId).maybeSingle()
        if (!error && !active) {
          resetTimer()
          toast.info(t('تم إيقاف المؤقت لارتباطه بجدول محذوف', 'Timer stopped for deleted schedule'))
        }
      }

      setSchedules(enriched)
      setTasks(tasksList)
      setProjects(projectsData || [])
      setStats({
        schedulesCount: schedulesList.length,
        remainingTasks,
        remainingSessions: todaySchedule
          ? todaySchedule.totalSessions - todaySchedule.completedSessions
          : 0,
        completedSessions: todaySchedule ? todaySchedule.completedSessions : 0,
      })
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      toast.error(t('تعذر تحميل البيانات', 'Failed to load data'))
    } finally {
      setLoading(false)
    }
  }, [user, today, timerState.scheduleId, resetTimer, t])

  useEffect(() => {
    if (user) void fetchData()
  }, [user, fetchData])

  /* ====== Realtime ====== */
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channels = [
      supabase.channel('dash-sch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
      supabase.channel('dash-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
      supabase.channel('dash-proj')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
    ]
    return () => channels.forEach((c) => supabase.removeChannel(c))
  }, [user, fetchData])

  /* ====== إغلاق الإشعارات عند النقر خارجها ====== */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if ('Notification' in window) setNotificationPermission(Notification.permission)
    else setNotificationPermission('unsupported')
  }, [])

  /* ====== المهام الهامة ====== */
  const importantTasks = useMemo(() => {
    return tasks
      .filter((x) => !x.done && x.priority === 'high')
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 5)
  }, [tasks])

  const todaySchedule = schedules.find((s) => s.day === today)

  /* ====== الإشعارات ====== */
  const notifications = useMemo(() => {
    const list: { id: string; type: 'task' | 'session'; title: string; description: string }[] = []
    importantTasks.forEach((x) => {
      list.push({
        id: `task-${x.id}`,
        type: 'task',
        title: `${t('مهمة هامة', 'Priority task')}: ${x.name}`,
        description: x.due_date
          ? `${t('تستحق', 'Due')} ${format(new Date(x.due_date), 'dd/MM', { locale: language === 'ar' ? ar : enUS })}`
          : t('أولوية عالية', 'High priority'),
      })
    })
    if (todaySchedule && todaySchedule.totalSessions > 0) {
      list.push({
        id: 'today-sessions',
        type: 'session',
        title: t('جلسات اليوم', "Today's sessions"),
        description: `${t('إجمالي', 'Total')}: ${todaySchedule.totalSessions} • ${t('منجزة', 'Done')}: ${stats.completedSessions} • ${t('متبقية', 'Left')}: ${stats.remainingSessions}`,
      })
    }
    return list
  }, [importantTasks, todaySchedule, stats, language, t])

  const toggleNotifications = () => {
    setNotificationsOpen((prev) => {
      const open = !prev
      if (open) {
        setLastSeenNotificationCount(notifications.length)
        localStorage.setItem('lastSeenNotificationCount', String(notifications.length))
      }
      return open
    })
  }

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error(t('المتصفح لا يدعم الإشعارات', 'Browser doesn’t support notifications'))
      setNotificationPermission('unsupported')
      return
    }
    try {
      const p = await Notification.requestPermission()
      setNotificationPermission(p)
      if (p === 'granted') toast.success(t('تم تفعيل الإشعارات', 'Notifications enabled'))
      else toast.error(t('تم رفض الإشعارات', 'Notifications denied'))
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteSchedule = async (scheduleId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm(t(
      'هل أنت متأكد من حذف هذا الجدول؟ سيتم حذف جميع المهام والصلوات المرتبطة به.',
      'Delete this schedule? All linked tasks and prayers will be removed.'
    ))) return

    const supabase = createClient()
    try {
      await supabase.from('tasks').delete().eq('schedule_id', scheduleId)
      await supabase.from('prayers').delete().eq('schedule_id', scheduleId)
      await supabase.from('custom_cards').delete().eq('schedule_id', scheduleId)
      const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)
      if (error) throw error
      if (timerState.scheduleId === scheduleId) resetTimer()
      toast.success(t('🗑️ تم حذف الجدول', '🗑️ Schedule deleted'))
      void fetchData()
    } catch (e) {
      console.error('Delete schedule error:', e)
      toast.error(t('حدث خطأ في حذف الجدول', 'Error deleting schedule'))
    }
  }

  /* ====== تحية ====== */
  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t('صباح الخير', 'Good morning')
    if (h < 18) return t('مساء الخير', 'Good afternoon')
    return t('مساء الخير', 'Good evening')
  }, [t])

  /* ====== المؤقت ====== */
  const currentPhase = timerState.currentPhaseIndex != null && timerState.phases
    ? timerState.phases[timerState.currentPhaseIndex]
    : null
  const totalDuration = currentPhase ? currentPhase.duration : 0
  const isTimerActive = timerState.isRunning || timerState.isPaused
  const isPaused = timerState.isPaused

  /* ====== Loading ====== */
  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <NeonParticles />
        <div className="z-10 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4 h-14 w-14 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37]"
          />
          <p className="font-['Cairo'] text-sm text-[var(--text-muted)]">
            {t('جارٍ التحميل…', 'Loading…')}
          </p>
        </div>
      </div>
    )
  }

  /* ====== العرض ====== */
  return (
    <div className="relative min-h-screen p-3 sm:p-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <WelcomeAnimation />

      {/* خلفية الجزيئات */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <NeonParticles />
        <div className="absolute left-10 top-10 h-80 w-80 rounded-full bg-[#D4AF37]/5 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6">
        {/* ============ Header ============ */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          data-tour="dashboard-header"
          className="relative overflow-visible rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[#D4AF37]/12 via-[var(--bg-card)] to-[var(--bg-card)] p-5 backdrop-blur-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[#D4AF37]/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* التحية */}
            <div className="flex min-w-0 items-center gap-4">
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/5 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10"
              >
                <Crown className="h-6 w-6" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="truncate font-['Amiri'] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  {greeting}،{' '}
                  <span className="text-[#D4AF37]">{fullName || t('مستخدم', 'User')}</span>
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-['Cairo'] text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-[#D4AF37]" />
                    {format(new Date(), 'EEEE، d MMMM yyyy', {
                      locale: language === 'ar' ? ar : enUS,
                    })}
                  </span>
                  <span className="text-white/10">•</span>
                  <Clock />
                </div>
              </div>
            </div>

            {/* الأزرار */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={startTour}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/15 to-[#D4AF37]/5 px-4 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-all hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/20"
                title={t('جولة تعريفية', 'Take a tour')}
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('جولة تعريفية', 'Tour')}</span>
              </motion.button>

              {/* الإشعارات */}
              <div className="relative z-[100]" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleNotifications}
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:text-[#D4AF37]"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > lastSeenNotificationCount && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white"
                    >
                      {notifications.length - lastSeenNotificationCount}
                    </motion.span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-12 z-[100] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl ltr:left-0 rtl:right-0"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-[#D4AF37]" />
                          <h4 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                            {t('الإشعارات', 'Notifications')}
                          </h4>
                          {notifications.length > 0 && (
                            <span className="rounded-full bg-[#D4AF37]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#D4AF37]">
                              {notifications.length}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setNotificationsOpen(false)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center">
                            <Bell className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]/30" />
                            <p className="font-['Cairo'] text-xs text-[var(--text-muted)]">
                              {t('لا توجد إشعارات', 'No notifications')}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {notifications.map((notif) => (
                              <motion.div
                                key={notif.id}
                                layout
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.03]"
                              >
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                    notif.type === 'task'
                                      ? 'bg-red-500/10 text-red-400'
                                      : 'bg-blue-500/10 text-blue-400'
                                  }`}
                                >
                                  {notif.type === 'task' ? (
                                    <AlertCircle className="h-4 w-4" />
                                  ) : (
                                    <ClockIcon className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-['Cairo'] text-xs font-bold text-[var(--text-primary)]">
                                    {notif.title}
                                  </p>
                                  <p className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-secondary)]">
                                    {notif.description}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>

                      {notificationPermission === 'default' && (
                        <div className="border-t border-[var(--border-color)] p-2">
                          <button
                            onClick={handleEnableNotifications}
                            className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2 font-['Cairo'] text-xs font-bold text-[#0b1a2e] transition-all hover:shadow-lg"
                          >
                            {t('تفعيل إشعارات المتصفح', 'Enable browser notifications')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* المستخدم */}
              <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 sm:flex">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] font-mono text-[10px] font-bold text-[#0b1a2e]">
                  {(fullName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[120px] truncate font-['Cairo'] text-xs font-bold text-[var(--text-primary)]">
                  {fullName || t('مستخدم', 'User')}
                </span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* ============ KPIs ============ */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-tour="dashboard-stats">
          <KpiCard
            icon={Layers}
            value={stats.schedulesCount}
            label={t('عدد الجداول', 'Total schedules')}
            hint={t('خطة يومية', 'Daily plans')}
            accent="#D4AF37"
            delay={0.05}
          />
          <KpiCard
            icon={ListChecks}
            value={stats.remainingTasks}
            label={t('المهام المتبقية', 'Pending tasks')}
            hint={t('غير منجزة', 'Not completed')}
            accent="#3B82F6"
            delay={0.1}
          />
          <KpiCard
            icon={TimerIcon}
            value={stats.remainingSessions}
            label={t('الجلسات المتبقية', 'Remaining sessions')}
            hint={t('لم تبدأ بعد', 'Not started')}
            accent="#A855F7"
            delay={0.15}
          />
          <KpiCard
            icon={CheckCircle2}
            value={stats.completedSessions}
            label={t('الجلسات المنجزة', 'Completed sessions')}
            hint={t('مكتملة', 'Done')}
            accent="#10B981"
            delay={0.2}
          />
        </div>

        {/* ============ الشبكة الرئيسية ============ */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* المهام الهامة */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-3"
          >
            <div className="flex h-full flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                      {t('مهام هامة', 'Priority tasks')}
                    </h3>
                    <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                      {importantTasks.length} {t('مهام اليوم', 'today')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[340px] flex-1 space-y-2 overflow-y-auto pe-1">
                {importantTasks.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400/70" />
                    </div>
                    <p className="font-['Cairo'] text-xs text-[var(--text-muted)]">
                      {t('🎉 لا توجد مهام هامة اليوم', '🎉 No priority tasks today')}
                    </p>
                  </div>
                ) : (
                  importantTasks.map((task, i) => (
                    <ImportantTaskItem
                      key={task.id}
                      task={task}
                      language={language}
                      t={t}
                      index={i}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.aside>

          {/* منطقة المؤقت */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            data-tour="dashboard-timer"
            className="lg:col-span-6"
          >
            <div className="relative flex h-full min-h-[400px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/12 via-[var(--bg-card)] to-[var(--bg-card)] p-6">
              <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-[#D4AF37]/15 blur-3xl" />

              <div className="relative w-full text-center">
                <AnimatePresence mode="wait">
                  {isTimerActive && currentPhase ? (
                    <motion.div
                      key="timer"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center"
                    >
                      <CircularTimer
                        timeLeft={timerState.timeLeft}
                        totalDuration={totalDuration}
                        taskName={timerState.taskName || currentPhase.taskName || null}
                        scheduleTitle={timerState.scheduleTitle}
                        isPaused={isPaused}
                        phaseType={currentPhase.type}
                      />

                      <div className="mt-5 flex gap-2">
                        {isPaused ? (
                          <button
                            onClick={resumeTimer}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 font-['Cairo'] text-xs font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl"
                          >
                            <Play className="h-4 w-4" />
                            {t('استئناف', 'Resume')}
                          </button>
                        ) : (
                          <button
                            onClick={pauseTimer}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 font-['Cairo'] text-xs font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl"
                          >
                            <Pause className="h-4 w-4" />
                            {t('إيقاف', 'Pause')}
                          </button>
                        )}
                        <button
                          onClick={resetTimer}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-red-500/30 hover:text-red-400"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('إعادة', 'Reset')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/25 to-[#D4AF37]/5 shadow-xl shadow-[#D4AF37]/10"
                      >
                        <Play className="h-10 w-10 text-[#D4AF37] rtl:rotate-180" />
                      </motion.div>

                      <h3 className="font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
                        {t('ابدأ جلسة تركيز', 'Start a focus session')}
                      </h3>

                      {todaySchedule ? (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 font-['Cairo'] text-xs">
                            <Sparkles className="h-3 w-3 text-[#D4AF37]" />
                            <span className="text-[var(--text-secondary)]">
                              {todaySchedule.totalSessions} {t('جلسات', 'sessions')}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 font-['Cairo'] text-xs text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            {stats.completedSessions} {t('منجزة', 'done')}
                          </div>
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1 font-['Cairo'] text-xs text-blue-400">
                            <ClockIcon className="h-3 w-3" />
                            {stats.remainingSessions} {t('متبقية', 'left')}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 font-['Cairo'] text-sm text-[var(--text-muted)]">
                          {t('لا توجد جلسات اليوم', 'No sessions today')}
                        </p>
                      )}

                      <button
                        onClick={() =>
                          router.push(`/dashboard/schedule/${todaySchedule?.id || ''}`)
                        }
                        disabled={!todaySchedule}
                        className="mt-5 inline-flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-7 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:scale-[1.03] hover:shadow-xl hover:shadow-[#D4AF37]/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                      >
                        <Zap className="h-4 w-4" />
                        {t('ابدأ التركيز', 'Start focusing')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.section>

          {/* الجداول */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            data-tour="dashboard-schedules"
            className="lg:col-span-3"
          >
            <div className="flex h-full flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                      {t('جداولي', 'My schedules')}
                    </h3>
                    <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                      {schedules.length} {t('جدول', 'schedules')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/dashboard/schedule')}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[#D4AF37]"
                  title={t('الكل', 'All')}
                >
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </button>
              </div>

              <div className="max-h-[340px] flex-1 space-y-2 overflow-y-auto pe-1">
                {schedules.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37]/5">
                      <Calendar className="h-6 w-6 text-[#D4AF37]/50" />
                    </div>
                    <p className="font-['Cairo'] text-xs text-[var(--text-muted)]">
                      {t('لا توجد جداول', 'No schedules')}
                    </p>
                  </div>
                ) : (
                  schedules.slice(0, 6).map((s, i) => (
                    <MiniScheduleCard
                      key={s.id}
                      schedule={s}
                      isToday={s.day === today}
                      language={language}
                      t={t}
                      onView={() => router.push(`/dashboard/schedule/${s.id}`)}
                      onDelete={(e) => handleDeleteSchedule(s.id, e)}
                      index={i}
                    />
                  ))
                )}
              </div>

              <button
                data-tour="dashboard-add-schedule"
                onClick={() => router.push('/dashboard/planner')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 py-2.5 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-all hover:bg-[#D4AF37]/20"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('جدول جديد', 'New schedule')}
              </button>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}