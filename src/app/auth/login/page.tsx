'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('LOGIN ERROR:', error)

      setError(error.message)
      setLoading(false)

      return
    }

    console.log('LOGIN SUCCESS:', data.user?.email)

    /*
     * مهم:
     * signInWithPassword مع createBrowserClient
     * سيحفظ الـ session بالطريقة المناسبة.
     *
     * بعد ذلك نعمل refresh للـ Router
     * حتى يقرأ السيرفر الـ cookies الجديدة.
     */

    router.replace('/dashboard')
    router.refresh()
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-[#0b1a2e] p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <h1 className="mb-8 text-center text-3xl font-bold text-[#D4AF37]">
          جَدْوَلِي
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37]"
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder:text-white/40 outline-none focus:border-[#D4AF37]"
          />

          {error && (
            <p className="text-center text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#D4AF37] py-3 font-bold text-[#0b1a2e] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-400">
          ليس لديك حساب؟{' '}
          <Link
            href="/auth/signup"
            className="text-[#D4AF37] hover:underline"
          >
            أنشئ حسابًا
          </Link>
        </p>
      </div>
    </main>
  )
}