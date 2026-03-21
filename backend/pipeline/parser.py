"""
Parser du Bulletin Officiel de la Cote (BOC) de la BRVM.

Structure calibrée sur le BOC réel (18 mars 2026, N°53) :

ACTIONS — tableau 16 colonnes (pages 3+) :
  [0] Code secteur (CB|ENE|FIN|TEL|CD|IND|SPU)
  [1] Symbole
  [2] Nom/Titre
  [3] (vide)
  [4] Cours Précédent
  [5] Cours Ouverture
  [6] Cours Clôture  ← "close"
  [7] Variation jour %
  [8] Volume
  [9] Valeur échangée (FCFA)
  [10] Cours Référence
  [11] Variation annuelle précédente
  [12] Dividende net
  [13] Date dividende
  [14] Rendement net %
  [15] PER

INDICES — page 1, tableaux séparés :
  Tableau BRVM COMPOSITE : col[0]="BRVM COMPOSITE", col[1]=valeur ; ligne 1 col[1]=variation%
  Tableau BRVM 30 : col[0]="BRVM 30", col[1]=valeur ; ligne 1 col[1]=variation%
  Tableau BRVM PRESTIGE : col[1]="BRVM PRESTIGE", col[2]=valeur ; ligne 1 col[2]=variation%

SECTEURS — page 1, tableau "Base = 100 au 02 janvier 2025" :
  col[0] = "BRVM - NOM N" (nom + nb sociétés collés)
  col[2] = valeur
  col[3] = "var_jour% var_annuelle% volume valeur_totale PER" (tout concaténé dans 1 colonne)

STATS MARCHÉ — page 1, tableau "Actions" :
  Ligne "Capitalisation" → market_cap
  Ligne "Nombre de titres en hausse" → advancing
  Ligne "Nombre de titres en baisse" → declining
  Ligne "Nombre de titres inchangés" → unchanged
"""
import logging
import re
from datetime import date
from pathlib import Path
from typing import Optional

import pdfplumber

from .models import IndexData, MarketSession, SectorData, StockData

logger = logging.getLogger(__name__)

# ─── Symboles BRVM (47 — extraits du BOC réel) ───────────────────────────────
KNOWN_SYMBOLS = {
    "ABJC", "BICB", "BICC", "BNBC", "BOAB", "BOABF", "BOAC", "BOAM", "BOAN", "BOAS",
    "CABC", "CBIBF", "CFAC", "CIEC", "ECOC", "ETIT", "FTSC", "LNBB", "NEIC",
    "NSBC", "NTLC", "ONTBF", "ORAC", "ORGT", "PALC", "PRSC", "SAFC", "SCRC",
    "SDCC", "SDSC", "SEMC", "SGBC", "SHEC", "SIBC", "SICC", "SIVC", "SLBC",
    "SMBC", "SNTS", "SOGC", "SPHC", "STAC", "STBC", "TTLC", "TTLS", "UNLC", "UNXC",
}

# Codes secteurs présents en colonne 0 des lignes actions
SECTOR_CODES = {"CB", "ENE", "FIN", "TEL", "CD", "IND", "SPU"}

# Noms des secteurs tels qu'ils apparaissent dans le BOC (sans le nb de sociétés)
SECTOR_DISPLAY = {
    "TELECOMMUNICATIONS": "Télécommunications",
    "CONSOMMATION DISCRETIONNAIRE": "Consommation Discrétionnaire",
    "SERVICES FINANCIERS": "Services Financiers",
    "CONSOMMATION DE BASE": "Consommation de Base",
    "INDUSTRIELS": "Industriels",
    "ENERGIE": "Énergie",
    "SERVICES PUBLICS": "Services Publics",
}

