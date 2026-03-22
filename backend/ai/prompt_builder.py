"""
Construction du prompt Claude pour l'analyse quotidienne BRVM.

Frameworks intégrés :
- Market Environment Analysis (tradermonty) — régime de marché, rotation sectorielle,
  breadth, risk-on/risk-off, volatilité
- Market News Analyst (tradermonty) — scoring d'impact, multiplicateurs de portée,
  modificateurs forward-looking, synthèse thématique

Principe fondamental : Claude ne génère JAMAIS de chiffres de sa propre initiative —
toutes les données numériques sont injectées depuis le BOC via ce module.
"""

from __future__ import annotations

import json
from datetime import date

from ..pipeline.models import MarketSession, StockData


SYSTEM_PROMPT = """Tu es un analyste financier senior de niveau institutionnel, \
spécialisé dans les marchés financiers africains avec 15 ans d'expertise sur la BRVM \
(Bourse Régionale des Valeurs Mobilières) et les économies de l'UEMOA.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES ABSOLUES — NON NÉGOCIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Tu n'utilises QUE les données fournies dans le prompt. Aucun chiffre inventé.
2. Tu n'utilises JAMAIS les verbes "achetez", "vendez" ou "investissez" comme conseil direct.
3. Formulations neutres obligatoires : "présente un profil attractif", "mérite attention",
   "affiche des signaux positifs", "signal de continuation", "pression vendeuse visible".
4. Tu respectes scrupuleusement les contraintes légales CREPMF sur la communication financière.
5. Tu réponds UNIQUEMENT en JSON valide selon le schéma fourni. Aucun texte avant ou après.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXTE MARCHÉ BRVM / UEMOA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- UEMOA : Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo
- Monnaie : Franc CFA (XOF), arrimé à l'Euro (655,957 XOF = 1 EUR) — zone monétaire stable
- 47 actions cotées, 7 secteurs : Finance, Distribution, Industrie, Services publics,
  Agriculture, Transport, Autres
- Indices : BRVM Composite (référence), BRVM 30 (blue chips), BRVM Prestige (premium)
- Variation quotidienne plafonnée à ±7,5% — signal fort si proche de la limite
- Horaires de cotation : 9h-14h (heure d'Abidjan, UTC+0)
- Particularité : liquidité structurellement faible — un volume élevé est un signal fort
- Dividendes : détachés annuellement, rendements souvent supérieurs aux marchés développés
- BCEAO : banque centrale commune, taux directeur déterminant pour les valorisations

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK 1 — ANALYSE DU RÉGIME DE MARCHÉ
(adapté de Market Environment Analysis)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÉGIMES DE MARCHÉ BRVM :
┌─────────────────────┬──────────────────────────────────────────────────┐
│ ACCUMULATION        │ Composite en range bas, volume en hausse silencieux│
│ TENDANCE HAUSSIÈRE  │ Composite et BRVM30 en progression, breadth > 60% │
│ DISTRIBUTION        │ Indices en range haut, hausse sur volume déclinant │
│ TENDANCE BAISSIÈRE  │ Composite < BRVM30, breadth < 40%, hausse isolées  │
│ ROTATION            │ Divergence indices/secteurs, changement de leadership│
│ CONSOLIDATION       │ Range étroit, volumes faibles, séance mixte         │
└─────────────────────┴──────────────────────────────────────────────────┘

INDICATEURS DE BREADTH (à calculer depuis les données) :
- Ratio Avancées/Déclinaisons : hausse / (hausse + baisse) → > 0.6 = bull, < 0.4 = bear
- Taux de participation : actions en hausse avec volume > médiane
- Concentration : si top 3 valeurs représentent > 50% du volume total → signal de faiblesse
- Divergence : composite monte mais breadth baisse → signal de retournement potentiel

ROTATION SECTORIELLE (cadre BRVM) :
- Phase 1 (early recovery) : Finance et Industrie en tête
- Phase 2 (mid cycle) : Distribution et Services en tête
- Phase 3 (late cycle) : Agriculture et matières premières en tête
- Phase défensive : valeurs à fort rendement, faible beta, liquidité élevée

VOLATILITÉ BRVM :
- Faible : variation composite < 0.3%, spread hausse/baisse équilibré
- Modérée : variation 0.3%-1%, concentration sectorielle visible
- Élevée : variation > 1% OU plusieurs valeurs proches de la limite ±7.5%

POSTURE RISK-ON / RISK-OFF :
- RISK-ON : Finance + Distribution en tête, volumes en hausse, breadth > 55%
- RISK-OFF : valeurs défensives (utils, rendement élevé), volumes en baisse, breadth < 45%
- NEUTRE : secteurs mixtes, volumes proches médiane

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK 2 — SCORING D'IMPACT ET SIGNAUX
(adapté de Market News Analyst)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORE D'IMPACT D'UNE VALEUR :
  Impact_Score = (Score_Prix × Multiplicateur_Portée) × Modificateur_Forward

Score_Prix (variation du cours) :
  < 0.5%  → 1pt   (négligeable)
  0.5–2%  → 2pts  (mineur)
  2–4%    → 3pts  (modéré)
  4–6%    → 4pts  (majeur)
  > 6%    → 5pts  (sévère — proche limite CREPMF)

Multiplicateur_Portée (qualité du signal) :
  Signal isolé, volume faible          → ×1.0
  Confirmé par volume dans le secteur  → ×1.5
  Tendance multi-valeurs dans secteur  → ×2.0
  Mouvement systémique, tous secteurs  → ×3.0

Modificateur_Forward (durabilité du signal) :
  Changement de régime détecté         → +50% (+0.5)
  Confirmation de tendance existante   → +25% (+0.25)
  Événement isolé sans catalyseur      → 0%

GRILLE DE NOTATION FONDAMENTALE (score_opportunite 0-10) :
  Valorisation (PER) :
    PER < 8               → 3pts  (décote profonde)
    PER 8-12              → 2pts  (valorisation raisonnable)
    PER 12-18             → 1pt   (légèrement tendu)
    PER > 18 ou N/D       → 0pt
  Rendement dividende :
    > 6%                  → 3pts  (rendement exceptionnel)
    4-6%                  → 2pts  (rendement attractif)
    2-4%                  → 1pt   (rendement correct)
    < 2%                  → 0pt
  Momentum prix + volume (séance actuelle) :
    Hausse > 3% ET volume élevé     → 2pts (signal fort)
    Hausse 0-3% OU volume modéré    → 1pt
    Baisse ou volume très faible    → 0pt
  Liquidité (valeur échangée en XOF) :
    > 10M XOF             → 2pts  (très liquide)
    3-10M XOF             → 1.5pt
    1-3M XOF              → 1pt
    < 1M XOF              → 0pt   (illiquide, risque de sortie)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAMEWORK 3 — ANALYSE D'INVESTISSEMENT STRUCTURÉE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour chaque top pick, tu dois produire une analyse structurée en 4 couches :

COUCHE 1 — VALORISATION FONDAMENTALE
  - PER vs médiane sectorielle BRVM (~12x pour Finance, ~8x Agriculture)
  - Rendement dividende vs taux sans risque UEMOA (~5.5% BCEAO)
  - Price-to-Book si données disponibles

COUCHE 2 — MOMENTUM ET TECHNIQUE
  - Force du mouvement du jour (variation + volume)
  - Positionnement dans la fourchette ±7.5%
  - Cohérence avec la tendance sectorielle

COUCHE 3 — ROTATION ET CONTEXTE
  - Position dans le cycle sectoriel BRVM
  - Corrélation avec le sentiment composite
  - Signal de continuation vs retournement

COUCHE 4 — RISQUES SPÉCIFIQUES
  - Risque de liquidité (capacité à sortir de la position)
  - Risque réglementaire CREPMF
  - Risque macro UEMOA (politique monétaire, change EUR)

PROFILS INVESTISSEURS :
  "rendement"   → PER modéré + dividende > 4% + faible volatilité
  "valeur"      → PER bas + décote vs pairs + catalyseur identifiable
  "croissance"  → volume en accélération + secteur en phase 1-2 du cycle
  "spéculatif"  → variation forte + momentum pur + horizon court terme"""


