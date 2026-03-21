"""
Client Supabase pour le BRVM Analyzer.
Toutes les opérations de lecture/écriture passent par ce module.
RLS : lecture publique via anon key, écriture via service_role uniquement.
"""

from __future__ import annotations

import logging
import os
from datetime import date
from functools import lru_cache
from typing import Any, Optional

from supabase import create_client, Client

from ..pipeline.models import MarketSession, StockData, SectorData, IndexData

logger = logging.getLogger(__name__)


class BRVMDatabase:
    """Wrapper Supabase avec méthodes métier BRVM."""

    def __init__(self, client: Client) -> None:
        self._client = client

    # ------------------------------------------------------------------
    # Sessions de marché
    # ------------------------------------------------------------------

    def upsert_session(self, session: MarketSession) -> None:
        """Insère ou met à jour une session de marché complète."""
        logger.info("Upsert session %s", session.session_date)

        # Table market_sessions
        session_row = {
            "session_date": str(session.session_date),
            "composite_value": session.composite.value,
            "composite_variation": session.composite.variation_pct,
            "brvm30_value": session.brvm30.value,
            "brvm30_variation": session.brvm30.variation_pct,
            "prestige_value": session.prestige.value,
            "prestige_variation": session.prestige.variation_pct,
            "advancing": session.advancing,
            "declining": session.declining,
            "unchanged": session.unchanged,
            "market_cap": session.market_cap,
            "announcements": session.announcements,
        }
        self._client.table("market_sessions").upsert(session_row).execute()

        # Table stock_quotes
        stock_rows = [
            _stock_to_row(session.session_date, stock)
            for stock in session.stocks
        ]
        if stock_rows:
            self._client.table("stock_quotes").upsert(stock_rows).execute()

        # Table sector_indices
        sector_rows = [
            _sector_to_row(session.session_date, sector)
            for sector in session.sectors
        ]
        if sector_rows:
            self._client.table("sector_indices").upsert(sector_rows).execute()

        logger.info(
            "Upsert OK — %d actions, %d secteurs",
            len(stock_rows),
            len(sector_rows),
        )

    def upsert_analysis(self, session_date: date, analysis: dict[str, Any]) -> None:
        """Insère ou met à jour l'analyse IA pour une date donnée."""
        import json

        row = {
            "session_date": str(session_date),
            "analysis_json": json.dumps(analysis, ensure_ascii=False),
            "market_sentiment": analysis.get("market_sentiment"),
            "resume_executif": analysis.get("resume_executif"),
        }
        self._client.table("daily_analyses").upsert(row).execute()
        logger.info("Analyse IA upsertée pour %s", session_date)

    def get_latest_session(self) -> Optional[dict[str, Any]]:
        """Retourne la dernière session disponible avec stocks et secteurs."""
        response = (
            self._client.table("market_sessions")
            .select("*")
            .order("session_date", desc=True)
            .limit(1)
            .execute()
        )
        if not response.data:
            return None
        return self._enrich_session(response.data[0])

    def get_session(self, session_date: date) -> Optional[dict[str, Any]]:
        """Retourne une session par date avec stocks et secteurs."""
        response = (
            self._client.table("market_sessions")
            .select("*")
            .eq("session_date", str(session_date))
            .execute()
        )
        if not response.data:
            return None
        return self._enrich_session(response.data[0])

    def _enrich_session(self, row: dict[str, Any]) -> dict[str, Any]:
        """Enrichit une session avec stocks, secteurs et formate pour l'API."""
        session_date = row["session_date"]

        # Stocks
        stocks_resp = (
            self._client.table("stock_quotes")
            .select("*")
            .eq("session_date", session_date)
            .order("symbol")
            .execute()
        )

        # Secteurs
        sectors_resp = (
            self._client.table("sector_indices")
            .select("*")
            .eq("session_date", session_date)
            .execute()
        )

        return {
            "session_date": session_date,
            "composite": {
                "name": "BRVM Composite",
                "value": row.get("composite_value"),
                "variation_pct": row.get("composite_variation"),
            },
            "brvm30": {
                "name": "BRVM 30",
                "value": row.get("brvm30_value"),
                "variation_pct": row.get("brvm30_variation"),
            },
            "prestige": {
                "name": "BRVM Prestige",
                "value": row.get("prestige_value"),
                "variation_pct": row.get("prestige_variation"),
            },
            "advancing": row.get("advancing", 0),
            "declining": row.get("declining", 0),
            "unchanged": row.get("unchanged", 0),
            "market_cap": row.get("market_cap", 0),
            "stocks": stocks_resp.data,
            "sectors": sectors_resp.data,
        }

    def get_stock_history(
        self, symbol: str, limit: int = 30
    ) -> list[dict[str, Any]]:
        """Retourne l'historique des cours pour un symbole."""
        response = (
            self._client.table("stock_quotes")
            .select("*")
            .eq("symbol", symbol)
            .order("session_date", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data


@lru_cache(maxsize=1)
def get_client() -> BRVMDatabase:
    """Singleton du client DB — utiliser cette fonction partout."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        raise ValueError(
            "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis"
        )

    client = create_client(url, key)
    logger.info("Client Supabase initialisé")
    return BRVMDatabase(client)


# ------------------------------------------------------------------
# Helpers de sérialisation
# ------------------------------------------------------------------


def _stock_to_row(session_date: date, stock: StockData) -> dict[str, Any]:
    return {
        "session_date": str(session_date),
        "symbol": stock.symbol,
        "name": stock.name,
        "previous_close": stock.previous_close,
        "close": stock.close,
        "variation_pct": stock.variation_pct,
        "volume": stock.volume,
        "value_traded": stock.value_traded,
        "per": stock.per,
        "net_yield": stock.net_yield,
        "last_dividend": stock.last_dividend,
    }


def _sector_to_row(session_date: date, sector: SectorData) -> dict[str, Any]:
    return {
        "session_date": str(session_date),
        "name": sector.name,
        "value": sector.value,
        "variation_pct": sector.variation_pct,
    }
