'use client'

import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, isLoading } = useSupabase()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] transition-colors duration-300">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#D4AF37] border-t-transparent"></div>
    </div>
  )
}