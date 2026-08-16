// src/lib/utils.ts

// ============================================
//  دوال الوقت والتاريخ
// ============================================

/**
 * تحويل الوقت من صيغة 24 ساعة إلى 12 ساعة مع صباحاً/مساءً
 * @example to12Hour('14:30') // '02:30 مساءً'
 */
export function to12Hour(time: string): string {
    const [h, m] = time.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return time
    
    const ampm = h >= 12 ? 'مساءً' : 'صباحاً'
    const hour12 = h % 12 || 12
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`
  }
  
  /**
   * تحويل الوقت إلى دقائق (من منتصف الليل)
   * @example timeToMinutes('14:30') // 870
   */
  export function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return 0
    return h * 60 + m
  }
  
  /**
   * تحويل الدقائق إلى صيغة وقت (HH:MM)
   * @example minutesToTime(870) // '14:30'
   */
  export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = Math.floor(minutes % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  
  /**
   * الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
   */
  export function today(): string {
    return new Date().toISOString().split('T')[0]
  }
  
  /**
   * تنسيق التاريخ العربي
   * @example formatArabicDate('2026-08-13') // '١٣ أغسطس ٢٠٢٦'
   */
  export function formatArabicDate(dateString: string): string {
    const date = new Date(dateString)
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }
  
  /**
   * التحقق مما إذا كان التاريخ اليوم هو نفس التاريخ المحدد
   */
  export function isToday(dateString: string): boolean {
    return today() === dateString
  }
  
  /**
   * الحصول على الوقت الحالي بصيغة HH:MM
   */
  export function getCurrentTime(): string {
    const now = new Date()
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  
  // ============================================
  //  دوال المصفوفات والأشياء
  // ============================================
  
  /**
   * إنشاء معرف فريد (مختصر وسهل القراءة)
   * @example generateId() // 'a1b2c3d4'
   */
  export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  }
  
  /**
   * إنشاء معرف عشوائي طويل (UUID-like)
   */
  export function generateUUID(): string {
    return crypto.randomUUID?.() || 
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
  }
  
  /**
   * ترتيب مصفوفة حسب حقل معين (ترتيب تصاعدي)
   */
  export function sortBy<T>(array: T[], key: keyof T, ascending: boolean = true): T[] {
    return [...array].sort((a, b) => {
      const valA = a[key]
      const valB = b[key]
      if (valA === valB) return 0
      if (valA === undefined || valA === null) return 1
      if (valB === undefined || valB === null) return -1
      const comparison = valA < valB ? -1 : 1
      return ascending ? comparison : -comparison
    })
  }
  
  /**
   * إزالة العناصر المكررة من المصفوفة
   */
  export function unique<T>(array: T[]): T[] {
    return [...new Set(array)]
  }
  
  /**
   * تقسيم المصفوفة إلى مجموعات بحجم محدد
   */
  export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
  
  // ============================================
  //  دوال النصوص
  // ============================================
  
  /**
   * اقتصاص النص إلى طول معين مع إضافة ...
   */
  export function truncateText(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }
  
  /**
   * تحويل النص إلى تنسيق عنوان (Capitalize)
   */
  export function capitalize(text: string): string {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  }
  
  /**
   * إزالة التشكيل والعلامات الخاصة من النص
   */
  export function normalizeText(text: string): string {
    return text
      .normalize('NFKC')
      .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل
      .replace(/[^\w\s]/g, ' ') // إزالة العلامات الخاصة
      .trim()
      .replace(/\s+/g, ' ')
  }
  
  // ============================================
  //  دوال الألوان
  // ============================================
  
  /**
   * تحويل لون Hex إلى RGB
   */
  export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return null
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
  }
  
  /**
   * تحويل لون Hex إلى سلسلة rgba
   */
  export function hexToRgba(hex: string, alpha: number = 0.5): string {
    const rgb = hexToRgb(hex)
    if (!rgb) return `rgba(0,0,0,${alpha})`
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
  }
  
  /**
   * توليد لون عشوائي
   */
  export function randomColor(): string {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }
  
  // ============================================
  //  دوال التحقق والفحص
  // ============================================
  
  /**
   * التحقق مما إذا كانت القيمة فارغة (null, undefined, empty string)
   */
  export function isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  }
  
  /**
   * التحقق مما إذا كان النص بريداً إلكترونياً صحيحاً
   */
  export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  /**
   * التحقق مما إذا كان النص يحتوي على أرقام فقط
   */
  export function isNumeric(value: string): boolean {
    return /^\d+$/.test(value)
  }
  
  /**
   * تأخير تنفيذ الدالة (Debounce)
   */
  export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timer: NodeJS.Timeout | null = null
    return (...args: Parameters<T>) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => func(...args), delay)
    }
  }
  
  /**
   * منع تنفيذ الدالة عدة مرات خلال فترة محددة (Throttle)
   */
  export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
  
  // ============================================
  //  دوال الصفوف (CSS)
  // ============================================
  
  /**
   * دمج أسماء الصفوف (مشابهة لـ classnames)
   */
  export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ')
  }
  
  /**
   * إنشاء اسم صف مشروط
   */
  export function clsx(conditions: Record<string, boolean>): string {
    return Object.entries(conditions)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(' ')
  }
  
  // ============================================
  //  دوال أخرى
  // ============================================
  
  /**
   * نسخ النص إلى الحافظة
   */
  export async function copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // طريقة بديلة للمتصفحات القديمة
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        document.body.removeChild(textarea)
        return true
      } catch {
        document.body.removeChild(textarea)
        return false
      }
    }
  }
  
  /**
   * الحصول على اسم اليوم بالعربية
   */
  export function getDayName(dayIndex: number): string {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    return days[dayIndex] || ''
  }
  
  /**
   * الحصول على اسم الشهر بالعربية
   */
  export function getMonthName(monthIndex: number): string {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    return months[monthIndex] || ''
  }
  
  /**
   * حساب الفرق بين وقتين بالدقائق
   */
  export function timeDifference(start: string, end: string): number {
    return timeToMinutes(end) - timeToMinutes(start)
  }