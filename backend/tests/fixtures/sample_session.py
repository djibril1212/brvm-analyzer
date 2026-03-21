"""Données de séance factices pour les tests (ne jamais utiliser en production)."""

from datetime import date
from backend.pipeline.models import MarketSession, StockData, IndexData, SectorData


def make_sample_session(session_date: date = date(2025, 1, 15)) -> MarketSession:
    stocks = [
        StockData(
            symbol="SGBC",
            name="Société Générale de Banques en Côte d'Ivoire",
            previous_close=14500.0,
            close=14790.0,
            variation_pct=2.0,
            volume=1250,
            value_traded=18487500,
            per=12.5,
            net_yield=4.2,
            last_dividend=620.0,
        ),
        StockData(
            symbol="ETIT",
            name="Ecobank Transnational Incorporated",
            previous_close=18.0,
            close=17.5,
            variation_pct=-2.78,
            volume=45200,
            value_traded=791000,
            per=None,
            net_yield=None,
            last_dividend=None,
        ),
        StockData(
            symbol="ONTBF",
            name="ONATEL (Burkina Faso)",
            previous_close=3200.0,
            close=3200.0,
            variation_pct=0.0,
            volume=0,
            value_traded=0,
            per=8.1,
            net_yield=6.5,
            last_dividend=208.0,
        ),
    ]

    return MarketSession(
        session_date=session_date,
        composite=IndexData(value=218.45, variation_pct=0.73),
        brvm30=IndexData(value=109.23, variation_pct=0.55),
        prestige=IndexData(value=95.10, variation_pct=0.12),
        advancing=18,
        declining=12,
        unchanged=17,
        market_cap=7_850_000_000_000,
        stocks=stocks,
        sectors=[
            SectorData(name="Finances", value=320.15, variation_pct=1.12),
            SectorData(name="Télécoms", value=158.20, variation_pct=-0.45),
            SectorData(name="Industries", value=270.88, variation_pct=0.23),
        ],
        announcements="Aucune annonce particulière.",
    )
