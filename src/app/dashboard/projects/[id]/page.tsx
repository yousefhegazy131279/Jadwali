'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { formatTime12 } from '@/lib/time'
import {
  ArrowRight,
  FolderOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Layers,
  TrendingUp,
  ListChecks,
  BookOpen,
  ExternalLink,
  Sparkles,
  Target,
  Zap,
  Coffee,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/* ============================================================
   الأنواع
   ============================================================ */
type Task = {
  id: string
  name: string
  done: boolean
  completed_sessions: number
  duration?: number
  type?: 'task' | 'side'
}

type Schedule = {
  id: string
  title: string
  day: string
  start_time: string
  pomodoro?: {
    workDuration: number
    shortBreak: number
    longBreak: number
    cyclesBeforeLong: number
  }
  tasks: Task[]
}

type StandaloneTask = {
  id: string
  name: string
  done: boolean
}

type Project = {
  id: string
  name: string
  color: string
  created_at?: string
}

/* ============================================================
   أدوات
   ============================================================ */
const hexToRgba = (hex: string, alpha: number) => {
  const clean = (hex || '#D4AF37').replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ============================================================
   بطاقة إحصائية
   ============================================================ */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: typeof Target
  label: string
  value: string | number
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-4"
      style={{
        borderColor: hexToRgba(color, 0.2),
        background: `linear-gradient(135deg, ${hexToRgba(color, 0.08)} 0%, transparent 80%)`,
      }}
    >
      <div className="flex items-center gap-2" style={{ color }}>
        <Icon className="h-3.5 w-3.5" />
        <span className="font-['Cairo'] text-[10px] uppercase tracking-wider opacity-90">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </div>
    </motion.div>
  )
}

/* ============================================================
   صف مهمة داخل الجدول
   ============================================================ */
