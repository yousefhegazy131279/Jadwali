'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'
import {
  FolderPlus,
  FolderOpen,
  Plus,
  X,
  Check,
  Loader2,
  ChevronDown,
  Sparkles,
} from 'lucide-react'

type Project = {
  id: string
  name: string
  color?: string
}

export default function ProjectPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const { user, supabase } = useSupabase()
  const { t, language } = useLanguage()
  const isArabic = language === 'ar'

  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ============ Load projects ============
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (error) {
        toast.error(t('تعذر تحميل المشاريع', 'Could not load projects'))
      } else {
        setProjects(data ?? [])
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user?.id, supabase, t])

  // ============ Close dropdown on outside click ============
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ============ Focus input when creating ============
  useEffect(() => {
    if (creating) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [creating])

  // ============ Create project ============
  const create = async () => {
    if (!name.trim() || !user || busy) return
    setBusy(true)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: '#D4AF37',
      })
      .select('id,name,color')
      .single()

    setBusy(false)

    if (error) {
      toast.error(t('تعذر إنشاء المشروع', 'Could not create project'))
      return
    }

    setProjects([data, ...projects])
    onChange(data.id)
    setCreating(false)
    setName('')
    toast.success(t('✅ تم إنشاء المشروع', '✅ Project created'))
  }

  // ============ Cancel creation ============
  const cancelCreate = () => {
    setCreating(false)
    setName('')
  }

  // ============ Current selection ============
  const selected = projects.find(p => p.id === value)

  return (
    <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={`relative rounded-2xl bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-lg ${
      dropdownOpen || creating ? 'z-[60]' : 'z-10'
    }`}
    dir={isArabic ? 'rtl' : 'ltr'}
  >
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-purple-500/40 via-[#D4AF37]/40 to-transparent opacity-60" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/15 to-transparent text-purple-400 border border-[var(--border-color)]">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">
              {t('المشروع', 'Project')}
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-['Cairo']">
              {t('اربط الجدول بمشروع أو أنشئ واحداً جديداً', 'Link this schedule to a project or create a new one')}
            </p>
          </div>
        </div>

        {!creating && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-all duration-200 font-['Cairo'] text-sm font-medium"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('مشروع جديد', 'New project')}</span>
          </motion.button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 space-y-3">
        {/* ===== Dropdown ===== */}
        {!creating && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={loading}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#D4AF37]/40 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all duration-200 font-['Cairo'] text-sm text-start disabled:opacity-50"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                    <span className="text-[var(--text-muted)]">
                      {t('جارٍ التحميل...', 'Loading...')}
                    </span>
                  </>
                ) : selected ? (
                  <>
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                      style={{ backgroundColor: selected.color || '#D4AF37' }}
                    />
                    <span className="text-[var(--text-primary)] truncate font-medium">
                      {selected.name}
                    </span>
                    <Check className="w-4 h-4 text-[#D4AF37] flex-shrink-0 ms-auto" />
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full border border-dashed border-[var(--text-muted)] flex-shrink-0" />
                    <span className="text-[var(--text-muted)]">
                      {t('بدون مشروع', 'No project')}
                    </span>
                  </>
                )}
              </div>
              <motion.div animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
              </motion.div>
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {dropdownOpen && !loading && (
                <motion.ul
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  role="listbox"
                  className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl backdrop-blur-xl py-1"
                >
                  {/* No project option */}
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        onChange('')
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-start hover:bg-[var(--bg-card)] transition-colors font-['Cairo'] text-sm ${
                        !value ? 'bg-[#D4AF37]/5' : ''
                      }`}
                      role="option"
                      aria-selected={!value}
                    >
                      <span className="w-3 h-3 rounded-full border border-dashed border-[var(--text-muted)] flex-shrink-0" />
                      <span className="flex-1 text-[var(--text-secondary)]">
                        {t('بدون مشروع', 'No project')}
                      </span>
                      {!value && <Check className="w-4 h-4 text-[#D4AF37]" />}
                    </button>
                  </li>

                  {/* Divider */}
                  {projects.length > 0 && (
                    <li className="h-px bg-[var(--border-color)] my-1 mx-2" aria-hidden="true" />
                  )}

                  {/* Projects list */}
                  {projects.length === 0 ? (
                    <li className="px-3 py-6 text-center text-xs text-[var(--text-muted)] font-['Cairo']">
                      <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-30" />
                      {t('لا توجد مشاريع بعد', 'No projects yet')}
                    </li>
                  ) : (
                    projects.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(p.id)
                            setDropdownOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-start hover:bg-[var(--bg-card)] transition-colors font-['Cairo'] text-sm ${
                            value === p.id ? 'bg-[#D4AF37]/5' : ''
                          }`}
                          role="option"
                          aria-selected={value === p.id}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                            style={{ backgroundColor: p.color || '#D4AF37' }}
                          />
                          <span className="flex-1 text-[var(--text-primary)] truncate">
                            {p.name}
                          </span>
                          {value === p.id && <Check className="w-4 h-4 text-[#D4AF37]" />}
                        </button>
                      </li>
                    ))
                  )}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ===== Create new project form ===== */}
        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 font-['Cairo']">
                  <FolderPlus className="w-3.5 h-3.5" />
                  {t('مشروع جديد', 'New project')}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          create()
                        }
                        if (e.key === 'Escape') cancelCreate()
                      }}
                      maxLength={100}
                      placeholder={t('مثال: مشروع التخرج', 'e.g. Graduation project')}
                      aria-label={t('اسم المشروع', 'Project name')}
                      className="w-full px-3 py-2.5 pe-16 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 font-['Cairo'] text-sm"
                    />
                    <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] font-['Cairo'] pointer-events-none tabular-nums">
                      {name.length}/100
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={busy || !name.trim()}
                      onClick={create}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all font-['Cairo'] text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      {t('إنشاء', 'Create')}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={cancelCreate}
                      className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30 transition-all"
                      aria-label={t('إلغاء', 'Cancel')}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                <p className="text-[10px] text-[var(--text-muted)] font-['Cairo']">
                  {t(
                    'اضغط Enter للإنشاء، Esc للإلغاء',
                    'Press Enter to create, Esc to cancel'
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}