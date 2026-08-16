'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { Clock } from '@/components/Clock'
import { Greeting } from '@/components/Greeting'
import { Footer } from '@/components/Footer'
import { NeonParticles } from '@/components/NeonParticles'
import { toast } from 'sonner'
import {
  Crown,
  Bell,
  User,
  CheckCircle,
  ListChecks,
  Clock as ClockIcon,
  Play,
  Plus,
  Zap,
  AlertCircle,
  Flame,
  X,
  Calendar,
  Trash2,
  HelpCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { useTimer } from '@/context/TimerContext'
import { useTour } from '@/context/TourContext'

// ==================== Types ====================
type Task = {
  id: string
  user_id: string
  schedule_id: string | null
  name: string
  category: string
  duration: number // بالدقائق
  type: 'task' | 'side'
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  done: boolean
  completed_sessions?: number
  created_at: string
}

type Project = {
  id: string
  name: string
  color: string
}

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
}

// ==================== Helper Components ====================
function StatCard({ icon: Icon, value, label, subText, color = 'gold', delay = 0 }: any) {
  const colors: any = {
    gold: 'from-[#D4AF37]/20 to-[#D4AF37]/5',
    blue: 'from-blue-500/20 to-blue-500/5',
    green: 'from-emerald-500/20 to-emerald-500/5',
    purple: 'from-purple-500/20 to-purple-500/5',
    red: 'from-red-500/20 to-red-500/5',
  }
  const iconColors: any = {
    gold: 'text-[#D4AF37]',
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, type: 'spring', stiffness: 300 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className={`relative overflow-hidden rounded-2xl bg-[var(--bg-card)] bg-gradient-to-br ${colors[color]} p-6 backdrop-blur-xl group shadow-lg hover:shadow-xl transition-shadow duration-300 border border-[var(--border-color)]`}
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#D4AF37]/5 blur-3xl group-hover:scale-150 transition-transform duration-700" />
      <div className="relative flex items-start gap-4">
        <motion.div
          whileHover={{ rotate: 12, scale: 1.1 }}
          className={`p-3 rounded-xl bg-white/10 ${iconColors[color]} backdrop-blur-sm`}
        >
          <Icon className="w-6 h-6" />
        </motion.div>
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
            className="flex items-center gap-2"
          >
            <span className="text-3xl font-bold text-[var(--text-primary)] font-['Amiri']">
              {value}
            </span>
          </motion.div>
          <div className="text-[var(--text-secondary)] text-sm font-['Cairo']">{label}</div>
          {subText && (
            <div className="text-[var(--text-muted)] text-xs mt-1 font-['Cairo']">{subText}</div>
          )}
        </div>
      </div>
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#D4AF37] to-[#D4AF37]/20"
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ delay: delay + 0.5, duration: 0.8 }}
      />
    </motion.div>
  )
}

function ImportantTaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#D4AF37]/20 transition-all duration-300">
      <div className={`w-1.5 h-8 rounded-full ${task.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'}`} />
      <span className="flex-1 font-['Cairo'] text-[var(--text-primary)]">{task.name}</span>
      <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
        {task.due_date ? format(new Date(task.due_date), 'dd/MM', { locale: ar }) : '—'}
      </span>
    </div>
  )
}

// ==================== مكون المؤقت الدائري ====================
function CircularTimer({ timeLeft, totalDuration, taskName, scheduleTitle, isPaused }: {
  timeLeft: number
  totalDuration: number
  taskName: string | null
  scheduleTitle: string | null
  isPaused: boolean
}) {
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const progress = totalDuration > 0 ? Math.max(0, Math.min(1, timeLeft / totalDuration)) : 0
  const dashOffset = circumference * (1 - progress)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-[#D4AF37]">
              {formatTime(timeLeft)}
            </div>
            {isPaused && (
              <div className="text-xs text-yellow-400 font-['Cairo'] mt-1">متوقف مؤقتاً</div>
            )}
          </div>
        </div>
      </div>
      {taskName && (
        <div className="mt-2 text-sm font-bold text-[var(--text-primary)] font-['Cairo']">
          {taskName}
        </div>
      )}
      {scheduleTitle && (
        <div className="text-xs text-[var(--text-secondary)] font-['Cairo'] mt-1">
          📋 {scheduleTitle}
        </div>
      )}
    </div>
  )
}

