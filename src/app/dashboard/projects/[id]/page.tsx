// src/app/(dashboard)/schedule/[id]/page.tsx
// النسخة النهائية - جدول مخصص مع مؤقت، صلوات، كاردات مخصصة، أعمال جانبية
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useTimer } from '@/context/TimerContext'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import {
  ArrowRight,
  Calendar,
  Clock,
  CheckCircle,
  Trash2,
  Plus,
  X,
  Loader2,
  BookOpen,
  Coffee,
  Sparkles,
  Moon,
  Tag,
  Timer,
  Eye,
  EyeOff,
  Play,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

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
  user_id: string
  schedule_id: string
  name: string
  category: string
  duration: number
  type: 'task' | 'side'
  priority: 'high' | 'medium' | 'low'
  done: boolean
  created_at: string
}

type Prayer = {
  id: string
  user_id: string
  schedule_id: string
  day: string
  name: string
  time: string
  done: boolean
  created_at: string
}

type CustomCard = {
  id: string
  user_id: string
  schedule_id: string
  title: string
  items: string[]
  color: string
  created_at: string
}

type Phase = {
  type: 'work' | 'shortBreak' | 'longBreak'
  duration: number
  taskId?: string
  taskName?: string
  sessionNumber?: number
  startTime: Date
  endTime: Date
  hasPrayerConflict?: boolean
  prayerName?: string
}

// ============================================================
//  صوت التنبيه
// ============================================================
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 1100
      osc2.type = 'sine'
      gain2.gain.setValueAtTime(0.25, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc2.start(ctx.currentTime)
      osc2.stop(ctx.currentTime + 0.4)
    }, 200)
  } catch (_) {}
}

