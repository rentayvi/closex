/**
 * POST /api/campaigns/[id]/send
 * Envoie l'email IA pour un lead donné (ou tous les leads pending).
 * Body: { lead_id?: string }  — si absent, traite tous les leads pending de la campagne.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Get OpenAI + Gmail integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('type, encrypted_key')
    .eq('org_id', profile.org_id)
    .eq('status', 'active')
    .in('type', ['openai', 'gmail'])

  const openai = integrations?.find(i => i.type === 'openai')
  const gmail = integrations?.find(i => i.type === 'gmail')

  if (!openai) return NextResponse.json({ error: 'Clé API OpenAI non configurée.' }, { status: 400 })
  if (!gmail) return NextResponse.json({ error: 'Gmail non configuré.' }, { status: 400 })

  // Get leads to process
  let leadsQuery = supabase
    .from('leads')
    .select('*')
    .eq('campaign_id', id)
    .eq('status', 'pending')

  if (body.lead_id) {
    leadsQuery = leadsQuery.eq('id', body.lead_id)
  } else {
    leadsQuery = leadsQuery.limit(10) // batch of 10 max per call
  }

  const { data: leads } = await leadsQuery
  if (!leads || leads.length === 0) {
    return NextResponse.json({ message: 'Aucun lead en attente.', sent: 0 })
  }

  const n8nUrl = process.env.N8N_EMAIL_WEBHOOK_URL
  if (!n8nUrl) return NextResponse.json({ error: 'N8N_EMAIL_WEBHOOK_URL non configuré' }, { status: 500 })

  let sent = 0
  const errors: string[] = []

  for (const lead of leads) {
    const person = lead.person as any
    const company = lead.company as any

    try {
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Lead data
          person,
          company,
          // AI persona config
          agency_name: campaign.ai_persona.agency_name,
          tone: campaign.ai_persona.tone,
          language: campaign.ai_persona.language,
          reference_clients: campaign.ai_persona.reference_clients,
          cta_url: campaign.ai_persona.cta_url,
          // Credentials (server-side only)
          openai_key: openai.encrypted_key,
          gmail_token: gmail.encrypted_key,
          // Meta
          campaign_id: campaign.id,
          lead_id: lead.id,
        }),
      })

      if (!response.ok) throw new Error(`n8n responded ${response.status}`)

      const result = await response.json()

      // Update lead status
      await supabase
        .from('leads')
        .update({
          status: 'emailed',
          email_subject: result.subject ?? result.body?.titre ?? null,
          email_body_html: result.body ?? null,
          sent_at: new Date().toISOString(),
        })
        .eq('id', lead.id)

      sent++
    } catch (err: any) {
      errors.push(`${person?.email}: ${err.message}`)
    }
  }

  // Update campaign emails_sent count
  if (sent > 0) {
    await supabase
      .from('campaigns')
      .update({ emails_sent: campaign.emails_sent + sent })
      .eq('id', campaign.id)
  }

  return NextResponse.json({
    success: true,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  })
}
