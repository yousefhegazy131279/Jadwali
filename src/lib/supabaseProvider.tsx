'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import type {
  Session,
  User,
} from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/client'

// ============================================================
//  إضافة fullName إلى السياق
// ============================================================
type SupabaseContextType = {
  supabase: ReturnType<typeof createClient>
  session: Session | null
  user: User | null
  isLoading: boolean
  fullName: string | null
  setFullName: (name: string) => Promise<void>
}

const SupabaseContext = createContext<SupabaseContextType | null>(null)

export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createClient())

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fullName, setFullNameState] = useState<string | null>(null)

  // ============================================================
  //  تحديث الاسم من user_metadata
  // ============================================================
  const updateFullName = (user: User | null) => {
    if (user?.user_metadata?.full_name) {
      setFullNameState(user.user_metadata.full_name)
    } else if (user?.email) {
      setFullNameState(user.email.split('@')[0])
    } else {
      setFullNameState('مستخدم')
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      updateFullName(session?.user ?? null)
      setIsLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        updateFullName(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  // ============================================================
  //  دالة تحديث اسم المستخدم في Supabase
  // ============================================================
  const setFullName = async (name: string) => {
    if (!user) return

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name },
    })

    if (!error) {
      setFullNameState(name)
      // تحديث user محلياً
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          full_name: name,
        },
      })
    } else {
      console.error('Error updating full name:', error)
      throw error
    }
  }

  return (
    <SupabaseContext.Provider
      value={{
        supabase,
        session,
        user,
        isLoading,
        fullName,
        setFullName,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)

  if (!context) {
    throw new Error(
      'useSupabase must be used within SupabaseProvider'
    )
  }

  return context
}