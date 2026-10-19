'use client'
import {createContext,useContext,useState,useEffect,useCallback,useRef,type ReactNode} from 'react'
import {useSupabase} from '@/lib/supabaseProvider'
import {useLanguage} from '@/context/LanguageContext'
import {type Achievement,type Earned,type Productivity,errorText} from '@/lib/productivity'
import {pendingWrites,removePending,enqueue,setOfflineAccount,readCache,saveCache} from '@/lib/offline'
import {Modal} from '@/components/v2/FeatureUI'
import {Trophy,Share2} from 'lucide-react'
import {playSessionSound} from '@/lib/sessionSound'
import {toast} from 'sonner'

type State={summary:Productivity|null;catalog:Achievement[];earned:Earned[];refresh:()=>Promise<void>;error:string;online:boolean;pending:number;sync:()=>Promise<void>}
const Context=createContext<State|null>(null)
export function ProductivityProvider({children}:{children:ReactNode}){
 const {user,supabase}=useSupabase();const {t,language}=useLanguage()
 const [summary,setSummary]=useState<Productivity|null>(null),[catalog,setCatalog]=useState<Achievement[]>([]),[earned,setEarned]=useState<Earned[]>([]),[error,setError]=useState(''),[online,setOnline]=useState(true),[pending,setPending]=useState(0),[celebrating,setCelebrating]=useState<string|null>(null)
 const syncing=useRef(false),account=useRef<string|null>(null);useEffect(()=>{account.current=user?.id??null},[user?.id])
 const refresh=useCallback(async()=>{
  if(!user)return;const id=user.id;setError('')
  if(!navigator.onLine){const cached=await readCache<{summary:Productivity;catalog:Achievement[];earned:Earned[]}>(id,'productivity').catch(()=>null);if(account.current===id&&cached){setSummary(cached.summary);setCatalog(cached.catalog);setEarned(cached.earned)}else if(account.current===id)setError(language==='ar'?'لا توجد نسخة محفوظة لهذه البيانات على هذا الجهاز بعد.':'These records have not been saved on this device yet.');return}
  const [a,b,c]=await Promise.all([supabase.rpc('refresh_productivity'),supabase.from('achievements').select('*').order('position'),supabase.from('user_achievements').select('*').eq('user_id',id)])
  if(account.current!==id)return
  const err=a.error||b.error||c.error;if(err){setError(errorText(err,language==='ar'));return}
  setSummary(a.data as Productivity);setCatalog(b.data as Achievement[]);setEarned(c.data as Earned[])
  void saveCache(id,'productivity',{summary:a.data,catalog:b.data,earned:c.data}).catch(()=>{})
  const unshown=(c.data as Earned[]).find(x=>!x.celebrated_at);if(unshown)setCelebrating(unshown.achievement_id)
 },[user,supabase,language])
 const sync=useCallback(async()=>{
  if(!user||!navigator.onLine||syncing.current)return;syncing.current=true;const id=user.id
  try{
   const auth=await supabase.auth.getUser();if(auth.error||auth.data.user?.id!==id)return
   const queued=await pendingWrites(id)
   for(const write of queued){
    if(account.current!==id)break
    let result:{error:unknown;data?:unknown}
    if(write.kind==='session')result=await supabase.rpc('record_work_session',write.payload)
    else if(write.kind==='note-delete')result=await supabase.rpc('delete_note',{p_id:write.payload.id,p_expected_version:write.payload.version,p_request_id:write.payload.requestId})
    else {
     const {version,isNew,requestId,...payload}=write.payload
     result=await supabase.rpc('save_note',{p_note:payload,p_expected_version:isNew?0:version,p_request_id:requestId})
    }
    if(result.error||Array.isArray(result.data)&&!result.data.length){await enqueue({...write,error:t('تعارض أو رفض في الحفظ. راجع النسخة المحلية قبل إعادة المحاولة.','A conflict or access error occurred. Review your local copy before retrying.')});if(write.kind==='session')break;else continue}
    await removePending(write.id)
   }
   setPending((await pendingWrites(id)).length);window.dispatchEvent(new Event('jadwali-synced'));await refresh()
  }catch{toast.error(t('تعذرت المزامنة؛ بقيت البيانات محفوظة على الجهاز.','Sync failed; your data remains saved on this device.'))}finally{syncing.current=false}
 },[user,supabase,refresh,t])
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(!active)return;setSummary(null);setCatalog([]);setEarned([]);setCelebrating(null);setOfflineAccount(user?.id??null);void refresh();void sync()});return()=>{active=false}},[user?.id,refresh,sync])
 useEffect(()=>{
  const changed=()=>{setOnline(navigator.onLine);if(user)void pendingWrites(user.id).then(x=>setPending(x.length)).catch(()=>{});if(navigator.onLine)void sync()}
  const progress=()=>{void refresh()};changed();window.addEventListener('online',changed);window.addEventListener('offline',changed);window.addEventListener('jadwali-offline-change',changed);window.addEventListener('jadwali-progress',progress);window.addEventListener('focus',progress)
  return()=>{window.removeEventListener('online',changed);window.removeEventListener('offline',changed);window.removeEventListener('jadwali-offline-change',changed);window.removeEventListener('jadwali-progress',progress);window.removeEventListener('focus',progress)}
 },[user,refresh,sync])
 const award=catalog.find(x=>x.id===celebrating)
 const dismiss=async()=>{if(!user||!celebrating)return;const id=celebrating;const result=await supabase.from('user_achievements').update({celebrated_at:new Date().toISOString()}).eq('user_id',user.id).eq('achievement_id',id);setCelebrating(null);if(!result.error)setEarned(previous=>previous.map(x=>x.achievement_id===id?{...x,celebrated_at:new Date().toISOString()}:x))}
 const share=async()=>{
  if(!award)return
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#0c192a';ctx.fillRect(0,0,1200,630);ctx.strokeStyle='#d4af37';ctx.lineWidth=4;ctx.strokeRect(30,30,1140,570);ctx.textAlign='center';ctx.fillStyle='#d4af37';ctx.font='bold 48px Cairo, sans-serif';ctx.fillText(t('إنجاز جديد في جَدْوَلِي','New Jadwali achievement'),600,200);ctx.fillStyle='#fff';ctx.font='bold 60px Cairo, sans-serif';ctx.fillText(language==='ar'?award.title_ar:award.title_en,600,330);ctx.font='24px sans-serif';ctx.fillStyle='#a6b4c8';ctx.fillText('jadwaly-hgz.vercel.app',600,470)
  const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/png'));if(!blob)return
  const file=new File([blob],'jadwali-achievement.png',{type:'image/png'})
  try{if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file]});else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}catch{/* Closing the share sheet changes nothing. */}
 }
 return <Context.Provider value={{summary,catalog,earned,refresh,error,online,pending,sync}}>{children}<Modal open={!!award} onClose={()=>{void dismiss()}} title={t('إنجاز جديد!','Achievement unlocked!')}><div className="v2-celebrate"><Trophy/><h2>{award&&(language==='ar'?award.title_ar:award.title_en)}</h2><p className="v2-muted">{t('خطوة حقيقية تستحق الاحتفال. واصل بالوتيرة المناسبة لك.','A real step worth celebrating. Keep a pace that works for you.')}</p><div className="v2-actions"><button className="v2-button" onClick={()=>{void share()}}><Share2 size={16}/>{t('مشاركة كصورة','Share image')}</button><button className="v2-button secondary" onClick={()=>playSessionSound()}>{t('صوت الاحتفال','Celebration sound')}</button><button className="v2-button secondary" onClick={()=>{void dismiss()}}>{t('متابعة','Continue')}</button></div></div></Modal>{award&&<div className="v2-confetti" aria-hidden>{Array.from({length:32},(_,i)=><i key={i} style={{left:`${i*3.1}%`,background:['#d4af37','#60a5fa','#34d399','#a78bfa'][i%4],animationDelay:`${i%7*.13}s`}}/>)}</div>}</Context.Provider>
}
export function useProductivity(){const value=useContext(Context);if(!value)throw new Error('ProductivityProvider required');return value}

