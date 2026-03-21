"""
Routes de déclenchement du pipeline BRVM.
Protégées par PIPELINE_SECRET (header X-Pipeline-Secret).
"""

from __future__ import annotations

import logging
import os
from datetime import date
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header, status
from pydantic import BaseModel

from ...pipeline.run import run_pipeline, PipelineResult

logger = logging.getLogger(__name__)
router = APIRouter()


class TriggerRequest(BaseModel):
    session_date: Optional[date] = None
    skip_download: bool = False
    skip_ai: bool = False
    skip_revalidation: bool = False


class TriggerResponse(BaseModel):
    accepted: bool
    message: str
    session_date: Optional[date] = None


def _verify_pipeline_secret(x_pipeline_secret: str = Header(...)) -> None:
    """Vérifie le secret de déclenchement pipeline."""
    expected = os.getenv("PIPELINE_SECRET")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PIPELINE_SECRET non configuré côté serveur",
        )
    if x_pipeline_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Secret pipeline invalide",
        )


@router.post(
    "/trigger",
    response_model=TriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(_verify_pipeline_secret)],
)
async def trigger_pipeline(
    body: TriggerRequest,
    background_tasks: BackgroundTasks,
) -> TriggerResponse:
    """
    Déclenche le pipeline en tâche de fond.
    Utilisé par le cron GitHub Actions (`30 18 * * 1-5`).
    """
    from ...pipeline.trading_days import last_trading_day

    target_date = body.session_date or last_trading_day()

    logger.info(
        "Pipeline déclenché pour %s (skip_download=%s, skip_ai=%s)",
        target_date,
        body.skip_download,
        body.skip_ai,
    )

    background_tasks.add_task(
        _run_pipeline_background,
        target_date,
        body.skip_download,
        body.skip_ai,
        body.skip_revalidation,
    )

    return TriggerResponse(
        accepted=True,
        message=f"Pipeline démarré en arrière-plan pour le {target_date}",
        session_date=target_date,
    )


@router.post(
    "/trigger-sync",
    response_model=dict,
    dependencies=[Depends(_verify_pipeline_secret)],
)
async def trigger_pipeline_sync(body: TriggerRequest) -> dict:
    """
    Déclenche le pipeline de manière synchrone (debug/test uniquement).
    Bloque jusqu'à la fin d'exécution.
    """
    from ...pipeline.trading_days import last_trading_day

    target_date = body.session_date or last_trading_day()

    result = run_pipeline(
        session_date=target_date,
        skip_download=body.skip_download,
        skip_ai=body.skip_ai,
        skip_revalidation=body.skip_revalidation,
    )

    return {
        "success": result.success,
        "session_date": str(result.session_date),
        "duration_seconds": round(result.duration_seconds, 2),
        "steps_completed": result.steps_completed,
        "error": result.error,
    }


async def _run_pipeline_background(
    session_date: date,
    skip_download: bool,
    skip_ai: bool,
    skip_revalidation: bool,
) -> None:
    result = run_pipeline(
        session_date=session_date,
        skip_download=skip_download,
        skip_ai=skip_ai,
        skip_revalidation=skip_revalidation,
    )
    if not result.success:
        logger.error("Pipeline arrière-plan échoué : %s", result.error)
