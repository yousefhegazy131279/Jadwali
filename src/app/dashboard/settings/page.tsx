'use client'

import { formatTime12 } from '@/lib/time'
import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useTheme } from '@/context/ThemeContext'
import { toast } from 'sonner'
import { isTime, normalizePrayerTimes } from '@/lib/preferences'
import {
  Save, Loader2, Sun, Moon, Clock, Zap, RefreshCw, CheckCircle2,
  User, Settings as SettingsIcon, Sparkles, Palette, Timer,
  Coffee, Repeat, Sunrise, Sunset, CloudMoon, Star, Bell,
  Shield, ChevronDown, Info, RotateCcw, Wand2, Eye,
} from 'lucide-react'

/* ============================================================
   الأنواع
   ============================================================ */
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

/* ============================================================
   ثوابت
   ============================================================ */
const PRAYER_NAMES = [
  { ar: 'الفجر', en: 'Fajr', icon: Sunrise, color: '#F97316' },
  { ar: 'الظهر', en: 'Dhuhr', icon: Sun, color: '#D4AF37' },
  { ar: 'العصر', en: 'Asr', icon: Sun, color: '#F59E0B' },
  { ar: 'المغرب', en: 'Maghrib', icon: Sunset, color: '#EC4899' },
  { ar: 'العشاء', en: 'Isha', icon: CloudMoon, color: '#8B5CF6' },
]

const DEFAULT_PRAYER_TIMES = ['04:25', '13:02', '16:38', '19:57', '21:26']
const DEFAULT_POMODORO = {
  sessionDuration: 50,
  shortBreak: 10,
  cyclesBeforeLong: 4,
  longBreak: 30,
}

/* ============================================================
   مفتاح تبديل (Toggle)
   ============================================================ */
function Toggle({
  checked,
  onChange,
  accent = '#10B981',
}: {
  checked: boolean
  onChange: () => void
  accent?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300"
      style={{ background: checked ? accent : 'rgba(120, 113, 108, 0.3)' }}
    >
      <motion.div
        animate={{ x: checked ? -20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md rtl:left-auto rtl:right-0.5"
      >
        {checked && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: accent }} strokeWidth={3} />}
      </motion.div>
    </button>
  )
}

/* ============================================================
   بطاقة قسم موحّدة
   ============================================================ */
function SectionCard({
  icon: Icon,
  title,
  subtitle,
  accent = '#D4AF37',
  children,
  delay = 0,
  fullWidth = false,
}: {
  icon: typeof User
  title: string
  subtitle?: string
  accent?: string
  children: React.ReactNode
  delay?: number
  fullWidth?: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] ${
        fullWidth ? 'lg:col-span-2' : ''
      }`}
    >
      {/* شريط علوي بلون القسم */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}20)` }}
      />

      {/* الرأس */}
      <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-5 py-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-['Cairo'] text-[11px] text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* المحتوى */}
      <div className="p-5">{children}</div>
    </motion.section>
  )
}

/* ============================================================
   حقل إدخال رقمي أنيق
   ============================================================ */
