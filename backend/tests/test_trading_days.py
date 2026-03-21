"""Tests de la logique des jours de bourse BRVM."""

import pytest
from datetime import date

from backend.pipeline.trading_days import (
    is_trading_day,
    last_trading_day,
    previous_trading_day,
    next_trading_day,
    trading_days_in_range,
)


class TestIsTradingDay:
    def test_monday_is_trading(self):
        # Lundi 20 janvier 2025
        assert is_trading_day(date(2025, 1, 20)) is True

    def test_saturday_is_not_trading(self):
        assert is_trading_day(date(2025, 1, 18)) is False

    def test_sunday_is_not_trading(self):
        assert is_trading_day(date(2025, 1, 19)) is False

    def test_new_year_is_not_trading(self):
        assert is_trading_day(date(2025, 1, 1)) is False

    def test_may_day_is_not_trading(self):
        assert is_trading_day(date(2025, 5, 1)) is False

    def test_christmas_is_not_trading(self):
        assert is_trading_day(date(2025, 12, 25)) is False


class TestLastTradingDay:
    def test_friday_returns_friday(self):
        # Vendredi 17 janvier 2025
        assert last_trading_day(date(2025, 1, 17)) == date(2025, 1, 17)

    def test_saturday_returns_friday(self):
        assert last_trading_day(date(2025, 1, 18)) == date(2025, 1, 17)

    def test_sunday_returns_friday(self):
        assert last_trading_day(date(2025, 1, 19)) == date(2025, 1, 17)

    def test_new_year_returns_previous_friday(self):
        # 1er jan 2025 = mercredi → dernier jour ouvré = vendredi 27 déc 2024
        assert last_trading_day(date(2025, 1, 1)) == date(2024, 12, 27)


class TestTradingDaysRange:
    def test_full_week(self):
        days = trading_days_in_range(date(2025, 1, 13), date(2025, 1, 17))
        assert len(days) == 5
        assert date(2025, 1, 13) in days  # Lundi
        assert date(2025, 1, 17) in days  # Vendredi

    def test_excludes_weekends(self):
        days = trading_days_in_range(date(2025, 1, 11), date(2025, 1, 12))
        assert len(days) == 0  # Samedi + Dimanche
