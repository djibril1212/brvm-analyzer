# BRVM DAILY ANALYZER

## Product Requirements Document (PRD)

**Analyse automatique et quotidienne du marché boursier régional de l'UEMOA, propulsée par l'intelligence artificielle.**

| | |
|---|---|
| **Auteur** | Djibril Abaltou |
| **Entreprise** | Tykode |
| **Version** | 1.0 |
| **Date** | 20 mars 2026 |
| **Statut** | Draft |

---

## 1. Executive Summary

BRVM Daily Analyzer est une plateforme web qui automatise l'extraction, l'analyse et la publication quotidienne des données du marché de la Bourse Régionale des Valeurs Mobilières (BRVM). Chaque jour de bourse, le système récupère le Bulletin Officiel de la Cote (BOC), extrait toutes les données (actions, obligations, indices), génère une analyse intelligente via l'API Claude, et publie le tout sur un dashboard web interactif.

Le produit cible les investisseurs particuliers et professionnels opérant sur la BRVM, en leur offrant une synthèse quotidienne actionnable, des recommandations fondées sur les fondamentaux (PER, rendement, momentum), et un historique complet des performances du marché.

---

## 2. Problème et Opportunité

### 2.1. Problème

- Le BOC est publié en PDF, format difficilement exploitable pour une analyse rapide.
- Les investisseurs particuliers n'ont pas les outils pour analyser systématiquement 47 actions et 189 lignes obligataires chaque jour.
- Il n'existe pas de service gratuit ou low-cost offrant une analyse IA quotidienne du marché BRVM en français.
- Les données historiques structurées de la BRVM sont difficiles d'accès pour le grand public.

### 2.2. Opportunité

- Le BRVM Composite affiche +19% YTD en 2026, le marché attire de plus en plus d'investisseurs dans la zone UEMOA.
- La démocratisation des comptes-titres (SGI en ligne, apps mobiles) crée une demande pour des outils d'aide à la décision accessibles.
- Potentiel de monétisation via un modèle freemium (analyse gratuite + alertes premium + API payante).
- Premier produit de ce type sur le marché UEMOA : avantage du first mover.

---

## 3. Objectifs

### 3.1. Objectifs Produit

| ID | Objectif | KPI Cible |
|---|---|---|
| O1 | Publier l'analyse complète chaque jour de bourse avant 20h | 100% de disponibilité J+0 |
| O2 | Couvrir 100% des actions et indices sectoriels de la BRVM | 47/47 actions analysées |
| O3 | Générer des recommandations IA pertinentes et contextualisées | Score satisfaction > 4/5 |
| O4 | Offrir un historique consultable des analyses passées | Historique 12 mois min. |
| O5 | Atteindre 500 utilisateurs actifs dans les 6 premiers mois | 500 MAU à M+6 |

### 3.2. Objectifs Techniques

- Automatisation complète sans intervention manuelle (zero-touch).
- Temps de traitement du pipeline complet (PDF → analyse publiée) inférieur à 5 minutes.
- Architecture scalable et maintenable par un développeur solo.
- Coût d'infrastructure mensuel inférieur à 30€.

---

## 4. Personas Utilisateurs

### 4.1. Investisseur Particulier — « Amadou »

**Profil :** 25-35 ans, salarié dans la zone UEMOA, possède un compte-titres chez une SGI en ligne.

**Besoin :** Comprendre rapidement ce qui s'est passé sur le marché aujourd'hui et savoir quelles actions surveiller.

**Frustration :** Lire un PDF de 16 pages chaque soir est chronophage et les données brutes sont difficiles à interpréter.

**Usage :** Consulte le dashboard chaque soir sur mobile, lit l'analyse IA, suit ses actions en watchlist.

### 4.2. Analyste Financier — « Fatou »

**Profil :** Analyste junior dans une SGI, prépare les notes de marché pour les clients.

**Besoin :** Données structurées et exportées rapidement pour alimenter ses propres rapports.

**Frustration :** La saisie manuelle des données du BOC prend 30 minutes chaque jour.

**Usage :** Utilise l'API REST pour intégrer les données dans ses outils internes.

---

## 5. Périmètre Fonctionnel

### 5.1. MVP (Version 1.0)

