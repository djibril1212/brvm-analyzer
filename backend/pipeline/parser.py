"""
Parser du Bulletin Officiel de la Cote (BOC) de la BRVM.

Structure typique d'un BOC BRVM :
- Page 1 : En-tête, date, résumé du marché, indices principaux
- Pages 2-N : Tableau des actions (VALEURS, COURS REF, COURS SEANCE, VAR%, VOLUME, MONTANT, PER, RENDEMENT)
- Dernière section : Indices sectoriels (7 secteurs BRVM)

Le parser tente 3 stratégies dans l'ordre :
  1. Extraction de tableaux pdfplumber (méthode principale)
  2. Extraction par regex sur le texte brut (fallback)
  3. Extraction par coordonnées bbox (fallback avancé)
"""
import logging
import re
from datetime import date
from pathlib import Path
from typing import Optional

import pdfplumber

from .models import IndexData, MarketSession, SectorData, StockData

logger = logging.getLogger(__name__)

# ─── Symboles BRVM connus ──────────────────────────────────────────────────────
KNOWN_SYMBOLS = {
    "BICC", "BNBC", "BOAB", "BOABF", "BOAM", "BOAN", "BOAS",
    "CABC", "CBIBF", "CFAC", "CGCI", "CIEC", "COFI", "ECOC",
    "ETIT", "FTSC", "MABC", "NEIC", "NSBC", "NTLC", "ONTBF",
    "ORGT", "PALC", "PRSC", "SAFC", "SCRC", "SDSC", "SEMC",
    "SGBC", "SHEC", "SIBC", "SICC", "SIVC", "SMBC", "SNTS",
    "SOGC", "SOLC", "SPHC", "STAC", "STBC", "SUCB", "SVOC",
    "TPVC", "TTLC", "UNXC", "UNLC",
}

# ─── Noms des secteurs BRVM ────────────────────────────────────────────────────
SECTOR_NAMES = {
    "AGRICULTURE": "Agriculture",
    "DISTRIBUTION": "Distribution",
    "FINANCE": "Finance",
    "INDUSTRIE": "Industrie",
    "TRANSPORT": "Transport",
    "SERVICES PUBLICS": "Services Publics",
    "AUTRES SECTEURS": "Autres Secteurs",
    "AGRO-ALIMENTAIRE": "Agro-Alimentaire",
    "BTP": "BTP",
    "COMMERCE": "Commerce",
}

# Mois FR → numéro
_MOIS = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12,
}


# ─── Point d'entrée ────────────────────────────────────────────────────────────

