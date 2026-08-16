// src/app/(dashboard)/workspace/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import {
  CheckCircle,
  XCircle,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  Coffee,
  Sparkles,
  Filter,
  Check,
  X,
  Loader2,
  FolderOpen,
  ArrowRight,
  ListChecks,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

type Task = {
  id: string
  user_id: string
  schedule_id: string
  name: string
  type: 'study' | 'side' | 'custom'
  duration: number // في الدقائق
  priority: 'high' | 'medium' | 'low'
  done: boolean
  created_at: string
}

type Schedule = {
  id: string
  title: string
  day: string
  start_time: string
}

// ============================================================
//  مكون المهمة (للعرض فقط بدون أزرار تفاعلية)
// ============================================================
function TaskItem({
  task,
  schedule,
  index,
}: {
  task: Task
  schedule?: Schedule
  index: number
}) {
  const isToday = schedule?.day === new Date().toISOString().split('T')[0]

  const typeColors = {
    study: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30',
    side: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    custom: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }

  const typeLabels = {
    study: 'دراسة',
    side: 'جانبية',
    custom: 'مخصصة',
  }

  const typeIcons = {
    study: BookOpen,
    side: Coffee,
    custom: Sparkles,
  }

  const Icon = typeIcons[task.type] || Sparkles

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
      whileHover={{ x: 4, scale: 1.005 }}
      className={`group relative flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border ${
        task.done ? 'border-emerald-500/20 opacity-60' : 'border-[var(--border-color)]'
      } hover:border-[#D4AF37]/30`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative flex items-center gap-3 w-full">
        {/* الأيقونة حسب النوع */}
        <div className={`p-1.5 rounded-lg border ${typeColors[task.type]}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* اسم المهمة */}
        <span
          className={`flex-1 font-medium font-['Cairo'] transition-all ${
            task.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {task.name}
        </span>

        {/* مدة الدراسة (إن وجدت) */}
        {task.type === 'study' && task.duration > 0 && (
          <span className="text-xs text-[var(--text-muted)] font-['Cairo'] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {task.duration} د
          </span>
        )}

        {/* نوع المهمة */}
        <span className={`text-xs px-2 py-1 rounded-full font-['Cairo'] border ${typeColors[task.type]}`}>
          {typeLabels[task.type]}
        </span>

        {/* معلومات الجدول */}
        {schedule && (
          <span className="text-xs text-[var(--text-muted)] font-['Cairo'] flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(schedule.day), 'dd/MM', { locale: ar })}
            {isToday && (
              <span className="text-[#D4AF37] mr-1">✅</span>
            )}
          </span>
        )}

        {/* مؤشر الحالة فقط */}
        {task.done ? (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-['Cairo'] flex items-center gap-1">
            <Check className="w-3 h-3" /> منجزة
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-['Cairo'] flex items-center gap-1">
            <Clock className="w-3 h-3" /> قيد التنفيذ
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================
//  الصفحة الرئيسية للمهام (للعرض فقط)
// ============================================================
export default function WorkspacePage() {
  const { user } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [filterType, setFilterType] = useState<'all' | 'study' | 'side' | 'custom'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'today' | 'later' | 'done'>('all')

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

    // جلب المهام
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // جلب الجداول (للمعلومات الإضافية)
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('id, title, day, start_time')
      .eq('user_id', user.id)

    setTasks(tasksData || [])
    setSchedules(schedulesData || [])
    setLoading(false)
  }

  // التصفية
  const filteredTasks = tasks.filter(task => {
    // تصفية حسب النوع
    if (filterType !== 'all' && task.type !== filterType) return false

    // تصفية حسب الحالة
    if (filterStatus === 'done' && !task.done) return false
    if (filterStatus === 'today') {
      const schedule = schedules.find(s => s.id === task.schedule_id)
      if (!schedule) return false
      const isToday = schedule.day === new Date().toISOString().split('T')[0]
      if (!isToday) return false
      if (task.done) return false // اليوم فقط غير المنجزة
    }
    if (filterStatus === 'later') {
      const schedule = schedules.find(s => s.id === task.schedule_id)
      if (!schedule) return false
      const isToday = schedule.day === new Date().toISOString().split('T')[0]
      if (isToday) return false
      if (task.done) return false
    }
    return true
  })

  // إحصائيات
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.done).length
  const todayTasks = tasks.filter(t => {
    const s = schedules.find(sch => sch.id === t.schedule_id)
    return s && s.day === new Date().toISOString().split('T')[0] && !t.done
  }).length

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
    <div className="p-6 space-y-6" dir="rtl">
      {/* ===== الهيدر ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            📋 المهام
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1 flex items-center gap-3">
            <span>{totalTasks} مهمة</span>
            <span className="text-emerald-400">✅ {completedTasks} مكتملة</span>
            <span className="text-[#D4AF37]">⏳ {todayTasks} اليوم</span>
          </p>
        </div>
      </motion.div>

      {/* ===== أدوات التصفية ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] backdrop-blur-sm"
      >
        {/* تصفية حسب النوع */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)] font-['Cairo']">النوع:</span>
        </div>
        <div className="flex gap-1">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'study', label: 'دراسة' },
            { value: 'side', label: 'جانبية' },
            { value: 'custom', label: 'مخصصة' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-['Cairo'] transition-all duration-300 ${
                filterType === f.value
                  ? 'bg-[#D4AF37] text-[#0b1a2e]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-[var(--border-color)] mx-2" />

        {/* تصفية حسب الحالة */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-secondary)] font-['Cairo']">الحالة:</span>
        </div>
        <div className="flex gap-1">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'today', label: 'اليوم' },
            { value: 'later', label: 'لاحقاً' },
            { value: 'done', label: 'منجزة' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-['Cairo'] transition-all duration-300 ${
                filterStatus === f.value
                  ? 'bg-[#D4AF37] text-[#0b1a2e]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ===== قائمة المهام ===== */}
      {filteredTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <ListChecks className="w-20 h-20 text-[var(--text-muted)]/20 mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
            لا توجد مهام
          </h3>
          <p className="text-[var(--text-secondary)] font-['Cairo'] mt-2">
            {tasks.length === 0
              ? 'أنشئ جدولاً أولاً من خلال المخطط الذكي'
              : 'لا توجد مهام تطابق معايير التصفية'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredTasks.map((task, index) => {
              const schedule = schedules.find(s => s.id === task.schedule_id)
              return (
                <div key={task.id} data-aos="fade-up" data-aos-delay={index * 30 + 100}>
                  <TaskItem
                    task={task}
                    schedule={schedule}
                    index={index}
                  />
                </div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}