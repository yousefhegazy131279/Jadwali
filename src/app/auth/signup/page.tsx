'use client'

import { useState } from 'react'
import { useSupabase } from '@/lib/supabaseProvider'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const { supabase } = useSupabase()
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
     // داخل دالة handleSignup، في options:
options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // إذا كان المستخدم موجوداً بالفعل (ولكن غير مؤكد)
    if (data?.user && data.user.identities?.length === 0) {
      setError('هذا البريد الإلكتروني مستخدم بالفعل. يرجى تسجيل الدخول أو استعادة كلمة المرور.')
      setLoading(false)
      return
    }

    // نجاح التسجيل
    setSuccess(true)
    setLoading(false)

    // حفظ البريد في حالة الرغبة في إعادة إرسال التأكيد
    // نترك للمستخدم خيار إعادة الإرسال
  }

  const handleResendConfirmation = async () => {
    if (!email) return
    setResendLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login?confirmed=true`,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      alert('تم إعادة إرسال رابط التأكيد إلى بريدك الإلكتروني.')
    }
    setResendLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1a2e] p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#D4AF37]">جَدْوَلِي</h1>
          <p className="text-gray-400 mt-2">ابدأ رحلة التنظيم</p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center text-green-400 bg-green-500/10 p-4 rounded-xl">
              <Mail className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">تم إنشاء الحساب!</p>
              <p className="text-sm text-gray-400 mt-1">
                تم إرسال رابط تأكيد إلى بريدك الإلكتروني.
                <br />
                يرجى فتح البريد والنقر على الرابط لتأكيد حسابك.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="flex-1 bg-white/10 text-white py-2 rounded-xl font-medium hover:bg-white/20 transition disabled:opacity-50"
              >
                {resendLoading ? 'جاري...' : 'إعادة إرسال رابط التأكيد'}
              </button>
              <Link
                href="/auth/login"
                className="flex-1 bg-[#D4AF37] text-[#0b1a2e] py-2 rounded-xl font-bold text-center hover:shadow-lg transition"
              >
                تسجيل الدخول
              </Link>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] transition"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] transition"
                required
                minLength={6}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg flex items-center gap-2 justify-center"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] text-[#0b1a2e] py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#0b1a2e] border-t-transparent" />
                  جاري...
                </div>
              ) : (
                'إنشاء حساب'
              )}
            </motion.button>

            <p className="text-center text-xs text-gray-500">
              ستصلك رسالة تأكيد على بريدك الإلكتروني
            </p>
          </form>
        )}

        <p className="text-center text-gray-400 mt-6">
          لديك حساب؟{' '}
          <Link href="/auth/login" className="text-[#D4AF37] hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </motion.div>
    </div>
  )
}