#### Module 1 — Ingestion des données

1. Téléchargement automatique du BOC (PDF) depuis brvm.org chaque jour de bourse à 18h30 UTC.
2. Parsing du PDF et extraction structurée : indices, cours des actions, variations, volumes, PER, rendements, dividendes.
3. Extraction des indices sectoriels, indicateurs de marché, et informations (AG, communiqués, opérations).
4. Stockage en base de données relationnelle avec horodatage et versioning.
5. Mécanisme de retry en cas d'indisponibilité du PDF (3 tentatives espacées de 15 min).

#### Module 2 — Analyse IA

1. Génération automatique d'une synthèse de marché (tendance générale, faits marquants de la séance).
2. Identification des top picks du jour (meilleures opportunités selon PER, rendement, momentum).
3. Analyse sectorielle : secteurs en progression vs en repli, avec explication.
4. Génération d'alertes : signaux techniques notables (gap > 5%, volume inhabituel, nouveaux plus hauts).
5. Score de sentiment global du marché (bullish / neutre / bearish) avec justification.

#### Module 3 — Dashboard Web

1. Page d'accueil : résumé du jour avec indices, top hausses/baisses, sentiment.
2. Vue détaillée par action : historique des cours (graphique), fondamentaux, analyse IA.
3. Vue sectorielle : performance comparée des 7 secteurs BRVM.
4. Historique des analyses : navigation par date (calendrier).
5. Responsive design : mobile-first (80% des utilisateurs cibles sont sur mobile).
6. Mode sombre / clair.

#### Module 4 — API REST

1. `GET /api/daily/{date}` — données complètes d'une séance.
2. `GET /api/stock/{symbol}` — historique et fondamentaux d'une action.
3. `GET /api/analysis/{date}` — analyse IA du jour en JSON.
4. `GET /api/sectors` — indices sectoriels actuels.
5. `GET /api/picks/{date}` — recommandations du jour.

### 5.2. Version 2.0 (Post-MVP)

- Alertes personnalisées par email / Telegram / WhatsApp (cours cible, volume, dividende).
- Portefeuille virtuel : suivi de ses positions avec P&L calculé automatiquement.
- Comparateur d'actions : confronter 2-3 titres sur tous les critères.
- Screening avancé : filtres multi-critères (PER < X, rendement > Y%, secteur Z).
- Intégration SGI : connexion avec les SGI partenaires pour le passage d'ordres.
- Newsletter quotidienne automatisée (email).
- Application mobile native (React Native).

---

## 6. Architecture Technique

### 6.1. Stack Technologique

| Couche | Technologie | Justification |
|---|---|---|
| Frontend | React 18 + Next.js 14 | SSR pour SEO, App Router, ISR pour perf |
| UI Framework | Tailwind CSS + shadcn/ui | Prototypage rapide, mobile-first |
| Graphiques | Recharts / TradingView Widget | Graphiques financiers interactifs |
| Backend / API | FastAPI (Python 3.12) | Async, typage fort, auto-doc OpenAPI |
| Base de données | Supabase (PostgreSQL) | Hosting gratuit, SDK JS, real-time |
| Analyse IA | Claude API (claude-sonnet-4-20250514) | Meilleur rapport qualité/coût pour l'analyse |
| PDF Parsing | pdfplumber / tabula-py | Extraction fiable de tableaux PDF |
| Scheduler / Cron | GitHub Actions / Railway Cron | Gratuit, fiable, logs intégrés |
| Hosting Frontend | Vercel | Déploiement auto, CDN global, gratuit |
| Hosting Backend | Railway / Render | Conteneurs Python, scaling auto |

### 6.2. Pipeline de Données

Le pipeline s'exécute chaque jour de bourse selon la séquence suivante :

| Étape | Horaire | Action | Output |
|---|---|---|---|
| 1 | 18h30 UTC | Download BOC PDF depuis brvm.org | Fichier PDF brut |
| 2 | 18h31 | Parsing PDF : extraction des tableaux | JSON structuré |
| 3 | 18h32 | Validation et insertion en BDD | Rows Supabase |
| 4 | 18h33 | Appel Claude API : analyse complète | Analyse JSON + Markdown |
| 5 | 18h35 | Publication sur le site (ISR revalidation) | Page web mise à jour |
| 6 | 18h36 | Envoi notifications (v2) | Emails / Telegram |

