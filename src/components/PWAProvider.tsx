'use client'

import { useEffect,useState } from 'react'
import { toast } from 'sonner'
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>}

export default function PWAProvider() {
  const [install,setInstall]=useState<InstallEvent|null>(null)
  useEffect(()=>{const capture=(e:Event)=>{e.preventDefault();setInstall(e as InstallEvent)};window.addEventListener('beforeinstallprompt',capture);return()=>window.removeEventListener('beforeinstallprompt',capture)},[])
  useEffect(()=>{const show=async()=>{if(install){await install.prompt();await install.userChoice;setInstall(null)}else toast.info(document.documentElement.lang==='en'?'Use the browser menu → Install app / Add to home screen.':'استخدم قائمة المتصفح ← تثبيت التطبيق / إضافة إلى الشاشة الرئيسية.')};window.addEventListener('jadwali-install',show);return()=>window.removeEventListener('jadwali-install',show)},[install])
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV !== 'production') {
        // Development chunk URLs are reused; caching them causes stale hydration.
        void navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            if (registration.active?.scriptURL === location.origin + '/sw.js') void registration.unregister()
          }
        })
        void caches.keys().then(keys => Promise.all(keys.filter(key=>key.startsWith('jadwali-')).map(key=>caches.delete(key))))
        return
      }
      navigator.serviceWorker
        .register('/sw.js',{updateViaCache:'none'})
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
