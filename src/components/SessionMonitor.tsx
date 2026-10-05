'use client'

// ============================================================
//  SessionMonitor.tsx
//  مراقبة تلقائية لجلسة Supabase — تُصلح الجلسات التالفة بدون تدخل المستخدم
// ============================================================

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function SessionMonitor() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()

    // ✅ 1. مراقبة تغييرات الجلسة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // عند تسجيل الخروج
        if (event === 'SIGNED_OUT') {
          if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
            router.push('/auth/login')
          }
        }

        // عند تجديد التوكن
        if (event === 'TOKEN_REFRESHED') {
          console.log('✅ [auth] Token refreshed')
        }
      }
    )

    // ✅ 2. فحص أولي عند mount
    const initialCheck = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // لا توجد جلسة — لا تفعل شيئاً هنا (الميدل وير يتعامل مع هذا)
        return
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0

      // إذا انتهت الجلسة
      if (expiresAt < Date.now()) {
        console.warn('[auth] Session expired on mount — refreshing…')
        const { data: { session: refreshed }, error } = await supabase.auth.refreshSession()

        if (error || !refreshed) {
          console.warn('[auth] Refresh failed — signing out')
          await supabase.auth.signOut().catch(() => {})

          if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
            toast.error('انتهت جلستك — الرجاء تسجيل الدخول مرة أخرى', {
              duration: 4000,
            })
            router.push('/auth/login')
          }
        } else {
          console.log('✅ [auth] Session refreshed on mount')
        }
      }
    }

    void initialCheck()

    // ✅ 3. فحص دوري كل 5 دقائق
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
          router.push('/auth/login')
        }
        return
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0

      // إذا انتهت الجلسة أو على وشك الانتهاء (خلال 60 ثانية)
      if (expiresAt < Date.now() + 60_000) {
        console.log('[auth] Session near expiry — refreshing…')
        const { data: { session: refreshed }, error } = await supabase.auth.refreshSession()

        if (error || !refreshed) {
          console.warn('[auth] Periodic refresh failed — signing out')
          await supabase.auth.signOut().catch(() => {})

          if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
            toast.error('انتهت جلستك — الرجاء تسجيل الدخول مرة أخرى', {
              duration: 4000,
            })
            router.push('/auth/login')
          }
        }
      }
    }, 5 * 60 * 1000) // كل 5 دقائق

    // ✅ 4. التنظيف
    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [router, pathname])

  // لا يعرض أي شيء
  return null
}