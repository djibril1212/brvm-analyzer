"""
Routes publiques de lecture des données de marché BRVM.
Rate limited à 60 requêtes/minute par IP.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from ...db.client import get_client

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

RATE_LIMIT = "60/minute"


@router.get("/latest")
@limiter.limit(RATE_LIMIT)
async def get_latest_session(request: Request) -> dict[str, Any]:
    """Retourne la dernière séance de marché disponible."""
    db = get_client()
    session = db.get_latest_session()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune séance disponible",
        )
    return session


@router.get("/sessions/{session_date}")
@limiter.limit(RATE_LIMIT)
async def get_session(request: Request, session_date: date) -> dict[str, Any]:
    """Retourne la séance pour une date donnée (format YYYY-MM-DD)."""
    db = get_client()
    session = db.get_session(session_date)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Séance du {session_date} non disponible",
        )
    return session


@router.get("/stocks/{symbol}/history")
@limiter.limit(RATE_LIMIT)
async def get_stock_history(
    request: Request,
    symbol: str,
    limit: int = 30,
) -> list[dict[str, Any]]:
    """
    Retourne l'historique des cours pour un symbole.
    `limit` : nombre de séances (défaut 30, max 252 ≈ 1 an).
    """
    if limit < 1 or limit > 252:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="limit doit être entre 1 et 252",
        )
    db = get_client()
    history = db.get_stock_history(symbol.upper(), limit=limit)
    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aucun historique pour le symbole '{symbol}'",
        )
    return history


@router.get("/analysis/latest")
@limiter.limit(RATE_LIMIT)
async def get_latest_analysis(request: Request) -> dict[str, Any]:
    """Retourne la dernière analyse IA disponible."""
    db = get_client()
    response = (
        db._client.table("daily_analyses")
        .select("*")
        .order("session_date", desc=True)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune analyse disponible",
        )
    return response.data[0]


@router.get("/analysis/{session_date}")
@limiter.limit(RATE_LIMIT)
async def get_analysis(
    request: Request, session_date: date
) -> dict[str, Any]:
    """Retourne l'analyse IA pour une date donnée."""
    db = get_client()
    response = (
        db._client.table("daily_analyses")
        .select("*")
        .eq("session_date", str(session_date))
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analyse du {session_date} non disponible",
        )
    return response.data[0]
