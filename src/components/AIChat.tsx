'use client'
import { useState } from 'react'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { validateDraft, type ScheduleDraft } from '@/lib/scheduleAI'
import { formatTime12 } from '@/lib/time'
export default function AIChat({date,onApply}:{date:string;onApply:(draft:ScheduleDraft)=>void}){
  const {t,language}=useLanguage();const [input,setInput]=useState('');const [messages,setMessages]=useState<{role:'user'|'assistant';content:string}[]>([])
  const [draft,setDraft]=useState<ScheduleDraft|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const send=async(e:React.FormEvent)=>{
    e.preventDefault();if(!input.trim()||busy)return
    const next=[...messages,{role:'user' as const,content:input.trim()}].slice(-11)
    setBusy(true);setError('');setMessages(next)
    try {
      const result=await createClient().functions.invoke('generate-schedule',{body:{messages:next,date}})
      if(result.error||!validateDraft(result.data?.draft))throw new Error()
      setDraft(result.data.draft);setInput('')
      setMessages([...next,{role:'assistant',content:JSON.stringify(result.data.draft)}])
    }catch{setError(t('تعذر الحصول على اقتراح. تحقق من الاتصال وتفعيل Jadwool ثم أعد المحاولة.','Could not get a suggestion. Check your connection and that Jadwool is configured, then retry.'))}
    finally{setBusy(false)}
  }
  return <section className="v1-panel space-y-4"><h2 className="text-xl font-bold">{t('جَدْوُولْ','Jadwool')}</h2><p>{t('صف مهامك ووقتك المتاح، ثم راجع الاقتراح قبل استخدامه.','Describe your tasks and available time, then review the suggestion before using it.')}</p>
    <div className="max-h-48 overflow-y-auto space-y-2" aria-live="polite">{messages.filter(m=>m.role==='user').map((m,i)=><p className="p-2 rounded bg-[var(--bg-secondary)]" key={i}>{m.content}</p>)}</div>
    <form onSubmit={send} className="flex flex-col gap-2"><textarea className="v1-input" maxLength={3000} required value={input} onChange={e=>setInput(e.target.value)} aria-label={t('رسالتك إلى جدوول','Your message to Jadwool')} placeholder={t('لدي ساعتان للرياضيات وساعة للقراءة بعد الخامسة…','I have two hours for math and one hour for reading after 5 PM…')}/><button className="v1-button self-start" disabled={busy}>{busy?t('جارٍ التفكير…','Thinking…'):t('اقترح جدولًا','Suggest a schedule')}</button></form>
    {error&&<p role="alert" className="text-red-400">{error}</p>}
    {draft&&<article className="space-y-2"><h3 className="font-bold">{draft.title}</h3><p>{draft.date} · {formatTime12(draft.start_time,language)}</p><ul>{draft.tasks.map((task,i)=><li key={i}>{task.name} · {task.category} · {task.duration_minutes} {t('دقيقة','minutes')}</li>)}</ul><button className="v1-button" disabled={busy} onClick={()=>onApply(draft)}>{t('استخدم هذا الجدول','Use this schedule')}</button></article>}
  </section>
}
