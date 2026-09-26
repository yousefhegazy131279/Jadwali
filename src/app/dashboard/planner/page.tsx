'use client'

import { formatTime12 } from '@/lib/time'
import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import ProjectPicker from '@/components/ProjectPicker'
import AIChat from '@/components/AIChat'
import { DEFAULT_PRAYER_TIMES, PRAYER_NAMES, normalizePrayerTimes } from '@/lib/preferences'
import { useRouter } from 'next/navigation'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import {
  Plus,
  X,
  Loader2,
  Coffee,
  Moon,
  Calendar,
  Zap,
  Timer,
  Tag,
  Sparkles,
  RefreshCw,
  Clock,
  ListChecks,
  ChevronDown,
  Settings2,
  Info,
  Sun,
  Sunrise,
  Sunset,
  Sunrise as SunriseIcon,
  MoonStar,
} from 'lucide-react'

// ==================== Types ====================
type TaskItem = {
  id: string
  category: string
  name: string
  duration: number
}

type SideTask = {
  id: string
  name: string
}

type Prayer = {
  name: string
  time: string
}

type PomodoroSettings = {
  workDuration: number
  shortBreak: number
  longBreak: number
  cyclesBeforeLong: number
}

// ==================== Notification helpers ====================
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch {
    return false
  }
}

function sendBrowserNotification(title: string, body: string) {
  try {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' })
    }
  } catch (e) {
    console.error('Browser notification failed', e)
  }
}

async function createAppNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'info'
) {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      read: false,
    })
    if (error) console.error('Notification insert failed:', error)
  } catch (e) {
    console.error('Notification error', e)
  }
}

// ==================== Section Card ====================
function SectionCard({
  icon: Icon,
  title,
  badge,
  action,
  children,
  delay = 0,
  accent = 'gold',
}: {
  icon: any
  title: string
  badge?: string
  action?: React.ReactNode
  children: React.ReactNode
  delay?: number
  accent?: 'gold' | 'blue' | 'purple' | 'emerald'
}) {
  const accents = {
    gold: 'from-[#D4AF37]/15 to-transparent text-[#D4AF37]',
    blue: 'from-blue-500/15 to-transparent text-blue-400',
    purple: 'from-purple-500/15 to-transparent text-purple-400',
    emerald: 'from-emerald-500/15 to-transparent text-emerald-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accents[accent]} opacity-60`} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${accents[accent]} border border-[var(--border-color)] flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri'] truncate">
            {title}
          </h2>
          {badge && (
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-full font-['Cairo'] border border-[var(--border-color)]">
              {badge}
            </span>
          )}
        </div>
        {action}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">{children}</div>
    </motion.div>
  )
}

