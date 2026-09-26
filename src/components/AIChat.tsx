'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import {
  validateJadwoolResponse,
  normalizeDraft,
  type ScheduleDraft,
  type JadwoolResponse,
} from '@/lib/scheduleAI'
import { formatTime12 } from '@/lib/time'
import { JadwoolAvatar } from '@/components/JadwoolAvatar'
import {
  Send,
  Loader2,
  User as UserIcon,
  CheckCircle2,
  X,
  Clock,
  ListChecks,
  Coffee,
  Calendar as CalendarIcon,
  Wand2,
  ArrowDown,
  RotateCcw,
  MessageCircleQuestion,
} from 'lucide-react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  timestamp: number
}

export default function AIChat({
  date,
  onApply,
}: {
  date: string
  onApply: (draft: ScheduleDraft) => void
}) {
  const { t, language } = useLanguage()
  const isArabic = language === 'ar'

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState<ScheduleDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, busy, draft, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      setShowScrollBtn(!atBottom)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || busy) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    const history = [...messages, userMsg].slice(-15)
    setBusy(true)
    setError('')
    setMessages(history)
    setInput('')

    try {
      const result = await createClient().functions.invoke('generate-schedule', {
        body: {
          messages: history.map(m => ({ role: m.role, content: m.content })),
          date,
        },
      })

      if (result.error) throw new Error('invoke-failed')

      const response = result.data?.response as JadwoolResponse | undefined
      if (!response || !validateJadwoolResponse(response)) {
        throw new Error('invalid-response')
      }

      // ====== رد: سؤال ======
      if (response.type === 'question') {
        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: response.message,
            options: response.options,
            timestamp: Date.now(),
          },
        ])
      }
      // ====== رد: جدول ======
      else {
        const schedule = normalizeDraft(response.schedule)
        setDraft(schedule)

        setMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content:
              response.message ||
              (isArabic
                ? `✅ جاهز! اقترحت جدولاً بعنوان "${schedule.title}". راجعه بالأسفل.`
                : `✅ Done! I suggested a schedule titled "${schedule.title}". Review it below.`),
            timestamp: Date.now(),
          },
        ])
      }
    } catch {
      setError(
        t(
          'تعذر الحصول على الرد. تحقق من الاتصال ثم أعد المحاولة.',
          'Could not get a response. Check your connection and retry.'
        )
      )
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    setMessages([])
    setDraft(null)
    setError('')
    setInput('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const prettyTime = (time: string) => {
    try {
      return formatTime12(time, language)
    } catch {
      return time
    }
  }

  // تحديد حالة الأفاتار
  const avatarState: 'idle' | 'thinking' | 'happy' = busy
    ? 'thinking'
    : draft
    ? 'happy'
    : 'idle'

  return (
    <section
      className="relative rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 backdrop-blur-xl shadow-lg overflow-visible"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* توهجات خلفية */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

      {/* ====== Header ====== */}
      <header className="relative flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <JadwoolAvatar size={48} state={avatarState} />
          <div>
            <h2 className="text-lg font-bold font-['Amiri'] text-[var(--text-primary)] flex items-center gap-2">
              {t('جَدْوُولْ', 'Jadwool')}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-['Cairo']">
                AI
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-['Cairo']">
              {busy
                ? t('يفكر...', 'Thinking...')
                : draft
                ? t('جدول جاهز', 'Schedule ready')
                : t('اسألني أي شيء عن يومك', 'Ask me anything about your day')}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 border border-transparent hover:border-[#D4AF37]/30 transition-all font-['Cairo']"
            aria-label={t('محادثة جديدة', 'New chat')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('جديدة', 'New')}
          </motion.button>
        )}
      </header>

      {/* ====== Messages ====== */}
      <div
        ref={scrollRef}
        className="relative max-h-[400px] min-h-[180px] overflow-y-auto px-5 py-4 space-y-3"
        aria-live="polite"
      >
        {messages.length === 0 && !busy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-6 space-y-4"
          >
            <JadwoolAvatar size={80} state="idle" />
            <p className="text-sm text-[var(--text-secondary)] font-['Cairo'] max-w-md">
              {t(
                'مرحباً! أنا جَدْوُولْ 🤖\nصف لي يومك وسأسألك إذا احتجت معلومات إضافية، ثم أقترح جدولاً جاهزاً.',
                'Hi! I am Jadwool 🤖\nDescribe your day and I will ask if I need more info, then suggest a ready schedule.'
              )}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {(isArabic
                ? [
                    'ساعتان رياضيات وساعة قراءة',
                    'اجتماع الساعة 3 العصر',
                    'يوم مراجعة قبل الامتحان',
                  ]
                : [
                    '2h math & 1h reading',
                    'Meeting at 3 PM',
                    'Exam revision day',
                  ]
              ).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(suggestion)
                    inputRef.current?.focus()
                  }}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-[var(--border-color)] hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 text-[var(--text-secondary)] hover:text-[#D4AF37] transition-all font-['Cairo']"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="flex-shrink-0">
                {m.role === 'user' ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] flex items-center justify-center shadow-sm">
                    <UserIcon className="w-4 h-4 text-[#0b1a2e]" />
                  </div>
                ) : (
                  <JadwoolAvatar size={32} animated={false} />
                )}
              </div>

              <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-['Cairo'] whitespace-pre-wrap break-words ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] rounded-tr-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-sm'
                  }`}
                >
                  {m.content}
                </div>

                {/* خيارات للرد السريع */}
                {m.options && m.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {m.options.map((opt, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => send(opt)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 transition-all font-['Cairo'] disabled:opacity-50"
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {busy && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <JadwoolAvatar size={32} state="thinking" />
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#D4AF37]"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-2 mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-[#D4AF37] text-[#0b1a2e] shadow-lg"
              aria-label={t('التمرير للأسفل', 'Scroll to bottom')}
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ====== Draft preview ====== */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="border-t border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/8 via-transparent to-blue-500/5 overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37]">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)] font-['Amiri']">
                      {draft.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-muted)] font-['Cairo']">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {draft.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {prettyTime(draft.start_time)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDraft(null)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400"
                  aria-label={t('إلغاء', 'Cancel')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {draft.notes && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <MessageCircleQuestion className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--text-secondary)] font-['Cairo'] leading-relaxed">
                    {draft.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-['Cairo'] border border-[#D4AF37]/20">
                  <ListChecks className="w-3 h-3" />
                  {draft.tasks.length} {t('مهام', 'tasks')}
                </span>
                {draft.sideTasks && draft.sideTasks.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-['Cairo'] border border-blue-500/20">
                    <Coffee className="w-3 h-3" />
                    {draft.sideTasks.length} {t('جانبية', 'side')}
                  </span>
                )}
              </div>

              {draft.tasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] font-['Cairo'] mb-2">
                    <ListChecks className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {t('المهام الأساسية', 'Main tasks')}
                  </div>
                  <ul className="space-y-1.5">
                    {draft.tasks.map((task, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)]/60 border border-[var(--border-color)]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                        <span className="flex-1 text-sm text-[var(--text-primary)] font-['Cairo'] truncate">
                          {task.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-['Cairo']">
                          {task.category}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-['Cairo']">
                          {task.duration_minutes} {t('د', 'm')}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {draft.sideTasks && draft.sideTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] font-['Cairo'] mb-2">
                    <Coffee className="w-3.5 h-3.5 text-blue-400" />
                    {t('الأعمال الجانبية', 'Side tasks')}
                  </div>
                  <ul className="space-y-1.5">
                    {draft.sideTasks.map((side, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)]/60 border border-[var(--border-color)]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="flex-1 text-sm text-[var(--text-primary)] font-['Cairo'] truncate">
                          {side.name}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApply(draft)}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold font-['Cairo'] text-sm shadow-md hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {t('استخدم هذا الجدول', 'Use this schedule')}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Error ====== */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-red-500/30 bg-red-500/5"
          >
            <div className="flex items-start gap-2 px-5 py-3 text-sm text-red-400 font-['Cairo']">
              <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== Input ====== */}
      <div className="relative border-t border-[var(--border-color)] bg-[var(--bg-card)]/40 px-4 py-3">
        <form
          onSubmit={e => {
            e.preventDefault()
            send()
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={3000}
              rows={1}
              disabled={busy}
              placeholder={t(
                'صف مهامك ووقتك المتاح…',
                'Describe your tasks and available time…'
              )}
              className="w-full resize-none px-4 py-3 pe-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-['Cairo'] text-sm min-h-[44px] max-h-32"
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
            />
            <span className="absolute bottom-2 end-3 text-[10px] text-[var(--text-muted)] font-['Cairo'] pointer-events-none">
              {input.length}/3000
            </span>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: busy ? 1 : 1.05 }}
            whileTap={{ scale: busy ? 1 : 0.95 }}
            disabled={busy || !input.trim()}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-40"
            aria-label={t('إرسال', 'Send')}
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </form>

        <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)] font-['Cairo']">
          <span>
            {t('مدعوم بـ', 'Powered by')}{' '}
            <span className="text-[#D4AF37] font-bold">Groq · Llama 3.3</span>
          </span>
          <span className="hidden sm:inline">
            {t(
              'Enter للإرسال · Shift+Enter لسطر جديد',
              'Enter to send · Shift+Enter for new line'
            )}
          </span>
        </div>
      </div>
    </section>
  )
}