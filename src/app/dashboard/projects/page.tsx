'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { useLanguage } from '@/context/LanguageContext'
import {
  Plus, Trash2, FolderOpen, Edit2, X, Check, Loader2,
  ArrowLeft, Search, Sparkles, TrendingUp, Calendar,
  Target, CheckCircle2, Circle, Palette, Info, FolderPlus,
  Layers, Filter, LayoutGrid,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'

/* ============================================================
   الأنواع
   ============================================================ */
type Project = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

type ProjectStats = {
  totalSchedules: number
  totalTasks: number
  pendingTasks: number
  completedSessions: number
  totalSessions: number
  progress: number
}

/* ============================================================
   أدوات مساعدة
   ============================================================ */
const COLOR_PALETTE = [
  '#D4AF37', '#F59E0B', '#EF4444', '#EC4899',
  '#A855F7', '#6366F1', '#3B82F6', '#06B6D4',
  '#10B981', '#84CC16', '#F97316', '#78716C',
]

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ============================================================
   Skeleton
   ============================================================ */
function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-12 w-12 rounded-xl bg-white/5" />
        <div className="flex gap-1">
          <div className="h-8 w-8 rounded-lg bg-white/5" />
          <div className="h-8 w-8 rounded-lg bg-white/5" />
        </div>
      </div>
      <div className="mb-3 h-6 w-3/4 rounded-lg bg-white/5" />
      <div className="mb-2 h-4 w-1/2 rounded-lg bg-white/5" />
      <div className="mb-4 h-2 w-full rounded-full bg-white/5" />
      <div className="h-9 w-full rounded-xl bg-white/5" />
    </div>
  )
}

/* ============================================================
   بطاقة إحصائية
   ============================================================ */
