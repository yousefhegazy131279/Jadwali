// src/lib/scheduleAI.ts

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
    sideTasks?: DraftSideTask[] // ✅ اختياري لدعم الاقتراحات القديمة
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
  
    // sideTasks اختياري، لكن إذا وُجد يجب أن يكون مصفوفة صحيحة
    if (d.sideTasks !== undefined) {
      if (!Array.isArray(d.sideTasks)) return false
      if (!d.sideTasks.every(isValidSideTask)) return false
    }
  
    return true
  }
  
  // ==================== Normalization ====================
  // يضمن وجود sideTasks كمصفوفة (فارغة إن لم تكن موجودة)
  export function normalizeDraft(draft: ScheduleDraft): ScheduleDraft {
    return {
      title: draft.title.trim(),
      date: draft.date,
      start_time: draft.start_time,
      tasks: draft.tasks.map(t => ({
        name: t.name.trim(),
        category: t.category.trim() || 'عام',
        duration_minutes: Math.max(1, Math.round(t.duration_minutes)),
      })),
      sideTasks: Array.isArray(draft.sideTasks)
        ? draft.sideTasks
            .filter(s => s && typeof s.name === 'string' && s.name.trim().length > 0)
            .map(s => ({ name: s.name.trim() }))
        : [],
    }
  }