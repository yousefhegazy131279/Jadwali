'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { toast } from 'sonner'
import {
  Users, Calendar, ListChecks, CheckCircle2, Clock, TrendingUp,
  Shield, Loader2, X, Eye, Mail, User as UserIcon, Trash2,
  Search, Download, Send, FileJson, FileSpreadsheet, Crown,
  Sparkles, AlertTriangle, ChevronRight, Filter, Activity,
  BarChart3, Target, Zap, ExternalLink, Layers, CircleDot,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/* ============================================================
   الأنواع
   ============================================================ */
type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
}

type ScheduleSummary = {
  id: string
  user_id: string
  title: string
  day: string
  start_time: string | null
  tasks: { id: string; name: string; done: boolean; completed_sessions: number | null }[]
  taskCount: number
  completedSessions: number
}

type UserStats = {
  profile: Profile
  totalSchedules: number
  totalTasks: number
  completedTasks: number
  totalSessions: number
  completedSessions: number
  schedules: ScheduleSummary[]
}

/* ============================================================
   أدوات
   ============================================================ */
const avatarColors = [
  'from-rose-400 to-pink-600',
  'from-orange-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-fuchsia-400 to-pink-600',
  'from-cyan-400 to-sky-600',
]

const getAvatarColor = (name: string) => {
  const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[sum % avatarColors.length]
}

