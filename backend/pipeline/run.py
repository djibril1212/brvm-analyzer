"""
Orchestrateur du pipeline BRVM Daily Analyzer.
Séquence : téléchargement → parsing → validation → insertion DB → analyse IA → revalidation ISR.
Durée cible < 5 minutes.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    success: bool
    session_date: Optional[date] = None
    duration_seconds: float = 0.0
    steps_completed: list[str] = field(default_factory=list)
    error: Optional[str] = None


def run_pipeline(
    session_date: Optional[date] = None,
    skip_download: bool = False,
    skip_ai: bool = False,
    skip_revalidation: bool = False,
) -> PipelineResult:
    """
    Exécute le pipeline complet pour une date donnée.

    Args:
        session_date: Date de séance. Défaut = dernier jour de bourse.
        skip_download: Utilise un BOC déjà téléchargé (dev/debug).
        skip_ai: Saute l'analyse IA (dev/debug).
        skip_revalidation: Saute la revalidation ISR (dev/debug).
    """
    from .trading_days import last_trading_day
    from .downloader import download_boc
    from .parser import parse_boc
    from .validator import validate_session
    from ..db.client import get_client
    from ..ai.analyzer import analyze_session
    from ..ai.validator import validate_analysis

    start_time = time.perf_counter()
    target_date = session_date or last_trading_day()
    result = PipelineResult(success=False, session_date=target_date)

    logger.info("=== Pipeline BRVM démarré pour %s ===", target_date)

    try:
        # ---------------------------------------------------------------
        # Étape 1 : Téléchargement du BOC
        # ---------------------------------------------------------------
        if not skip_download:
            logger.info("[1/6] Téléchargement du BOC...")
            pdf_path = download_boc(target_date)
            result.steps_completed.append("download")
            logger.info("[1/6] BOC téléchargé : %s", pdf_path)
        else:
            from pathlib import Path
            pdf_path = Path(f"backend/data/raw/boc_{target_date}.pdf")
            logger.info("[1/6] Téléchargement ignoré — utilisation de %s", pdf_path)
            result.steps_completed.append("download_skipped")

        # ---------------------------------------------------------------
        # Étape 2 : Parsing
        # ---------------------------------------------------------------
        logger.info("[2/6] Parsing du BOC...")
        session = parse_boc(pdf_path)
        result.steps_completed.append("parse")
        logger.info(
            "[2/6] Parsing OK — %d actions, %d secteurs",
            len(session.stocks),
            len(session.sectors),
        )

        # ---------------------------------------------------------------
        # Étape 3 : Validation
        # ---------------------------------------------------------------
        logger.info("[3/6] Validation des données...")
        validation = validate_session(session)
        result.steps_completed.append("validate")

        if not validation.is_valid:
            raise ValueError(
                f"Données invalides : {'; '.join(validation.errors)}"
            )

        if validation.warnings:
            logger.warning(
                "[3/6] %d warning(s) de validation : %s",
                len(validation.warnings),
                "; ".join(validation.warnings),
            )
        else:
            logger.info("[3/6] Validation OK")

        # ---------------------------------------------------------------
        # Étape 4 : Insertion en base
        # ---------------------------------------------------------------
        logger.info("[4/6] Insertion en base Supabase...")
        db = get_client()
        db.upsert_session(session)
        result.steps_completed.append("db_insert")
        logger.info("[4/6] Insertion OK")

        # ---------------------------------------------------------------
        # Étape 5 : Analyse IA
        # ---------------------------------------------------------------
        if not skip_ai:
            logger.info("[5/6] Génération de l'analyse IA (Claude)...")
            analysis = analyze_session(session)
            ai_validation = validate_analysis(analysis, session)

            if not ai_validation.is_valid:
                logger.warning(
                    "[5/6] Analyse IA suspecte : %s — on la publie quand même avec warning",
                    "; ".join(ai_validation.errors),
                )

            db.upsert_analysis(target_date, analysis)
            result.steps_completed.append("ai_analysis")
            logger.info("[5/6] Analyse IA insérée")
        else:
            logger.info("[5/6] Analyse IA ignorée")
            result.steps_completed.append("ai_analysis_skipped")

        # ---------------------------------------------------------------
        # Étape 6 : Revalidation ISR Next.js
        # ---------------------------------------------------------------
        if not skip_revalidation:
            logger.info("[6/6] Revalidation ISR...")
            _trigger_isr_revalidation(target_date)
            result.steps_completed.append("isr_revalidation")
            logger.info("[6/6] ISR revalidé")
        else:
            logger.info("[6/6] Revalidation ISR ignorée")
            result.steps_completed.append("isr_skipped")

        result.success = True
        result.duration_seconds = time.perf_counter() - start_time
        logger.info(
            "=== Pipeline terminé en %.1fs ===", result.duration_seconds
        )

    except Exception as exc:
        result.error = str(exc)
        result.duration_seconds = time.perf_counter() - start_time
        logger.exception("Pipeline échoué après %.1fs : %s", result.duration_seconds, exc)

    return result


def _trigger_isr_revalidation(session_date: date) -> None:
    """Appelle le webhook Next.js pour revalider les pages ISR."""
    import os
    import httpx

    revalidation_url = os.getenv("NEXT_REVALIDATION_URL")
    revalidation_secret = os.getenv("NEXT_REVALIDATION_SECRET")

    if not revalidation_url:
        logger.warning("NEXT_REVALIDATION_URL non configuré — ISR ignoré")
        return

    response = httpx.post(
        revalidation_url,
        json={"date": str(session_date)},
        headers={"x-revalidation-secret": revalidation_secret or ""},
        timeout=30,
    )
    response.raise_for_status()
    logger.info("ISR revalidation HTTP %s", response.status_code)