_MOIS = {
    "janvier": 1, "fevrier": 2, "février": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "aout": 8, "août": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "decembre": 12, "décembre": 12,
}


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def parse_boc(pdf_path: Path) -> MarketSession:
    """
    Parse un BOC PDF et retourne une MarketSession complète.
    Raise ValueError si la date ne peut pas être extraite.
    """
    logger.info(f"Parsing BOC : {pdf_path}")

    with pdfplumber.open(pdf_path) as pdf:
        logger.info(f"PDF : {len(pdf.pages)} pages")
        full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        all_tables = [page.extract_tables() for page in pdf.pages]

    session_date = _extract_date(full_text)
    indices = _extract_indices_from_tables(all_tables[0])   # page 1
    stats = _extract_market_stats_from_tables(all_tables[0])
    stocks = _extract_stocks(all_tables)
    sectors = _extract_sectors_from_tables(all_tables[0], full_text)

    logger.info(
        f"BOC parsé : {len(stocks)} actions, {len(sectors)} secteurs, "
        f"date={session_date}, hausse={stats['advancing']}, baisse={stats['declining']}"
    )
    if len(stocks) == 0:
        logger.warning("Aucune action extraite — vérifier avec inspect_boc.py")

    return MarketSession(
        session_date=session_date,
        composite=indices["composite"],
        brvm30=indices["brvm30"],
        prestige=indices["prestige"],
        advancing=stats["advancing"],
        declining=stats["declining"],
        unchanged=stats["unchanged"],
        market_cap=stats["market_cap"],
        stocks=stocks,
        sectors=sectors,
    )


# ─── Date ─────────────────────────────────────────────────────────────────────

def _extract_date(text: str) -> date:
    """
    Supporte :
    - "mercredi 18 mars 2026"  (format BOC réel)
    - "21/03/2025"
    """
    # Format littéral FR : "[jour_semaine] DD mois YYYY"
    m = re.search(
        r"(?:lundi|mardi|mercredi|jeudi|vendredi)?\s*"
        r"(\d{1,2})\s+"
        r"(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|"
        r"septembre|octobre|novembre|d[eé]cembre)\s+"
        r"(\d{4})",
        text, re.IGNORECASE,
    )
    if m:
        day = int(m.group(1))
        month_str = m.group(2).lower().replace("é", "e").replace("û", "u").replace("ô", "o")
        month = _MOIS.get(month_str, 0)
        year = int(m.group(3))
        if month and 1 <= day <= 31:
            return date(year, month, day)

    # Format numérique DD/MM/YYYY
    m = re.search(r"(\d{2})[/\-](\d{2})[/\-](\d{4})", text)
    if m:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= month <= 12 and 1 <= day <= 31:
            return date(year, month, day)

    raise ValueError("Impossible d'extraire la date du BOC")


# ─── Indices ──────────────────────────────────────────────────────────────────

def _extract_indices_from_tables(page1_tables: list) -> dict[str, IndexData]:
    """
    Les 3 indices sont dans des tableaux séparés sur la page 1.

    Tableau COMPOSITE : row[0]=[name, value, None], row[1]=['Variation Jour', '-0,10 %', '']
    Tableau BRVM 30   : identique
    Tableau PRESTIGE  : row[0]=[None, name, value, None], row[1]=[None, 'Variation Jour', '0,81 %', '']
    """
    indices = {
        "composite": IndexData("BRVM Composite", 0.0, 0.0),
        "brvm30":    IndexData("BRVM 30",        0.0, 0.0),
        "prestige":  IndexData("BRVM Prestige",  0.0, 0.0),
    }

    for table in page1_tables:
        if not table or len(table) < 2:
            continue
        row0 = [str(c or "").strip() for c in table[0]]
        row1 = [str(c or "").strip() for c in table[1]] if len(table) > 1 else []

        # Trouver le nom de l'indice dans la première ligne
        name_str = " ".join(row0).upper()
        variation = 0.0
        if row1:
            for cell in row1:
                m = re.search(r"([-+]?[\d,]+)\s*%", cell)
                if m:
                    variation = _parse_float(m.group(1))
                    break

        if "COMPOSITE" in name_str and "RETURN" not in name_str and "PRESTIGE" not in name_str:
            value = _first_float_in_row(row0)
            if value:
                indices["composite"] = IndexData("BRVM Composite", value, variation)

        elif "BRVM 30" in name_str or ("30" in name_str and "BRVM" in name_str and "COMPOSITE" not in name_str):
            value = _first_float_in_row(row0)
            if value:
                indices["brvm30"] = IndexData("BRVM 30", value, variation)

        elif "PRESTIGE" in name_str and "RETURN" not in name_str:
            # Prestige : valeur en col[2] (car col[0] = None)
            value = _first_float_in_row(row0)
            if value:
                indices["prestige"] = IndexData("BRVM Prestige", value, variation)

    return indices