def build_analysis_prompt(session: MarketSession) -> str:
    """
    Construit le prompt utilisateur avec toutes les données de la séance.
    Intègre les frameworks Market Environment Analysis et Market News Analyst.
    """
    data = _serialize_session(session)
    schema = _get_output_schema()

    # Calculs pré-injectés pour aider Claude
    total_mouvants = session.advancing + session.declining
    breadth_ratio = round(session.advancing / max(total_mouvants, 1), 3)
    composite_var = session.composite.variation_pct
    brvm30_var = session.brvm30.variation_pct
    divergence = round(composite_var - brvm30_var, 3)

    # Top valeurs par volume pour la concentration
    sorted_by_volume = sorted(session.stocks, key=lambda s: s.value_traded or 0, reverse=True)
    top3_vol = sum(s.value_traded or 0 for s in sorted_by_volume[:3])
    total_vol = sum(s.value_traded or 0 for s in session.stocks)
    concentration_pct = round(top3_vol / max(total_vol, 1) * 100, 1)

    pre_calc = {
        "breadth_ratio": breadth_ratio,
        "divergence_composite_brvm30": divergence,
        "concentration_top3_volume_pct": concentration_pct,
        "nb_valeurs_en_hausse": session.advancing,
        "nb_valeurs_en_baisse": session.declining,
        "nb_valeurs_stables": session.unchanged,
    }

    return f"""Analyse la séance BRVM du {session.session_date.strftime('%d/%m/%Y')}.

## PRÉ-CALCULS INJECTÉS (utilise ces valeurs directement)

{json.dumps(pre_calc, ensure_ascii=False, indent=2)}

## DONNÉES OFFICIELLES DE SÉANCE (source : Bulletin Officiel de la Cote)

{json.dumps(data, ensure_ascii=False, indent=2)}

## SCHÉMA DE SORTIE ATTENDU

{json.dumps(schema, ensure_ascii=False, indent=2)}

## INSTRUCTIONS D'ANALYSE — APPLIQUE LES 3 FRAMEWORKS

### ÉTAPE 1 — Détermination du Régime de Marché
Utilise le breadth_ratio ({breadth_ratio}) et la divergence Composite/BRVM30 ({divergence}%) \
pour identifier le régime parmi : ACCUMULATION / TENDANCE_HAUSSIÈRE / DISTRIBUTION / \
TENDANCE_BAISSIÈRE / ROTATION / CONSOLIDATION.
La concentration top-3 ({concentration_pct}%) indique si le mouvement est large ou concentré.

### ÉTAPE 2 — Analyse de Rotation Sectorielle
Identifie quels secteurs performent au-dessus du Composite et lesquels sous-performent. \
Détermine si on est en phase 1 (Finance/Industrie), 2 (Distribution/Services) \
ou phase défensive (rendement/Agriculture). Note la posture Risk-On ou Risk-Off.

### ÉTAPE 3 — Scoring d'Impact sur chaque valeur notable
Pour les valeurs avec variation > 1% OU volume significatif, calcule :
Impact = Score_Prix × Multiplicateur_Portée × Modificateur_Forward
Utilise ces scores pour prioriser les top_picks et opportunites_detaillees.

### ÉTAPE 4 — Analyse par couches pour les top_picks (3-5 valeurs)
Pour chaque pick, applique les 4 couches :
1. VALORISATION : PER vs médiane sectorielle, rendement vs taux BCEAO 5.5%
2. MOMENTUM : force du mouvement (variation % × volume relatif)
3. ROTATION : cohérence avec le régime de marché identifié
4. RISQUES : liquidité (< 1M XOF = risque élevé), réglementaire, macro

Arguments obligatoires : minimum 4 par valeur, CHACUN avec le chiffre exact issu des données.
Exemple correct : "PER de 8,2x — 32% de décote vs médiane Finance BRVM (12x)"
Exemple incorrect : "valorisation attractive" (sans chiffre)

### ÉTAPE 5 — Scan complet opportunites_detaillees
Scanne TOUTES les actions. Inclure toute valeur répondant à AU MOINS un critère :
  - PER ≤ 15 avec données disponibles
  - Rendement dividende ≥ 3%
  - Variation ≥ 2% OU ≤ -2%
  - Volume dans le top 10 de la séance
Pour chaque entrée : symbole + score (0-10) + signal en 1 phrase avec le chiffre clé.

### ÉTAPE 6 — Perspectives forward-looking
Identifie les catalyseurs probables : dates de détachement de dividende connues, \
résultats semestriels attendus, politique BCEAO, dynamiques UEMOA.
Formule 2 scénarios : bull (probabilité estimée %) et bear (probabilité estimée %).

Rappel absolu : UNIQUEMENT le JSON valide, aucun texte avant ou après."""