function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  icon: Icon,
  accent = '#D4AF37',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  suffix: string
  icon: typeof Clock
  accent?: string
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4 transition-colors hover:border-[var(--border-color)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${accent}20`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
            {label}
          </span>
        </div>
        <div
          className="font-mono text-xl font-bold tabular-nums"
          style={{ color: accent }}
        >
          {value}
          <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">
            {suffix}
          </span>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value) || min))}
        className="mb-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
        style={{
          background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
        }}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-color)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(parseInt(e.target.value) || min))}
          className="h-8 flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-center font-mono text-sm font-bold text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          style={{ ['--accent' as string]: accent }}
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-color)] hover:text-[var(--text-primary)] disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function SettingsPage() {
  const { t, language } = useLanguage()
  const { user, fullName, updateFullName } = useSupabase()
  const { theme, toggleTheme } = useTheme()

  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const [prayerTimes, setPrayerTimes] = useState<string[]>(DEFAULT_PRAYER_TIMES)
  const [pomodoro, setPomodoro] = useState(DEFAULT_POMODORO)

  const [name, setName] = useState(fullName || '')
  const [savingName, setSavingName] = useState(false)

  const [focusMode, setFocusMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('focusMode') === 'true'
    return false
  })

  const [advancedOpen, setAdvancedOpen] = useState(false)

  /* ====== الجلب ====== */
  useEffect(() => {
    if (user) void fetchSettings()
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
      toast.error(t('حدث خطأ في تحميل الإعدادات', 'Error loading settings'))
      console.error(error)
    } else if (data) {
      setSettings(data)
      setPrayerTimes(normalizePrayerTimes(data.prayer_times))
      setPomodoro(data.pomodoro || DEFAULT_POMODORO)
    } else {
      const defaultSettings = {
        user_id: user.id,
        theme: 'dark',
        primary_color: '#D4AF37',
        prayer_times: DEFAULT_PRAYER_TIMES,
        pomodoro: DEFAULT_POMODORO,
      }
      const { data: newData, error: insertError } = await supabase
        .from('settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        toast.error(t('حدث خطأ في إنشاء الإعدادات', 'Error creating settings'))
        console.error(insertError)
      } else {
        setSettings(newData)
        setPrayerTimes(newData.prayer_times)
        setPomodoro(newData.pomodoro)
      }
    }
    setLoading(false)
  }

  /* ====== الحفظ ====== */
  const handleSave = async () => {
    if (!user || !settings) return

    // التحقق
    if (pomodoro.sessionDuration < 1 || pomodoro.sessionDuration > 120) {
      toast.error(t('مدة الجلسة يجب أن تكون بين 1 و 120 دقيقة', 'Session duration must be between 1 and 120'))
      return
    }
    if (pomodoro.shortBreak < 1 || pomodoro.shortBreak > 30) {
      toast.error(t('الراحة القصيرة يجب أن تكون بين 1 و 30 دقيقة', 'Short break must be between 1 and 30'))
      return
    }
    if (pomodoro.longBreak < 1 || pomodoro.longBreak > 60) {
      toast.error(t('الراحة الطويلة يجب أن تكون بين 1 و 60 دقيقة', 'Long break must be between 1 and 60'))
      return
    }
    if (pomodoro.cyclesBeforeLong < 1 || pomodoro.cyclesBeforeLong > 10) {
      toast.error(t('عدد الدورات يجب أن يكون بين 1 و 10', 'Cycles must be between 1 and 10'))
      return
    }
    if (prayerTimes.length !== 5 || !prayerTimes.every(isTime)) {
      toast.error(t('أدخل مواقيت صلاة صحيحة', 'Enter valid prayer times'))
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: saved, error } = await supabase
      .from('settings')
      .update({
        prayer_times: prayerTimes,
        pomodoro,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast.error(t('حدث خطأ في حفظ الإعدادات', 'Error saving settings'))
      console.error(error)
    } else {
      setSettings(saved)
      toast.success(t('✅ تم حفظ الإعدادات', '✅ Settings saved'))
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    }
    setSaving(false)
  }

  const handleReset = () => {
    if (!confirm(t('هل أنت متأكد من إعادة الإعدادات إلى القيم الافتراضية؟', 'Reset all settings to defaults?'))) return
    setPrayerTimes([...DEFAULT_PRAYER_TIMES])
    setPomodoro({ ...DEFAULT_POMODORO })
    toast.info(t('تم إعادة الإعدادات للقيم الافتراضية', 'Settings reset to defaults'))
  }

  const updatePrayerTime = (i: number, v: string) => {
    const u = [...prayerTimes]
    u[i] = v
    setPrayerTimes(u)
  }

  const updatePomodoro = (k: keyof typeof pomodoro, v: number) =>
    setPomodoro((p) => ({ ...p, [k]: v }))

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error(t('الاسم لا يمكن أن يكون فارغاً', 'Name cannot be empty'))
      return
    }
    setSavingName(true)
    try {
      await updateFullName(name.trim())
    } catch {
      toast.error(t('تعذر حفظ الاسم', 'Could not save name'))
    } finally {
      setSavingName(false)
    }
  }

  /* ====== حالة عدم الحفظ ====== */
  const isDirty = useMemo(() => {
    if (!settings) return false
    return (
      JSON.stringify(prayerTimes) !== JSON.stringify(settings.prayer_times) ||
      JSON.stringify(pomodoro) !== JSON.stringify(settings.pomodoro)
    )
  }, [settings, prayerTimes, pomodoro])

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
    <div className="space-y-5 p-3 sm:p-6">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-xs text-[#D4AF37]">
              <SettingsIcon className="h-3.5 w-3.5" />
              {t('الإعدادات', 'Settings')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('خصص تجربتك', 'Customize your experience')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'اضبط الأوقات، المظهر، ونظام بومودورو بما يناسب يومك.',
                'Tune times, appearance, and Pomodoro to match your day.'
              )}
            </p>
          </div>

          {/* الأزرار */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSettings}
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
              title={t('إعادة تحميل', 'Reload')}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('تحديث', 'Reload')}
            </button>

            <button
              onClick={handleReset}
              className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('إعادة ضبط', 'Reset')}
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex h-10 items-center gap-2 rounded-xl px-5 font-['Cairo'] text-xs font-bold shadow-md transition-all disabled:opacity-60 ${
                justSaved
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
                  : isDirty
                    ? 'animate-pulse bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-[#D4AF37]/40 hover:shadow-lg'
                    : 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-[#D4AF37]/30 hover:shadow-lg'
              }`}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : justSaved ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving
                ? t('جارٍ الحفظ…', 'Saving…')
                : justSaved
                  ? t('تم الحفظ', 'Saved')
                  : isDirty
                    ? t('حفظ التغييرات ●', 'Save changes ●')
                    : t('حفظ التغييرات', 'Save changes')}
            </button>
          </div>
        </div>
      </motion.section>

      {/* ============ الشبكة الرئيسية ============ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ===== الاسم الشخصي ===== */}
        <SectionCard
          icon={User}
          title={t('الملف الشخصي', 'Profile')}
          subtitle={t('كيف يظهر اسمك في التطبيق', 'How your name appears in the app')}
          accent="#D4AF37"
          delay={0.05}
        >
          <div className="space-y-4">
            {/* معاينة الأفاتار */}
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] font-['Cairo'] text-xl font-bold text-[#0b1a2e] shadow-lg">
                  {(name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-emerald-500">
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                  {name || t('اسمك هنا', 'Your name')}
                </div>
                <div className="mt-0.5 truncate font-['Cairo'] text-[11px] text-[var(--text-muted)]">
                  {user?.email || ''}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('أدخل اسمك', 'Enter your name')}
                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || name.trim() === (fullName || '')}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-4 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/30 disabled:opacity-40"
              >
                {savingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {t('حفظ', 'Save')}
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ===== المظهر ===== */}
        <SectionCard
          icon={Palette}
          title={t('المظهر', 'Appearance')}
          subtitle={t('اختر الوضع المريح لعينيك', 'Pick the mode that suits your eyes')}
          accent="#A855F7"
          delay={0.1}
        >
          <div className="space-y-3">
            {/* معاينة الوضعين */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  key: 'dark' as const,
                  label: t('داكن', 'Dark'),
                  icon: Moon,
                  preview: 'bg-gradient-to-br from-[#0b1a2e] to-[#1a2942]',
                },
                {
                  key: 'light' as const,
                  label: t('فاتح', 'Light'),
                  icon: Sun,
                  preview: 'bg-gradient-to-br from-[#f8f9fa] to-[#e9ecef]',
                },
              ].map((opt) => {
                const active = theme === opt.key
                const Icon = opt.icon
                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (!active) toggleTheme()
                    }}
                    data-tour={opt.key === 'dark' ? 'toggle-theme' : undefined}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-3 text-left transition-all ${
                      active
                        ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/20'
                        : 'border-[var(--border-color)] hover:border-[#D4AF37]/30'
                    }`}
                  >
                    <div className={`mb-3 h-12 overflow-hidden rounded-lg ${opt.preview}`}>
                      <div className={`flex h-full items-center justify-center ${opt.key === 'dark' ? 'text-[#D4AF37]' : 'text-[#0b1a2e]'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-['Cairo'] text-xs font-bold text-[var(--text-primary)]">
                        {opt.label}
                      </span>
                      {active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]"
                        >
                          <CheckCircle2 className="h-3 w-3 text-[#0b1a2e]" strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </SectionCard>

        {/* ===== وضع التركيز ===== */}
        <SectionCard
          icon={Zap}
          title={t('وضع التركيز', 'Focus mode')}
          subtitle={t('تقليل التشتت أثناء العمل', 'Reduce distractions while working')}
          accent="#10B981"
          delay={0.15}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  focusMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-[var(--text-muted)]'
                }`}>
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
                    {t('تفعيل وضع التركيز', 'Enable focus mode')}
                  </div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {focusMode
                      ? t('مُفعّل — واجهة مبسّطة', 'Active — simplified UI')
                      : t('معطّل', 'Disabled')}
                  </div>
                </div>
              </div>
              <Toggle checked={focusMode} onChange={() => setFocusMode(!focusMode)} />
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              <p className="font-['Cairo'] text-[10px] leading-relaxed text-[var(--text-muted)]">
                {t(
                  'يخفي هذا الوضع العناصر غير الضرورية أثناء الدراسة ويركّز على الجلسات.',
                  'Hides non-essential elements while studying and focuses on sessions.'
                )}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ===== مواقيت الصلاة ===== */}
        <SectionCard
          icon={Clock}
          title={t('مواقيت الصلاة', 'Prayer times')}
          subtitle={t('تُستخدم في المخطط الذكي', 'Used in the smart planner')}
          accent="#F59E0B"
          delay={0.2}
        >
          <div className="space-y-2.5">
            {PRAYER_NAMES.map((prayer, i) => {
              const Icon = prayer.icon
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5 transition-colors hover:border-[var(--border-color)]"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${prayer.color}15`, color: prayer.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="w-16 shrink-0 font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
                    {language === 'ar' ? prayer.ar : prayer.en}
                  </div>
                  <input
                    type="time"
                    value={prayerTimes[i] || ''}
                    onChange={(e) => updatePrayerTime(i, e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 font-['Cairo'] text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                    style={{ ['--accent' as string]: prayer.color }}
                  />
                  <div
                    className="w-20 shrink-0 rounded-lg px-2 py-1 text-center font-mono text-xs font-bold"
                    style={{ background: `${prayer.color}15`, color: prayer.color }}
                  >
                    {formatTime12(prayerTimes[i], language)}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        {/* ===== إعدادات بومودورو ===== */}
        <SectionCard
          icon={Timer}
          title={t('نظام بومودورو', 'Pomodoro system')}
          subtitle={t('اضبط دورات العمل والراحة', 'Tune work and break cycles')}
          accent="#3B82F6"
          delay={0.25}
          fullWidth
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              icon={Zap}
              label={t('مدة الجلسة', 'Session duration')}
              value={pomodoro.sessionDuration}
              onChange={(v) => updatePomodoro('sessionDuration', v)}
              min={1}
              max={120}
              suffix={t('د', 'm')}
              accent="#D4AF37"
            />
            <NumberField
              icon={Coffee}
              label={t('راحة قصيرة', 'Short break')}
              value={pomodoro.shortBreak}
              onChange={(v) => updatePomodoro('shortBreak', v)}
              min={1}
              max={30}
              suffix={t('د', 'm')}
              accent="#3B82F6"
            />
            <NumberField
              icon={Repeat}
              label={t('دورات قبل راحة طويلة', 'Cycles before long')}
              value={pomodoro.cyclesBeforeLong}
              onChange={(v) => updatePomodoro('cyclesBeforeLong', v)}
              min={1}
              max={10}
              suffix={t('دورة', 'cycles')}
              accent="#A855F7"
            />
            <NumberField
              icon={Moon}
              label={t('راحة طويلة', 'Long break')}
              value={pomodoro.longBreak}
              onChange={(v) => updatePomodoro('longBreak', v)}
              min={1}
              max={60}
              suffix={t('د', 'm')}
              accent="#10B981"
            />
          </div>

          {/* معاينة الدورة */}
          <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Wand2 className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span className="font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
                {t('معاينة دورة كاملة', 'Full cycle preview')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {Array.from({ length: pomodoro.cyclesBeforeLong }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="flex h-8 items-center gap-1 rounded-lg px-2.5 font-['Cairo'] text-[10px] font-bold text-[#0b1a2e]"
                    style={{ background: '#D4AF37' }}
                  >
                    <Zap className="h-2.5 w-2.5" />
                    {pomodoro.sessionDuration}
                    {t('د', 'm')}
                  </div>
                  <div
                    className="flex h-8 items-center gap-1 rounded-lg px-2.5 font-['Cairo'] text-[10px] font-bold text-white"
                    style={{ background: i === pomodoro.cyclesBeforeLong - 1 ? '#10B981' : '#3B82F6' }}
                  >
                    <Coffee className="h-2.5 w-2.5" />
                    {i === pomodoro.cyclesBeforeLong - 1 ? pomodoro.longBreak : pomodoro.shortBreak}
                    {t('د', 'm')}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border-color)] pt-3 font-['Cairo'] text-[11px] text-[var(--text-secondary)]">
              <span>
                {t('إجمالي الدورة:', 'Total cycle:')}{' '}
                <span className="font-mono font-bold text-[#D4AF37]">
                  {pomodoro.cyclesBeforeLong * pomodoro.sessionDuration +
                    (pomodoro.cyclesBeforeLong - 1) * pomodoro.shortBreak +
                    pomodoro.longBreak}{' '}
                  {t('دقيقة', 'min')}
                </span>
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ============ معلومات إضافية قابلة للطي ============ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]"
      >
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="text-right ltr:text-left">
              <div className="font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                {t('معلومات النظام', 'System information')}
              </div>
              <div className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {t('الإصدار، آخر تحديث، حسابك', 'Version, last update, account')}
              </div>
            </div>
          </div>
          <motion.div animate={{ rotate: advancedOpen ? 180 : 0 }}>
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          </motion.div>
        </button>

        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden border-t border-[var(--border-color)]"
            >
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3">
                  <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {t('الإصدار', 'Version')}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-[var(--text-primary)]">
                    v1.0.0
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3">
                  <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {t('آخر تحديث', 'Last updated')}
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-[var(--text-primary)]">
                    {settings?.updated_at
                      ? new Date(settings.updated_at).toLocaleDateString(
                          language === 'ar' ? 'ar-EG' : 'en-US'
                        )
                      : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3">
                  <div className="font-['Cairo'] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                    {t('الحساب', 'Account')}
                  </div>
                  <div className="mt-1 truncate font-mono text-sm font-bold text-[var(--text-primary)]">
                    {user?.email || '—'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ============ شريط سفلي عائم عند التعديل ============ */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#D4AF37]/30 bg-[var(--bg-card)] px-4 py-3 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" />
              <span className="whitespace-nowrap font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
                {t('لديك تغييرات غير محفوظة', 'You have unsaved changes')}
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-3.5 py-1.5 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {t('حفظ الآن', 'Save now')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}