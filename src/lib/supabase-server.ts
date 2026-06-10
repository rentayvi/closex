import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Permissive DB type — avoids `never` inference on Supabase queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = { public: { Tables: { [k: string]: { Row: any; Insert: any; Update: any; Relationships: [] } }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<AnyDB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies can't be set
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
