// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const STEPS = ['Organisation', 'OpenAI', 'Apify', 'Prêt']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [apifyKey, setApifyKey] = useState('')

  const handleOrgSubmit = () => {
    if (orgName.trim()) setStep(1)
  }

  const saveIntegration = async (type: 'openai' | 'apify', key: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get org_id from users table
    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile) return

    // Update org name
    if (step === 0) {
      await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', profile.org_id)
    }

    // Save integration key (in real app, encrypt server-side)
    await supabase.from('integrations').upsert({
      org_id: profile.org_id,
      type,
      encrypted_key: key, // TODO: encrypt via API route
      status: 'active',
    })
  }

  const handleOpenAI = async () => {
    if (!openaiKey.trim()) { setStep(2); return }
    setLoading(true)
    await saveIntegration('openai', openaiKey)
    setLoading(false)
    setStep(2)
  }

  const handleApify = async () => {
    if (!apifyKey.trim()) { setStep(3); return }
    setLoading(true)
    await saveIntegration('apify', apifyKey)
    setLoading(false)
    setStep(3)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">CloserX</h1>
          <p className="text-slate-400 mt-1 text-sm">Configuration de votre espace</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-indigo-600 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-green-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 0: Org name */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Votre organisation</h2>
              <p className="text-sm text-gray-500 mb-6">Le nom de votre agence ou entreprise.</p>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                placeholder="Naiom Agency, Acme Corp..."
              />
              <button onClick={handleOrgSubmit} className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition-colors">
                Continuer →
              </button>
            </div>
          )}

          {/* Step 1: OpenAI */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">🤖</div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Clé API OpenAI</h2>
                  <p className="text-xs text-gray-500">Utilisée pour générer les emails IA</p>
                </div>
              </div>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                placeholder="sk-..."
              />
              <p className="text-xs text-gray-400 mb-4">Trouvable sur platform.openai.com/api-keys · Stockée chiffrée</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Passer
                </button>
                <button onClick={handleOpenAI} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {loading ? '...' : 'Enregistrer →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Apify */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">🔍</div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Clé API Apify</h2>
                  <p className="text-xs text-gray-500">Utilisée pour trouver les leads qualifiés</p>
                </div>
              </div>
              <input
                type="password"
                value={apifyKey}
                onChange={(e) => setApifyKey(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                placeholder="apify_api_..."
              />
              <p className="text-xs text-gray-400 mb-4">Trouvable sur console.apify.com/account/integrations · Stockée chiffrée</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Passer
                </button>
                <button onClick={handleApify} disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {loading ? '...' : 'Enregistrer →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🎉</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Vous êtes prêt !</h2>
              <p className="text-sm text-gray-500 mb-6">Votre espace CloserX est configuré. Créez votre première campagne de prospection.</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition-colors"
              >
                Accéder au dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
