# CloserX — Guide de déploiement complet

## Vue d'ensemble

```
GitHub (code) → Vercel (frontend) → Supabase (DB) → n8n (automation) → Stripe (paiement)
```

---

## ÉTAPE 1 — Pousser le code sur GitHub

```bash
cd closerx

# Initialiser Git
git init
git add .
git commit -m "feat: CloserX MVP initial"

# Créer un repo sur github.com, puis :
git remote add origin https://github.com/TON_USERNAME/closerx.git
git branch -M main
git push -u origin main
```

---

## ÉTAPE 2 — Déployer sur Vercel

### 2a. Via CLI (recommandé)
```bash
npm install -g vercel
vercel login
vercel
# → Follow prompts (Next.js auto-détecté)
# → Répondre "closerx" au nom du projet
# → Ne pas ajouter de variables d'env maintenant (on le fait après)
```

### 2b. Via interface web
1. Aller sur [vercel.com/new](https://vercel.com/new)
2. "Import Git Repository" → sélectionner le repo `closerx`
3. Framework preset : **Next.js** (auto-détecté)
4. Cliquer **Deploy** (va échouer sans les env vars, c'est normal)

---

## ÉTAPE 3 — Configurer Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Nom : `closerx` · Choisir une région proche (Europe West)
3. **SQL Editor** → coller le contenu de `supabase/schema.sql` → Run
4. **Settings → API** → copier :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

5. **Authentication → URL Configuration** → ajouter :
   - Site URL : `https://votre-app.vercel.app`
   - Redirect URLs : `https://votre-app.vercel.app/**`

---

## ÉTAPE 4 — Configurer Stripe

1. Aller sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products** → Créer 3 produits :

| Produit | Prix | Interval | Variable env |
|---------|------|----------|-------------|
| CloserX Starter | 49€ | Monthly | `STRIPE_PRICE_STARTER` |
| CloserX Pro | 149€ | Monthly | `STRIPE_PRICE_PRO` |
| CloserX Agency | 399€ | Monthly | `STRIPE_PRICE_AGENCY` |

3. Copier la **clé secrète** → `STRIPE_SECRET_KEY`
4. **Webhooks** → Add endpoint :
   - URL : `https://votre-app.vercel.app/api/stripe/webhook`
   - Events : `checkout.session.completed`, `customer.subscription.deleted`
   - Copier le **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## ÉTAPE 5 — Déployer n8n

### Option A — Railway (recommandé, 5$/mois)
1. Aller sur [railway.app](https://railway.app)
2. New Project → Deploy from Docker image → `n8nio/n8n`
3. Variables d'environnement :
   ```
   N8N_SECURE_COOKIE=false
   N8N_HOST=0.0.0.0
   N8N_PROTOCOL=https
   WEBHOOK_URL=https://ton-projet.railway.app
   ```
4. Générer un domaine public → copier l'URL

### Option B — n8n Cloud (20$/mois, zéro config)
1. [app.n8n.cloud](https://app.n8n.cloud) → créer un compte
2. Copier l'URL de ton instance

### Importer le workflow
1. Dans n8n → **Workflows** → **Import from file**
2. Importer `LEAD 2.0.json` (dans le dossier uploads du projet)
3. Configurer les credentials (Gmail OAuth, OpenAI)
4. **Activer** le workflow
5. Copier les URLs des webhooks → `.env.local`

---

## ÉTAPE 6 — Variables d'environnement sur Vercel

Aller sur **Vercel → ton projet → Settings → Environment Variables**

Ajouter toutes ces variables :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# n8n
N8N_BASE_URL=https://ton-n8n.railway.app
N8N_LEADS_WEBHOOK_URL=https://ton-n8n.railway.app/webhook/aecd6009-...
N8N_EMAIL_WEBHOOK_URL=https://ton-n8n.railway.app/webhook/e653fbe9-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# App
NEXT_PUBLIC_APP_URL=https://closerx.vercel.app
ENCRYPTION_KEY=une_cle_aleatoire_de_32_caracteres
```

Après avoir ajouté les variables → **Redeploy**

---

## ÉTAPE 7 — Domaine custom (optionnel)

1. Vercel → Settings → Domains → Ajouter `closerx.io` (ou autre)
2. Configurer les DNS chez ton registrar (A record ou CNAME)
3. Mettre à jour `NEXT_PUBLIC_APP_URL` + Supabase redirect URL + Stripe webhook URL

---

## ÉTAPE 8 — Vérification finale

Checklist avant de vendre :

- [ ] `https://ton-app.vercel.app` charge la page de login
- [ ] Inscription crée bien un compte + une organisation en base
- [ ] Onboarding sauvegarde les clés API
- [ ] Création campagne fonctionne
- [ ] "Trouver des leads" appelle bien n8n et stocke les leads
- [ ] "Envoyer emails" envoie bien depuis Gmail
- [ ] Paiement Stripe redirige vers checkout et met à jour le plan
- [ ] Déconnexion fonctionne

---

## Commandes utiles

```bash
# Voir les logs en prod
vercel logs

# Redéployer manuellement
vercel --prod

# Tester le webhook Stripe en local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Lancer n8n en local pour tests
N8N_SECURE_COOKIE=false npx n8n
```

---

## Architecture de prod

```
closerx.io (Vercel) 
    ↕ Supabase (supabase.co) — DB + Auth
    ↕ n8n (railway.app) — Automation
    ↕ Stripe (stripe.com) — Paiement
    ↕ Apify (apify.com) — Leads [clé du client]
    ↕ OpenAI (openai.com) — IA [clé du client]
    ↕ Gmail (google.com) — Email [OAuth du client]
```

*Guide v1.0 — CloserX MVP*
