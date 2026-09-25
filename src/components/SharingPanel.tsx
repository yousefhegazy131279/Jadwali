'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
export type MemberProgress = { user_id: string; full_name: string; role: string; sessions: number; minutes: number }
export default function SharingPanel({ scheduleId, owner, onRole }: { scheduleId: string; owner: boolean; onRole?: (members: MemberProgress[]) => void }) {
  const { t } = useLanguage()
  const [members, setMembers] = useState<MemberProgress[]>([])
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const load = useCallback(async () => {
    const result = await createClient().rpc('schedule_member_progress', { p_schedule_id: scheduleId })
    setError(!!result.error)
    if (!result.error) { setMembers(result.data ?? []); onRole?.(result.data ?? []) }
  }, [scheduleId, onRole])
  useEffect(() => {
    void load()
    const timer = setInterval(load, 15000)
    window.addEventListener('jadwali-progress', load)
    return () => { clearInterval(timer); window.removeEventListener('jadwali-progress', load) }
  }, [load])
  const share = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    const { error } = await createClient().rpc('share_schedule', { p_schedule_id: scheduleId, p_email: email.trim(), p_role: role })
    setBusy(false)
    if (error) { toast.error(t('تعذرت المشاركة. تأكد من تسجيل المستخدم وعدم وجود عضو آخر.', 'Could not share. The user must be registered and the schedule can have only one guest.')); return }
    setEmail(''); await load(); toast.success(t('تمت مشاركة الجدول', 'Schedule shared'))
  }
  const remove = async (id: string) => {
    setBusy(true)
    const { error } = await createClient().rpc('remove_schedule_member', { p_schedule_id: scheduleId, p_user_id: id })
    setBusy(false)
    if (error) toast.error(t('تعذر إزالة العضو', 'Could not remove member'))
    else await load()
  }
  return <section className="v1-panel">
    <button className="v1-button" onClick={() => setOpen(!open)} aria-expanded={open}>{t('مشاركة الجدول', 'Share schedule')}</button>
    {open && <div className="space-y-4 mt-4">
      {error && <p role="alert">{t('تعذر تحميل الأعضاء', 'Could not load members')}</p>}
      {owner && <form onSubmit={share} className="flex flex-wrap gap-2">
        <input className="v1-input flex-1" type="email" required value={email} onChange={e => setEmail(e.target.value)} aria-label={t('البريد الإلكتروني', 'Email')} placeholder={t('بريد المستخدم الآخر', 'Other user’s email')} />
        <select className="v1-input" value={role} onChange={e => setRole(e.target.value)} aria-label={t('الدور', 'Role')}>
          <option value="viewer">{t('شخصي — مشاهدة فقط', 'Personal — view only')}</option>
          <option value="editor">{t('مشترك — يمكنه الإنجاز', 'Shared — can complete tasks')}</option>
        </select>
        <button disabled={busy} className="v1-button">{t('مشاركة', 'Share')}</button>
      </form>}
      <div className="grid sm:grid-cols-2 gap-3">{members.map(m => <article className="v1-panel" key={m.user_id}>
        <h3>{m.full_name || t('مستخدم', 'User')} · {t(m.role === 'owner' ? 'المالك' : m.role === 'editor' ? 'محرر' : 'مشاهد', m.role)}</h3>
        <p>{m.sessions} {t('جلسة', 'sessions')} · {m.minutes} {t('دقيقة تركيز', 'focus minutes')}</p>
        {owner && m.role !== 'owner' && <button disabled={busy} onClick={() => remove(m.user_id)} className="v1-button">{t('إزالة العضو', 'Remove member')}</button>}
      </article>)}</div>
      <p className="text-sm text-[var(--text-muted)]">{t('يُعرض إنجاز كل عضو منذ تفعيل سجل الجلسات. الجلسة المشتركة تُحتسب مرة واحدة.', 'Contributions are tracked from the session log activation. A shared session is counted once.')}</p>
    </div>}
  </section>
}
