import { createBrowserClient } from '@supabase/ssr'
import { offlineFetch } from '@/lib/offline'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: offlineFetch } }
  )
}
