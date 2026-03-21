"""
Gestion des jours de bourse BRVM / UEMOA.
La BRVM est ouverte du lundi au vendredi, sauf jours fériés UEMOA.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

# Jours fériés fixes UEMOA (MM-DD)
_FIXED_HOLIDAYS: set[tuple[int, int]] = {
    (1, 1),   # Nouvel An
    (5, 1),   # Fête du Travail
    (8, 15),  # Assomption
    (11, 1),  # Toussaint
    (12, 25), # Noël
}

# Jours fériés mobiles par année (à mettre à jour chaque année)
# Format : {année: [(mois, jour), ...]}
_MOBILE_HOLIDAYS: dict[int, list[tuple[int, int]]] = {
    2024: [
        (4, 1),   # Lundi de Pâques
        (5, 9),   # Ascension
        (5, 20),  # Lundi de Pentecôte
        (4, 10),  # Aïd el-Fitr (approx)
        (6, 17),  # Aïd el-Adha (approx)
        (9, 16),  # Maouloud (approx)
    ],
    2025: [
        (4, 21),  # Lundi de Pâques
        (5, 29),  # Ascension
        (6, 9),   # Lundi de Pentecôte
        (3, 31),  # Aïd el-Fitr (approx)
        (6, 7),   # Aïd el-Adha (approx)
        (9, 5),   # Maouloud (approx)
    ],
    2026: [
        (4, 6),   # Lundi de Pâques
        (5, 14),  # Ascension
        (5, 25),  # Lundi de Pentecôte
        (3, 20),  # Aïd el-Fitr (approx)
        (5, 27),  # Aïd el-Adha (approx)
        (8, 25),  # Maouloud (approx)
    ],
}


def is_trading_day(d: date) -> bool:
    """Retourne True si `d` est un jour de bourse BRVM."""
    # Weekends
    if d.weekday() >= 5:  # 5=samedi, 6=dimanche
        return False

    # Jours fériés fixes
    if (d.month, d.day) in _FIXED_HOLIDAYS:
        return False

    # Jours fériés mobiles
    year_holidays = _MOBILE_HOLIDAYS.get(d.year, [])
    if (d.month, d.day) in year_holidays:
        return False

    return True


def last_trading_day(from_date: Optional[date] = None) -> date:
    """Retourne le dernier jour de bourse précédant `from_date` (inclus)."""
    d = from_date or date.today()
    if is_trading_day(d):
        return d
    return previous_trading_day(d)


def previous_trading_day(d: date) -> date:
    """Retourne le jour de bourse précédant strictement `d`."""
    candidate = d - timedelta(days=1)
    while not is_trading_day(candidate):
        candidate -= timedelta(days=1)
    return candidate


def next_trading_day(d: date) -> date:
    """Retourne le prochain jour de bourse après `d`."""
    candidate = d + timedelta(days=1)
    while not is_trading_day(candidate):
        candidate += timedelta(days=1)
    return candidate


def trading_days_in_range(start: date, end: date) -> list[date]:
    """Retourne la liste des jours de bourse entre `start` et `end` inclus."""
    days = []
    current = start
    while current <= end:
        if is_trading_day(current):
            days.append(current)
        current += timedelta(days=1)
    return days


def boc_expected_date(trigger_date: Optional[date] = None) -> date:
    """
    Retourne la date du BOC attendu pour `trigger_date`.
    Le BOC du jour J est publié en fin de journée de J (après 18h30 UTC).
    Si le trigger tourne avant 18h30, on prend J-1.
    En pratique le cron est à 18h30 UTC, donc on prend le dernier jour de bourse.
    """
    return last_trading_day(trigger_date)