def _serialize_session(session: MarketSession) -> dict:
    """Sérialise la session en dict injecté dans le prompt."""
    return {
        "date": str(session.session_date),
        "indices": {
            "composite": {
                "valeur": session.composite.value,
                "variation_pct": session.composite.variation_pct,
            },
            "brvm30": {
                "valeur": session.brvm30.value,
                "variation_pct": session.brvm30.variation_pct,
            },
            "prestige": {
                "valeur": session.prestige.value,
                "variation_pct": session.prestige.variation_pct,
            },
        },
        "statistiques": {
            "hausse": session.advancing,
            "baisse": session.declining,
            "stable": session.unchanged,
            "capitalisation_mds_cfa": round(session.market_cap / 1e9, 2),
        },
        "secteurs": [
            {
                "nom": s.name,
                "valeur": s.value,
                "variation_pct": s.variation_pct,
            }
            for s in session.sectors
        ],
        "actions": [_serialize_stock(s) for s in session.stocks],
        "annonces": session.announcements or "",
    }


def _serialize_stock(stock: StockData) -> dict:
    d: dict = {
        "symbole": stock.symbol,
        "nom": stock.name,
        "cloture_veille": stock.previous_close,
        "cloture": stock.close,
        "variation_pct": stock.variation_pct,
        "volume": stock.volume,
        "valeur_echangee_cfa": stock.value_traded,
    }
    if stock.per is not None:
        d["per"] = stock.per
    if stock.net_yield is not None:
        d["rendement_net_pct"] = stock.net_yield
    if stock.last_dividend is not None:
        d["dernier_dividende_cfa"] = stock.last_dividend
    return d


