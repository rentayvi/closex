// @ts-nocheck
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Campaign, Lead } from '@/types/database'

const STATUS_CONFIG = {
  draft:   { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  running: { label: 'En cours',  color: 'bg-green-100 text-green-700' },
  paused:  { label: 'Pausée',    color: 'bg-yellow-100 text-yellow-700' },
  done:    { label: 'Terminée',  color: 'bg-blue-100 text-blue-700' },
}

const LEAD_STATUS = {
  pending:      { label: 'En attente',   color: 'bg-gray-100 text-gray-600' },
  emailed:      { label: 'Email envoyé', color: 'bg-blue-100 text-blue-700' },
  replied:      { label: 'A répondu',    color: 'bg-green-100 text-green-700' },
  booked:       { label: 'RDV pris',     color: 'bg-purple-100 text-purple-700' },
  unsubscribed: { label: 'Désabonné',    color: 'bg-red-100 text-red-600' },
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [selectedLeadEmail, setSelectedLeadEmail] = useState<Lead | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    const { data: c } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    const { data: l } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(50)

    setCampaign(c)
    setLeads(l ?? [])
    setLoading(false)
  }, [campaignId, supabase])

  useEffect(() => { load() }, [load])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/run`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', `✅ ${data.leads_found} leads trouvés !`)
      await load()
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setRunning(false)
    }
  }

  const handleSend = async (leadId?: string) => {
    setSending(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadId ? { lead_id: leadId } : {}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast('success', `📧 ${data.sent} email${data.sent > 1 ? 's' : ''} envoyé${data.sent > 1 ? 's' : ''} !`)
      await load()
    } catch (err: any) {
      showToast('error', err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-gray-400">Chargement...</main>
    </div>
  )

  if (!campaign) return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-gray-400">Campagne introuvable.</main>
    </div>
  )

  const status = STATUS_CONFIG[campaign.status]
  const pendingLeads = leads.filter(l => l.status === 'pending').length
  const emailedLeads = leads.filter(l => l.status === 'emailed').length

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto px-8 py-8">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {toast.msg}
            </div>
          )}

          {/* Back */}
          <button onClick={() => router.push('/campaigns')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
            ← Campagnes
          </button>

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
              </div>
              <p className="text-sm text-gray-500">
                {campaign.filters.industry} · {campaign.filters.location} · {campaign.filters.job_title}
                {campaign.filters.employee_range && ` · ${campaign.filters.employee_range} employés`}
              </p>
            </div>

            <div className="flex gap-2">
              {/* Run: find leads */}
              <button
                onClick={handleRun}
                disabled={running || sending}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <><span className="animate-spin">⟳</span> Recherche...</>
                ) : (
                  <><span>🔍</span> Trouver des leads</>
                )}
              </button>

              {/* Send emails */}
              {pendingLeads > 0 && (
                <button
                  onClick={() => handleSend()}
                  disabled={running || sending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <><span className="animate-spin">⟳</span> Envoi...</>
                  ) : (
                    <><span>📧</span> Envoyer {pendingLeads} email{pendingLeads > 1 ? 's' : ''}</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Leads totaux', value: campaign.leads_count, icon: '👥' },
              { label: 'Emails envoyés', value: campaign.emails_sent, icon: '📧' },
              { label: 'En attente', value: pendingLeads, icon: '⏳' },
              { label: 'Taux envoi', value: campaign.leads_count > 0 ? `${Math.round((campaign.emails_sent / campaign.leads_count) * 100)}%` : '—', icon: '📈' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Persona summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Agent IA configuré</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-400">Agence : </span><span className="font-medium">{campaign.ai_persona.agency_name}</span></div>
              <div><span className="text-gray-400">Ton : </span><span className="font-medium capitalize">{campaign.ai_persona.tone}</span></div>
              <div><span className="text-gray-400">Langue : </span><span className="font-medium">{campaign.ai_persona.language === 'fr' ? 'Français' : campaign.ai_persona.language}</span></div>
              {campaign.ai_persona.reference_clients?.length > 0 && (
                <div className="col-span-3"><span className="text-gray-400">Références : </span><span className="font-medium">{campaign.ai_persona.reference_clients.join(', ')}</span></div>
              )}
              {campaign.ai_persona.cta_url && (
                <div className="col-span-3"><span className="text-gray-400">CTA : </span><a href={campaign.ai_persona.cta_url} className="text-indigo-600 hover:underline truncate">{campaign.ai_persona.cta_url}</a></div>
              )}
            </div>
          </div>

          {/* Leads list */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Leads ({leads.length})</h2>
              {emailedLeads > 0 && (
                <span className="text-xs text-gray-500">{emailedLeads} email{emailedLeads > 1 ? 's' : ''} envoyé{emailedLeads > 1 ? 's' : ''}</span>
              )}
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm">Aucun lead encore. Cliquez sur "Trouver des leads" pour démarrer.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entreprise</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => {
                    const person = lead.person as any
                    const company = lead.company as any
                    const ls = LEAD_STATUS[lead.status]

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-900">{person?.full_name ?? '—'}</div>
                          <div className="text-xs text-gray-500">{person?.email}</div>
                          <div className="text-xs text-gray-400">{person?.job_title}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-800">{company?.name}</div>
                          <div className="text-xs text-gray-500">{company?.industry}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ls.color}`}>{ls.label}</span>
                          {lead.email_subject && (
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[180px]">{lead.email_subject}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5">
                            {lead.status === 'pending' && (
                              <button
                                onClick={() => handleSend(lead.id)}
                                disabled={sending}
                                className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                              >
                                Envoyer
                              </button>
                            )}
                            {lead.email_body_html && (
                              <button
                                onClick={() => setSelectedLeadEmail(lead)}
                                className="text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Voir email
                              </button>
                            )}
                            {person?.linkedin && (
                              <a
                                href={person.linkedin}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs px-2.5 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Email preview modal */}
        {selectedLeadEmail && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLeadEmail(null)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{(selectedLeadEmail.person as any)?.full_name}</div>
                  <div className="text-sm text-gray-500">{selectedLeadEmail.email_subject}</div>
                </div>
                <button onClick={() => setSelectedLeadEmail(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              <div
                className="p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedLeadEmail.email_body_html ?? '' }}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
