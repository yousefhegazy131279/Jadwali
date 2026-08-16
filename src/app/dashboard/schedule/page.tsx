// src/app/(dashboard)/schedule/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Zap,
  Search,
  Filter,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTimer } from '@/context/TimerContext'

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

// دالة التاريخ المحلي
function getLocalToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ============================================================
//  مكون بطاقة الجدول (محسّن)
// ============================================================
function ScheduleCard({
  schedule,
  isToday,
  taskCount,
  completedTasks,
  onView,
  onDelete,
}: {
  schedule: Schedule
  isToday: boolean
  taskCount: number
  completedTasks: number
  onView: () => void
  onDelete: () => void
}) {
  const formattedDate = format(new Date(schedule.day), 'EEEE، d MMMM yyyy', { locale: ar })
  const progress = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
  const isPast = schedule.day < getLocalToday() && !isToday

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
        isToday
          ? 'border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent shadow-lg shadow-[#D4AF37]/10'
          : isPast
          ? 'border-[var(--border-color)] bg-[var(--bg-card)] opacity-70 hover:opacity-100'
          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[#D4AF37]/40 hover:shadow-xl'
      }`}
      onClick={onView}
    >
      {/* شريط علوي ملون */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-['Amiri'] truncate">
                {schedule.title}
              </h3>
              {isToday && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#D4AF37] text-[#0b1a2e] font-['Cairo'] animate-pulse shadow-sm">
                  ✅ اليوم
                </span>
              )}
              {isPast && !isToday && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-[var(--text-muted)] font-['Cairo']">
                  📅 منتهي
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-1 font-['Cairo']">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1 font-['Cairo']">
                <Clock className="w-4 h-4 text-[#D4AF37]" />
                {schedule.start_time}
              </span>
            </div>
          </div>

          {/* أزرار الإجراءات - دائماً ظاهرة على الجوال */}
          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onView() }}
              className="p-2 rounded-lg hover:bg-[#D4AF37]/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
              title="عرض"
            >
              <Eye className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              title="حذف"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-[var(--text-muted)] font-['Cairo']">
            <span>المهام المكتملة</span>
            <span>{completedTasks}/{taskCount}</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"
            />
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)] font-['Cairo']">
          <span>⏱️ {schedule.pomodoro.workDuration}د/جلسة</span>
          <span>📚 {taskCount} مهام</span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
//  الصفحة الرئيسية للجدول (محسّنة)
// ============================================================
export default function SchedulePage() {
  const { user } = useSupabase()
  const router = useRouter()
  const { resetTimer, timerState } = useTimer()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('all')

  // ✅ استخدام التاريخ المحلي
  const [today, setToday] = useState(getLocalToday)

  // ✅ تحديث اليوم تلقائيًا كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      const newToday = getLocalToday()
      if (newToday !== today) {
        setToday(newToday)
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [today])

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      mirror: true,
    })

    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    if (!user) return
    const supabase = createClient()

    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .order('day', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)

    const { data: prayersData } = await supabase
      .from('prayers')
      .select('*')
      .eq('user_id', user.id)

    setSchedules(schedulesData || [])
    setTasks(tasksData || [])
    setPrayers(prayersData || [])
    setLoading(false)
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجدول؟ سيتم حذف جميع مهامه وصلواته.')) return

    setDeleting(id)
    const supabase = createClient()

    try {
      await supabase.from('tasks').delete().eq('schedule_id', id)
      await supabase.from('prayers').delete().eq('schedule_id', id)
      const { error } = await supabase.from('schedules').delete().eq('id', id)

      if (error) throw error

      if (timerState.scheduleId === id) {
        resetTimer()
        toast.info('تم إيقاف المؤقت المرتبط بالجدول المحذوف.')
      }

      setSchedules(schedules.filter(s => s.id !== id))
      toast.success('🗑️ تم حذف الجدول بنجاح')
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء حذف الجدول')
    } finally {
      setDeleting(null)
    }
  }

  // الحصول على عدد المهام ومكتملها لكل جدول
  const getTaskStats = (scheduleId: string) => {
    const tasksForSchedule = tasks.filter(t => t.schedule_id === scheduleId)
    return {
      total: tasksForSchedule.length,
      completed: tasksForSchedule.filter(t => t.done).length,
    }
  }

  // تصفية الجداول حسب الفلتر والبحث
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // فلترة البحث
      if (searchTerm && !schedule.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // فلترة حسب الحالة
      if (filter === 'today' && schedule.day !== today) return false
      if (filter === 'upcoming' && schedule.day <= today) return false
      if (filter === 'past' && schedule.day >= today) return false

      return true
    })
  }, [schedules, searchTerm, filter, today])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir="rtl">
      {/* الهيدر */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            ⏰ الجداول
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1">
            {schedules.length} جدول • {tasks.length} مهمة
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/planner')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
        >
          <Plus className="w-5 h-5" />
          جدول جديد
        </button>
      </motion.div>

      {/* شريط الأدوات */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="ابحث عن جدول..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all font-['Cairo']"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'today', label: 'اليوم' },
            { value: 'upcoming', label: 'القادمة' },
            { value: 'past', label: 'المنتهية' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-['Cairo'] text-sm transition-all ${
                filter === f.value
                  ? 'bg-[#D4AF37] text-[#0b1a2e] shadow-md'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-white/10 border border-[var(--border-color)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة الجداول */}
      {filteredSchedules.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <Calendar className="w-20 h-20 text-[var(--text-muted)]/20 mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
            لا توجد جداول {filter !== 'all' ? 'مطابقة' : ''}
          </h3>
          <p className="text-[var(--text-secondary)] font-['Cairo'] mt-2">
            {schedules.length === 0
              ? 'أنشئ جدولك الأول من خلال المخطط الذكي'
              : 'جرّب تغيير معايير البحث أو الفلترة'}
          </p>
          {schedules.length === 0 && (
            <button
              onClick={() => router.push('/dashboard/planner')}
              className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
            >
              <Plus className="w-5 h-5 inline ml-2" />
              أنشئ جدولاً
            </button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredSchedules.map((schedule) => {
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
                />
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}