def _get_output_schema() -> dict:
    return {
        "date": "YYYY-MM-DD",

        "market_sentiment": "haussier | baissier | neutre | mitigé",

        "regime_marche": {
            "type": "ACCUMULATION | TENDANCE_HAUSSIÈRE | DISTRIBUTION | TENDANCE_BAISSIÈRE | ROTATION | CONSOLIDATION",
            "breadth_ratio": "float (calculé : avancées / total)",
            "posture": "RISK-ON | RISK-OFF | NEUTRE",
            "volatilite": "FAIBLE | MODÉRÉE | ÉLEVÉE",
            "commentaire": "string (2-3 phrases sur le régime avec chiffres)"
        },

        "resume_executif": "string (4-5 phrases : régime + breadth + secteur dominant + signal clé + implication)",

        "analyse_indices": {
            "composite": "string (valeur exacte, variation, régime de tendance)",
            "brvm30": "string (valeur exacte, variation, divergence vs composite si notable)",
            "contexte_regional": "string (contexte UEMOA/BCEAO, macro pertinent pour l'interprétation)"
        },

        "rotation_sectorielle": {
            "phase_cycle": "Phase 1 (Finance/Industrie) | Phase 2 (Distribution/Services) | Phase 3 (Agriculture/Matières) | Défensive",
            "secteurs_leaders": ["string — secteur en surperformance avec variation exacte"],
            "secteurs_retardataires": ["string — secteur en sous-performance avec variation exacte"],
            "commentaire": "string (analyse de la rotation avec chiffres)"
        },

        "top_secteurs": [
            {
                "nom": "string",
                "variation_pct": "float",
                "commentaire": "string (1-2 phrases avec chiffres + position dans le cycle)"
            }
        ],

        "top_picks": [
            {
                "symbole": "string",
                "nom": "string",
                "variation_pct": "float",
                "volume": "int",
                "score_opportunite": "int (0-10, calculé selon la grille fondamentale)",
                "impact_score": "float (calculé : Score_Prix × Multiplicateur_Portée × Modificateur_Forward)",
                "profil_investisseur": "rendement | croissance | valeur | spéculatif",
                "couche_valorisation": "string (PER vs médiane sectorielle + rendement vs taux BCEAO 5.5%)",
                "couche_momentum": "string (force du mouvement : variation % × volume relatif médiane)",
                "couche_rotation": "string (cohérence avec le régime de marché identifié)",
                "couche_risques": "string (liquidité, réglementaire CREPMF, macro UEMOA)",
                "arguments": [
                    "string — MINIMUM 4 arguments, chacun avec chiffre précis extrait des données"
                ],
                "note_de_prudence": "string (risques spécifiques, conditions d'invalidation du signal)"
            }
        ],

        "opportunites_detaillees": [
            {
                "symbole": "string",
                "score": "int (0-10)",
                "impact_score": "float",
                "signal": "string (1 phrase avec le chiffre clé : PER, rendement, variation ou volume)"
            }
        ],

        "valeurs_en_surveillance": [
            {
                "symbole": "string",
                "raison": "string (signal positif à surveiller, avec catalyseur potentiel)"
            }
        ],

        "valeurs_a_eviter": [
            {
                "symbole": "string",
                "raison": "string (signal négatif précis : faible liquidité <1M XOF, variation sans volume, PER > 25x)"
            }
        ],

        "perspectives": {
            "scenario_bull": "string (catalyseurs haussiers + probabilité estimée % + horizon)",
            "scenario_bear": "string (risques baissiers + probabilité estimée % + déclencheurs)",
            "catalyseurs_a_suivre": ["string — événement spécifique à surveiller (dividende, résultats, BCEAO)"]
        },

        "disclaimer": "Les analyses présentées sont à titre informatif uniquement et ne constituent pas un conseil en investissement. Tout investissement comporte un risque de perte en capital."
    }
