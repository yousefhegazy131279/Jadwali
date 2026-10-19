'use client'
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react'
import {useRouter} from 'next/navigation'
import {BookOpen,GraduationCap,Briefcase,Code2,Languages,Leaf,Moon,PenTool,Heart,Microscope,CalendarDays,Clock3,ListChecks,Check,ChevronLeft,Search,Sparkles} from 'lucide-react'
import {useSupabase} from '@/lib/supabaseProvider'
import {useLanguage} from '@/context/LanguageContext'
import {type Template,localDate,errorText} from '@/lib/productivity'
import {FeaturePage,Panel,Modal,Alert,Busy,Empty,useFeatureData} from '@/components/v2/FeatureUI'
import {usePrayerLocation} from '@/context/PrayerLocationContext'
import {geographicPrayerTimes,addPrayerDays} from '@/lib/geographicPrayers'
import AutomaticPrayerControls from '@/components/AutomaticPrayerControls'
import {toast} from 'sonner'

const categories=[['all','كل القوالب','All templates'],['study','دراسة','Study'],['work','عمل','Work'],['skills','تعلّم ومهارات','Learning'],['balance','حياة متوازنة','Balance'],['faith','قرآن وعبادة','Faith']] as const
type Category=typeof categories[number][0]
const templateInfo:Record<string,{category:Category;icon:typeof BookOpen;color:string}>={
 student:{category:'study',icon:GraduationCap,color:'#60a5fa'},exams:{category:'study',icon:GraduationCap,color:'#60a5fa'},university:{category:'study',icon:BookOpen,color:'#60a5fa'},research:{category:'study',icon:Microscope,color:'#60a5fa'},
 'work-study':{category:'work',icon:Briefcase,color:'#d4af37'},freelancer:{category:'work',icon:Briefcase,color:'#d4af37'},'remote-work':{category:'work',icon:Briefcase,color:'#d4af37'},'content-creator':{category:'work',icon:PenTool,color:'#d4af37'},
 programming:{category:'skills',icon:Code2,color:'#a78bfa'},languages:{category:'skills',icon:Languages,color:'#a78bfa'},'skill-week':{category:'skills',icon:Sparkles,color:'#a78bfa'},
 reading:{category:'balance',icon:BookOpen,color:'#34d399'},'gentle-start':{category:'balance',icon:Leaf,color:'#34d399'},weekend:{category:'balance',icon:Heart,color:'#34d399'},
 ramadan:{category:'faith',icon:Moon,color:'#d4af37'},quran:{category:'faith',icon:BookOpen,color:'#d4af37'},
}
const focusMinutes=(item:Template)=>item.tasks.filter(x=>x.type==='task').reduce((n,x)=>n+x.duration,0)