function TaskRow({
  task,
  projectColor,
  t,
}: {
  task: Task
  projectColor: string
  t: (ar: string, en?: string) => string
}) {
  const isSide = task.type === 'side' || (task.duration ?? 0) === 0
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all ${
        task.done
          ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
          : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/50'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
            task.done
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-[var(--text-muted)]'
          }`}
        >
          {task.done && <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />}
        </div>
        <span
          className={`truncate font-['Cairo'] text-sm ${
            task.done
              ? 'text-[var(--text-muted)] line-through'
              : 'text-[var(--text-primary)]'
          }`}
        >
          {task.name}
        </span>
        {isSide && (
          <span className="shrink-0 rounded-md bg-sky-500/15 px-1.5 py-0.5 font-['Cairo'] text-[9px] font-bold text-sky-400">
            {t('جانبي', 'Side')}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!isSide && (task.completed_sessions ?? 0) > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold"
            style={{
              background: hexToRgba(projectColor, 0.15),
              color: projectColor,
            }}
          >
            <Zap className="h-2.5 w-2.5" />
            {task.completed_sessions}
          </span>
        )}
      </div>
    </li>
  )
}

/* ============================================================
   بطاقة جدول
   ============================================================ */
function ScheduleCard({
  schedule,
  index,
  projectColor,
  language,
  t,
}: {
  schedule: Schedule
  index: number
  projectColor: string
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
}) {
  const tasks = schedule.tasks ?? []
  const workTasks = tasks.filter((x) => (x.duration ?? 0) > 0 || x.type === 'task')
  const doneTasks = workTasks.filter((x) => x.done).length
  const totalTasks = workTasks.length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const formattedDate = format(new Date(schedule.day), 'EEEE، d MMMM yyyy', {
    locale: language === 'ar' ? ar : enUS,
  })

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 340, damping: 26 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] transition-all duration-300 hover:border-transparent hover:shadow-xl"
    >
      {/* شريط علوي بلون المشروع */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: `linear-gradient(90deg, ${projectColor}, ${hexToRgba(projectColor, 0.2)})`,
        }}
      />

      {/* هالة */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: projectColor }}
      />

      <div className="relative p-5">
        {/* الرأس */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: hexToRgba(projectColor, 0.15) }}
            >
              <BookOpen className="h-4 w-4" style={{ color: projectColor }} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
                {schedule.title}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-['Cairo'] text-[11px] text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" style={{ color: projectColor }} />
                  {formattedDate}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" style={{ color: projectColor }} />
                  {formatTime12(schedule.start_time, language)}
                </span>
              </div>
            </div>
          </div>

          <Link
            href={`/dashboard/schedule/${schedule.id}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:border-transparent hover:text-[var(--text-primary)]"
            style={{ ['--hover-bg' as string]: projectColor }}
            title={t('فتح الجدول', 'Open schedule')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* شريط التقدم */}
        {totalTasks > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {doneTasks} / {totalTasks} {t('مهام', 'tasks')}
              </span>
              <span
                className="font-mono text-xs font-bold"
                style={{ color: projectColor }}
              >
                {progress}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${projectColor}, ${hexToRgba(projectColor, 0.6)})`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* قائمة المهام */}
        {tasks.length > 0 ? (
          <ul className="space-y-1.5">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} projectColor={projectColor} t={t} />
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] py-4 text-center font-['Cairo'] text-xs text-[var(--text-muted)]">
            {t('لا توجد مهام في هذا الجدول', 'No tasks in this schedule')}
          </div>
        )}
      </div>
    </motion.article>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { supabase, user } = useSupabase()
  const { t, language } = useLanguage()

  const [project, setProject] = useState<Project | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [standaloneTasks, setStandaloneTasks] = useState<StandaloneTask[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!user || !id) return
    let active = true

    const load = async () => {
      const [projectRes, schedulesRes, tasksRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, color, created_at')
          .eq('id', id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('schedules')
          .select(
            'id, title, day, start_time, pomodoro, tasks(id, name, done, completed_sessions, duration, type)'
          )
          .eq('project_id', id)
          .order('day', { ascending: false }),
        supabase
          .from('tasks')
          .select('id, name, done')
          .eq('project_id', id)
          .is('schedule_id', null),
      ])

      if (!active) return

      if (projectRes.error || schedulesRes.error || tasksRes.error) {
        console.error(projectRes.error, schedulesRes.error, tasksRes.error)
        setStatus('error')
        return
      }

      setProject(projectRes.data)
      setSchedules(schedulesRes.data ?? [])
      setStandaloneTasks(tasksRes.data ?? [])
      setStatus('ready')
    }

    void load()
    return () => {
      active = false
    }
  }, [id, user?.id, supabase])

  /* ====== الإحصائيات ====== */
  const stats = useMemo(() => {
    let totalTasks = 0
    let doneTasks = 0
    let totalSessions = 0
    let completedSessions = 0

    for (const s of schedules) {
      for (const task of s.tasks ?? []) {
        const isSide = task.type === 'side' || (task.duration ?? 0) === 0
        if (isSide) continue
        totalTasks++
        if (task.done) doneTasks++
        const workDur = s.pomodoro?.workDuration || 50
        const sessionCount = Math.max(1, Math.ceil((task.duration ?? 0) / workDur))
        totalSessions += sessionCount
        completedSessions += Math.min(task.completed_sessions ?? 0, sessionCount)
      }
    }

    const progress = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

    return {
      totalSchedules: schedules.length,
      totalTasks,
      doneTasks,
      progress,
      completedSessions,
      totalSessions,
      standaloneCount: standaloneTasks.length,
    }
  }, [schedules, standaloneTasks])

  const projectColor = project?.color || '#D4AF37'

  /* ====== Loading ====== */
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

  /* ====== Error ====== */
  if (status === 'error' || !project) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 font-['Amiri'] text-xl font-bold text-[var(--text-primary)]">
            {t('تعذر تحميل المشروع', 'Could not load project')}
          </h2>
          <p className="mb-5 font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {t(
              'قد يكون المشروع محذوفاً أو لا تملك صلاحية الوصول إليه.',
              'The project may be deleted or you don’t have access.'
            )}
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg"
          >
            <ArrowRight className="h-4 w-4 ltr:rotate-180" />
            {t('العودة للمشاريع', 'Back to projects')}
          </Link>
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
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-7"
      >
        {/* هالات بلون المشروع */}
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full blur-3xl"
          style={{ background: hexToRgba(projectColor, 0.15) }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: hexToRgba(projectColor, 0.08) }}
        />

        {/* شريط علوي بلون المشروع */}
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${projectColor}, transparent)`,
          }}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              onClick={() => router.push('/dashboard/projects')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:border-transparent hover:text-[var(--text-primary)]"
              style={{ ['--hover-color' as string]: projectColor }}
              title={t('العودة', 'Back')}
            >
              <ArrowRight className="h-5 w-5 ltr:rotate-180" />
            </button>

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-['Cairo'] text-[10px] font-bold"
                style={{
                  borderColor: hexToRgba(projectColor, 0.3),
                  background: hexToRgba(projectColor, 0.1),
                  color: projectColor,
                }}
              >
                <FolderOpen className="h-3 w-3" />
                {t('مشروع', 'Project')}
              </div>

              <h1 className="truncate font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                {project.name}
              </h1>

              {project.created_at && (
                <p className="mt-2 inline-flex items-center gap-1.5 font-['Cairo'] text-xs text-[var(--text-muted)]">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('أُنشئ في', 'Created')}{' '}
                  {format(new Date(project.created_at), 'd MMMM yyyy', {
                    locale: language === 'ar' ? ar : enUS,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* شارة اللون */}
          <div className="flex shrink-0 items-center gap-2 self-start rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5">
            <div
              className="h-3.5 w-3.5 rounded-full shadow-lg"
              style={{ background: projectColor }}
            />
            <span className="font-mono text-xs font-bold text-[var(--text-secondary)]">
              {projectColor}
            </span>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Layers}
            label={t('الجداول', 'Schedules')}
            value={stats.totalSchedules}
            color={projectColor}
            delay={0.05}
          />
          <StatCard
            icon={ListChecks}
            label={t('المهام', 'Tasks')}
            value={`${stats.doneTasks}/${stats.totalTasks}`}
            color={projectColor}
            delay={0.1}
          />
          <StatCard
            icon={Zap}
            label={t('الجلسات', 'Sessions')}
            value={stats.completedSessions}
            color={projectColor}
            delay={0.15}
          />
          <StatCard
            icon={TrendingUp}
            label={t('التقدم', 'Progress')}
            value={`${stats.progress}%`}
            color={projectColor}
            delay={0.2}
          />
        </div>
      </motion.section>

      {/* ============ المحتوى ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* ===== الجداول (العمود الأكبر) ===== */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex items-center gap-2.5 px-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: hexToRgba(projectColor, 0.15) }}
            >
              <Layers className="h-4 w-4" style={{ color: projectColor }} />
            </div>
            <div>
              <h2 className="font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
                {t('الجداول المرتبطة', 'Linked schedules')}
              </h2>
              <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {schedules.length} {t('جدول', 'schedules')}
              </p>
            </div>
          </div>

          {schedules.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: hexToRgba(projectColor, 0.1) }}
              >
                <BookOpen className="h-7 w-7" style={{ color: hexToRgba(projectColor, 0.7) }} />
              </motion.div>
              <h3 className="mb-2 font-['Amiri'] text-xl font-bold text-[var(--text-primary)]">
                {t('لا توجد جداول مرتبطة', 'No linked schedules')}
              </h3>
              <p className="mx-auto max-w-md font-['Cairo'] text-sm text-[var(--text-secondary)]">
                {t(
                  'اربط جدولاً بهذا المشروع من صفحة المخطط الذكي لتبدأ بتتبع تقدمك.',
                  'Link a schedule to this project from the planner to start tracking progress.'
                )}
              </p>
              <Link
                href="/dashboard/planner"
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${projectColor}, ${hexToRgba(projectColor, 0.85)})`,
                }}
              >
                <Sparkles className="h-4 w-4" />
                {t('اذهب للمخطط', 'Go to planner')}
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {schedules.map((s, i) => (
                  <ScheduleCard
                    key={s.id}
                    schedule={s}
                    index={i}
                    projectColor={projectColor}
                    language={language}
                    t={t}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ===== العمود الجانبي ===== */}
        <div className="space-y-4 lg:col-span-4">
          {/* تقدم المشروع */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
          >
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4" style={{ color: projectColor }} />
              <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('ملخص التقدم', 'Progress summary')}
              </h3>
            </div>

            {/* حلقة التقدم */}
            <div className="flex flex-col items-center py-2">
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 120 120" className="-rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    className="text-white/5"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={projectColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 52 * (1 - Math.min(stats.progress, 100) / 100),
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-bold" style={{ color: projectColor }}>
                    {stats.progress}%
                  </span>
                  <span className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {t('مكتمل', 'Complete')}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid w-full grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 text-center">
                  <div className="font-mono text-lg font-bold text-emerald-400">
                    {stats.completedSessions}
                  </div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {t('جلسة منجزة', 'Done')}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 text-center">
                  <div className="font-mono text-lg font-bold text-[var(--text-primary)]">
                    {stats.totalSessions}
                  </div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {t('إجمالي', 'Total')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* المهام المستقلة */}
          {standaloneTasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: hexToRgba(projectColor, 0.15) }}
                  >
                    <ListChecks className="h-3.5 w-3.5" style={{ color: projectColor }} />
                  </div>
                  <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                    {t('مهام المشروع', 'Project tasks')}
                  </h3>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                  {standaloneTasks.filter((x) => x.done).length}/{standaloneTasks.length}
                </span>
              </div>

              <ul className="space-y-1.5">
                {standaloneTasks.map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all ${
                      task.done
                        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/50'
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border-2 ${
                        task.done
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-[var(--text-muted)]'
                      }`}
                    >
                      {task.done && (
                        <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      )}
                    </div>
                    <span
                      className={`flex-1 truncate font-['Cairo'] text-sm ${
                        task.done
                          ? 'text-[var(--text-muted)] line-through'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {task.name}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/workspace"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-transparent hover:text-[var(--text-primary)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('إدارة المهام', 'Manage tasks')}
              </Link>
            </motion.div>
          )}

          {/* إعدادات البومودورو */}
          {schedules.length > 0 && schedules[0].pomodoro && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Coffee className="h-4 w-4" style={{ color: projectColor }} />
                <h3 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                  {t('إعدادات البومودورو', 'Pomodoro settings')}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t('العمل', 'Work'), value: `${schedules[0].pomodoro.workDuration}د` },
                  { label: t('راحة قصيرة', 'Short'), value: `${schedules[0].pomodoro.shortBreak}د` },
                  { label: t('راحة طويلة', 'Long'), value: `${schedules[0].pomodoro.longBreak}د` },
                  { label: t('دورات', 'Cycles'), value: schedules[0].pomodoro.cyclesBeforeLong },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 text-center"
                  >
                    <div className="font-mono text-base font-bold" style={{ color: projectColor }}>
                      {item.value}
                    </div>
                    <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}