// ==================== دالة التاريخ المحلي ====================
function getLocalToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ==================== Dashboard Page ====================
export default function DashboardPage() {
  const router = useRouter()
  const { user, fullName } = useSupabase()
  const { timerState, pauseTimer, resumeTimer, resetTimer } = useTimer()
  const { startTour } = useTour()
  const [loading, setLoading] = useState(true)

  // ✅ التاريخ المحلي كحالة متغيرة تتحدث تلقائيًا
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

  // ✅ مؤقت لفحص تغيّر اليوم كل دقيقة (يستخدم التاريخ المحلي)
  useEffect(() => {
    const checkDayChange = () => {
      const newToday = getLocalToday()
      if (newToday !== today) {
        setToday(newToday)
      }
    }
    const interval = setInterval(checkDayChange, 60000) // كل دقيقة
    return () => clearInterval(interval)
  }, [today])

  // ==================== Fetch Data ====================
  const fetchData = useCallback(async () => {
    if (!user) return
    const supabase = createClient()

    try {
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: false })

      if (schedulesError) throw schedulesError

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)

      if (tasksError) throw tasksError

      const schedulesList = schedulesData || []
      const tasksList = tasksData || []

      const schedulesWithSessions: ScheduleWithSessions[] = schedulesList.map(schedule => {
        // المهام الأساسية فقط: type = 'task' و duration > 0
        const scheduleTasks = tasksList.filter(t => t.schedule_id === schedule.id && t.type === 'task' && t.duration > 0)
        const workDuration = schedule.pomodoro?.workDuration || 50
        let totalSessions = 0
        let completedSessions = 0

        scheduleTasks.forEach(task => {
          const sessionsForTask = Math.ceil((task.duration || workDuration) / workDuration)
          totalSessions += sessionsForTask

          if (task.completed_sessions !== undefined && task.completed_sessions !== null) {
            completedSessions += Math.min(task.completed_sessions, sessionsForTask)
          } else if (task.done) {
            completedSessions += sessionsForTask
          }
        })

        return {
          ...schedule,
          totalSessions,
          completedSessions,
        }
      })

      const todaySchedule = schedulesWithSessions.find(s => s.day === today)
      const remainingTasks = tasksList.filter(t => !t.done).length

      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('user_id', user.id)

      // ✅ فحص ما إذا كان المؤقت يشير إلى جدول محذوف
      if (timerState.scheduleId) {
        const exists = schedulesList.some(s => s.id === timerState.scheduleId)
        if (!exists) {
          resetTimer()
          toast.info('تم إيقاف المؤقت لأن الجدول المرتبط به لم يعد موجودًا.')
        }
      }

      setSchedules(schedulesWithSessions)
      setTasks(tasksList)
      setProjects(projectsData || [])
      setStats({
        schedulesCount: schedulesList.length,
        remainingTasks,
        remainingSessions: todaySchedule ? todaySchedule.totalSessions - todaySchedule.completedSessions : 0,
        completedSessions: todaySchedule ? todaySchedule.completedSessions : 0,
      })

    } catch (error) {
      console.error('Dashboard fetch error:', error)
      toast.error('تعذر تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [user, today, timerState.scheduleId, resetTimer])

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, mirror: true })
    if (user) fetchData()
  }, [user, fetchData])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const channels = [
      supabase.channel('dashboard-schedules')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
      supabase.channel('dashboard-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
      supabase.channel('dashboard-projects')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, fetchData)
        .subscribe(),
    ]
    return () => {
      channels.forEach(c => supabase.removeChannel(c))
    }
  }, [user, fetchData])

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission('unsupported')
    }
  }, [])

  // Important tasks (high priority, non-done)
  const importantTasks = useMemo(() => {
    return tasks
      .filter(t => !t.done && t.priority === 'high')
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 5)
  }, [tasks])

  const todaySchedule = schedules.find(s => s.day === today)

  const getGreetingTime = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'صباح الخير'
    if (hour < 18) return 'مساء الخير'
    return 'مساء الخير'
  }

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('المتصفح لا يدعم الإشعارات')
      setNotificationPermission('unsupported')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') toast.success('تم تفعيل الإشعارات بنجاح')
      else toast.error('تم رفض الإشعارات')
    } catch (error) {
      console.error(error)
    }
  }

  // Notifications from important tasks and today's schedule
  const notifications = useMemo(() => {
    const list: { id: string; type: 'task' | 'session'; title: string; description: string }[] = []
    importantTasks.forEach(t => {
      list.push({
        id: `task-${t.id}`,
        type: 'task',
        title: `مهمة هامة: ${t.name}`,
        description: t.due_date ? `تستحق ${format(new Date(t.due_date), 'dd/MM', { locale: ar })}` : 'أولوية عالية',
      })
    })
    if (todaySchedule && todaySchedule.totalSessions > 0) {
      list.push({
        id: 'today-sessions',
        type: 'session',
        title: `جلسات اليوم`,
        description: `المجموع: ${todaySchedule.totalSessions} • المنجز: ${stats.completedSessions} • المتبقي: ${stats.remainingSessions}`,
      })
    }
    return list
  }, [importantTasks, todaySchedule, stats])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <NeonParticles />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full z-10"
        />
      </div>
    )
  }

  const toggleNotifications = () => {
    setNotificationsOpen(prev => {
      const newOpen = !prev
      if (newOpen) {
        const currentCount = notifications.length
        setLastSeenNotificationCount(currentCount)
        localStorage.setItem('lastSeenNotificationCount', String(currentCount))
      }
      return newOpen
    })
  }

  // ========== حساب بيانات المؤقت الحالي ==========
  const currentPhaseIndex = timerState.currentPhaseIndex
  const currentPhase = currentPhaseIndex !== null && timerState.phases && currentPhaseIndex < timerState.phases.length
    ? timerState.phases[currentPhaseIndex]
    : null
  const totalDuration = currentPhase ? currentPhase.duration : 0
  const isTimerActive = timerState.isRunning || timerState.isPaused
  const isPaused = timerState.isPaused

  const handleDeleteSchedule = async (scheduleId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!confirm('هل أنت متأكد من حذف هذا الجدول؟ سيتم حذف جميع المهام والصلوات المرتبطة به.')) return

    const supabase = createClient()
    try {
      await supabase.from('tasks').delete().eq('schedule_id', scheduleId)
      await supabase.from('prayers').delete().eq('schedule_id', scheduleId)
      await supabase.from('custom_cards').delete().eq('schedule_id', scheduleId)

      const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)

      if (deleteError) throw deleteError

      if (timerState.scheduleId === scheduleId) {
        resetTimer()
      }

      toast.success('🗑️ تم حذف الجدول بنجاح')
      fetchData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast.error('حدث خطأ أثناء حذف الجدول')
    }
  }

  return (
    <div className="relative min-h-screen p-6 space-y-6 text-[var(--text-primary)] font-['Cairo'] transition-colors duration-300" dir="rtl">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <NeonParticles />
        <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-[#D4AF37]/5 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '0.5s' }} />
      </div>

      <div className="relative z-10 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-visible rounded-2xl bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/8 to-transparent p-6 backdrop-blur-xl group shadow-lg border border-[var(--border-color)] z-50"
          data-tour="dashboard-header"
        >
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="p-2 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                >
                  <Crown className="w-8 h-8" />
                </motion.div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold font-['Amiri'] text-[var(--text-primary)]">
                    {getGreetingTime()}، <span className="text-[#D4AF37]">{fullName || 'مستخدم'}</span>
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[var(--text-secondary)] font-['Cairo']">
                      {format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}
                    </span>
                    <Clock />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* زر كيفية عمل الموقع */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={startTour}
                className="p-2.5 rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[#D4AF37] transition-all duration-300 shadow-md hover:shadow-lg border border-[var(--border-color)]"
                title="كيف يعمل الموقع؟"
              >
                <HelpCircle className="w-5 h-5" />
              </motion.button>

              {/* Notifications */}
              <div className="relative z-[100]" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleNotifications}
                  className="p-2.5 rounded-xl bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[#D4AF37] transition-all duration-300 shadow-md hover:shadow-lg border border-[var(--border-color)] relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > lastSeenNotificationCount && (
                    <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                      {notifications.length - lastSeenNotificationCount}
                    </span>
                  )}
                </motion.button>

                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-14 left-0 w-80 max-h-96 overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl z-[100] p-2"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
                      <h4 className="font-bold text-sm">الإشعارات</h4>
                      <button onClick={() => setNotificationsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-[var(--text-muted)]">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div className="space-y-1 mt-2">
                        {notifications.map(notif => (
                          <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-card)]">
                            <div className={`p-2 rounded-lg ${notif.type === 'task' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                              {notif.type === 'task' ? <AlertCircle className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold">{notif.title}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{notif.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {notificationPermission === 'default' && (
                      <button
                        onClick={handleEnableNotifications}
                        className="mt-2 w-full py-2 rounded-lg bg-[#D4AF37] text-[#0b1a2e] text-sm font-bold hover:bg-[#D4AF37]/90 transition-colors"
                      >
                        تفعيل إشعارات المتصفح
                      </button>
                    )}
                  </motion.div>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] shadow-md border border-[var(--border-color)]">
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm text-[var(--text-secondary)]">{fullName || 'مستخدم'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-tour="dashboard-stats">
          <div data-aos="fade-up" data-aos-delay="100">
            <StatCard icon={Calendar} value={stats.schedulesCount} label="عدد الجداول" subText="خطة يومية" color="gold" delay={0.1} />
          </div>
          <div data-aos="fade-up" data-aos-delay="200">
            <StatCard icon={ListChecks} value={stats.remainingTasks} label="المهام المتبقية" subText="غير منجزة" color="blue" delay={0.2} />
          </div>
          <div data-aos="fade-up" data-aos-delay="300">
            <StatCard icon={ClockIcon} value={stats.remainingSessions} label="الجلسات المتبقية" subText="لم تبدأ بعد" color="purple" delay={0.3} />
          </div>
          <div data-aos="fade-up" data-aos-delay="400">
            <StatCard icon={CheckCircle} value={stats.completedSessions} label="الجلسات المنجزة" subText="مكتملة ✅" color="green" delay={0.4} />
          </div>
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Important tasks */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-5 shadow-lg h-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold">مهام اليوم الهامة</h3>
                <span className="mr-auto text-xs text-[var(--text-muted)]">{importantTasks.length} مهام</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {importantTasks.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)]">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">🎉 لا توجد مهام هامة اليوم</p>
                  </div>
                ) : (
                  importantTasks.map(task => <ImportantTaskItem key={task.id} task={task} />)
                )}
              </div>
            </motion.div>
          </div>

          {/* Start session / Timer display */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 via-[#D4AF37]/5 to-transparent p-8 backdrop-blur-xl group shadow-lg border border-[#D4AF37]/30 h-full flex flex-col items-center justify-center"
              data-tour="dashboard-timer"
            >
              <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-[#D4AF37]/20 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative text-center w-full">
                {isTimerActive && currentPhase ? (
                  <>
                    <CircularTimer
                      timeLeft={timerState.timeLeft}
                      totalDuration={totalDuration}
                      taskName={timerState.taskName || currentPhase.taskName || null}
                      scheduleTitle={timerState.scheduleTitle}
                      isPaused={isPaused}
                    />
                    <div className="mt-4 flex gap-2 justify-center">
                      {isPaused ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={resumeTimer}
                          className="px-6 py-2 rounded-xl bg-emerald-500 text-white font-bold shadow-lg hover:shadow-emerald-500/30 transition-all"
                        >
                          ▶ استئناف
                        </motion.button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={pauseTimer}
                          className="px-6 py-2 rounded-xl bg-yellow-500 text-white font-bold shadow-lg hover:shadow-yellow-500/30 transition-all"
                        >
                          ⏸ إيقاف مؤقت
                        </motion.button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mb-4"
                    >
                      <div className="w-24 h-24 mx-auto rounded-full bg-[#D4AF37]/20 flex items-center justify-center shadow-lg border border-[#D4AF37]/30">
                        <Play className="w-12 h-12 text-[#D4AF37] mr-1" />
                      </div>
                    </motion.div>
                    <h3 className="text-2xl font-bold font-['Amiri']">ابدأ جلسة</h3>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">
                      {todaySchedule ? `${todaySchedule.totalSessions} جلسات اليوم • ${stats.completedSessions} منجزة • ${stats.remainingSessions} متبقية` : 'لا توجد جلسات اليوم'}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/dashboard/schedule/${todaySchedule?.id || ''}`)}
                      disabled={!todaySchedule}
                      className="mt-4 px-8 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] border border-[#D4AF37]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        ابدأ التركيز
                      </span>
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Schedules list */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-2xl bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] p-5 shadow-lg h-full"
              data-tour="dashboard-schedules"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-bold">الجداول</h3>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{schedules.length} جدول</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {schedules.length === 0 ? (
                  <div className="text-center py-6 text-[var(--text-muted)]">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">لا توجد جداول</p>
                  </div>
                ) : (
                  schedules.slice(0, 5).map(schedule => (
                    <div
                      key={schedule.id}
                      onClick={() => router.push(`/dashboard/schedule/${schedule.id}`)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 group ${
                        schedule.day === today
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 shadow-lg shadow-[#D4AF37]/10'
                          : 'border-[var(--border-color)] hover:border-[#D4AF37]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold font-['Amiri'] ${schedule.day === today ? 'text-[#D4AF37]' : 'text-[var(--text-primary)]'}`}>
                          {schedule.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {schedule.day === today && (
                            <span className="text-xs px-2 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] animate-pulse">
                              ✅ اليوم
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-red-500/10 text-red-400"
                            title="حذف الجدول"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">
                          {format(new Date(schedule.day), 'EEEE، d MMMM', { locale: ar })}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          منجز: {schedule.completedSessions} • متبقي: {schedule.totalSessions - schedule.completedSessions}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard/planner')}
                className="mt-3 w-full py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors font-['Cairo'] border border-[#D4AF37]/30 flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                أضف جدولاً جديداً
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}