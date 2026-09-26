'use client'

import { useLanguage } from '@/context/LanguageContext'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import AOS from 'aos'
import 'aos/dist/aos.css'
import {
  Target, Eye, Heart, Zap, Clock, Brain, Sparkles, ArrowRight,
  Quote, ChevronDown, User, Home, MessageCircle, Mail, Phone,
  Send, Copy, Check, MapPin, ExternalLink, HeadphonesIcon,
  HelpCircle, Star, Award, Users, Rocket, Shield,
} from 'lucide-react'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaGithub, FaWhatsapp } from 'react-icons/fa'
import { toast } from 'sonner'

/* ============================================================
   البيانات
   ============================================================ */
const FEATURES = [
  {
    icon: Clock,
    titleAr: 'إدارة الوقت',
    titleEn: 'Time management',
    descAr: 'نظام بومودورو مرن يساعدك على تنظيم وقتك بين العمل والراحة بذكاء.',
    descEn: 'A flexible Pomodoro system that organizes work and rest smartly.',
    accent: '#D4AF37',
  },
  {
    icon: Brain,
    titleAr: 'جدولة ذكية',
    titleEn: 'Smart scheduling',
    descAr: 'مخطط ذكي يحوّل مهامك اليومية إلى جدول منظم مع مراعاة أوقات الصلاة.',
    descEn: 'A smart planner that turns tasks into an organized schedule including prayer times.',
    accent: '#3B82F6',
  },
  {
    icon: Heart,
    titleAr: 'الجانب الروحي',
    titleEn: 'Spiritual balance',
    descAr: 'دمج الصلوات في جدولك لتحقيق التوازن بين الدنيا والدين.',
    descEn: 'Integrated prayers to balance life and faith.',
    accent: '#10B981',
  },
  {
    icon: Zap,
    titleAr: 'إنتاجية عالية',
    titleEn: 'High productivity',
    descAr: 'تتبع إنجازك اليومي وإحصائيات دقيقة تساعدك على التحسن المستمر.',
    descEn: 'Daily tracking and analytics to keep improving.',
    accent: '#A855F7',
  },
]

const FAQS = [
  {
    qAr: 'هل التطبيق مجاني؟',
    qEn: 'Is the app free?',
    aAr: 'نعم، جميع الميزات الأساسية مجانية بالكامل. أؤمن بأن إدارة الوقت حق للجميع.',
    aEn: 'Yes, all core features are completely free. Time management should be accessible to everyone.',
  },
  {
    qAr: 'هل يمكنني استخدامه على الهاتف؟',
    qEn: 'Can I use it on my phone?',
    aAr: 'بالتأكيد! التطبيق مصمم ليعمل على جميع الأجهزة من هاتفك إلى حاسوبك، ويمكن تثبيته كتطبيق PWA.',
    aEn: 'Absolutely! It works on all devices from phones to computers, and can be installed as a PWA.',
  },
  {
    qAr: 'كيف تعمل الجدولة الذكية؟',
    qEn: 'How does smart scheduling work?',
    aAr: 'تدخل مهامك ومدة كل مهمة، ويقوم التطبيق تلقائياً بتقسيمها إلى جلسات بومودورو مع الراحات المناسبة، ويراعي أوقات الصلاة.',
    aEn: 'Enter your tasks and durations; the app auto-splits them into Pomodoro sessions with proper breaks and prayer times.',
  },
  {
    qAr: 'هل بياناتي آمنة؟',
    qEn: 'Is my data safe?',
    aAr: 'نعم، نستخدم تشفيراً متقدماً وحماية RLS في قاعدة البيانات، ولا يمكن لأي مستخدم آخر الوصول إلى بياناتك.',
    aEn: 'Yes, we use advanced encryption and RLS protection; no other user can access your data.',
  },
]

const SOCIALS = [
  {
    href: 'https://www.facebook.com/ywsf.hjazy.160024',
    icon: FaFacebookF,
    label: 'Facebook',
    color: '#3B82F6',
  },
  {
    href: 'https://www.instagram.com/hgz1312/',
    icon: FaInstagram,
    label: 'Instagram',
    color: '#EC4899',
  },
  {
    href: 'https://www.linkedin.com/in/yousef-hegazy-a0aa13333/',
    icon: FaLinkedinIn,
    label: 'LinkedIn',
    color: '#0EA5E9',
  },
  {
    href: 'https://github.com/yousefhegazy131279',
    icon: FaGithub,
    label: 'GitHub',
    color: '#A855F7',
  },
]

