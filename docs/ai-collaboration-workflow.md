# Workflow de Collaboration IA — BRVM Daily Analyzer

## Vue d'ensemble

Sur ce projet, l'IA joue deux rôles distincts :

1. **Claude comme outil de développement** (Claude Code) — aide à coder le pipeline, le backend FastAPI, le dashboard Next.js
2. **Claude comme moteur d'analyse** (Claude API) — génère les analyses de marché quotidiennes à partir des données BOC

Ce guide couvre les deux dimensions.

---

## Partie 1 — Claude Code pour le Développement

### Mindset de Collaboration

- **Pilote** : Tu définis la logique métier BRVM (règles de marché, données attendues, format BOC)
- **Copilote** : Claude implémente le code, détecte les edge cases, suggère les optimisations
- **Cycle** : Décrire → Implémenter → Vérifier sur données réelles → Raffiner

### Cycle de Développement Recommandé

#### 1. Décrire avec contexte BRVM
Toujours fournir le contexte marché avant de demander du code :

```
Contexte : Je développe le parser PDF du BOC de la BRVM.
Le BOC est un PDF de ~16 pages avec des tableaux structurés.
Table principale : colonnes [Symbole, Cours veille, Cours jour, Variation%, Volume, Valeur, PER, Rendement Net]
47 actions cotées. Certains jours, des cellules peuvent être vides (action non transigée).

Objectif : Fonction Python qui extrait ce tableau et retourne une liste de dicts.
Tech : pdfplumber, Python 3.12, typage strict.
```

#### 2. Tester sur données réelles
Ne jamais valider du code de parsing sans le tester sur un BOC réel :
- Avoir 5 BOC historiques de référence dans `backend/tests/fixtures/`
- Tester les cas limites : action non transigée, valeur 0, PER négatif

#### 3. Raffiner itérativement
```
Le parser fonctionne sur 4 BOC sur 5.
Sur le BOC du 2025-03-15, la ligne SNTS est mal parsée (variation manquante).
Voici l'output actuel : [...]
Voici ce qu'on attend : [...]
Corriger le parser pour gérer ce cas.
```

### Patterns de Communication Efficaces

#### Pour le Pipeline (Python)
```
Je développe [composant] du pipeline BRVM.
Données d'entrée : [format]
Données de sortie : [format]
Contraintes : [retry, timeout, validation]
Cas limites connus : [liste]
```

#### Pour le Dashboard (Next.js)
```
Je développe [composant] du dashboard BRVM.
Données disponibles via API : [endpoint + structure]
Comportement attendu : [description UX]
Design system : shadcn/ui + Tailwind, palette BRVM (#2E8B57 vert, #0F172A fond)
Mobile-first obligatoire.
```

#### Pour les Prompts Claude (Analyse IA)
```
Je calibre le prompt d'analyse IA pour le BOC du [date].
Données injectées : [résumé des colonnes disponibles]
Output attendu : JSON avec champs [synthese, sentiment, picks, alertes, secteurs]
Problème actuel : [hallucination sur X / format incorrect sur Y]
```

---

## Partie 2 — Claude API pour l'Analyse de Marché

### Rôle de Claude dans le Pipeline

Claude reçoit les données structurées du BOC et produit :
- **Synthèse marché** : tendance du jour, faits marquants (Markdown)
- **Sentiment global** : `bullish` | `neutre` | `bearish` avec justification
- **Top picks** : 3-5 actions selon grille PER/rendement/momentum
- **Alertes** : signaux notables (gap >5%, volume inhabituel, nouveaux plus hauts)
- **Analyse sectorielle** : secteurs en progression vs repli

### Gestion de la Relation IA-Données

**Règle d'or** : Claude n'invente jamais de chiffres. Toutes les données numériques dans l'analyse doivent provenir des données injectées dans le prompt.

**Validation post-génération** :
```python
# Vérifier que chaque chiffre cité dans la synthèse existe dans les données
def validate_analysis(analysis: dict, market_data: dict) -> bool:
    # Extraire tous les nombres de analysis['synthese']
    # Vérifier qu'ils correspondent à des valeurs dans market_data
    pass
```

### Cycle d'Amélioration des Prompts

1. **Générer** : Lancer le pipeline sur un BOC historique
2. **Évaluer** : Comparer l'analyse aux données réelles
3. **Identifier** : Repérer les hallucinations ou imprécisions
4. **Corriger** : Ajuster le prompt système
5. **Re-tester** : Valider sur 5 BOC différents avant de déployer

---

## Gestion du Contexte sur la Durée

### Documents de Référence à Maintenir

- `CLAUDE.md` — toujours à jour avec la structure du projet
- `backend/ai/PROMPT_SYSTEM.md` — prompt système actuel de Claude
- `backend/tests/fixtures/` — BOC de référence pour les tests

### Quand Réinitialiser le Contexte

- Nouvelle session de développement → re-partager `CLAUDE.md`
- Changement de module (ex: passer du parser au dashboard) → re-contextualiser
- Après un bug complexe → résumer les décisions prises avant de continuer

---

## Anti-patterns à Éviter

- **Ne pas demander du code sans contexte BRVM** : "Fais un parser PDF" → trop vague
- **Ne pas valider le parser sur des PDFs génériques** : le BOC a une structure très spécifique
- **Ne pas accepter les analyses sans vérifier les chiffres** : toujours cross-checker avec les données
- **Ne pas coder l'analyse IA et le pipeline en même temps** : les traiter séquentiellement
