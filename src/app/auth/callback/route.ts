import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)

  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=no_code', request.url)
    )
  }

  try {
    const supabase = await createClient()

    const { error } =
      await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('CALLBACK ERROR:', error)

      return NextResponse.redirect(
        new URL(
          '/auth/login?error=confirmation_failed',
          request.url
        )
      )
    }

    console.log('CALLBACK SUCCESS')

    return NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
  } catch (error) {
    console.error('CALLBACK UNEXPECTED ERROR:', error)

    return NextResponse.redirect(
      new URL('/auth/login?error=unexpected', request.url)
    )
  }
}