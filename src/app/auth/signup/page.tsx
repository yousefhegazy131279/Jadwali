'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { toast } from 'sonner'
import { Loader2, UserPlus, Mail, Lock, User, Globe } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export default function SignupPage() {
  const { t: tr, language } = useLanguage()

  const router = useRouter()
  const { supabase } = useSupabase()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error(tr('أكمل جميع الحقول'))
      return
    }
    if (password.length < 6) {
      toast.error(tr('كلمة المرور يجب أن تكون 6 أحرف على الأقل'))
      return
    }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
        emailRedirectTo: 'https://jadwaly-hgz.vercel.app/auth/callback',
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else if (data.session) {
      toast.success(tr('تم إنشاء الحساب!'))
      router.push('/dashboard')
      router.refresh()
    } else {
      toast.success(tr('تم إنشاء الحساب! تحقق من بريدك لتأكيده'))
      router.push('/auth/login')
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://jadwaly-hgz.vercel.app/auth/callback',
      },
    })

    if (error) {
      toast.error(tr('حدث خطأ أثناء الاتصال بجوجل'))
      console.error(error)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[var(--bg-card)] backdrop-blur-xl rounded-2xl border border-[var(--border-color)] p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)]">
            {tr(" إنشاء حساب ")}</h1>
          <p className="text-[var(--text-secondary)] font-['Cairo'] mt-2">
            {tr(" انضم إلى جَدْوَلِي وابدأ رحلتك ")}</p>
        </div>

        {/* زر Google */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full py-3 rounded-xl bg-white text-gray-800 font-bold font-['Cairo'] flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 transition-colors mb-4 disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Globe className="w-5 h-5 text-blue-500" />
          )}
          {tr(" المتابعة باستخدام Google ")}</button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[var(--border-color)]" />
          <span className="text-[var(--text-muted)] font-['Cairo'] text-sm">{tr("أو")}</span>
          <div className="flex-1 h-px bg-[var(--border-color)]" />
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
              {tr(" الاسم الكامل ")}</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all font-['Cairo']"
                placeholder={tr("اسمك الكامل")}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
              {tr(" البريد الإلكتروني ")}</label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all font-['Cairo']"
                placeholder="example@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--text-secondary)] font-['Cairo'] mb-2">
              {tr(" كلمة المرور ")}</label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] transition-all font-['Cairo']"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-[#0b1a2e] font-bold hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all font-['Cairo'] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {tr(" إنشاء الحساب ")}</button>
        </form>

        <p className="text-center text-[var(--text-secondary)] font-['Cairo'] text-sm mt-6">
          {tr(" لديك حساب بالفعل؟")}{' '}
          <Link href="/auth/login" className="text-[#D4AF37] hover:underline">
            {tr(" تسجيل الدخول ")}</Link>
        </p>
      </motion.div>
    </div>
  )
}