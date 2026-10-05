// ============================================================
//  supabaseSafeWrite.ts
//  دالة آمنة للكتابة على Supabase مع معالجة تلقائية لأخطاء RLS
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

type SafeWriteOptions = {
  /** عدد محاولات إعادة التنفيذ (افتراضي 1) */
  retries?: number
  /** يُستدعى عند فشل الجلسة نهائياً */
  onAuthError?: () => void
  /** يُستدعى قبل كل محاولة (للتشخيص) */
  onBeforeAttempt?: (attempt: number) => void
}

type SafeWriteResult<T> = {
  data: T | null
  error: any
  /** هل حدث خطأ مصادقة؟ */
  authFailed?: boolean
}

/**
 * تنفيذ عملية كتابة على Supabase مع:
 * 1. فحص الجلسة قبل التنفيذ
 * 2. تجديد تلقائي إذا كانت على وشك الانتهاء
 * 3. إعادة محاولة واحدة عند فشل RLS
 * 4. تسجيل خروج تلقائي عند فشل كل شيء
 */
export async function safeWrite<T>(
  supabase: SupabaseClient,
  operation: () => Promise<{ data: T | null; error: any }>,
  options: SafeWriteOptions = {}
): Promise<SafeWriteResult<T>> {
  const maxRetries = options.retries ?? 1

  // ===== 1. فحص وجود الجلسة =====
  let { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.warn('[safeWrite] No session found')
    await supabase.auth.signOut().catch(() => {})
    options.onAuthError?.()
    return { data: null, error: { message: 'SESSION_EXPIRED' }, authFailed: true }
  }

  // ===== 2. فحص انتهاء الصلاحية (وتجديد إن لزم) =====
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
  const nearExpiry = expiresAt < Date.now() + 30_000 // خلال 30 ثانية

  if (nearExpiry) {
    console.log('[safeWrite] Token near expiry — refreshing…')
    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()

    if (refreshErr || !refreshed.session) {
      console.warn('[safeWrite] Refresh failed', refreshErr)
      await supabase.auth.signOut().catch(() => {})
      options.onAuthError?.()
      return { data: null, error: { message: 'SESSION_EXPIRED' }, authFailed: true }
    }

    session = refreshed.session
  }

  // ===== 3. تنفيذ العملية =====
  options.onBeforeAttempt?.(1)
  let result = await operation()

  // ===== 4. إذا فشل بسبب RLS، جرّب مرة واحدة بعد تجديد الجلسة =====
  if (
    result.error?.message?.includes('row-level security') &&
    maxRetries > 0
  ) {
    console.warn('[safeWrite] RLS error — refreshing session and retrying…')

    const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()

    if (refreshErr || !refreshed.session) {
      console.warn('[safeWrite] Refresh failed on retry')
      await supabase.auth.signOut().catch(() => {})
      options.onAuthError?.()
      return { ...result, authFailed: true }
    }

    // إعادة المحاولة
    options.onBeforeAttempt?.(2)
    const retryResult = await operation()

    if (retryResult.error) {
      console.warn('[safeWrite] Retry failed — signing out')
      await supabase.auth.signOut().catch(() => {})
      options.onAuthError?.()
      return { ...retryResult, authFailed: true }
    }

    return { ...retryResult, authFailed: false }
  }

  // ===== 5. معالجة حالات أخرى =====
  // إذا كان الخطأ بسبب انتهاء الجلسة بطريقة أخرى
  if (
    result.error?.message?.includes('JWT') ||
    result.error?.message?.includes('not authenticated') ||
    result.error?.code === 'PGRST301'
  ) {
    await supabase.auth.signOut().catch(() => {})
    options.onAuthError?.()
    return { ...result, authFailed: true }
  }

  return { ...result, authFailed: false }
}