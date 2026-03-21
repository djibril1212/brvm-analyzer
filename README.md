# BRVM Daily Analyzer

**Analyse automatique et quotidienne du marché boursier régional de l'UEMOA, propulsée par l'intelligence artificielle.**

> Pipeline zero-touch : BOC PDF → Parsing → BDD → Analyse Claude → Dashboard web — en moins de 5 minutes chaque jour de bourse.

---

## Qu'est-ce que BRVM Daily Analyzer ?

BRVM Daily Analyzer automatise l'extraction, l'analyse et la publication des données du marché de la Bourse Régionale des Valeurs Mobilières (BRVM). Chaque soir de bourse, le système :

1. Télécharge le Bulletin Officiel de la Cote (BOC) depuis brvm.org
2. Parse le PDF et extrait toutes les données (47 actions, 189 lignes obligataires, indices)
3. Stocke les données en base PostgreSQL (Supabase)
4. Génère une analyse IA via Claude API (synthèse, sentiment, top picks, alertes)
5. Publie le tout sur le dashboard web via ISR Next.js

---

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 + React 18 + shadcn/ui + Tailwind CSS |
| Graphiques | Recharts |
| Backend / API | FastAPI (Python 3.12) |
| Base de données | Supabase (PostgreSQL) |
| Analyse IA | Claude API (claude-sonnet-4-20250514) |
| PDF Parsing | pdfplumber / tabula-py |
| Scheduler | GitHub Actions (cron) |
| Hosting Frontend | Vercel |
| Hosting Backend | Railway |

---

## Architecture du Pipeline

```
18h30 UTC  →  Download BOC PDF (brvm.org)
18h31      →  Parsing PDF → JSON structuré
18h32      →  Validation + insertion Supabase
18h33      →  Appel Claude API → analyse JSON + Markdown
18h35      →  ISR revalidation → Dashboard mis à jour
```

Retry automatique : 3 tentatives espacées de 15 min si le PDF est indisponible.

---

## Modèle de Données

- **`daily_sessions`** — Métadonnées de séance (date, indices, capitalisation)
- **`stock_daily`** — Cours quotidiens par action (OHLC, volume, PER, rendement)
- **`sector_indices`** — Indices sectoriels (7 secteurs BRVM)
- **`ai_analyses`** — Analyses IA (synthèse, sentiment, picks, alertes)
- **`bonds_daily`** — Données obligataires (189 lignes)

---

## Fonctionnalités MVP (v1.0)

### Dashboard Web
- Page d'accueil : indices, top hausses/baisses, sentiment IA du jour
- Vue action : graphique d'évolution, fondamentaux, analyse IA
- Vue sectorielle : performance comparée des 7 secteurs
- Historique : navigation par date (12 mois minimum)
- Mobile-first, mode sombre/clair

### API REST Publique
```
GET /api/daily/{date}      — Données complètes d'une séance
GET /api/stock/{symbol}    — Historique et fondamentaux d'une action
GET /api/analysis/{date}   — Analyse IA du jour
GET /api/sectors           — Indices sectoriels actuels
GET /api/picks/{date}      — Recommandations du jour
```

---

## Roadmap

| Phase | Semaines | Livrable |
|-------|----------|----------|
| Phase 0 | S1-2 | Prototype parser PDF Python |
| Phase 1 | S3-5 | Backend FastAPI + BDD + pipeline IA |
| Phase 2 | S6-8 | Dashboard Next.js (3 pages) |
| Phase 3 | S9-10 | API REST publique + docs |
| Phase 4 | M3-4 | Alertes, screening, portefeuille (Pro) |
| Phase 5 | M5-6 | App mobile React Native |

---

## Guides de Développement

| Guide | Description |
|-------|-------------|
| [CLAUDE.md](CLAUDE.md) | Guidelines pour l'agent IA |
| [system-architecture-guide.md](system-architecture-guide.md) | Architecture complète |
| [development-environments.md](development-environments.md) | Dev / Staging / Production |
| [prompt-engineering-guide.md](prompt-engineering-guide.md) | Prompts Claude pour l'analyse BOC |
| [full-stack-security-guide.md](full-stack-security-guide.md) | Sécurité |
| [quality-assurance-guide.md](quality-assurance-guide.md) | QA pipeline et dashboard |
| [runbooks-guide.md](runbooks-guide.md) | Procédures opérationnelles |
| [incident-response-guide.md](incident-response-guide.md) | Réponse aux incidents |
| [recovery-procedures-guide.md](recovery-procedures-guide.md) | Procédures de récupération |
| [infrastructure-maintenance.md](infrastructure-maintenance.md) | Maintenance infra |
| [change-logs-guide.md](change-logs-guide.md) | Changelog |
| [vendor-contacts-guide.md](vendor-contacts-guide.md) | Contacts fournisseurs |

---

## Coûts Mensuels (MVP)

| Poste | Coût |
|-------|------|
| Claude API (~22 appels/mois) | ~5€ |
| Supabase (plan gratuit) | 0€ |
| Vercel (plan Hobby) | 0€ |
| Railway (backend Python) | ~5€ |
| Domaine | ~1€/mois |
| **TOTAL** | **~11€/mois** |

---

> **Disclaimer** : Les analyses présentées ne constituent pas un conseil en investissement. Investir comporte des risques de perte en capital.

*Développé par Djibril Abaltou — Tykode — 2026*
