'use client'

import { formatTime12 } from '@/lib/time'
import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTimer } from '@/context/TimerContext'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import {
  Calendar as CalendarIcon, Clock, Plus, Trash2, Eye, ArrowLeft,
  Search, Sparkles, CheckCircle2, Circle, CircleDot, History,
  CalendarClock, Layers, TrendingUp, Target, AlertTriangle,
  Filter, X,
} from 'lucide-react'

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
  schedule_id: string
  name: string
  type: 'study' | 'side' | 'custom'
  duration: number
  done: boolean
}

type Prayer = {
  id: string
  schedule_id: string
  name: string
  time: string
  done: boolean
}

type FilterKey = 'all' | 'today' | 'upcoming' | 'past'

/* ============================================================
   أدوات
   ============================================================ */
function getLocalToday() {
  const n = new Date()
  const y = n.getFullYear()
  const m = String(n.getMonth() + 1).padStart(2, '0')
  const d = String(n.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/* ============================================================
   بطاقة إحصائية
   ============================================================ */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: typeof Target
  label: string
  value: string | number
  accent: 'gold' | 'emerald' | 'sky' | 'purple'
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
        <span className="font-['Cairo'] text-[10px] uppercase tracking-wider opacity-80">
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
   بطاقة جدول (تصميم جديد مع أزرار ثابتة)
   ============================================================ */
function ScheduleCard({
  schedule,
  isToday,
  taskCount,
  completedTasks,
  onView,
  onDelete,
  deleting,
  language,
  t,
  index,
}: {
  schedule: Schedule
  isToday: boolean
  taskCount: number
  completedTasks: number
  onView: () => void
  onDelete: () => void
  deleting: boolean
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
  index: number
}) {
  const today = getLocalToday()
  const isPast = schedule.day < today && !isToday
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0

  const formattedDate = format(new Date(schedule.day), 'EEEE، d MMMM yyyy', {
    locale: language === 'ar' ? ar : enUS,
  })

  const accent = isToday ? '#D4AF37' : isPast ? '#78716C' : '#3B82F6'

  const statusBadge = isToday
    ? {
        label: t('اليوم', 'Today'),
        bg: 'bg-[#D4AF37]',
        text: 'text-[#0b1a2e]',
        icon: CircleDot,
      }
    : isPast
      ? {
          label: t('منتهي', 'Past'),
          bg: 'bg-white/10',
          text: 'text-[var(--text-muted)]',
          icon: History,
        }
      : {
          label: t('قادم', 'Upcoming'),
          bg: 'bg-sky-500/20',
          text: 'text-sky-400',
          icon: CalendarClock,
        }

  const StatusIcon = statusBadge.icon

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 320, damping: 26 }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl transition-all duration-300 ${
        isToday
          ? 'border-[#D4AF37]/40 shadow-xl shadow-[#D4AF37]/10'
          : 'border-[var(--border-color)] hover:border-[#D4AF37]/30 hover:shadow-xl'
      } ${isPast ? 'opacity-70 hover:opacity-100' : ''}`}
    >
      {/* شريط علوي متدرّج */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{
          background: isToday
            ? 'linear-gradient(90deg, #D4AF37, #E8C84A)'
            : `linear-gradient(90deg, ${accent}40, transparent)`,
        }}
      />

      {/* هالة على التحويم */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: accent }}
      />

      <div className="relative p-5">
        {/* الرأس: العنوان + شارة الحالة */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-['Amiri'] text-lg font-bold text-[var(--text-primary)] sm:text-xl">
              {schedule.title}
            </h3>
            <span
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full ${statusBadge.bg} ${statusBadge.text} px-2.5 py-0.5 font-['Cairo'] text-[10px] font-bold`}
            >
              <StatusIcon className={`h-2.5 w-2.5 ${isToday ? 'animate-pulse' : ''}`} />
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* التاريخ والوقت */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-['Cairo'] text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
            {formattedDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
            {formatTime12(schedule.start_time, language)}
          </span>
        </div>

        {/* شريط التقدم */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between font-['Cairo'] text-[11px]">
            <span className="text-[var(--text-muted)]">
              {t('المهام المكتملة', 'Completed tasks')}
            </span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              {completedTasks}/{taskCount}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.15 + index * 0.05, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            <span>
              ⏱️ {schedule.pomodoro.workDuration}
              {t('د/جلسة', 'min/session')}
            </span>
            <span
              className="font-mono font-bold"
              style={{ color: progress >= 80 ? '#10B981' : progress >= 50 ? '#D4AF37' : '#F97316' }}
            >
              {progress}%
            </span>
          </div>
        </div>

        {/* الأزرار الثابتة */}
        <div className="flex items-center gap-2 border-t border-[var(--border-color)] pt-4">
          <button
            onClick={onView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2.5 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('فتح الجدول', 'Open')}
            <ArrowLeft className="h-3 w-3 ltr:rotate-180" />
          </button>

          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 transition-all hover:bg-red-500/15 hover:border-red-500/50 disabled:opacity-50"
            title={t('حذف الجدول', 'Delete schedule')}
          >
            {deleting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-4 w-4 rounded-full border-2 border-red-400/30 border-t-red-400"
              />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </motion.article>
  )
}

/* ============================================================
   بطاقة جدول فارغة (Skeleton)
   ============================================================ */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-3 h-6 w-3/4 rounded-lg bg-white/5" />
      <div className="mb-4 h-4 w-1/2 rounded-lg bg-white/5" />
      <div className="mb-4 h-2 w-full rounded-full bg-white/5" />
      <div className="flex gap-2">
        <div className="h-10 flex-1 rounded-xl bg-white/5" />
        <div className="h-10 w-10 rounded-xl bg-white/5" />
      </div>
    </div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function SchedulePage() {
  const { t, language } = useLanguage()
  const { user } = useSupabase()
  const router = useRouter()
  const { resetTimer, timerState } = useTimer()

  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  const [today, setToday] = useState(getLocalToday)

  /* ====== تحديث اليوم كل دقيقة ====== */
  useEffect(() => {
    const interval = setInterval(() => {
      const nt = getLocalToday()
      if (nt !== today) setToday(nt)
    }, 60000)
    return () => clearInterval(interval)
  }, [today])

  /* ====== جلب البيانات ====== */
  useEffect(() => {
    if (user) void fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    const supabase = createClient()

    const [schedulesRes, tasksRes, prayersRes] = await Promise.all([
      supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('prayers').select('*').eq('user_id', user.id),
    ])

    setSchedules(schedulesRes.data || [])
    setTasks(tasksRes.data || [])
    setPrayers(prayersRes.data || [])
    setLoading(false)
  }

  /* ====== الحذف ====== */
  const handleDeleteSchedule = async (id: string) => {
    if (
      !confirm(
        t(
          'هل أنت متأكد من حذف هذا الجدول؟ سيتم حذف جميع مهامه وصلواته.',
          'Delete this schedule? All its tasks and prayers will be removed.'
        )
      )
    )
      return

    setDeleting(id)
    const supabase = createClient()

    try {
      await supabase.from('tasks').delete().eq('schedule_id', id)
      await supabase.from('prayers').delete().eq('schedule_id', id)
      const { error } = await supabase.from('schedules').delete().eq('id', id)

      if (error) throw error

      if (timerState.scheduleId === id) {
        resetTimer()
        toast.info(t('تم إيقاف المؤقت المرتبط بالجدول المحذوف.', 'Timer stopped for deleted schedule.'))
      }

      setSchedules(schedules.filter((s) => s.id !== id))
      toast.success(t('🗑️ تم حذف الجدول بنجاح', '🗑️ Schedule deleted'))
    } catch (error) {
      console.error(error)
      toast.error(t('حدث خطأ أثناء حذف الجدول', 'Error deleting schedule'))
    } finally {
      setDeleting(null)
    }
  }

  /* ====== إحصائيات المهام ====== */
  const getTaskStats = (scheduleId: string) => {
    const list = tasks.filter((t) => t.schedule_id === scheduleId)
    return {
      total: list.length,
      completed: list.filter((t) => t.done).length,
    }
  }

  /* ====== الإحصائيات الكلية ====== */
  const globalStats = useMemo(() => {
    const todaySchedules = schedules.filter((s) => s.day === today)
    const upcoming = schedules.filter((s) => s.day > today)
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.done).length
    return {
      total: schedules.length,
      today: todaySchedules.length,
      upcoming: upcoming.length,
      completedTasks,
      totalTasks,
    }
  }, [schedules, tasks, today])

  /* ====== الفلترة ====== */
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      if (searchTerm && !s.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
      if (filter === 'today' && s.day !== today) return false
      if (filter === 'upcoming' && s.day <= today) return false
      if (filter === 'past' && s.day >= today) return false
      return true
    })
  }, [schedules, searchTerm, filter, today])

  const tabs: { key: FilterKey; labelAr: string; labelEn: string; count: number; icon: typeof Layers }[] = [
    { key: 'all', labelAr: 'الكل', labelEn: 'All', count: schedules.length, icon: Layers },
    { key: 'today', labelAr: 'اليوم', labelEn: 'Today', count: globalStats.today, icon: CircleDot },
    { key: 'upcoming', labelAr: 'القادمة', labelEn: 'Upcoming', count: globalStats.upcoming, icon: CalendarClock },
    {
      key: 'past',
      labelAr: 'المنتهية',
      labelEn: 'Past',
      count: schedules.length - globalStats.today - globalStats.upcoming,
      icon: History,
    },
  ]

  /* ====== Loading ====== */
  if (loading) {
    return (
      <div className="space-y-5 p-3 sm:p-6">
        <div className="h-44 animate-pulse rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
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
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-xs text-[#D4AF37]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('خططك اليومية في مكان واحد', 'Your daily plans in one place')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('الجداول', 'Schedules')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'أنشئ جداولك وتابع تقدمك يوماً بيوم مع نظام بومودورو وتتبع دقيق للإنجاز.',
                'Create schedules and track progress day by day with Pomodoro and accurate completion tracking.'
              )}
            </p>
          </div>

          <button
            onClick={() => router.push('/dashboard/planner')}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-6 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-[#D4AF37]/40"
          >
            <Plus className="h-4 w-4" />
            {t('جدول جديد', 'New schedule')}
          </button>
        </div>

        {/* الإحصائيات */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Layers}
            label={t('إجمالي الجداول', 'Total')}
            value={globalStats.total}
            accent="gold"
            delay={0.05}
          />
          <StatCard
            icon={CircleDot}
            label={t('جداول اليوم', 'Today')}
            value={globalStats.today}
            accent="emerald"
            delay={0.1}
          />
          <StatCard
            icon={CalendarClock}
            label={t('قادمة', 'Upcoming')}
            value={globalStats.upcoming}
            accent="sky"
            delay={0.15}
          />
          <StatCard
            icon={Target}
            label={t('المهام المنجزة', 'Tasks done')}
            value={`${globalStats.completedTasks}/${globalStats.totalTasks}`}
            accent="purple"
            delay={0.2}
          />
        </div>
      </motion.section>

      {/* ============ البحث والفلاتر ============ */}
      {schedules.length > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* البحث */}
          <div className="relative w-full lg:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
            <input
              type="text"
              placeholder={t('ابحث عن جدول…', 'Search schedules…')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] ltr:right-2 rtl:left-2"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* الفلاتر */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = filter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-['Cairo'] text-sm transition-all ${
                    active
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-md shadow-[#D4AF37]/30'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {language === 'ar' ? tab.labelAr : tab.labelEn}
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      active ? 'bg-[#0b1a2e]/20 text-[#0b1a2e]' : 'bg-white/5 text-[var(--text-muted)]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ المحتوى ============ */}
      {filteredSchedules.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5"
          >
            <CalendarIcon className="h-9 w-9 text-[#D4AF37]/70" />
          </motion.div>
          <h3 className="mb-2 font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
            {schedules.length === 0
              ? t('لا توجد جداول بعد', 'No schedules yet')
              : t('لا توجد نتائج مطابقة', 'No matching results')}
          </h3>
          <p className="mx-auto max-w-md font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {schedules.length === 0
              ? t(
                  'أنشئ جدولك الأول من خلال المخطط الذكي وابدأ رحلة الإنتاجية.',
                  'Create your first schedule from the smart planner and start your productivity journey.'
                )
              : t(
                  'جرّب تغيير كلمات البحث أو الفلتر.',
                  'Try changing the search or filter.'
                )}
          </p>
          {schedules.length === 0 ? (
            <button
              onClick={() => router.push('/dashboard/planner')}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-6 py-3 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/40"
            >
              <Plus className="h-4 w-4" />
              {t('أنشئ جدولاً', 'Create a schedule')}
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilter('all')
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-all hover:bg-white/5"
            >
              <Filter className="h-4 w-4" />
              {t('إعادة تعيين الفلاتر', 'Reset filters')}
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredSchedules.map((schedule, i) => {
              const stats = getTaskStats(schedule.id)
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  isToday={schedule.day === today}
                  taskCount={stats.total}
                  completedTasks={stats.completed}
                  onView={() => router.push(`/dashboard/schedule/${schedule.id}`)}
                  onDelete={() => handleDeleteSchedule(schedule.id)}
                  deleting={deleting === schedule.id}
                  language={language}
                  t={t}
                  index={i}
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}