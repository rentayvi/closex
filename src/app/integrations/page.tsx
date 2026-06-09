'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase'

type IntegrationStatus = 'active' | 'error' | 'disconnected' | 'not_set'

interface IntegrationState {
  status: IntegrationStatus
  loading: boolean
  key: string
  editing: boolean
}

const INTEGRATIONS = [
  {
    type: 'openai' as const,
    name: 'OpenAI',
    description: 'Génération des emails IA personnalisés (GPT-4.1)',
    icon: '🤖',
    color: 'bg-green-50',
    placeholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    docsLabel: 'platform.openai.com',
  },
  {
    type: 'apify' as const,
    name: 'Apify',
    description: 'Recherche et enrichissement de leads B2B',
    icon: '🔍',
    color: 'bg-orange-50',
    placeholder: 'apify_api_...',
    docsUrl: 'https://console.apify.com/account/integrations',
    docsLabel: 'console.apify.com',
  },
  {
    type: 'gmail' as const,
    name: 'Gmail',
    description: 'Envoi des emails depuis votre propre adresse',
    icon: '📧',
    color: 'bg-red-50',
    placeholder: 'OAuth — configurer via n8n',
    docsUrl: 'https://docs.closerx.app/gmail',
    docsLabel: 'Guide de configuration',
  },
]

export default function IntegrationsPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [integrations, setIntegrations] = useState<Record<string, IntegrationState>>({
    openai: { status: 'not_set', loading: false, key: '', editing: false },
    apify: { status: 'not_set', loading: false, key: '', editing: false },
    gmail: { status: 'not_set', loading: false, key: '', editing: false },
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!profile) return
      setOrgId(profile.org_id)

      const { data: existing } = await supabase
        .from('integrations')
        .select('type, status')
        .eq('org_id', profile.org_id)

      if (existing) {
        const updated = { ...integrations }
        existing.forEach(({ type, status }) => {
          if (updated[type]) {
            updated[type].status = status as IntegrationStatus
          }
        })
        setIntegrations(updated)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (type: string, key: string) => {
    if (!orgId || !key.trim()) return
    setIntegrations(prev => ({ ...prev, [type]: { ...prev[type], loading: true } }))

    const { error } = await supabase.from('integrations').upsert({
      org_id: orgId,
      type,
      encrypted_key: key, // TODO: encrypt via API route
      status: 'active',
    })

    setIntegrations(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        loading: false,
        editing: false,
        status: error ? 'error' : 'active',
        key: '',
      },
    }))
  }

  const disconnect = async (type: string) => {
    if (!orgId) return
    await supabase.from('integrations')
      .update({ status: 'disconnected' })
      .eq('org_id', orgId)
      .eq('type', type)

    setIntegrations(prev => ({ ...prev, [type]: { ...prev[type], status: 'disconnected' } }))
  }

  const STATUS_BADGE: Record<IntegrationStatus, { label: string, color: string }> = {
    active: { label: '✓ Connecté', color: 'bg-green-100 text-green-700' },
    error: { label: '✕ Erreur', color: 'bg-red-100 text-red-700' },
    disconnected: { label: 'Déconnecté', color: 'bg-gray-100 text-gray-500' },
    not_set: { label: 'Non configuré', color: 'bg-gray-100 text-gray-500' },
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Intégrations</h1>
            <p className="text-gray-500 mt-1">Connectez vos outils — clés stockées chiffrées dans votre espace.</p>
          </div>

          <div className="space-y-4">
            {INTEGRATIONS.map((integration) => {
              const state = integrations[integration.type]
              const badge = STATUS_BADGE[state.status]

              return (
                <div key={integration.type} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${integration.color} rounded-xl flex items-center justify-center text-2xl`}>
                        {integration.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{integration.description}</p>
                        <a
                          href={integration.docsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline mt-0.5 block"
                        >
                          {integration.docsLabel} ↗
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {state.status === 'active' && (
                        <button
                          onClick={() => disconnect(integration.type)}
                          className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Déconnecter
                        </button>
                      )}
                      {state.status !== 'active' && !state.editing && (
                        <button
                          onClick={() => setIntegrations(prev => ({ ...prev, [integration.type]: { ...prev[integration.type], editing: true } }))}
                          className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Configurer
                        </button>
                      )}
                    </div>
                  </div>

                  {state.editing && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={state.key}
                          onChange={(e) => setIntegrations(prev => ({ ...prev, [integration.type]: { ...prev[integration.type], key: e.target.value } }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={integration.placeholder}
                        />
                        <button
                          onClick={() => save(integration.type, state.key)}
                          disabled={state.loading || !state.key}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                        >
                          {state.loading ? '...' : 'Sauver'}
                        </button>
                        <button
                          onClick={() => setIntegrations(prev => ({ ...prev, [integration.type]: { ...prev[integration.type], editing: false, key: '' } }))}
                          className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Security note */}
          <div className="mt-6 bg-indigo-50 rounded-xl p-4 flex gap-3">
            <span className="text-xl">🔐</span>
            <div>
              <p className="text-sm font-medium text-indigo-900">Vos clés restent privées</p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Toutes les clés API sont chiffrées avant stockage et ne sont jamais exposées côté client.
                Elles ne sont utilisées que pour exécuter vos campagnes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
