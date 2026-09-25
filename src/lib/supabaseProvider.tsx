'use client'
import { useLanguage, translate as tr, LanguageToggle } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

type SupabaseContextType = {
  supabase: ReturnType<typeof createClient>
  user: any | null
  fullName: string | null
  isAdmin: boolean | null
  isLoading: boolean // ✅ أضفنا هذا
  updateFullName: (name: string) => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { t: tr, language } = useLanguage()

  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<any | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true) // ✅ حالة التحميل

  useEffect(() => {
    let active = true
    void supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); if (!data.user) { setIsAdmin(false); setIsLoading(false) } }
    })
    // Never await a Supabase query inside the auth callback: the auth lock is held.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) { setFullName(null); setIsAdmin(false); setIsLoading(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [supabase])

  useEffect(() => {
    if (!user) return
    let active = true
    setIsLoading(true)
    setIsAdmin(null)
    void supabase.from('profiles').select('role,full_name').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (!active) return
      setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || null)
      setIsAdmin(data?.role === 'admin')
      setIsLoading(false)
    })
    return () => { active = false }
  }, [user?.id, supabase])

  const updateFullName = async (name: string) => {
    if (!user) return

    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name, name: name },
    })

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email, full_name: name },
        { onConflict: 'id' }
      )

    if (!authError && !profileError) {
      setFullName(name)
      toast.success(tr('تم حفظ الاسم بنجاح'))
    } else {
      toast.error(tr('حدث خطأ في حفظ الاسم'))
      throw authError || profileError
    }
  }

  return (
    <SupabaseContext.Provider
      value={{ supabase, user, fullName, isAdmin, isLoading, updateFullName }}
    >
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used within SupabaseProvider')
  return context
}