### 6.3. Modèle de Données

**Table : `daily_sessions`**
Stocke les métadonnées de chaque séance (date, indices, indicateurs globaux, nombre de titres en hausse/baisse, capitalisation boursière).

**Table : `stock_daily`**
Données quotidiennes par action : symbole, cours d'ouverture, clôture, variation jour, variation annuelle, volume, valeur transigée, PER, rendement net, dernier dividende.

**Table : `sector_indices`**
Indices sectoriels quotidiens : nom du secteur, valeur, variation jour, variation annuelle, PER moyen sectoriel, volume et valeur.

**Table : `ai_analyses`**
Analyses IA générées : date, synthèse marché (Markdown), sentiment (enum), top picks (JSONB), alertes (JSONB), analyse sectorielle (Markdown).

**Table : `bonds_daily`**
Données obligataires : symbole, titre, valeur nominale, cours, coupon couru, montant net, échéance, type d'amortissement.

---

## 7. Stratégie de Prompt Engineering

L'analyse IA est le cœur de la valeur du produit. Le prompt envoyé à Claude doit produire une analyse cohérente, actionnable et pédagogique.

### 7.1. Structure du Prompt Système

- Rôle : Analyste financier spécialisé marchés UEMOA, 15 ans d'expérience.
- Langue : Français, ton professionnel mais accessible.
- Format de sortie : JSON structuré avec champs définis (synthèse, sentiment, picks, alertes, secteurs).
- Contraintes : ne jamais recommander d'acheter ou vendre formellement (disclaimer légal), se concentrer sur l'analyse factuelle.

### 7.2. Données Injectées dans le Prompt

