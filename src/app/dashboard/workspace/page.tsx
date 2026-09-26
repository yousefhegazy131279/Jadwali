'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
  CheckCircle2, Circle, Calendar, Clock, BookOpen, Coffee,
  Sparkles, Search, X, FolderOpen, ArrowLeft, ListChecks,
  TrendingUp, Target, Zap, Flame, ChevronDown, ChevronRight,
  ExternalLink, Filter, LayoutGrid, ArrowUpDown, AlertCircle,
  CircleDot, Layers, Hash, Award, Coffee as CoffeeIcon,
} from 'lucide-react'

/* ============================================================
   الأنواع
   ============================================================ */
type Task = {
  id: string
  user_id: string
  schedule_id: string
  name: string
  type: 'study' | 'side' | 'custom'
  duration: number
  priority: 'high' | 'medium' | 'low'
  done: boolean
  created_at: string
}

type Schedule = {
  id: string
  title: string
  day: string
  start_time: string | null
  project_id: string | null
}

type Project = { id: string; name: string; color: string }

type SortKey = 'newest' | 'priority' | 'duration' | 'alpha'
type FilterType = 'all' | 'study' | 'side' | 'custom'
type FilterStatus = 'all' | 'pending' | 'done'

/* ============================================================
   أدوات
   ============================================================ */
function getLocalToday() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

const TYPE_META = {
  study: {
    labelAr: 'دراسة',
    labelEn: 'Study',
    icon: BookOpen,
    accent: '#D4AF37',
    bg: 'bg-[#D4AF37]/10',
  },
  side: {
    labelAr: 'جانبية',
    labelEn: 'Side',
    icon: Coffee,
    accent: '#3B82F6',
    bg: 'bg-blue-500/10',
  },
  custom: {
    labelAr: 'مخصصة',
    labelEn: 'Custom',
    icon: Sparkles,
    accent: '#A855F7',
    bg: 'bg-purple-500/10',
  },
} as const

const PRIORITY_META = {
  high: { labelAr: 'عالية', labelEn: 'High', color: '#EF4444', weight: 3 },
  medium: { labelAr: 'متوسطة', labelEn: 'Medium', color: '#F59E0B', weight: 2 },
  low: { labelAr: 'منخفضة', labelEn: 'Low', color: '#10B981', weight: 1 },
} as const

