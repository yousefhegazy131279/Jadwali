'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/supabaseProvider'
import { useTheme } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { useState, useEffect, memo } from 'react'
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
  Menu,
  X,
  Shield,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/dashboard/planner', icon: Calendar, label: 'المخطط' },
  { href: '/dashboard/schedule', icon: Clock, label: 'الجدول' },
  { href: '/dashboard/workspace', icon: FolderOpen, label: 'المهام' },
  { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const { supabase, user, isAdmin } = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setIsCollapsed(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <>
      {/* زر الهمبرغر للموبايل */}
      <button
        className="md:hidden fixed top-4 right-4 z-[1100] p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg backdrop-blur-xl"
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* الستارة الخلفية */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050] md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* الشريط الجانبي - يستخدم inline style لضمان الموضع */}
      <aside
        className={`
          fixed top-0 right-0 h-screen 
          bg-[var(--bg-card)] backdrop-blur-xl 
          border-l border-[var(--border-color)] 
          p-4 flex flex-col z-[1060] 
          transition-all duration-300 shadow-lg
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
          w-72
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
        `}
      >
        <div className="flex justify-end items-center mb-4 md:hidden">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden md:flex justify-end mb-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37]"
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        <Link href="/dashboard" className="flex justify-center mb-8 px-2" onClick={() => setMobileOpen(false)}>
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className={`${isCollapsed ? 'md:w-14 md:h-14' : 'md:w-24 md:h-24'} w-20 h-20`}
          >
            <Logo />
          </motion.div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-['Cairo'] ${
                    active
                      ? 'bg-[#D4AF37] text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/20'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                  } ${isCollapsed && !mobileOpen ? 'md:justify-center' : ''}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {(!isCollapsed || mobileOpen) && <span>{label}</span>}
                </div>
              </Link>
            )
          })}

          {isAdmin && (
            <Link href="/admin" onClick={() => setMobileOpen(false)}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-['Cairo'] ${
                  pathname?.startsWith('/admin')
                    ? 'bg-[#D4AF37] text-[#0b1a2e]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                } ${isCollapsed && !mobileOpen ? 'md:justify-center' : ''}`}
              >
                <Shield className="w-5 h-5 flex-shrink-0" />
                {(!isCollapsed || mobileOpen) && <span>لوحة الأدمن</span>}
              </div>
            </Link>
          )}
        </nav>

        <div className="border-t border-[var(--border-color)] pt-4 space-y-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card-hover)] ${
              isCollapsed && !mobileOpen ? 'md:justify-center' : ''
            }`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {(!isCollapsed || mobileOpen) && <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>}
          </button>

          {(!isCollapsed || mobileOpen) && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--bg-card-hover)]">
              <User className="w-4 h-4" />
              <span className="text-sm truncate">{user?.email}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 ${
              isCollapsed && !mobileOpen ? 'md:justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {(!isCollapsed || mobileOpen) && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  )
})
