# Architecture Système — BRVM Daily Analyzer

## Vue d'Ensemble (C4 Niveau 1 — Contexte)

```
                    ┌─────────────────┐
                    │   brvm.org      │
                    │  (BOC PDF)      │
                    └────────┬────────┘
                             │ Download PDF
                             ▼
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ GitHub       │───▶│ Pipeline BRVM   │───▶│ Supabase        │
│ Actions CRON │    │ (FastAPI/Python) │    │ (PostgreSQL)    │
└──────────────┘    └────────┬────────┘    └────────┬────────┘
                             │                       │
                    ┌────────▼────────┐              │
                    │  Claude API     │              │
                    │  (Anthropic)    │              │
                    └─────────────────┘              │
                                                     │
                    ┌────────────────────────────────▼
                    │ Next.js Dashboard (Vercel)      │
                    │ + API REST publique              │
                    └─────────────────────────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │       Utilisateurs BRVM        │
                    │  Amadou (investisseur)         │
                    │  Fatou (analyste financier)    │
                    └───────────────────────────────┘
```

---

## Vue Détaillée (C4 Niveau 2 — Containers)

### Container 1 — Pipeline d'Ingestion (Railway)

**Technologie** : Python 3.12 + FastAPI
**Rôle** : Automatisation quotidienne du traitement des données BOC

```
pipeline/
├── downloader.py     # Téléchargement BOC PDF depuis brvm.org
│   └── retry_download(url, max_retries=3, delay_minutes=15)
│
├── parser.py         # Extraction des données du PDF
│   ├── parse_stocks(pdf) → List[StockData]
│   ├── parse_indices(pdf) → IndicesData
│   ├── parse_sectors(pdf) → List[SectorData]
│   └── parse_bonds(pdf) → List[BondData]
│
├── validator.py      # Validation des données extraites
│   ├── validate_stocks(stocks) → ValidationResult
│   └── validate_completeness(data) → bool (47 actions présentes ?)
│
├── db_writer.py      # Insertion en base Supabase
│   └── insert_daily_session(data, date)
│
└── run.py            # Orchestrateur du pipeline
    └── main(date, options) → PipelineResult
```

### Container 2 — Module IA (Railway)

**Technologie** : Python + Anthropic SDK
**Rôle** : Génération des analyses de marché quotidiennes

```
ai/
├── prompt_builder.py  # Construction du prompt avec données BOC
│   └── build_prompt(market_data, yesterday, moving_avgs) → str
│
├── analyzer.py        # Appel Claude API + parsing réponse
│   ├── generate_analysis(prompt) → RawAnalysis
│   └── parse_analysis_json(raw) → Analysis
│
└── validator.py       # Validation post-génération
    └── validate_analysis(analysis, market_data) → QAResult
```

### Container 3 — API REST (Railway)

**Technologie** : FastAPI + Supabase Python client
**Endpoints publics** :

```
GET /api/daily/{date}        → DailySession + stocks + indices
GET /api/stock/{symbol}      → StockHistory + fundamentals
GET /api/analysis/{date}     → AIAnalysis (synthese, sentiment, picks)
GET /api/sectors             → SectorIndices[]
GET /api/picks/{date}        → TopPicks[]
GET /health                  → HealthCheck
```

### Container 4 — Dashboard Web (Vercel)

**Technologie** : Next.js 14 (App Router) + TypeScript + shadcn/ui
**Pages** :

```
app/
├── page.tsx              # Accueil : indices + sentiment + top hausses/baisses
├── stock/
│   └── [symbol]/
│       └── page.tsx      # Vue action : graphique + fondamentaux + analyse IA
├── sectors/
│   └── page.tsx          # Vue sectorielle : 7 secteurs comparés
├── history/
│   └── page.tsx          # Calendrier interactif des séances passées
└── api/
    └── revalidate/
        └── route.ts      # Webhook ISR revalidation (déclenché par le pipeline)
```

