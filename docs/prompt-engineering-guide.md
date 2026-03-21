# Guide de Prompt Engineering — BRVM Daily Analyzer

## Contexte

Ce guide documente la stratégie de prompt engineering pour les deux usages IA du projet :

1. **Prompts Claude API** : génération des analyses de marché quotidiennes
2. **Prompts Claude Code** : développement du système

---

## Partie 1 — Prompts d'Analyse de Marché (Production)

### Prompt Système Actuel

```
Tu es un analyste financier senior spécialisé sur les marchés boursiers de la zone UEMOA, 
avec 15 ans d'expérience sur la BRVM (Bourse Régionale des Valeurs Mobilières).

MISSION : Analyser les données du Bulletin Officiel de la Cote (BOC) du {date} et 
produire une analyse complète, factuelle et pédagogique.

LANGUE : Français, ton professionnel mais accessible aux investisseurs particuliers.

FORMAT DE SORTIE : JSON strict avec les champs suivants :
{
  "synthese": "string (Markdown, 200-400 mots)",
  "sentiment": "bullish" | "neutre" | "bearish",
  "sentiment_justification": "string (1-2 phrases)",
  "picks": [
    {
      "symbol": "string (symbole exact de la liste fournie)",
      "nom": "string",
      "cours": number,
      "justification": "string (basée sur PER, rendement, momentum)"
    }
  ],
  "alertes": [
    {
      "symbol": "string",
      "type": "gap_hausse" | "gap_baisse" | "volume_inhabituel" | "nouveau_plus_haut" | "nouveau_plus_bas",
      "description": "string"
    }
  ],
  "analyse_sectorielle": "string (Markdown, 100-200 mots)"
}

CONTRAINTES ABSOLUES :
- N'utilise JAMAIS les mots : achetez, vendez, investissez, achetez maintenant, 
  vendez maintenant, conseil d'achat, conseil de vente
- Formule uniquement en mode analytique : "affiche un PER attractif", 
  "présente un rendement supérieur à la moyenne du marché", "montre un momentum positif"
- Tous les chiffres cités doivent provenir EXCLUSIVEMENT des données fournies
- Les symboles dans "picks" et "alertes" doivent exister dans la liste des symboles fournis
- En cas d'incertitude sur une donnée, ne pas la mentionner plutôt que de l'inventer

DISCLAIMER : Ne jamais omettre de préciser que l'analyse est informative et ne constitue 
pas un conseil en investissement.
```

### Données Injectées dans le Prompt Utilisateur

```python
def build_user_prompt(market_data: dict, yesterday_data: dict, moving_averages: dict) -> str:
    return f"""
## Données du marché BRVM — Séance du {market_data['date']}

### Indices
- BRVM Composite : {market_data['composite_index']} ({market_data['composite_variation']:+.2f}%)
- BRVM 30 : {market_data['brvm30_index']} ({market_data['brvm30_variation']:+.2f}%)
- BRVM Prestige : {market_data['prestige_index']} ({market_data['prestige_variation']:+.2f}%)
- Capitalisation totale : {market_data['market_cap']} FCFA
- Titres en hausse : {market_data['advancing']} | En baisse : {market_data['declining']} | Stables : {market_data['unchanged']}

### Actions (données complètes)
{format_stocks_table(market_data['stocks'])}

### Données de la veille ({yesterday_data['date']})
{format_comparison_table(market_data['stocks'], yesterday_data['stocks'])}

### Moyennes Mobiles (quand disponibles)
{format_moving_averages(moving_averages)}

### Communiqués et Opérations en Cours
{market_data.get('announcements', 'Aucun communiqué disponible')}

---
Produis l'analyse complète en JSON selon le format demandé.
"""
```

### Critères de Sélection des Picks

La grille multi-critères pondérée :

| Critère | Poids | Seuil Favorable |
|---------|-------|-----------------|
| PER | 25% | < 12 |
| Rendement net dividende | 25% | > 5% |
| Momentum annuel | 20% | > 10% et < 50% |
| Volume / liquidité | 15% | > médiane du marché |
| Catalyseur (AG, résultats, dividende) | 15% | Événement à 30 jours |

Cette grille est injectée dans le prompt pour guider la sélection des picks.

---

### Évolution et Calibration du Prompt

#### Processus de Mise à Jour

1. **Identifier le problème** : hallucination ? format incorrect ? analyse trop vague ?
2. **Isoler la cause** : instruction manquante ? données insuffisantes ? ambiguïté ?
3. **Modifier le prompt** dans un fichier de test
4. **Tester sur 5 BOC historiques** (dates variées, marchés différents)
5. **Comparer avant/après** : la modification améliore-t-elle sans introduire de régressions ?
6. **Documenter** dans `backend/ai/CHANGELOG_PROMPT.md`
7. **Déployer** uniquement si les 5 tests passent

#### Historique des Améliorations

Fichier : `backend/ai/CHANGELOG_PROMPT.md`
```markdown
## v1.1 — 2026-04-01
Ajout : Injection des moyennes mobiles 5j et 20j
Raison : Les analyses manquaient de contexte de tendance court-terme

## v1.0 — 2026-03-25
Version initiale déployée
```

---

## Partie 2 — Prompts de Développement (Claude Code)

### Template : Développement d'un Composant Pipeline

```
Contexte projet :
Je développe le module [nom] du pipeline BRVM Daily Analyzer.
Stack : Python 3.12, FastAPI, Supabase, pdfplumber.

Données d'entrée : [décrire le format exact avec exemple]
Données de sortie attendues : [décrire le format exact avec exemple]

Contraintes métier :
- Les symboles BRVM valides sont : [liste des 47]
- Une action non transigée a un volume = 0 (ne pas la rejeter)
- Les variations peuvent être absentes pour les obligations
- Format date : YYYY-MM-DD

Cas limites à gérer :
- [cas limite 1]
- [cas limite 2]

Implémenter [composant] avec typage strict mypy et gestion d'erreurs.
```

### Template : Développement d'une Page Dashboard

```
Contexte projet :
Je développe la page [nom] du dashboard BRVM Daily Analyzer.
Stack : Next.js 14 App Router, TypeScript, shadcn/ui, Tailwind CSS, Recharts.

Données disponibles via l'API :
[endpoint] → [structure JSON exemple]

Comportement attendu :
[description UX détaillée]

Design system :
- Palette : #2E8B57 (vert BRVM), #0F172A (fond dark), #EF4444 (rouge baisse), #22C55E (vert hausse)
- Typographie : DM Sans (titres), Inter (corps)
- Mobile-first : bottom navigation, cartes full-width sur mobile
- shadcn/ui pour tous les composants (Card, Badge, Tabs, etc.)

États à gérer : loading skeleton, erreur API, données vides, données partielles.
```

### Template : Debug Pipeline

```
Contexte :
Le pipeline BRVM échoue à l'étape [étape] avec l'erreur suivante :
[message d'erreur complet]

BOC concerné : [date]
Dernière version fonctionnelle : [date]

Voici le code de la fonction concernée :
[code]

Voici un extrait des données qui causent l'erreur :
[données]

Analyser l'erreur et proposer une correction qui gère aussi les cas similaires potentiels.
```
