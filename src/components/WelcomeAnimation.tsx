'use client'
import dynamic from 'next/dynamic'
import { useEffect,useState } from 'react'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { useTour } from '@/context/TourContext'
const Lottie=dynamic(()=>import('lottie-react').then(m=>m.LottieLight),{ssr:false})
const animation={v:'5.7.4',fr:30,ip:0,op:90,w:200,h:140,nm:'Focus cycle',ddd:0,assets:[],layers:[{ddd:0,ind:1,ty:4,nm:'Focus ring',sr:1,ks:{o:{a:0,k:100},r:{a:1,k:[{t:0,s:[0],e:[360]},{t:90,s:[360]}]},p:{a:0,k:[100,70,0]},a:{a:0,k:[0,0,0]},s:{a:0,k:[100,100,100]}},shapes:[{ty:'el',p:{a:0,k:[0,0]},s:{a:0,k:[90,90]},nm:'Ring'},{ty:'st',c:{a:0,k:[0.83,0.69,0.22,1]},o:{a:0,k:100},w:{a:0,k:8},lc:2,lj:2},{ty:'tm',s:{a:0,k:0},e:{a:0,k:75},o:{a:0,k:0},m:1}],ip:0,op:90,st:0,bm:0}]}
export default function WelcomeAnimation(){
  const {user}=useSupabase();const {t}=useLanguage();const {startTour}=useTour();const [show,setShow]=useState(false)
  useEffect(()=>{if(!user)return;const load=()=>setShow(localStorage.getItem('jadwali-welcome:'+user.id)==='true');load();window.addEventListener('jadwali-onboarded',load);return()=>window.removeEventListener('jadwali-onboarded',load)},[user?.id])
  if(!show)return null
  return <section className="v1-panel flex flex-wrap items-center gap-4"><div className="w-32 motion-reduce:hidden"><Lottie src={animation} autoplay loop className="h-28"/></div><div><h2>{t('خطط، ركّز، أنجز','Plan, focus, achieve')}</h2><p>{t('ابدأ بمهمة واحدة، ثم اتبع جلسات العمل والراحة.','Start with one task, then follow focus sessions and breaks.')}</p><button className="v1-button" onClick={startTour}>{t('افتح الدليل التفاعلي','Open interactive guide')}</button><button className="v1-button" onClick={()=>{localStorage.removeItem('jadwali-welcome:'+user.id);setShow(false)}}>{t('إغلاق','Dismiss')}</button></div></section>
}
