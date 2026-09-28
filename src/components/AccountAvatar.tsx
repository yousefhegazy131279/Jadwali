'use client'

import Image from 'next/image'
import { useSupabase } from '@/lib/supabaseProvider'

export function AccountAvatar({ size = 36, className = '' }: { size?: number; className?: string }) {
  const { avatarUrl, fullName, user } = useSupabase()
  const initial = (fullName || user?.email || '?').charAt(0).toLocaleUpperCase()

  return (
    <span
      aria-label={fullName || user?.email || 'Profile'}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] font-['Cairo'] font-bold text-[#0b1a2e] ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : initial}
    </span>
  )
}
