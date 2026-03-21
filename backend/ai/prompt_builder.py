"""
Construction du prompt Claude pour l'analyse quotidienne BRVM.
Principe fondamental : Claude ne génère JAMAIS de chiffres de sa propre initiative —
toutes les données sont injectées depuis le BOC via ce module.
"""

from __future__ import annotations

import json
from datetime import date

from ..pipeline.models import MarketSession, StockData


SYSTEM_PROMPT = """Tu es un analyste financier spécialisé dans les marchés boursiers africains, \
expert de la BRVM (Bourse Régionale des Valeurs Mobilières) qui dessert l'UEMOA (8 pays d'Afrique de l'Ouest).

RÈGLES ABSOLUES — NON NÉGOCIABLES :
1. Tu n'utilises QUE les données fournies dans le prompt. Aucun chiffre inventé.
2. Tu n'utilises JAMAIS les verbes "achetez", "vendez", "investissez" ou tout autre conseil d'achat/vente direct.
3. Toutes tes analyses doivent se terminer par : "Ceci n'est pas un conseil en investissement."
4. Ton analyse est destinée à des investisseurs informés souhaitant comprendre les tendances du marché.
5. Tu respectes scrupuleusement les contraintes légales CREPMF sur la communication financière.
6. Tu réponds UNIQUEMENT en JSON valide selon le schéma fourni.

CONTEXTE MARCHÉ :
- La BRVM est la bourse commune de l'UEMOA (Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo).
- La monnaie est le Franc CFA (XOF), arrimé à l'Euro (655,957 XOF = 1 EUR).
- 47 actions cotées réparties en 7 secteurs.
- Indices principaux : BRVM Composite, BRVM 30, BRVM Prestige.
- Variation quotidienne plafonnée à ±7,5% par la réglementation CREPMF.
- Horaires : 9h-14h (heure d'Abidjan, UTC+0)."""


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

Produis une analyse structurée de la séance en JSON valide selon le schéma ci-dessus.

Pour le champ `top_picks` (2-3 valeurs max) :
- Critères de sélection (pondération) :
  * PER attractif (≤15 ou secteur) : 25%
  * Rendement dividende élevé : 25%
  * Momentum positif (variation + volume) : 20%
  * Liquidité (volume échangé) : 15%
  * Catalyseur identifiable : 15%
- N'inclure une valeur que si tu peux argumenter sur au moins 3 critères avec les données fournies.
- Ne jamais recommander d'achat. Utiliser : "présente des caractéristiques intéressantes pour les investisseurs qui..."

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
        "resume_executif": "string (2-3 phrases, synthèse de la séance)",
        "analyse_indices": {
            "composite": "string (analyse de l'indice composite)",
            "brvm30": "string (analyse du BRVM-30)",
            "contexte_regional": "string (contexte UEMOA si pertinent)",
        },
        "top_secteurs": [
            {
                "nom": "string",
                "variation_pct": "float",
                "commentaire": "string (1-2 phrases)",
            }
        ],
        "top_picks": [
            {
                "symbole": "string",
                "nom": "string",
                "variation_pct": "float",
                "volume": "int",
                "arguments": ["string (critère : explication)"],
                "note_de_prudence": "string (toujours présente)",
            }
        ],
        "valeurs_en_surveillance": [
            {
                "symbole": "string",
                "raison": "string",
            }
        ],
        "perspectives": "string (2-3 phrases sur les prochaines séances)",
        "disclaimer": "Ceci n'est pas un conseil en investissement.",
    }
