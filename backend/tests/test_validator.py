"""Tests de validation des données de séance."""

import pytest
from datetime import date

from backend.pipeline.validator import validate_session, ValidationResult
from backend.pipeline.models import MarketSession, StockData, IndexData, SectorData
from backend.tests.fixtures.sample_session import make_sample_session


class TestValidateSession:
    def test_valid_session_passes(self):
        session = make_sample_session()
        result = validate_session(session)
        assert result.is_valid, f"Erreurs inattendues : {result.errors}"

    def test_future_date_fails(self):
        session = make_sample_session(session_date=date(2099, 1, 1))
        result = validate_session(session)
        assert not result.is_valid
        assert any("futur" in e for e in result.errors)

    def test_negative_index_fails(self):
        session = make_sample_session()
        session.composite.value = -10.0
        result = validate_session(session)
        assert not result.is_valid
        assert any("COMPOSITE" in e for e in result.errors)

    def test_empty_stocks_fails(self):
        session = make_sample_session()
        session.stocks = []
        result = validate_session(session)
        assert not result.is_valid
        assert any("action" in e.lower() for e in result.errors)

    def test_unknown_symbol_triggers_warning(self):
        session = make_sample_session()
        session.stocks[0].symbol = "FAKE"
        result = validate_session(session)
        # Symbole inconnu = warning, pas erreur bloquante
        assert any("inconnu" in w for w in result.warnings)

    def test_variation_exceeds_crepmf_limit_warning(self):
        session = make_sample_session()
        session.stocks[0].variation_pct = 8.5  # > 7.5%
        result = validate_session(session)
        assert any("7.5%" in w or "CREPMF" in w for w in result.warnings)

    def test_negative_close_fails(self):
        session = make_sample_session()
        session.stocks[0].close = -100.0
        result = validate_session(session)
        assert not result.is_valid

    def test_missing_symbols_warning(self):
        """Si moins de 47 symboles sont parsés, un warning doit être émis."""
        session = make_sample_session()
        # On n'a que 3 actions dans le sample, donc des manquants
        result = validate_session(session)
        assert any("manquant" in w for w in result.warnings)
