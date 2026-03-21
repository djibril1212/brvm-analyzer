# Guide de déploiement — BRVM Daily Analyzer

Ce guide décrit toutes les étapes manuelles pour mettre en production le projet.
Durée estimée : **45–60 minutes** la première fois.

---

## Prérequis

Avant de commencer, tu dois avoir :

- [ ] Un compte [Supabase](https://supabase.com) (gratuit)
- [ ] Un compte [Railway](https://railway.app) (5 $ offerts au départ)
- [ ] Un compte [Vercel](https://vercel.com) (gratuit)
- [ ] Un compte [Anthropic](https://console.anthropic.com) avec une clé API Claude
- [ ] Le repo GitHub `brvm-analyzer` créé et pushé
- [ ] `railway` CLI installé : `npm install -g @railway/cli`
- [ ] `vercel` CLI installé : `npm install -g vercel`

---

## Étape 1 — Supabase (base de données)

### 1.1 Créer le projet

1. Connecte-toi sur [app.supabase.com](https://app.supabase.com)
2. Clique **New project**
3. Remplis :
   - **Name** : `brvm-analyzer`
   - **Database Password** : génère un mot de passe fort (note-le !)
   - **Region** : `West EU (Ireland)` ou `East US` selon ta préférence
4. Clique **Create new project** — attends 1–2 minutes

### 1.2 Exécuter la migration SQL

1. Dans le dashboard Supabase, va dans **SQL Editor** (menu gauche)
2. Clique **New query**
3. Copie-colle le contenu de `backend/db/migrations/001_initial.sql`
4. Clique **Run** (▶)
5. Vérifie que tu vois `Success. No rows returned.`

### 1.3 Récupérer tes clés Supabase

Va dans **Project Settings → API** :

| Variable | Où la trouver |
|----------|---------------|
| `SUPABASE_URL` | **Project URL** (ex: `https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (sous "Project API keys") — ⚠️ garde cette clé secrète |
| `SUPABASE_ANON_KEY` | **anon public** — utilisé par le frontend si besoin |

> ⚠️ Le `service_role` bypass le RLS. Ne jamais l'exposer côté frontend.

---

## Étape 2 — Variables d'environnement locales

Avant de déployer, configure les `.env` locaux pour tester.

### Backend

```bash
cd backend
cp .env.example .env
```

Édite `.env` :

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BRVM_BOC_BASE_URL=https://www.brvm.org/fr/boc
PIPELINE_SECRET=genere-un-secret-aleatoire-ici
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
NEXT_REVALIDATION_URL=http://localhost:3000/api/revalidate
NEXT_REVALIDATION_SECRET=genere-un-autre-secret-ici
```

Pour générer les secrets aléatoires :
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
```

Édite `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_REVALIDATION_SECRET=le-meme-secret-que-dans-le-backend
```

### Test local complet (optionnel)

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload

# Terminal 2 — frontend
cd frontend
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

---

## Étape 3 — Railway (backend FastAPI)

### 3.1 Login Railway

```bash
railway login
```

### 3.2 Créer le projet

```bash
cd brvm-analyzer   # racine du repo
railway init
```

- **Project name** : `brvm-analyzer`
- Railway crée un projet vide

### 3.3 Configurer le service backend

```bash
railway add
```

Sélectionne **Empty service**, nomme-le `backend`.

### 3.4 Configurer les variables d'environnement Railway

Via le dashboard Railway (**Variables** du service `backend`) ou CLI :

```bash
railway variables set \
  ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxx" \
  SUPABASE_URL="https://xxxxxxxxxxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  BRVM_BOC_BASE_URL="https://www.brvm.org/fr/boc" \
  PIPELINE_SECRET="ton-secret-pipeline" \
  ENVIRONMENT="production" \
  CORS_ORIGINS="https://ton-domaine.vercel.app"
```

> Le `NEXT_REVALIDATION_URL` et `NEXT_REVALIDATION_SECRET` seront ajoutés **après** le déploiement Vercel (on ne connaît pas encore l'URL).

### 3.5 Créer le fichier `Procfile` à la racine du backend

```bash
cat > backend/Procfile << 'EOF'
web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
EOF
```

### 3.6 Créer `railway.toml` à la racine du repo

```bash
cat > railway.toml << 'EOF'
[build]
builder = "nixpacks"
buildCommand = "cd backend && pip install -r requirements.txt"

[deploy]
startCommand = "cd backend && uvicorn api.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
EOF
```

### 3.7 Déployer

```bash
railway up --service backend
```

Attends le déploiement (1–3 minutes). Railway va afficher l'URL du service, ex :
`https://brvm-analyzer-backend.up.railway.app`

### 3.8 Vérifier

```bash
curl https://brvm-analyzer-backend.up.railway.app/health
# Attendu : {"status":"ok","service":"brvm-daily-analyzer"}
```

---

## Étape 4 — Vercel (frontend Next.js)

### 4.1 Login Vercel

```bash
vercel login
```

### 4.2 Déployer le frontend

```bash
cd frontend
vercel
```

Réponds aux questions :
- **Set up and deploy** : `Y`
- **Which scope** : ton compte
- **Link to existing project** : `N`
- **Project name** : `brvm-analyzer`
- **Directory** : `./` (tu es déjà dans `frontend/`)
- **Override settings** : `N`

Vercel va déployer et donner une URL preview, ex :
`https://brvm-analyzer-xxxx.vercel.app`

### 4.3 Configurer les variables d'environnement Vercel

`vercel env add` lit la valeur depuis stdin — utilise `echo` pour l'injecter sans saisie interactive :

```bash
# Remplace les valeurs entre guillemets par les tiennes
echo "https://brvm-analyzer-backend.up.railway.app" | vercel env add NEXT_PUBLIC_API_URL production

echo "ton-secret-revalidation" | vercel env add NEXT_REVALIDATION_SECRET production
```

Pour vérifier les variables configurées :
```bash
vercel env ls
```

Pour mettre à jour une variable existante :
```bash
echo "nouvelle-valeur" | vercel env add NEXT_PUBLIC_API_URL production --force
```

### 4.4 Déployer en production

```bash
vercel --prod
```

L'URL de production sera du type : `https://brvm-analyzer.vercel.app`

### 4.5 Mettre à jour CORS_ORIGINS sur Railway

Maintenant que tu as l'URL Vercel, mets à jour la variable CORS sur Railway :

```bash
railway variables set CORS_ORIGINS="https://brvm-analyzer.vercel.app"
```

Et ajoute les variables de revalidation ISR au backend Railway :

```bash
railway variables set \
  NEXT_REVALIDATION_URL="https://brvm-analyzer.vercel.app/api/revalidate" \
  NEXT_REVALIDATION_SECRET="ton-secret-revalidation"
```

Redéploie Railway pour prendre en compte :
```bash
railway up --service backend
```

---

## Étape 5 — GitHub Actions (cron pipeline)

### 5.1 Ajouter les secrets GitHub

Va sur GitHub → ton repo → **Settings → Secrets and variables → Actions → New repository secret**

Ajoute ces 5 secrets :

| Nom | Valeur |
|-----|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxxxxxxxxxxxxxxx` |
| `SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `NEXT_REVALIDATION_URL` | `https://brvm-analyzer.vercel.app/api/revalidate` |
| `NEXT_REVALIDATION_SECRET` | `ton-secret-revalidation` |

Ajoute cette **variable** (pas secret) :

| Nom | Valeur |
|-----|--------|
| `BRVM_BOC_BASE_URL` | `https://www.brvm.org/fr/boc` (à confirmer selon l'URL réelle du BOC) |

### 5.2 Vérifier le workflow

Le fichier `.github/workflows/daily_pipeline.yml` est déjà créé.
Il se déclenche automatiquement à **18h30 UTC du lundi au vendredi**.

Pour tester manuellement :
1. Va sur GitHub → **Actions** → **BRVM Daily Pipeline**
2. Clique **Run workflow**
3. Optionnel : renseigne une `session_date` (format `YYYY-MM-DD`)
4. Clique **Run workflow**

---

## Étape 6 — Calibrer le parser (critique !)

> ⚠️ Cette étape est **bloquante** avant le premier vrai pipeline.
> Le parser contient des TODOs — il doit être calibré sur un vrai BOC PDF.

### 6.1 Obtenir un BOC PDF

Télécharge un BOC depuis le site BRVM :
- URL type : `https://www.brvm.org/fr/boc` (vérifie l'URL réelle)
- Ou demande directement à la BRVM un accès aux archives

Sauvegarde-le dans : `backend/data/raw/boc_YYYY-MM-DD.pdf`

### 6.2 Inspecter la structure

```bash
cd brvm-analyzer
source backend/.venv/bin/activate   # ou activez ton env Python
python -m backend.scripts.inspect_boc backend/data/raw/boc_2025-01-15.pdf
```

Ce script affiche :
- Le texte brut de chaque page
- Tous les tableaux détectés avec leurs dimensions
- Les coordonnées des bounding boxes

### 6.3 Mettre à jour `parser.py`

En fonction de ce que tu vois dans l'inspection, édite `backend/pipeline/parser.py` pour :
- Identifier la bonne page contenant le tableau des actions
- Mapper les colonnes dans le bon ordre (symbole, cours, variation, volume...)
- Ajuster les patterns de parsing selon le format réel du PDF

### 6.4 Tester le parser

```bash
cd backend
python -c "
from pathlib import Path
from pipeline.parser import parse_boc
session = parse_boc(Path('data/raw/boc_2025-01-15.pdf'))
print(f'Actions parsées : {len(session.stocks)}')
print(f'Indices : composite={session.composite.value}')
for s in session.stocks[:5]:
    print(f'  {s.symbol}: {s.close} ({s.variation_pct:+.2f}%)')
"
```

### 6.5 Lancer le pipeline complet en test

Une fois le parser calibré :

```bash
cd backend
python -c "
from pipeline.run import run_pipeline
from datetime import date
result = run_pipeline(
    session_date=date(2025, 1, 15),
    skip_download=True,   # utilise le PDF déjà téléchargé
    skip_revalidation=True,  # pas de revalidation ISR en local
)
print('Succès !' if result.success else f'Erreur : {result.error}')
print(f'Étapes : {result.steps_completed}')
"
```

---

## Récapitulatif — Checklist déploiement

```
SUPABASE
  [ ] Projet créé
  [ ] Migration 001_initial.sql exécutée
  [ ] Clés SUPABASE_URL et SERVICE_ROLE_KEY récupérées

RAILWAY
  [ ] Projet initialisé (railway init)
  [ ] Variables d'environnement configurées
  [ ] railway.toml + Procfile créés
  [ ] Backend déployé (railway up)
  [ ] Health check OK (/health → 200)

VERCEL
  [ ] Frontend déployé (vercel --prod)
  [ ] NEXT_PUBLIC_API_URL configuré → URL Railway
  [ ] NEXT_REVALIDATION_SECRET configuré
  [ ] Page accessible en production

SYNCHRONISATION
  [ ] CORS_ORIGINS Railway → URL Vercel
  [ ] NEXT_REVALIDATION_URL Railway → URL Vercel/api/revalidate
  [ ] Railway redéployé après mise à jour CORS

GITHUB ACTIONS
  [ ] 5 secrets ajoutés (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_REVALIDATION_URL, NEXT_REVALIDATION_SECRET)
  [ ] 1 variable ajoutée (BRVM_BOC_BASE_URL)
  [ ] Test manuel du workflow réussi

PARSER (étape finale)
  [ ] BOC PDF réel obtenu
  [ ] inspect_boc.py exécuté
  [ ] parser.py calibré
  [ ] Pipeline complet testé end-to-end
```

---

## Budget mensuel estimé

| Service | Coût estimé |
|---------|-------------|
| Claude API (~22 appels/mois) | ~5 € |
| Railway (Hobby plan) | ~5 € |
| Domaine (optionnel) | ~1 €/mois |
| Supabase | Gratuit (Free tier) |
| Vercel | Gratuit (Hobby) |
| GitHub Actions | Gratuit |
| **Total** | **~11 €/mois** |

---

## En cas de problème

### Le backend ne démarre pas sur Railway
```bash
railway logs --service backend
```

### Le pipeline GitHub Actions échoue
- Vérifie les logs dans GitHub → Actions → ton workflow
- Cause fréquente : BOC PDF indisponible ce jour-là (BRVM ferme parfois les accès)

### Le parser ne trouve pas les données
- Relance `inspect_boc.py` sur un nouveau PDF
- Le format du BOC peut changer en cours d'année — recalibrer si nécessaire

### L'analyse IA retourne une erreur JSON
- Vérifie `ANTHROPIC_API_KEY` valide et quota suffisant
- Consulte les logs Railway pour le message d'erreur exact

### La page Vercel n'affiche pas les nouvelles données
- Vérifie que le webhook `POST /api/revalidate` est bien appelé par le pipeline
- Force manuellement : `vercel redeploy --prod`