// ============================================================
//  مكون الجلسة (المرحلة الواحدة)
// ============================================================
function PhaseItem({
  phase,
  index,
  totalPhases,
  isActive,
  isCompleted,
  isLocked,
  onStart,
  onComplete,
  timeLeft,
  totalDuration,
  canComplete,
}: {
  phase: Phase
  index: number
  totalPhases: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  onStart: () => void
  onComplete: () => void
  timeLeft: number
  totalDuration: number
  canComplete: boolean
}) {
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0
  const startTimeStr = format(phase.startTime, 'hh:mm a')
  const endTimeStr = format(phase.endTime, 'hh:mm a')

  const getPhaseLabel = () => {
    if (phase.type === 'work') return `جلسة ${phase.sessionNumber || ''}`
    if (phase.type === 'shortBreak') return 'راحة قصيرة'
    if (phase.type === 'longBreak') return 'راحة طويلة'
    return ''
  }

  const getPhaseColor = () => {
    if (phase.type === 'work') return 'border-[#D4AF37] bg-[#D4AF37]/10'
    if (phase.type === 'shortBreak') return 'border-blue-500/30 bg-blue-500/5'
    if (phase.type === 'longBreak') return 'border-green-500/30 bg-green-500/5'
    return 'border-[var(--border-color)]'
  }

  const getPhaseIcon = () => {
    if (phase.type === 'work') return <BookOpen className="w-4 h-4 text-[#D4AF37]" />
    if (phase.type === 'shortBreak') return <Coffee className="w-4 h-4 text-blue-400" />
    if (phase.type === 'longBreak') return <Moon className="w-4 h-4 text-green-400" />
    return <Timer className="w-4 h-4" />
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${getPhaseColor()} ${
        isActive ? 'shadow-lg shadow-[#D4AF37]/20' : ''
      } ${isCompleted ? 'opacity-60' : ''} ${isLocked ? 'opacity-40' : ''}`}
    >
      {phase.hasPrayerConflict && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-['Cairo'] border border-red-500/30">
          <AlertCircle className="w-3 h-3" />
          {phase.prayerName}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getPhaseIcon()}
          <div>
            <div className="font-bold text-[var(--text-primary)] font-['Cairo']">
              {phase.taskName || getPhaseLabel()}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-['Cairo'] flex items-center gap-2 flex-wrap">
              <Tag className="w-3 h-3" />
              {phase.type === 'work' ? 'دراسة' : phase.type === 'shortBreak' ? 'راحة' : 'راحة طويلة'}
              <span className="text-[var(--text-muted)]">•</span>
              <Clock className="w-3 h-3" />
              <span className="font-mono">{startTimeStr} → {endTimeStr}</span>
              {phase.duration > 0 && (
                <>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span>{Math.floor(phase.duration / 60)} د</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isActive && (
            <span className={`text-xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-[#D4AF37]'}`}>
              {formatTime(timeLeft)}
            </span>
          )}

          {isCompleted ? (
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-['Cairo'] flex items-center gap-1">
              <Check className="w-3 h-3" /> مكتملة
            </span>
          ) : isActive ? (
            <button
              onClick={onComplete}
              disabled={!canComplete}
              className={`px-4 py-1.5 rounded-lg font-bold transition-all duration-300 font-['Cairo'] text-sm flex items-center gap-1 ${
                canComplete
                  ? 'bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/30'
                  : 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" /> إنهاء
            </button>
          ) : isLocked ? (
            <span className="text-xs px-3 py-1 rounded-full bg-white/5 text-[var(--text-muted)] font-['Cairo'] flex items-center gap-1">
              <Clock className="w-3 h-3" /> انتظار
            </span>
          ) : (
            <button
              onClick={onStart}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] text-sm flex items-center gap-1"
            >
              <Play className="w-4 h-4" /> ابدأ
            </button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#D4AF37]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </motion.div>
  )
}

// ============================================================
//  مكون المهام الجانبية
// ============================================================
function SideTaskItem({ task, onToggle }: { task: Task; onToggle: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#D4AF37]/30 transition-all duration-300">
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
          task.done
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-[var(--text-muted)] hover:border-[#D4AF37]'
        }`}
      >
        {task.done && <CheckCircle className="w-3 h-3 text-white" />}
      </button>
      <span className={`flex-1 font-['Cairo'] text-sm ${task.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
        {task.name}
      </span>
    </div>
  )
}

// ============================================================
//  مكون الكارد المخصص
// ============================================================
function CustomCardItem({ card, onDelete }: { card: CustomCard; onDelete: (id: string) => void }) {
  return (
    <div className="relative p-4 rounded-xl border-2 bg-[var(--bg-card)]" style={{ borderColor: card.color }}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-[var(--text-primary)] font-['Amiri']" style={{ color: card.color }}>
          {card.title}
        </h4>
        <button
          onClick={() => onDelete(card.id)}
          className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <ul className="space-y-1">
        {card.items.map((item, i) => (
          <li key={i} className="text-sm text-[var(--text-secondary)] font-['Cairo'] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: card.color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================
//  مودال إضافة عمل جانبي
// ============================================================
function AddSideTaskModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
  isLoading: boolean
}) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (!isOpen) setName('')
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('أدخل اسم العمل الجانبي')
      return
    }
    await onSave(name.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">إضافة عمل جانبي</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="اسم العمل الجانبي"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] font-['Cairo']"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            إضافة
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================================
//  مودال إضافة كارد مخصص
// ============================================================
function AddCardModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, items: string[], color: string) => Promise<void>
  isLoading: boolean
}) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState<string[]>([''])
  const [color, setColor] = useState('#D4AF37')

  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setItems([''])
      setColor('#D4AF37')
    }
  }, [isOpen])

  const addItem = () => {
    if (items.length < 10) setItems([...items, ''])
  }

  const updateItem = (index: number, value: string) => {
    const updated = [...items]
    updated[index] = value
    setItems(updated)
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('أدخل عنواناً للكارد')
      return
    }
    const filteredItems = items.filter(i => i.trim().length > 0)
    if (filteredItems.length === 0) {
      toast.error('أضف عنصراً واحداً على الأقل')
      return
    }
    await onSave(title.trim(), filteredItems, color)
  }

  const colors = ['#D4AF37', '#F44336', '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#009688', '#4CAF50', '#FF9800', '#795548']

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">إضافة كارد مخصص</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">عنوان الكارد</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: أذكار الصباح"
              className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] font-['Cairo']"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">العناصر (حتى 10)</label>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    placeholder={`عنصر ${index + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] font-['Cairo'] text-sm"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {items.length < 10 && (
              <button
                type="button"
                onClick={addItem}
                className="mt-2 text-sm text-[#D4AF37] hover:underline font-['Cairo'] flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">اللون</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            إضافة الكارد
          </button>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================================
//  الصفحة الرئيسية للجدول المخصص
// ============================================================
export default function ScheduleDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useSupabase()
  const { timerState, startTimer: startGlobalTimer, completePhase: completeGlobalPhase, setTimerVisibility } = useTimer()
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [prayers, setPrayers] = useState<Prayer[]>([])
  const [customCards, setCustomCards] = useState<CustomCard[]>([])
  const [showPrayers, setShowPrayers] = useState(true)

  const [phases, setPhases] = useState<Phase[]>([])
  const [completedPhases, setCompletedPhases] = useState<number[]>([])
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number | null>(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const [isAddSideTaskModalOpen, setIsAddSideTaskModalOpen] = useState(false)
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [currentTime, setCurrentTime] = useState(new Date())
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, mirror: true })
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    if (user && id) fetchData()
    return () => clearInterval(interval)
  }, [user, id])

  // ===== التحكم في رؤية الفلوتنج تايمر (بدون تكرار لانهائي) =====
  useEffect(() => {
    // عند دخول صفحة التفاصيل، نخفي الفلوتنج تايمر
    setTimerVisibility(false)
    return () => {
      // عند الخروج، نظهره إذا كان هناك مؤقت نشط
      const saved = localStorage.getItem('floatingTimer')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.currentPhaseIndex !== null && parsed.scheduleId !== id) {
            setTimerVisibility(true)
          }
        } catch (_) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // تشغيل مرة واحدة فقط عند التحميل

  // مزامنة الحالة المحلية مع TimerContext
  useEffect(() => {
    if (timerState.scheduleId === id) {
      setPhases(timerState.phases)
      setCurrentPhaseIndex(timerState.currentPhaseIndex)
      setCompletedPhases(Array.from({ length: timerState.completedPhases }, (_, i) => i))
      setIsTimerRunning(timerState.isRunning)
      setTimeLeft(timerState.timeLeft)
    }
  }, [timerState, id])

  const fetchData = async () => {
    if (!user || !id) return
    const supabase = createClient()
    try {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (scheduleError || !scheduleData) {
        toast.error('الجدول غير موجود')
        router.push('/dashboard/schedule')
        return
      }
      setSchedule(scheduleData)

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('schedule_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setTasks(tasksData || [])

      const { data: prayersData } = await supabase
        .from('prayers')
        .select('*')
        .eq('schedule_id', id)
        .eq('user_id', user.id)
        .order('time', { ascending: true })
      setPrayers(prayersData || [])

      const { data: cardsData } = await supabase
        .from('custom_cards')
        .select('*')
        .eq('schedule_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setCustomCards(cardsData || [])

      generatePhases(tasksData || [], scheduleData, prayersData || [])
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const generatePhases = (tasksData: Task[], scheduleData: Schedule, prayersData: Prayer[]) => {
    const studyTasks = tasksData.filter(t => t.type === 'task' && t.duration > 0)
    const pom = scheduleData.pomodoro
    const startDate = new Date(`${scheduleData.day}T${scheduleData.start_time}`)
    let currentTime = startDate
    const newPhases: Phase[] = []
    let sessionCounter = 0
    let cycleCounter = 0

    studyTasks.forEach(task => {
      const totalMinutes = task.duration
      const workDur = pom.workDuration
      const count = Math.ceil(totalMinutes / workDur)
      for (let i = 0; i < count; i++) {
        sessionCounter++
        const phaseStart = new Date(currentTime)
        const phaseEnd = new Date(currentTime.getTime() + workDur * 60000)
        let hasPrayerConflict = false
        let prayerName = ''
        for (const prayer of prayersData) {
          const [h, m] = prayer.time.split(':').map(Number)
          const prayerDate = new Date(scheduleData.day)
          prayerDate.setHours(h, m, 0, 0)
          if (prayerDate >= phaseStart && prayerDate <= phaseEnd) {
            hasPrayerConflict = true
            prayerName = prayer.name
            break
          }
        }
        newPhases.push({
          type: 'work',
          duration: workDur * 60,
          taskId: task.id,
          taskName: task.name,
          sessionNumber: sessionCounter,
          startTime: phaseStart,
          endTime: phaseEnd,
          hasPrayerConflict,
          prayerName,
        })
        currentTime = new Date(phaseEnd.getTime())
        if (!(i === count - 1 && task === studyTasks[studyTasks.length - 1])) {
          cycleCounter++
          let breakDur = pom.shortBreak
          let breakType: 'shortBreak' | 'longBreak' = 'shortBreak'
          if (cycleCounter % pom.cyclesBeforeLong === 0) {
            breakDur = pom.longBreak
            breakType = 'longBreak'
          }
          const breakStart = new Date(currentTime)
          const breakEnd = new Date(currentTime.getTime() + breakDur * 60000)
          let hasPrayerConflictBreak = false
          let prayerNameBreak = ''
          for (const prayer of prayersData) {
            const [h, m] = prayer.time.split(':').map(Number)
            const prayerDate = new Date(scheduleData.day)
            prayerDate.setHours(h, m, 0, 0)
            if (prayerDate >= breakStart && prayerDate <= breakEnd) {
              hasPrayerConflictBreak = true
              prayerNameBreak = prayer.name
              break
            }
          }
          newPhases.push({
            type: breakType,
            duration: breakDur * 60,
            startTime: breakStart,
            endTime: breakEnd,
            hasPrayerConflict: hasPrayerConflictBreak,
            prayerName: prayerNameBreak,
          })
          currentTime = new Date(breakEnd.getTime())
        }
      }
    })
    setPhases(newPhases)
  }

  const handleStartPhase = (index: number) => {
    if (currentPhaseIndex !== null && currentPhaseIndex !== index) {
      toast.error('يجب إنهاء الجلسة الحالية أولاً')
      return
    }
    const phase = phases[index]
    if (!phase) return
    setCurrentPhaseIndex(index)
    setTimeLeft(phase.duration)
    setIsTimerRunning(true)
    startGlobalTimer(schedule!.id, schedule!.title, phases, index)
    toast.info(`🎯 بدأت ${phase.type === 'work' ? `جلسة ${phase.sessionNumber}` : phase.type === 'shortBreak' ? 'راحة قصيرة' : 'راحة طويلة'}`)
  }

  const handleCompletePhase = (index: number) => {
    if (currentPhaseIndex !== index) return
    if (timeLeft > 0) {
      toast.error('لا يمكن إنهاء الجلسة قبل انتهاء وقتها!')
      return
    }
    setIsTimerRunning(false)
    setCompletedPhases([...completedPhases, index])
    setCurrentPhaseIndex(null)
    completeGlobalPhase()
    playAlertSound()
    toast.success(`✅ تم إنهاء المرحلة رقم ${index + 1}`)
  }

  const handleToggleSideTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const supabase = createClient()
    const { error } = await supabase.from('tasks').update({ done: !task.done }).eq('id', taskId)
    if (error) toast.error('حدث خطأ في تحديث المهمة')
    else setTasks(tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t))
  }

  const handleTogglePrayer = async (prayerId: string) => {
    const prayer = prayers.find(p => p.id === prayerId)
    if (!prayer) return
    const supabase = createClient()
    const { error } = await supabase.from('prayers').update({ done: !prayer.done }).eq('id', prayerId)
    if (error) toast.error('حدث خطأ في تحديث الصلاة')
    else setPrayers(prayers.map(p => p.id === prayerId ? { ...p, done: !p.done } : p))
  }

  const handleAddSideTask = async (name: string) => {
    if (!user || !schedule) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      schedule_id: schedule.id,
      name,
      category: 'جانبي',
      duration: 0,
      type: 'side',
      priority: 'low',
      done: false,
    }).select().single()
    if (error) toast.error('حدث خطأ في إضافة العمل الجانبي')
    else { setTasks([...tasks, data]); toast.success('✅ تم إضافة العمل الجانبي'); setIsAddSideTaskModalOpen(false) }
    setIsSaving(false)
  }

  const handleAddCard = async (title: string, items: string[], color: string) => {
    if (!user || !schedule) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('custom_cards').insert({
      user_id: user.id,
      schedule_id: schedule.id,
      title,
      items,
      color,
    }).select().single()
    if (error) toast.error('حدث خطأ في إضافة الكارد')
    else {
      setCustomCards([...customCards, data])
      toast.success('✅ تم إضافة الكارد')
      setIsAddCardModalOpen(false)
      const tasksToInsert = items.map(item => ({
        user_id: user.id,
        schedule_id: schedule.id,
        name: item,
        category: title,
        duration: 0,
        type: 'task',
        priority: 'medium',
        done: false,
      }))
      await supabase.from('tasks').insert(tasksToInsert)
    }
    setIsSaving(false)
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكارد؟')) return
    const supabase = createClient()
    const { error } = await supabase.from('custom_cards').delete().eq('id', cardId)
    if (error) toast.error('حدث خطأ في حذف الكارد')
    else { setCustomCards(customCards.filter(c => c.id !== cardId)); toast.success('🗑️ تم حذف الكارد') }
  }

  const formatTimeDisplay = (date: Date) => {
    const h = date.getHours()
    const m = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    const ampm = h >= 12 ? 'مساءً' : 'صباحاً'
    const hour12 = h % 12 || 12
    return `${hour12}:${m}:${s} ${ampm}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!schedule) return null

  const totalPhases = phases.length
  const completedCount = completedPhases.length
  const progress = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0
  const formattedDate = format(new Date(schedule.day), 'EEEE، d MMMM yyyy', { locale: ar })
  const isToday = schedule.day === today

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/schedule')}
            className="p-2 rounded-xl hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">{schedule.title}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-[var(--text-secondary)] font-['Cairo'] flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {formattedDate}
              </span>
              <span className="text-sm text-[var(--text-secondary)] font-['Cairo'] flex items-center gap-1">
                <Clock className="w-4 h-4" /> {schedule.start_time}
              </span>
              {isToday && (
                <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-['Cairo'] animate-pulse">
                  ✅ اليوم
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-bold text-[#D4AF37] bg-[var(--bg-card)] px-4 py-2 rounded-xl border border-[var(--border-color)]">
            {formatTimeDisplay(currentTime)}
          </div>
          <button
            onClick={() => setShowPrayers(!showPrayers)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-['Cairo'] transition-colors ${
              showPrayers ? 'bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20' : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
            } border border-[var(--border-color)]`}
          >
            {showPrayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showPrayers ? 'إخفاء الصلوات' : 'إظهار الصلوات'}
          </button>
          <button
            onClick={() => setIsAddCardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors font-['Cairo'] border border-purple-500/30"
          >
            <Sparkles className="w-4 h-4" /> كارد
          </button>
          <button
            onClick={() => setIsAddSideTaskModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
          >
            <Plus className="w-5 h-5" /> عمل جانبي
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-secondary)] font-['Cairo']">تقدم الجلسات</span>
          <span className="text-sm font-bold text-[#D4AF37] font-['Cairo']">{progress}% ({completedCount}/{totalPhases})</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#D4AF37]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Coffee className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">أعمال جانبية</h2>
              <span className="mr-auto text-xs text-[var(--text-muted)] font-['Cairo']">
                {tasks.filter(t => t.type === 'side').length} مهمة
              </span>
            </div>
            {tasks.filter(t => t.type === 'side').length === 0 ? (
              <div className="text-center py-6 text-[var(--text-muted)] font-['Cairo']">
                <Coffee className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد أعمال جانبية</p>
                <button onClick={() => setIsAddSideTaskModalOpen(true)} className="mt-2 text-sm text-[#D4AF37] hover:underline font-['Cairo']">
                  أضف عملاً جانبياً
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {tasks.filter(t => t.type === 'side').map(task => (
                  <SideTaskItem key={task.id} task={task} onToggle={handleToggleSideTask} />
                ))}
              </div>
            )}
          </div>
          {customCards.length > 0 && (
            <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">كاردات مخصصة</h2>
              </div>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {customCards.map(card => (
                  <CustomCardItem key={card.id} card={card} onDelete={handleDeleteCard} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">جلسات اليوم</h2>
              <span className="mr-auto text-xs text-[var(--text-muted)] font-['Cairo']">
                {totalPhases} مرحلة • {completedCount} مكتملة
              </span>
            </div>
            {phases.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] font-['Cairo']">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد جلسات دراسية في هذا الجدول</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {phases.map((phase, index) => {
                  const isActive = currentPhaseIndex === index && isTimerRunning
                  const isCompleted = completedPhases.includes(index)
                  const isLocked = !isActive && !isCompleted && (currentPhaseIndex !== null || (index > 0 && !completedPhases.includes(index - 1)))
                  const canComplete = isActive && timeLeft === 0
                  return (
                    <PhaseItem
                      key={index}
                      phase={phase}
                      index={index}
                      totalPhases={totalPhases}
                      isActive={isActive}
                      isCompleted={isCompleted}
                      isLocked={isLocked}
                      onStart={() => handleStartPhase(index)}
                      onComplete={() => handleCompletePhase(index)}
                      timeLeft={isActive ? timeLeft : phase.duration}
                      totalDuration={phase.duration}
                      canComplete={canComplete}
                    />
                  )
                })}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] font-['Cairo'] gap-2">
              <span>⏱️ {schedule.pomodoro.workDuration} د جلسة</span>
              <span>☕ {schedule.pomodoro.shortBreak} د راحة قصيرة</span>
              <span>🔄 {schedule.pomodoro.cyclesBeforeLong} دورات</span>
              <span>🛌 {schedule.pomodoro.longBreak} د راحة طويلة</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {showPrayers && prayers.length > 0 && (
            <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 shadow-lg sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <Moon className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">الصلوات</h2>
              </div>
              <div className="space-y-2">
                {prayers.map((prayer) => {
                  const [h, m] = prayer.time.split(':').map(Number)
                  const ampm = h >= 12 ? 'مساءً' : 'صباحاً'
                  const hour12 = h % 12 || 12
                  const timeStr = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
                  return (
                    <div
                      key={prayer.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#D4AF37]/30 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePrayer(prayer.id)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            prayer.done
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-[var(--text-muted)] hover:border-[#D4AF37]'
                          }`}
                        >
                          {prayer.done && <CheckCircle className="w-3 h-3 text-white" />}
                        </button>
                        <span className={`font-['Cairo'] ${prayer.done ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                          {prayer.name}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--text-secondary)] font-['Cairo']">{timeStr}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {!showPrayers && (
            <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 shadow-lg text-center">
              <Moon className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)]/20" />
              <p className="text-sm text-[var(--text-muted)] font-['Cairo']">تم إخفاء الصلوات</p>
              <button onClick={() => setShowPrayers(true)} className="mt-2 text-sm text-[#D4AF37] hover:underline font-['Cairo']">
                إظهارها
              </button>
            </div>
          )}
        </div>
      </div>

      <AddSideTaskModal
        isOpen={isAddSideTaskModalOpen}
        onClose={() => setIsAddSideTaskModalOpen(false)}
        onSave={handleAddSideTask}
        isLoading={isSaving}
      />

      <AddCardModal
        isOpen={isAddCardModalOpen}
        onClose={() => setIsAddCardModalOpen(false)}
        onSave={handleAddCard}
        isLoading={isSaving}
      />
    </div>
  )
}