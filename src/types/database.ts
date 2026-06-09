export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'starter' | 'pro' | 'agency'
          stripe_customer_id: string | null
          leads_used_this_month: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'leads_used_this_month'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      users: {
        Row: {
          id: string
          org_id: string
          email: string
          full_name: string | null
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      integrations: {
        Row: {
          id: string
          org_id: string
          type: 'gmail' | 'openai' | 'apify'
          encrypted_key: string
          status: 'active' | 'error' | 'disconnected'
          meta: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['integrations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['integrations']['Insert']>
      }
      campaigns: {
        Row: {
          id: string
          org_id: string
          name: string
          status: 'draft' | 'running' | 'paused' | 'done'
          filters: {
            industry: string
            location: string
            job_title: string
            employee_range: string
            min_revenue: string
          }
          ai_persona: {
            agency_name: string
            tone: string
            language: string
            reference_clients: string[]
            cta_url: string
          }
          rag_enabled: boolean
          leads_count: number
          emails_sent: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'leads_count' | 'emails_sent'>
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      leads: {
        Row: {
          id: string
          campaign_id: string
          org_id: string
          person: Json
          company: Json
          status: 'pending' | 'emailed' | 'replied' | 'booked' | 'unsubscribed'
          email_subject: string | null
          email_body_html: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
    }
  }
}

// Convenience types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type UserProfile = Database['public']['Tables']['users']['Row']
export type Integration = Database['public']['Tables']['integrations']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']

export const PLAN_LIMITS = {
  free: { leads: 50, campaigns: 1, users: 1 },
  starter: { leads: 500, campaigns: 5, users: 3 },
  pro: { leads: 2000, campaigns: -1, users: 10 },
  agency: { leads: 10000, campaigns: -1, users: -1 },
} as const

export const PLAN_PRICES = {
  free: 0,
  starter: 49,
  pro: 149,
  agency: 399,
} as const
