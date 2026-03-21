"""
Construction du prompt Claude pour l'analyse quotidienne BRVM.
Principe fondamental : Claude ne génère JAMAIS de chiffres de sa propre initiative —
toutes les données sont injectées depuis le BOC via ce module.
"""

from __future__ import annotations

import json
from datetime import date

from ..pipeline.models import MarketSession, StockData


SYSTEM_PROMPT = """Tu es un analyste financier senior spécialisé dans les marchés boursiers africains, \
expert de la BRVM (Bourse Régionale des Valeurs Mobilières) depuis plus de 15 ans. \
Tu maîtrises l'analyse fondamentale et technique des 47 sociétés cotées sur la BRVM.

RÈGLES ABSOLUES — NON NÉGOCIABLES :
1. Tu n'utilises QUE les données fournies dans le prompt. Aucun chiffre inventé.
2. Tu n'utilises JAMAIS les verbes "achetez", "vendez" ou "investissez" comme conseil direct.
3. Utilise des formulations neutres : "présente un profil attractif", "mérite attention", "affiche des signaux positifs".
4. Ton analyse est destinée à des investisseurs informés. Sois précis, factuel, et utile.
5. Tu respectes scrupuleusement les contraintes légales CREPMF sur la communication financière.
6. Tu réponds UNIQUEMENT en JSON valide selon le schéma fourni.

CONTEXTE MARCHÉ :
- La BRVM est la bourse commune de l'UEMOA (Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo).
- La monnaie est le Franc CFA (XOF), arrimé à l'Euro (655,957 XOF = 1 EUR).
- 47 actions cotées réparties en 7 secteurs.
- Indices principaux : BRVM Composite, BRVM 30, BRVM Prestige.
- Variation quotidienne plafonnée à ±7,5% par la réglementation CREPMF.
- Horaires : 9h-14h (heure d'Abidjan, UTC+0).

GRILLE DE NOTATION (score_opportunite 0-10) :
- Valorisation (PER) : PER<10 = 3pts, PER 10-15 = 2pts, PER 15-20 = 1pt, PER>20 ou N/A = 0pt
- Rendement dividende : >5% = 3pts, 3-5% = 2pts, 1-3% = 1pt, <1% = 0pt
- Momentum prix : variation>3% = 2pts, 0-3% = 1pt, négatif = 0pt
- Liquidité : valeur_echangee>5M XOF = 2pts, 1-5M = 1pt, <1M = 0pt
Explique chaque dimension dans le champ arguments avec les chiffres précis."""


def build_analysis_prompt(session: MarketSession) -> str:
    """
    Construit le prompt utilisateur avec toutes les données de la séance.
    """
    data = _serialize_session(session)

    schema = _get_output_schema()

    return f"""Analyse la séance BRVM du {session.session_date.strftime('%d/%m/%Y')} à partir des données officielles ci-dessous.

## DONNÉES DE SÉANCE (source : Bulletin Officiel de la Cote)

{json.dumps(data, ensure_ascii=False, indent=2)}

## SCHÉMA DE SORTIE ATTENDU

{json.dumps(schema, ensure_ascii=False, indent=2)}

## INSTRUCTIONS

Produis une analyse COMPLÈTE et DÉTAILLÉE en JSON valide selon le schéma ci-dessus.

### top_picks (3-5 valeurs) :
- Applique la grille de notation définie dans le system prompt.
- Chaque argument doit citer les chiffres exacts : "PER de 8,2x — sous la médiane sectorielle de 12x", "Rendement 6,4% sur la base d'un dividende de 450 XOF".
- Inclure un champ `score_opportunite` (entier 0-10) calculé selon la grille.
- Inclure `profil_investisseur` : "rendement", "croissance", "valeur", ou "spéculatif".
- Minimum 4 arguments par valeur, chacun avec chiffres précis tirés des données.

### opportunites_detaillees — SECTION OBLIGATOIRE :
Scanne TOUTES les 47 actions. Pour chaque action avec un signal positif (PER<15 OU rendement>3% OU variation>2%), inclure une entrée avec symbole, score (0-10), et un commentaire de 1 phrase précis.

### valeurs_a_eviter (nouveau) :
2-3 valeurs présentant des signaux négatifs (faible liquidité, variation forte sans volume, PER excessif), avec la raison précise.

Pour le champ `market_sentiment` : "haussier" | "baissier" | "neutre" | "mitigé"

Rappel : UNIQUEMENT le JSON, aucun texte avant ou après."""


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
        "resume_executif": "string (3-4 phrases, synthèse factuelle et chiffrée de la séance)",
        "analyse_indices": {
            "composite": "string (analyse avec valeur, variation, tendance)",
            "brvm30": "string (analyse avec valeur, variation, tendance)",
            "contexte_regional": "string (contexte UEMOA, macro si pertinent)",
        },
        "top_secteurs": [
            {
                "nom": "string",
                "variation_pct": "float",
                "commentaire": "string (1-2 phrases avec chiffres)",
            }
        ],
        "top_picks": [
            {
                "symbole": "string",
                "nom": "string",
                "variation_pct": "float",
                "volume": "int",
                "score_opportunite": "int (0-10, calculé selon la grille)",
                "profil_investisseur": "rendement | croissance | valeur | spéculatif",
                "arguments": [
                    "string — MINIMUM 4 arguments, chacun avec chiffres précis"
                ],
                "note_de_prudence": "string (risques spécifiques à cette valeur)",
            }
        ],
        "opportunites_detaillees": [
            {
                "symbole": "string",
                "score": "int (0-10)",
                "signal": "string (1 phrase précise avec le chiffre clé)",
            }
        ],
        "valeurs_en_surveillance": [
            {
                "symbole": "string",
                "raison": "string (signal positif à surveiller)",
            }
        ],
        "valeurs_a_eviter": [
            {
                "symbole": "string",
                "raison": "string (signal négatif précis avec chiffre)",
            }
        ],
        "perspectives": "string (3-4 phrases sur les catalyseurs et risques à venir)",
        "disclaimer": "Ceci n'est pas un conseil en investissement.",
    }
