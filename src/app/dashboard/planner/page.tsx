'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import {
  Plus,
  X,
  Loader2,
  BookOpen,
  Coffee,
  Moon,
  Calendar,
  Clock,
  Zap,
  Sparkles,
  Timer,
  Tag,
} from 'lucide-react'

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

// وظائف الإشعارات
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
    console.error('فشل إرسال إشعار المتصفح', e)
  }
}

async function createAppNotification(userId: string, title: string, body: string, type: string = 'info') {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      read: false,
    })
    if (error) console.error('فشل إدراج الإشعار:', error)
  } catch (e) {
    console.error('خطأ في إدراج الإشعار', e)
  }
}

function TaskInput({ task, onUpdate, onRemove }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <input
        type="text"
        placeholder="التصنيف"
        value={task.category}
        onChange={(e) => onUpdate(task.id, 'category', e.target.value)}
        className="w-full sm:w-32 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] text-sm"
      />
      <input
        type="text"
        placeholder="اسم المهمة"
        value={task.name}
        onChange={(e) => onUpdate(task.id, 'name', e.target.value)}
        className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] text-sm"
      />
      <input
        type="number"
        placeholder="ساعات"
        value={task.duration}
        onChange={(e) => onUpdate(task.id, 'duration', parseFloat(e.target.value) || 0)}
        min="0.5"
        step="0.5"
        className="w-full sm:w-20 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] text-sm text-center"
      />
      <button
        onClick={() => onRemove(task.id)}
        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors self-end sm:self-auto"
        title="حذف المهمة"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function SideTaskInput({ task, onUpdate, onRemove }: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <input
        type="text"
        placeholder="اسم العمل الجانبي"
        value={task.name}
        onChange={(e) => onUpdate(task.id, 'name', e.target.value)}
        className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] text-sm"
      />
      <button
        onClick={() => onRemove(task.id)}
        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors self-end sm:self-auto"
        title="حذف العمل الجانبي"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function PlannerPage() {
  const { user } = useSupabase()
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const [date, setDate] = useState(todayStr)
  const [startTime, setStartTime] = useState('08:00')
  const [title, setTitle] = useState('')

  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: crypto.randomUUID(), category: 'دراسة', name: '', duration: 2 },
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

  const prayers: Prayer[] = [
    { name: 'الفجر', time: '04:25' },
    { name: 'الظهر', time: '13:02' },
    { name: 'العصر', time: '16:38' },
    { name: 'المغرب', time: '19:57' },
    { name: 'العشاء', time: '21:26' },
  ]

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, mirror: true })
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission()
    }
  }, [])

  const addTask = () => setTasks([...tasks, { id: crypto.randomUUID(), category: '', name: '', duration: 2 }])
  const updateTask = (id: string, field: keyof TaskItem, value: any) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t))
  }
  const removeTask = (id: string) => {
    if (tasks.length <= 1) return
    setTasks(tasks.filter(t => t.id !== id))
  }

  const addSideTask = () => setSideTasks([...sideTasks, { id: crypto.randomUUID(), name: '' }])
  const updateSideTask = (id: string, field: keyof SideTask, value: any) => {
    setSideTasks(sideTasks.map(t => t.id === id ? { ...t, [field]: value } : t))
  }
  const removeSideTask = (id: string) => {
    if (sideTasks.length <= 1) return
    setSideTasks(sideTasks.filter(t => t.id !== id))
  }

  const updatePomodoro = (key: keyof PomodoroSettings, value: number) => {
    setPomodoro({ ...pomodoro, [key]: value })
  }

  // ✅ تحقق دقيق من أن التاريخ والوقت ليسا في الماضي
  const validateDateTime = () => {
    const selectedDate = date
    const selectedTime = startTime

    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`)
    const now = new Date()

    if (selectedDateTime <= now) {
      toast.error('لا يمكن إنشاء جدول في الماضي. اختر وقتاً مستقبلياً.')
      return false
    }

    if (selectedDate === todayStr && selectedTime <= currentTimeStr) {
      toast.error('وقت البدء يجب أن يكون بعد الوقت الحالي.')
      return false
    }

    return true
  }

  const handleGenerate = async () => {
    if (!validateDateTime()) return

    const validTasks = tasks.some(t => t.category.trim().length > 0 && t.name.trim().length > 0 && t.duration > 0)
    if (!validTasks) {
      toast.error('أضف مهمة واحدة على الأقل مع تصنيف واسم ومدة صحيحة')
      return
    }

    if (!title.trim()) {
      toast.error('أدخل عنواناً للجدول')
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
        })
        .select()
        .single()

      if (scheduleError) throw scheduleError

      const tasksToInsert = tasks
        .filter(t => t.category.trim().length > 0 && t.name.trim().length > 0 && t.duration > 0)
        .map(t => ({
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
        .filter(t => t.name.trim().length > 0)
        .map(t => ({
          user_id: user?.id,
          schedule_id: schedule.id,
          name: t.name.trim(),
          category: 'جانبي',
          duration: 0,
          type: 'side',
          priority: 'low',
          done: false,
          completed_sessions: 0,
        }))

      if (sideTasksToInsert.length > 0) {
        const { error: sideError } = await supabase.from('tasks').insert(sideTasksToInsert)
        if (sideError) throw sideError
      }

      const prayersToInsert = prayers.map(p => ({
        user_id: user?.id,
        schedule_id: schedule.id,
        day: date,
        name: p.name,
        time: p.time,
        done: false,
      }))

      const { error: prayerError } = await supabase.from('prayers').insert(prayersToInsert)
      if (prayerError) throw prayerError

      if (user?.id) {
        const notificationTitle = '✅ تم إنشاء الجدول بنجاح'
        const notificationBody = `جدول "${title.trim()}" بتاريخ ${date} يبدأ الساعة ${startTime}.`
        await requestNotificationPermission()
        sendBrowserNotification(notificationTitle, notificationBody)
        await createAppNotification(user.id, notificationTitle, notificationBody, 'success')
      }

      toast.success('✅ تم إنشاء الجدول بنجاح!')
      router.push('/dashboard/schedule')
    } catch (error: any) {
      console.error(error)
      toast.error(`حدث خطأ: ${error.message || 'غير معروف'}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">📋 المخطط الذكي</h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1">أنشئ جدولاً يومياً متكاملاً مع مهامك وصلواتك</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* معلومات الجدول */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">معلومات الجدول</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">عنوان الجدول *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: يوم عمل مكثف"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">التاريخ</label>
                  <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">وقت البدء</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} min={date === todayStr ? currentTimeStr : undefined}
                    className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* المهام الأساسية */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">المهام الأساسية</h2>
                <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-full">{tasks.length} مهام</span>
              </div>
              <button onClick={addTask}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors font-['Cairo'] text-sm">
                <Plus className="w-4 h-4" /> إضافة مهمة
              </button>
            </div>
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskInput key={task.id} task={task} onUpdate={updateTask} onRemove={removeTask} />
              ))}
            </div>
          </motion.div>

          {/* الأعمال الجانبية */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">الأعمال الجانبية</h2>
                <span className="text-xs text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-full">{sideTasks.length} أعمال</span>
              </div>
              <button onClick={addSideTask}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors font-['Cairo'] text-sm">
                <Plus className="w-4 h-4" /> إضافة عمل
              </button>
            </div>
            <div className="space-y-3">
              {sideTasks.map((task) => (
                <SideTaskInput key={task.id} task={task} onUpdate={updateSideTask} onRemove={removeSideTask} />
              ))}
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* إعدادات بومودورو */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">إعدادات بومودورو</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'مدة العمل (دقيقة)', key: 'workDuration', value: pomodoro.workDuration, min: 1, max: 60 },
                { label: 'راحة قصيرة (دقيقة)', key: 'shortBreak', value: pomodoro.shortBreak, min: 1, max: 30 },
                { label: 'راحة طويلة (دقيقة)', key: 'longBreak', value: pomodoro.longBreak, min: 1, max: 60 },
                { label: 'دورات قبل راحة طويلة', key: 'cyclesBeforeLong', value: pomodoro.cyclesBeforeLong, min: 2, max: 10 },
              ].map((item) => (
                <div key={item.key}>
                  <label className="block text-xs text-[var(--text-secondary)] font-['Cairo'] mb-1">{item.label}</label>
                  <input type="number" min={item.min} max={item.max} value={item.value}
                    onChange={(e) => updatePomodoro(item.key as keyof PomodoroSettings, parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] text-sm" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* مواقيت الصلاة */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">مواقيت الصلاة</h2>
            </div>
            <div className="space-y-2">
              {prayers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#D4AF37]/30 transition-colors">
                  <span className="text-sm text-[var(--text-primary)] font-['Cairo']">{p.name}</span>
                  <span className="text-sm text-[var(--text-secondary)] font-['Cairo']">{p.time}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* زر الإنشاء */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg">
              {generating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6" /> إنشاء الجدول</>}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}