'use client'
import { useEffect,useState,useCallback,useRef, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, X, RefreshCw, StickyNote, LayoutTemplate, Target, Headphones, Trophy, FileBarChart, CloudCheck, Sparkles, ChevronLeft } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { errorText } from '@/lib/productivity'

const sections = {
 notes: {icon:StickyNote,ar:'الملاحظات',en:'Notes'},
 templates: {icon:LayoutTemplate,ar:'القوالب',en:'Templates'},
 challenges: {icon:Target,ar:'التحديات',en:'Challenges'},
 rooms: {icon:Headphones,ar:'تركيز مع الأصدقاء',en:'Focus rooms'},
 achievements: {icon:Trophy,ar:'الإنجازات',en:'Achievements'},
 reports: {icon:FileBarChart,ar:'التقارير الأسبوعية',en:'Weekly reports'},
 offline: {icon:CloudCheck,ar:'المزامنة والعمل دون اتصال',en:'Offline and sync'},
}
function useSection(){const path=usePathname();return sections[path.split('/')[2] as keyof typeof sections]||{icon:Sparkles,ar:'مساحة العمل',en:'Workspace'}}
export function FeaturePage({title,description,children,actions}:{title:string;description:string;children:ReactNode;actions?:ReactNode}){
 const {t}=useLanguage(),section=useSection(),Icon=section.icon
 return <div className="v2-shell v2-page"><header className="v2-hero"><div className="v2-breadcrumb"><Link href="/dashboard">{t('لوحة التحكم','Dashboard')}</Link><ChevronLeft size={13} aria-hidden="true"/><span>{t(section.ar,section.en)}</span></div><div className="v2-hero-row"><div className="v2-hero-copy"><span className="v2-eyebrow"><Icon size={14} aria-hidden="true"/>{t(section.ar,section.en)}</span><h1>{title}</h1><p>{description}</p></div><span className="v2-hero-icon" aria-hidden="true"><Icon strokeWidth={1.25}/></span></div>{actions&&<div className="v2-actions v2-hero-actions">{actions}</div>}</header>{children}</div>
}
export function Panel({children,className=''}:{children:ReactNode;className?:string}){return <section className={`v2-card ${className}`}>{children}</section>}
export function Empty({children}:{children:ReactNode}){const {icon:Icon}=useSection();return <Panel className="v2-empty"><span className="v2-empty-icon" aria-hidden="true"><Icon size={30} strokeWidth={1.5}/></span><div>{children}</div></Panel>}
export function Busy(){const {t}=useLanguage();return <div className="v2-loading" role="status"><Loader2 className="animate-spin" aria-hidden="true"/><span>{t('جارٍ تحميل مساحتك…','Loading your space…')}</span></div>}
export function Alert({message,retry}:{message:string;retry?:()=>void}){const {t}=useLanguage();return <div role="alert" className="v2-alert"><p>{message}</p>{retry&&<button className="v2-button secondary" onClick={retry}><RefreshCw size={16}/>{t('إعادة المحاولة','Retry')}</button>}</div>}
export function FeatureLink({href,children}:{href:string;children:ReactNode}){return <Link className="v2-button secondary" href={href}>{children}</Link>}
export function Modal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){
 const {t}=useLanguage()
 return <Dialog.Root open={open} onOpenChange={v=>{if(!v)onClose()}}><Dialog.Portal><Dialog.Overlay className="v2-overlay"/><Dialog.Content className="v2-modal"><div className="v2-modal-head"><Dialog.Title>{title}</Dialog.Title><Dialog.Close aria-label={t('إغلاق','Close')}><X/></Dialog.Close></div><Dialog.Description className="sr-only">{title}</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function useFeatureData<T>(load:()=>Promise<T>,enabled=true){
 const {language}=useLanguage();const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(enabled),[error,setError]=useState('')
 const request=useRef({id:0})
 const refresh=useCallback(async()=>{if(!enabled)return;const current=++request.current.id;setLoading(true);setError('');try{const value=await load();if(current===request.current.id)setData(value)}catch(e){if(current===request.current.id)setError(errorText(e,language==='ar'))}finally{if(current===request.current.id)setLoading(false)}},[load,enabled,language])
 useEffect(()=>{const requests=request.current;let active=true;queueMicrotask(()=>{if(active){setData(null);void refresh()}});return()=>{active=false;requests.id++}},[refresh]);return {data,setData,loading,error,refresh}
}
