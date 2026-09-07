'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useSupabase } from '@/lib/supabaseProvider'
import { toast } from 'sonner'
import {
  Users,
  Calendar,
  ListChecks,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Loader2,
  X,
  Eye,
  Mail,
  User as UserIcon,
  Trash2,
  Ban,
  Check,
  Search,
  Download,
  Send,
  Activity,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  created_at: string
}

type ScheduleSummary = {
  id: string
  user_id: string
  title: string
  day: string
  start_time: string | null
  taskCount: number
  completedSessions: number
}

type UserStats = {
  profile: Profile
  totalSchedules: number
  totalTasks: number
  completedTasks: number
  schedules: ScheduleSummary[]
}

export default function AdminPage() {
  const router = useRouter()
  const { user, isAdmin } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserStats[]>([])
  const [globalStats, setGlobalStats] = useState({
    totalUsers: 0,
    totalSchedules: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalSessions: 0,
    completedSessions: 0,
  })
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)

  useEffect(() => {
    if (isAdmin === null) return
    if (!user) {
      router.replace('/auth/login?next=/admin')
      return
    }
    if (isAdmin === false) {
      toast.error('غير مصرح لك بالوصول')
      router.replace('/dashboard')
      return
    }
    setLoading(false)
    fetchAdminData()
  }, [user, isAdmin, router])

  const fetchAdminData = useCallback(async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      const [
        { data: profiles },
        { data: schedules },
        { data: tasks },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('schedules').select('*'),
        supabase.from('tasks').select('*'),
      ])

      const schedulesData = schedules || []
      const tasksData = tasks || []

      setGlobalStats({
        totalUsers: profiles?.length || 0,
        totalSchedules: schedulesData.length,
        totalTasks: tasksData.length,
        completedTasks: tasksData.filter(t => t.done).length,
        totalSessions: tasksData
          .filter(t => t.type === 'task' && t.duration > 0)
          .reduce((sum, t) => sum + Math.ceil((t.duration || 50) / 50), 0),
        completedSessions: tasksData.reduce((sum, t) => sum + (t.completed_sessions || 0), 0),
      })

      const userStats: UserStats[] = (profiles || []).map(profile => {
        const userSchedules = schedulesData.filter(s => s.user_id === profile.id)
        const userTasks = tasksData.filter(t => t.user_id === profile.id)
        return {
          profile,
          totalSchedules: userSchedules.length,
          totalTasks: userTasks.length,
          completedTasks: userTasks.filter(t => t.done).length,
          schedules: userSchedules.map(s => ({
            id: s.id,
            user_id: s.user_id,
            title: s.title,
            day: s.day,
            start_time: s.start_time,
            taskCount: userTasks.filter(t => t.schedule_id === s.id).length,
            completedSessions: userTasks
              .filter(t => t.schedule_id === s.id)
              .reduce((sum, t) => sum + (t.completed_sessions || 0), 0),
          })),
        }
      })

      setUsers(userStats)
    } catch (error) {
      console.error('Admin fetch error:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم وجميع بياناته نهائيًا؟')) return
    const supabase = createClient()

    try {
      await supabase.from('tasks').delete().eq('user_id', userId)
      await supabase.from('schedules').delete().eq('user_id', userId)
      await supabase.from('prayers').delete().eq('user_id', userId)
      await supabase.from('custom_cards').delete().eq('user_id', userId)
      await supabase.from('notifications').delete().eq('user_id', userId)
      await supabase.from('profiles').delete().eq('id', userId)

      toast.success('تم حذف المستخدم بنجاح')
      fetchAdminData()
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const supabase = createClient()
    const newRole = currentRole === 'admin' ? 'user' : 'admin'

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      toast.error('حدث خطأ في تغيير الدور')
    } else {
      toast.success(`تم تغيير الدور إلى ${newRole === 'admin' ? 'أدمن' : 'مستخدم'}`)
      fetchAdminData()
    }
  }

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('اكتب نص الإشعار')
      return
    }

    const supabase = createClient()
    const notification = {
      title: 'إشعار من الإدارة',
      body: broadcastMessage.trim(),
      type: 'broadcast',
      read: false,
    }

    // إرسال لجميع المستخدمين
    const { error } = await supabase
      .from('notifications')
      .insert(users.map(u => ({ ...notification, user_id: u.profile.id })))

    if (error) {
      toast.error('حدث خطأ في إرسال الإشعار')
    } else {
      toast.success('تم إرسال الإشعار للجميع')
      setBroadcastMessage('')
      setShowBroadcast(false)
    }
  }

  const handleExportUsers = () => {
    const csv = [
      ['ID', 'Email', 'Full Name', 'Role', 'Created At'],
      ...users.map(u => [
        u.profile.id,
        u.profile.email || '',
        u.profile.full_name || '',
        u.profile.role,
        u.profile.created_at,
      ]),
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jadwali-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAllData = () => {
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('schedules').select('*'),
      supabase.from('tasks').select('*'),
    ]).then(([profiles, schedules, tasks]) => {
      const data = {
        exported_at: new Date().toISOString(),
        profiles: profiles.data,
        schedules: schedules.data,
        tasks: tasks.data,
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jadwali-full-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  const filteredUsers = users.filter(u =>
    u.profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6" dir="rtl">
      {/* الهيدر */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            لوحة الأدمن
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors font-['Cairo'] border border-[#D4AF37]/30"
          >
            <Send className="w-4 h-4" />
            إشعار جماعي
          </button>
          <button
            onClick={handleExportUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors font-['Cairo'] border border-[var(--border-color)]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير المستخدمين
          </button>
          <button
            onClick={handleExportAllData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 transition-colors font-['Cairo'] border border-[var(--border-color)]"
          >
            <FileJson className="w-4 h-4" />
            تصدير كامل
          </button>
        </div>
      </motion.div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} value={globalStats.totalUsers} label="المستخدمون" color="gold" />
        <StatCard icon={Calendar} value={globalStats.totalSchedules} label="الجداول" color="blue" />
        <StatCard icon={ListChecks} value={globalStats.totalTasks} label="المهام" color="purple" />
        <StatCard icon={CheckCircle} value={globalStats.completedTasks} label="مهام منجزة" color="green" />
        <StatCard icon={Clock} value={globalStats.totalSessions} label="إجمالي الجلسات" color="teal" />
        <StatCard icon={TrendingUp} value={globalStats.completedSessions} label="جلسات منجزة" color="red" />
      </div>

      {/* البحث */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="ابحث عن مستخدم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] font-['Cairo']"
        />
      </div>

      {/* قائمة المستخدمين */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5">
        <h2 className="text-xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-4">
          المستخدمون ({filteredUsers.length})
        </h2>
        <div className="space-y-2">
          {filteredUsers.map((userStat) => (
            <motion.div
              key={userStat.profile.id}
              whileHover={{ x: 4 }}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 rounded-full bg-[#D4AF37]/10">
                  <UserIcon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="font-bold text-[var(--text-primary)] font-['Cairo']">
                    {userStat.profile.full_name || 'بدون اسم'}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-['Cairo'] flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {userStat.profile.email}
                  </div>
                </div>
                {userStat.profile.role === 'admin' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] font-['Cairo']">
                    أدمن
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-sm text-[var(--text-secondary)] font-['Cairo'] mx-4">
                <span>{userStat.totalSchedules} جدول</span>
                <span>{userStat.totalTasks} مهمة</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUser(userStat)}
                  className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-secondary)]"
                  title="عرض الجداول"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleAdmin(userStat.profile.id, userStat.profile.role)}
                  className={`p-2 rounded-lg hover:bg-white/10 ${userStat.profile.role === 'admin' ? 'text-yellow-500' : 'text-blue-400'}`}
                  title={userStat.profile.role === 'admin' ? 'إزالة صلاحية الأدمن' : 'ترقية لأدمن'}
                >
                  <Shield className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteUser(userStat.profile.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400"
                  title="حذف المستخدم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* نافذة عرض جداول المستخدم */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold font-['Amiri'] text-[var(--text-primary)]">
                  جداول {selectedUser.profile.full_name || selectedUser.profile.email}
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedUser.schedules.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] font-['Cairo'] py-8">
                  لا توجد جداول
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedUser.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-primary)] font-['Cairo']">
                          {schedule.title}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
                          {new Date(schedule.day).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-[var(--text-secondary)] font-['Cairo']">
                        <span>{schedule.taskCount} مهمة</span>
                        <span>{schedule.completedSessions} جلسة منجزة</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* نافذة الإشعار الجماعي */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowBroadcast(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold font-['Amiri'] text-[var(--text-primary)]">
                  إرسال إشعار جماعي
                </h3>
                <button
                  onClick={() => setShowBroadcast(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-secondary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="نص الإشعار..."
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4AF37] font-['Cairo'] min-h-[120px]"
              />
              <button
                onClick={handleSendBroadcast}
                className="mt-4 w-full py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all font-['Cairo'] flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                إرسال للجميع
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ icon: Icon, value, label, color = 'gold' }: any) {
  const colors: any = {
    gold: 'from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37]',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    green: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
    red: 'from-red-500/20 to-red-500/5 text-red-400',
    teal: 'from-teal-500/20 to-teal-500/5 text-teal-400',
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`p-5 rounded-2xl bg-gradient-to-br ${colors[color]} bg-[var(--bg-card)] border border-[var(--border-color)]`}
    >
      <Icon className="w-8 h-8 mb-3" />
      <div className="text-3xl font-bold text-[var(--text-primary)] font-['Amiri']">{value}</div>
      <div className="text-sm text-[var(--text-secondary)] font-['Cairo']">{label}</div>
    </motion.div>
  )
}