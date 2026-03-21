# Contacts Fournisseurs — BRVM Daily Analyzer

## Fournisseurs Critiques

### 1. Anthropic (Claude API)

**Rôle** : Moteur d'analyse IA — cœur de la valeur du produit

| Info | Détail |
|------|--------|
| Service | Claude API (claude-sonnet-4-20250514) |
| Support | console.anthropic.com |
| Status | status.anthropic.com |
| Documentation | docs.anthropic.com |
| Facturation | console.anthropic.com/billing |
| Plan | Pay-as-you-go |
| Budget mensuel estimé | ~5€ (~22 appels/mois) |

**Contacts** :
- Support général : support@anthropic.com
- Forum communauté : github.com/anthropics/anthropic-sdk-python/discussions

**Limites à surveiller** :
- Rate limit : 50 req/min sur Sonnet (largement suffisant pour 1 req/jour)
- Contexte max : 200k tokens (le prompt complet est ~5k tokens)
- Alertes budget : configurer une alerte à 10€/mois dans console.anthropic.com

**Actions si indisponible** :
→ Publier les données brutes sans analyse IA
→ Voir runbook RB-04 (re-génération différée)

---

### 2. Supabase (Base de Données)

**Rôle** : Stockage de toutes les données BRVM et des analyses

| Info | Détail |
|------|--------|
| Service | Supabase PostgreSQL |
| Dashboard | app.supabase.com |
| Status | status.supabase.com |
| Documentation | supabase.com/docs |
| Support | supabase.com/support |
| Plan | Free tier |
| Coût | 0€/mois |

**Limites Free Tier** :
- Base de données : 500 MB (estimation : ~5 ans à volume actuel)
- Backups : 7 jours de rétention point-in-time
- Connexions simultanées : 50 (largement suffisant)
- Bandwidth : 5 GB/mois

**Si Free Tier insuffisant** : Passer au Pro ($25/mois) — décision à prendre si BDD approche 400 MB.

---

### 3. Vercel (Hosting Frontend)

**Rôle** : Hébergement du dashboard Next.js, CDN global

| Info | Détail |
|------|--------|
| Service | Vercel Hosting + CDN |
| Dashboard | vercel.com/dashboard |
| Status | vercel-status.com |
| Documentation | vercel.com/docs |
| Plan | Hobby (gratuit) |
| Coût | 0€/mois |

**Limites Hobby** :
- Bandwidth : 100 GB/mois (suffisant pour les premiers 500 MAU)
- Build time : 6000 min/mois
- Domains : 1 custom domain

**Si Hobby insuffisant** : Pro ($20/mois) — décision à prendre si >500 MAU.

---

### 4. Railway (Hosting Backend)

**Rôle** : Hébergement du backend FastAPI et exécution du pipeline

| Info | Détail |
|------|--------|
| Service | Railway Container Hosting |
| Dashboard | railway.app/dashboard |
| Status | railwaystatus.com |
| Documentation | docs.railway.app |
| Support | help.railway.app |
| Plan | Starter |
| Coût | ~5€/mois |

**Configuration actuelle** :
- Service "backend" : FastAPI Python
- RAM : 512 MB (suffisant, le pipeline utilise ~200 MB)
- CPU : 0.5 vCPU shared

---

### 5. GitHub (CI/CD + Version Control)

**Rôle** : Hébergement du code, pipeline cron automatique via Actions

| Info | Détail |
|------|--------|
| Service | GitHub + GitHub Actions |
| Repository | github.com/djibril1212/brvm-analyzer |
| Status | githubstatus.com |
| Plan | Free (repo public) |
| Coût | 0€/mois |

**GitHub Actions Free** :
- 2000 min/mois pour repos publics (usage estimé : ~66 min/mois)
- Cron schedule : `30 18 * * 1-5` (18h30 UTC, lundi-vendredi)

---

### 6. BRVM / brvm.org (Source de Données)

**Rôle** : Source primaire des données — publication quotidienne du BOC PDF

| Info | Détail |
|------|--------|
| Organisation | Bourse Régionale des Valeurs Mobilières |
| Site | brvm.org |
| BOC URL pattern | brvm.org/brvm/boc/[date] |
| Horaire publication | ~18h15-18h20 UTC les jours de bourse |
| Contact | info@brvm.org |

**Important** : Vérifier la licence d'utilisation des données du BOC. Les données de marché sont publiques, mais confirmer que l'exploitation commerciale (tier Pro) est autorisée.

---

## Tableau de Bord des Statuts

Bookmarker ces pages pour vérification rapide lors d'un incident :

| Service | Page de Statut |
|---------|---------------|
| Anthropic | status.anthropic.com |
| Supabase | status.supabase.com |
| Vercel | vercel-status.com |
| Railway | railwaystatus.com |
| GitHub | githubstatus.com |

---

## Calendrier de Renouvellement

| Service | Renouvellement | Action |
|---------|---------------|--------|
| Domaine brvm-analyzer.com | Annuel | Vérifier auto-renouvellement |
| Clé Anthropic | Rotation tous les 3 mois | Voir RB-08 |
| Clé Supabase service_role | Rotation tous les 6 mois | Mettre à jour Railway + GitHub Actions |
| Certificats SSL | Automatique (Vercel + Railway) | Pas d'action requise |
