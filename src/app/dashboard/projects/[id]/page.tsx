'use client'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {useSupabase} from '@/lib/supabaseProvider'
import {useLanguage} from '@/context/LanguageContext'
import {formatTime12} from '@/lib/time'
type Schedule={id:string;title:string;day:string;start_time:string;tasks:{id:string;name:string;done:boolean;completed_sessions:number}[]}
export default function ProjectDetailPage(){
 const {id}=useParams();const {supabase,user}=useSupabase();const {t,language}=useLanguage()
 const [name,setName]=useState('');const [schedules,setSchedules]=useState<Schedule[]>([]);const [tasks,setTasks]=useState<{id:string;name:string;done:boolean}[]>([]);const [status,setStatus]=useState('loading')
 useEffect(()=>{if(!user||!id)return;let active=true;const load=async()=>{
 const [project,list,standalone]=await Promise.all([supabase.from('projects').select('name').eq('id',id).eq('user_id',user.id).single(),supabase.from('schedules').select('id,title,day,start_time,tasks(id,name,done,completed_sessions)').eq('project_id',id).order('day'),supabase.from('tasks').select('id,name,done').eq('project_id',id).is('schedule_id',null)])
 if(!active)return;if(project.error||list.error||standalone.error){setStatus('error');return}
 setName(project.data.name);setSchedules(list.data??[]);setTasks(standalone.data??[]);setStatus('ready')
 };void load();return()=>{active=false}},[id,user?.id,supabase])
 return <div className="space-y-5"><Link className="v1-button inline-block" href="/dashboard/projects">{t('المشاريع','Projects')}</Link><h1 className="text-3xl font-bold">{name}</h1>
 {status==='loading'&&<p>{t('جارٍ التحميل','Loading…')}</p>}{status==='error'&&<p role="alert">{t('تعذر تحميل المشروع','Could not load project')}</p>}
 {status==='ready'&&!schedules.length&&<p>{t('أضف جدولًا إلى هذا المشروع من المخطط.','Add a schedule to this project in the planner.')}</p>}
 {schedules.map(s=><article className="v1-panel space-y-2" key={s.id}><Link className="text-xl underline" href={'/dashboard/schedule/'+s.id}>{s.title}</Link><p>{s.day} · {formatTime12(s.start_time,language)}</p><ul>{s.tasks.map(task=><li className="flex flex-wrap gap-2 py-2" key={task.id}><span>{task.name}</span><span>{task.done?t('منجزة','Done'):t('قيد الانتظار','Pending')}</span><span>{task.completed_sessions??0} {t('جلسات','sessions')}</span></li>)}</ul></article>)}
 {!!tasks.length&&<section className="v1-panel"><h2>{t('مهام المشروع','Project tasks')}</h2>{tasks.map(task=><p key={task.id}>{task.done?'✓':'○'} {task.name}</p>)}<Link href="/dashboard/workspace">{t('إدارة المهام','Manage tasks')}</Link></section>}
 </div>
}
