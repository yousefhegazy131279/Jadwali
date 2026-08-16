// src/components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/supabaseProvider'
import { useTheme } from '@/context/ThemeContext'
import { motion } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FolderOpen,
  Settings,
  LogOut,
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/dashboard/planner', icon: Calendar, label: 'المخطط' },
  { href: '/dashboard/schedule', icon: Clock, label: 'الجدول' },
  { href: '/dashboard/workspace', icon: FolderOpen, label: 'المهام' },
  { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { supabase, user } = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', String(newState))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <motion.aside
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`fixed right-0 top-0 h-screen bg-[var(--bg-card)] backdrop-blur-xl border-l border-[var(--border-color)] p-4 flex flex-col z-50 transition-all duration-300 shadow-lg ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* زر التقليص */}
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-secondary)] hover:text-[#D4AF37]"
          aria-label={isCollapsed ? 'توسيع القائمة' : 'تقليص القائمة'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* اللوجو */}
      <Link
        href="/dashboard"
        className={`flex ${isCollapsed ? 'justify-center' : 'justify-center'} mb-8 px-2`}
      >
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className={`${isCollapsed ? 'w-14 h-14' : 'w-24 h-24'}`}
        >
          <Logo />
        </motion.div>
      </Link>

      {/* قائمة التنقل */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: isCollapsed ? 0 : -4 }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-['Cairo'] ${
                  active
                    ? 'bg-[#D4AF37] text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/20'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{label}</span>}
                {active && !isCollapsed && (
                  <motion.span
                    layoutId="active-indicator"
                    className="mr-auto w-1.5 h-1.5 rounded-full bg-[#0b1a2e]"
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* أسفل الـ Sidebar: الثيم، المستخدم، الخروج */}
      <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
        {/* زر تبديل الثيم */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[#D4AF37] transition-all duration-300 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>الوضع الفاتح</span>}
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>الوضع الداكن</span>}
            </>
          )}
        </button>

        {/* معلومات المستخدم (تظهر فقط عند التوسيع) */}
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--bg-card-hover)]">
            <User className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm text-[var(--text-secondary)] truncate font-['Cairo']">
              {user?.email}
            </span>
          </div>
        )}

        {/* زر تسجيل الخروج */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all duration-300 font-['Cairo'] ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </motion.aside>
  )
}