const hexToRgba = (hex: string, a: number) => {
  const c = (hex || '#D4AF37').replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/* ============================================================
   بطاقة KPI
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-all hover:shadow-xl"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: accent }}
      />
      <div className="relative">
        <div
          className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: hexToRgba(accent, 0.15), color: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">{value}</div>
        <div className="mt-0.5 font-['Cairo'] text-[11px] font-bold text-[var(--text-secondary)]">
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
   بطاقة مهمة محسّنة
   ============================================================ */
function TaskCard({
  task,
  schedule,
  project,
  language,
  t,
  onOpen,
  index,
}: {
  task: Task
  schedule?: Schedule
  project?: Project
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
  onOpen: () => void
  index: number
}) {
  const meta = TYPE_META[task.type] || TYPE_META.study
  const prio = PRIORITY_META[task.priority] || PRIORITY_META.medium
  const Icon = meta.icon
  const isToday = schedule?.day === getLocalToday()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.3 }}
      whileHover={{ x: 3 }}
      className={`group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-4 transition-all hover:shadow-lg ${
        task.done
          ? 'border-emerald-500/20 opacity-70 hover:opacity-100'
          : isToday
            ? 'border-[#D4AF37]/30'
            : 'border-[var(--border-color)] hover:border-[#D4AF37]/20'
      }`}
    >
      {/* شريط جانبي حسب النوع */}
      <div
        className="absolute inset-y-3 w-1 rounded-full ltr:left-0 rtl:right-0"
        style={{ background: meta.accent }}
      />

      {/* شارة "اليوم" */}
      {isToday && !task.done && (
        <div className="absolute right-3 top-0 rounded-b-lg bg-[#D4AF37] px-2 py-0.5 font-['Cairo'] text-[9px] font-bold text-[#0b1a2e] shadow-sm">
          {t('اليوم', 'Today')}
        </div>
      )}

      <div className="relative flex items-start gap-3">
        {/* أيقونة النوع */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: hexToRgba(meta.accent, 0.15), color: meta.accent }}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* الاسم */}
          <div className="flex items-start gap-2">
            <span
              className={`flex-1 font-['Cairo'] text-sm font-bold leading-tight ${
                task.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'
              }`}
            >
              {task.name}
            </span>
            {task.done && (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
              </div>
            )}
          </div>

          {/* المعلومات */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {/* النوع */}
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-['Cairo'] text-[10px] font-bold"
              style={{ background: hexToRgba(meta.accent, 0.12), color: meta.accent }}
            >
              <Icon className="h-2.5 w-2.5" />
              {language === 'ar' ? meta.labelAr : meta.labelEn}
            </span>

            {/* الأولوية */}
            {!task.done && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-['Cairo'] text-[10px] font-bold"
                style={{ background: hexToRgba(prio.color, 0.12), color: prio.color }}
              >
                <CircleDot className="h-2.5 w-2.5" />
                {language === 'ar' ? prio.labelAr : prio.labelEn}
              </span>
            )}

            {/* المدة */}
            {task.type === 'study' && task.duration > 0 && (
              <span className="inline-flex items-center gap-1 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                <Clock className="h-3 w-3" />
                {task.duration} {t('د', 'min')}
              </span>
            )}

            {/* الجدول */}
            {schedule && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen()
                }}
                className="inline-flex items-center gap-1 font-['Cairo'] text-[10px] text-[var(--text-muted)] transition-colors hover:text-[#D4AF37]"
                title={t('فتح الجدول', 'Open schedule')}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(schedule.day), 'd MMM', {
                  locale: language === 'ar' ? ar : enUS,
                })}
                <ExternalLink className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}

            {/* المشروع */}
            {project && (
              <span
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-['Cairo'] text-[10px] font-bold"
                style={{ background: hexToRgba(project.color, 0.12), color: project.color }}
              >
                <FolderOpen className="h-2.5 w-2.5" />
                {project.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   مجموعة قابلة للطي
   ============================================================ */
function TaskGroup({
  title,
  icon: Icon,
  accent,
  tasks,
  scheduleMap,
  projectMap,
  language,
  t,
  onOpenSchedule,
  defaultOpen = true,
  delay = 0,
}: {
  title: string
  icon: typeof Circle
  accent: string
  tasks: Task[]
  scheduleMap: Map<string, Schedule>
  projectMap: Map<string, Project>
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
  onOpenSchedule: (id: string) => void
  defaultOpen?: boolean
  delay?: number
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (tasks.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/40"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: hexToRgba(accent, 0.15), color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
            {title}
          </span>
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold"
            style={{ background: hexToRgba(accent, 0.12), color: accent }}
          >
            {tasks.length}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-[var(--border-color)] p-3">
              {tasks.map((task, i) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  schedule={task.schedule_id ? scheduleMap.get(task.schedule_id) : undefined}
                  project={
                    task.schedule_id
                      ? projectMap.get(scheduleMap.get(task.schedule_id)?.project_id || '')
                      : undefined
                  }
                  language={language}
                  t={t}
                  onOpen={() => onOpenSchedule(task.schedule_id)}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function WorkspacePage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { user } = useSupabase()

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortKey>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [today, setToday] = useState(getLocalToday)

  /* ====== مراقبة تغيّر اليوم ====== */
  useEffect(() => {
    const iv = setInterval(() => {
      const nt = getLocalToday()
      if (nt !== today) setToday(nt)
    }, 60000)
    return () => clearInterval(iv)
  }, [today])

  /* ====== الجلب ====== */
  useEffect(() => {
    if (user) void fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    const supabase = createClient()
    setLoading(true)
    try {
      const [tasksRes, schedulesRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('schedules')
          .select('id, title, day, start_time, project_id')
          .eq('user_id', user.id),
        supabase.from('projects').select('id, name, color').eq('user_id', user.id),
      ])

      if (tasksRes.error) throw tasksRes.error

      setTasks((tasksRes.data as Task[]) || [])
      setSchedules((schedulesRes.data as Schedule[]) || [])
      setProjects((projectsRes.data as Project[]) || [])
    } catch (e) {
      console.error(e)
      toast.error(t('تعذر تحميل البيانات', 'Failed to load data'))
    } finally {
      setLoading(false)
    }
  }

  /* ====== الخرائط ====== */
  const scheduleMap = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules])
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  /* ====== الفلترة ====== */
  const filteredTasks = useMemo(() => {
    let list = tasks

    // النوع
    if (filterType !== 'all') list = list.filter((x) => x.type === filterType)

    // الحالة
    if (filterStatus === 'pending') list = list.filter((x) => !x.done)
    if (filterStatus === 'done') list = list.filter((x) => x.done)

    // البحث
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      list = list.filter((x) => {
        if (x.name.toLowerCase().includes(q)) return true
        const sch = x.schedule_id ? scheduleMap.get(x.schedule_id) : null
        if (sch && sch.title.toLowerCase().includes(q)) return true
        return false
      })
    }

    // الترتيب
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sortBy === 'alpha') return a.name.localeCompare(b.name)
      if (sortBy === 'duration') return (b.duration || 0) - (a.duration || 0)
      if (sortBy === 'priority') {
        const wa = PRIORITY_META[a.priority]?.weight ?? 0
        const wb = PRIORITY_META[b.priority]?.weight ?? 0
        if (wb !== wa) return wb - wa
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      // newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return sorted
  }, [tasks, filterType, filterStatus, searchTerm, sortBy, scheduleMap])

  /* ====== التجميع ====== */
  const groups = useMemo(() => {
    const todayList: Task[] = []
    const upcoming: Task[] = []
    const later: Task[] = []
    const done: Task[] = []

    for (const task of filteredTasks) {
      if (task.done) {
        done.push(task)
        continue
      }
      const sch = task.schedule_id ? scheduleMap.get(task.schedule_id) : null
      if (!sch) {
        later.push(task)
        continue
      }
      if (sch.day === today) todayList.push(task)
      else if (sch.day > today) upcoming.push(task)
      else later.push(task) // past but not done
    }

    return { todayList, upcoming, later, done }
  }, [filteredTasks, scheduleMap, today])

  /* ====== الإحصائيات ====== */
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((x) => x.done).length
    const pending = total - done
    const totalMinutes = tasks
      .filter((x) => x.type === 'study')
      .reduce((s, x) => s + (x.duration || 0), 0)
    const todayTasks = tasks.filter((x) => {
      const sch = x.schedule_id ? scheduleMap.get(x.schedule_id) : null
      return sch && sch.day === today && !x.done
    }).length
    const highPriority = tasks.filter((x) => !x.done && x.priority === 'high').length
    const completion = total > 0 ? Math.round((done / total) * 100) : 0

    // By type
    const byType = {
      study: tasks.filter((x) => x.type === 'study').length,
      side: tasks.filter((x) => x.type === 'side').length,
      custom: tasks.filter((x) => x.type === 'custom').length,
    }

    return { total, done, pending, totalMinutes, todayTasks, highPriority, completion, byType }
  }, [tasks, scheduleMap, today])

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
            {t('جارٍ التحميل…', 'Loading…')}
          </p>
        </div>
      </div>
    )
  }

  /* ====== العرض ====== */
  return (
    <div className="space-y-6 p-3 sm:p-6">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-sky-500/5 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#D4AF37]/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-['Cairo'] text-xs text-sky-400">
              <LayoutGrid className="h-3.5 w-3.5" />
              {t('مساحة العمل الشاملة', 'Complete workspace')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('كل مهامك في مكان واحد', 'All your tasks in one place')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'تصفّح، ابحث، ورتّب مهامك من جميع الجداول. عرض مقيّد للقراءة فقط — للتعديل، افتح الجدول.',
                'Browse, search, and sort tasks from all schedules. Read-only view — to edit, open the schedule.'
              )}
            </p>
          </div>

          {/* حلقة التقدم */}
          <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 120 120" className="-rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="10" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - stats.completion / 100) }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-bold text-[#D4AF37]">
                  {stats.completion}%
                </span>
              </div>
            </div>
            <div>
              <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {t('نسبة الإنجاز', 'Completion')}
              </div>
              <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                {stats.done} / {stats.total}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            icon={ListChecks}
            value={stats.pending}
            label={t('مهام معلّقة', 'Pending tasks')}
            hint={t('بحاجة إلى إنجاز', 'Awaiting completion')}
            accent="#3B82F6"
            delay={0.05}
          />
          <KpiCard
            icon={CheckCircle2}
            value={stats.done}
            label={t('مهام منجزة', 'Completed')}
            hint={`${stats.completion}%`}
            accent="#10B981"
            delay={0.1}
          />
          <KpiCard
            icon={Flame}
            value={stats.highPriority}
            label={t('أولوية عالية', 'High priority')}
            hint={t('تحتاج اهتماماً', 'Needs attention')}
            accent="#EF4444"
            delay={0.15}
          />
          <KpiCard
            icon={Clock}
            value={`${Math.round(stats.totalMinutes / 60)}${t('س', 'h')}`}
            label={t('وقت الدراسة', 'Study time')}
            hint={`${stats.totalMinutes} ${t('دقيقة', 'min')}`}
            accent="#A855F7"
            delay={0.2}
          />
        </div>
      </motion.section>

      {/* ============ البحث والفلاتر ============ */}
      <div className="flex flex-col gap-3">
        {/* السطر الأول: البحث */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={t('ابحث باسم المهمة أو الجدول…', 'Search by task or schedule name…')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-3 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none ltr:pl-10 ltr:pr-10 rtl:pr-10 rtl:pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)] ltr:right-2 rtl:left-2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* السطر الثاني: الفلاتر والترتيب */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* الفلاتر */}
          <div className="flex flex-wrap items-center gap-2">
            {/* نوع */}
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
              {(
                [
                  { key: 'all', labelAr: 'الكل', labelEn: 'All', icon: Layers },
                  { key: 'study', labelAr: 'دراسة', labelEn: 'Study', icon: BookOpen },
                  { key: 'side', labelAr: 'جانبية', labelEn: 'Side', icon: Coffee },
                  { key: 'custom', labelAr: 'مخصصة', labelEn: 'Custom', icon: Sparkles },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon
                const active = filterType === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilterType(opt.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-['Cairo'] text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {language === 'ar' ? opt.labelAr : opt.labelEn}
                  </button>
                )
              })}
            </div>

            {/* الحالة */}
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
              {(
                [
                  { key: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { key: 'pending', labelAr: 'معلّقة', labelEn: 'Pending' },
                  { key: 'done', labelAr: 'منجزة', labelEn: 'Done' },
                ] as const
              ).map((opt) => {
                const active = filterStatus === opt.key
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFilterStatus(opt.key)}
                    className={`rounded-lg px-3 py-1.5 font-['Cairo'] text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-[#D4AF37] text-[#0b1a2e] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    {language === 'ar' ? opt.labelAr : opt.labelEn}
                  </button>
                )
              })}
            </div>
          </div>

          {/* الترتيب */}
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
            <ArrowUpDown className="ms-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            {(
              [
                { key: 'newest', labelAr: 'الأحدث', labelEn: 'Newest' },
                { key: 'priority', labelAr: 'الأولوية', labelEn: 'Priority' },
                { key: 'duration', labelAr: 'المدة', labelEn: 'Duration' },
                { key: 'alpha', labelAr: 'أبجدي', labelEn: 'A-Z' },
              ] as const
            ).map((opt) => {
              const active = sortBy === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`rounded-lg px-2.5 py-1.5 font-['Cairo'] text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-[#D4AF37] text-[#0b1a2e] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  {language === 'ar' ? opt.labelAr : opt.labelEn}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ============ المحتوى ============ */}
      {filteredTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500/15 to-sky-500/5"
          >
            <ListChecks className="h-9 w-9 text-sky-400/70" />
          </motion.div>
          <h3 className="mb-2 font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
            {tasks.length === 0
              ? t('لا توجد مهام بعد', 'No tasks yet')
              : t('لا توجد نتائج مطابقة', 'No matching results')}
          </h3>
          <p className="mx-auto max-w-md font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {tasks.length === 0
              ? t(
                  'أنشئ جدولاً من المخطط الذكي وأضف مهامك لتبدأ.',
                  'Create a schedule from the planner and add your tasks to begin.'
                )
              : t('جرّب تعديل البحث أو الفلاتر.', 'Try adjusting the search or filters.')}
          </p>
          {tasks.length === 0 ? (
            <button
              onClick={() => router.push('/dashboard/planner')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-6 py-3 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4" />
              {t('اذهب للمخطط', 'Go to planner')}
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterType('all')
                setFilterStatus('all')
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-white/5"
            >
              <X className="h-4 w-4" />
              {t('إعادة تعيين الفلاتر', 'Reset filters')}
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* إحصائيات مصغّرة */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 font-['Cairo'] text-xs text-[var(--text-secondary)]">
            <Award className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>{filteredTasks.length} {t('نتيجة', 'results')}</span>
            <span className="text-white/10">•</span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className="h-3 w-3 text-[#D4AF37]" />
              {stats.byType.study}
            </span>
            <span className="inline-flex items-center gap-1">
              <Coffee className="h-3 w-3 text-blue-400" />
              {stats.byType.side}
            </span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-400" />
              {stats.byType.custom}
            </span>
          </div>

          {/* المجموعات */}
          <TaskGroup
            title={t('اليوم', 'Today')}
            icon={Flame}
            accent="#EF4444"
            tasks={groups.todayList}
            scheduleMap={scheduleMap}
            projectMap={projectMap}
            language={language}
            t={t}
            onOpenSchedule={(id) => router.push(`/dashboard/schedule/${id}`)}
            delay={0.1}
          />

          <TaskGroup
            title={t('القادمة', 'Upcoming')}
            icon={Calendar}
            accent="#3B82F6"
            tasks={groups.upcoming}
            scheduleMap={scheduleMap}
            projectMap={projectMap}
            language={language}
            t={t}
            onOpenSchedule={(id) => router.push(`/dashboard/schedule/${id}`)}
            delay={0.15}
          />

          <TaskGroup
            title={t('غير مجدولة', 'Unscheduled')}
            icon={CircleDot}
            accent="#78716C"
            tasks={groups.later}
            scheduleMap={scheduleMap}
            projectMap={projectMap}
            language={language}
            t={t}
            onOpenSchedule={(id) => router.push(`/dashboard/schedule/${id}`)}
            defaultOpen={false}
            delay={0.2}
          />

          <TaskGroup
            title={t('منجزة', 'Completed')}
            icon={CheckCircle2}
            accent="#10B981"
            tasks={groups.done}
            scheduleMap={scheduleMap}
            projectMap={projectMap}
            language={language}
            t={t}
            onOpenSchedule={(id) => router.push(`/dashboard/schedule/${id}`)}
            defaultOpen={false}
            delay={0.25}
          />
        </div>
      )}
    </div>
  )
}