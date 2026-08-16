import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },

      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        supabaseResponse = NextResponse.next({
          request,
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })

        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  /*
   * مهم جدًا:
   * لا تضع أي كود بين createServerClient
   * و getClaims().
   */

  const { data: claims, error } = await supabase.auth.getClaims()

  if (error) {
    console.error('Supabase getClaims error:', error)
  }
  
  const isAuthenticated = !!claims
  
  const pathname = request.nextUrl.pathname
  
  const isAuthPage =
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/signup')
  
  const isCallback = pathname.startsWith('/auth/callback')
  
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/notes') ||
    pathname.startsWith('/settings')
  
  if (isCallback) {
    return supabaseResponse
  }
  
  if (isProtectedPage && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.search = ''
  
    return NextResponse.redirect(loginUrl)
  }
  
  if (isAuthPage && isAuthenticated) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
  
    return NextResponse.redirect(dashboardUrl)
  }
  
  return supabaseResponse

  /*
   * مستخدم غير مسجل ويحاول دخول صفحة محمية
   */
  if (isProtectedPage && !claims) {
    const loginUrl = request.nextUrl.clone()

    loginUrl.pathname = '/auth/login'
    loginUrl.search = ''

    return NextResponse.redirect(loginUrl)
  }

  /*
   * مستخدم مسجل ويحاول فتح Login/Signup
   */
  if (isAuthPage && claims) {
    const dashboardUrl = request.nextUrl.clone()

    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''

    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}