export default function TemplatesPage(){
 const {t,language}=useLanguage(),{user,supabase}=useSupabase(),router=useRouter(),automaticPrayers=usePrayerLocation()
 const [chosen,setChosen]=useState<Template|null>(null),[date,setDate]=useState(localDate()),[time,setTime]=useState('08:00'),[project,setProject]=useState(''),[projects,setProjects]=useState<{id:string;title:string}[]>([]),[busy,setBusy]=useState(false),[category,setCategory]=useState<Category>('all'),[search,setSearch]=useState('')
 const request=useRef('')
 useEffect(()=>{request.current=crypto.randomUUID()},[date,time,project,automaticPrayers.profile])
 const load=useCallback(async()=>{const r=await supabase.from('templates').select('*').order('id');if(r.error)throw r.error;return r.data as Template[]},[supabase])
 const {data,loading,error,refresh}=useFeatureData(load,!!user)
 useEffect(()=>{if(user)void supabase.from('projects').select('id,title:name').eq('user_id',user.id).then(r=>setProjects(r.data||[]))},[supabase,user])
 const rows=(data||[]).filter(item=>(category==='all'||templateInfo[item.id]?.category===category)&&[item.title_ar,item.title_en,item.description_ar,item.description_en].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
 function edit(){if(!chosen||!user)return;sessionStorage.setItem('jadwali-template:'+user.id,JSON.stringify({template:chosen,date,time,project,created:Date.now()}));router.push('/dashboard/planner')}
 async function create(){if(!chosen)return;setBusy(true);try{if(!automaticPrayers.ready||automaticPrayers.busy)throw new Error(t('انتظر إعداد الموقع','Wait for location settings'));const daily=automaticPrayers.profile?Array.from({length:chosen.days},(_,i)=>geographicPrayerTimes(automaticPrayers.profile!,addPrayerDays(date,i))):null;const r=await supabase.rpc(daily?'create_template_plan_geographic':'create_template_plan',{p_template_id:chosen.id,p_day:date,p_start_time:time,p_project_id:project||null,p_request_id:request.current,p_language:language,...(daily?{p_daily_prayers:daily}:{})});if(r.error)throw r.error;toast.success(t('تم إنشاء جداول القالب','Template plans created'));router.push('/dashboard/schedule')}catch(e){toast.error(errorText(e,language==='ar'))}finally{setBusy(false)}}
 return <FeaturePage title={t('لكل يوم، بداية تناسبه','A starting point for every day')} description={t('اختر خطة تشبه يومك، راجع مهامها، ثم اجعلها جدولك الخاص. يمكنك تخصيصها في المخطط قبل البدء.','Find a plan that fits your day, review its tasks and make it yours. Customize it in the planner before you begin.')}>
  <Panel><div className="v2-filterbar"><p className="v2-result-count">{t('مكتبة القوالب','Template library')} · {data?.length??'—'} {t('قالبًا','templates')}</p><label className="v2-template-search"><Search size={17} aria-hidden="true"/><input aria-label={t('البحث في القوالب','Search templates')} placeholder={t('ابحث عن خطة ليومك…','Find a plan for your day…')} value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="v2-chips" style={{marginTop:16}} aria-label={t('تصنيفات القوالب','Template categories')}>{categories.map(([key,ar,en])=><button type="button" className="v2-chip" key={key} aria-pressed={category===key} onClick={()=>setCategory(key)}>{t(ar,en)}</button>)}</div></Panel>
  {error&&<Alert message={error} retry={()=>void refresh()}/>}
  {loading?<Busy/>:rows.length?<div className="v2-grid v2-template-grid">{rows.map(item=>{const info=templateInfo[item.id]||{category:'balance',icon:CalendarDays,color:'#d4af37'},Icon=info.icon,group=categories.find(x=>x[0]===info.category)!;return <Panel key={item.id} className="v2-template-card"><div className="v2-template-top" style={{'--template-color':info.color} as CSSProperties}><span className="v2-template-icon"><Icon size={24} strokeWidth={1.5}/></span><span className="v2-template-badge">{t(group[1],group[2])}</span></div><div className="v2-template-copy"><h2>{language==='ar'?item.title_ar:item.title_en}</h2><p className="v2-muted">{language==='ar'?item.description_ar:item.description_en}</p></div><div className="v2-template-stats"><span><Clock3 size={14}/>{focusMinutes(item)} {t('دقيقة / يوم','min / day')}</span><span><CalendarDays size={14}/>{item.days===1?t('يوم واحد','One day'):t(`${item.days} أيام`,`${item.days} days`)}</span><span><ListChecks size={14}/>{item.tasks.length} {t('مهام','tasks')}</span></div><ul className="v2-template-tasks">{item.tasks.slice(0,2).map((task,i)=><li key={i}><Check size={13}/>{language==='ar'?task.name:task.name_en}</li>)}</ul><button className="v2-button secondary" aria-label={t('معاينة قالب '+item.title_ar,'Preview '+item.title_en)} onClick={()=>{request.current=crypto.randomUUID();setChosen(item)}}>{t('استكشف القالب','Explore template')}<ChevronLeft size={16}/></button></Panel>})}</div>:!error&&<Empty>{t('لا توجد قوالب تطابق بحثك. جرّب كلمة أخرى أو تصنيفًا مختلفًا.','No matching templates. Try another search or category.')}</Empty>}
  <Modal open={!!chosen} onClose={()=>{if(!busy)setChosen(null)}} title={chosen?(language==='ar'?chosen.title_ar:chosen.title_en):''}>{chosen&&<div className="v2-form">
   <div className="v2-template-summary"><span><Clock3 size={15}/>{focusMinutes(chosen)} {t('دقيقة تركيز يوميًا','focus minutes per day')}</span><span><CalendarDays size={15}/>{chosen.days} {t('يوم','day(s)')}</span><span><ListChecks size={15}/>{chosen.tasks.length} {t('مهام','tasks')}</span></div>
   <p className="v2-muted" style={{fontSize:13,margin:0}}>{language==='ar'?chosen.description_ar:chosen.description_en}</p>
   <ol className="v2-preview-tasks">{chosen.tasks.map((task,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><div>{language==='ar'?task.name:task.name_en}<small>{task.type==='side'?t('مهمة جانبية مستقلة عن مؤقت التركيز','Side task, separate from the focus timer'):t('مهمة أساسية · جلسات تركيز','Main task · focus sessions')}</small></div><span>{task.type==='side'?t('جانبية','Side task'):`${task.duration} ${t('دقيقة','min')}`}</span></li>)}</ol>
   <div className="v2-form-pair"><label>{t('تاريخ البداية','Start date')}<input type="date" value={date} required onChange={e=>setDate(e.target.value)}/></label><label>{t('وقت البداية','Start time')}<input type="time" value={time} required onChange={e=>setTime(e.target.value)}/></label></div>
   <label>{t('المشروع','Project')}<select value={project} onChange={e=>setProject(e.target.value)}><option value="">{t('بدون مشروع','No project')}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
   <AutomaticPrayerControls day={date}/><p className="v2-hint">{automaticPrayers.profile?t('تُحسب مواقيت الصلاة لموقعك وتاريخ كل يوم من القالب.','Prayer times are calculated for your location and each date in the template.'):t('تُنسخ مواقيت الصلاة من إعدادات حسابك. راجعها أو فعّل الضبط حسب موقعك.','Prayer times are copied from your settings. Review them or enable location-based times.')}{chosen.days>1?' '+t('تتكرر مهام القالب في كل يوم؛ عدّل كل جدول بعد إنشائه حسب احتياجك.','Template tasks repeat daily; adjust each created plan as needed.'):''}</p>
   <button className="v2-button" disabled={busy||!date||!time||!automaticPrayers.ready||automaticPrayers.busy} onClick={()=>void create()}>{busy?t('جارٍ الإنشاء…','Creating…'):t(`إنشاء ${chosen.days} جدول`,`Create ${chosen.days} plan(s)`)}</button><button className="v2-button secondary" disabled={busy} onClick={edit}>{t('تخصيص اليوم الأول في المخطط','Customize the first day in planner')}</button>
  </div>}</Modal>
 </FeaturePage>
}
