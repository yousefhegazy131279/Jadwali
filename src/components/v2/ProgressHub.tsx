'use client'
import Link from 'next/link'
import {Flame,Trophy,BookOpen} from 'lucide-react'
import {useLanguage} from '@/context/LanguageContext'
import {useProductivity} from '@/context/ProductivityContext'
export default function ProgressHub(){
 const {t}=useLanguage(),{summary,earned,error,refresh}=useProductivity();const adhkar='https://anamuslim-hgz.vercel.app'
 return <div className="v2-shell" style={{padding:0}}><div className="v2-grid"><section className="v2-card"><Flame color="#fb923c"/><h2>{t('سلسلة الإنجاز','Your streak')}</h2><span className="v2-stat">{summary?.current_streak??'—'} {t('يوم','days')}</span><p className="v2-hint">{t('الأطول','Best')}: {summary?.longest_streak??'—'} · {summary?.timezone||''}</p>{summary?.current_streak===0&&<p>{t('ابدأ جلسة اليوم لبناء عادة جديدة.','Start a session today to build your habit.')}</p>}{error&&<button className="v2-button secondary" onClick={()=>void refresh()}>{t('تحديث حالة الإنجاز','Refresh progress')}</button>}</section><section className="v2-card"><Trophy color="#d4af37"/><h2>{t('كل خطوة محسوبة','Every step counts')}</h2><span className="v2-stat">{earned.length} / 14</span><Link className="v2-button secondary" href="/dashboard/achievements">{t('عرض الإنجازات','View achievements')}</Link></section><section className="v2-card"><BookOpen color="#34d399"/><h2>{t('وقفة ذكر','A moment of remembrance')}</h2><p>{t('سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ','Glory and praise be to Allah; glory be to Allah, the Almighty.')}</p>{adhkar&&/^https:\/\//.test(adhkar)&&<a className="v2-button secondary" href={adhkar} target="_blank" rel="noopener noreferrer">{t('موقع الأذكار','Adhkar website')}</a>}</section></div></div>
}
