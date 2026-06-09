/**
 * POST /api/campaigns/[id]/run
 * Déclenche la recherche de leads via le webhook n8n.
 * n8n appelle Apify → stocke les leads en base → retourne le nombre trouvé.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get user org
  const { data: profile } = await supabase
    .from('users')
    .select('org_id, organizations(plan, leads_used_this_month)')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const org = (profile as any).organizations
  const PLAN_LIMITS: Record<string, number> = {
    free: 50, starter: 500, pro: 2000, agency: 10000
  }
  const limit = PLAN_LIMITS[org.plan] ?? 50
  if (org.leads_used_this_month >= limit) {
    return NextResponse.json({ error: 'Limite de leads atteinte. Passez au plan supérieur.' }, { status: 429 })
  }

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Get Apify key
  const { data: integration } = await supabase
    .from('integrations')
    .select('encrypted_key')
    .eq('org_id', profile.org_id)
    .eq('type', 'apify')
    .eq('status', 'active')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Clé API Apify non configurée. Allez dans Intégrations.' }, { status: 400 })
  }

  // Call n8n webhook
  const n8nUrl = process.env.N8N_LEADS_WEBHOOK_URL
  if (!n8nUrl) return NextResponse.json({ error: 'N8N_LEADS_WEBHOOK_URL non configuré' }, { status: 500 })

  try {
    const n8nResponse = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaign.id,
        org_id: profile.org_id,
        apify_token: integration.encrypted_key, // decrypted in production
        industry: campaign.filters.industry,
        location: campaign.filters.location,
        jobTitle: campaign.filters.job_title,
        employeeRange: campaign.filters.employee_range,
        revenue: campaign.filters.min_revenue,
        fetch_count: Math.min(100, limit - org.leads_used_this_month),
      }),
    })

    if (!n8nResponse.ok) {
      const text = await n8nResponse.text()
      throw new Error(`n8n error: ${text}`)
    }

    const leads = await n8nResponse.json()
    const leadsArray = Array.isArray(leads) ? leads : [leads]

    // Insert leads into DB
    if (leadsArray.length > 0) {
      const rows = leadsArray.map((lead: any) => ({
        campaign_id: campaign.id,
        org_id: profile.org_id,
        person: {
          full_name: lead.full_name ?? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim(),
          first_name: lead.first_name,
          last_name: lead.last_name,
          email: lead.email,
          job_title: lead.job_title,
          linkedin: lead.linkedin_url,
          seniority_level: lead.seniority_level,
        },
        company: {
          name: lead.organization_name ?? lead.company,
          industry: lead.industry,
          size: lead.employees,
          description: lead.organization_description,
          technologies: lead.technologies ?? [],
          website: lead.website_url,
          address: { city: lead.city, country: lead.country },
          financials: { annual_revenue: lead.annual_revenue },
        },
        status: 'pending',
      }))

      await supabase.from('leads').insert(rows)

      // Update campaign + org usage
      await supabase
        .from('campaigns')
        .update({ leads_count: campaign.leads_count + leadsArray.length, status: 'running' })
        .eq('id', campaign.id)

      await supabase
        .from('organizations')
        .update({ leads_used_this_month: org.leads_used_this_month + leadsArray.length })
        .eq('id', profile.org_id)
    }

    return NextResponse.json({ success: true, leads_found: leadsArray.length })
  } catch (err: any) {
    console.error('[run campaign]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
