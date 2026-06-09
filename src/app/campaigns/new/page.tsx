// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase'

const INDUSTRIES = ['SaaS', 'Real Estate', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Consulting', 'Marketing', 'Legal', 'Education', 'Other']
const JOB_TITLES = ['founder', 'c_suite', 'vp', 'director', 'manager', 'senior']
const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001+']
const REVENUES = ['100K', '500K', '1M', '5M', '10M', '50M', '100M']

export default function NewCampaignPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 0: Campaign name
  const [name, setName] = useState('')

  // Step 1: Lead filters
  const [filters, setFilters] = useState({
    industry: '',
    location: '',
    job_title: '',
    employee_range: '',
    min_revenue: '',
  })

  // Step 2: AI Persona
  const [persona, setPersona] = useState({
    agency_name: '',
    tone: 'professional',
    language: 'fr',
    reference_clients: '',
    cta_url: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const { data: profile } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('Profil introuvable')

      const { data: campaign, error: insertError } = await supabase
        .from('campaigns')
        .insert({
          org_id: profile.org_id,
          name,
          status: 'draft',
          filters,
          ai_persona: {
            ...persona,
            reference_clients: persona.reference_clients.split(',').map(s => s.trim()).filter(Boolean),
          },
          rag_enabled: false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push(`/campaigns/${campaign.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div className="mb-6">
            <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
              ← Retour
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle campagne</h1>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {['Nom', 'Leads', 'Agent IA'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    i === step ? 'bg-indigo-600 text-white' :
                    i < step ? 'bg-green-100 text-green-700 cursor-pointer' :
                    'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {i < step ? '✓' : i + 1} {s}
                </button>
                {i < 2 && <div className={`w-8 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {/* Step 0: Name */}
            {step === 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Nom de la campagne</h2>
                <p className="text-sm text-gray-500 mb-5">Un nom interne pour vous y retrouver.</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Agences marketing Paris Q3"
                  autoFocus
                />
                <button
                  onClick={() => name.trim() && setStep(1)}
                  disabled={!name.trim()}
                  className="mt-5 w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Continuer →
                </button>
              </div>
            )}

            {/* Step 1: Lead filters */}
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Filtres de recherche</h2>
                <p className="text-sm text-gray-500 mb-5">Définissez le profil des leads à rechercher.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Secteur</label>
                    <select
                      value={filters.industry}
                      onChange={(e) => setFilters(f => ({ ...f, industry: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Sélectionner...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Localisation</label>
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="france, paris, europe..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Poste</label>
                      <select
                        value={filters.job_title}
                        onChange={(e) => setFilters(f => ({ ...f, job_title: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Tous</option>
                        {JOB_TITLES.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Taille entreprise</label>
                      <select
                        value={filters.employee_range}
                        onChange={(e) => setFilters(f => ({ ...f, employee_range: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Toutes</option>
                        {EMPLOYEE_RANGES.map(r => <option key={r} value={r}>{r} employés</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">CA minimum</label>
                    <select
                      value={filters.min_revenue}
                      onChange={(e) => setFilters(f => ({ ...f, min_revenue: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Aucun minimum</option>
                      {REVENUES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(0)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    ← Retour
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!filters.industry || !filters.location}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Continuer →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: AI Persona */}
            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Agent IA</h2>
                <p className="text-sm text-gray-500 mb-5">Configurez la voix de votre agent pour qu'il représente votre agence.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Nom de votre agence</label>
                    <input
                      type="text"
                      value={persona.agency_name}
                      onChange={(e) => setPersona(p => ({ ...p, agency_name: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Naiom, Acme Agency..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Ton</label>
                      <select
                        value={persona.tone}
                        onChange={(e) => setPersona(p => ({ ...p, tone: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="professional">Professionnel</option>
                        <option value="friendly">Amical</option>
                        <option value="direct">Direct</option>
                        <option value="formal">Formel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Langue</label>
                      <select
                        value={persona.language}
                        onChange={(e) => setPersona(p => ({ ...p, language: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="fr">Français</option>
                        <option value="en">Anglais</option>
                        <option value="es">Espagnol</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Clients de référence (séparés par virgule)</label>
                    <input
                      type="text"
                      value={persona.reference_clients}
                      onChange={(e) => setPersona(p => ({ ...p, reference_clients: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Decathlon, PSG, Total..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Lien Calendly / CTA</label>
                    <input
                      type="url"
                      value={persona.cta_url}
                      onChange={(e) => setPersona(p => ({ ...p, cta_url: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://calendly.com/votre-lien"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl">{error}</div>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 border border-gray-300 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    ← Retour
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !persona.agency_name}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Création...' : '🚀 Créer la campagne'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
