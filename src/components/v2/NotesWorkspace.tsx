'use client'
import {useState,useCallback,useEffect,useRef,type FormEvent} from 'react'
import Link from 'next/link'
import {Plus,Pin,Trash2,Edit3} from 'lucide-react'
import {toast} from 'sonner'
import {useLanguage} from '@/context/LanguageContext'
import {useSupabase} from '@/lib/supabaseProvider'
import {useProductivity} from '@/context/ProductivityContext'
import {FeaturePage,Panel,Modal,Alert,Busy,Empty,useFeatureData} from './FeatureUI'
import {NOTE_COLORS,type Note,type NoteColor,errorText} from '@/lib/productivity'
import {enqueue,readCache,saveCache,pendingWrites,removePending} from '@/lib/offline'
type LinkRow={id:string;title:string}
export default function NotesWorkspace(){
 const {t,language}=useLanguage();const {user,supabase}=useSupabase();const {online,sync}=useProductivity()
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[editing,setEditing]=useState<Note|null>(null),[deleting,setDeleting]=useState<Note|null>(null),[saving,setSaving]=useState(false),[color,setColor]=useState<NoteColor>('gold'),[projects,setProjects]=useState<LinkRow[]>([]),[schedules,setSchedules]=useState<LinkRow[]>([])
 const saveRequests=useRef(new Map<string,string>())
 const load=useCallback(async()=>{
  if(!user)return [] as Note[]
  let rows:Note[]
  if(navigator.onLine){const r=await supabase.from('notes').select('*').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(500);if(r.error)throw r.error;rows=r.data as Note[]}
  else rows=await readCache<Note[]>(user.id,'notes')||[]
  for(const q of await pendingWrites(user.id).catch(()=>[]))if(q.kind.startsWith('note-')){rows=rows.filter(x=>x.id!==q.payload.id);if(q.kind==='note-save')rows.unshift({...q.payload,updated_at:new Date(q.created).toISOString()} as Note)}
  await saveCache(user.id,'notes',rows).catch(()=>{});return rows
 },[user,supabase])
 const {data:notes,setData,loading,error,refresh}=useFeatureData(load,!!user)
 useEffect(()=>{if(!user)return;void Promise.all([supabase.from('projects').select('id,title:name').eq('user_id',user.id),supabase.from('schedules').select('id,title').eq('user_id',user.id)]).then(([p,s])=>{setProjects(p.data||[]);setSchedules(s.data||[])});const done=()=>{void refresh()};window.addEventListener('jadwali-synced',done);return()=>window.removeEventListener('jadwali-synced',done)},[user,supabase,refresh])
 const begin=(note?:Note)=>{if(!user)return;setEditing(note||{id:crypto.randomUUID(),user_id:user.id,title:'',content:'',color:'gold',pinned:false,project_id:null,schedule_id:null,version:1,updated_at:new Date().toISOString(),created_at:new Date().toISOString()});setColor(note?.color||'gold')}
 async function persist(note:Note){
  if(!user)return;setSaving(true)
  try{
   const prior=(await pendingWrites(user.id).catch(()=>[])).find(x=>x.id==='note:'+note.id)
   const isNew=prior?.payload.isNew===true||!(notes||[]).some(x=>x.id===note.id)
   const fields={id:note.id,user_id:user.id,title:note.title,content:note.content,color:note.color,pinned:note.pinned,project_id:note.project_id,schedule_id:note.schedule_id}
   const fingerprint=JSON.stringify({...fields,version:note.version});let requestId=saveRequests.current.get(fingerprint);if(!requestId){requestId=crypto.randomUUID();saveRequests.current.set(fingerprint,requestId)}
   if(!navigator.onLine||prior){await enqueue({id:'note:'+note.id,userId:user.id,kind:'note-save',payload:{...fields,version:prior?.payload.version||note.version,isNew,requestId},created:prior?.created||new Date().getTime()});if(navigator.onLine)void sync()}
   else{const r=await supabase.rpc('save_note',{p_note:fields,p_expected_version:isNew?0:note.version,p_request_id:requestId});if(r.error)throw r.error;if(!r.data){toast.error(t('تغيرت الملاحظة على جهاز آخر. احتفظ بنصك وحدّث القائمة قبل الحفظ.','This note changed on another device. Keep your text and refresh before saving.'));return}}
   const rows=[note,...(notes||[]).filter(x=>x.id!==note.id)];await saveCache(user.id,'notes',rows);setData(rows);setEditing(null);toast.success(navigator.onLine?t('تم حفظ الملاحظة','Note saved'):t('محفوظة على الجهاز للمزامنة عند الاتصال','Saved on this device for sync'));if(navigator.onLine)await refresh()
  }catch(e){toast.error(errorText(e,language==='ar'))}finally{setSaving(false)}
 }
 async function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;const d=new FormData(event.currentTarget);await persist({...editing,title:String(d.get('title')).trim(),content:String(d.get('content')).trim(),color,project_id:String(d.get('project'))||null,schedule_id:String(d.get('schedule'))||null})}
 async function remove(){if(!deleting||!user)return;setSaving(true);try{
  const prior=(await pendingWrites(user.id)).find(x=>x.id==='note:'+deleting.id)
  if(prior?.payload.isNew)await removePending(prior.id)
  else if(!navigator.onLine||prior)await enqueue({id:'note:'+deleting.id,userId:user.id,kind:'note-delete',payload:{id:deleting.id,version:prior?.payload.version||deleting.version,requestId:crypto.randomUUID()},created:new Date().getTime()})
  else{const key='delete:'+deleting.id+':'+deleting.version;let requestId=saveRequests.current.get(key);if(!requestId){requestId=crypto.randomUUID();saveRequests.current.set(key,requestId)}const r=await supabase.rpc('delete_note',{p_id:deleting.id,p_expected_version:deleting.version,p_request_id:requestId});if(r.error)throw r.error}
  const rows=(notes||[]).filter(x=>x.id!==deleting.id);setData(rows);await saveCache(user.id,'notes',rows);setDeleting(null);if(navigator.onLine)void sync()
 }catch(e){toast.error(errorText(e,language==='ar'))}finally{setSaving(false)}}
 const rows=(notes||[]).filter(n=>(!search||(n.title+' '+n.content).toLowerCase().includes(search.toLowerCase()))&&(filter==='all'||filter==='pinned'&&n.pinned||filter==='linked'&&(n.project_id||n.schedule_id))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated_at.localeCompare(a.updated_at))
 return <FeaturePage title={t('ملاحظاتك، قريبة من خطتك','Notes, close to your plan')} description={t('تسعة ألوان، تثبيت، وربط بالمشاريع والجداول. يمكنك الكتابة دون اتصال.','Nine colors, pins and links to projects or schedules. Write even offline.')} actions={<button className="v2-button" disabled={!user} onClick={()=>begin()}><Plus size={18}/>{t('ملاحظة جديدة','New note')}</button>}>
 <div className="v2-grid">{[[t('الملاحظات','Notes'),notes?.length||0],[t('المثبتة','Pinned'),notes?.filter(x=>x.pinned).length||0],[t('المرتبطة','Linked'),notes?.filter(x=>x.project_id||x.schedule_id).length||0]].map(([label,value])=><Panel key={label}><span className="v2-stat">{value}</span>{label}</Panel>)}</div>
 <Panel><div className="v2-actions"><input aria-label={t('البحث في الملاحظات','Search notes')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('ابحث في العنوان والمحتوى…','Search title and content…')}/><select aria-label={t('تصفية الملاحظات','Filter notes')} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t('الكل','All')}</option><option value="pinned">{t('المثبتة','Pinned')}</option><option value="linked">{t('المرتبطة','Linked')}</option></select></div></Panel>
 {!online&&<p className="v2-hint">{t('تعمل على نسخة هذا الجهاز. احفظ نصك قبل إغلاق المتصفح.','You are using your device copy. Save before closing the browser.')}</p>}
 {error&&<Alert message={error} retry={()=>void refresh()}/>}{loading?<Busy/>:rows.length?<div className="v2-grid">{rows.map(note=><Panel key={note.id} className="v2-note"><div style={{borderTop:`3px solid ${NOTE_COLORS[note.color]||NOTE_COLORS.gold}`,paddingTop:12}}><div className="v2-actions" style={{marginTop:0}}><h2 style={{flex:1}}>{note.title||t('ملاحظة','Note')}</h2><button className="v2-button secondary" disabled={saving} aria-label={note.pinned?t('إلغاء التثبيت','Unpin'):t('تثبيت','Pin')} onClick={()=>void persist({...note,pinned:!note.pinned})}><Pin size={16} fill={note.pinned?'currentColor':'none'}/></button></div><pre>{note.content}</pre><p className="v2-hint">{new Date(note.updated_at).toLocaleDateString(language==='ar'?'ar-EG':'en-US')}</p><div className="v2-actions">{note.project_id&&<Link className="v2-button secondary" href={'/dashboard/projects/'+note.project_id}>{t('المشروع','Project')}</Link>}{note.schedule_id&&<Link className="v2-button secondary" href={'/dashboard/schedule/'+note.schedule_id}>{t('الجدول','Schedule')}</Link>}<button className="v2-button secondary" onClick={()=>begin(note)}><Edit3 size={16}/>{t('تعديل','Edit')}</button><button className="v2-button danger" onClick={()=>setDeleting(note)}><Trash2 size={16}/>{t('حذف','Delete')}</button></div></div></Panel>)}</div>:!error&&<Empty>{t('لا توجد ملاحظات تطابق البحث. اكتب أول فكرة لك.','No matching notes. Capture your first idea.')}</Empty>}
 <Modal open={!!editing} onClose={()=>{if(!saving)setEditing(null)}} title={t('تحرير الملاحظة','Edit note')}>{editing&&<form className="v2-form" onSubmit={save} key={editing.id}><label>{t('العنوان','Title')}<input name="title" defaultValue={editing.title} maxLength={150}/></label><label>{t('المحتوى','Content')}<textarea name="content" defaultValue={editing.content} required maxLength={20000}/></label><div className="v2-colors" role="radiogroup" aria-label={t('اللون','Color')}>{Object.entries(NOTE_COLORS).map(([name,value])=><button key={name} type="button" role="radio" aria-checked={color===name} aria-label={name} style={{background:value}} onClick={()=>setColor(name as NoteColor)}/>)}</div><label>{t('المشروع','Project')}<select name="project" defaultValue={editing.project_id||''}><option value="">{t('بدون مشروع','No project')}</option>{projects.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><label>{t('الجدول','Schedule')}<select name="schedule" defaultValue={editing.schedule_id||''}><option value="">{t('بدون جدول','No schedule')}</option>{schedules.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label><button className="v2-button" disabled={saving}>{saving?t('جارٍ الحفظ…','Saving…'):t('حفظ الملاحظة','Save note')}</button></form>}</Modal>
 <Modal open={!!deleting} onClose={()=>{if(!saving)setDeleting(null)}} title={t('حذف الملاحظة؟','Delete note?')}><p>{t('سيُحذف محتوى هذه الملاحظة فقط.','Only this note will be deleted.')}</p><button className="v2-button danger" disabled={saving} onClick={()=>void remove()}>{t('تأكيد الحذف','Confirm deletion')}</button></Modal>
 </FeaturePage>
}
