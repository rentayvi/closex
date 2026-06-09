# CloserX — Guide de démarrage

## Prérequis
- Node.js 18+
- Compte Supabase (supabase.com)
- Compte n8n (n8n.io ou self-hosted)

---

## 1. Installation

```bash
cd closerx
npm install
cp .env.example .env.local
```

---

## 2. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans **SQL Editor** et exécuter le contenu de `supabase/schema.sql`
3. Copier vos credentials dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` → Settings > API > service_role key

---

## 3. n8n

### Option A — Local (développement)
```bash
# Lancer n8n localement
N8N_SECURE_COOKIE=false npx n8n
# Ouvrir http://localhost:5678
```

### Option B — Cloud
- Créer un compte sur [n8n.io](https://n8n.io)
- Importer le workflow `LEAD 2.0.json` (fourni séparément)
- Copier l'URL des webhooks dans `.env.local`

### Configuration des webhooks
Dans `.env.local` :
```
N8N_LEADS_WEBHOOK_URL=https://votre-n8n/webhook/XXXX   # webhook de recherche leads
N8N_EMAIL_WEBHOOK_URL=https://votre-n8n/webhook/XXXX   # webhook envoi email
```

---

## 4. Variables d'environnement complètes

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

N8N_BASE_URL=https://votre-n8n.com
N8N_API_KEY=votre_cle_api_n8n
N8N_LEADS_WEBHOOK_URL=https://...
N8N_EMAIL_WEBHOOK_URL=https://...

ENCRYPTION_KEY=une_cle_de_32_caracteres_minimum

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Lancer en développement

```bash
npm run dev
# → http://localhost:3000
```

---

## 6. Structure des fichiers

```
src/
├── app/
│   ├── login/          # Page de connexion
│   ├── signup/         # Inscription
│   ├── onboarding/     # Configuration initiale
│   ├── dashboard/      # Dashboard principal
│   ├── campaigns/      # Liste + création campagnes
│   │   └── new/        # Formulaire nouvelle campagne
│   ├── leads/          # Vue des leads
│   ├── integrations/   # Gestion clés API
│   └── settings/       # Paramètres org
├── components/
│   ├── layout/         # Sidebar, Header
│   └── ui/             # Composants réutilisables
├── lib/
│   ├── supabase.ts     # Client Supabase (browser + server)
│   └── utils.ts        # Utilitaires
├── types/
│   └── database.ts     # Types TypeScript générés
└── middleware.ts        # Auth guard (routes protégées)

supabase/
└── schema.sql          # Schéma complet + RLS + triggers
```

---

## 7. Déploiement (Vercel)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Ajouter les variables d'environnement dans le dashboard Vercel
```

---

## 8. Prochaines étapes (Phase 2)

- [ ] Route API `/api/campaigns/[id]/run` → appel webhook n8n leads
- [ ] Route API `/api/campaigns/[id]/send` → appel webhook n8n email
- [ ] Upload RAG documents (Supabase Storage)
- [ ] Intégration Stripe (plans)
- [ ] Page campagne détaillée avec lancement en un clic