def _first_float_in_row(cells: list) -> Optional[float]:
    """Retourne le premier float valide trouvé dans une liste de cellules.
    Ignore les cellules contenant des lettres (ex: 'BRVM 30' ne doit pas retourner 30)."""
    for cell in cells:
        s = str(cell or "").strip()
        if not s:
            continue
        # Ignorer si la cellule contient des lettres (ce n'est pas une valeur numérique)
        if re.search(r"[A-Za-z]", s):
            continue
        f = _parse_float(s)
        if f > 0:
            return f
    return None


# ─── Statistiques marché ──────────────────────────────────────────────────────

def _extract_market_stats_from_tables(page1_tables: list) -> dict:
    """
    Tableau "Actions" (8 lignes × 3 col) sur la page 1.
    On ne traite QUE le tableau dont la première ligne contient "Actions"
    (pas le tableau "Obligations" qui a des valeurs similaires mais différentes).
    """
    stats = {"advancing": 0, "declining": 0, "unchanged": 0, "market_cap": 0.0}

    for table in page1_tables:
        if not table:
            continue
        # Identifier le tableau "Actions" (et non "Obligations")
        first_row = [str(c or "").strip() for c in table[0]]
        first_row_text = " ".join(first_row).lower()
        if "actions" not in first_row_text or "obligations" in first_row_text:
            continue

        for row in table:
            if not row or len(row) < 2:
                continue
            label = str(row[0] or "").lower()
            value = str(row[1] or "").strip()

            if "capitalisation" in label and "actions" in label:
                stats["market_cap"] = _parse_float(value)
            elif "hausse" in label:
                stats["advancing"] = _parse_int(value)
            elif "baisse" in label:
                stats["declining"] = _parse_int(value)
            elif "inchang" in label:
                stats["unchanged"] = _parse_int(value)

        break  # On a trouvé et traité le bon tableau

    return stats


# ─── Actions ──────────────────────────────────────────────────────────────────

def _extract_stocks(all_tables: list[list]) -> list[StockData]:
    """Parcourt toutes les pages et extrait les lignes d'actions (16 colonnes)."""
    stocks: list[StockData] = []
    seen: set[str] = set()

    for page_tables in all_tables:
        for table in page_tables:
            for row in table:
                if not row or len(row) < 10:
                    continue
                # Ligne action : col[0] = code secteur, col[1] = symbole
                sector_code = str(row[0] or "").strip().upper()
                if sector_code not in SECTOR_CODES:
                    continue
                symbol = str(row[1] or "").strip().upper()
                if symbol not in KNOWN_SYMBOLS or symbol in seen:
                    continue

                stock = _parse_stock_row(row)
                if stock:
                    stocks.append(stock)
                    seen.add(symbol)

    return stocks


def _parse_stock_row(row: list) -> Optional[StockData]:
    """
    Mapping exact des 16 colonnes du BOC :
    [0]secteur [1]symbole [2]nom [3]vide [4]cours_prec [5]ouv [6]cloture
    [7]var% [8]volume [9]valeur [10]cours_ref [11]var_annuelle
    [12]dividende [13]date_div [14]rdt_net [15]PER
    """
    def cell(idx: int):
        return row[idx] if idx < len(row) else None

    try:
        symbol = str(cell(1) or "").strip().upper()
        name = str(cell(2) or "").replace("\n", " ").strip()

        return StockData(
            symbol=symbol,
            name=name,
            previous_close=_parse_float(cell(4)),
            close=_parse_float(cell(6)),          # Cours Clôture
            variation_pct=_parse_float(cell(7)),
            volume=_parse_int(cell(8)),
            value_traded=_parse_float(cell(9)),
            per=_parse_float_optional(cell(15)),
            net_yield=_parse_float_optional(cell(14)),
            last_dividend=_parse_float_optional(cell(12)),
        )
    except Exception as e:
        logger.debug(f"Ligne action ignorée ({cell(1)}) : {e}")
        return None


