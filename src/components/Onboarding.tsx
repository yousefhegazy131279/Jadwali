'use client'
import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { DEFAULT_PRAYER_TIMES, PRAYER_NAMES, normalizePrayerTimes } from '@/lib/preferences'
import { toast } from 'sonner'
import { formatTime12 } from '@/lib/time'
export default function Onboarding() {
  const { user, supabase, fullName, updateFullName } = useSupabase()
  const { t, language } = useLanguage()
  const [open,setOpen] = useState(false)
  const [step,setStep] = useState(0)
  const [name,setName] = useState('')
  const [times,setTimes] = useState(DEFAULT_PRAYER_TIMES)
  const [pom,setPom] = useState({sessionDuration:50,shortBreak:10,longBreak:30,cyclesBeforeLong:4})
  const [settingsId,setSettingsId] = useState<string|null>(null)
  const [busy,setBusy] = useState(false)
  useEffect(() => {
    if (!user) { setOpen(false); return }
    let active=true
    const load = async () => {
      const [profile,settings] = await Promise.all([
        supabase.from('profiles').select('onboarding_completed,full_name').eq('id',user.id).single(),
        supabase.from('settings').select('id,prayer_times,pomodoro').eq('user_id',user.id).maybeSingle(),
      ])
      if (!active || profile.error || settings.error) return
      setName(profile.data.full_name || fullName || '')
      setSettingsId(settings.data?.id ?? null)
      setTimes(normalizePrayerTimes(settings.data?.prayer_times))
      if(settings.data?.pomodoro) setPom({...settings.data.pomodoro,sessionDuration:settings.data.pomodoro.sessionDuration ?? settings.data.pomodoro.workDuration ?? 50})
      setOpen(!profile.data.onboarding_completed)
    }
    void load()
    return () => { active=false }
  },[user?.id,supabase,fullName])
  if(!open) return null
  const save = async (e:React.FormEvent) => {
    e.preventDefault()
    if(step<2) { setStep(step+1); return }
    setBusy(true)
    try {
      await updateFullName(name.trim())
      const values={user_id:user.id,prayer_times:times,pomodoro:pom,updated_at:new Date().toISOString()}
      const result = settingsId ? await supabase.from('settings').update(values).eq('id',settingsId).select().single() : await supabase.from('settings').insert({...values,theme:'dark',primary_color:'#D4AF37'}).select().single()
      if(result.error) throw result.error
      setSettingsId(result.data.id)
      const {error} = await supabase.from('profiles').update({onboarding_completed:true}).eq('id',user.id).select().single()
      if(error) throw error
      setOpen(false)
      localStorage.setItem('jadwali-welcome:'+user.id,'true')
      window.dispatchEvent(new Event('jadwali-onboarded'))
    } catch { toast.error(t('تعذر الحفظ. حاول مرة أخرى.','Could not save. Please retry.')) }
    finally {setBusy(false)}
  }
  return <div className="fixed inset-0 z-[2500] bg-black/70 flex items-center justify-center p-3">
    <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="onboarding-title" className="v1-panel w-full max-w-lg max-h-[90dvh] overflow-auto space-y-4">
      <h2 id="onboarding-title" className="text-2xl font-bold">{t('مرحبًا بك في جَدْوَلِي','Welcome to Jadwali')} · {step+1}/3</h2>
      <progress className="w-full" value={step+1} max={3}/>
      {step===0 && <label className="block">{t('كيف نناديك؟','What should we call you?')}<input autoFocus required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} className="v1-input w-full"/></label>}
      {step===1 && <div><h3>{t('مواقيت الصلاة','Prayer times')}</h3>{times.map((time,i)=><label key={i} className="flex flex-wrap justify-between items-center gap-2 my-2">{t(PRAYER_NAMES[i])}<input className="v1-input" type="time" required value={time} onChange={e=>setTimes(times.map((v,j)=>i===j?e.target.value:v))}/><span>{formatTime12(time,language)}</span></label>)}</div>}
      {step===2 && <div><h3>{t('إعدادات بومودورو','Pomodoro settings')}</h3>{([
        ['sessionDuration','مدة العمل','Focus duration',120],['shortBreak','راحة قصيرة','Short break',30],['longBreak','راحة طويلة','Long break',60],['cyclesBeforeLong','عدد الدورات','Cycles before a long break',10],
      ] as const).map(([key,ar,en,max])=><label key={key} className="flex justify-between items-center my-2 gap-2">{t(ar,en)}<input className="v1-input w-24" type="number" required min={1} max={max} value={pom[key]} onChange={e=>setPom({...pom,[key]:Number(e.target.value)})}/></label>)}</div>}
      <div className="flex justify-between gap-2">{step>0 && <button type="button" className="v1-button" onClick={()=>setStep(step-1)}>{t('السابق','Back')}</button>}<button disabled={busy} className="v1-button">{busy?t('جارٍ الحفظ','Saving…'):step===2?t('ابدأ التخطيط','Start planning'):t('التالي','Next')}</button></div>
    </form>
  </div>
}
