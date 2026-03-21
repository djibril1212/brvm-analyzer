# PRD Guide — BRVM Daily Analyzer

Ce document est le guide de référence pour l'évolution du PRD et la prise de décisions produit.
Le PRD complet se trouve dans `BRVM_Daily_Analyzer_PRD.md`.

---

## Périmètre MVP Figé (v1.0)

### Ce qui EST dans le MVP
- Pipeline d'ingestion BOC (download → parse → BDD → IA)
- Analyse IA quotidienne (synthèse, sentiment, picks, alertes, secteurs)
- Dashboard 3 pages : Accueil / Action / Historique
- Vue sectorielle
- API REST publique (5 endpoints)
- Mode sombre/clair, mobile-first

### Ce qui N'EST PAS dans le MVP (v2+)
- Alertes email/Telegram/WhatsApp
- Portefeuille virtuel
- Comparateur d'actions
- Screening avancé
- Newsletter automatisée
- Application mobile native
- Gestion de comptes utilisateurs

**Règle** : Toute demande de feature v2 pendant le développement MVP est notée dans la section "Backlog" mais ne bloque pas la livraison.

---

## Critères d'Acceptation par Feature

### Pipeline d'Ingestion
- [ ] Téléchargement BOC automatique à 18h30 UTC les jours de bourse
- [ ] Retry 3x en cas d'échec (espacé de 15 min)
- [ ] 47/47 actions extraites sur un BOC standard
- [ ] 7/7 indices sectoriels extraits
- [ ] Temps de traitement complet < 5 minutes
- [ ] Log de chaque run en BDD (succès/échec/durée)

### Analyse IA
- [ ] Sentiment valide : `bullish` | `neutre` | `bearish`
- [ ] Top picks : 3-5 actions avec justification
- [ ] Aucun symbole halluciné dans les picks
- [ ] Aucune formulation interdite (achetez/vendez/investissez)
- [ ] Chiffres cités cohérents avec les données injectées
- [ ] Format JSON valide et parseable

### Dashboard Web
- [ ] Page accueil charge en < 2s (LCP)
- [ ] Responsive sur iPhone 12 (375px) et Galaxy S21
- [ ] Bottom navigation mobile fonctionnelle
- [ ] Mode sombre/clair avec persistence localStorage
- [ ] Disclaimer visible sur toutes les pages
- [ ] Historique navigable sur 12 mois

### API REST
- [ ] Tous les endpoints répondent en < 500ms
- [ ] Rate limiting actif (60 req/min par IP)
- [ ] Gestion des erreurs 404 (date invalide, symbole inexistant)
- [ ] Documentation OpenAPI générée automatiquement par FastAPI
- [ ] CORS configuré pour les domaines autorisés uniquement

---

## Décisions Produit Documentées

### DP-001 : Python pour le Backend (pas Node.js)
**Décision** : FastAPI Python pour le backend et le pipeline.
**Raison** : pdfplumber et tabula-py sont des bibliothèques Python matures pour le parsing PDF. L'écosystème Python est supérieur pour ce use case.

### DP-002 : Sonnet pas Opus
**Décision** : claude-sonnet-4-20250514 pour les analyses.
**Raison** : Rapport qualité/coût optimal. Opus = 5x plus cher pour une qualité d'analyse similaire sur des données structurées.

### DP-003 : ISR pas SSR pour le Dashboard
**Décision** : Incremental Static Regeneration (revalidation à chaque nouveau pipeline).
**Raison** : Les données changent 1 fois par jour. Pas besoin de SSR temps-réel. ISR = performance CDN + fraîcheur garantie.

### DP-004 : Supabase Free Tier
**Décision** : Rester sur Supabase gratuit pour le MVP.
**Raison** : Croissance estimée à ~50 MB en 1 an. Limite à 500 MB. Migration vers Pro uniquement si nécessaire.

### DP-005 : Pas d'authentification dans le MVP
**Décision** : Dashboard entièrement public pour le MVP.
**Raison** : Réduction de la complexité. L'auth est nécessaire uniquement pour les features Pro (v2).

---

## Métriques de Succès MVP

| Métrique | Cible M+3 | Cible M+6 |
|----------|-----------|-----------|
| MAU (utilisateurs actifs/mois) | 100 | 500 |
| Disponibilité pipeline | > 95% | > 99% |
| Taux de retour quotidien | > 30% | > 50% |
| Temps moyen sur le dashboard | > 2 min | > 3 min |

---

## Backlog v2 (Priorisé)

| Priorité | Feature | Valeur | Complexité |
|----------|---------|--------|------------|
| P1 | Alertes email quotidiennes | Haute | Moyenne |
| P1 | Screening multi-critères | Haute | Haute |
| P2 | Portefeuille virtuel | Haute | Haute |
| P2 | Comparateur 2-3 actions | Moyenne | Moyenne |
| P3 | Newsletter automatisée | Moyenne | Faible |
| P3 | App mobile React Native | Haute | Très haute |
| P4 | Intégration SGI | Très haute | Très haute |

---

## Questions Ouvertes

- [ ] **Jours fériés UEMOA** : Maintenir une liste exhaustive des jours fériés pour le cron
- [ ] **BOC historique** : Peut-on récupérer et parser des BOC antérieurs pour pré-remplir l'historique ?
- [ ] **Obligations** : Les données obligataires sont-elles nécessaires dans le MVP ou seulement les actions ?
- [ ] **Licence données BRVM** : Confirmer que l'utilisation des données du BOC public est légalement autorisée pour ce service
