export type ProgressPhase = { type: string; taskId?: string }

/** Count the contiguous phase prefix, including breaks before completed work. */
export function completedPhaseCount(phases: ProgressPhase[], tasks: { id: string; completed_sessions?: number | null }[]) {
  const completed = new Map(tasks.map(t => [t.id, t.completed_sessions ?? 0]))
  const seen = new Map<string, number>()
  let prefix = 0
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i]
    if (phase.type !== 'work' || !phase.taskId) continue
    const ordinal = (seen.get(phase.taskId) ?? 0) + 1
    seen.set(phase.taskId, ordinal)
    if (ordinal > (completed.get(phase.taskId) ?? 0)) break
    prefix = i + 1
  }
  return prefix
}

export function taskSessionNumber(phases: ProgressPhase[], index: number) {
  return phases.slice(0, index + 1).filter(p => p.type === 'work' && p.taskId === phases[index]?.taskId).length
}

export function remainingSeconds(endTime: string | null, fallback: number, now = Date.now()) {
  return endTime ? Math.max(0, Math.ceil((new Date(endTime).getTime() - now) / 1000)) : fallback
}
