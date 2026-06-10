import { createBrowserClient } from '@supabase/ssr'

// Permissive DB type — avoids `never` inference on Supabase queries
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = { public: { Tables: { [k: string]: { Row: any; Insert: any; Update: any; Relationships: [] } }; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never> } }

export function createClient() {
  return createBrowserClient<AnyDB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  )
}
