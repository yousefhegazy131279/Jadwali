'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { validateDraft, normalizeDraft, type ScheduleDraft } from '@/lib/scheduleAI'
import { formatTime12 } from '@/lib/time'
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  CheckCircle2,
  X,
  Clock,
  ListChecks,
  Coffee,
  Calendar as CalendarIcon,
  Wand2,
  MessageSquare,
  ArrowDown,
  RotateCcw,
} from 'lucide-react'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
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

  // ============ Auto scroll ============
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, busy, draft, scrollToBottom])

  // ============ Detect scroll position ============
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

  // ============ Send message ============
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || busy) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    const history = [...messages, userMsg].slice(-11)
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

      
      if (result.error || !validateDraft(result.data?.draft)) {
        throw new Error('invalid')
      }
      
      const newDraft = normalizeDraft(result.data.draft as ScheduleDraft)
      setDraft(newDraft)

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: isArabic
            ? `✅ اقترحت لك جدولاً بعنوان "${newDraft.title}". راجعه بالأسفل ثم اضغط "استخدم هذا الجدول".`
            : `✅ I suggested a schedule titled "${newDraft.title}". Review it below and click "Use this schedule".`,
          timestamp: Date.now(),
        },
      ])
    } catch {
      setError(
        t(
          'تعذر الحصول على اقتراح. تحقق من الاتصال وتفعيل Jadwool ثم أعد المحاولة.',
          'Could not get a suggestion. Check your connection and that Jadwool is configured, then retry.'
        )
      )
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  // ============ Reset ============
  const reset = () => {
    setMessages([])
    setDraft(null)
    setError('')
    setInput('')
  }

  // ============ Keyboard ============
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // ============ Time format ============
  const prettyTime = (time: string) => {
    try {
      return formatTime12(time, language)
    } catch {
      return time
    }
  }

  // ============ Render ============
  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[#D4AF37]/5 backdrop-blur-xl shadow-lg"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#D4AF37]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

      {/* ====== Header ====== */}
      <header className="relative flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] shadow-md"
          >
            <Sparkles className="w-5 h-5 text-[#0b1a2e]" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-card)] animate-pulse" />
          </motion.div>
          <div>
            <h2 className="text-lg font-bold font-['Amiri'] text-[var(--text-primary)] flex items-center gap-2">
              {t('جَدْوُولْ', 'Jadwool')}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-['Cairo']">
                AI
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-['Cairo']">
              {t(
                'مساعدك الذكي لبناء جدول اليوم',
                'Your AI assistant for building today\'s schedule'
              )}
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

      {/* ====== Messages area ====== */}
      <div
        ref={scrollRef}
        className="relative max-h-[340px] min-h-[180px] overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin scrollbar-thumb-[#D4AF37]/20 scrollbar-track-transparent"
        aria-live="polite"
      >
        {/* Welcome / empty state */}
        {messages.length === 0 && !busy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center py-6 space-y-3"
          >
            <div className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-['Cairo'] max-w-xs">
              {t(
                'صف لي يومك بحرية، وسأحوّله إلى جدول منظّم جاهز للتطبيق.',
                'Describe your day freely, and I will turn it into an organized schedule ready to apply.'
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

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C84A]'
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}
              >
                {m.role === 'user' ? (
                  <UserIcon className="w-4 h-4 text-[#0b1a2e]" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-['Cairo'] whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] rounded-tr-sm'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-sm'
                }`}
              >
                {m.content}
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
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-2"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#D4AF37]"
                    animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll to bottom */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-2 mx-auto flex items-center justify-center w-8 h-8 rounded-full bg-[#D4AF37] text-[#0b1a2e] shadow-lg hover:shadow-xl transition-shadow"
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
            className="relative overflow-hidden border-t border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/8 via-transparent to-blue-500/5"
          >
            <div className="px-5 py-4 space-y-3">
              {/* Header */}
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
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  aria-label={t('إلغاء', 'Cancel')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-['Cairo'] border border-[#D4AF37]/20">
                  <ListChecks className="w-3 h-3" />
                  {draft.tasks.length}{' '}
                  {t('مهام', 'tasks')}
                </span>
                {draft.sideTasks && draft.sideTasks.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-['Cairo'] border border-blue-500/20">
                    <Coffee className="w-3 h-3" />
                    {draft.sideTasks.length}{' '}
                    {t('جانبية', 'side')}
                  </span>
                )}
              </div>

              {/* Tasks list */}
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
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)]/60 border border-[var(--border-color)] hover:border-[#D4AF37]/30 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
                        <span className="flex-1 text-sm text-[var(--text-primary)] font-['Cairo'] truncate">
                          {task.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)] font-['Cairo']">
                          {task.category}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-['Cairo'] whitespace-nowrap">
                          {task.duration_minutes} {t('د', 'm')}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Side tasks list */}
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
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)]/60 border border-[var(--border-color)] hover:border-blue-500/30 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <span className="flex-1 text-sm text-[var(--text-primary)] font-['Cairo'] truncate">
                          {side.name}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onApply(draft)}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] font-bold font-['Cairo'] text-sm shadow-md hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* ====== Input area ====== */}
      <div className="relative border-t border-[var(--border-color)] bg-[var(--bg-card)]/40 px-4 py-3">
        <form onSubmit={send} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={3000}
              rows={1}
              disabled={busy}
              required
              aria-label={t('رسالتك إلى جدوول', 'Your message to Jadwool')}
              placeholder={t(
                'صف مهامك ووقتك المتاح…',
                'Describe your tasks and available time…'
              )}
              className="w-full resize-none px-4 py-3 pe-12 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all font-['Cairo'] text-sm min-h-[44px] max-h-32"
              style={{ height: 'auto' }}
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
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#E8C84A] text-[#0b1a2e] flex items-center justify-center shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('إرسال', 'Send')}
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </form>

        <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)] font-['Cairo']">
          <span>
            {t('مدعوم بـ', 'Powered by')}{' '}
            <span className="text-[#D4AF37] font-bold">Groq · Llama 3.3</span>
          </span>
          <span className="hidden sm:inline">
            {t('Enter للإرسال · Shift+Enter لسطر جديد', 'Enter to send · Shift+Enter for new line')}
          </span>
        </div>
      </div>
    </section>
  )
}