const hexToRgba = (hex: string, alpha: number) => {
  const c = (hex || '#D4AF37').replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ============================================================
   بطاقة KPI
   ============================================================ */
function StatCard({
  icon: Icon,
  value,
  label,
  accent,
  delay = 0,
  hint,
}: {
  icon: typeof Users
  value: number | string
  label: string
  accent: string
  delay?: number
  hint?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 transition-all hover:shadow-xl"
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: `${accent}20`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="font-mono text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </div>
          <div className="mt-0.5 font-['Cairo'] text-[11px] font-bold text-[var(--text-secondary)]">
            {label}
          </div>
          {hint && (
            <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
              {hint}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   مودال موحّد
   ============================================================ */
function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  iconBg = 'bg-[#D4AF37]/15',
  iconColor = 'text-[#D4AF37]',
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: typeof Users
  iconBg?: string
  iconColor?: string
  children: React.ReactNode
  maxWidth?: string
}) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${maxWidth} max-h-[85vh] overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl`}
        >
          {/* شريط علوي ذهبي */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#D4AF37]" />

          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="truncate font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(85vh-70px)] overflow-y-auto p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function AdminPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { user, isAdmin } = useSupabase()

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserStats[]>([])
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalSchedules: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalSessions: 0,
    completedSessions: 0,
  })
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  /* ====== الحماية ====== */
  useEffect(() => {
    if (isAdmin === null) return
    if (!user) {
      router.replace('/auth/login?next=/admin')
      return
    }
    if (isAdmin === false) {
      toast.error(t('غير مصرح لك بالوصول', 'Access denied'))
      router.replace('/dashboard')
      return
    }
    setLoading(false)
    void fetchAdminData()
  }, [user, isAdmin, router])

  /* ====== جلب البيانات ====== */
  const fetchAdminData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)
    try {
      const [profilesRes, schedulesRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('tasks').select('*'),
      ])

      if (profilesRes.error || schedulesRes.error || tasksRes.error) {
        throw profilesRes.error || schedulesRes.error || tasksRes.error
      }

      const profilesData = profilesRes.data || []
      const schedulesData = schedulesRes.data || []
      const tasksData = tasksRes.data || []

      setGlobalStats({
        totalUsers: profilesData.length,
        totalSchedules: schedulesData.length,
        totalTasks: tasksData.length,
        completedTasks: tasksData.filter((x) => x.done).length,
        totalSessions: tasksData
          .filter((x) => x.type === 'task' && x.duration > 0)
          .reduce((s, x) => s + Math.ceil((x.duration || 50) / 50), 0),
        completedSessions: tasksData.reduce((s, x) => s + (x.completed_sessions || 0), 0),
      })

      const userStats: UserStats[] = profilesData.map((profile) => {
        const userSchedules = schedulesData.filter((s) => s.user_id === profile.id)
        const userTasks = tasksData.filter((x) => x.user_id === profile.id)
        return {
          profile,
          totalSchedules: userSchedules.length,
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter((x) => x.done).length,
          totalSessions: userTasks
            .filter((x) => x.type === 'task' && x.duration > 0)
            .reduce((s, x) => s + Math.ceil((x.duration || 50) / 50), 0),
          completedSessions: userTasks.reduce((s, x) => s + (x.completed_sessions || 0), 0),
          schedules: userSchedules.map((s) => ({
            id: s.id,
            user_id: s.user_id,
            title: s.title,
            day: s.day,
            start_time: s.start_time,
            tasks: tasksData
              .filter((x) => x.schedule_id === s.id)
              .map((x) => ({
                id: x.id,
                name: x.name,
                done: x.done,
                completed_sessions: x.completed_sessions,
              })),
            taskCount: userTasks.filter((x) => x.schedule_id === s.id).length,
            completedSessions: userTasks
              .filter((x) => x.schedule_id === s.id)
              .reduce((s2, x) => s2 + (x.completed_sessions || 0), 0),
          })),
        }
      })

      // ترتيب: الأدمن أولاً ثم الأحدث
      userStats.sort((a, b) => {
        if (a.profile.role === 'admin' && b.profile.role !== 'admin') return -1
        if (b.profile.role === 'admin' && a.profile.role !== 'admin') return 1
        return new Date(b.profile.created_at).getTime() - new Date(a.profile.created_at).getTime()
      })

      setUsers(userStats)
    } catch (error) {
      console.error('Admin fetch error:', error)
      toast.error(t('حدث خطأ في تحميل البيانات', 'Error loading data'))
    } finally {
      setLoading(false)
    }
  }, [t])

  /* ====== الحذف ====== */
  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(t(
      `سيتم حذف "${name}" وجميع بياناته نهائياً. هل أنت متأكد؟`,
      `Delete "${name}" and all their data permanently?`
    ))) return

    setBusyUserId(userId)
    const supabase = createClient()
    try {
      await Promise.all([
        supabase.from('tasks').delete().eq('user_id', userId),
        supabase.from('schedules').delete().eq('user_id', userId),
        supabase.from('prayers').delete().eq('user_id', userId),
        supabase.from('custom_cards').delete().eq('user_id', userId),
        supabase.from('notifications').delete().eq('user_id', userId),
      ])
      await supabase.from('profiles').delete().eq('id', userId)

      toast.success(t('✅ تم حذف المستخدم', '✅ User deleted'))
      void fetchAdminData()
    } catch (error) {
      console.error(error)
      toast.error(t('حدث خطأ أثناء الحذف', 'Delete error'))
    } finally {
      setBusyUserId(null)
    }
  }

  /* ====== تبديل الدور ====== */
  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    setBusyUserId(userId)
    const supabase = createClient()
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setBusyUserId(null)

    if (error) {
      toast.error(t('حدث خطأ في تغيير الدور', 'Error changing role'))
    } else {
      toast.success(
        `${t('تم التغيير إلى', 'Changed to')} ${newRole === 'admin' ? t('أدمن', 'Admin') : t('مستخدم', 'User')}`
      )
      void fetchAdminData()
    }
  }

  /* ====== الإشعار الجماعي ====== */
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error(t('اكتب نص الإشعار', 'Enter message text'))
      return
    }
    const supabase = createClient()
    const { error } = await supabase.from('notifications').insert(
      users.map((u) => ({
        user_id: u.profile.id,
        title: t('إشعار من الإدارة', 'Admin notification'),
        body: broadcastMessage.trim(),
        type: 'broadcast',
        read: false,
      }))
    )
    if (error) {
      toast.error(t('حدث خطأ في الإرسال', 'Send error'))
    } else {
      toast.success(t('✅ تم إرسال الإشعار للجميع', '✅ Broadcast sent'))
      setBroadcastMessage('')
      setShowBroadcast(false)
    }
  }

  /* ====== التصدير ====== */
  const handleExportUsers = () => {
    const csv = [
      ['ID', 'Email', 'Full Name', 'Role', 'Created At'],
      ...users.map((u) => [
        u.profile.id,
        u.profile.email || '',
        u.profile.full_name || '',
        u.profile.role,
        u.profile.created_at,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jadwali-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('تم تصدير المستخدمين', 'Users exported'))
  }

  const handleExportAllData = async () => {
    const supabase = createClient()
    const [profiles, schedules, tasks] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('schedules').select('*'),
      supabase.from('tasks').select('*'),
    ])
    const data = {
      exported_at: new Date().toISOString(),
      profiles: profiles.data,
      schedules: schedules.data,
      tasks: tasks.data,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jadwali-full-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(t('تم تصدير البيانات', 'Data exported'))
  }

  /* ====== الفلترة ====== */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== 'all' && u.profile.role !== filterRole) return false
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      return (
        (u.profile.email || '').toLowerCase().includes(q) ||
        (u.profile.full_name || '').toLowerCase().includes(q)
      )
    })
  }, [users, searchTerm, filterRole])

  const adminCount = users.filter((u) => u.profile.role === 'admin').length
  const regularUsersCount = users.length - adminCount

  /* ====== Loading ====== */
  if (loading || isAdmin === null) {
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
    <div className="space-y-6 p-3 sm:p-6">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-purple-500/5 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-[#D4AF37]/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/25 to-purple-500/5 text-purple-300 shadow-lg"
            >
              <Shield className="h-6 w-6" />
            </motion.div>
            <div>
              <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-purple-300">
                <Crown className="h-3 w-3" />
                {t('صلاحيات إدارية', 'Admin access')}
              </div>
              <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
                {t('لوحة الأدمن', 'Admin Panel')}
              </h1>
              <p className="mt-1 font-['Cairo'] text-sm text-[var(--text-secondary)]">
                {t('إدارة كاملة للمستخدمين والبيانات', 'Full control over users and data')}
              </p>
            </div>
          </div>

          {/* الأزرار */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBroadcast(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-4 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md shadow-[#D4AF37]/30 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[#D4AF37]/40"
            >
              <Send className="h-3.5 w-3.5" />
              {t('إشعار جماعي', 'Broadcast')}
            </button>

            <button
              onClick={handleExportUsers}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-emerald-500/40 hover:text-emerald-400"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {t('تصدير CSV', 'Export CSV')}
            </button>

            <button
              onClick={handleExportAllData}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-sky-500/40 hover:text-sky-400"
            >
              <FileJson className="h-3.5 w-3.5" />
              {t('تصدير JSON', 'Export JSON')}
            </button>
          </div>
        </div>
      </motion.section>

      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Users}
          value={globalStats.totalUsers}
          label={t('المستخدمون', 'Users')}
          hint={`${adminCount} ${t('أدمن', 'admins')} · ${regularUsersCount} ${t('عادي', 'users')}`}
          accent="#A855F7"
          delay={0.05}
        />
        <StatCard
          icon={Calendar}
          value={globalStats.totalSchedules}
          label={t('الجداول', 'Schedules')}
          accent="#3B82F6"
          delay={0.1}
        />
        <StatCard
          icon={ListChecks}
          value={globalStats.totalTasks}
          label={t('المهام', 'Tasks')}
          accent="#D4AF37"
          delay={0.15}
        />
        <StatCard
          icon={CheckCircle2}
          value={globalStats.completedTasks}
          label={t('مهام منجزة', 'Tasks done')}
          hint={
            globalStats.totalTasks > 0
              ? `${Math.round((globalStats.completedTasks / globalStats.totalTasks) * 100)}%`
              : '0%'
          }
          accent="#10B981"
          delay={0.2}
        />
        <StatCard
          icon={Zap}
          value={globalStats.totalSessions}
          label={t('إجمالي الجلسات', 'Total sessions')}
          accent="#06B6D4"
          delay={0.25}
        />
        <StatCard
          icon={TrendingUp}
          value={globalStats.completedSessions}
          label={t('جلسات منجزة', 'Sessions done')}
          hint={
            globalStats.totalSessions > 0
              ? `${Math.round((globalStats.completedSessions / globalStats.totalSessions) * 100)}%`
              : '0%'
          }
          accent="#EC4899"
          delay={0.3}
        />
      </div>

      {/* ============ البحث والفلاتر ============ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={t('ابحث بالاسم أو البريد…', 'Search by name or email…')}
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

        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
          <Filter className="ms-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
          {[
            { key: 'all' as const, label: t('الكل', 'All'), count: users.length, color: 'gold' },
            { key: 'admin' as const, label: t('أدمن', 'Admins'), count: adminCount, color: 'purple' },
            { key: 'user' as const, label: t('مستخدمون', 'Users'), count: regularUsersCount, color: 'sky' },
          ].map((opt) => {
            const active = filterRole === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setFilterRole(opt.key)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 font-['Cairo'] text-xs font-bold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                {opt.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] ${
                    active ? 'bg-[#0b1a2e]/20 text-[#0b1a2e]' : 'bg-white/5 text-[var(--text-muted)]'
                  }`}
                >
                  {opt.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ============ قائمة المستخدمين ============ */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
                {t('المستخدمون', 'Users')}
              </h2>
              <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                {filteredUsers.length} {t('من', 'of')} {users.length}
              </p>
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]/50" />
            <p className="font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {searchTerm || filterRole !== 'all'
                ? t('لا توجد نتائج مطابقة', 'No matching results')
                : t('لا يوجد مستخدمون بعد', 'No users yet')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            <AnimatePresence initial={false}>
              {filteredUsers.map((userStat, i) => {
                const name = userStat.profile.full_name || t('بدون اسم', 'No name')
                const isAdminUser = userStat.profile.role === 'admin'
                const isMe = userStat.profile.id === user?.id
                const isBusy = busyUserId === userStat.profile.id
                const progress =
                  userStat.totalSessions > 0
                    ? Math.round((userStat.completedSessions / userStat.totalSessions) * 100)
                    : 0

                return (
                  <motion.div
                    key={userStat.profile.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: i * 0.02 }}
                    className="group relative px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  >
                    {/* شريط جانبي للأدمن */}
                    {isAdminUser && (
                      <div className="absolute inset-y-3 w-1 rounded-full bg-gradient-to-b from-purple-400 to-purple-600 ltr:left-0 rtl:right-0" />
                    )}

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      {/* الأفاتار + المعلومات */}
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative shrink-0">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarColor(name)} font-['Cairo'] text-base font-bold text-white shadow-md`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--bg-card)] ${
                              isAdminUser ? 'bg-purple-500' : 'bg-emerald-500'
                            }`}
                          >
                            {isAdminUser ? (
                              <Crown className="h-2.5 w-2.5 text-white" />
                            ) : (
                              <UserIcon className="h-2.5 w-2.5 text-white" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
                              {name}
                            </span>
                            {isAdminUser && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 font-['Cairo'] text-[9px] font-bold text-purple-300">
                                <Shield className="h-2.5 w-2.5" />
                                {t('أدمن', 'Admin')}
                              </span>
                            )}
                            {isMe && (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/15 px-2 py-0.5 font-['Cairo'] text-[9px] font-bold text-[#D4AF37]">
                                {t('أنت', 'You')}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 font-['Cairo'] text-[11px] text-[var(--text-muted)]">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{userStat.profile.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* الإحصائيات */}
                      <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 lg:gap-4">
                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-center lg:bg-transparent lg:border-0 lg:py-0 lg:px-4">
                          <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-sky-400">
                            <Layers className="h-3 w-3" />
                            {userStat.totalSchedules}
                          </div>
                          <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
                            {t('جداول', 'Schedules')}
                          </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-center lg:bg-transparent lg:border-0 lg:py-0 lg:px-4">
                          <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[#D4AF37]">
                            <ListChecks className="h-3 w-3" />
                            {userStat.completedTasks}/{userStat.totalTasks}
                          </div>
                          <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
                            {t('مهام', 'Tasks')}
                          </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-center lg:bg-transparent lg:border-0 lg:py-0 lg:px-4">
                          <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-emerald-400">
                            <Zap className="h-3 w-3" />
                            {userStat.completedSessions}/{userStat.totalSessions}
                          </div>
                          <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
                            {t('جلسات', 'Sessions')}
                          </div>
                        </div>

                        <div className="hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 py-2 text-center lg:block">
                          <div
                            className="font-mono text-sm font-bold"
                            style={{
                              color:
                                progress >= 80
                                  ? '#10B981'
                                  : progress >= 50
                                    ? '#D4AF37'
                                    : '#F97316',
                            }}
                          >
                            {progress}%
                          </div>
                          <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
                            {t('التقدم', 'Progress')}
                          </div>
                        </div>
                      </div>

                      {/* الأزرار */}
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={() => setSelectedUser(userStat)}
                          disabled={isBusy}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-50"
                          title={t('عرض الجداول', 'View schedules')}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleAdmin(userStat.profile.id, userStat.profile.role)}
                          disabled={isBusy || isMe}
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            isAdminUser
                              ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                              : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-purple-500/40 hover:text-purple-300'
                          }`}
                          title={
                            isMe
                              ? t('لا يمكنك تغيير دورك', 'Cannot change your own role')
                              : isAdminUser
                                ? t('إزالة صلاحية الأدمن', 'Remove admin')
                                : t('ترقية لأدمن', 'Promote to admin')
                          }
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteUser(userStat.profile.id, name)}
                          disabled={isBusy || isMe}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            isMe
                              ? t('لا يمكنك حذف نفسك', 'Cannot delete yourself')
                              : t('حذف المستخدم', 'Delete user')
                          }
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ============ مودال: جداول المستخدم ============ */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={
          selectedUser
            ? `${t('جداول', 'Schedules of')} ${selectedUser.profile.full_name || selectedUser.profile.email}`
            : ''
        }
        icon={Calendar}
        maxWidth="max-w-3xl"
      >
        {selectedUser && (
          <>
            {/* ملخص المستخدم */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: t('الجداول', 'Schedules'), value: selectedUser.totalSchedules, color: 'text-sky-400' },
                { label: t('المهام', 'Tasks'), value: `${selectedUser.completedTasks}/${selectedUser.totalTasks}`, color: 'text-[#D4AF37]' },
                { label: t('الجلسات', 'Sessions'), value: `${selectedUser.completedSessions}/${selectedUser.totalSessions}`, color: 'text-emerald-400' },
                {
                  label: t('التقدم', 'Progress'),
                  value: `${
                    selectedUser.totalSessions > 0
                      ? Math.round((selectedUser.completedSessions / selectedUser.totalSessions) * 100)
                      : 0
                  }%`,
                  color: 'text-purple-400',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-3 text-center"
                >
                  <div className={`font-mono text-lg font-bold ${item.color}`}>{item.value}</div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {selectedUser.schedules.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)]/30" />
                <p className="font-['Cairo'] text-sm text-[var(--text-muted)]">
                  {t('لا توجد جداول لهذا المستخدم', 'No schedules for this user')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedUser.schedules.map((schedule, i) => {
                  const done = schedule.tasks.filter((x) => x.done).length
                  const total = schedule.tasks.length
                  const prog = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <motion.div
                      key={schedule.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
                            {schedule.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                            <Calendar className="h-2.5 w-2.5" />
                            {format(new Date(schedule.day), 'd MMM yyyy', {
                              locale: language === 'ar' ? ar : enUS,
                            })}
                            <span className="text-white/10">•</span>
                            <Zap className="h-2.5 w-2.5" />
                            {schedule.completedSessions} {t('جلسة منجزة', 'sessions')}
                          </div>
                        </div>
                        <div
                          className="shrink-0 font-mono text-xs font-bold"
                          style={{
                            color:
                              prog >= 80 ? '#10B981' : prog >= 50 ? '#D4AF37' : '#F97316',
                          }}
                        >
                          {prog}%
                        </div>
                      </div>

                      {schedule.tasks.length > 0 && (
                        <div className="max-h-40 overflow-y-auto p-2">
                          <ul className="space-y-1">
                            {schedule.tasks.map((task) => (
                              <li
                                key={task.id}
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/[0.03]"
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
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
                                  className={`flex-1 truncate font-['Cairo'] ${
                                    task.done
                                      ? 'text-[var(--text-muted)] line-through'
                                      : 'text-[var(--text-primary)]'
                                  }`}
                                >
                                  {task.name}
                                </span>
                                {(task.completed_sessions ?? 0) > 0 && (
                                  <span className="shrink-0 rounded-md bg-[#D4AF37]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#D4AF37]">
                                    {task.completed_sessions}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ============ مودال: إشعار جماعي ============ */}
      <Modal
        open={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        title={t('إشعار جماعي', 'Broadcast notification')}
        icon={Send}
        iconBg="bg-sky-500/15"
        iconColor="text-sky-400"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
            <p className="font-['Cairo'] text-[11px] leading-relaxed text-sky-300">
              {t(
                `سيصل هذا الإشعار إلى ${users.length} مستخدم`,
                `This will reach ${users.length} users`
              )}
            </p>
          </div>

          <div>
            <label className="mb-2 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
              {t('نص الإشعار', 'Message text')}
            </label>
            <textarea
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder={t('اكتب نص الإشعار…', 'Type your message…')}
              className="min-h-[140px] w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
              maxLength={500}
            />
            <div className="mt-1 flex items-center justify-between font-['Cairo'] text-[10px] text-[var(--text-muted)]">
              <span>{t('سيظهر لكل مستخدم في الإشعارات', 'Will appear in each user\u2019s notifications')}</span>
              <span className="font-mono">{broadcastMessage.length}/500</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowBroadcast(false)}
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-white/5"
            >
              {t('إلغاء', 'Cancel')}
            </button>
            <button
              onClick={handleSendBroadcast}
              disabled={!broadcastMessage.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t('إرسال للجميع', 'Send to all')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}