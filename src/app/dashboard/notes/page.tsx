'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  StickyNote,
  Sparkles,
  CalendarDays,
  Clock,
  Check,
  FileText,
  PenLine,
} from 'lucide-react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

type Note = {
  id: string
  user_id: string
  content: string
  updated_at: string
  created_at: string
}

// ============================================================
//  مكون بطاقة الملاحظة
// ============================================================
function NoteCard({
  note,
  onDelete,
  onEdit,
  index,
}: {
  note: Note
  onDelete: (id: string) => void
  onEdit: (note: Note) => void
  index: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  const preview = note.content.length > 120 ? note.content.slice(0, 120) + '...' : note.content
  const date = new Date(note.updated_at)
  const formattedDate = format(date, 'd MMMM yyyy', { locale: ar })
  const formattedTime = format(date, 'HH:mm')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
      whileHover={{ y: -6, scale: 1.01 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-6 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      {/* خلفية متدرجة */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        {/* الرأس */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-['Cairo'] flex items-center gap-2">
                <CalendarDays className="w-3 h-3" />
                {formattedDate}
                <Clock className="w-3 h-3 mr-2" />
                {formattedTime}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(note)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-colors"
              title="تعديل الملاحظة"
            >
              <Edit2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(note.id)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-400 transition-colors"
              title="حذف الملاحظة"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="mt-2">
          {preview ? (
            <p className="text-[var(--text-primary)] font-['Cairo'] leading-relaxed whitespace-pre-wrap">
              {preview}
            </p>
          ) : (
            <p className="text-[var(--text-muted)] font-['Cairo'] italic">ملاحظة فارغة</p>
          )}
        </div>

        {/* عدد الكلمات */}
        <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
            {note.content.split(/\s+/).filter(Boolean).length} كلمة
          </span>
          <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
            {note.content.length} حرف
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
//  مودال إضافة/تعديل ملاحظة
// ============================================================
function NoteModal({
  isOpen,
  onClose,
  onSave,
  editingNote,
  isLoading,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (content: string) => Promise<void>
  editingNote?: Note | null
  isLoading: boolean
}) {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (editingNote) {
      setContent(editingNote.content)
    } else {
      setContent('')
    }
  }, [editingNote, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim().length < 1) {
      toast.error('الرجاء كتابة محتوى الملاحظة')
      return
    }
    await onSave(content.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3, type: 'spring' }}
        className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#D4AF37]/20">
              {editingNote ? (
                <Edit2 className="w-5 h-5 text-[#D4AF37]" />
              ) : (
                <PenLine className="w-5 h-5 text-[#D4AF37]" />
              )}
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
              {editingNote ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
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
              المحتوى
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all duration-300 font-['Cairo'] resize-none"
              dir="rtl"
              autoFocus
            />
            <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)] font-['Cairo']">
              <span>{content.split(/\s+/).filter(Boolean).length} كلمة</span>
              <span>{content.length} حرف</span>
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
              disabled={isLoading || content.trim().length < 1}
              className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {editingNote ? 'تحديث' : 'حفظ'}
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
//  الصفحة الرئيسية للملاحظات
// ============================================================
export default function NotesPage() {
  const { user } = useSupabase()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      mirror: true,
    })

    if (user) {
      fetchNotes()
    }
  }, [user])

  const fetchNotes = async () => {
    if (!user) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('حدث خطأ في تحميل الملاحظات')
      console.error(error)
    } else {
      setNotes(data || [])
    }
    setLoading(false)
  }

  const handleAddNote = async (content: string) => {
    if (!user) return

    setIsSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        content: content,
      })
      .select()
      .single()

    if (error) {
      toast.error('حدث خطأ في إضافة الملاحظة')
      console.error(error)
    } else {
      setNotes([data, ...notes])
      toast.success('✅ تم إضافة الملاحظة بنجاح')
      setIsModalOpen(false)
    }
    setIsSaving(false)
  }

  const handleEditNote = async (content: string) => {
    if (!user || !editingNote) return

    setIsSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('notes')
      .update({
        content: content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingNote.id)
      .select()
      .single()

    if (error) {
      toast.error('حدث خطأ في تعديل الملاحظة')
      console.error(error)
    } else {
      setNotes(notes.map((n) => (n.id === editingNote.id ? data : n)))
      toast.success('✅ تم تعديل الملاحظة بنجاح')
      setIsModalOpen(false)
      setEditingNote(null)
    }
    setIsSaving(false)
  }

  const handleDeleteNote = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return

    const supabase = createClient()
    const { error } = await supabase.from('notes').delete().eq('id', id)

    if (error) {
      toast.error('حدث خطأ في حذف الملاحظة')
      console.error(error)
    } else {
      setNotes(notes.filter((n) => n.id !== id))
      toast.success('🗑️ تم حذف الملاحظة')
    }
  }

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
    } else {
      setEditingNote(null)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingNote(null)
  }

  const totalNotes = notes.length
  const totalWords = notes.reduce((sum, n) => sum + n.content.split(/\s+/).filter(Boolean).length, 0)
  const totalChars = notes.reduce((sum, n) => sum + n.content.length, 0)

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
            الملاحظات
          </h1>
          <p className="text-[var(--text-secondary)] text-sm font-['Cairo'] mt-1 flex items-center gap-3">
            <span>📝 {totalNotes} ملاحظة</span>
            <span className="text-[#D4AF37]">📊 {totalWords} كلمة</span>
            <span className="text-emerald-400">✏️ {totalChars} حرف</span>
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
        >
          <Plus className="w-5 h-5" />
          ملاحظة جديدة
        </motion.button>
      </motion.div>

      {/* ===== قائمة الملاحظات ===== */}
      {notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <StickyNote className="w-20 h-20 text-[var(--text-muted)]/20 mb-4" />
          <h3 className="text-xl font-bold text-[var(--text-primary)] font-['Amiri']">
            لا توجد ملاحظات
          </h3>
          <p className="text-[var(--text-secondary)] font-['Cairo'] mt-2">
            ابدأ بإضافة ملاحظاتك لتنظيم أفكارك
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenModal()}
            className="mt-6 px-8 py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 font-['Cairo']"
          >
            <Plus className="w-5 h-5 inline ml-2" />
            أضف ملاحظة
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {notes.map((note, index) => (
              <div key={note.id} data-aos="fade-up" data-aos-delay={index * 50 + 100}>
                <NoteCard
                  note={note}
                  onDelete={handleDeleteNote}
                  onEdit={handleOpenModal}
                  index={index}
                />
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ===== مودال الإضافة/التعديل ===== */}
      <AnimatePresence>
        <NoteModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={editingNote ? handleEditNote : handleAddNote}
          editingNote={editingNote}
          isLoading={isSaving}
        />
      </AnimatePresence>
    </div>
  )
}