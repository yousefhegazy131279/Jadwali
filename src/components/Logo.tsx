'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import Image from 'next/image'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  const { t: tr, language } = useLanguage()

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Image
        src="/logo.png"
        alt={tr("شعار جَدْوَلِي")}
        sizes="160px"
        fill
        className="object-contain"
        priority
      />
    </div>
  )
}