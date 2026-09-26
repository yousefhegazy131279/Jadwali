'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import {
  Users,
  ChevronDown,
  Crown,
  Pencil,
  Eye,
  Trash2,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  Info,
  UserPlus,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react'

export type MemberProgress = {
  user_id: string
  full_name: string
  role: string
  sessions: number
  minutes: number
}

/* ============================================================
   أدوات مساعدة
   ============================================================ */
const roleMeta = {
  owner: {
    labelAr: 'المالك',
    labelEn: 'Owner',
    gradient: 'from-amber-400 via-yellow-500 to-amber-600',
    text: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/30',
    ring: 'ring-amber-400/30',
    icon: Crown,
  },
  editor: {
    labelAr: 'محرر',
    labelEn: 'Editor',
    gradient: 'from-emerald-400 via-teal-500 to-emerald-600',
    text: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/30',
    ring: 'ring-emerald-400/30',
    icon: Pencil,
  },
  viewer: {
    labelAr: 'مشاهد',
    labelEn: 'Viewer',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    text: 'text-sky-300',
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/30',
    ring: 'ring-sky-400/30',
    icon: Eye,
  },
} as const

type RoleKey = keyof typeof roleMeta

const getRoleMeta = (role: string) => {
  return roleMeta[(role as RoleKey) in roleMeta ? (role as RoleKey) : 'viewer']
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
  const sum = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarColors[sum % avatarColors.length]
}

/* ============================================================
   بطاقة عضو
   ============================================================ */
