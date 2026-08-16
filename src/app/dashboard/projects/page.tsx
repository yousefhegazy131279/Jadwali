// ============================================================
//  src/app/(dashboard)/projects/page.tsx
//  نسخة نهائية مع زر "تفاصيل" ظاهر دائماً
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { Plus, Trash2, FolderOpen, Edit2, X, Check, Loader2, ArrowRight } from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import Link from 'next/link'

type Project = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

// ============================================================
//  مكون المشروع (بطاقة)
// ============================================================
function ProjectCard({
  project,
  onDelete,
  onEdit,
}: {
  project: Project
  onDelete: (id: string) => void
  onEdit: (project: Project) => void
}) {
  const [taskCount, setTaskCount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const fetchTaskCount = async () => {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('done', false)
      setTaskCount(count || 0)
    }
    fetchTaskCount()
  }, [project.id, supabase])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, type: 'spring' }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
      style={{ borderRightColor: project.color, borderRightWidth: '4px' }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at top right, ${project.color}44, transparent 70%)`,
        }}
      />

      <div className="relative">
        {/* رأس البطاقة */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${project.color}22` }}
            >
              <FolderOpen className="w-5 h-5" style={{ color: project.color }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Amiri']">
                {project.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-['Cairo']">
                {taskCount} مهام متبقية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(project)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(project.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* لون المشروع */}
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
            {project.color}
          </span>
        </div>

        {/* تاريخ الإنشاء */}
        <p className="text-xs text-[var(--text-muted)] mt-3 font-['Cairo']">
          تاريخ الإنشاء: {new Date(project.created_at).toLocaleDateString('ar-EG')}
        </p>

        {/* شريط التقدم السفلي */}
        <div className="mt-4 h-0.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: project.color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(taskCount * 20, 100)}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>

        {/* ✅ زر "تفاصيل" في أسفل البطاقة - واضح دائماً */}
        <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
          <Link href={`/dashboard/projects/${project.id}`}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all duration-300 text-sm font-['Cairo'] flex items-center gap-2"
            >
              تفاصيل المشروع
              <ArrowRight className="w-3 h-3" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
//  مودال إضافة/تعديل المشروع
// ============================================================
function ProjectModal({
  isOpen,
  onClose,
  onSave,
  editingProject,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, color: string) => Promise<void>
  editingProject?: Project | null
  isLoading: boolean
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#D4AF37')

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name)
      setColor(editingProject.color)
    } else {
      setName('')
      setColor('#D4AF37')
    }
  }, [editingProject, isOpen])

  const colors = [
    '#D4AF37',
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#3F51B5',
    '#2196F3',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#FFEB3B',
    '#FF9800',
    '#795548',
    '#607D8B',
    '#9E9E9E',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error('اسم المشروع يجب أن يكون حرفين على الأقل')
      return
    }
    await onSave(name.trim(), color)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, type: 'spring' }}
        className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20">
              {editingProject ? (
                <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              ) : (
                <Plus className="w-5 h-5 text-[#D4AF37]" />
              )}
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
              {editingProject ? 'تعديل المشروع' : 'مشروع جديد'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 font-['Cairo']">
              اسم المشروع
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم المشروع..."
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo']"
              dir="rtl"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 font-['Cairo']">
              لون المشروع
            </label>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors font-['Cairo']"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || name.trim().length < 2}
              className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {editingProject ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  {editingProject ? 'تحديث' : 'إضافة'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================================
//  الصفحة الرئيسية للمشاريع
// ============================================================
export default function ProjectsPage() {
  const { user } = useSupabase()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      mirror: true,
    })

    if (user) {
      fetchProjects()
    }
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
      toast.error('حدث خطأ في تحميل المشاريع')
      console.error('Error fetching projects:', error)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const handleAddProject = async (name: string, color: string) => {
    if (!user) return

    setIsSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: name,
        color: color,
      })
      .select()
      .single()

    if (error) {
      toast.error('حدث خطأ في إضافة المشروع')
      console.error('Error adding project:', error)
    } else {
      setProjects([data, ...projects])
      toast.success('✅ تم إضافة المشروع بنجاح')
      setIsModalOpen(false)
      setEditingProject(null)
    }
    setIsSaving(false)
  }

  const handleEditProject = async (name: string, color: string) => {
    if (!user || !editingProject) return

    setIsSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('projects')
      .update({
        name: name,
        color: color,
      })
      .eq('id', editingProject.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      toast.error('حدث خطأ في تعديل المشروع')
      console.error('Error editing project:', error)
    } else {
      setProjects(projects.map((p) => (p.id === editingProject.id ? data : p)))
      toast.success('✅ تم تعديل المشروع بنجاح')
      setIsModalOpen(false)
      setEditingProject(null)
    }
    setIsSaving(false)
  }

  const handleDeleteProject = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع المهام المرتبطة به.')) return

    const supabase = createClient()
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      toast.error('حدث خطأ في حذف المشروع')
      console.error('Error deleting project:', error)
    } else {
      setProjects(projects.filter((p) => p.id !== id))
      toast.success('🗑️ تم حذف المشروع بنجاح')
    }
  }

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
    } else {
      setEditingProject(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* ===== الهيدر ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            المشاريع
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1">
            {projects.length} مشاريع نشطة
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
        >
          <Plus className="w-5 h-5" />
          مشروع جديد
        </motion.button>
      </motion.div>

      {/* ===== قائمة المشاريع ===== */}
      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <FolderOpen className="w-20 h-20 text-[var(--text-muted)]/20 mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
            لا توجد مشاريع
          </h3>
          <p className="text-[var(--text-secondary)] font-['Cairo'] mt-2">
            ابدأ بإضافة مشروعك الأول لتنظيم مهامك
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {projects.map((project, index) => (
              <div key={project.id} data-aos="fade-up" data-aos-delay={index * 50 + 100}>
                <ProjectCard
                  project={project}
                  onDelete={handleDeleteProject}
                  onEdit={handleOpenModal}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ===== مودال الإضافة/التعديل ===== */}
      <AnimatePresence>
        <ProjectModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={editingProject ? handleEditProject : handleAddProject}
          editingProject={editingProject}
          isLoading={isSaving}
        />
      </AnimatePresence>
    </div>
  )
}