// src/app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // 1. الحصول على معاملات الـ URL
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // 2. إذا لم يوجد كود، ارجع إلى تسجيل الدخول
  if (!code) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // ✅ 3. استخدام await مع cookies()
  const cookieStore = await cookies()

  // 4. إنشاء عميل Supabase مع الـ Cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 5. تبادل الكود للحصول على جلسة
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      new URL('/auth/login?error=confirmation_failed', request.url)
    )
  }

  // 6. ✅ نجاح التأكيد، توجيه إلى لوحة التحكم
  return NextResponse.redirect(new URL('/dashboard', request.url))
}