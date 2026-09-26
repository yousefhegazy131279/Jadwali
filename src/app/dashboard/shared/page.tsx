'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { formatTime12 } from '@/lib/time'
import { toast } from 'sonner'
import {
  Users,
  Calendar as CalendarIcon,
  Clock,
  Crown,
  Pencil,
  Eye,
  ArrowLeft,
  CalendarX,
  Search,
  Sparkles,
  UserCheck,
  Send,
  LayoutGrid,
  RefreshCw,
  Share2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/* ========== الأنواع ========== */
type Role = 'owner' | 'editor' | 'viewer'
type FilterKey = 'all' | 'byMe' | 'withMe'

type Member = {
  user_id: string
  role: Role
  full_name: string
}

type SharedSchedule = {
  id: string
  title: string
  day: string
  start_time: string
  user_id: string
  role: Role
  members: Member[]
  other_members_count: number
  owner_name: string
  is_owner: boolean
  is_truly_shared: boolean
}

/* ========== أدوات مساعدة ========== */
const roleMeta: Record<
  Role,
  {
    labelAr: string
    labelEn: string
    gradient: string
    text: string
    bg: string
    border: string
    icon: typeof Crown
  }
> = {
  owner: {
    labelAr: 'مالك',
    labelEn: 'Owner',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    text: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/30',
    icon: Crown,
  },
  editor: {
    labelAr: 'محرر',
    labelEn: 'Editor',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/30',
    icon: Pencil,
  },
  viewer: {
    labelAr: 'مشاهد',
    labelEn: 'Viewer',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    text: 'text-sky-300',
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/30',
    icon: Eye,
  },
}

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
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[sum % avatarColors.length]
}

/* ========== Skeleton ========== */
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex justify-between">
        <div className="h-6 w-20 rounded-full bg-white/5" />
        <div className="h-6 w-16 rounded-full bg-white/5" />
      </div>
      <div className="mb-3 h-7 w-3/4 rounded-lg bg-white/5" />
      <div className="mb-2 h-4 w-1/2 rounded-lg bg-white/5" />
      <div className="mb-5 h-4 w-2/3 rounded-lg bg-white/5" />
      <div className="h-10 w-full rounded-xl bg-white/5" />
    </div>
  )
}

