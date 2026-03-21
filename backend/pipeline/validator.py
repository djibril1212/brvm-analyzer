"""
Validation des données parsées depuis le BOC.
Vérifie la cohérence et la complétude avant insertion en base.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from .models import MarketSession, StockData, SectorData

logger = logging.getLogger(__name__)

# 47 symboles BRVM connus (à maintenir à jour si de nouveaux titres sont introduits)
EXPECTED_SYMBOLS: set[str] = {
    "ABJC", "BICC", "BNBC", "BOAS", "BOAB", "BOABF", "BOAM", "BOAN",
    "CABC", "CFAC", "CGBC", "CIEC", "COBC", "ETIT", "FTSC", "GNBC",
    "HVAC", "NSBC", "NTLC", "OIBC", "ONTBF", "ORGT", "PALC", "PRSC",
    "SAFC", "SCBC", "SEMC", "SGBC", "SIBC", "SICC", "SIFCC", "SMBC",
    "SNTS", "SOGC", "SOLC", "STBC", "TTLC", "TTLS", "UNLC", "UNXC",
    "SIVC", "SDCC", "NEBC", "CAGC", "EMCC", "SHEC", "FTSE",
}

EXPECTED_SECTOR_COUNT = 7

# Plafonds de variation journalière BRVM : ±7.5% (règle CREPMF)
MAX_VARIATION_PCT = 7.5

# Seuils de cohérence
MIN_MARKET_CAP_CFA = 1_000_000_000_000  # 1 000 Mds CFA minimum plausible
MAX_MARKET_CAP_CFA = 20_000_000_000_000  # 20 000 Mds CFA maximum plausible


@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[str]
    warnings: list[str]

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        self.is_valid = False

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)


def validate_session(session: MarketSession) -> ValidationResult:
    """
    Valide une MarketSession complète.
    Retourne un ValidationResult avec la liste des erreurs et avertissements.
    """
    result = ValidationResult(is_valid=True, errors=[], warnings=[])

    _validate_date(session, result)
    _validate_indices(session, result)
    _validate_market_stats(session, result)
    _validate_stocks(session, result)
    _validate_sectors(session, result)

    if result.errors:
        logger.error(
            "Validation échouée pour %s : %d erreur(s) — %s",
            session.session_date,
            len(result.errors),
            "; ".join(result.errors),
        )
    if result.warnings:
        logger.warning(
            "Validation warnings pour %s : %s",
            session.session_date,
            "; ".join(result.warnings),
        )

    return result


# ---------------------------------------------------------------------------
# Sous-validateurs
# ---------------------------------------------------------------------------


def _validate_date(session: MarketSession, result: ValidationResult) -> None:
    from datetime import date

    if session.session_date > date.today():
        result.add_error(
            f"Date de séance dans le futur : {session.session_date}"
        )


def _validate_indices(session: MarketSession, result: ValidationResult) -> None:
    for name, idx in [
        ("COMPOSITE", session.composite),
        ("BRVM-30", session.brvm30),
        ("PRESTIGE", session.prestige),
    ]:
        if idx.value <= 0:
            result.add_error(f"Indice {name} invalide : {idx.value}")
        if abs(idx.variation_pct) > MAX_VARIATION_PCT * 2:
            result.add_warning(
                f"Variation indice {name} anormalement élevée : {idx.variation_pct}%"
            )


def _validate_market_stats(session: MarketSession, result: ValidationResult) -> None:
    total_stocks = session.advancing + session.declining + session.unchanged
    if total_stocks == 0:
        result.add_error("Aucune statistique de séance (hausse/baisse/stable)")
    elif total_stocks > 47:
        result.add_warning(
            f"Total actions ({total_stocks}) dépasse 47 — possible doublon"
        )

    if not (MIN_MARKET_CAP_CFA <= session.market_cap <= MAX_MARKET_CAP_CFA):
        result.add_warning(
            f"Capitalisation boursière hors plage plausible : {session.market_cap:,.0f} CFA"
        )


def _validate_stocks(session: MarketSession, result: ValidationResult) -> None:
    if not session.stocks:
        result.add_error("Aucune action parsée")
        return

    parsed_symbols = {s.symbol for s in session.stocks}

    missing = EXPECTED_SYMBOLS - parsed_symbols
    if missing:
        result.add_warning(
            f"{len(missing)} symbole(s) manquant(s) : {', '.join(sorted(missing))}"
        )

    unknown = parsed_symbols - EXPECTED_SYMBOLS
    if unknown:
        result.add_warning(
            f"{len(unknown)} symbole(s) inconnu(s) : {', '.join(sorted(unknown))}"
        )

    for stock in session.stocks:
        _validate_single_stock(stock, result)


def _validate_single_stock(stock: StockData, result: ValidationResult) -> None:
    if stock.close < 0:
        result.add_error(f"[{stock.symbol}] cours de clôture négatif : {stock.close}")

    if stock.previous_close > 0:
        implied_variation = (stock.close - stock.previous_close) / stock.previous_close * 100
        if abs(implied_variation - stock.variation_pct) > 0.2:
            result.add_warning(
                f"[{stock.symbol}] variation incohérente : "
                f"calculée={implied_variation:.2f}% vs parsée={stock.variation_pct:.2f}%"
            )

    if abs(stock.variation_pct) > MAX_VARIATION_PCT + 0.1:
        result.add_warning(
            f"[{stock.symbol}] variation ±7.5% CREPMF dépassée : {stock.variation_pct:.2f}%"
        )

    if stock.volume < 0:
        result.add_error(f"[{stock.symbol}] volume négatif : {stock.volume}")

    if stock.value_traded < 0:
        result.add_error(f"[{stock.symbol}] valeur échangée négative : {stock.value_traded}")

    if stock.per is not None and (stock.per < 0 or stock.per > 1000):
        result.add_warning(f"[{stock.symbol}] PER suspect : {stock.per}")

    if stock.net_yield is not None and (stock.net_yield < 0 or stock.net_yield > 50):
        result.add_warning(f"[{stock.symbol}] rendement suspect : {stock.net_yield}%")


def _validate_sectors(session: MarketSession, result: ValidationResult) -> None:
    if len(session.sectors) < EXPECTED_SECTOR_COUNT:
        result.add_warning(
            f"Seulement {len(session.sectors)} secteur(s) parsé(s) sur {EXPECTED_SECTOR_COUNT} attendus"
        )

    for sector in session.sectors:
        if sector.value <= 0:
            result.add_error(
                f"Indice sectoriel invalide pour {sector.name} : {sector.value}"
            )