# ─── Secteurs ─────────────────────────────────────────────────────────────────

def _extract_sectors_from_tables(page1_tables: list, full_text: str) -> list[SectorData]:
    """
    Tableau des secteurs page 1 (8 lignes × 8 colonnes, base jan 2025) :
    col[0] = "BRVM - NOM N" (nom + nb sociétés)
    col[2] = valeur de l'indice
    col[3] = "var_jour% var_annuelle% volume valeur PER" (tout concaténé)
    """
    sectors: list[SectorData] = []
    seen: set[str] = set()

    for table in page1_tables:
        if not table:
            continue
        for row in table:
            if not row or len(row) < 3:
                continue
            col0 = str(row[0] or "").upper()

            # Les lignes secteurs commencent par "BRVM - "
            if not col0.startswith("BRVM -") and not col0.startswith("BRVM–"):
                continue

            # Identifier le secteur
            display_name = None
            for key, name in SECTOR_DISPLAY.items():
                if key in col0:
                    display_name = name
                    break

            if not display_name or display_name in seen:
                continue

            value = _parse_float(row[2]) if len(row) > 2 else 0.0

            # col[3] contient tout concaténé : "var_jour% var_annuelle% volume valeur PER"
            col3 = str(row[3] or "") if len(row) > 3 else ""
            numbers = re.findall(r"[-+]?[\d\s]+[,.][\d]+", col3)
            floats = [_parse_float(n) for n in numbers]

            var_jour = floats[0] if len(floats) > 0 else 0.0
            var_ann  = floats[1] if len(floats) > 1 else 0.0
            volume   = _parse_int(floats[2]) if len(floats) > 2 else 0
            val      = floats[3] if len(floats) > 3 else 0.0
            per      = floats[4] if len(floats) > 4 else None

            try:
                sectors.append(SectorData(
                    name=display_name,
                    value=value,
                    variation_pct=var_jour,
                    annual_variation_pct=var_ann,
                    avg_per=per,
                    volume=volume,
                    value_traded=val,
                ))
                seen.add(display_name)
            except Exception as e:
                logger.debug(f"Secteur ignoré ({display_name}) : {e}")

    # Fallback regex si aucun secteur trouvé
    if not sectors:
        sectors = _extract_sectors_from_text(full_text)

    return sectors


def _extract_sectors_from_text(text: str) -> list[SectorData]:
    """Fallback regex sur le texte brut."""
    sectors: list[SectorData] = []
    seen: set[str] = set()

    for key, display_name in SECTOR_DISPLAY.items():
        if display_name in seen:
            continue
        m = re.search(
            r"BRVM\s*[-–]\s*" + re.escape(key)
            + r"[^\d\n]{0,15}([\d\s,]+[,.][\d]+)"
            + r"[^\d\n\-+]{0,15}([-+]?[\d,]+)\s*%",
            text, re.IGNORECASE,
        )
        if m:
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
    if value is None:
        return 0.0
    cleaned = str(value).replace("\xa0", "").replace(" ", "").replace(",", ".")
    cleaned = re.sub(r"[^\d.\-+]", "", cleaned)
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def _parse_float_optional(value) -> Optional[float]:
    try:
        result = _parse_float(value)
        return result if result != 0.0 else None
    except (ValueError, TypeError):
        return None


def _parse_int(value) -> int:
    if value is None:
        return 0
    cleaned = re.sub(r"[^\d]", "", str(value).replace("\xa0", ""))
    return int(cleaned) if cleaned else 0
