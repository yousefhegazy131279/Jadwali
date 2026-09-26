'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/supabaseProvider'
import { useTheme } from '@/context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { LanguageToggle, useLanguage } from '@/context/LanguageContext'
import { useState, useEffect, memo } from 'react'
import {
  LayoutDashboard, Calendar, Clock, FolderOpen, Settings, LogOut,
  User, PanelLeftClose, PanelLeftOpen, Sun, Moon, Menu, X, Shield,
  BarChart3, Users, FolderKanban, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react'

/* ============================================================
   مجموعات التنقل
   ============================================================ */
type NavItem = {
  href: string
  icon: typeof LayoutDashboard
  labelAr: string
  labelEn: string
  accent?: string
}

type NavGroup = {
  key: string
  labelAr: string
  labelEn: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    key: 'main',
    labelAr: 'الرئيسية',
    labelEn: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, labelAr: 'لوحة التحكم', labelEn: 'Dashboard' },
      { href: '/dashboard/planner', icon: Calendar, labelAr: 'المخطط الذكي', labelEn: 'Planner' },
      { href: '/dashboard/schedule', icon: Clock, labelAr: 'الجداول', labelEn: 'Schedules' },
    ],
  },
  {
    key: 'workspace',
    labelAr: 'مساحة العمل',
    labelEn: 'Workspace',
    items: [
      { href: '/dashboard/workspace', icon: FolderOpen, labelAr: 'المهام', labelEn: 'Tasks' },
      { href: '/dashboard/projects', icon: FolderKanban, labelAr: 'المشاريع', labelEn: 'Projects' },
      { href: '/dashboard/shared', icon: Users, labelAr: 'المشترك', labelEn: 'Shared' },
    ],
  },
  {
    key: 'insights',
    labelAr: 'التحليلات',
    labelEn: 'Insights',
    items: [
      { href: '/dashboard/analytics', icon: BarChart3, labelAr: 'الإحصائيات', labelEn: 'Analytics' },
      { href: '/dashboard/settings', icon: Settings, labelAr: 'الإعدادات', labelEn: 'Settings' },
    ],
  },
]

/* ============================================================
   Tooltip عند الطي
   ============================================================ */
