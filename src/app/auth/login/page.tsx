'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSupabase } from '@/lib/supabaseProvider'
import { toast } from 'sonner'
import {
  Loader2, LogIn, Mail, Lock, Eye, EyeOff, Shield, Sparkles,
  CheckCircle2, Zap, Brain, Heart, TrendingUp, ArrowLeft,
  AlertCircle, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

/* ============================================================
   خلفية الجزيئات
   ============================================================ */
function BackgroundDecor() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* هالات ضبابية */}
      <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/8 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-purple-500/8 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      {/* جزيئات ذهبية */}
      {Array.from({ length: 20 }).map((_, i) => {
        const size = Math.random() * 3 + 1
        const left = Math.random() * 100
        const top = Math.random() * 100
        const delay = Math.random() * 5
        const duration = Math.random() * 3 + 4
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute rounded-full bg-[#D4AF37]"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              top: `${top}%`,
            }}
          />
        )
      })}
    </div>
  )
}

/* ============================================================
   ميزة تسويقية
   ============================================================ */
function FeatureItem({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: typeof Zap
  title: string
  desc: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="group flex items-start gap-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5 text-[#D4AF37] shadow-md transition-all group-hover:scale-110">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-['Cairo'] text-sm font-bold text-[var(--text-primary)]">
          {title}
        </div>
        <div className="mt-0.5 font-['Cairo'] text-xs leading-relaxed text-[var(--text-secondary)]">
          {desc}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function LoginPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const { supabase } = useSupabase()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error(t('أدخل البريد الإلكتروني وكلمة المرور', 'Enter email and password'))
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      toast.error(
        error.message === 'Invalid login credentials'
          ? t('بيانات الدخول غير صحيحة', 'Invalid credentials')
          : error.message
      )
      setLoading(false)
    } else {
      toast.success(t('تم تسجيل الدخول بنجاح', 'Signed in successfully'))
      router.push('/dashboard')
      router.refresh()
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://jadwaly-hgz.vercel.app/auth/callback' },
    })
    if (error) {
      toast.error(t('حدث خطأ أثناء الاتصال بجوجل', 'Google sign-in error'))
      console.error(error)
      setGoogleLoading(false)
    }
  }

  const features = [
    {
      icon: Brain,
      titleAr: 'جدولة ذكية',
      titleEn: 'Smart scheduling',
      descAr: 'مخطط ذكي يحوّل مهامك إلى جدول منظم',
      descEn: 'Turn tasks into an organized schedule',
    },
    {
      icon: Heart,
      titleAr: 'توازن روحي',
      titleEn: 'Spiritual balance',
      descAr: 'دمج الصلوات والأذكار في يومك',
      descEn: 'Integrate prayers and adhkar',
    },
    {
      icon: TrendingUp,
      titleAr: 'إحصائيات دقيقة',
      titleEn: 'Accurate analytics',
      descAr: 'تابع تقدمك يوماً بيوم',
      descEn: 'Track your progress daily',
    },
  ]

  return (
    <div
      className="relative flex min-h-screen bg-[var(--bg-primary)]"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <BackgroundDecor />

      {/* ============ يسار: العلامة التسويقية (Desktop) ============ */}
      <motion.aside
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative hidden w-1/2 flex-col justify-between border-e border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 p-10 lg:flex xl:p-14"
      >
        {/* الهالات */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-purple-500/8 blur-3xl" />

        {/* الرأس */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="h-14 w-14"
            >
              <Logo />
            </motion.div>
            <div>
              <div className="font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
                جَدْوَلِي
              </div>
              <div className="inline-flex items-center gap-1.5 font-['Cairo'] text-[10px] text-[#D4AF37]">
                <Sparkles className="h-2.5 w-2.5" />
                {t('منظّمك الذكي', 'Smart organizer')}
              </div>
            </div>
          </Link>
        </div>

        {/* الوسط */}
        <div className="relative my-12 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h2 className="mb-4 font-['Amiri'] text-4xl font-bold leading-tight text-[var(--text-primary)] xl:text-5xl">
              {t('خطط يومك،', 'Plan your day,')}
              <br />
              <span className="bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#D4AF37] bg-clip-text text-transparent">
                {t('أنجز مهامك،', 'achieve your goals,')}
              </span>
              <br />
              {t('عش حياتك.', 'live your life.')}
            </h2>
            <p className="max-w-md font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)]">
              {t(
                'انضم إلى آلاف المستخدمين العرب الذين ينظمون وقتهم بذكاء مع جَدْوَلِي — حيث تلتقي الإنتاجية بالروحانية.',
                'Join thousands of Arabic users organizing their time smartly with Jadwali — where productivity meets spirituality.'
              )}
            </p>
          </motion.div>

          {/* المميزات */}
          <div className="space-y-5">
            {features.map((f, i) => (
              <FeatureItem
                key={i}
                icon={f.icon}
                title={t(f.titleAr, f.titleEn)}
                desc={t(f.descAr, f.descEn)}
                delay={0.35 + i * 0.1}
              />
            ))}
          </div>
        </div>

        {/* الفوتر */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative flex items-center gap-3"
        >
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {['A', 'M', 'S', 'Y'].map((c, i) => (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-card)] font-['Cairo'] text-[10px] font-bold text-white shadow-md ${
                  ['bg-gradient-to-br from-rose-400 to-pink-600',
                    'bg-gradient-to-br from-amber-400 to-orange-500',
                    'bg-gradient-to-br from-emerald-400 to-teal-500',
                    'bg-gradient-to-br from-sky-400 to-blue-600'][i]
                }`}
              >
                {c}
              </div>
            ))}
            <div className="flex h-8 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-[var(--bg-secondary)] px-2 font-['Cairo'] text-[10px] font-bold text-[var(--text-secondary)]">
              +1K
            </div>
          </div>
          <div className="font-['Cairo'] text-xs text-[var(--text-muted)]">
            {t('انضم إلينا اليوم', 'Join us today')}
          </div>
        </motion.div>
      </motion.aside>

      {/* ============ يمين: النموذج ============ */}
      <div className="relative flex w-full flex-1 items-center justify-center p-6 lg:w-1/2 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 300 }}
          className="relative w-full max-w-md"
        >
          {/* الشعار على الجوال */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 h-20 w-20">
              <Logo />
            </div>
          </div>

          {/* شارة علوية */}
          <div className="mb-3 flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-[#D4AF37]">
              <Shield className="h-3 w-3" />
              {t('تسجيل دخول آمن', 'Secure sign-in')}
            </div>
          </div>

          {/* العنوان */}
          <div className="mb-8 text-center">
            <h1 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('مرحباً بعودتك', 'Welcome back')}
            </h1>
            <p className="mt-2 font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t('سجّل دخولك لمتابعة رحلتك', 'Sign in to continue your journey')}
            </p>
          </div>

          {/* البطاقة */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            {/* شريط علوي ذهبي */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            {/* زر Google */}
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-white px-4 py-3.5 font-['Cairo'] text-sm font-bold text-gray-800 shadow-md transition-all hover:shadow-lg disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {t('المتابعة باستخدام Google', 'Continue with Google')}
            </motion.button>

            {/* فاصل */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
              <span className="font-['Cairo'] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {t('أو', 'Or')}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />
            </div>

            {/* النموذج */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* البريد */}
              <div>
                <label className="mb-2 block font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
                  {t('البريد الإلكتروني', 'Email')}
                </label>
                <div className="relative">
                  <Mail
                    className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ltr:left-3 rtl:right-3 ${
                      focusedField === 'email' ? 'text-[#D4AF37]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="example@email.com"
                    required
                    dir="ltr"
                    className={`w-full rounded-xl border bg-[var(--bg-secondary)] py-3 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:outline-none ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 ${
                      focusedField === 'email'
                        ? 'border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                        : 'border-[var(--border-color)]'
                    }`}
                  />
                </div>
              </div>

              {/* كلمة المرور */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-['Cairo'] text-xs font-bold text-[var(--text-secondary)]">
                    {t('كلمة المرور', 'Password')}
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="font-['Cairo'] text-[10px] font-bold text-[#D4AF37] transition-colors hover:text-[#E8C84A]"
                  >
                    {t('نسيت كلمة المرور؟', 'Forgot password?')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ltr:left-3 rtl:right-3 ${
                      focusedField === 'password' ? 'text-[#D4AF37]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    required
                    dir="ltr"
                    className={`w-full rounded-xl border bg-[var(--bg-secondary)] py-3 font-['Cairo'] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:outline-none ltr:pl-9 ltr:pr-10 rtl:pr-9 rtl:pl-10 ${
                      focusedField === 'password'
                        ? 'border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                        : 'border-[var(--border-color)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-white/5 hover:text-[#D4AF37] ltr:right-2 rtl:left-2"
                    aria-label={showPassword ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* زر تسجيل الدخول */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.99 }}
                className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#D4AF37] px-6 py-3.5 font-['Cairo'] text-sm font-bold text-[#0b1a2e] shadow-lg shadow-[#D4AF37]/30 transition-all hover:shadow-xl hover:shadow-[#D4AF37]/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {/* لمعان */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
                  className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ transform: 'skewX(-20deg)' }}
                />
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('جارٍ الدخول…', 'Signing in…')}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    {t('تسجيل الدخول', 'Sign in')}
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1 ltr:rotate-180 rtl:rotate-0" />
                  </>
                )}
              </motion.button>
            </form>

            {/* فاصل */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border-color)]" />
            </div>

            {/* رابط التسجيل */}
            <div className="text-center">
              <p className="font-['Cairo'] text-xs text-[var(--text-secondary)]">
                {t('ليس لديك حساب؟', "Don't have an account?")}
              </p>
              <Link
                href="/auth/signup"
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 px-4 py-2 font-['Cairo'] text-xs font-bold text-[#D4AF37] transition-all hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/10"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t('أنشئ حساباً مجاناً', 'Create a free account')}
              </Link>
            </div>
          </div>

          {/* الفوتر */}
          <div className="mt-6 flex items-center justify-center gap-3 font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{t('بيانات مشفّرة', 'Encrypted')}</span>
            </div>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-500" />
              <span>{t('حماية RLS', 'RLS protected')}</span>
            </div>
            <span className="text-white/10">•</span>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-[#D4AF37]" />
              <span>{t('سريع ومجاني', 'Fast & free')}</span>
            </div>
          </div>

          {/* تنبيه أمان */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-4 flex items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5"
          >
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" />
            <p className="font-['Cairo'] text-[10px] leading-relaxed text-sky-300/80">
              {t(
                'لا نشارك بريدك الإلكتروني مع أي طرف ثالث. حسابك محمي بـ Supabase Auth.',
                'We never share your email with third parties. Your account is protected by Supabase Auth.'
              )}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}