// ==================== Input Field ====================
function FormInput({
  label,
  icon: Icon,
  ...props
}: {
  label: string
  icon?: any
  [key: string]: any
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="flex items-center gap-1.5 text-xs font-['Cairo'] text-[var(--text-secondary)] font-medium">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#D4AF37]" />}
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all duration-200 font-['Cairo'] ${props.className || ''}`}
      />
    </div>
  )
}

// ==================== Task Input Row ====================
function TaskInput({ task, onUpdate, onRemove, index }: any) {
  const { t: tr } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] hover:border-[#D4AF37]/30 transition-all duration-300"
    >
      {/* Number badge */}
      <div className="hidden sm:flex w-6 h-6 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#D4AF37] font-['Cairo']">
        {index + 1}
      </div>

      <input
        type="text"
        placeholder={tr('التصنيف')}
        value={task.category}
        onChange={(e) => onUpdate(task.id, 'category', e.target.value)}
        className="w-full sm:w-28 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-200 font-['Cairo'] text-sm"
      />
      <input
        type="text"
        data-tour="planner-task"
        placeholder={tr('اسم المهمة')}
        value={task.name}
        onChange={(e) => onUpdate(task.id, 'name', e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-200 font-['Cairo'] text-sm"
      />
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="number"
            placeholder="0"
            value={task.duration}
            onChange={(e) => onUpdate(task.id, 'duration', parseFloat(e.target.value) || 0)}
            min="0.5"
            step="0.5"
            className="w-20 px-3 py-2 pe-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-200 font-['Cairo'] text-sm text-center"
          />
          <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-['Cairo'] pointer-events-none">
            {tr('س', 'h')}
          </span>
        </div>
        <button
          onClick={() => onRemove(task.id)}
          className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-all duration-200 opacity-60 group-hover:opacity-100"
          title={tr('حذف المهمة')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ==================== Side Task Input Row ====================
function SideTaskInput({ task, onUpdate, onRemove, index }: any) {
  const { t: tr } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group relative flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] hover:border-blue-500/30 transition-all duration-300"
    >
      <div className="hidden sm:flex w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 items-center justify-center flex-shrink-0">
        <Coffee className="w-3 h-3 text-blue-400" />
      </div>
      <input
        type="text"
        placeholder={tr('اسم العمل الجانبي')}
        value={task.name}
        onChange={(e) => onUpdate(task.id, 'name', e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all duration-200 font-['Cairo'] text-sm"
      />
      <button
        onClick={() => onRemove(task.id)}
        className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-all duration-200 opacity-60 group-hover:opacity-100"
        title={tr('حذف العمل الجانبي')}
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ==================== Prayer Icon ====================
function PrayerIcon({ name }: { name: string }) {
  const icons: any = {
    الفجر: Sunrise,
    Fajr: Sunrise,
    الظهر: Sun,
    Dhuhr: Sun,
    العصر: Sunset,
    Asr: Sunset,
    المغرب: Sunset,
    Maghrib: Sunset,
    العشاء: MoonStar,
    Isha: MoonStar,
  }
  const Icon = icons[name] || Moon
  return <Icon className="w-4 h-4 text-[#D4AF37]" />
}

// ==================== Main Page ====================
export default function PlannerPage() {
  const { t: tr, language } = useLanguage()
  const { user } = useSupabase()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const [date, setDate] = useState(todayStr)
  const [startTime, setStartTime] = useState('08:00')
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: crypto.randomUUID(), category: tr('دراسة'), name: '', duration: 2 },
  ])
  const [sideTasks, setSideTasks] = useState<SideTask[]>([
    { id: crypto.randomUUID(), name: '' },
  ])

  const [pomodoro, setPomodoro] = useState<PomodoroSettings>({
    workDuration: 50,
    shortBreak: 10,
    longBreak: 30,
    cyclesBeforeLong: 4,
  })

  const [prayerTimes, setPrayerTimes] = useState(DEFAULT_PRAYER_TIMES)
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const prayers: Prayer[] = PRAYER_NAMES.map((name, i) => ({
    name,
    time: prayerTimes[i],
  }))

  // ==================== Load preferences ====================
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      const { data, error } = await createClient()
        .from('settings')
        .select('prayer_times,pomodoro')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        toast.error(tr('تعذر تحميل الإعدادات'))
        return
      }
      setPrayerTimes(normalizePrayerTimes(data?.prayer_times))
      if (data?.pomodoro) {
        setPomodoro({
          ...data.pomodoro,
          workDuration:
            data.pomodoro.workDuration ?? data.pomodoro.sessionDuration ?? 50,
        })
      }
      setPreferencesReady(true)
    }
    void load()
    window.addEventListener('focus', load)
    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
    }
  }, [user?.id])

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, mirror: true })
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      requestNotificationPermission()
    }
  }, [])

  // ==================== Task handlers ====================
  const addTask = () =>
    setTasks([...tasks, { id: crypto.randomUUID(), category: '', name: '', duration: 2 }])

  const updateTask = (id: string, field: keyof TaskItem, value: any) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const removeTask = (id: string) => {
    if (tasks.length <= 1) return
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const addSideTask = () =>
    setSideTasks([...sideTasks, { id: crypto.randomUUID(), name: '' }])

  const updateSideTask = (id: string, field: keyof SideTask, value: any) => {
    setSideTasks(sideTasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
  }

  const removeSideTask = (id: string) => {
    if (sideTasks.length <= 1) return
    setSideTasks(sideTasks.filter((t) => t.id !== id))
  }

  const updatePomodoro = (key: keyof PomodoroSettings, value: number) => {
    setPomodoro({ ...pomodoro, [key]: value })
  }

  // ==================== AI apply handler ====================
  const handleApplyAIDraft = useCallback(
    (draft: any) => {
      if (draft.title) setTitle(draft.title)
      if (draft.date && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)) setDate(draft.date)
      if (draft.start_time && /^([01]\d|2[0-3]):[0-5]\d$/.test(draft.start_time)) {
        setStartTime(draft.start_time)
      }

      if (Array.isArray(draft.tasks) && draft.tasks.length > 0) {
        const newTasks: TaskItem[] = draft.tasks.map((task: any) => ({
          id: crypto.randomUUID(),
          name: task.name || '',
          category: task.category || tr('عام'),
          duration: Math.max(
            0.5,
            Number(task.duration_minutes || task.duration || 60) / 60
          ),
        }))
        setTasks(newTasks)
      }

      if (Array.isArray(draft.sideTasks) && draft.sideTasks.length > 0) {
        const newSideTasks: SideTask[] = draft.sideTasks
          .filter((s: any) => s?.name)
          .map((s: any) => ({ id: crypto.randomUUID(), name: s.name }))
        if (newSideTasks.length > 0) setSideTasks(newSideTasks)
      }

      toast.success(
        tr(
          '✨ تم تطبيق اقتراح جَدْوُولْ! راجعه قبل الإنشاء',
          '✨ Jadwool suggestion applied! Review before creating.'
        )
      )
    },
    [tr]
  )

  // ==================== Validation ====================
  const validateDateTime = () => {
    const selectedDateTime = new Date(`${date}T${startTime}`)
    const now = new Date()

    if (selectedDateTime <= now) {
      toast.error(tr('لا يمكن إنشاء جدول في الماضي. اختر وقتاً مستقبلياً.'))
      return false
    }

    if (date === todayStr && startTime <= currentTimeStr) {
      toast.error(tr('وقت البدء يجب أن يكون بعد الوقت الحالي.'))
      return false
    }

    return true
  }

  const resetForm = () => {
    if (
      !confirm(
        tr('هل أنت متأكد من مسح كل البيانات؟', 'Are you sure you want to clear all fields?')
      )
    )
      return
    setTitle('')
    setTasks([{ id: crypto.randomUUID(), category: tr('دراسة'), name: '', duration: 2 }])
    setSideTasks([{ id: crypto.randomUUID(), name: '' }])
    setStartTime('08:00')
    setDate(todayStr)
    toast.success(tr('تم مسح النموذج'))
  }

  // ==================== Generate schedule ====================
  const handleGenerate = async () => {
    if (!user || !preferencesReady || generating) return
    if (!validateDateTime()) return

    const validTasks = tasks.some(
      (t) => t.category.trim().length > 0 && t.name.trim().length > 0 && t.duration > 0
    )
    if (!validTasks) {
      toast.error(tr('أضف مهمة واحدة على الأقل مع تصنيف واسم ومدة صحيحة'))
      return
    }

    if (!title.trim()) {
      toast.error(tr('أدخل عنواناً للجدول'))
      return
    }

    if (
      !Object.values(pomodoro).every((n) => Number.isInteger(n) && n > 0) ||
      pomodoro.workDuration > 120 ||
      pomodoro.shortBreak > 30 ||
      pomodoro.longBreak > 60 ||
      pomodoro.cyclesBeforeLong > 10
    ) {
      toast.error(tr('تحقق من إعدادات بومودورو'))
      return
    }

    setGenerating(true)

    try {
      const supabase = createClient()

      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          day: date,
          start_time: startTime,
          pomodoro: pomodoro,
          project_id: projectId || null,
        })
        .select()
        .single()

      if (scheduleError) throw scheduleError

      const tasksToInsert = tasks
        .filter(
          (t) =>
            t.category.trim().length > 0 && t.name.trim().length > 0 && t.duration > 0
        )
        .map((t) => ({
          user_id: user?.id,
          schedule_id: schedule.id,
          name: t.name.trim(),
          category: t.category.trim(),
          duration: t.duration * 60,
          type: 'task',
          priority: 'high',
          done: false,
          completed_sessions: 0,
        }))

      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').insert(tasksToInsert)
        if (tasksError) throw tasksError
      }

      const sideTasksToInsert = sideTasks
        .filter((t) => t.name.trim().length > 0)
        .map((t) => ({
          user_id: user?.id,
          schedule_id: schedule.id,
          name: t.name.trim(),
          category: tr('جانبي'),
          duration: 0,
          type: 'side',
          priority: 'low',
          done: false,
          completed_sessions: 0,
        }))

      if (sideTasksToInsert.length > 0) {
        const { error: sideError } = await supabase
          .from('tasks')
          .insert(sideTasksToInsert)
        if (sideError) throw sideError
      }

      const prayersToInsert = prayers.map((p) => ({
        user_id: user?.id,
        schedule_id: schedule.id,
        day: date,
        name: p.name,
        time: p.time,
        done: false,
      }))

      const { error: prayerError } = await supabase
        .from('prayers')
        .insert(prayersToInsert)
      if (prayerError) throw prayerError

      if (user?.id) {
        const notificationTitle = tr('✅ تم إنشاء الجدول بنجاح')
        const notificationBody =
          language === 'ar'
            ? `جدول "${title.trim()}" بتاريخ ${date} يبدأ الساعة ${formatTime12(startTime, language)}.`
            : `Schedule "${title.trim()}" on ${date} starts at ${formatTime12(startTime, language)}.`
        sendBrowserNotification(notificationTitle, notificationBody)
        await createAppNotification(user.id, notificationTitle, notificationBody, 'success')
      }

      toast.success(tr('✅ تم إنشاء الجدول بنجاح!'))
      router.push('/dashboard/schedule')
    } catch (error: any) {
      console.error(error)
      toast.error(`${tr('حدث خطأ', 'An error occurred')}: ${error.message || tr('غير معروف')}`)
    } finally {
      setGenerating(false)
    }
  }

  // ==================== Render ====================
  return (
    <div
      className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* ===== Header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 via-[var(--bg-card)] to-blue-500/5 border border-[var(--border-color)] p-6 sm:p-8 shadow-lg"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="p-3 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-lg flex-shrink-0"
            >
              <Sparkles className="w-6 h-6 text-[#0b1a2e]" />
            </motion.div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">
                {tr('📋 المخطط الذكي')}
              </h1>
              <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1">
                {tr(
                  'أنشئ جدولاً يومياً متكاملاً مع مهامك وصلواتك',
                  'Build a complete daily schedule with tasks and prayers'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all font-['Cairo'] text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {tr('مسح الكل', 'Reset')}
          </button>
        </div>
      </motion.div>

      {/* ===== AI Chat ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AIChat date={date} onApply={handleApplyAIDraft} />
      </motion.div>

      {/* ===== Project Picker ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <ProjectPicker value={projectId} onChange={setProjectId} />
      </motion.div>

      {/* ===== Main Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===== Left Column (Tasks & Info) ===== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Info */}
          <SectionCard
            icon={Calendar}
            title={tr('معلومات الجدول', 'Schedule Info')}
            delay={0.2}
            accent="gold"
          >
            <div className="space-y-4">
              <FormInput
                label={tr('عنوان الجدول *', 'Schedule title *')}
                data-tour="planner-title"
                type="text"
                value={title}
                onChange={(e: any) => setTitle(e.target.value)}
                placeholder={tr('مثال: يوم عمل مكثف', 'e.g. Intensive work day')}
                icon={Tag}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  label={tr('التاريخ', 'Date')}
                  icon={Calendar}
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={(e: any) => setDate(e.target.value)}
                />
                <FormInput
                  label={tr('وقت البدء', 'Start time')}
                  icon={Clock}
                  type="time"
                  value={startTime}
                  onChange={(e: any) => setStartTime(e.target.value)}
                  min={date === todayStr ? currentTimeStr : undefined}
                />
              </div>
            </div>
          </SectionCard>

          {/* Main Tasks */}
          <SectionCard
            icon={ListChecks}
            title={tr('المهام الأساسية', 'Main Tasks')}
            badge={`${tasks.length} ${tr('مهام', 'tasks')}`}
            delay={0.25}
            accent="gold"
            action={
              <button
                onClick={addTask}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 transition-all duration-200 font-['Cairo'] text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {tr('إضافة', 'Add')}
              </button>
            }
          >
            <div className="space-y-2.5">
              <AnimatePresence>
                {tasks.map((task, idx) => (
                  <TaskInput
                    key={task.id}
                    task={task}
                    index={idx}
                    onUpdate={updateTask}
                    onRemove={removeTask}
                  />
                ))}
              </AnimatePresence>
              {tasks.length === 0 && (
                <div className="text-center py-6 text-[var(--text-muted)] font-['Cairo'] text-sm">
                  {tr('لا توجد مهام بعد', 'No tasks yet')}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Side Tasks */}
          <SectionCard
            icon={Coffee}
            title={tr('الأعمال الجانبية', 'Side Tasks')}
            badge={`${sideTasks.length} ${tr('أعمال', 'items')}`}
            delay={0.3}
            accent="blue"
            action={
              <button
                onClick={addSideTask}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all duration-200 font-['Cairo'] text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {tr('إضافة', 'Add')}
              </button>
            }
          >
            <div className="space-y-2.5">
              <AnimatePresence>
                {sideTasks.map((task, idx) => (
                  <SideTaskInput
                    key={task.id}
                    task={task}
                    index={idx}
                    onUpdate={updateSideTask}
                    onRemove={removeSideTask}
                  />
                ))}
              </AnimatePresence>
              {sideTasks.length === 0 && (
                <div className="text-center py-6 text-[var(--text-muted)] font-['Cairo'] text-sm">
                  {tr('لا توجد أعمال جانبية', 'No side tasks yet')}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ===== Right Column (Settings & Prayers) ===== */}
        <div className="lg:col-span-1 space-y-6">
          {/* Pomodoro Settings - Collapsible */}
          <SectionCard
            icon={Timer}
            title={tr('إعدادات بومودورو', 'Pomodoro Settings')}
            delay={0.35}
            accent="purple"
            action={
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
              >
                <motion.div animate={{ rotate: showSettings ? 180 : 0 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>
            }
          >
            <AnimatePresence initial={false}>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {[
                      {
                        label: tr('مدة العمل', 'Work'),
                        key: 'workDuration',
                        value: pomodoro.workDuration,
                        min: 1,
                        max: 60,
                        suffix: tr('د', 'min'),
                      },
                      {
                        label: tr('راحة قصيرة', 'Short break'),
                        key: 'shortBreak',
                        value: pomodoro.shortBreak,
                        min: 1,
                        max: 30,
                        suffix: tr('د', 'min'),
                      },
                      {
                        label: tr('راحة طويلة', 'Long break'),
                        key: 'longBreak',
                        value: pomodoro.longBreak,
                        min: 1,
                        max: 60,
                        suffix: tr('د', 'min'),
                      },
                      {
                        label: tr('الدورات', 'Cycles'),
                        key: 'cyclesBeforeLong',
                        value: pomodoro.cyclesBeforeLong,
                        min: 2,
                        max: 10,
                        suffix: tr('دورة', 'cyc'),
                      },
                    ].map((item) => (
                      <div key={item.key} className="space-y-1.5">
                        <label className="block text-[11px] text-[var(--text-secondary)] font-['Cairo']">
                          {item.label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={item.min}
                            max={item.max}
                            value={item.value}
                            onChange={(e) =>
                              updatePomodoro(
                                item.key as keyof PomodoroSettings,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full px-3 py-2 pe-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-200 font-['Cairo'] text-sm text-center"
                          />
                          <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-['Cairo'] pointer-events-none">
                            {item.suffix}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compact preview when collapsed */}
            {!showSettings && (
              <div className="flex flex-wrap gap-2 text-xs font-['Cairo']">
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {pomodoro.workDuration} {tr('د عمل', 'min work')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {pomodoro.shortBreak} {tr('د راحة', 'min break')}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {pomodoro.cyclesBeforeLong} {tr('دورات', 'cycles')}
                </span>
              </div>
            )}
          </SectionCard>

          {/* Prayer Times */}
          <SectionCard
            icon={Moon}
            title={tr('مواقيت الصلاة', 'Prayer Times')}
            delay={0.4}
            accent="emerald"
          >
            <div className="space-y-2">
              {prayers.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/5 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2">
                    <PrayerIcon name={p.name} />
                    <span className="text-sm text-[var(--text-primary)] font-['Cairo'] font-medium">
                      {tr(p.name)}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-secondary)] font-['Cairo'] tabular-nums">
                    {formatTime12(p.time, language)}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
                {tr(
                  'يمكنك تغيير مواقيت الصلاة من صفحة الإعدادات',
                  'You can change prayer times from Settings page'
                )}
              </p>
            </div>
          </SectionCard>

          {/* Generate Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="sticky bottom-4"
          >
            <motion.button
              data-tour="planner-create"
              onClick={handleGenerate}
              disabled={generating || !preferencesReady}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-2xl hover:shadow-[#D4AF37]/40 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg overflow-hidden group"
            >
              {/* Shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />

              <span className="relative flex items-center gap-2">
                {generating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {tr('جارٍ الإنشاء...', 'Creating...')}
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    {tr('إنشاء الجدول', 'Create Schedule')}
                  </>
                )}
              </span>
            </motion.button>

            {!preferencesReady && (
              <p className="text-center text-xs text-[var(--text-muted)] font-['Cairo'] mt-2">
                {tr('جارٍ تحميل إعداداتك...', 'Loading your settings...')}
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}