'use client'

import { createClient } from '@/lib/supabase/client'
import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'

type SupabaseContextType = {
  supabase: ReturnType<typeof createClient>
  user: any | null
  fullName: string | null
  isAdmin: boolean | null
  updateFullName: (name: string) => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<any | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser()
      const u = data.user
      setUser(u)

      // ابدأ من user_metadata
      let name = u?.user_metadata?.full_name || u?.user_metadata?.name || null

      if (u) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', u.id)
          .single()

        if (!error && profile) {
          setIsAdmin(profile.role === 'admin')
          // استخدم الاسم من profiles إذا كان متوفرًا
          if (profile.full_name) name = profile.full_name
        } else {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }

      setFullName(name)
    }

    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)

      let name = u?.user_metadata?.full_name || u?.user_metadata?.name || null

      if (u) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', u.id)
          .single()

        if (!error && profile) {
          setIsAdmin(profile.role === 'admin')
          if (profile.full_name) name = profile.full_name
        } else {
          setIsAdmin(false)
        }
      } else {
        setIsAdmin(false)
      }

      setFullName(name)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const updateFullName = async (name: string) => {
    if (!user) return

    // 1) تحديث user_metadata في auth.users
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name, name: name },
    })

    // 2) تحديث أو إنشاء سجل في جدول profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, email: user.email, full_name: name },
        { onConflict: 'id' }
      )

    if (!authError && !profileError) {
      setFullName(name)
      toast.success('تم حفظ الاسم بنجاح')
    } else {
      toast.error('حدث خطأ في حفظ الاسم')
      console.error('authError:', authError, 'profileError:', profileError)
    }
  }

  return (
    <SupabaseContext.Provider value={{ supabase, user, fullName, isAdmin, updateFullName }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) throw new Error('useSupabase must be used within SupabaseProvider')
  return context
}