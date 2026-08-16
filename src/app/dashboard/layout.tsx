// src/app/(dashboard)/layout.tsx
'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Footer } from '@/components/Footer'
import { NeonParticles } from '@/components/NeonParticles'
// ❌ حذف الـ FloatingTimer
import { TimerProvider } from '@/context/TimerContext'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      mirror: true,
    })

    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar-collapsed')
      setIsCollapsed(saved === 'true')
    }

    const saved = localStorage.getItem('sidebar-collapsed')
    setIsCollapsed(saved === 'true')
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return (
    <TimerProvider>
      <div className="relative min-h-screen bg-[var(--bg-primary)]">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <NeonParticles />
          <div className="absolute top-10 left-10 w-80 h-80 rounded-full bg-[#D4AF37]/5 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/5 blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '0.5s' }} />
        </div>

        <Sidebar />

        <main
          className="relative z-10 min-h-screen transition-all duration-300"
          style={{ marginRight: isCollapsed ? '80px' : '256px' }}
        >
          <div className="p-6 pb-24">
            {children}
          </div>
          <Footer />
        </main>

        {/* ❌ تم حذف <FloatingTimer /> */}
      </div>
    </TimerProvider>
  )
}