- Données complètes du jour (cours, volumes, PER, rendements, dividendes).
- Données de la veille (pour calculer les variations sur 2 jours).
- Moyennes mobiles 5 jours et 20 jours (quand l'historique est disponible).
- Communiqués et opérations en cours (AG, états financiers publiés).

### 7.3. Critères de Sélection des Picks

Les recommandations IA suivent une grille multi-critères pondérée :

| Critère | Pondération | Seuil favorable |
|---|---|---|
| PER | 25% | < 12 |
| Rendement net (dividende) | 25% | > 5% |
| Momentum annuel | 20% | > 10% et < 50% |
| Volume / liquidité | 15% | > médiane du marché |
| Catalyseur (AG, résultats, dividende) | 15% | Présence d'un événement à 30 jours |

---

## 8. Spécifications UI / UX

### 8.1. Pages du Dashboard

#### Page Accueil — Résumé du Jour

- Header : date de la séance, 3 cartes indices (Composite, BRVM 30, Prestige) avec variation couleur.
- Section sentiment : jauge bullish/neutre/bearish avec explication courte.
- Top 5 hausses et top 5 baisses en cartes horizontales scrollables.
- Analyse IA : texte généré au format Markdown rendu en HTML.
- Top Picks : cartes avec symbole, cours, PER, rendement, justification.
- Indices sectoriels : barres horizontales colorées avec variation.

#### Page Action — Vue Détaillée

- Graphique d'évolution du cours (ligne, candlestick en v2).
- Fondamentaux : PER, rendement, dividende, capitalisation.
- Historique des variations et volumes.
- Analyse IA spécifique à l'action.

#### Page Historique

- Calendrier interactif : chaque jour de bourse est cliquable.
- Aperçu au survol : variation Composite + sentiment.
- Page détaillée pour chaque date passée.

### 8.2. Design System

**Palette :** Vert BRVM (#2E8B57) comme accent principal, fond sombre (#0F172A) pour le thème dark, typographie : DM Sans (titres) + Inter (body).

**Composants :** Cartes avec micro-animations au chargement (stagger reveal), sparklines dans les cartes actions, badges colorés pour les variations (vert/rouge).

**Mobile :** Bottom navigation (Accueil, Actions, Secteurs, Historique, Plus), cartes en full-width, graphiques en swipe horizontal.

---

## 9. Modèle Économique

### 9.1. Stratégie Freemium

| Tier | Fonctionnalités | Prix |
|---|---|---|
| **Free** | Analyse du jour, top 5 hausses/baisses, indices, historique 7 jours | 0 FCFA |
| **Pro** | Historique illimité, alertes personnalisées, screening, top picks complets, export CSV | 2 500 FCFA/mois (~3,80€) |
| **API** | Accès REST complet, webhooks, données historiques, usage commercial | 10 000 FCFA/mois (~15€) |

### 9.2. Estimation des Coûts Mensuels (MVP)

| Poste | Coût estimé/mois |
|---|---|
| Claude API (Sonnet, ~22 appels/mois) | ~5€ |
| Supabase (plan gratuit) | 0€ |
| Vercel (plan Hobby) | 0€ |
| Railway (backend Python) | ~5€ |
| Domaine (brvm-analyzer.com) | ~1€/mois |
| **TOTAL** | **~11€/mois** |

---

## 10. Roadmap

| Phase | Période | Livrable | Objectif |
|---|---|---|---|
| Phase 0 | Semaine 1-2 | Prototype pipeline (script + parsing) | Valider l'extraction PDF |
| Phase 1 | Semaine 3-5 | Backend FastAPI + BDD + analyse IA | Pipeline complet automatisé |
| Phase 2 | Semaine 6-8 | Dashboard Next.js (3 pages) | MVP navigable et publié |
| Phase 3 | Semaine 9-10 | API REST publique + docs | Ouvrir l'accès développeurs |
| Phase 4 | Mois 3-4 | Alertes, screening, portefeuille | Fonctions Pro + monétisation |
| Phase 5 | Mois 5-6 | App mobile React Native | 500 MAU |

---

## 11. Risques et Mitigations

| ID | Risque | Probabilité | Mitigation |
|---|---|---|---|
| R1 | Changement de format du PDF BOC | Moyenne | Tests de régression sur le parser, alertes en cas d'échec de parsing, fallback sur extraction OCR |
| R2 | Indisponibilité du site BRVM | Faible | Mécanisme de retry + cache de la dernière séance + notification admin |
| R3 | Hallucination IA dans les analyses | Moyenne | Prompt structuré avec données factuelles injectées, validation post-génération des chiffres cités |
| R4 | Problème juridique (conseil financier) | Faible | Disclaimer systématique, formulation analytique (jamais « achetez »), CGU claires |
| R5 | Coût API Claude qui explose | Faible | Utilisation de Sonnet (pas Opus), contrôle du nombre de tokens, cache des analyses |

---

## 12. Métriques de Succès

| Métrique | Cible M+3 | Cible M+6 |
|---|---|---|
| Utilisateurs actifs mensuels (MAU) | 100 | 500 |
| Taux de retour quotidien | > 30% | > 50% |
| Temps moyen sur le dashboard | > 2 min | > 3 min |
| Disponibilité du pipeline | > 95% | > 99% |
| Abonnés Pro payants | 10 | 50 |
| Revenus mensuels récurrents (MRR) | 25 000 FCFA | 150 000 FCFA |

---

## 13. Considérations Légales

- Disclaimer obligatoire sur chaque page : « Les analyses présentées ne constituent pas un conseil en investissement. Investir comporte des risques de perte en capital. »
- Conformité RGPD/données personnelles pour les comptes utilisateurs (v2).
- Vérifier la licence d'utilisation des données du BOC (données publiques de marché).
- CGU spécifiant que le service est informatif et non un conseil financier réglementé.
- Pas de licence AMF/CREPMF requise tant que le service reste analytique (pas de gestion de portefeuille réel ni de conseil personnalisé).

---

## 14. Décision et Prochaines Étapes

1. Valider le PRD et figer le périmètre MVP.
2. Démarrer la Phase 0 : prototype du parser PDF en Python.
3. Créer le repo GitHub (github.com/djibril1212/brvm-analyzer) avec la structure du projet.
4. Configurer Supabase : créer les tables du modèle de données.
5. Tester le prompt Claude sur 5 BOC historiques pour calibrer la qualité des analyses.
6. Développer et déployer le MVP en 8 semaines.

---

*Document rédigé par Djibril Abaltou — Tykode — Mars 2026*
