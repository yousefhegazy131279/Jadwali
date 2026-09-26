'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { summarizeTasks, dailySessions } from '@/lib/analytics'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  TrendingUp, Target, Zap, Clock, CheckCircle2, Calendar, Award, Flame,
  FolderOpen, BookOpen, Sparkles, Trophy, Activity, Layers,
  CalendarDays, PieChart as PieIcon, BarChart3, Star, CircleDot,
  ChevronDown, ChevronUp, ArrowUpRight, Filter, Loader2, AlertCircle,
} from 'lucide-react'

/* ============================================================
   الأنواع
   ============================================================ */
type TaskRow = {
  id: string
  done: boolean
  category: string | null
  duration: number
  completed_sessions: number | null
  schedule_id: string | null
}

type ScheduleRow = {
  id: string
  title: string
  day: string
  project_id: string | null
  pomodoro: { workDuration: number } | null
}

type ProgressEvent = { completed_at: string }
type ProjectRow = { id: string; name: string; color: string }

type Range = '7d' | '28d' | '90d'
type ChartMode = 'daily' | 'weekly'

/* ============================================================
   أدوات
   ============================================================ */
const CATEGORY_COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#06B6D4', '#84CC16']

const hexToRgba = (hex: string, alpha: number) => {
  const c = (hex || '#D4AF37').replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ============================================================
   Tooltip مخصص للرسوم
   ============================================================ */
function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 shadow-xl backdrop-blur-xl">
      <div className="mb-1 font-['Cairo'] text-[10px] text-[var(--text-muted)]">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 font-['Cairo'] text-xs">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-[var(--text-secondary)]">{p.name}:</span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {p.value}{suffix || ''}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================
   بطاقة KPI
   ============================================================ */
function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  delta,
  delay = 0,
}: {
  icon: typeof Target
  label: string
  value: string | number
  hint?: string
  accent: string
  delta?: number
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-4 transition-all hover:shadow-lg"
      style={{ borderColor: hexToRgba(accent, 0.2) }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: accent }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: hexToRgba(accent, 0.15), color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
          {typeof delta === 'number' && (
            <div
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                delta >= 0
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {delta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : null}
              {delta >= 0 ? '+' : ''}{delta}%
            </div>
          )}
        </div>
        <div className="mt-3 font-mono text-2xl font-bold text-[var(--text-primary)]">
          {value}
        </div>
        <div className="mt-0.5 font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </div>
        {hint && (
          <div className="mt-1 font-['Cairo'] text-[10px] text-[var(--text-secondary)]">
            {hint}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ============================================================
   خريطة النشاط (Heatmap)
   ============================================================ */
function ActivityHeatmap({
  days,
  language,
  t,
}: {
  days: { date: Date; sessions: number }[]
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
}) {
  const max = Math.max(1, ...days.map((d) => d.sessions))
  const getIntensity = (n: number) => {
    if (n === 0) return 'bg-white/[0.03]'
    const ratio = n / max
    if (ratio > 0.75) return 'bg-[#D4AF37]'
    if (ratio > 0.5) return 'bg-[#D4AF37]/70'
    if (ratio > 0.25) return 'bg-[#D4AF37]/45'
    return 'bg-[#D4AF37]/25'
  }

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-[#D4AF37]" />
        <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
          {t('خريطة النشاط', 'Activity heatmap')}
        </h3>
        <span className="ms-auto font-['Cairo'] text-[10px] text-[var(--text-muted)]">
          {t('آخر 28 يوماً', 'Last 28 days')}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.01 }}
            className={`group relative aspect-square rounded-lg ${getIntensity(d.sessions)} transition-transform hover:scale-110`}
            title={`${format(d.date, 'd MMM', { locale: language === 'ar' ? ar : enUS })} — ${d.sessions} ${t('جلسة', 'sessions')}`}
          >
            <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 font-['Cairo'] text-[10px] opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              {format(d.date, 'd MMM', { locale: language === 'ar' ? ar : enUS })} · {d.sessions}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-1.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
        <span>{t('أقل', 'Less')}</span>
        <div className="h-3 w-3 rounded bg-white/[0.03]" />
        <div className="h-3 w-3 rounded bg-[#D4AF37]/25" />
        <div className="h-3 w-3 rounded bg-[#D4AF37]/45" />
        <div className="h-3 w-3 rounded bg-[#D4AF37]/70" />
        <div className="h-3 w-3 rounded bg-[#D4AF37]" />
        <span>{t('أكثر', 'More')}</span>
      </div>
    </div>
  )
}

/* ============================================================
   بطاقة مشروع في لوحة الأداء
   ============================================================ */
function ProjectPerformanceCard({
  project,
  index,
  t,
}: {
  project: { id: string; name: string; color: string; sessions: number; hours: number; tasksDone: number; tasksTotal: number; schedulesCount: number }
  index: number
  t: (ar: string, en?: string) => string
}) {
  const progress = project.tasksTotal > 0 ? Math.round((project.tasksDone / project.tasksTotal) * 100) : 0
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ x: 3 }}
      className="relative overflow-hidden rounded-xl border bg-[var(--bg-secondary)]/50 p-3.5"
      style={{ borderColor: hexToRgba(project.color, 0.25) }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: hexToRgba(project.color, 0.15) }}
        >
          <FolderOpen className="h-4 w-4" style={{ color: project.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
              {project.name}
            </span>
            <span className="shrink-0 font-mono text-xs font-bold" style={{ color: project.color }}>
              {progress}%
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            <span>{project.schedulesCount} {t('جدول', 'schedules')}</span>
            <span className="text-white/10">·</span>
            <span>{project.sessions} {t('جلسة', 'sessions')}</span>
            <span className="text-white/10">·</span>
            <span>{project.hours.toFixed(1)}{t('س', 'h')}</span>
          </div>
        </div>
      </div>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${project.color}, ${hexToRgba(project.color, 0.5)})` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, delay: 0.15 + index * 0.05 }}
        />
      </div>
    </motion.div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function AnalyticsPage() {
  const { user, supabase } = useSupabase()
  const { t, language } = useLanguage()

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [range, setRange] = useState<Range>('28d')
  const [chartMode, setChartMode] = useState<ChartMode>('daily')
  const [showTable, setShowTable] = useState(false)

  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [events, setEvents] = useState<ProgressEvent[]>([])
  const [projects, setProjects] = useState<ProjectRow[]>([])

  /* ====== جلب البيانات ====== */
  useEffect(() => {
    if (!user) return
    let active = true

    const load = async () => {
      const since = subDays(new Date(), 90)

      const [tasksRes, schedulesRes, eventsRes, projectsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, done, category, duration, completed_sessions, schedule_id')
          .eq('user_id', user.id),
        supabase
          .from('schedules')
          .select('id, title, day, project_id, pomodoro')
          .eq('user_id', user.id),
        supabase
          .from('task_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', since.toISOString()),
        supabase.from('projects').select('id, name, color').eq('user_id', user.id),
      ])

      if (!active) return

      if (tasksRes.error || schedulesRes.error || eventsRes.error || projectsRes.error) {
        console.error(tasksRes.error, schedulesRes.error, eventsRes.error, projectsRes.error)
        setStatus('error')
        return
      }

      setTasks((tasksRes.data as TaskRow[]) ?? [])
      setSchedules((schedulesRes.data as ScheduleRow[]) ?? [])
      setEvents((eventsRes.data as ProgressEvent[]) ?? [])
      setProjects((projectsRes.data as ProjectRow[]) ?? [])
      setStatus('ready')
    }

    void load()
    const refresh = () => void load()
    window.addEventListener('focus', refresh)
    window.addEventListener('jadwali-progress', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('jadwali-progress', refresh)
    }
  }, [user?.id, supabase])

  /* ====== الملخص الأساسي ====== */
  const summary = useMemo(
    () => summarizeTasks(tasks as any[], schedules as any[]),
    [tasks, schedules]
  )

  /* ====== السلسلة الزمنية ====== */
  const series = useMemo(() => dailySessions(events as any[]), [events])

  /* ====== فلترة حسب المدى ====== */
  const rangeDays = range === '7d' ? 7 : range === '28d' ? 28 : 90

  const filteredSeries = useMemo(() => {
    return series.slice(-rangeDays)
  }, [series, rangeDays])

  const plotted = useMemo(() => {
    if (chartMode === 'daily') return filteredSeries
    const weeks: { day: string; sessions: number }[] = []
    for (let i = 0; i < filteredSeries.length; i += 7) {
      const chunk = filteredSeries.slice(i, i + 7)
      weeks.push({
        day: chunk[0]?.day ?? '',
        sessions: chunk.reduce((s, r) => s + r.sessions, 0),
      })
    }
    return weeks
  }, [filteredSeries, chartMode])

  /* ====== خريطة النشاط (28 يوم) ====== */
  const heatmapDays = useMemo(() => {
    const end = new Date()
    const start = subDays(end, 27)
    const days = eachDayOfInterval({ start, end })

    const seriesMap = new Map<string, number>()
    for (const r of series) {
      seriesMap.set(String(r.day), r.sessions)
    }

    return days.map((d) => ({
      date: d,
      sessions: seriesMap.get(format(d, 'yyyy-MM-dd')) ?? 0,
    }))
  }, [series])

  /* ====== التزام الجداول ====== */
  const scheduleCommitment = useMemo(() => {
    const scheduleMap = new Map(schedules.map((s) => [s.id, s]))
    const bySchedule = new Map<
      string,
      { id: string; title: string; day: string; totalSessions: number; completedSessions: number; tasksTotal: number; tasksDone: number }
    >()

    for (const task of tasks) {
      if (!task.schedule_id) continue
      const sch = scheduleMap.get(task.schedule_id)
      if (!sch) continue
      if (!bySchedule.has(sch.id)) {
        bySchedule.set(sch.id, {
          id: sch.id,
          title: sch.title,
          day: sch.day,
          totalSessions: 0,
          completedSessions: 0,
          tasksTotal: 0,
          tasksDone: 0,
        })
      }
      const entry = bySchedule.get(sch.id)!
      const workDur = sch.pomodoro?.workDuration || 50
      const sessionsNeeded = Math.max(1, Math.ceil((task.duration || 0) / workDur))
      entry.totalSessions += sessionsNeeded
      entry.completedSessions += Math.min(task.completed_sessions ?? 0, sessionsNeeded)
      entry.tasksTotal++
      if (task.done) entry.tasksDone++
    }

    return Array.from(bySchedule.values())
      .map((s) => ({
        ...s,
        progress: s.totalSessions > 0 ? Math.round((s.completedSessions / s.totalSessions) * 100) : 0,
      }))
      .sort((a, b) => b.progress - a.progress)
  }, [tasks, schedules])

  /* ====== أداء المشاريع ====== */
  const projectPerformance = useMemo(() => {
    const scheduleToProject = new Map(schedules.map((s) => [s.id, s.project_id]))
    const projectMap = new Map(projects.map((p) => [p.id, p]))
    const scheduleMap = new Map(schedules.map((s) => [s.id, s]))

    const acc = new Map<
      string,
      { id: string; name: string; color: string; sessions: number; hours: number; tasksDone: number; tasksTotal: number; schedulesSet: Set<string> }
    >()

    const ensure = (key: string, pid: string | null) => {
      if (acc.has(key)) return acc.get(key)!
      const p = pid ? projectMap.get(pid) : null
      const entry = {
        id: key,
        name: p?.name ?? t('بدون مشروع', 'Unassigned'),
        color: p?.color ?? '#78716C',
        sessions: 0,
        hours: 0,
        tasksDone: 0,
        tasksTotal: 0,
        schedulesSet: new Set<string>(),
      }
      acc.set(key, entry)
      return entry
    }

    for (const task of tasks) {
      const pid = task.schedule_id ? scheduleToProject.get(task.schedule_id) ?? null : null
      const key = pid ?? '__none__'
      const entry = ensure(key, pid)
      entry.sessions += task.completed_sessions ?? 0
      const sch = task.schedule_id ? scheduleMap.get(task.schedule_id) : null
      const workDur = sch?.pomodoro?.workDuration || 50
      entry.hours += ((task.completed_sessions ?? 0) * workDur) / 60
      entry.tasksTotal++
      if (task.done) entry.tasksDone++
      if (task.schedule_id) entry.schedulesSet.add(task.schedule_id)
    }

    return Array.from(acc.values())
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        sessions: p.sessions,
        hours: Math.round(p.hours * 10) / 10,
        tasksDone: p.tasksDone,
        tasksTotal: p.tasksTotal,
        schedulesCount: p.schedulesSet.size,
      }))
      .sort((a, b) => b.sessions - a.sessions)
  }, [tasks, schedules, projects, t])

  /* ====== نسبة الالتزام العامة ====== */
  const commitmentRate = useMemo(() => {
    if (scheduleCommitment.length === 0) return 0
    const total = scheduleCommitment.reduce((s, x) => s + x.progress, 0)
    return Math.round(total / scheduleCommitment.length)
  }, [scheduleCommitment])

  /* ====== أفضل يوم ====== */
  const bestDay = useMemo(() => {
    if (series.length === 0) return null
    return series.reduce((best, r) => (r.sessions > best.sessions ? r : best), series[0])
  }, [series])

  /* ====== Streak (أيام متتالية) ====== */
  const streak = useMemo(() => {
    const set = new Set(series.filter((r) => r.sessions > 0).map((r) => String(r.day)))
    let count = 0
    let cursor = new Date()
    // اليوم الحالي قد لا يكون منتهياً بعد
    if (!set.has(format(cursor, 'yyyy-MM-dd'))) cursor = subDays(cursor, 1)
    while (set.has(format(cursor, 'yyyy-MM-dd'))) {
      count++
      cursor = subDays(cursor, 1)
    }
    return count
  }, [series])

  /* ====== بيانات الرسم الدائري للتصنيفات ====== */
  const categoryData = useMemo(
    () =>
      summary.categories.map((c, i) => ({
        name: c.name || t('غير مصنّف', 'Uncategorized'),
        value: c.value,
        fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      })),
    [summary.categories, t]
  )

  /* ====== بيانات الرسم الشريطي للجداول ====== */
  const topSchedules = useMemo(() => scheduleCommitment.slice(0, 6), [scheduleCommitment])

  /* ====== Loading / Error ====== */
  if (status === 'loading') {
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

  if (status === 'error') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-['Cairo'] text-sm text-red-300">
            {t('تعذر تحميل الإحصائيات', 'Could not load analytics')}
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
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-xs text-[#D4AF37]">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('لوحة التحليلات', 'Analytics dashboard')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('الإحصائيات والأداء', 'Analytics & Performance')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'تابع تقدمك بالتفصيل: الجلسات، التركيز، الالتزام، وأداء كل مشروع وجدول.',
                'Track your progress in detail: sessions, focus, commitment, and performance per project and schedule.'
              )}
            </p>
          </div>

          {/* مبدّل المدى الزمني */}
          <div className="flex items-center gap-1 self-start rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
            {([
              { key: '7d', label: t('7 أيام', '7d'), icon: CalendarDays },
              { key: '28d', label: t('28 يوم', '28d'), icon: Calendar },
              { key: '90d', label: t('90 يوم', '90d'), icon: Calendar },
            ] as const).map((opt) => {
              const Icon = opt.icon
              const active = range === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setRange(opt.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-['Cairo'] text-xs font-bold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={Zap}
          label={t('جلسات منجزة', 'Completed sessions')}
          value={summary.sessions}
          accent="#D4AF37"
          delay={0.05}
        />
        <KpiCard
          icon={Clock}
          label={t('ساعات التركيز', 'Focus hours')}
          value={summary.hours.toFixed(1)}
          accent="#10B981"
          delay={0.1}
        />
        <KpiCard
          icon={CheckCircle2}
          label={t('إنجاز المهام', 'Task completion')}
          value={`${summary.completion}%`}
          accent="#3B82F6"
          delay={0.15}
        />
        <KpiCard
          icon={Target}
          label={t('الالتزام بالجداول', 'Schedule commitment')}
          value={`${commitmentRate}%`}
          hint={t('متوسط إتمام الجلسات', 'Avg sessions completed')}
          accent="#A855F7"
          delay={0.2}
        />
        <KpiCard
          icon={Flame}
          label={t('سلسلة الأيام', 'Current streak')}
          value={streak}
          hint={t('يوم متتالي', 'consecutive days')}
          accent="#F97316"
          delay={0.25}
        />
        <KpiCard
          icon={Trophy}
          label={t('أفضل يوم', 'Best day')}
          value={bestDay ? bestDay.sessions : 0}
          hint={bestDay ? format(new Date(bestDay.day), 'd MMM', { locale: language === 'ar' ? ar : enUS }) : '—'}
          accent="#EC4899"
          delay={0.3}
        />
      </div>

      {/* ============ الرسم الرئيسي + التصنيفات ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* الرسم الزمني */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:col-span-8"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37]/15">
                <TrendingUp className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                  {t('اتجاه الجلسات', 'Sessions trend')}
                </h3>
                <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                  {t('آخر', 'Last')} {rangeDays} {t('يوم', 'days')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
              {([
                { key: 'daily', label: t('يومي', 'Daily') },
                { key: 'weekly', label: t('أسبوعي', 'Weekly') },
              ] as const).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setChartMode(opt.key)}
                  className={`rounded-lg px-3 py-1 font-['Cairo'] text-[11px] font-bold transition-all ${
                    chartMode === opt.key
                      ? 'bg-[#D4AF37] text-[#0b1a2e]'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={plotted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => {
                    try { return format(new Date(v), 'd MMM', { locale: language === 'ar' ? ar : enUS }) } catch { return v }
                  }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Cairo' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Cairo' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#D4AF37"
                  strokeWidth={2.5}
                  fill="url(#sessionGrad)"
                  name={t('الجلسات', 'Sessions')}
                  dot={{ r: 3, fill: '#D4AF37', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#D4AF37', stroke: '#0b1a2e', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* الرسم الدائري للتصنيفات */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:col-span-4"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15">
              <PieIcon className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('التصنيفات', 'Categories')}
              </h3>
              <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {categoryData.length} {t('تصنيف', 'categories')}
              </p>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={62}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1.5">
                {categoryData.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.fill }} />
                    <span className="flex-1 truncate font-['Cairo'] text-xs text-[var(--text-secondary)]">
                      {c.name}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--text-primary)]">
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center font-['Cairo'] text-xs text-[var(--text-muted)]">
              {t('لا توجد بيانات', 'No data')}
            </div>
          )}
        </motion.div>
      </div>

      {/* ============ أداء المشاريع + التزام الجداول ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* المشاريع */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:col-span-5"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15">
              <FolderOpen className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('أداء المشاريع', 'Projects performance')}
              </h3>
              <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {projectPerformance.length} {t('مشروع', 'projects')}
              </p>
            </div>
            <Link
              href="/dashboard/projects"
              className="ms-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 font-['Cairo'] text-[10px] font-bold text-[var(--text-secondary)] transition-all hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
            >
              {t('الكل', 'All')}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {projectPerformance.length > 0 ? (
            <div className="max-h-[420px] space-y-2.5 overflow-y-auto pe-1">
              {projectPerformance.map((p, i) => (
                <ProjectPerformanceCard key={p.id} project={p} index={i} t={t} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center font-['Cairo'] text-xs text-[var(--text-muted)]">
              {t('لا توجد مشاريع بعد', 'No projects yet')}
            </div>
          )}
        </motion.div>

        {/* التزام الجداول */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 lg:col-span-7"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15">
              <Target className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('الالتزام بالجداول', 'Schedule commitment')}
              </h3>
              <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {t('نسبة إتمام الجلسات لكل جدول', 'Session completion rate per schedule')}
              </p>
            </div>
            <div className="ms-auto rounded-full bg-[#D4AF37]/10 px-3 py-1 font-mono text-sm font-bold text-[#D4AF37]">
              {commitmentRate}%
            </div>
          </div>

          {topSchedules.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSchedules}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Cairo' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={110}
                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Cairo' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip suffix="%" />} />
                  <Bar dataKey="progress" name={t('نسبة الإتمام', 'Completion')} radius={[0, 8, 8, 0]}>
                    {topSchedules.map((s, i) => {
                      const color =
                        s.progress >= 80 ? '#10B981' :
                        s.progress >= 50 ? '#D4AF37' :
                        s.progress >= 25 ? '#F97316' :
                        '#EF4444'
                      return <Cell key={i} fill={color} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center font-['Cairo'] text-xs text-[var(--text-muted)]">
              {t('لا توجد جداول بعد', 'No schedules yet')}
            </div>
          )}
        </motion.div>
      </div>

      {/* ============ Heatmap ============ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ActivityHeatmap days={heatmapDays} language={language} t={t} />
      </motion.div>

      {/* ============ تفاصيل قابلة للطي ============ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]"
      >
        <button
          onClick={() => setShowTable(!showTable)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg-secondary)]">
              <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <div className="text-left rtl:text-right">
              <div className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('التفاصيل الكاملة', 'Full details')}
              </div>
              <div className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {t('عرض البيانات كجدول', 'View data as a table')}
              </div>
            </div>
          </div>
          {showTable ? (
            <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          )}
        </button>

        <AnimatePresence>
          {showTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-[var(--border-color)]"
            >
              <div className="space-y-5 p-5">
                {/* جدول الجلسات اليومية */}
                <div>
                  <h4 className="mb-3 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)]">
                    {t('الجلسات اليومية', 'Daily sessions')}
                  </h4>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border-color)]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] rtl:text-right">
                            {t('التاريخ', 'Date')}
                          </th>
                          <th className="px-3 py-2 text-left font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] rtl:text-right">
                            {t('الجلسات', 'Sessions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {plotted.map((row, i) => (
                          <tr key={i} className="border-t border-[var(--border-color)]">
                            <td className="px-3 py-2 font-['Cairo'] text-xs text-[var(--text-primary)]">
                              {row.day}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs font-bold text-[#D4AF37]">
                              {row.sessions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* جدول الالتزام */}
                <div>
                  <h4 className="mb-3 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)]">
                    {t('التزام الجداول', 'Schedule commitment')}
                  </h4>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--border-color)]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] rtl:text-right">
                            {t('الجدول', 'Schedule')}
                          </th>
                          <th className="px-3 py-2 text-left font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] rtl:text-right">
                            {t('جلسات', 'Sessions')}
                          </th>
                          <th className="px-3 py-2 text-left font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] rtl:text-right">
                            {t('النسبة', 'Rate')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleCommitment.map((s) => (
                          <tr key={s.id} className="border-t border-[var(--border-color)]">
                            <td className="px-3 py-2 font-['Cairo'] text-xs text-[var(--text-primary)]">
                              {s.title}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                              {s.completedSessions}/{s.totalSessions}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs font-bold text-[#D4AF37]">
                              {s.progress}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ملاحظة */}
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3">
                  <p className="font-['Cairo'] text-[10px] leading-relaxed text-[var(--text-muted)]">
                    {t(
                      'الإجماليات تشمل المهام القديمة. الرسم الزمني يبدأ من تفعيل سجل الجلسات؛ لا نُسند جلسات قديمة إلى تواريخ غير معروفة.',
                      'Totals include existing tasks. The timeline starts when session logging was enabled; historical sessions with unknown dates are not assigned invented dates.'
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}