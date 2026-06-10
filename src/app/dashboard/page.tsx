// @ts-nocheck
export const dynamic = 'force-dynamic'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { PLAN_LIMITS } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  const org = (profile as any)?.organizations
  const plan = org?.plan ?? 'free'
  const leadsUsed = org?.leads_used_this_month ?? 0
  const leadsLimit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].leads

  // Stats
  const { count: campaignCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)

  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)

  const { count: emailedCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org?.id)
    .eq('status', 'emailed')

  const stats = [
    { label: 'Campagnes', value: campaignCount ?? 0, icon: '🚀', color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Leads trouvés', value: leadCount ?? 0, icon: '👥', color: 'bg-blue-50 text-blue-600' },
    { label: 'Emails envoyés', value: emailedCount ?? 0, icon: '📧', color: 'bg-green-50 text-green-600' },
    { label: 'Taux de contact', value: leadCount ? `${Math.round(((emailedCount ?? 0) / leadCount) * 100)}%` : '0%', icon: '📈', color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </h1>
            <p className="text-gray-500 mt-1">{org?.name} · Plan {plan}</p>
          </div>

          {/* Usage bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Leads ce mois-ci</span>
              <span className="text-sm text-gray-500">{leadsUsed} / {leadsLimit === -1 ? '∞' : leadsLimit}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: leadsLimit === -1 ? '10%' : `${Math.min(100, (leadsUsed / leadsLimit) * 100)}%` }}
              />
            </div>
            {leadsLimit !== -1 && leadsUsed >= leadsLimit * 0.8 && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Proche de la limite — <a href="/settings" className="underline">passer au plan supérieur</a>
              </p>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${stat.color}`}>
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Actions rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a href="/campaigns/new" className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                <span className="text-2xl">🚀</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">Nouvelle campagne</div>
                  <div className="text-xs text-gray-500">Trouver des leads + envoyer emails</div>
                </div>
              </a>
              <a href="/integrations" className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                <span className="text-2xl">🔌</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">Gérer les intégrations</div>
                  <div className="text-xs text-gray-500">Gmail, OpenAI, Apify</div>
                </div>
              </a>
              <a href="/leads" className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">Voir mes leads</div>
                  <div className="text-xs text-gray-500">Statut et historique</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
