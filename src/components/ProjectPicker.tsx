'use client'
import { useEffect,useState } from 'react'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
export default function ProjectPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
  const {user,supabase}=useSupabase();const {t}=useLanguage()
  const [projects,setProjects]=useState<{id:string;name:string}[]>([]);const [name,setName]=useState('');const [creating,setCreating]=useState(false);const [busy,setBusy]=useState(false)
  useEffect(()=>{if(user)void supabase.from('projects').select('id,name').eq('user_id',user.id).then(({data,error})=>{if(error)toast.error(t('تعذر تحميل المشاريع','Could not load projects'));else setProjects(data??[])})},[user?.id,supabase,t])
  const create=async()=>{if(!name.trim()||!user)return;setBusy(true);const {data,error}=await supabase.from('projects').insert({user_id:user.id,name:name.trim(),color:'#D4AF37'}).select('id,name').single();setBusy(false);if(error){toast.error(t('تعذر إنشاء المشروع','Could not create project'));return}setProjects([...projects,data]);onChange(data.id);setCreating(false);setName('')}
  return <section className="v1-panel space-y-3"><label>{t('إضافة إلى مشروع','Add to a project')}<select className="v1-input w-full" value={value} onChange={e=>onChange(e.target.value)}><option value="">{t('بدون مشروع','No project')}</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><button type="button" className="v1-button" onClick={()=>setCreating(!creating)}>{t('إنشاء مشروع جديد','Create a project')}</button>{creating&&<div className="flex flex-wrap gap-2"><input className="v1-input" maxLength={100} value={name} onChange={e=>setName(e.target.value)} aria-label={t('اسم المشروع','Project name')}/><button type="button" disabled={busy||!name.trim()} className="v1-button" onClick={create}>{t('إنشاء','Create')}</button></div>}</section>
}