function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'gold',
  delay = 0,
}: {
  icon: typeof Target
  label: string
  value: string | number
  accent?: 'gold' | 'emerald' | 'sky' | 'purple'
  delay?: number
}) {
  const accents = {
    gold: 'from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] border-[#D4AF37]/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    sky: 'from-sky-500/20 to-sky-500/5 text-sky-400 border-sky-500/20',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/20',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accents[accent]} p-4 backdrop-blur-xl`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-['Cairo'] text-[10px] uppercase tracking-wider opacity-80">
          {label}
        </span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </div>
    </motion.div>
  )
}

/* ============================================================
   بطاقة مشروع (معمارية جديدة)
   ============================================================ */
function ProjectCard({
  project,
  index,
  stats,
  onDelete,
  onEdit,
  language,
  t,
}: {
  project: Project
  index: number
  stats: ProjectStats
  onDelete: (id: string) => void
  onEdit: (project: Project) => void
  language: 'ar' | 'en'
  t: (ar: string, en?: string) => string
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 340, damping: 26 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-xl transition-all duration-300 hover:border-transparent hover:shadow-2xl"
      style={{ '--project-color': project.color } as React.CSSProperties}
    >
      {/* شريط علوي بلون المشروع */}
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${project.color}, ${hexToRgba(project.color, 0.3)})` }}
      />

      {/* هالة خلفية */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: project.color }}
      />

      <div className="relative p-5">
        {/* الرأس: الأيقونة + الأزرار */}
        <div className="mb-4 flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
            style={{ background: hexToRgba(project.color, 0.15) }}
          >
            <FolderOpen className="h-5 w-5" style={{ color: project.color }} />
          </div>

          <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={() => onEdit(project)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[#D4AF37]"
              title={t('تعديل', 'Edit')}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(project.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400"
              title={t('حذف', 'Delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* اسم المشروع */}
        <h3 className="mb-1 truncate font-['Amiri'] text-xl font-bold text-[var(--text-primary)]">
          {project.name}
        </h3>

        {/* التاريخ */}
        <p className="mb-4 inline-flex items-center gap-1.5 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
          <Calendar className="h-3 w-3" />
          {format(new Date(project.created_at), 'd MMM yyyy', {
            locale: language === 'ar' ? ar : enUS,
          })}
        </p>

        {/* الإحصائيات المصغّرة */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 text-center">
            <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[var(--text-primary)]">
              <Layers className="h-3 w-3 text-[#D4AF37]" />
              {stats.totalSchedules}
            </div>
            <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
              {t('جداول', 'Schedules')}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 text-center">
            <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[var(--text-primary)]">
              <Circle className="h-3 w-3 text-sky-400" />
              {stats.pendingTasks}
            </div>
            <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
              {t('معلّقة', 'Pending')}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 text-center">
            <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-[var(--text-primary)]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              {stats.completedSessions}
            </div>
            <div className="mt-0.5 font-['Cairo'] text-[9px] text-[var(--text-muted)]">
              {t('منجزة', 'Done')}
            </div>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
              {t('التقدم', 'Progress')}
            </span>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: project.color }}
            >
              {stats.progress}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${project.color}, ${hexToRgba(project.color, 0.6)})`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.9, delay: 0.15 + index * 0.05, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* زر التفاصيل */}
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-primary)] transition-all duration-300 group-hover:border-transparent"
          style={{
            background: `linear-gradient(to right, ${hexToRgba(project.color, 0.1)}, transparent)`,
          }}
        >
          <span style={{ color: project.color }}>
            {t('تفاصيل المشروع', 'Project details')}
          </span>
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1 ltr:rotate-180 rtl:rotate-0"
            style={{ color: project.color }}
          />
        </Link>
      </div>
    </motion.article>
  )
}

/* ============================================================
   مودال موحّد
   ============================================================ */
function Modal({
  open,
  onClose,
  title,
  icon: Icon,
  iconBg = 'bg-[#D4AF37]/15',
  iconColor = 'text-[#D4AF37]',
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  icon: typeof Plus
  iconBg?: string
  iconColor?: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl"
        >
          {/* شريط علوي ذهبي */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#D4AF37]" />

          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="font-['Amiri'] text-lg font-bold text-[var(--text-primary)]">
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ============================================================
   نموذج المشروع
   ============================================================ */
function ProjectForm({
  editing,
  onSave,
  onCancel,
  isLoading,
  language,
}: {
  editing: Project | null
  onSave: (name: string, color: string) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  language: 'ar' | 'en'
}) {
  const { t } = useLanguage()
  const [name, setName] = useState(editing?.name || '')
  const [color, setColor] = useState(editing?.color || '#D4AF37')

  useEffect(() => {
    setName(editing?.name || '')
    setColor(editing?.color || '#D4AF37')
  }, [editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error(t('اسم المشروع يجب أن يكون حرفين على الأقل', 'Name must be at least 2 characters'))
      return
    }
    await onSave(name.trim(), color)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* المعاينة الحية */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: color }}
        />
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
            style={{ background: hexToRgba(color, 0.15) }}
          >
            <FolderOpen className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-['Amiri'] text-base font-bold text-[var(--text-primary)]">
              {name || t('اسم المشروع…', 'Project name…')}
            </div>
            <div className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
              {t('معاينة مباشرة', 'Live preview')}
            </div>
          </div>
        </div>
      </div>

      {/* حقل الاسم */}
      <div>
        <label className="mb-2 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
          {t('اسم المشروع', 'Project name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('مثال: مشروع التخرج، دراسة IELTS…', 'e.g. Graduation, IELTS study…')}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none"
          autoFocus
        />
      </div>

      {/* منتقي الألوان */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
          <label className="font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
            {t('لون المشروع', 'Project color')}
          </label>
          <span className="ms-auto rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
            {color}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PALETTE.map((c) => {
            const active = color === c
            return (
              <motion.button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className={`relative flex h-9 w-full items-center justify-center rounded-xl transition-all ${
                  active ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-[var(--bg-card)]' : ''
                }`}
                style={{ backgroundColor: c }}
                title={c}
              >
                {active && <Check className="h-4 w-4 text-white drop-shadow-lg" strokeWidth={3} />}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* أزرار */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-2.5 font-['Cairo'] text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-white/5"
        >
          {t('إلغاء', 'Cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading || name.trim().length < 2}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] py-2.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-md transition-all hover:shadow-lg hover:shadow-[#D4AF37]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editing ? (
            <>
              <Check className="h-4 w-4" />
              {t('تحديث', 'Update')}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t('إنشاء', 'Create')}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function ProjectsPage() {
  const { t, language } = useLanguage()
  const { user } = useSupabase()

  const [projects, setProjects] = useState<Project[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'newest' | 'name' | 'progress'>('newest')

  /* ====== جلب المشاريع ====== */
  useEffect(() => {
    if (user) void fetchProjects()
  }, [user])

  const fetchProjects = async () => {
    if (!user) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(t('حدث خطأ في تحميل المشاريع', 'Error loading projects'))
      console.error(error)
    } else {
      setProjects(data || [])
      void fetchAllStats(data || [])
    }
    setLoading(false)
  }

  /* ====== جلب إحصائيات كل المشاريع دفعة واحدة ====== */
  const fetchAllStats = async (projectsList: Project[]) => {
    if (!user || projectsList.length === 0) return
    const supabase = createClient()

    const { data, error } = await supabase
      .from('schedules')
      .select('id, project_id, pomodoro, tasks(id, done, completed_sessions, duration)')
      .in('project_id', projectsList.map((p) => p.id))

    if (error) {
      console.error(error)
      return
    }

    const newStats: Record<string, ProjectStats> = {}
    for (const p of projectsList) {
      newStats[p.id] = {
        totalSchedules: 0,
        totalTasks: 0,
        pendingTasks: 0,
        completedSessions: 0,
        totalSessions: 0,
        progress: 0,
      }
    }

    for (const schedule of data ?? []) {
      const pid = schedule.project_id
      if (!pid || !newStats[pid]) continue
      newStats[pid].totalSchedules++

      const workDur = schedule.pomodoro?.workDuration || 50

      for (const task of schedule.tasks ?? []) {
        newStats[pid].totalTasks++
        const sessions = task.duration > 0 ? Math.ceil(task.duration / workDur) : 1
        newStats[pid].totalSessions += sessions
        newStats[pid].completedSessions +=
          task.duration > 0
            ? Math.min(task.completed_sessions ?? 0, sessions)
            : Number(task.done)
        if (!task.done) newStats[pid].pendingTasks++
      }
    }

    for (const pid in newStats) {
      const s = newStats[pid]
      s.progress = s.totalSessions > 0
        ? Math.round((s.completedSessions / s.totalSessions) * 100)
        : 0
    }

    setStatsMap(newStats)
  }

  /* ====== الإضافة ====== */
  const handleAddProject = async (name: string, color: string) => {
    if (!user) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, color })
      .select()
      .single()

    if (error) {
      toast.error(t('حدث خطأ في إضافة المشروع', 'Error adding project'))
      console.error(error)
    } else {
      setProjects([data, ...projects])
      setStatsMap((prev) => ({
        ...prev,
        [data.id]: {
          totalSchedules: 0,
          totalTasks: 0,
          pendingTasks: 0,
          completedSessions: 0,
          totalSessions: 0,
          progress: 0,
        },
      }))
      toast.success(t('✅ تم إنشاء المشروع', '✅ Project created'))
      setIsModalOpen(false)
      setEditingProject(null)
    }
    setIsSaving(false)
  }

  /* ====== التعديل ====== */
  const handleEditProject = async (name: string, color: string) => {
    if (!user || !editingProject) return
    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .update({ name, color })
      .eq('id', editingProject.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast.error(t('حدث خطأ في تعديل المشروع', 'Error updating project'))
      console.error(error)
    } else {
      setProjects(projects.map((p) => (p.id === editingProject.id ? data : p)))
      toast.success(t('✅ تم تحديث المشروع', '✅ Project updated'))
      setIsModalOpen(false)
      setEditingProject(null)
    }
    setIsSaving(false)
  }

  /* ====== الحذف ====== */
  const handleDeleteProject = async (id: string) => {
    if (!confirm(t(
      'هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع المهام المرتبطة به.',
      'Delete this project? All linked tasks will be removed.'
    ))) return

    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      toast.error(t('حدث خطأ في حذف المشروع', 'Error deleting project'))
      console.error(error)
    } else {
      setProjects(projects.filter((p) => p.id !== id))
      setStatsMap((prev) => {
        const { [id]: _, ...rest } = prev
        return rest
      })
      toast.success(t('🗑️ تم حذف المشروع', '🗑️ Project deleted'))
    }
  }

  const handleOpenModal = (project?: Project) => {
    setEditingProject(project ?? null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  /* ====== الإحصائيات الكلية ====== */
  const globalStats = useMemo(() => {
    const all = Object.values(statsMap)
    return {
      totalProjects: projects.length,
      totalSchedules: all.reduce((s, x) => s + x.totalSchedules, 0),
      pendingTasks: all.reduce((s, x) => s + x.pendingTasks, 0),
      avgProgress:
        all.length > 0
          ? Math.round(all.reduce((s, x) => s + x.progress, 0) / all.length)
          : 0,
    }
  }, [projects, statsMap])

  /* ====== الفلترة والترتيب ====== */
  const filtered = useMemo(() => {
    let list = projects
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q))

    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'progress') {
        return (statsMap[b.id]?.progress ?? 0) - (statsMap[a.id]?.progress ?? 0)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [projects, query, sort, statsMap])

  /* ====== Loading ====== */
  if (loading) {
    return (
      <div className="space-y-5 p-3 sm:p-6">
        <div className="h-40 animate-pulse rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  /* ====== العرض ====== */
  return (
    <div className="space-y-6 p-3 sm:p-6">
      {/* ============ Hero ============ */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-xs text-[#D4AF37]">
              <Sparkles className="h-3.5 w-3.5" />
              {t('نظّم أفكارك في مشاريع', 'Organize your ideas into projects')}
            </div>
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('المشاريع', 'Projects')}
            </h1>
            <p className="mt-2 max-w-xl font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'اجمع جداولك ومهامك تحت مظلة واحدة، وتابع تقدمك خطوة بخطوة.',
                'Group your schedules and tasks together and track your progress step by step.'
              )}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleOpenModal()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-6 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/40"
          >
            <FolderPlus className="h-4 w-4" />
            {t('مشروع جديد', 'New project')}
          </motion.button>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Layers}
            label={t('المشاريع', 'Projects')}
            value={globalStats.totalProjects}
            accent="gold"
            delay={0.05}
          />
          <StatCard
            icon={FolderOpen}
            label={t('الجداول', 'Schedules')}
            value={globalStats.totalSchedules}
            accent="sky"
            delay={0.1}
          />
          <StatCard
            icon={Circle}
            label={t('مهام معلّقة', 'Pending')}
            value={globalStats.pendingTasks}
            accent="purple"
            delay={0.15}
          />
          <StatCard
            icon={TrendingUp}
            label={t('متوسط التقدم', 'Avg progress')}
            value={`${globalStats.avgProgress}%`}
            accent="emerald"
            delay={0.2}
          />
        </div>
      </motion.section>

      {/* ============ شريط البحث والترتيب ============ */}
      {projects.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)] ltr:left-3 rtl:right-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ابحث عن مشروع…', 'Search projects…')}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2.5 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[#D4AF37] focus:outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-1">
            <Filter className="ms-2 h-3.5 w-3.5 text-[var(--text-muted)]" />
            {[
              { key: 'newest', label: t('الأحدث', 'Newest'), icon: Calendar },
              { key: 'name', label: t('الاسم', 'Name'), icon: LayoutGrid },
              { key: 'progress', label: t('التقدم', 'Progress'), icon: TrendingUp },
            ].map((opt) => {
              const Icon = opt.icon
              const active = sort === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => setSort(opt.key as typeof sort)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-['Cairo'] text-xs font-bold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============ المحتوى ============ */}
      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-12 text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5"
          >
            <FolderOpen className="h-9 w-9 text-[#D4AF37]/70" />
          </motion.div>
          <h3 className="mb-2 font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
            {t('لا توجد مشاريع بعد', 'No projects yet')}
          </h3>
          <p className="mx-auto max-w-md font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {t(
              'ابدأ بإنشاء مشروعك الأول لتنظيم جداولك ومتابعة تقدمك بشكل واضح.',
              'Create your first project to organize schedules and track progress clearly.'
            )}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] px-6 py-3 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/40"
          >
            <Plus className="h-4 w-4" />
            {t('إنشاء مشروع', 'Create project')}
          </button>
        </motion.div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)]/50 p-10 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)]/50" />
          <p className="font-['Cairo'] text-sm text-[var(--text-secondary)]">
            {t('لا توجد نتائج مطابقة', 'No matching results')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                stats={
                  statsMap[project.id] ?? {
                    totalSchedules: 0,
                    totalTasks: 0,
                    pendingTasks: 0,
                    completedSessions: 0,
                    totalSessions: 0,
                    progress: 0,
                  }
                }
                onDelete={handleDeleteProject}
                onEdit={handleOpenModal}
                language={language}
                t={t}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ============ المودال ============ */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        title={editingProject ? t('تعديل المشروع', 'Edit project') : t('مشروع جديد', 'New project')}
        icon={editingProject ? Edit2 : FolderPlus}
      >
        <ProjectForm
          editing={editingProject}
          onSave={editingProject ? handleEditProject : handleAddProject}
          onCancel={handleCloseModal}
          isLoading={isSaving}
          language={language}
        />
      </Modal>
    </div>
  )
}