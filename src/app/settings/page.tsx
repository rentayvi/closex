// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase'
import { PLAN_LIMITS, PLAN_PRICES } from '@/types/database'

const PLANS = [
  {
    key: 'free' as const,
    name: 'Free',
    price: 0,
    description: 'Pour tester CloserX',
    features: ['50 leads/mois', '1 campagne', '1 utilisateur'],
    cta: null,
  },
  {
    key: 'starter' as const,
    name: 'Starter',
    price: 49,
    description: 'Pour les indépendants',
    features: ['500 leads/mois', '5 campagnes', '3 utilisateurs'],
    cta: 'Passer à Starter',
    highlight: false,
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    price: 149,
    description: 'Pour les équipes actives',
    features: ['2 000 leads/mois', 'Campagnes illimitées', '10 utilisateurs', 'RAG inclus'],
    cta: 'Passer à Pro',
    highlight: true,
  },
  {
    key: 'agency' as const,
    name: 'Agency',
    price: 399,
    description: 'Pour les agences',
    features: ['10 000 leads/mois', 'Utilisateurs illimités', 'White-label', 'API access'],
    cta: 'Passer à Agency',
    highlight: false,
  },
]

export default function SettingsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('users')
        .select('org_id, organizations(*)')
        .eq('id', user.id)
        .single()
      const o = (profile as any)?.organizations
      setOrg(o)
      setOrgName(o?.name ?? '')
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpgrade = async (plan: string) => {
    setCheckoutLoading(plan)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const { url, error } = await res.json()
    if (error) { alert(error); setCheckoutLoading(null); return }
    window.location.href = url
  }

  const handleSaveOrg = async () => {
    if (!org) return
    setSaving(true)
    await supabase.from('organizations').update({ name: orgName }).eq('id', org.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center text-gray-400">Chargement...</main>
    </div>
  )

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          </div>

          {/* Upgrade success */}
          {upgraded && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl text-sm font-medium">
              🎉 Votre plan a été mis à jour avec succès !
            </div>
          )}

          {/* Org settings */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Organisation</h2>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom de l'organisation</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSaveOrg}
                disabled={saving}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saved ? '✓ Sauvegardé' : saving ? '...' : 'Sauvegarder'}
              </button>
            </div>
            <div className="mt-3 text-sm text-gray-500">
              Plan actuel : <span className="font-medium capitalize">{org?.plan}</span>
              {' · '}
              {org?.leads_used_this_month} leads utilisés ce mois
            </div>
          </div>

          {/* Plans */}
          <h2 className="text-base font-semibold text-gray-900 mb-4">Changer de plan</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = org?.plan === plan.key
              return (
                <div
                  key={plan.key}
                  className={`bg-white rounded-2xl border p-5 relative ${
                    plan.highlight ? 'border-indigo-400 shadow-md' : 'border-gray-200'
                  } ${isCurrent ? 'ring-2 ring-indigo-600' : ''}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Populaire
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Actuel
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="text-base font-bold text-gray-900">{plan.name}</div>
                    <div className="text-xs text-gray-500">{plan.description}</div>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold text-gray-900">{plan.price === 0 ? 'Gratuit' : `${plan.price}€`}</span>
                    {plan.price > 0 && <span className="text-xs text-gray-400">/mois</span>}
                  </div>

                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-green-500 mt-0.5">✓</span> {f}
                      </li>
                    ))}
                  </ul>

                  {plan.cta && !isCurrent ? (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={checkoutLoading === plan.key}
                      className={`w-full py-2 text-sm font-medium rounded-xl transition-colors ${
                        plan.highlight
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'border border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                      } disabled:opacity-50`}
                    >
                      {checkoutLoading === plan.key ? '...' : plan.cta}
                    </button>
                  ) : (
                    <div className={`w-full py-2 text-sm font-medium text-center rounded-xl ${
                      isCurrent ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 text-gray-400'
                    }`}>
                      {isCurrent ? 'Plan actuel' : 'Gratuit'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Billing note */}
          <p className="text-xs text-gray-400 mt-4 text-center">
            Paiement sécurisé via Stripe · Résiliation à tout moment · Vos clés API restent vôtres
          </p>
        </div>
      </main>
    </div>
  )
}
