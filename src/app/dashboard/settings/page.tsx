'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import {
  Save,
  Loader2,
  Sun,
  Moon,
  Clock,
  Calendar,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  User,
} from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import { useTheme } from '@/context/ThemeContext'

type Settings = {
  id: string
  user_id: string
  theme: 'dark' | 'light'
  primary_color: string
  prayer_times: string[]
  pomodoro: {
    sessionDuration: number
    shortBreak: number
    cyclesBeforeLong: number
    longBreak: number
  }
  updated_at: string
}

const PRAYER_NAMES = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']

export default function SettingsPage() {
  const { user, fullName, updateFullName } = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [prayerTimes, setPrayerTimes] = useState<string[]>(['04:25', '13:02', '16:38', '19:57', '21:26'])
  const [pomodoro, setPomodoro] = useState({
    sessionDuration: 50,
    shortBreak: 10,
    cyclesBeforeLong: 4,
    longBreak: 30,
  })

  // حالة تغيير الاسم
  const [name, setName] = useState(fullName || '')
  const [savingName, setSavingName] = useState(false)

  // حالة وضع التركيز
  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('focusMode') === 'true'
    }
    return false
  })

  useEffect(() => {
    AOS.init({ duration: 600, easing: 'ease-out-cubic', once: true, mirror: true })
    if (user) fetchSettings()
  }, [user])

  useEffect(() => {
    setName(fullName || '')
  }, [fullName])

  useEffect(() => {
    localStorage.setItem('focusMode', String(focusMode))
    document.documentElement.classList.toggle('focus-mode', focusMode)
  }, [focusMode])

  const fetchSettings = async () => {
    if (!user) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      toast.error('حدث خطأ في تحميل الإعدادات')
      console.error(error)
    } else if (data) {
      setSettings(data)
      setPrayerTimes(data.prayer_times || ['04:25', '13:02', '16:38', '19:57', '21:26'])
      setPomodoro(data.pomodoro || { sessionDuration: 50, shortBreak: 10, cyclesBeforeLong: 4, longBreak: 30 })
    } else {
      const defaultSettings = {
        user_id: user.id,
        theme: 'dark',
        primary_color: '#D4AF37',
        prayer_times: ['04:25', '13:02', '16:38', '19:57', '21:26'],
        pomodoro: { sessionDuration: 50, shortBreak: 10, cyclesBeforeLong: 4, longBreak: 30 },
      }
      const { data: newData, error: insertError } = await supabase
        .from('settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        toast.error('حدث خطأ في إنشاء الإعدادات')
        console.error(insertError)
      } else {
        setSettings(newData)
        setPrayerTimes(newData.prayer_times)
        setPomodoro(newData.pomodoro)
      }
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!user || !settings) return

    if (pomodoro.sessionDuration < 1 || pomodoro.sessionDuration > 120) {
      toast.error('مدة الجلسة يجب أن تكون بين 1 و 120 دقيقة')
      return
    }
    if (pomodoro.shortBreak < 1 || pomodoro.shortBreak > 30) {
      toast.error('الراحة القصيرة يجب أن تكون بين 1 و 30 دقيقة')
      return
    }
    if (pomodoro.longBreak < 1 || pomodoro.longBreak > 60) {
      toast.error('الراحة الطويلة يجب أن تكون بين 1 و 60 دقيقة')
      return
    }
    if (pomodoro.cyclesBeforeLong < 1 || pomodoro.cyclesBeforeLong > 10) {
      toast.error('عدد الدورات يجب أن يكون بين 1 و 10')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const updated = {
      prayer_times: prayerTimes,
      pomodoro: pomodoro,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('settings')
      .update(updated)
      .eq('id', settings.id)

    if (error) {
      toast.error('حدث خطأ في حفظ الإعدادات')
      console.error(error)
    } else {
      setSettings({ ...settings, ...updated })
      toast.success('✅ تم حفظ الإعدادات بنجاح')
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleReset = () => {
    if (!confirm('هل أنت متأكد من إعادة الإعدادات إلى القيم الافتراضية؟')) return

    setPrayerTimes(['04:25', '13:02', '16:38', '19:57', '21:26'])
    setPomodoro({ sessionDuration: 50, shortBreak: 10, cyclesBeforeLong: 4, longBreak: 30 })
    toast.info('تم إعادة الإعدادات إلى القيم الافتراضية')
  }

  const updatePrayerTime = (index: number, value: string) => {
    const updated = [...prayerTimes]
    updated[index] = value
    setPrayerTimes(updated)
  }

  const updatePomodoro = (key: keyof typeof pomodoro, value: number) => {
    setPomodoro({ ...pomodoro, [key]: value })
  }

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error('الاسم لا يمكن أن يكون فارغًا')
      return
    }
    setSavingName(true)
    await updateFullName(name.trim())
    setSavingName(false)
  }

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
      {/* ===== الهيدر ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            الإعدادات
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1">
            خصص تجربتك في جَدْوَلِي
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchSettings}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors font-['Cairo'] border border-[var(--border-color)]"
            title="إعادة تحميل الإعدادات"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors font-['Cairo'] border border-[var(--border-color)]"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة ضبط
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : justSaved ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {justSaved ? 'تم الحفظ' : 'حفظ التغييرات'}
          </motion.button>
        </div>
      </motion.div>

      {/* ===== بطاقات الإعدادات ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== تغيير الاسم ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">الاسم الشخصي</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-1">
                الاسم الحالي
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all font-['Cairo']"
                placeholder="أدخل اسمك"
              />
            </div>
            <button
              onClick={handleSaveName}
              disabled={savingName}
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الاسم
            </button>
          </div>
        </motion.div>

        {/* ===== المظهر ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">المظهر</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <span className="text-[var(--text-secondary)] font-['Cairo']">الوضع الحالي</span>
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-[#D4AF37]" />
                ) : (
                  <Sun className="w-5 h-5 text-[#D4AF37]" />
                )}
                <span className="text-[var(--text-primary)] font-['Cairo'] font-medium">
                  {theme === 'dark' ? 'داكن' : 'فاتح'}
                </span>
              </div>
            </div>

            <button
  onClick={toggleTheme}
  data-tour="toggle-theme"  // ✅ إضافة هذه السمة
  className="w-full py-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors font-['Cairo'] flex items-center justify-center gap-2 border border-[#D4AF37]/30"
>
  {theme === 'dark' ? (
    <>
      <Sun className="w-5 h-5" />
      تبديل إلى الوضع الفاتح
    </>
  ) : (
    <>
      <Moon className="w-5 h-5" />
      تبديل إلى الوضع الداكن
    </>
  )}
</button>
          </div>
        </motion.div>

        {/* ===== وضع التركيز ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">وضع التركيز</h2>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-[var(--text-secondary)] font-['Cairo']">تقليل التشتت</span>
            <button
              onClick={() => setFocusMode(!focusMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${focusMode ? 'bg-emerald-500' : 'bg-gray-400'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${focusMode ? 'right-0.5' : 'right-6'}`} />
            </button>
          </div>
        </motion.div>

        {/* ===== أوقات الصلاة ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">أوقات الصلاة</h2>
          </div>

          <div className="space-y-3">
            {PRAYER_NAMES.map((name, index) => (
              <div key={index} className="flex items-center gap-3">
                <label className="w-16 text-[var(--text-secondary)] font-['Cairo'] text-sm">
                  {name}
                </label>
                <input
                  type="time"
                  value={prayerTimes[index] || ''}
                  onChange={(e) => updatePrayerTime(index, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* ===== إعدادات بومودورو ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-5 sm:p-6 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <Zap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">إعدادات بومودورو</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
                مدة الجلسة (دقيقة)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={pomodoro.sessionDuration}
                onChange={(e) => updatePomodoro('sessionDuration', parseInt(e.target.value) || 50)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
                راحة قصيرة (دقيقة)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={pomodoro.shortBreak}
                onChange={(e) => updatePomodoro('shortBreak', parseInt(e.target.value) || 10)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
                دورات قبل راحة طويلة
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={pomodoro.cyclesBeforeLong}
                onChange={(e) => updatePomodoro('cyclesBeforeLong', parseInt(e.target.value) || 4)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
                راحة طويلة (دقيقة)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={pomodoro.longBreak}
                onChange={(e) => updatePomodoro('longBreak', parseInt(e.target.value) || 30)}
                className="w-full px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}