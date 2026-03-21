"""Configuration pytest pour les tests BRVM."""

import pytest


@pytest.fixture(autouse=True)
def no_supabase_calls(monkeypatch):
    """
    Empêche les appels accidentels à Supabase en tests unitaires.
    Les tests d'intégration doivent explicitement opt-out via le marker.
    """
    import os
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
