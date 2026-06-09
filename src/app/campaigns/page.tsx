import { createServerSupabaseClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import { formatDate } from '@/lib/utils'
import type { Campaign } from '@/types/database'

const STATUS_CONFIG = {
  draft:   { label: 'Brouillon', color: 'bg-gray-100 text-gray-600' },
  running: { label: 'En cours',  color: 'bg-green-100 text-green-700' },
  paused:  { label: 'Pausée',    color: 'bg-yellow-100 text-yellow-700' },
  done:    { label: 'Terminée',  color: 'bg-blue-100 text-blue-700' },
}

export default async function CampaignsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', profile?.org_id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Campagnes</h1>
              <p className="text-gray-500 mt-1">{campaigns?.length ?? 0} campagne{(campaigns?.length ?? 0) !== 1 ? 's' : ''}</p>
            </div>
            <Link
              href="/campaigns/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <span>+</span> Nouvelle campagne
            </Link>
          </div>

          {/* Empty state */}
          {(!campaigns || campaigns.length === 0) && (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune campagne</h3>
              <p className="text-sm text-gray-500 mb-6">Créez votre première campagne pour trouver des leads et envoyer des emails IA personnalisés.</p>
              <Link href="/campaigns/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                Créer une campagne
              </Link>
            </div>
          )}

          {/* Campaign list */}
          {campaigns && campaigns.length > 0 && (
            <div className="space-y-3">
              {campaigns.map((campaign: Campaign) => {
                const status = STATUS_CONFIG[campaign.status]
                const emailRate = campaign.leads_count > 0
                  ? Math.round((campaign.emails_sent / campaign.leads_count) * 100)
                  : 0

                return (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">{campaign.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {campaign.filters.industry} · {campaign.filters.location} · {campaign.filters.job_title}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 ml-6 shrink-0">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{campaign.leads_count}</div>
                          <div className="text-xs text-gray-400">leads</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900">{campaign.emails_sent}</div>
                          <div className="text-xs text-gray-400">envoyés</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-indigo-600">{emailRate}%</div>
                          <div className="text-xs text-gray-400">taux</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-400">
                      Créée le {formatDate(campaign.created_at)}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
