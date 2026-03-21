"""
Parser du Bulletin Officiel de la Cote (BOC) de la BRVM.

NOTE : La structure exacte du PDF doit être ajustée après inspection
du vrai BOC. Ce parser est un squelette à calibrer sur les données réelles.
"""
import logging
import re
from datetime import date
from pathlib import Path
from typing import Optional

import pdfplumber

from .models import IndexData, MarketSession, SectorData, StockData

logger = logging.getLogger(__name__)

# Les 47 symboles BRVM connus (à vérifier / compléter)
KNOWN_SYMBOLS = {
    "BICC", "BNBC", "BOAB", "BOABF", "BOAM", "BOAN", "BOAS",
    "CABC", "CBIBF", "CFAC", "CGCI", "CIEC", "COFI", "ECOC",
    "ETIT", "FTSC", "MABC", "NEIC", "NSBC", "NTLC", "ONTBF",
    "ORGT", "PALC", "PRSC", "SAFC", "SCRC", "SDSC", "SEMC",
    "SGBC", "SHEC", "SIBC", "SICC", "SIVC", "SMBC", "SNTS",
    "SOGC", "SOLC", "SPHC", "STAC", "STBC", "SUCB", "SVOC",
    "TPVC", "TTLC", "UNXC", "UNLC", "NSBC",
}


def parse_boc(pdf_path: Path) -> MarketSession:
    """
    Parse un BOC PDF et retourne une MarketSession complète.
    
    À CALIBRER sur le vrai BOC — les coordonnées de tableaux
    et les patterns de colonnes doivent être ajustés.
    """
    logger.info(f"Parsing BOC : {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        logger.info(f"PDF ouvert : {len(pdf.pages)} pages")

        # Extraire le texte de toutes les pages pour diagnostic
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        session_date = _extract_date(full_text)
        indices = _extract_indices(full_text)
        market_stats = _extract_market_stats(full_text)
        stocks = _extract_stocks(pdf)
        sectors = _extract_sectors(pdf)

    session = MarketSession(
        session_date=session_date,
        composite=indices["composite"],
        brvm30=indices["brvm30"],
        prestige=indices["prestige"],
        advancing=market_stats["advancing"],
        declining=market_stats["declining"],
        unchanged=market_stats["unchanged"],
        market_cap=market_stats["market_cap"],
        stocks=stocks,
        sectors=sectors,
    )

    logger.info(
        f"BOC parsé : {len(stocks)} actions, "
        f"{len(sectors)} secteurs, date={session_date}"
    )
    return session


def _extract_date(text: str) -> date:
    """Extrait la date de séance du texte du BOC."""
    # Pattern à ajuster selon le format réel du BOC
    pattern = r"(\d{2})/(\d{2})/(\d{4})"
    match = re.search(pattern, text)
    if not match:
        raise ValueError("Impossible d'extraire la date de séance du BOC")
    day, month, year = match.groups()
    return date(int(year), int(month), int(day))


def _extract_indices(text: str) -> dict[str, IndexData]:
    """Extrait les 3 indices principaux (Composite, BRVM 30, Prestige)."""
    # TODO: Calibrer les patterns sur le vrai BOC
    # Exemple de pattern attendu : "BRVM COMPOSITE 217,45 +1,23%"
    indices = {}

    composite_match = re.search(
        r"BRVM\s+COMPOSITE[^\d]+([\d\s,]+)\s+([-+]?[\d,]+)%", text, re.IGNORECASE
    )
    if composite_match:
        indices["composite"] = IndexData(
            name="BRVM Composite",
            value=_parse_float(composite_match.group(1)),
            variation_pct=_parse_float(composite_match.group(2)),
        )

    # Même logique pour BRVM 30 et Prestige
    # TODO: Ajouter les patterns après inspection du vrai BOC
    indices.setdefault("composite", IndexData("BRVM Composite", 0.0, 0.0))
    indices.setdefault("brvm30", IndexData("BRVM 30", 0.0, 0.0))
    indices.setdefault("prestige", IndexData("BRVM Prestige", 0.0, 0.0))

    return indices


def _extract_market_stats(text: str) -> dict:
    """Extrait les statistiques globales du marché."""
    # TODO: Calibrer sur le vrai BOC
    return {
        "advancing": 0,
        "declining": 0,
        "unchanged": 0,
        "market_cap": 0.0,
    }


def _extract_stocks(pdf: pdfplumber.PDF) -> list[StockData]:
    """
    Extrait les données de toutes les actions depuis les tableaux PDF.
    
    TODO: Calibrer les numéros de page et la structure des colonnes
    après inspection du vrai BOC avec pdfplumber.
    
    Pour diagnostiquer, utiliser :
        python scripts/inspect_boc.py --path data/raw/boc_YYYY-MM-DD.pdf
    """
    stocks = []

    for page_num, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                stock = _parse_stock_row(row)
                if stock:
                    stocks.append(stock)

    return stocks


def _parse_stock_row(row: list) -> Optional[StockData]:
    """Parse une ligne de tableau et retourne un StockData si c'est une action valide."""
    if not row or len(row) < 5:
        return None

    # Le symbole est généralement en colonne 0 ou 1
    symbol = str(row[0] or "").strip().upper()
    if symbol not in KNOWN_SYMBOLS:
        return None

    try:
        return StockData(
            symbol=symbol,
            name=str(row[1] or "").strip(),
            previous_close=_parse_float(row[2]),
            close=_parse_float(row[3]),
            variation_pct=_parse_float(row[4]),
            volume=_parse_int(row[5] if len(row) > 5 else "0"),
            value_traded=_parse_float(row[6] if len(row) > 6 else "0"),
            per=_parse_float_optional(row[7] if len(row) > 7 else None),
            net_yield=_parse_float_optional(row[8] if len(row) > 8 else None),
            last_dividend=_parse_float_optional(row[9] if len(row) > 9 else None),
        )
    except Exception as e:
        logger.debug(f"Ligne ignorée pour {symbol} : {e}")
        return None


def _extract_sectors(pdf: pdfplumber.PDF) -> list[SectorData]:
    """Extrait les données des 7 indices sectoriels."""
    # TODO: Calibrer après inspection du vrai BOC
    return []


def _parse_float(value) -> float:
    """Convertit une valeur (str ou autre) en float. Gère les espaces et virgules."""
    if value is None:
        return 0.0
    cleaned = str(value).replace(" ", "").replace(",", ".").replace("\xa0", "")
    cleaned = re.sub(r"[^\d.\-+]", "", cleaned)
    return float(cleaned) if cleaned else 0.0


def _parse_float_optional(value) -> Optional[float]:
    """Retourne None si la valeur est vide ou non parseable."""
    try:
        result = _parse_float(value)
        return result if result != 0.0 else None
    except (ValueError, TypeError):
        return None


def _parse_int(value) -> int:
    """Convertit une valeur en entier."""
    cleaned = str(value or "0").replace(" ", "").replace(",", "").replace("\xa0", "")
    cleaned = re.sub(r"[^\d]", "", cleaned)
    return int(cleaned) if cleaned else 0
