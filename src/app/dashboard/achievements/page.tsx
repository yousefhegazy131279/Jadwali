'use client'
import {useState} from 'react'
import {Trophy,LockKeyhole} from 'lucide-react'
import {useLanguage} from '@/context/LanguageContext'
import {useProductivity} from '@/context/ProductivityContext'
import {FeaturePage,Panel,Alert,Busy} from '@/components/v2/FeatureUI'
import {achievementProgress} from '@/lib/productivity'
export default function AchievementsPage(){
 const {t,language}=useLanguage(),{summary,catalog,earned,error,refresh}=useProductivity();const [filter,setFilter]=useState('all');const unlocked=new Map(earned.map(x=>[x.achievement_id,x]))
 return <FeaturePage title={t('إنجازات تستحق أن تراها','Progress worth seeing')} description={t('أربعة عشر إنجازًا، تُفتح تلقائيًا من جلساتك ومهامك المحفوظة.','Fourteen achievements, unlocked from your saved sessions and tasks.')}>
 {error&&<Alert message={error} retry={()=>void refresh()}/>}<Panel><span className="v2-stat">{earned.length} / 14</span><p>{t('إنجازات مفتوحة','Achievements unlocked')}</p><div className="v2-actions">{[['all',t('الكل','All')],['sessions',t('الجلسات','Sessions')],['minutes',t('الساعات','Hours')],['streak',t('السلسلة','Streak')],['tasks',t('المهام','Tasks')]].map(([key,label])=><button className={'v2-button '+(filter===key?'':'secondary')} aria-pressed={filter===key} onClick={()=>setFilter(key)} key={key}>{label}</button>)}</div></Panel>
 {!summary&&!error?<Busy/>:<div className="v2-grid">{catalog.filter(a=>filter==='all'||a.metric===filter).map(a=>{const item=unlocked.get(a.id),progress=summary?achievementProgress(a,summary):0;return <Panel key={a.id} className={item?'':'v2-locked'}>{item?<Trophy color="#d4af37"/>:<LockKeyhole/>}<h2>{language==='ar'?a.title_ar:a.title_en}</h2><p className="v2-muted">{a.metric==='minutes'?`${a.threshold/60} ${t('ساعة تركيز','focus hours')}`:`${a.threshold} ${a.metric==='streak'?t('يوم متواصل','consecutive days'):a.metric==='sessions'?t('جلسة','sessions'):t('مهمة مكتملة','completed tasks')}`}</p><div className="v2-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={language==='ar'?a.title_ar:a.title_en}><span style={{width:`${item?100:progress}%`}}/></div><p className="v2-hint">{item?`${t('مفتوح منذ','Unlocked')} ${new Date(item.unlocked_at).toLocaleDateString(language==='ar'?'ar-EG':'en-US')}`:`${Math.round(progress)}%`}</p></Panel>})}</div>}
 </FeaturePage>
}
