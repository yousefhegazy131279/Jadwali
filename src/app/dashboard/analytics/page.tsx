'use client'
import {useEffect,useState} from 'react'
import dynamic from 'next/dynamic'
import {useSupabase} from '@/lib/supabaseProvider'
import {useLanguage} from '@/context/LanguageContext'
import {summarizeTasks,dailySessions} from '@/lib/analytics'
const Charts=dynamic(()=>import('@/components/AnalyticsCharts'),{ssr:false,loading:()=> <div className="h-80 animate-pulse bg-[var(--bg-card)] rounded-xl"/>})
export default function AnalyticsPage(){
 const {user,supabase}=useSupabase();const {t}=useLanguage();const [status,setStatus]=useState('loading');const [weekly,setWeekly]=useState(false)
 const [summary,setSummary]=useState<ReturnType<typeof summarizeTasks>>({sessions:0,hours:0,completion:0,categories:[]});const [series,setSeries]=useState<{day:string;sessions:number}[]>([])
 useEffect(()=>{if(!user)return;const load=async()=>{
   const since=new Date();since.setDate(since.getDate()-28)
   const [tasks,schedules,events]=await Promise.all([supabase.from('tasks').select('id,done,category,duration,completed_sessions,schedule_id').eq('user_id',user.id),supabase.from('schedules').select('id,pomodoro').eq('user_id',user.id),supabase.from('task_progress').select('completed_at').eq('user_id',user.id).gte('completed_at',since.toISOString())])
   if(tasks.error||schedules.error||events.error){setStatus('error');return}
   setSummary(summarizeTasks(tasks.data??[],schedules.data??[]));setSeries(dailySessions(events.data??[]));setStatus('ready')
 };void load();window.addEventListener('focus',load);window.addEventListener('jadwali-progress',load);return()=>{window.removeEventListener('focus',load);window.removeEventListener('jadwali-progress',load)}},[user?.id,supabase])
 const plotted=weekly?Array.from({length:4},(_,i)=>({day:series[i*7]?.day??'',sessions:series.slice(i*7,i*7+7).reduce((sum,row)=>sum+row.sessions,0)})):series
 return <div className="space-y-5"><h1 className="text-3xl font-bold">{t('الإحصائيات','Analytics')}</h1>
 {status==='loading'&&<p>{t('جارٍ التحميل','Loading…')}</p>}{status==='error'&&<p role="alert">{t('تعذر تحميل الإحصائيات','Could not load analytics')}</p>}
 {status==='ready'&&<><div className="grid sm:grid-cols-3 gap-3">{[[t('الجلسات المنجزة','Completed sessions'),summary.sessions],[t('ساعات التركيز','Focus hours'),summary.hours.toFixed(1)],[t('نسبة إنجاز المهام','Task completion'),summary.completion+'%']].map(([label,value])=><article className="v1-panel" key={label}><p>{label}</p><strong className="text-3xl text-[#D4AF37]">{value}</strong></article>)}</div>
 <div className="flex flex-wrap justify-between items-center gap-2"><h2>{t('جلساتي خلال آخر 28 يومًا وتوزيع مهامي','My sessions over the last 28 days and task categories')}</h2><button className="v1-button" onClick={()=>setWeekly(!weekly)}>{weekly?t('عرض يومي','Daily view'):t('عرض أسبوعي','Weekly view')}</button></div>
 <Charts series={plotted} categories={summary.categories}/><p className="text-sm text-[var(--text-muted)]">{t('الإجماليات تشمل المهام القديمة. الرسم الزمني يبدأ من تفعيل سجل الجلسات؛ لا نُسند جلسات قديمة إلى تواريخ غير معروفة.','Totals include existing tasks. The timeline starts when session logging was enabled; historical sessions with unknown dates are not assigned invented dates.')}</p>
 <details className="v1-panel"><summary>{t('عرض البيانات كجدول','View data as a table')}</summary><table className="w-full"><thead><tr><th>{t('التاريخ','Date')}</th><th>{t('الجلسات','Sessions')}</th></tr></thead><tbody>{plotted.map(row=><tr key={row.day}><td>{row.day}</td><td>{row.sessions}</td></tr>)}</tbody></table><ul>{summary.categories.map(c=><li key={c.name}>{c.name}: {c.value}</li>)}</ul></details></>}
 </div>
}