### Container 5 — Base de Données (Supabase)

**Technologie** : PostgreSQL via Supabase

```sql
-- Tables principales
daily_sessions    -- 1 ligne par jour de bourse
stock_daily       -- 47 lignes par jour de bourse (une par action)
sector_indices    -- 7 lignes par jour de bourse
ai_analyses       -- 1 ligne par jour de bourse
bonds_daily       -- ~189 lignes par jour de bourse
pipeline_logs     -- 1 ligne par run de pipeline (monitoring)

-- Index critiques
CREATE INDEX idx_stock_daily_date ON stock_daily(date DESC);
CREATE INDEX idx_stock_daily_symbol ON stock_daily(symbol);
CREATE INDEX idx_ai_analyses_date ON ai_analyses(date DESC);
```

---

## Flux de Données Quotidien

```
18h30 UTC
    │
    ▼
[GitHub Actions] Déclenche le workflow daily-pipeline.yml
    │
    ▼
[downloader.py] Télécharge BOC PDF depuis brvm.org
    ├── Succès → Continuer
    └── Échec → Retry (x3, 15min) → Abort + log si échec total
    │
    ▼
[parser.py] Extrait les données du PDF
    ├── 47 stocks → StockData[]
    ├── 3 indices → IndicesData
    ├── 7 secteurs → SectorData[]
    └── ~189 obligations → BondData[]
    │
    ▼
[validator.py] Valide la complétude et la cohérence
    ├── Succès → Continuer
    └── Erreur critique → Abort + alert
    │
    ▼
[db_writer.py] Insère en base Supabase
    │
    ▼
[analyzer.py] Appel Claude API → Analyse JSON
    │
    ▼
[validator.py] Valide l'analyse IA
    ├── Succès → Publier l'analyse
    └── Échec → Publier données brutes sans analyse
    │
    ▼
[POST /api/revalidate] Déclenche ISR Next.js
    │
    ▼
Dashboard mis à jour pour les utilisateurs
```

---

## Décisions Architecturales

### DA-001 : Séparation Frontend / Backend
**Décision** : Next.js sur Vercel (frontend) + FastAPI sur Railway (backend).
**Raison** : Le pipeline Python utilise pdfplumber (lib Python mature). Vercel ne supporte pas Python pour les scripts de parsing long-running. Railway offre des conteneurs Python full-featured.

### DA-002 : Supabase comme BDD
**Décision** : Supabase PostgreSQL avec RLS.
**Raison** : SDK JS pour le frontend, SDK Python pour le backend, plan gratuit généreux, backups automatiques, interface d'admin intégrée.

### DA-003 : ISR pour le Dashboard
**Décision** : Incremental Static Regeneration déclenchée par webhook.
**Raison** : Les données changent 1 fois par jour. L'ISR permet d'avoir les performances du statique avec la fraîcheur du dynamique. La revalidation webhook garantit que le dashboard est mis à jour immédiatement après le pipeline.

### DA-004 : GitHub Actions pour le Cron
**Décision** : GitHub Actions avec schedule `30 18 * * 1-5`.
**Raison** : Gratuit pour les repos publics, logs intégrés, notifications d'échec par email, facile à déclencher manuellement pour le re-traitement.

---

## Contraintes et Limites

| Contrainte | Valeur | Impact |
|-----------|--------|--------|
| Coût infra mensuel | < 30€ | Limite les services payants |
| Temps pipeline | < 5 min | Limite la complexité du parsing et du prompt |
| BOC disponible | ~18h20-18h30 UTC | Cron déclenché à 18h30 avec buffer |
| Claude API rate limit | 50 req/min (Sonnet) | Suffisant pour 1 appel/jour |
| Supabase Free | 500 MB | ~5 ans à volume actuel |
| Vercel Hobby | 100 GB/mois bandwidth | Suffisant pour les premiers 500 MAU |