function Tooltip({ children, label, show, side }: { children: React.ReactNode; label: string; show: boolean; side: 'left' | 'right' }) {
  return (
    <div className="relative group/tip">
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: side === 'right' ? 6 : -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: side === 'right' ? 6 : -6 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute top-1/2 z-[1200] -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 font-['Cairo'] text-xs font-bold text-[var(--text-primary)] opacity-0 shadow-xl backdrop-blur-xl transition-opacity group-hover/tip:opacity-100 ${
              side === 'right' ? 'left-full ml-3' : 'right-full mr-3'
            }`}
          >
            {label}
            <div
              className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-[var(--border-color)] bg-[var(--bg-card)] ${
                side === 'right' ? '-left-1 border-b border-l' : '-right-1 border-r border-t'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ============================================================
   الشريط الجانبي
   ============================================================ */
export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const { supabase, user, isAdmin } = useSupabase()
  const { theme, toggleTheme } = useTheme()
  const { language, t } = useLanguage()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isRTL = language === 'ar'
  const tooltipSide: 'left' | 'right' = isRTL ? 'left' : 'right'

  useEffect(() => {
    setMounted(true)
    try {
      setIsCollapsed(localStorage.getItem('sidebar-collapsed') === 'true')
    } catch {
      setIsCollapsed(false)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    try {
      localStorage.setItem('sidebar-collapsed', String(next))
    } catch {
      /* ignore */
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const collapsed = isCollapsed && !mobileOpen && mounted
  const showLabels = !collapsed

  const userInitial = (user?.email || '?').charAt(0).toUpperCase()
  const userName = user?.email?.split('@')[0] || t('مستخدم', 'User')

  return (
    <>
      {/* ============ زر الهمبرغر (جوال) ============ */}
      <button
        className="fixed top-4 z-[1100] flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-lg backdrop-blur-xl transition-colors hover:border-[#D4AF37]/40 md:hidden ltr:left-4 rtl:right-4"
        onClick={() => setMobileOpen((p) => !p)}
        type="button"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? t('إغلاق القائمة', 'Close menu') : t('فتح القائمة', 'Open menu')}
      >
        <AnimatePresence mode="wait" initial={false}>
          {mobileOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Menu className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* ============ الستارة الخلفية (جوال) ============ */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1050] bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ============ الشريط الجانبي ============ */}
      <aside
        className={`
          fixed top-0 z-[1060] flex h-screen flex-col border-[var(--border-color)]
          bg-[var(--bg-card)]/95 backdrop-blur-2xl shadow-2xl
          transition-[width,transform] duration-300 ease-out
          ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l
          ${collapsed ? 'md:w-[76px]' : 'md:w-64'}
          w-[280px]
          ${mobileOpen ? 'translate-x-0' : isRTL ? 'translate-x-full md:translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label={t('القائمة الجانبية', 'Sidebar')}
      >
        {/* هالة خلفية */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-3xl" />

      {/* ============ الرأس ============ */}
<div className="relative flex flex-col items-center gap-2 border-b border-[var(--border-color)] px-3 py-4">
  {/* الشعار — كبير وبارز */}
  <Link
    href="/dashboard"
    onClick={() => setMobileOpen(false)}
    className="group flex w-full items-center justify-center rounded-xl p-1 transition-colors"
    aria-label={t('الرئيسية', 'Home')}
  >
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      className={`shrink-0 ${collapsed ? 'h-12 w-12' : 'h-24 w-24'}`}
    >
      <Logo />
    </motion.div>
  </Link>

  {/* زر الطي (سطح المكتب) */}

</div>

        {/* ============ التنقل ============ */}
        <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3">
          {navGroups.map((group, gi) => (
            <div key={group.key} className={gi > 0 ? 'mt-4' : ''}>
              {/* عنوان المجموعة */}
              {!collapsed && (
                <div className="mb-1.5 flex items-center gap-2 px-3">
                  <span className="font-['Cairo'] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {t(group.labelAr, group.labelEn)}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-color)] to-transparent" />
                </div>
              )}
              {collapsed && gi > 0 && (
                <div className="mx-auto mb-1.5 h-px w-6 bg-[var(--border-color)]" />
              )}

              {/* عناصر المجموعة */}
              <div className="space-y-0.5">
                {group.items.map(({ href, icon: Icon, labelAr, labelEn }) => {
                  const active = isActive(href)
                  const label = t(labelAr, labelEn)

                  return (
                    <Tooltip key={href} label={label} show={collapsed} side={tooltipSide}>
                      <Link
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-['Cairo'] text-sm transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 font-bold text-[#D4AF37]'
                            : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
                        } ${collapsed ? 'justify-center px-0' : ''}`}
                      >
                        {/* مؤشر جانبي */}
                        {active && (
                          <motion.div
                            layoutId="sidebar-active"
                            className={`absolute h-6 w-1 rounded-full bg-[#D4AF37] ltr:left-0 rtl:right-0`}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}

                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110 ${
                            active ? 'text-[#D4AF37]' : ''
                          }`}
                        />

                        {!collapsed && (
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        )}
                      </Link>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ============ الأدمن ============ */}
          {isAdmin && (
            <div className="mt-4">
              {!collapsed && (
                <div className="mb-1.5 flex items-center gap-2 px-3">
                  <span className="font-['Cairo'] text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {t('الإدارة', 'Admin')}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-[var(--border-color)] to-transparent" />
                </div>
              )}
              {collapsed && <div className="mx-auto mb-1.5 h-px w-6 bg-[var(--border-color)]" />}

              <Tooltip label={t('لوحة الأدمن', 'Admin panel')} show={collapsed} side={tooltipSide}>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 font-['Cairo'] text-sm transition-all duration-200 ${
                    pathname?.startsWith('/admin')
                      ? 'bg-gradient-to-r from-purple-500/20 to-purple-500/5 font-bold text-purple-300'
                      : 'text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  {pathname?.startsWith('/admin') && (
                    <motion.div
                      layoutId="sidebar-active"
                      className={`absolute h-6 w-1 rounded-full bg-purple-400 ltr:left-0 rtl:right-0`}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Shield className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && <span className="flex-1 truncate">{t('لوحة الأدمن', 'Admin panel')}</span>}
                </Link>
              </Tooltip>
            </div>
          )}
        </nav>

        {/* ============ الفوتر ============ */}
        <div className="relative border-t border-[var(--border-color)] p-2.5 space-y-1.5">
          {/* بطاقة المستخدم */}
          <Tooltip label={`${userName} — ${user?.email ?? ''}`} show={collapsed} side={tooltipSide}>
            <div
              className={`group flex items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2 transition-colors ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md">
                  {userInitial}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate font-['Cairo'] text-xs font-bold text-[var(--text-primary)]">
                    {userName}
                  </div>
                  <div className="truncate font-['Cairo'] text-[9px] text-[var(--text-muted)]">
                    {user?.email}
                  </div>
                </div>
              )}
            </div>
          </Tooltip>

          {/* الأزرار السريعة */}
          <div className={`flex gap-1.5 ${collapsed ? 'flex-col' : 'flex-row'}`}>
            <Tooltip label={theme === 'dark' ? t('الوضع الفاتح', 'Light mode') : t('الوضع الداكن', 'Dark mode')} show={collapsed} side={tooltipSide}>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t('تبديل المظهر', 'Toggle theme')}
                className={`flex h-9 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[#D4AF37]/30 hover:text-[#D4AF37] ${
                  collapsed ? 'w-9 px-0' : 'flex-1'
                }`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {!collapsed && (
                  <span className="truncate">
                    {theme === 'dark' ? t('فاتح', 'Light') : t('داكن', 'Dark')}
                  </span>
                )}
              </button>
            </Tooltip>

            {!collapsed && (
              <div className="flex h-9 items-center">
                <LanguageToggle />
              </div>
            )}
          </div>

          {/* تسجيل الخروج */}
          <Tooltip label={t('تسجيل الخروج', 'Sign out')} show={collapsed} side={tooltipSide}>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('تسجيل الخروج', 'Sign out')}
              className={`group flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 font-['Cairo'] text-xs font-bold text-red-400 transition-all hover:border-red-500/40 hover:bg-red-500/15 ${
                collapsed ? 'w-9 px-0' : ''
              }`}
            >
              <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              {!collapsed && <span>{t('خروج', 'Sign out')}</span>}
            </button>
          </Tooltip>
        </div>
      </aside>
    </>
  )
})