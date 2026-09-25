export const PRAYER_NAMES = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء']
export const DEFAULT_PRAYER_TIMES = ['04:25', '13:02', '16:38', '19:57', '21:26']
export const isTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
export function normalizePrayerTimes(value: unknown): string[] {
  return DEFAULT_PRAYER_TIMES.map((fallback, i) => Array.isArray(value) && isTime(value[i]) ? value[i].slice(0, 5) : fallback)
}