function MemberCard({
  member,
  index,
  canRemove,
  onRemove,
  busy,
  t,
  language,
}: {
  member: MemberProgress
  index: number
  canRemove: boolean
  onRemove: () => void
  busy: boolean
  t: (ar: string, en?: string) => string
  language: 'ar' | 'en'
}) {
  const meta = getRoleMeta(member.role)
  const RoleIcon = meta.icon
  const initial = (member.full_name || '?').charAt(0).toUpperCase()
  const avatarColor = getAvatarColor(member.full_name)

  // تقدير بسيط للتقدم: كل 25 دقيقة = جلسة نموذجية
  const goal = Math.max(member.sessions * 25, 100)
  const progress = Math.min(Math.round((member.minutes / goal) * 100), 100)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 28 }}
      whileHover={{ y: -2 }}
      className={`group relative overflow-hidden rounded-2xl border ${meta.border} bg-[var(--bg-secondary)]/60 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-black/20`}
    >
      {/* شريط علوي بلون الدور */}
      <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${meta.gradient}`} />

      {/* هالة عند التحويم */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br ${meta.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-15`}
      />

      <div className="relative p-3.5">
        <div className="flex items-start gap-3">
          {/* الأفاتار */}
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarColor} font-['Cairo'] text-base font-bold text-white shadow-md`}
          >
            {initial}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-card)]">
              <RoleIcon className={`h-2.5 w-2.5 ${meta.text}`} />
            </div>
          </div>

          {/* المعلومات */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
                {member.full_name || t('مستخدم', 'User')}
              </h3>
              <span
                className={`shrink-0 rounded-full ${meta.bg} ${meta.text} border ${meta.border} px-2 py-0.5 font-['Cairo'] text-[10px] font-bold`}
              >
                {language === 'ar' ? meta.labelAr : meta.labelEn}
              </span>
            </div>

            {/* الإحصائيات */}
            <div className="mt-2 flex items-center gap-3 font-['Cairo'] text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="font-mono font-bold text-emerald-400">{member.sessions}</span>
                <span className="text-[var(--text-muted)]">{t('جلسة', 'sessions')}</span>
              </span>
              <span className="text-white/10">|</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-[#D4AF37]" />
                <span className="font-mono font-bold text-[#D4AF37]">{member.minutes}</span>
                <span className="text-[var(--text-muted)]">{t('دقيقة', 'min')}</span>
              </span>
            </div>

            {/* شريط التقدم */}
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 + index * 0.05 }}
              />
            </div>
          </div>
        </div>

        {/* زر الإزالة */}
        {canRemove && member.role !== 'owner' && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1 font-['Cairo'] text-[10px] font-bold text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/15 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {t('إزالة', 'Remove')}
            </button>
          </div>
        )}
      </div>
    </motion.article>
  )
}

/* ============================================================
   المكوّن الرئيسي
   ============================================================ */
export default function SharingPanel({
  scheduleId,
  owner,
  onRole,
}: {
  scheduleId: string
  owner: boolean
  onRole?: (members: MemberProgress[]) => void
}) {
  const { t, language } = useLanguage()
  const [members, setMembers] = useState<MemberProgress[]>([])
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    const result = await createClient().rpc('schedule_member_progress', {
      p_schedule_id: scheduleId,
    })
    setError(!!result.error)
    if (!result.error) {
      const data = result.data ?? []
      setMembers(data)
      onRole?.(data)
    }
  }, [scheduleId, onRole])

  useEffect(() => {
    void load()
    const timer = setInterval(load, 15000)
    window.addEventListener('jadwali-progress', load)
    return () => {
      clearInterval(timer)
      window.removeEventListener('jadwali-progress', load)
    }
  }, [load])

  const share = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await createClient().rpc('share_schedule', {
      p_schedule_id: scheduleId,
      p_email: email.trim(),
      p_role: role,
    })
    setBusy(false)
    if (error) {
      toast.error(
        t(
          'تعذرت المشاركة. تأكد من تسجيل المستخدم وعدم وجود عضو آخر.',
          'Could not share. The user must be registered and the schedule can have only one guest.'
        )
      )
      return
    }
    setEmail('')
    await load()
    toast.success(t('تمت مشاركة الجدول', 'Schedule shared'))
  }

  const remove = async (id: string) => {
    setBusy(true)
    const { error } = await createClient().rpc('remove_schedule_member', {
      p_schedule_id: scheduleId,
      p_user_id: id,
    })
    setBusy(false)
    if (error) toast.error(t('تعذر إزالة العضو', 'Could not remove member'))
    else {
      await load()
      toast.success(t('تمت الإزالة', 'Removed'))
    }
  }

  const editorCount = members.filter((m) => m.role === 'editor').length
  const viewerCount = members.filter((m) => m.role === 'viewer').length

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      {/* هالة خلفية خفيفة */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 rounded-full bg-[#D4AF37]/5 blur-3xl" />

      {/* الرأس (زر التبديل) */}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="relative flex w-full items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37]">
            <Users className="h-4 w-4" />
            {members.length > 0 && (
              <div className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#D4AF37] px-1 font-mono text-[9px] font-bold text-[#0b1a2e]">
                {members.length}
              </div>
            )}
          </div>

          <div className="text-right ltr:text-left">
            <div className="flex items-center gap-2 font-['Amiri'] text-sm font-bold text-[var(--text-primary)]">
              {t('مشاركة الجدول', 'Share schedule')}
              <Sparkles className="h-3 w-3 text-[#D4AF37]/60" />
            </div>
            <div className="mt-0.5 flex items-center gap-2 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <Crown className="h-2.5 w-2.5 text-amber-400" />
                {members.filter((m) => m.role === 'owner').length || 1}
              </span>
              {editorCount > 0 && (
                <>
                  <span className="text-white/10">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Pencil className="h-2.5 w-2.5 text-emerald-400" />
                    {editorCount}
                  </span>
                </>
              )}
              {viewerCount > 0 && (
                <>
                  <span className="text-white/10">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5 text-sky-400" />
                    {viewerCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-[var(--text-secondary)]"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      {/* المحتوى القابل للطي */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border-color)] p-4">
              {/* خطأ */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2.5 font-['Cairo'] text-xs text-red-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t('تعذر تحميل الأعضاء', 'Could not load members')}
                </div>
              )}

              {/* نموذج المشاركة */}
              {owner && (
                <form
                  onSubmit={share}
                  className="mb-4 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/5 to-transparent p-3.5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D4AF37]/15 text-[#D4AF37]">
                      <UserPlus className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-['Cairo'] text-xs font-bold text-[var(--text-primary)]">
                        {t('دعوة عضو جديد', 'Invite a new member')}
                      </div>
                      <div className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
                        {t('أضف شخصاً للتعاون على هذا الجدول', 'Add someone to collaborate')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {/* البريد */}
                    <div className="relative flex-1">
                      <Mail className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        aria-label={t('البريد الإلكتروني', 'Email')}
                        placeholder={t('بريد المستخدم…', "User's email…")}
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
                      />
                    </div>

                    {/* الدور */}
                    <div className="flex gap-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1">
                      {[
                        { value: 'viewer', label: t('مشاهد', 'Viewer'), icon: Eye, accent: 'sky' },
                        { value: 'editor', label: t('محرر', 'Editor'), icon: Pencil, accent: 'emerald' },
                      ].map((opt) => {
                        const Icon = opt.icon
                        const active = role === opt.value
                        const activeCls =
                          opt.accent === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-['Cairo'] text-[11px] font-bold transition-all ${
                              active
                                ? activeCls
                                : 'border-transparent text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]'
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* إرسال */}
                    <button
                      type="submit"
                      disabled={busy || !email.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-4 py-2.5 font-['Cairo'] text-xs font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {t('إرسال الدعوة', 'Invite')}
                    </button>
                  </div>
                </form>
              )}

              {/* قائمة الأعضاء */}
              {members.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {members.map((m, i) => (
                      <MemberCard
                        key={m.user_id}
                        member={m}
                        index={i}
                        canRemove={owner}
                        onRemove={() => remove(m.user_id)}
                        busy={busy}
                        t={t}
                        language={language}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                !error && (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-white/[0.01] py-6 text-center">
                    <Users className="mx-auto mb-2 h-6 w-6 text-[var(--text-muted)]/40" />
                    <p className="font-['Cairo'] text-xs text-[var(--text-muted)]">
                      {t('لا يوجد أعضاء بعد', 'No members yet')}
                    </p>
                  </div>
                )
              )}

              {/* ملاحظة */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                <p className="font-['Cairo'] text-[10px] leading-relaxed text-[var(--text-muted)]">
                  {t(
                    'يُعرض إنجاز كل عضو منذ تفعيل سجل الجلسات. الجلسة المشتركة تُحتسب مرة واحدة.',
                    'Contributions are tracked from the session log activation. A shared session is counted once.'
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}