const WHATSAPP_NUMBER = '201117081077'
const WHATSAPP_DISPLAY = '01117081077'
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('مرحباً، لدي استفسار عن تطبيق جَدْوَلِي')}`

const EMAIL = 'yousef.hegazy.dev@gmail.com'

/* ============================================================
   أدوات
   ============================================================ */
const hexToRgba = (hex: string, alpha: number) => {
  const c = (hex || '#D4AF37').replace('#', '')
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ============================================================
   عنصر FAQ
   ============================================================ */
function FAQItem({
  qAr, qEn, aAr, aEn, index, t,
}: {
  qAr: string; qEn: string; aAr: string; aEn: string
  index: number
  t: (ar: string, en?: string) => string
}) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06 }}
      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
        open
          ? 'border-[#D4AF37]/40 bg-gradient-to-br from-[#D4AF37]/5 to-transparent shadow-lg shadow-[#D4AF37]/5'
          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[#D4AF37]/20'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-4 text-start transition-colors sm:p-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold transition-all ${
              open
                ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
            }`}
          >
            {String(index + 1).padStart(2, '0')}
          </div>
          <span className="font-['Cairo'] text-sm font-bold text-[var(--text-primary)] sm:text-base">
            {t(qAr, qEn)}
          </span>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            open ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-white/5 text-[var(--text-muted)]'
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)] sm:px-5 sm:pb-5">
              {t(aAr, aEn)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ============================================================
   بطاقة تواصل
   ============================================================ */
function ContactCard({
  icon: Icon,
  title,
  value,
  href,
  accent,
  delay = 0,
  onCopy,
  copyLabel,
  actionLabel,
}: {
  icon: any
  title: string
  value: string
  href: string
  accent: string
  delay?: number
  onCopy?: () => void
  copyLabel?: string
  actionLabel: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.45 }}
      whileHover={{ y: -4 }}
      className="group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-5 transition-all hover:shadow-xl"
      style={{ borderColor: hexToRgba(accent, 0.2) }}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: accent }}
      />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(accent, 0.25)}, ${hexToRgba(accent, 0.08)})`,
              color: accent,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          {onCopy && (
            <button
              onClick={onCopy}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-all hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
              title={copyLabel}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mb-1 font-['Cairo'] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </div>
        <div className="mb-4 truncate font-mono text-base font-bold text-[var(--text-primary)]">
          {value}
        </div>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group/btn inline-flex items-center gap-1.5 font-['Cairo'] text-xs font-bold transition-colors"
          style={{ color: accent }}
        >
          {actionLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5 rtl:rotate-180 rtl:group-hover/btn:-translate-x-0.5" />
        </a>
      </div>
    </motion.div>
  )
}

/* ============================================================
   الصفحة الرئيسية
   ============================================================ */
export default function AboutPage() {
  const { t, language } = useLanguage()
  const router = useRouter()
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  /* ====== AOS دائم ====== */
  useEffect(() => {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: false,       // يُعاد كل مرة
      mirror: true,      // تأثير عند الصعود والهبوط
      offset: 60,
      delay: 0,
      anchorPlacement: 'top-bottom',
    })
    // Refresh لإعادة الحسابات عند تغيير اللغة
    const t = setTimeout(() => AOS.refresh(), 200)
    return () => clearTimeout(t)
  }, [language])

  const copy = async (text: string, kind: 'phone' | 'email') => {
    try {
      await navigator.clipboard.writeText(text)
      if (kind === 'phone') {
        setCopiedPhone(true)
        setTimeout(() => setCopiedPhone(false), 2000)
      } else {
        setCopiedEmail(true)
        setTimeout(() => setCopiedEmail(false), 2000)
      }
      toast.success(t('تم النسخ', 'Copied'))
    } catch {
      toast.error(t('تعذر النسخ', 'Copy failed'))
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ===== خلفيات هالات ===== */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-[#D4AF37]/5 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute bottom-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* ============ زر العودة ============ */}
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.03, x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/dashboard')}
          className="fixed top-4 z-50 flex h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 px-4 font-['Cairo'] text-xs font-bold text-[var(--text-secondary)] shadow-lg backdrop-blur-xl transition-all hover:border-[#D4AF37]/50 hover:text-[#D4AF37] ltr:left-4 rtl:right-4"
        >
          <Home className="h-3.5 w-3.5" />
          {t('العودة للوحة التحكم', 'Back to dashboard')}
        </motion.button>

        {/* ============ Hero ============ */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 mt-12 text-center sm:mb-20 sm:mt-16"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mx-auto mb-6 h-24 w-24 sm:h-28 sm:w-28"
            data-aos="zoom-in"
          >
            <Logo />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-xs text-[#D4AF37]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('حكايتنا', 'Our story')}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 font-['Amiri'] text-4xl font-bold text-[var(--text-primary)] sm:text-5xl md:text-6xl"
          >
            {t('من نحن', 'About us')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-auto max-w-2xl font-['Cairo'] text-sm text-[var(--text-secondary)] sm:text-base"
          >
            {t(
              'قصة بسيطة بدأت بحاجة شخصية، وتحولت إلى أداة يستفيد منها الجميع.',
              'A simple story that started as a personal need and became a tool for everyone.'
            )}
          </motion.p>
        </motion.section>

        {/* ============ القصة الشخصية ============ */}
        <section className="mb-20" data-aos="fade-up">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10">
            <div data-aos="fade-left" data-aos-delay="100">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-[#D4AF37]">
                <User className="h-3 w-3" />
                {t('القصة', 'The story')}
              </div>
              <h2 className="mb-6 font-['Amiri'] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                {t('قصتي مع جَدْوَلِي', 'My journey with Jadwali')}
              </h2>
              <div className="space-y-4 font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                <p>
                  {t(
                    'لم يبدأ جَدْوَلِي كشركة أو فريق كبير، بل بدأ كحاجة شخصية بحتة. كنت أبحث عن طريقة لتنظيم وقتي بين العمل والدراسة والعبادة، فوجدت أن التطبيقات المتاحة إما معقدة أو تهمل الجانب الروحي.',
                    'Jadwali didn\u2019t start as a company or a big team, but as a personal need. I was looking for a way to organize my time between work, study, and worship — most apps were either complex or ignored the spiritual side.'
                  )}
                </p>
                <p>
                  {t(
                    'قررت أن أبني أداة بسيطة تناسب احتياجاتي: جدول ذكي يجمع مهامي اليومية مع أوقات الصلاة، ونظام بومودورو يساعدني على التركيز.',
                    'So I built a simple tool that fits my needs: a smart schedule combining daily tasks with prayer times, and a Pomodoro system for focus.'
                  )}
                </p>
                <p>
                  {t(
                    'بعد أن استخدمتها بنفسي ورأيت كيف غيّرت إنتاجيتي، أدركت أن هناك الكثيرين مثلي يحتاجون إلى هذه الأداة. فقررت نشرها ليفيد الجميع.',
                    'After using it myself and seeing how it transformed my productivity, I realized many others need it too. So I decided to share it with everyone.'
                  )}
                </p>
                <p className="font-bold text-[#D4AF37]">
                  {t(
                    'اليوم، جَدْوَلِي متاح للجميع مجاناً، وما زلت أطورها بنفسي بشغف.',
                    'Today, Jadwali is available for free to everyone, and I\u2019m still developing it with passion.'
                  )}
                </p>
              </div>
            </div>

            <div data-aos="fade-right" data-aos-delay="200">
              <motion.div
                whileHover={{ y: -4 }}
                className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/8 via-[var(--bg-card)] to-[var(--bg-card)] p-7 shadow-xl sm:p-8"
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#D4AF37]/15 blur-3xl" />

                <Quote className="mb-5 h-12 w-12 text-[#D4AF37]/60" />
                <p className="relative font-['Amiri'] text-lg leading-relaxed text-[var(--text-primary)] sm:text-xl">
                  {t(
                    '"صنعتُ هذه الأداة لنفسي أولاً، واليوم أشاركها معك لأنني أعلم أنها ستفيدك كما أفادتني."',
                    '"I built this tool for myself first, and today I share it with you because I know it will help you as it helped me."'
                  )}
                </p>

                <div className="mt-6 flex items-center gap-3 border-t border-[#D4AF37]/15 pt-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] font-['Cairo'] text-lg font-bold text-[#0b1a2e] shadow-lg">
                    H
                  </div>
                  <div>
                    <div className="font-['Cairo'] text-sm font-bold text-[#D4AF37]">
                      HGZ
                    </div>
                    <div className="font-['Cairo'] text-[11px] text-[var(--text-muted)]">
                      {t('المؤسس والمطوّر', 'Founder & Developer')}
                    </div>
                  </div>
                  <div className="ms-auto flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============ الرؤية والرسالة ============ */}
        <section className="mb-20">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2" data-aos="fade-up">
            {[
              {
                icon: Eye,
                titleAr: 'رؤيتنا',
                titleEn: 'Our vision',
                descAr: 'أن تكون جَدْوَلِي الأداة العربية الأولى التي تجمع بين الإنتاجية والروحانية ببساطة وفعالية.',
                descEn: 'To make Jadwali the leading Arabic tool that elegantly blends productivity and spirituality.',
                accent: '#3B82F6',
              },
              {
                icon: Target,
                titleAr: 'رسالتنا',
                titleEn: 'Our mission',
                descAr: 'توفير أداة مجانية وسهلة تساعد كل شخص على تنظيم يومه دون تعقيد، مع احترام الجانب الروحي.',
                descEn: 'Provide a free, simple tool that helps everyone organize their day without complexity, honoring the spiritual side.',
                accent: '#D4AF37',
              },
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={i}
                  data-aos={i === 0 ? 'fade-right' : 'fade-left'}
                  data-aos-delay={100 + i * 100}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-3xl border bg-[var(--bg-card)] p-6 transition-all hover:shadow-xl sm:p-7"
                  style={{ borderColor: hexToRgba(item.accent, 0.2) }}
                >
                  <div
                    className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
                    style={{ background: item.accent }}
                  />
                  <div className="relative">
                    <div
                      className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${hexToRgba(item.accent, 0.25)}, ${hexToRgba(item.accent, 0.08)})`,
                        color: item.accent,
                      }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 font-['Amiri'] text-2xl font-bold text-[var(--text-primary)]">
                      {t(item.titleAr, item.titleEn)}
                    </h3>
                    <p className="font-['Cairo'] text-sm leading-relaxed text-[var(--text-secondary)]">
                      {t(item.descAr, item.descEn)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ============ المميزات ============ */}
        <section className="mb-20">
          <div className="mb-10 text-center" data-aos="fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-[#D4AF37]">
              <Sparkles className="h-3 w-3" />
              {t('المميزات', 'Features')}
            </div>
            <h2 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('لماذا جَدْوَلِي؟', 'Why Jadwali?')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={i}
                  data-aos="zoom-in-up"
                  data-aos-delay={i * 100}
                  whileHover={{ y: -6 }}
                  className="group relative overflow-hidden rounded-2xl border bg-[var(--bg-card)] p-5 transition-all hover:shadow-xl"
                  style={{ borderColor: hexToRgba(f.accent, 0.2) }}
                >
                  <div
                    className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25"
                    style={{ background: f.accent }}
                  />
                  <div className="relative">
                    <div
                      className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
                      style={{
                        background: `linear-gradient(135deg, ${hexToRgba(f.accent, 0.25)}, ${hexToRgba(f.accent, 0.08)})`,
                        color: f.accent,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-['Cairo'] text-base font-bold text-[var(--text-primary)]">
                      {t(f.titleAr, f.titleEn)}
                    </h3>
                    <p className="font-['Cairo'] text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
                      {t(f.descAr, f.descEn)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* ============ الأسئلة الشائعة ============ */}
        <section className="mb-20">
          <div className="mb-10 text-center" data-aos="fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-[#D4AF37]">
              <HelpCircle className="h-3 w-3" />
              {t('أسئلة متكررة', 'FAQ')}
            </div>
            <h2 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('الأسئلة الشائعة', 'Frequently asked questions')}
            </h2>
            <p className="mt-3 font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t('إجابات لأكثر ما يسأل عنه المستخدمون', 'Answers to the most common questions')}
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-3" data-aos="fade-up" data-aos-delay="100">
            {FAQS.map((faq, i) => (
              <FAQItem
                key={i}
                qAr={faq.qAr}
                qEn={faq.qEn}
                aAr={faq.aAr}
                aEn={faq.aEn}
                index={i}
                t={t}
              />
            ))}
          </div>
        </section>

        {/* ============ قسم التواصل ============ */}
        <section className="mb-16" id="contact">
          <div className="mb-10 text-center" data-aos="fade-up">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-['Cairo'] text-[10px] font-bold text-emerald-400">
              <MessageCircle className="h-3 w-3" />
              {t('تواصل معنا', 'Contact us')}
            </div>
            <h2 className="font-['Amiri'] text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              {t('نحن هنا لمساعدتك', 'We\u2019re here to help')}
            </h2>
            <p className="mt-3 font-['Cairo'] text-sm text-[var(--text-secondary)]">
              {t(
                'لأي استفسار أو اقتراح أو مشكلة تقنية — تواصل معنا مباشرة.',
                'For any question, suggestion, or technical issue — reach out directly.'
              )}
            </p>
          </div>

          {/* ===== بطاقة واتساب بارزة ===== */}
          <div
            className="mb-6 overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--bg-card)] to-[var(--bg-card)] p-6 sm:p-8"
            data-aos="zoom-in"
          >
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30"
              >
                <FaWhatsapp className="h-8 w-8" />
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 font-['Cairo'] text-[10px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  {t('متاح الآن', 'Available now')}
                </div>
                <h3 className="font-['Amiri'] text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                  {t('تواصل عبر واتساب', 'Chat on WhatsApp')}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-3 py-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]" dir="ltr">
                      {WHATSAPP_DISPLAY}
                    </span>
                  </div>
                  <button
                    onClick={() => copy(WHATSAPP_DISPLAY, 'phone')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1.5 font-['Cairo'] text-[10px] font-bold text-[var(--text-secondary)] transition-all hover:border-emerald-500/40 hover:text-emerald-400"
                  >
                    {copiedPhone ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        {t('تم النسخ', 'Copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        {t('نسخ', 'Copy')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 font-['Cairo'] text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.03] hover:shadow-xl"
              >
                <FaWhatsapp className="h-4 w-4" />
                {t('افتح واتساب', 'Open WhatsApp')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* ===== بطاقات تواصل إضافية ===== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ContactCard
              icon={Mail}
              title={t('البريد الإلكتروني', 'Email')}
              value={EMAIL}
              href={`mailto:${EMAIL}`}
              accent="#D4AF37"
              delay={0.1}
              onCopy={() => copy(EMAIL, 'email')}
              copyLabel={t('نسخ البريد', 'Copy email')}
              actionLabel={t('إرسال رسالة', 'Send email')}
            />

            <ContactCard
              icon={FaWhatsapp}
              title={t('واتساب', 'WhatsApp')}
              value={WHATSAPP_DISPLAY}
              href={WHATSAPP_LINK}
              accent="#10B981"
              delay={0.15}
              onCopy={() => copy(WHATSAPP_DISPLAY, 'phone')}
              copyLabel={t('نسخ الرقم', 'Copy number')}
              actionLabel={t('بدء محادثة', 'Start chat')}
            />

            <ContactCard
              icon={FaGithub}
              title={t('مشروع مفتوح المصدر', 'Open source')}
              value="yousefhegazy131279/Jadwali"
              href="https://github.com/yousefhegazy131279/Jadwali"
              accent="#A855F7"
              delay={0.2}
              actionLabel={t('زيارة الريبو', 'Visit repo')}
            />
          </div>

          {/* ===== أيقونات التواصل الاجتماعي ===== */}
          <div className="mt-8 text-center" data-aos="fade-up" data-aos-delay="200">
            <div className="mb-4 font-['Cairo'] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {t('تابعنا على وسائل التواصل', 'Follow us on social media')}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {SOCIALS.map(({ href, icon: Icon, label, color }, i) => (
                <motion.a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -4, scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-md transition-all hover:shadow-xl"
                  style={{ color }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = hexToRgba(color, 0.5)
                    e.currentTarget.style.boxShadow = `0 8px 20px ${hexToRgba(color, 0.25)}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* ============ شارة الإصدار ============ */}
        <div className="mt-16 flex flex-col items-center gap-3" data-aos="fade-up">
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2">
            <Rocket className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span className="font-['Cairo'] text-[11px] text-[var(--text-muted)]">
              {t('الإصدار', 'Version')}
            </span>
            <span className="font-mono text-xs font-bold text-[#D4AF37]">v1.0.0</span>
          </div>
          <p className="font-['Cairo'] text-[10px] text-[var(--text-muted)]">
            {t('صُنع بـ', 'Made with')} <span className="text-red-500">❤</span>{' '}
            {t('بواسطة', 'by')}{' '}
            <span className="font-['Amiri'] font-bold text-[#D4AF37]">HGZ</span>
          </p>
        </div>
      </div>

      {/* ============ زر واتساب عائم ============ */}
      <motion.a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl shadow-emerald-500/40 transition-all hover:shadow-emerald-500/60 ltr:right-6 rtl:left-6"
        aria-label={t('تواصل عبر واتساب', 'Contact on WhatsApp')}
        title={t('تواصل عبر واتساب', 'Contact on WhatsApp')}
      >
        <FaWhatsapp className="h-7 w-7" />
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/30" />
      </motion.a>
    </div>
  )
}