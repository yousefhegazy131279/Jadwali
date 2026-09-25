'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import SharingPanel from '@/components/SharingPanel'
export default function SharedPage() {
  const { supabase, user } = useSupabase()
  const { t } = useLanguage()
  const [items, setItems] = useState<{id:string;title:string;user_id:string}[]>([])
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const {data,error} = await supabase.from('schedules').select('id,title,user_id').eq('is_shared',true)
      if (error) { setStatus('error'); return }
      setItems(data ?? []); setStatus('ready')
    }
    void load(); window.addEventListener('focus',load)
    return () => window.removeEventListener('focus',load)
  },[user?.id,supabase])
  return <div className="space-y-5"><h1 className="text-3xl font-bold">{t('المشترك','Shared schedules')}</h1>
    {status==='loading' && <p>{t('جارٍ التحميل','Loading…')}</p>}
    {status==='error' && <p role="alert">{t('تعذر تحميل الجداول','Could not load schedules')}</p>}
    {status==='ready' && !items.length && <p>{t('لا توجد جداول مشتركة بعد. افتح جدولًا واختر مشاركة الجدول.','No shared schedules yet. Open a schedule and choose Share schedule.')}</p>}
    {items.map(s => <article className="space-y-3" key={s.id}><Link className="text-xl underline" href={'/dashboard/schedule/'+s.id}>{s.title}</Link><SharingPanel scheduleId={s.id} owner={s.user_id===user?.id}/></article>)}
  </div>
}
