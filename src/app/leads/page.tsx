import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/types/database'

const STATUS_CONFIG = {
  pending:      { label: 'En attente',  color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  emailed:      { label: 'Email envoyé', color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  replied:      { label: 'A répondu',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  booked:       { label: 'RDV pris',    color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  unsubscribed: { label: 'Désabonné',   color: 'bg-red-100 text-red-600',      dot: 'bg-red-400' },
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; campaign?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('leads')
    .select('*')
    .eq('org_id', profile?.org_id)
    .order('created_at', { ascending: false })

  if (params.status) query = query.eq('status', params.status)
  if (params.campaign) query = query.eq('campaign_id', params.campaign)

  const { data: leads, count } = await query.limit(100)

  // Stats per status
  const { data: stats } = await supabase
    .from('leads')
    .select('status')
    .eq('org_id', profile?.org_id)

  const statCounts = (stats ?? []).reduce((acc: Record<string, number>, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-gray-500 mt-1">{(count ?? leads?.length ?? 0).toLocaleString('fr-FR')} leads au total</p>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <a
              href="/leads"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !params.status ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tous ({Object.values(statCounts).reduce((a, b) => a + b, 0)})
            </a>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <a
                key={status}
                href={`/leads?status=${status}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  params.status === status ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {config.label} ({statCounts[status] ?? 0})
              </a>
            ))}
          </div>

          {/* Empty state */}
          {(!leads || leads.length === 0) && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun lead</h3>
              <p className="text-sm text-gray-500 mb-6">Lancez une campagne pour commencer à trouver des leads qualifiés.</p>
              <a href="/campaigns/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                Créer une campagne
              </a>
            </div>
          )}

          {/* Leads table */}
          {leads && leads.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entreprise</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Secteur</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead: Lead) => {
                    const person = lead.person as any
                    const company = lead.company as any
                    const status = STATUS_CONFIG[lead.status]

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">{person?.full_name ?? '—'}</div>
                          <div className="text-xs text-gray-500">{person?.email ?? '—'}</div>
                          <div className="text-xs text-gray-400">{person?.job_title}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-gray-900">{company?.name ?? '—'}</div>
                          <div className="text-xs text-gray-500">{company?.size ? `${company.size} employés` : ''}</div>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{company?.industry ?? '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                          {lead.email_subject && (
                            <div className="text-xs text-gray-400 mt-1 truncate max-w-[160px]" title={lead.email_subject}>
                              {lead.email_subject}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-500">{formatDate(lead.created_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
