# CLAUDE.md — Guidelines Agent IA : BRVM Daily Analyzer

## Contexte du Projet

BRVM Daily Analyzer est une plateforme d'analyse automatique du marché boursier BRVM (Bourse Régionale des Valeurs Mobilières — zone UEMOA). Le pipeline quotidien télécharge le Bulletin Officiel de la Cote (PDF), parse les données, les stocke dans Supabase, génère une analyse via Claude API, et publie sur un dashboard Next.js.

**Auteur** : Djibril Abaltou — Tykode
**Stack** : Next.js 14 + FastAPI (Python) + Supabase + Claude API + Vercel + Railway

---

## Commandes Build & Test

### Frontend (Next.js)
```bash
cd frontend
npm run dev          # Démarrer en développement
npm run build        # Build de production
npm run lint         # Linter ESLint
npm run test         # Tests Jest
```

### Backend (FastAPI Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload    # Démarrer en développement
pytest                        # Tests
python pipeline/run.py        # Lancer le pipeline manuellement
```

---

## Structure du Projet

```
brvm-analyzer/
├── frontend/                 # Next.js 14 (App Router)
│   ├── app/                  # Pages et layouts
│   │   ├── page.tsx          # Dashboard accueil
│   │   ├── stock/[symbol]/   # Vue action
│   │   ├── sectors/          # Vue sectorielle
│   │   └── history/          # Historique
│   ├── components/           # Composants React
│   └── lib/                  # Utilitaires, types, API client
├── backend/                  # FastAPI Python
│   ├── pipeline/             # Pipeline de données
│   │   ├── downloader.py     # Téléchargement BOC PDF
│   │   ├── parser.py         # Parsing PDF → JSON
│   │   ├── validator.py      # Validation des données
│   │   └── run.py            # Orchestrateur du pipeline
│   ├── api/                  # Endpoints REST
│   ├── ai/                   # Intégration Claude API
│   │   └── analyzer.py       # Génération analyse IA
│   └── db/                   # Couche base de données Supabase
├── .github/workflows/        # GitHub Actions (cron pipeline)
└── docs/                     # Documentation (guides VibeCoding)
```

---

## Conventions de Code

### Python (Backend)
- Python 3.12, typage strict avec `mypy`
- Formatage : `black` + `isort`
- Nommage : `snake_case` pour fonctions/variables, `PascalCase` pour classes
- Docstrings obligatoires pour les fonctions publiques
- Gestion des erreurs : exceptions spécifiques, pas de `except Exception: pass`

### TypeScript/React (Frontend)
- Next.js App Router, Server Components par défaut
- `'use client'` uniquement si interactivité nécessaire
- Typage strict TypeScript, pas de `any`
- Composants fonctionnels uniquement
- shadcn/ui pour tous les composants UI
- Tailwind CSS pour le styling

### Base de Données
- Toutes les migrations versionnées dans `backend/db/migrations/`
- Row Level Security (RLS) activé sur toutes les tables Supabase
- UUIDs comme identifiants primaires
- Index sur les colonnes fréquemment filtrées (`date`, `symbol`, `sector`)

---

## Variables d'Environnement Requises

```env
# Backend
ANTHROPIC_API_KEY=          # Clé Claude API
SUPABASE_URL=               # URL du projet Supabase
SUPABASE_SERVICE_ROLE_KEY=  # Clé service role (backend uniquement)
BRVM_BOC_URL=               # URL de téléchargement du BOC

# Frontend
NEXT_PUBLIC_SUPABASE_URL=   # URL publique Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Clé anon publique
NEXT_PUBLIC_API_URL=        # URL de l'API FastAPI
```

Ne jamais commiter ces valeurs. Utiliser `.env.local` (frontend) et `.env` (backend), tous deux dans `.gitignore`.

---

## Règles Métier Importantes

1. **Jours de bourse BRVM** : Lundi–Vendredi, hors jours fériés UEMOA. Ne pas lancer le pipeline les weekends.
2. **Horaire pipeline** : 18h30 UTC (correspond à 18h30 GMT, heure de la BRVM)
3. **Retry PDF** : 3 tentatives max, espacées de 15 minutes. Après échec, notifier via log + ne pas générer d'analyse vide.
4. **Disclaimer obligatoire** : Toute page affichant des analyses IA doit inclure : *"Les analyses présentées ne constituent pas un conseil en investissement. Investir comporte des risques de perte en capital."*
5. **Formulation IA** : Claude ne doit jamais utiliser les mots "achetez", "vendez", "investissez". Formulations analytiques uniquement.
6. **Données BRVM** : 47 actions, 7 secteurs, 3 indices (Composite, BRVM 30, Prestige), ~189 lignes obligataires.

---

## Priorités de Développement

1. Fiabilité du pipeline > Richesse des features
2. Données exactes > Analyses sophistiquées
3. Mobile-first > Desktop
4. Performance (ISR) > Fraîcheur temps-réel
5. Coût maîtrisé (<30€/mois) > Infrastructure évoluée

---

## Tests Prioritaires

- Parser PDF : tester sur 5 BOC historiques de formats différents
- Validation données : vérifier que tous les 47 symboles sont présents
- Prompt Claude : valider que les chiffres cités dans l'analyse correspondent aux données injectées
- API REST : tester tous les endpoints avec des dates de bourse valides et invalides
- Pipeline retry : simuler l'indisponibilité du BOC

---

## Contribution

1. `git checkout -b feature/nom-feature`
2. Développer + tester
3. `git commit -m 'type: description courte'` (types : feat, fix, refactor, docs, test)
4. Ouvrir une Pull Request vers `main`

---

*BRVM Daily Analyzer — Tykode — 2026*
