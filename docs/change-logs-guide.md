# Changelog — BRVM Daily Analyzer

Tous les changements notables du projet sont documentés ici.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).
Versioning sémantique : MAJOR.MINOR.PATCH

---

## [Non publié]

### En cours
- Prototype parser PDF (Phase 0)
- Setup Supabase + schéma initial

---

## Guide de Gestion du Changelog

### Quand Mettre à Jour

Mettre à jour le changelog **avant** de merger une PR, pas après.

Demander à Claude Code : *"Génère l'entrée changelog pour les changements qu'on vient de faire"*, puis réviser.

### Catégories

- **Ajouté** : Nouvelle fonctionnalité
- **Modifié** : Changement d'une fonctionnalité existante
- **Déprécié** : Fonctionnalité qui sera supprimée
- **Supprimé** : Fonctionnalité supprimée
- **Corrigé** : Correction de bug
- **Sécurité** : Correctif de sécurité
- **Pipeline** : Changements spécifiques au pipeline de données BRVM
- **IA** : Changements du prompt ou du module d'analyse Claude

### Format d'une Entrée

```markdown
## [1.2.0] - 2026-04-15

### Ajouté
- Vue sectorielle : graphique de performance comparée des 7 secteurs BRVM
- Endpoint GET /api/sectors avec données temps réel

### Pipeline
- Retry automatique du téléchargement BOC : 3 tentatives espacées de 15 min
- Validation que les 47 symboles sont présents avant insertion en BDD

### IA
- Amélioration du prompt : ajout des moyennes mobiles 5j et 20j comme contexte
- Validation post-génération : vérification que les symboles des picks existent

### Corrigé
- Parser PDF : correction de l'extraction de la variation pour SNTS lors de jours sans transaction
```

### Versioning BRVM Analyzer

| Type | Quand |
|------|-------|
| **MAJOR** (1.0.0 → 2.0.0) | Changement de structure BDD incompatible, refonte architecture |
| **MINOR** (1.0.0 → 1.1.0) | Nouvelle page dashboard, nouveau endpoint API, amélioration majeure du prompt |
| **PATCH** (1.0.0 → 1.0.1) | Correction de bug parser, fix affichage mobile, mise à jour dépendances |

---

## Historique des Versions

### [0.1.0] - 2026-03-21

### Ajouté
- PRD v1.0 : périmètre MVP défini
- Guides de développement VibeCoding adaptés au projet BRVM
- Structure initiale du repository

---

*BRVM Daily Analyzer — Tykode — 2026*
