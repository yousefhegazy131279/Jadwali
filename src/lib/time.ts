export function formatTime12(value: string | Date | null, language = 'ar', seconds = false) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date('2000-01-01T' + value)
  if (Number.isNaN(date.getTime())) return '—'
  const h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = seconds ? ':' + String(date.getSeconds()).padStart(2, '0') : ''
  return `${h % 12 || 12}:${m}${s} ${language === 'ar' ? (h >= 12 ? 'مساءً' : 'صباحًا') : (h >= 12 ? 'PM' : 'AM')}`
}
