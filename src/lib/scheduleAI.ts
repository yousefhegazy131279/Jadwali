// src/lib/scheduleAI.ts

// ==================== Types ====================
export type DraftTask = {
    name: string
    category: string
    duration_minutes: number
  }
  
  export type DraftSideTask = {
    name: string
  }
  
  export type ScheduleDraft = {
    title: string
    date: string
    start_time: string
    tasks: DraftTask[]
    sideTasks?: DraftSideTask[]
    // ✨ جديد: ملاحظات من Jadwool
    notes?: string
  }
  
  // ✅ رد Jadwool: إما سؤال أو جدول
  export type JadwoolResponse =
    | { type: 'question'; message: string; options?: string[] }
    | { type: 'schedule'; schedule: ScheduleDraft; message?: string }
  
  // ==================== Time repair ====================
  /**
   * إصلاح صيغ الوقت الشائعة الخاطئة:
   * - "3:00" → "03:00"
   * - "3:5" → "03:05"
   * - "8" → "08:00"
   * - "8:00 PM" → "20:00"
   * - "3333333" → fallback
   * - "25:00" → fallback (ساعات > 23)
   */
  export function repairTime(input: unknown, fallback = '08:00'): string {
    if (typeof input !== 'string') return fallback
  
    const s = input.trim().toLowerCase()
    if (!s) return fallback
  
    // 1) صيغة 12 ساعة: "8:00 pm", "8:00 مساءً"
    const ampmMatch = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|ص|م|صباحاً|صباحا|مساءً|مساء)$/)
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10)
      const m = parseInt(ampmMatch[2] || '0', 10)
      const isPM = /pm|م$|مساء/.test(ampmMatch[3])
      if (isPM && h < 12) h += 12
      if (!isPM && h === 12) h = 0
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }
  
    // 2) صيغة 24 ساعة: "HH:MM" أو "H:MM"
    const hhmmMatch = s.match(/^(\d{1,2}):(\d{1,2})$/)
    if (hhmmMatch) {
      const h = parseInt(hhmmMatch[1], 10)
      const m = parseInt(hhmmMatch[2], 10)
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
    }
  
    // 3) ساعة فقط: "8" → "08:00"
    const hourOnly = s.match(/^(\d{1,2})$/)
    if (hourOnly) {
      const h = parseInt(hourOnly[1], 10)
      if (h >= 0 && h <= 23) {
        return `${String(h).padStart(2, '0')}:00`
      }
    }
  
    // 4) فشل كل المحاولات → fallback
    return fallback
  }
  
  // ==================== Validation ====================
  function isValidDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date)
  }
  
  function isValidTime(time: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  }
  
  function isValidTask(task: unknown): task is DraftTask {
    if (!task || typeof task !== 'object') return false
    const t = task as DraftTask
    return (
      typeof t.name === 'string' &&
      t.name.trim().length > 0 &&
      typeof t.category === 'string' &&
      typeof t.duration_minutes === 'number' &&
      Number.isFinite(t.duration_minutes) &&
      t.duration_minutes > 0
    )
  }
  
  function isValidSideTask(side: unknown): side is DraftSideTask {
    if (!side || typeof side !== 'object') return false
    const s = side as DraftSideTask
    return typeof s.name === 'string' && s.name.trim().length > 0
  }
  
  export function validateDraft(value: unknown): value is ScheduleDraft {
    if (!value || typeof value !== 'object') return false
  
    const d = value as ScheduleDraft
  
    if (typeof d.title !== 'string' || d.title.trim().length === 0) return false
    if (typeof d.date !== 'string' || !isValidDate(d.date)) return false
    if (typeof d.start_time !== 'string' || !isValidTime(d.start_time)) return false
    if (!Array.isArray(d.tasks) || d.tasks.length === 0) return false
    if (!d.tasks.every(isValidTask)) return false
  
    if (d.sideTasks !== undefined) {
      if (!Array.isArray(d.sideTasks)) return false
      if (!d.sideTasks.every(isValidSideTask)) return false
    }
  
    return true
  }
  
  // ==================== Normalization ====================
  export function normalizeDraft(draft: ScheduleDraft): ScheduleDraft {
    return {
      title: draft.title.trim(),
      date: draft.date,
      start_time: repairTime(draft.start_time, '08:00'), // ✅ إصلاح الوقت
      tasks: draft.tasks.map(t => ({
        name: t.name.trim(),
        category: t.category.trim() || 'عام',
        duration_minutes: Math.max(5, Math.min(720, Math.round(t.duration_minutes))),
      })),
      sideTasks: Array.isArray(draft.sideTasks)
        ? draft.sideTasks
            .filter(s => s && typeof s.name === 'string' && s.name.trim().length > 0)
            .map(s => ({ name: s.name.trim() }))
        : [],
      notes: typeof draft.notes === 'string' ? draft.notes.trim() : undefined,
    }
  }
  
  // ==================== Response validation ====================
  export function validateJadwoolResponse(value: unknown): value is JadwoolResponse {
    if (!value || typeof value !== 'object') return false
  
    const v = value as any
  
    if (v.type === 'question') {
      return typeof v.message === 'string' && v.message.trim().length > 0
    }
  
    if (v.type === 'schedule') {
      return validateDraft(v.schedule)
    }
  
    return false
  }