"""
Validation post-génération de l'analyse IA.
Vérifie que Claude n'a pas inventé de données et respecte les règles CREPMF.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

from ..pipeline.models import MarketSession

logger = logging.getLogger(__name__)

# Mots interdits dans toute analyse publiée
FORBIDDEN_PHRASES = [
    "achetez",
    "vendez",
    "investissez",
    "je vous recommande d'acheter",
    "je vous recommande de vendre",
    "conseil d'achat",
    "conseil de vente",
    "passez un ordre",
    "saisissez l'opportunité",
]

REQUIRED_DISCLAIMER = "ceci n'est pas un conseil en investissement"


@dataclass
class AIValidationResult:
    is_valid: bool
    errors: list[str]
    warnings: list[str]

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        self.is_valid = False

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)


def validate_analysis(
    analysis: dict[str, Any], session: MarketSession
) -> AIValidationResult:
    """
    Valide l'analyse Claude contre les règles CREPMF et la cohérence avec les données réelles.
    """
    result = AIValidationResult(is_valid=True, errors=[], warnings=[])

    _check_required_fields(analysis, result)
    _check_disclaimer(analysis, result)
    _check_forbidden_phrases(analysis, result)
    _check_data_consistency(analysis, session, result)
    _check_top_picks_symbols(analysis, session, result)

    if result.errors:
        logger.error(
            "Validation analyse IA échouée : %s",
            "; ".join(result.errors),
        )

    return result


def _check_required_fields(
    analysis: dict[str, Any], result: AIValidationResult
) -> None:
    required = [
        "date", "market_sentiment", "resume_executif",
        "analyse_indices", "top_picks", "disclaimer",
    ]
    for field in required:
        if field not in analysis:
            result.add_error(f"Champ obligatoire manquant dans l'analyse IA : '{field}'")


def _check_disclaimer(
    analysis: dict[str, Any], result: AIValidationResult
) -> None:
    disclaimer = analysis.get("disclaimer", "")
    if REQUIRED_DISCLAIMER not in disclaimer.lower():
        result.add_error(
            f"Disclaimer CREPMF absent ou incomplet : '{disclaimer}'"
        )


def _check_forbidden_phrases(
    analysis: dict[str, Any], result: AIValidationResult
) -> None:
    # Sérialise tout en texte pour scanner
    full_text = _flatten_to_text(analysis).lower()

    for phrase in FORBIDDEN_PHRASES:
        if phrase in full_text:
            result.add_error(
                f"Phrase interdite détectée dans l'analyse IA : '{phrase}'"
            )


def _check_data_consistency(
    analysis: dict[str, Any], session: MarketSession, result: AIValidationResult
) -> None:
    """
    Vérifie que les chiffres mentionnés dans l'analyse correspondent aux données réelles.
    Détecte les hallucinations numériques.
    """
    full_text = _flatten_to_text(analysis)

    # Extraire tous les nombres de l'analyse
    numbers_in_analysis = set(
        float(n.replace(",", ".")) for n in re.findall(r"\d+[,.]?\d*", full_text)
        if "." in n or "," in n  # seulement les décimaux (indices, variations)
    )

    # Construire un ensemble de valeurs légitimes issues du BOC
    legitimate_values: set[float] = set()
    legitimate_values.add(round(session.composite.value, 2))
    legitimate_values.add(round(session.brvm30.value, 2))
    legitimate_values.add(round(session.prestige.value, 2))
    for stock in session.stocks:
        legitimate_values.add(round(stock.close, 2))
        legitimate_values.add(round(stock.variation_pct, 2))
    for sector in session.sectors:
        legitimate_values.add(round(sector.variation_pct, 2))

    # Chercher des nombres précis qui ne correspondent à rien de connu
    suspicious = numbers_in_analysis - legitimate_values
    if len(suspicious) > 10:
        result.add_warning(
            f"{len(suspicious)} valeur(s) numérique(s) dans l'analyse non trouvées dans le BOC "
            f"(possible hallucination ou formatage différent)"
        )


def _check_top_picks_symbols(
    analysis: dict[str, Any], session: MarketSession, result: AIValidationResult
) -> None:
    """Vérifie que les top picks existent dans la session parsée."""
    real_symbols = {s.symbol for s in session.stocks}
    top_picks = analysis.get("top_picks", [])

    for pick in top_picks:
        if isinstance(pick, dict):
            symbol = pick.get("symbole", "")
            if symbol and symbol not in real_symbols:
                result.add_error(
                    f"Top pick '{symbol}' non trouvé dans les données réelles du BOC "
                    f"(hallucination probable)"
                )


def _flatten_to_text(obj: Any, sep: str = " ") -> str:
    """Aplatit récursivement un dict/list en texte."""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, dict):
        return sep.join(_flatten_to_text(v) for v in obj.values())
    if isinstance(obj, list):
        return sep.join(_flatten_to_text(item) for item in obj)
    return str(obj)
