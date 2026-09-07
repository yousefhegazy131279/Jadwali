// src/app/about/page.tsx
'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import {
  Target,
  Eye,
  Heart,
  Zap,
  Clock,
  Brain,
  Sparkles,
  ArrowRight,
  Quote,
  ChevronDown,
  User,
  Home,
} from 'lucide-react'
import { useState } from 'react'

const features = [
  {
    icon: Clock,
    title: 'إدارة الوقت',
    description: 'نظام بومودورو مرن يساعدك على تنظيم وقتك بين العمل والراحة بذكاء.',
    color: 'from-[#D4AF37]/20 to-[#D4AF37]/5',
    iconColor: 'text-[#D4AF37]',
  },
  {
    icon: Brain,
    title: 'جدولة ذكية',
    description: 'مخطط ذكي يحوّل مهامك اليومية إلى جدول منظم مع مراعاة أوقات الصلاة.',
    color: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-400',
  },
  {
    icon: Heart,
    title: 'الجانب الروحي',
    description: 'دمج الصلوات في جدولك لتحقيق التوازن بين الدنيا والدين.',
    color: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Zap,
    title: 'إنتاجية عالية',
    description: 'تتبع إنجازك اليومي وإحصائيات دقيقة تساعدك على التحسن المستمر.',
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-400',
  },
]

const faqs = [
  {
    q: 'هل التطبيق مجاني؟',
    a: 'نعم، جميع الميزات الأساسية مجانية بالكامل. أؤمن بأن إدارة الوقت حق للجميع.',
  },
  {
    q: 'هل يمكنني استخدامه على الهاتف؟',
    a: 'بالتأكيد! التطبيق مصمم ليعمل على جميع الأجهزة من هاتفك إلى حاسوبك، ويمكن تثبيته كتطبيق PWA.',
  },
  {
    q: 'كيف تعمل الجدولة الذكية؟',
    a: 'تدخل مهامك ومدة كل مهمة، ويقوم التطبيق تلقائيًا بتقسيمها إلى جلسات بومودورو مع الراحات المناسبة، ويراعي أوقات الصلاة.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'نعم، نستخدم تشفيرًا متقدمًا وحماية RLS في قاعدة البيانات، ولا يمكن لأي مستخدم آخر الوصول إلى بياناتك.',
  },
]

function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-card)]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-right hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <span className="font-bold text-[var(--text-primary)] font-['Cairo']">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="w-5 h-5 text-[#D4AF37]" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="px-4 pb-4 text-[var(--text-secondary)] font-['Cairo'] text-sm leading-relaxed">
          {a}
        </p>
      </motion.div>
    </motion.div>
  )
}

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto" dir="rtl">
      {/* ===== زر العودة ===== */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/dashboard')}
        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[#D4AF37] hover:border-[#D4AF37]/50 transition-all shadow-lg backdrop-blur-xl font-['Cairo'] text-sm"
      >
        <Home className="w-4 h-4" />
        العودة للوحة التحكم
      </motion.button>

      {/* ===== الهيدر ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <motion.div
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.8 }}
          className="w-24 h-24 mx-auto mb-6"
        >
          <Logo />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-6xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-4"
        >
          من نحن
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-[var(--text-secondary)] font-['Cairo'] max-w-2xl mx-auto"
        >
          قصة بسيطة بدأت بحاجة شخصية، وتحولت إلى أداة يستفيد منها الجميع
        </motion.p>
      </motion.div>

      {/* ===== القصة الشخصية ===== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-6">
              قصتي مع جَدْوَلِي
            </h2>
            <div className="space-y-4 text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
              <p>
                لم يبدأ جَدْوَلِي كشركة أو فريق كبير، بل بدأ كحاجة شخصية بحتة.
                كنت أبحث عن طريقة لتنظيم وقتي بين العمل والدراسة والعبادة،
                فوجدت أن التطبيقات المتاحة إما معقدة أو تهمل الجانب الروحي.
              </p>
              <p>
                قررت أن أبني أداة بسيطة تناسب احتياجاتي: جدول ذكي يجمع مهامي
                اليومية مع أوقات الصلاة، ونظام بومودورو يساعدني على التركيز.
              </p>
              <p>
                بعد أن استخدمتها بنفسي ورأيت كيف غيّرت إنتاجيتي، أدركت أن
                هناك الكثيرين مثلي يحتاجون إلى هذه الأداة. فقررت نشرها ليفيد
                الجميع.
              </p>
              <p>
                اليوم، جَدْوَلِي متاح للجميع مجانًا، وما زلت أطورها بنفسي
                بشغف.
              </p>
            </div>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] p-8 bg-[var(--bg-card)]"
          >
            <Quote className="w-12 h-12 text-[#D4AF37] mb-4" />
            <p className="text-xl font-['Amiri'] text-[var(--text-primary)] leading-relaxed">
              "صنعتُ هذه الأداة لنفسي أولًا، واليوم أشاركها معك لأنني أعلم أنها
              ستفيدك كما أفادتني"
            </p>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-[#D4AF37] font-['Cairo'] font-bold">HGZ</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ===== الرؤية والرسالة ===== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <Eye className="w-10 h-10 text-[#D4AF37] mb-4" />
            <h3 className="text-2xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-3">
              رؤيتي
            </h3>
            <p className="text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
              أن تكون جَدْوَلِي الأداة العربية الأولى التي تجمع بين الإنتاجية
              والروحانية ببساطة وفعالية.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
            <Target className="w-10 h-10 text-[#D4AF37] mb-4" />
            <h3 className="text-2xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-3">
              رسالتي
            </h3>
            <p className="text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
              توفير أداة مجانية وسهلة تساعد كل شخص على تنظيم يومه دون تعقيد،
              مع احترام الجانب الروحي.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ===== المميزات ===== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <h2 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-8 text-center">
          لماذا جَدْوَلِي؟
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -6 }}
              className={`p-6 rounded-2xl border border-[var(--border-color)] bg-gradient-to-br ${feature.color} backdrop-blur-xl`}
            >
              <feature.icon className={`w-10 h-10 ${feature.iconColor} mb-4`} />
              <h3 className="text-lg font-bold font-['Cairo'] text-[var(--text-primary)] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ===== الأسئلة الشائعة ===== */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-20"
      >
        <h2 className="text-3xl font-bold font-['Amiri'] text-[var(--text-primary)] mb-8 text-center">
          الأسئلة الشائعة
        </h2>
        <div className="space-y-3 max-w-2xl mx-auto">
          {faqs.map((faq, index) => (
            <FAQItem key={index} q={faq.q} a={faq.a} index={index} />
          ))}
        </div>
      </motion.section>

      
    </div>
  )
}