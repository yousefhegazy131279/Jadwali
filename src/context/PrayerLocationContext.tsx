'use client'
import {createContext,useContext,useState,useEffect,useCallback,useMemo,useRef,type ReactNode} from 'react'
import {useSupabase} from '@/lib/supabaseProvider'
import {readCache,saveCache} from '@/lib/offline'
import {geographicDate,geographicPrayerTimes,locationTimezone,validPrayerLocation,type PrayerLocation,type PrayerMethod} from '@/lib/geographicPrayers'

type Failure='denied'|'timeout'|'unavailable'|'storage'|'sync'|''
type State={profile:PrayerLocation|null;ready:boolean;busy:boolean;error:Failure;today:string;locate:()=>Promise<void>;disable:()=>Promise<void>;configure:(method:PrayerMethod,madhab:'shafi'|'hanafi')=>Promise<void>}
const Context=createContext<State|null>(null)
const KEY='prayer-location'
export function PrayerLocationProvider({children}:{children:ReactNode}){
  const {user,supabase}=useSupabase(),uid=user?.id as string|undefined
  const [record,setRecord]=useState<{uid:string;profile:PrayerLocation|null}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState<Failure>(''),[today,setToday]=useState('')
  const account=useRef(uid),current=useRef<PrayerLocation|null>(null)
  useEffect(()=>{account.current=uid},[uid])
  const profile=record?.uid===uid?record?.profile??null:null,ready=!!uid&&record?.uid===uid
  useEffect(()=>{current.current=profile},[profile])
  const store=useCallback(async(value:PrayerLocation|null,id:string)=>{await saveCache(id,KEY,value);if(account.current===id){current.current=value;setRecord({uid:id,profile:value});setError('')}},[])
  const locate=useCallback(async()=>{
    if(!uid)return;const id=uid;setBusy(true);setError('')
    try{
      if(!navigator.geolocation||!window.isSecureContext)throw {code:2}
      const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,timeout:12000,maximumAge:60000}))
      if(account.current!==id)return
      const latitude=Number(position.coords.latitude.toFixed(3)),longitude=Number(position.coords.longitude.toFixed(3)),timezone=locationTimezone(latitude,longitude),previous=current.current
      const value:PrayerLocation={latitude,longitude,timezone,method:previous?.method??'auto',madhab:previous?.madhab??'shafi',updatedAt:new Date().toISOString()}
      geographicPrayerTimes(value,geographicDate(new Date(),timezone))
      try{await store(value,id)}catch{if(account.current===id)setError('storage')}
    }catch(e){if(account.current===id){const code=typeof e==='object'&&e&&'code'in e?Number(e.code):0;setError(code===1?'denied':code===3?'timeout':'unavailable')}}finally{if(account.current===id)setBusy(false)}
  },[uid,store])
  useEffect(()=>{
    if(!uid)return;let active=true;queueMicrotask(()=>{if(active){setBusy(false);setError('')}})
    const load=async()=>{const saved=await readCache<PrayerLocation>(uid,KEY).catch(()=>null);if(!active)return;const value=validPrayerLocation(saved)?saved:null;current.current=value;setRecord({uid,profile:value});return value}
    void load().then(async value=>{if(!active||!value||!navigator.permissions)return;try{const permission=await navigator.permissions.query({name:'geolocation'});if(active&&permission.state==='granted')void locate()}catch{/* Saved coordinates remain usable if Permissions API is absent. */}})
    const cleared=()=>void load();window.addEventListener('jadwali-offline-change',cleared)
    return()=>{active=false;window.removeEventListener('jadwali-offline-change',cleared)}
  },[uid,locate])
  const timezone=profile?.timezone
  useEffect(()=>{let active=true;const update=()=>{if(active)setToday(geographicDate(new Date(),timezone||Intl.DateTimeFormat().resolvedOptions().timeZone))};queueMicrotask(update);const timer=setInterval(update,30000);return()=>{active=false;clearInterval(timer)}},[timezone])
  useEffect(()=>{
    if(!uid||!timezone)return;let active=true
    const syncTimezone=async()=>{if(!navigator.onLine)return;const result=await supabase.from('productivity_preferences').upsert({user_id:uid,timezone},{onConflict:'user_id'});if(active){if(result.error)setError('sync');else setError(previous=>previous==='sync'?'':previous)}}
    void syncTimezone();window.addEventListener('online',syncTimezone);return()=>{active=false;window.removeEventListener('online',syncTimezone)}
  },[uid,timezone,supabase])
  const disable=async()=>{if(!uid)return;setBusy(true);try{await store(null,uid)}catch{setError('storage')}finally{setBusy(false)}}
  const configure=async(method:PrayerMethod,madhab:'shafi'|'hanafi')=>{if(!uid||!profile)return;setBusy(true);try{await store({...profile,method,madhab},uid)}catch{setError('storage')}finally{setBusy(false)}}
  return <Context.Provider value={{profile,ready,busy,error,today,locate,disable,configure}}>{children}</Context.Provider>
}
export function usePrayerLocation(){const state=useContext(Context);if(!state)throw new Error('PrayerLocationProvider required');return state}
export function useAutomaticPrayers(day?:string){
  const location=usePrayerLocation(),date=day??location.today
  const computed=useMemo(()=>{if(!location.profile||!date)return {times:null,calculationError:false};try{return {times:geographicPrayerTimes(location.profile,date),calculationError:false}}catch{return {times:null,calculationError:true}}},[location.profile,date])
  return {...location,date,...computed}
}
