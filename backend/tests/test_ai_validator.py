"""Tests de validation des analyses IA."""

import pytest
from backend.ai.validator import validate_analysis
from backend.tests.fixtures.sample_session import make_sample_session


def _base_analysis():
    return {
        "date": "2025-01-15",
        "market_sentiment": "haussier",
        "resume_executif": "La séance du 15 janvier a été marquée par une progression générale des indices.",
        "analyse_indices": {
            "composite": "Le BRVM Composite a progressé de 0,73% pour clôturer à 218,45 points.",
            "brvm30": "Le BRVM-30 gagne 0,55% à 109,23 points.",
            "contexte_regional": "Contexte UEMOA stable.",
        },
        "top_secteurs": [
            {"nom": "Finances", "variation_pct": 1.12, "commentaire": "Bon trimestre."}
        ],
        "top_picks": [
            {
                "symbole": "SGBC",
                "nom": "Société Générale de Banques en Côte d'Ivoire",
                "variation_pct": 2.0,
                "volume": 1250,
                "arguments": ["PER 12,5 attractif", "Rendement 4,2%"],
                "note_de_prudence": "Les performances passées ne garantissent pas les résultats futurs.",
            }
        ],
        "valeurs_en_surveillance": [],
        "perspectives": "La tendance haussière pourrait se poursuivre.",
        "disclaimer": "Ceci n'est pas un conseil en investissement.",
    }


class TestAIValidator:
    def setup_method(self):
        self.session = make_sample_session()

    def test_valid_analysis_passes(self):
        analysis = _base_analysis()
        result = validate_analysis(analysis, self.session)
        assert result.is_valid, f"Erreurs : {result.errors}"

    def test_missing_disclaimer_fails(self):
        analysis = _base_analysis()
        del analysis["disclaimer"]
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid
        assert any("disclaimer" in e.lower() or "crepmf" in e.lower() for e in result.errors)

    def test_wrong_disclaimer_fails(self):
        analysis = _base_analysis()
        analysis["disclaimer"] = "Analyste indépendant."
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid

    def test_forbidden_phrase_achetez_fails(self):
        analysis = _base_analysis()
        analysis["resume_executif"] = "Achetez SGBC maintenant."
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid
        assert any("achetez" in e for e in result.errors)

    def test_forbidden_phrase_vendez_fails(self):
        analysis = _base_analysis()
        analysis["perspectives"] = "Vendez vos positions sur ETIT."
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid

    def test_hallucinated_symbol_fails(self):
        analysis = _base_analysis()
        analysis["top_picks"][0]["symbole"] = "FAKE99"
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid
        assert any("FAKE99" in e for e in result.errors)

    def test_missing_required_field_fails(self):
        analysis = _base_analysis()
        del analysis["market_sentiment"]
        result = validate_analysis(analysis, self.session)
        assert not result.is_valid
