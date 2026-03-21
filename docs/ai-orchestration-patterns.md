# Patterns d'Orchestration IA — BRVM Daily Analyzer

## Vue d'ensemble

Le projet utilise l'IA à deux niveaux :
- **Niveau développement** : Claude Code orchestre la construction du système
- **Niveau production** : Claude API s'exécute dans le pipeline quotidien automatisé

Ce document décrit les patterns d'orchestration pour les deux niveaux.

---

## Patterns de Développement (Claude Code)

### Pattern 1 — Divide & Conquer par Module

Le projet se décompose en 4 modules indépendants à développer séquentiellement :

```
Module 1 : Pipeline d'ingestion (Python)
    └── downloader.py → parser.py → validator.py → db_writer.py

Module 2 : Analyse IA (Python + Claude API)
    └── prompt_builder.py → analyzer.py → analysis_validator.py

Module 3 : Dashboard Web (Next.js)
    └── API client → Pages → Composants → Design system

Module 4 : API REST publique (FastAPI)
    └── Endpoints → Auth → Rate limiting → Docs OpenAPI
```

**Règle** : Finir et tester un module avant de passer au suivant. Le parser doit retourner des données validées avant de toucher au module IA.

### Pattern 2 — Développement Guidé par les Données Réelles

```
1. Récupérer un BOC réel → comprendre la structure exacte
2. Implémenter le parser avec ce BOC comme référence
3. Tester sur 5 BOC différents (formats historiques variés)
4. Implémenter la validation des données
5. Seulement ensuite : brancher le module IA
```

Ne jamais développer le parser avec des données mockées — le BOC a des particularités de formatage que seul le vrai PDF révèle.

### Pattern 3 — Couche par Couche (Layered Implementation)

Pour chaque feature du dashboard :

```
1. Données : vérifier que l'endpoint API retourne ce qu'on attend
2. Structure : composant React sans style (juste les données affichées)
3. Style : appliquer Tailwind + shadcn/ui + palette BRVM
4. Mobile : adapter pour les petits écrans (bottom nav, cartes full-width)
5. États : loading skeleton, erreur, données vides
```

### Pattern 4 — Exploration Parallèle pour les Prompts

Pour calibrer le prompt d'analyse Claude :

```
1. Générer 3 variantes du prompt système (ton différent, structure différente)
2. Passer chacune sur le même BOC de référence
3. Comparer : précision des chiffres, richesse de l'analyse, respect des contraintes
4. Hybrider les meilleures parties
5. Valider sur 5 BOC historiques
```

---

## Patterns de Production (Claude API dans le Pipeline)

### Architecture du Module IA

```python
# Flux d'orchestration dans analyzer.py

def generate_daily_analysis(session_date: date) -> Analysis:
    # 1. Récupérer les données du jour depuis Supabase
    market_data = fetch_market_data(session_date)
    yesterday_data = fetch_market_data(session_date - timedelta(days=1))
    moving_averages = compute_moving_averages(session_date)

    # 2. Construire le prompt avec toutes les données
    prompt = build_analysis_prompt(market_data, yesterday_data, moving_averages)

    # 3. Appel Claude API avec retry
    raw_analysis = call_claude_with_retry(prompt, max_retries=3)

    # 4. Parser et valider la réponse JSON
    analysis = parse_and_validate_analysis(raw_analysis, market_data)

    # 5. Stocker en base
    save_analysis(analysis, session_date)

    return analysis
```

### Pattern de Validation Post-IA

Après chaque appel Claude, valider systématiquement :

```python
def validate_analysis(analysis: dict, market_data: dict) -> ValidationResult:
    errors = []

    # Vérifier que le sentiment est valide
    if analysis['sentiment'] not in ['bullish', 'neutre', 'bearish']:
        errors.append("Sentiment invalide")

    # Vérifier que les symboles des picks existent
    valid_symbols = {s['symbol'] for s in market_data['stocks']}
    for pick in analysis['picks']:
        if pick['symbol'] not in valid_symbols:
            errors.append(f"Symbole inexistant: {pick['symbol']}")

    # Vérifier l'absence de formulations interdites
    forbidden = ['achetez', 'vendez', 'investissez', 'achetez maintenant']
    text = analysis['synthese'].lower()
    for word in forbidden:
        if word in text:
            errors.append(f"Formulation interdite: {word}")

    return ValidationResult(valid=len(errors) == 0, errors=errors)
```

### Gestion des Coûts Claude API

Budget : ~5€/mois (~22 appels/mois, 1 par jour de bourse)

```python
# Estimation tokens par appel
PROMPT_TOKENS_ESTIMATE = 3500   # Données BOC complètes
OUTPUT_TOKENS_ESTIMATE = 1200   # Analyse JSON + Markdown

# Coût estimé par appel (Claude Sonnet)
# Input:  3500 * $3/1M  = ~$0.01
# Output: 1200 * $15/1M = ~$0.018
# Total par appel : ~$0.028 (~0.026€)
# Total mensuel (22 jours) : ~0.57€ (bien en dessous du budget)
```

**Optimisations** :
- Utiliser Sonnet (pas Opus) — meilleur rapport qualité/coût pour l'analyse de marché
- Ne pas régénérer si l'analyse existe déjà pour la date
- Cacher le prompt système (ne pas le recharger à chaque appel)

---

## Orchestration du Pipeline Complet

### Séquence GitHub Actions (cron)

```yaml
# .github/workflows/daily-pipeline.yml
# S'exécute à 18h30 UTC, lundi-vendredi

steps:
  1. Check si c'est un jour de bourse (exclure fériés UEMOA)
  2. Télécharger le BOC PDF (avec retry 3x / 15min)
  3. Parser le PDF → JSON
  4. Valider les données (47 symboles présents, indices cohérents)
  5. Insérer en base Supabase
  6. Générer l'analyse Claude
  7. Valider l'analyse (pas d'hallucination, formulations OK)
  8. Déclencher ISR revalidation Next.js
  9. Notifier succès/échec (log + optionnel: Telegram)
```

### Gestion des Échecs par Étape

| Étape | Échec | Action |
|-------|-------|--------|
| Download BOC | PDF non disponible | Retry 3x/15min, puis abort avec log |
| Parser PDF | Exception parsing | Alert admin, ne pas insérer en BDD |
| Validation données | Données incomplètes | Log erreur, insérer partiellement si >90% OK |
| Appel Claude | Timeout / erreur API | Retry 2x, puis publier données sans analyse |
| Validation analyse | Hallucination détectée | Re-générer 1x, puis publier sans analyse si échec |
| ISR revalidation | Timeout Vercel | Dashboard affiche données de la veille |