/* ========== شريط الأعضاء المصغّر ========== */
function MemberAvatars({
  members,
  ownerId,
  max = 3,
  t,
}: {
  members: Member[]
  ownerId: string
  max?: number
  t: (ar: string, en?: string) => string
}) {
  const others = members.filter((m) => m.user_id !== ownerId)
  if (others.length === 0) return null

  const shown = others.slice(0, max)
  const remaining = others.length - shown.length

  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {shown.map((m) => (
        <div
          key={m.user_id}
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarColor(
            m.full_name || m.user_id
          )} text-[10px] font-bold text-white ring-2 ring-[var(--bg-card)]`}
          title={m.full_name || m.user_id}
        >
          {(m.full_name || '?').charAt(0).toUpperCase()}
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-[var(--text-secondary)] ring-2 ring-[var(--bg-card)]">
          +{remaining}
        </div>
      )}
    </div>
  )
}

/* ========== بطاقة الجدول ========== */
function SharedScheduleCard({
  item,
  index,
  language,
  t,
}: {
  item: SharedSchedule
  index: number
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
}) {
  const meta = roleMeta[item.role]
  const RoleIcon = meta.icon
  const formattedDate = format(new Date(item.day), 'EEEE، d MMMM', {
    locale: language === 'ar' ? ar : enUS,
  })

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 320, damping: 26 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl transition-all duration-300 hover:border-transparent hover:shadow-2xl hover:shadow-[#D4AF37]/10"
    >
      {/* شريط متدرّج حسب الدور */}
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${meta.gradient}`} />

      {/* هالة خلفية */}
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br ${meta.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`}
      />

      <div className="relative p-5">
        {/* الصف الأول: الدور + عدد الأعضاء */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${meta.bg} ${meta.text} border ${meta.border} px-3 py-1 text-xs font-bold font-['Cairo']`}
          >
            <RoleIcon className="h-3.5 w-3.5" />
            {language === 'ar' ? meta.labelAr : meta.labelEn}
          </span>

          <div className="flex items-center gap-2">
            <MemberAvatars members={item.members} ownerId={item.user_id} t={t} />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-['Cairo'] text-[var(--text-secondary)]">
              <Users className="h-3 w-3" />
              {item.other_members_count + 1}
            </span>
          </div>
        </div>

        {/* العنوان */}
        <h3 className="mb-3 truncate font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
          {item.title}
        </h3>

        {/* التاريخ + الوقت */}
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-['Cairo'] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-[#D4AF37]" />
            {formattedDate}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
            {formatTime12(item.start_time, language)}
          </span>
        </div>

        {/* صاحب الجدول */}
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
              roleMeta.owner.gradient
            } text-xs font-bold text-[#0b1a2e]`}
          >
            {(item.owner_name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-['Cairo'] text-[var(--text-muted)]">
              {item.is_owner ? t('شاركتها أنت', 'Shared by you') : t('صاحب الجدول', 'Owner')}
            </p>
            <p className="truncate text-sm font-bold font-['Cairo'] text-[var(--text-primary)]">
              {item.is_owner ? t('أنت', 'You') : item.owner_name || '—'}
            </p>
          </div>
          {item.is_owner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-['Cairo'] text-[#D4AF37]">
              <Share2 className="h-3 w-3" />
              {t('مشترك', 'Shared')}
            </span>
          )}
        </div>

        {/* الزر */}
        <Link
          href={`/dashboard/schedule/${item.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-4 py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-[#D4AF37]/40"
        >
          <Eye className="h-4 w-4" />
          {item.role === 'viewer' ? t('عرض الجدول', 'View schedule') : t('فتح الجدول', 'Open schedule')}
          <ArrowLeft className="h-4 w-4 ltr:rotate-180" />
        </Link>
      </div>
    </motion.article>
  )
}

/* ========== الصفحة الرئيسية ========== */
export default function SharedPage() {
  const { user } = useSupabase()
  const { t, language } = useLanguage()

  const [items, setItems] = useState<SharedSchedule[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    try {
      /* 1) عضويات المستخدم */
      const { data: myMemberships, error: memErr } = await supabase
        .from('schedule_members')
        .select('schedule_id, role')
        .eq('user_id', user.id)
      if (memErr) throw memErr

      /* 2) الجداول التي يملكها (قد لا يكون مضافاً كعضو) */
      const { data: ownedSchedules, error: ownErr } = await supabase
        .from('schedules')
        .select('id')
        .eq('user_id', user.id)
      if (ownErr) throw ownErr

      /* 3) دمج المعرفات */
      const membershipRole = new Map(
        (myMemberships ?? []).map((r) => [r.schedule_id, r.role as Role])
      )
      const ownedIds = new Set((ownedSchedules ?? []).map((s) => s.id))
      const allIds = new Set<string>([...membershipRole.keys(), ...ownedIds])

      if (allIds.size === 0) {
        setItems([])
        setStatus('ready')
        return
      }

      const ids = Array.from(allIds)

      /* 4) جلب الجداول */
      const { data: schedules, error: schErr } = await supabase
        .from('schedules')
        .select('id, title, day, start_time, user_id')
        .in('id', ids)
      if (schErr) throw schErr

      /* 5) جلب كل الأعضاء */
      const { data: allMembers } = await supabase
        .from('schedule_members')
        .select('schedule_id, user_id, role')
        .in('schedule_id', ids)

      /* 6) جلب أسماء الجميع */
      const profileIds = new Set<string>()
      ;(schedules ?? []).forEach((s) => profileIds.add(s.user_id))
      ;(allMembers ?? []).forEach((m) => profileIds.add(m.user_id))

      const { data: profiles } =
        profileIds.size > 0
          ? await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', Array.from(profileIds))
          : { data: [] as { id: string; full_name: string | null }[] }

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? '']))

      /* 7) تجميع الأعضاء */
      const membersBySchedule = new Map<string, Member[]>()
      for (const m of allMembers ?? []) {
        if (!membersBySchedule.has(m.schedule_id)) membersBySchedule.set(m.schedule_id, [])
        membersBySchedule.get(m.schedule_id)!.push({
          user_id: m.user_id,
          role: m.role as Role,
          full_name: profileMap.get(m.user_id) ?? '',
        })
      }

      /* 8) بناء البيانات */
      const enriched: SharedSchedule[] = (schedules ?? []).map((s) => {
        const members = membersBySchedule.get(s.id) ?? []
        const others = members.filter((m) => m.user_id !== s.user_id)
        const isOwner = s.user_id === user.id
        const myRole: Role = isOwner
          ? 'owner'
          : (membershipRole.get(s.id) ??
              (members.find((m) => m.user_id === user.id)?.role as Role) ??
              'viewer')

        return {
          id: s.id,
          title: s.title,
          day: s.day,
          start_time: s.start_time,
          user_id: s.user_id,
          role: myRole,
          members,
          other_members_count: others.length,
          owner_name: profileMap.get(s.user_id) ?? '',
          is_owner: isOwner,
          is_truly_shared: others.length > 0,
        }
      })

      /* 9) الاحتفاظ فقط بالمشاركة الفعلية */
      const onlyShared = enriched.filter((s) => !s.is_owner || s.is_truly_shared)

      setItems(onlyShared)
      setStatus('ready')
    } catch (e) {
      console.error('[shared] load error', e)
      setStatus('error')
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    void load()
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user, load])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
    toast.success(t('تم التحديث', 'Refreshed'))
  }

  /* ========== الإحصائيات ========== */
  const stats = useMemo(
    () => ({
      total: items.length,
      byMe: items.filter((i) => i.is_owner).length,
      withMe: items.filter((i) => !i.is_owner).length,
    }),
    [items]
  )

  /* ========== الفلترة والبحث ========== */
  const filtered = useMemo(() => {
    let list = items
    if (filter === 'byMe') list = list.filter((i) => i.is_owner)
    if (filter === 'withMe') list = list.filter((i) => !i.is_owner)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) || (i.owner_name || '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => (a.day < b.day ? 1 : -1))
  }, [items, filter, query])

  const tabs: {
    key: FilterKey
    labelAr: string
    labelEn: string
    count: number
    icon: typeof LayoutGrid
  }[] = [
    { key: 'all', labelAr: 'الكل', labelEn: 'All', count: stats.total, icon: LayoutGrid },
    { key: 'byMe', labelAr: 'شاركتها', labelEn: 'Shared by me', count: stats.byMe, icon: Send },
    {
      key: 'withMe',
      labelAr: 'شاركوها معي',
      labelEn: 'Shared with me',
      count: stats.withMe,
      icon: UserCheck,
    },
  ]

  return (
    <div className="space-y-6 p-2 sm:p-6">
      {/* ===== Hero ===== */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/10 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-['Cairo'] text-[#D4AF37]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('تعاون في الوقت الحقيقي', 'Real-time collaboration')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('الجداول المشتركة', 'Shared Schedules')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'نظّم جداولك مع فريقك وأصدقائك. تحكم بمن يرى ومن يعدّل بكل سهولة.',
                'Organize schedules with your team and friends. Control who can view and who can edit.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {[
                { labelAr: 'الكل', labelEn: 'Total', value: stats.total, color: 'text-[#D4AF37]' },
                { labelAr: 'شاركتها', labelEn: 'By me', value: stats.byMe, color: 'text-amber-400' },
                {
                  labelAr: 'شاركوها معي',
                  labelEn: 'With me',
                  value: stats.withMe,
                  color: 'text-emerald-400',
                },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-4 py-3 text-center backdrop-blur"
                >
                  <div className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="mt-0.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                    {t(s.labelAr, s.labelEn)}
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-50"
              title={t('تحديث', 'Refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ===== الفلاتر والبحث ===== */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1.5">
          {tabs.map((tab) => {
            const active = filter === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-3 py-1.5 font-['Cairo'] text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-md shadow-[#D4AF37]/30'
                    : 'text-[var(--text-secondary)] hover:bg-white/5'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(tab.labelAr, tab.labelEn)}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-[#0b1a2e]/20 text-[#0b1a2e]' : 'bg-white/5 text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ابحث بعنوان أو باسم المالك…', 'Search by title or owner…')}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[#D4AF37] focus:outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
          />
        </div>
      </div>

      {/* ===== المحتوى ===== */}
      {status === 'loading' && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/30 bg-red-500/5 p-10 text-center"
        >
          <CalendarX className="mx-auto mb-3 h-10 w-10 text-red-400/60" />
          <p className="font-['Cairo'] text-sm text-red-300">
            {t('تعذر تحميل الجداول المشتركة', 'Could not load shared schedules')}
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 font-['Cairo'] text-sm text-red-300 transition-colors hover:bg-red-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            {t('حاول مرة أخرى', 'Try again')}
          </button>
        </div>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37]/10">
            <Users className="h-8 w-8 text-[#D4AF37]/60" />
          </div>
          <h3 className="mb-2 font-['Amiri'] text-xl font-bold text-[var(--text-primary)]">
            {items.length === 0
              ? t('لا توجد جداول مشتركة بعد', 'No shared schedules yet')
              : t('لا توجد نتائج مطابقة', 'No matching results')}
          </h3>
          <p className="mx-auto max-w-md font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {items.length === 0
              ? t(
                  'افتح أي جدول واختر "مشاركة الجدول" لدعوة أصدقائك أو فريقك للتعاون معك.',
                  'Open any schedule and choose "Share" to invite friends or your team.'
                )
              : t('جرّب تعديل كلمات البحث أو الفلتر.', 'Try changing the search or filter.')}
          </p>
          {items.length === 0 && (
            <Link
              href="/dashboard/schedule"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-5 py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40"
            >
              <CalendarIcon className="h-4 w-4" />
              {t('اذهب إلى جداولي', 'Go to my schedules')}
            </Link>
          )}
        </motion.div>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, i) => (
              <SharedScheduleCard
                key={item.id}
                item={item}
                index={i}
                language={language}
                t={t}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}