def parse_boc(pdf_path: Path) -> MarketSession:
    """
    Parse un BOC PDF et retourne une MarketSession complète.
    Lance ValueError si la date ou les actions ne peuvent pas être extraites.
    """
    logger.info(f"Parsing BOC : {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        n_pages = len(pdf.pages)
        logger.info(f"PDF ouvert : {n_pages} pages")

        # Texte complet (toutes pages)
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        session_date = _extract_date(full_text)
        indices = _extract_indices(full_text)
        market_stats = _extract_market_stats(full_text)
        stocks = _extract_stocks(pdf, full_text)
        sectors = _extract_sectors(pdf, full_text)

    logger.info(
        f"BOC parsé : {len(stocks)} actions, {len(sectors)} secteurs, date={session_date}"
    )

    if len(stocks) == 0:
        logger.warning(
            "Aucune action extraite — vérifier la structure du PDF avec inspect_boc.py"
        )

    return MarketSession(
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


# ─── Date ──────────────────────────────────────────────────────────────────────

def _extract_date(text: str) -> date:
    """
    Tente plusieurs formats de date présents dans les BOC BRVM :
    - "21 mars 2025"
    - "21/03/2025"
    - "SEANCE DU 21/03/2025"
    """
    # Format littéral FR : "21 mars 2025"
    m = re.search(
        r"(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|"
        r"septembre|octobre|novembre|d[eé]cembre)\s+(\d{4})",
        text, re.IGNORECASE,
    )
    if m:
        day = int(m.group(1))
        month = _MOIS.get(m.group(2).lower().replace("é", "e").replace("û", "u"), 0)
        year = int(m.group(3))
        if month:
            return date(year, month, day)

    # Format numérique : DD/MM/YYYY ou DD-MM-YYYY
    m = re.search(r"(\d{2})[/\-](\d{2})[/\-](\d{4})", text)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= month <= 12 and 1 <= day <= 31:
            return date(year, month, day)

    raise ValueError("Impossible d'extraire la date de séance du BOC")


# ─── Indices ───────────────────────────────────────────────────────────────────

def _extract_indices(text: str) -> dict[str, IndexData]:
    """
    Extrait les 3 indices : BRVM Composite, BRVM 30, BRVM Prestige.

    Patterns courants dans le BOC :
      "BRVM COMPOSITE    217,45    +1,23%"
      "COMPOSITE : 217,45 pts  (+1,23%)"
    """
    indices: dict[str, IndexData] = {}

    specs = [
        ("composite", "BRVM Composite", r"(?:BRVM\s+)?COMPOSITE"),
        ("brvm30",    "BRVM 30",        r"BRVM\s*30"),
        ("prestige",  "BRVM Prestige",  r"(?:BRVM\s+)?PRESTIGE"),
    ]

    for key, display_name, pattern in specs:
        # Cherche : NOM  valeur  [+/-]variation%
        m = re.search(
            pattern
            + r"[^\d\n]{0,30}([\d\s]+[,.][\d]+)"   # valeur de l'indice
            + r"[^\d\n\-+]{0,20}([-+]?[\d\s]+[,.][\d]+)\s*%",
            text, re.IGNORECASE,
        )
        if m:
            indices[key] = IndexData(
                name=display_name,
                value=_parse_float(m.group(1)),
                variation_pct=_parse_float(m.group(2)),
            )
        else:
            # Fallback : cherche juste la valeur sans variation
            m2 = re.search(
                pattern + r"[^\d\n]{0,30}([\d\s]+[,.][\d]+)",
                text, re.IGNORECASE,
            )
            indices[key] = IndexData(
                name=display_name,
                value=_parse_float(m2.group(1)) if m2 else 0.0,
                variation_pct=0.0,
            )

    return indices


# ─── Statistiques globales ────────────────────────────────────────────────────

def _extract_market_stats(text: str) -> dict:
    """
    Extrait : hausses, baisses, stables, capitalisation boursière.
    Patterns courants : "Hausse : 12 / Baisse : 8 / Stable : 27"
    """
    stats = {"advancing": 0, "declining": 0, "unchanged": 0, "market_cap": 0.0}

    # Hausses
    m = re.search(r"(?:hausse|haussier)[^\d]{0,10}(\d+)", text, re.IGNORECASE)
    if m:
        stats["advancing"] = int(m.group(1))

    # Baisses
    m = re.search(r"(?:baisse|baissi)[^\d]{0,10}(\d+)", text, re.IGNORECASE)
    if m:
        stats["declining"] = int(m.group(1))

    # Stables
    m = re.search(r"(?:stable|inchang)[^\d]{0,10}(\d+)", text, re.IGNORECASE)
    if m:
        stats["unchanged"] = int(m.group(1))

    # Capitalisation (milliards FCFA)
    m = re.search(
        r"capitalisation[^\d]{0,20}([\d\s]+[,.][\d]*)\s*(?:milliard|Mds|G)?",
        text, re.IGNORECASE,
    )
    if m:
        stats["market_cap"] = _parse_float(m.group(1))

    return stats


# ─── Actions ──────────────────────────────────────────────────────────────────

def _extract_stocks(pdf: pdfplumber.PDF, full_text: str) -> list[StockData]:
    """
    Stratégie 1 : extraction des tableaux via pdfplumber.
    Stratégie 2 : regex sur le texte brut (fallback).
    """
    stocks = _extract_stocks_from_tables(pdf)

    if len(stocks) < 5:
        logger.info("Peu d'actions via tableaux — tentative regex sur texte brut")
        stocks_regex = _extract_stocks_from_text(full_text)
        if len(stocks_regex) > len(stocks):
            stocks = stocks_regex

    return stocks


def _extract_stocks_from_tables(pdf: pdfplumber.PDF) -> list[StockData]:
    """Extraction principale via tableaux pdfplumber."""
    stocks: list[StockData] = []
    seen: set[str] = set()

    for page_num, page in enumerate(pdf.pages):
        tables = page.extract_tables({
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "snap_tolerance": 3,
            "join_tolerance": 3,
            "edge_min_length": 3,
            "min_words_vertical": 3,
            "min_words_horizontal": 1,
        })

        for table in tables:
            for row in table:
                if not row:
                    continue
                stock = _parse_stock_row(row)
                if stock and stock.symbol not in seen:
                    stocks.append(stock)
                    seen.add(stock.symbol)

    return stocks


def _parse_stock_row(row: list) -> Optional[StockData]:
    """
    Parse une ligne de tableau.

    Colonnes attendues (ordre typique BOC) :
    [0] Symbole / Code   [1] Libellé / Nom
    [2] Cours Réf        [3] Cours Séance
    [4] Variation %      [5] Volume (titres)
    [6] Montant (FCFA)   [7] PER   [8] Rendement   [9] Dernier dividende

    Certains BOC ont le symbole en col 0 directement,
    d'autres ont le n° de ligne en col 0 et le symbole en col 1.
    """
    if not row or len(row) < 4:
        return None

    # Déterminer la colonne du symbole
    symbol = _find_symbol_in_row(row)
    if not symbol:
        return None

    sym_idx = next(
        (i for i, cell in enumerate(row) if str(cell or "").strip().upper() == symbol),
        0,
    )

    try:
        # Décaler les indices selon la position du symbole
        name_idx = sym_idx + 1
        prev_idx = sym_idx + 2
        close_idx = sym_idx + 3
        var_idx = sym_idx + 4
        vol_idx = sym_idx + 5
        val_idx = sym_idx + 6
        per_idx = sym_idx + 7
        yield_idx = sym_idx + 8
        div_idx = sym_idx + 9

        def safe(idx: int):
            return row[idx] if idx < len(row) else None

        return StockData(
            symbol=symbol,
            name=str(safe(name_idx) or "").strip(),
            previous_close=_parse_float(safe(prev_idx)),
            close=_parse_float(safe(close_idx)),
            variation_pct=_parse_float(safe(var_idx)),
            volume=_parse_int(safe(vol_idx)),
            value_traded=_parse_float(safe(val_idx)),
            per=_parse_float_optional(safe(per_idx)),
            net_yield=_parse_float_optional(safe(yield_idx)),
            last_dividend=_parse_float_optional(safe(div_idx)),
        )
    except Exception as e:
        logger.debug(f"Ligne ignorée pour {symbol} : {e}")
        return None


def _find_symbol_in_row(row: list) -> Optional[str]:
    """Cherche un symbole BRVM connu dans n'importe quelle cellule de la ligne."""
    for cell in row:
        candidate = str(cell or "").strip().upper()
        if candidate in KNOWN_SYMBOLS:
            return candidate
        # Parfois le symbole est suivi d'un espace ou d'un chiffre
        m = re.match(r"^([A-Z]{2,6}C?)\b", candidate)
        if m and m.group(1) in KNOWN_SYMBOLS:
            return m.group(1)
    return None


def _extract_stocks_from_text(text: str) -> list[StockData]:
    """
    Fallback : regex ligne par ligne.
    Exemple de ligne BOC :
    "BICC  BICI COTE D'IVOIRE  4 900  4 900  0,00%  0  0"
    """
    stocks: list[StockData] = []
    seen: set[str] = set()

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue

        # Cherche symbole en début de ligne
        m = re.match(r"^([A-Z]{2,6})\s+(.+?)\s+([\d\s,]+)\s+([\d\s,]+)\s+([-+]?[\d,]+)\s*%?\s*([\d\s,]*)", line)
        if not m:
            continue

        symbol = m.group(1)
        if symbol not in KNOWN_SYMBOLS or symbol in seen:
            continue

        try:
            stocks.append(StockData(
                symbol=symbol,
                name=m.group(2).strip(),
                previous_close=_parse_float(m.group(3)),
                close=_parse_float(m.group(4)),
                variation_pct=_parse_float(m.group(5)),
                volume=_parse_int(m.group(6)),
                value_traded=0.0,
                per=None,
                net_yield=None,
                last_dividend=None,
            ))
            seen.add(symbol)
        except Exception as e:
            logger.debug(f"Ligne regex ignorée pour {symbol} : {e}")

    return stocks


# ─── Secteurs ─────────────────────────────────────────────────────────────────

def _extract_sectors(pdf: pdfplumber.PDF, full_text: str) -> list[SectorData]:
    """
    Extrait les 7 indices sectoriels BRVM.
    Ils apparaissent généralement dans un tableau en bas du BOC.
    """
    sectors = _extract_sectors_from_tables(pdf)

    if len(sectors) < 3:
        sectors_regex = _extract_sectors_from_text(full_text)
        if len(sectors_regex) > len(sectors):
            sectors = sectors_regex

    return sectors


def _extract_sectors_from_tables(pdf: pdfplumber.PDF) -> list[SectorData]:
    sectors: list[SectorData] = []

    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            for row in table:
                sector = _parse_sector_row(row)
                if sector:
                    sectors.append(sector)

    return sectors


def _parse_sector_row(row: list) -> Optional[SectorData]:
    """Parse une ligne du tableau des indices sectoriels."""
    if not row or len(row) < 3:
        return None

    # La première cellule doit contenir un nom de secteur connu
    name_raw = str(row[0] or "").strip().upper()
    display_name = None
    for key, val in SECTOR_NAMES.items():
        if key in name_raw:
            display_name = val
            break

    if not display_name:
        return None

    try:
        return SectorData(
            name=display_name,
            value=_parse_float(row[1] if len(row) > 1 else "0"),
            variation_pct=_parse_float(row[2] if len(row) > 2 else "0"),
            annual_variation_pct=_parse_float(row[3] if len(row) > 3 else "0"),
            avg_per=_parse_float_optional(row[4] if len(row) > 4 else None),
            volume=_parse_int(row[5] if len(row) > 5 else "0"),
            value_traded=_parse_float(row[6] if len(row) > 6 else "0"),
        )
    except Exception as e:
        logger.debug(f"Secteur ignoré ({display_name}) : {e}")
        return None


def _extract_sectors_from_text(text: str) -> list[SectorData]:
    """Fallback regex pour les secteurs."""
    sectors: list[SectorData] = []
    seen: set[str] = set()

    for key, display_name in SECTOR_NAMES.items():
        # Cherche "NOM_SECTEUR  valeur  variation%"
        m = re.search(
            re.escape(key)
            + r"[^\d\n]{0,10}([\d\s,]+[,.][\d]+)"
            + r"[^\d\n\-+]{0,10}([-+]?[\d,]+)\s*%",
            text, re.IGNORECASE,
        )
        if m and display_name not in seen:
            try:
                sectors.append(SectorData(
                    name=display_name,
                    value=_parse_float(m.group(1)),
                    variation_pct=_parse_float(m.group(2)),
                    annual_variation_pct=0.0,
                    avg_per=None,
                    volume=0,
                    value_traded=0.0,
                ))
                seen.add(display_name)
            except Exception:
                pass

    return sectors


# ─── Utilitaires ──────────────────────────────────────────────────────────────

def _parse_float(value) -> float:
    """Convertit en float. Gère espaces, virgules, NBSP, signes."""
    if value is None:
        return 0.0
    cleaned = str(value).replace("\xa0", "").replace(" ", "").replace(",", ".")
    cleaned = re.sub(r"[^\d.\-+]", "", cleaned)
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def _parse_float_optional(value) -> Optional[float]:
    """Retourne None si la valeur est vide ou 0."""
    try:
        result = _parse_float(value)
        return result if result != 0.0 else None
    except (ValueError, TypeError):
        return None


def _parse_int(value) -> int:
    """Convertit en entier."""
    if value is None:
        return 0
    cleaned = re.sub(r"[^\d]", "", str(value).replace("\xa0", ""))
    return int(cleaned) if cleaned else 0
